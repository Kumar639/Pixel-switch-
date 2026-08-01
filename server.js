import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

const app=express();
const db=new Database(process.env.DATABASE_PATH||'./comments.db');
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, tool TEXT NOT NULL, parent_id TEXT,
  name TEXT NOT NULL, message TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  FOREIGN KEY(parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL, visitor_id TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(comment_id,visitor_id), FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS activity_stats (
  tool TEXT PRIMARY KEY,
  conversions INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  input_bytes INTEGER NOT NULL DEFAULT 0,
  output_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);`);
app.use(helmet());
app.use(cors({origin:process.env.ALLOWED_ORIGIN?.split(',')||'*'}));
app.use(express.json({limit:'32kb'}));
app.use('/api',rateLimit({windowMs:60_000,limit:60,standardHeaders:true,legacyHeaders:false}));
const clean=(value,max)=>String(value||'').trim().slice(0,max);
app.get('/api/health',(_req,res)=>res.json({ok:true}));
app.get('/api/activity',(_req,res)=>{
  const rows=db.prepare('SELECT tool,conversions,downloads,input_bytes AS bytesInput,output_bytes AS bytesOutput,updated_at AS updatedAt FROM activity_stats ORDER BY conversions DESC,downloads DESC,tool ASC').all();
  const totals=rows.reduce((sum,row)=>({
    conversions:sum.conversions+row.conversions,
    downloads:sum.downloads+row.downloads,
    bytesInput:sum.bytesInput+row.bytesInput,
    bytesOutput:sum.bytesOutput+row.bytesOutput,
  }),{conversions:0,downloads:0,bytesInput:0,bytesOutput:0});
  const byTool=Object.fromEntries(rows.map((row)=>[row.tool,{conversions:row.conversions,downloads:row.downloads,bytesInput:row.bytesInput,bytesOutput:row.bytesOutput,lastUsed:row.updatedAt}]));
  const updatedAt=rows.reduce((latest,row)=>!latest||row.updatedAt>latest?row.updatedAt:latest,null);
  res.set('Cache-Control','no-store').json({...totals,byTool,updatedAt,source:'site'});
});
app.post('/api/activity',(req,res)=>{
  const type=clean(req.body.type,20),tool=clean(req.body.tool,80).replace(/[^a-z0-9_-]/gi,'');
  const count=Math.min(500,Math.max(1,Number(req.body.count)||1));
  const inputBytes=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(req.body.inputBytes)||0));
  const outputBytes=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(req.body.outputBytes)||0));
  if(!tool||!['conversion','download'].includes(type))return res.status(400).json({error:'Invalid activity event'});
  const conversions=type==='conversion'?count:0,downloads=type==='download'?count:0;
  const trackedInput=type==='conversion'?inputBytes:0;
  const trackedOutput=type==='conversion'?outputBytes:0;
  const updatedAt=new Date().toISOString();
  db.prepare(`INSERT INTO activity_stats(tool,conversions,downloads,input_bytes,output_bytes,updated_at)
    VALUES(?,?,?,?,?,?)
    ON CONFLICT(tool) DO UPDATE SET
      conversions=activity_stats.conversions+excluded.conversions,
      downloads=activity_stats.downloads+excluded.downloads,
      input_bytes=activity_stats.input_bytes+excluded.input_bytes,
      output_bytes=activity_stats.output_bytes+excluded.output_bytes,
      updated_at=excluded.updated_at`).run(tool,conversions,downloads,trackedInput,trackedOutput,updatedAt);
  res.status(202).json({ok:true});
});
app.get('/api/comments',(req,res)=>{
  const tool=clean(req.query.tool,80); if(!tool)return res.status(400).json({error:'tool is required'});
  const rows=db.prepare(`SELECT c.id,c.tool,c.parent_id AS parentId,c.name,c.message,c.rating,c.likes,c.created_at AS createdAt,
    COALESCE(json_group_array(cl.visitor_id) FILTER (WHERE cl.visitor_id IS NOT NULL),'[]') AS likedByJson
    FROM comments c LEFT JOIN comment_likes cl ON cl.comment_id=c.id WHERE c.tool=? GROUP BY c.id ORDER BY c.created_at ASC`).all(tool);
  res.json(rows.map((row)=>({...row,likedBy:JSON.parse(row.likedByJson),likedByJson:undefined})));
});
app.post('/api/comments',(req,res)=>{
  const tool=clean(req.body.tool,80),name=clean(req.body.name,60),message=clean(req.body.message,1200),parentId=clean(req.body.parentId,80)||null;
  const rating=parentId?0:Math.min(5,Math.max(1,Number(req.body.rating)||5));
  if(!tool||!name||message.length<3)return res.status(400).json({error:'Invalid comment'});
  if(parentId&&!db.prepare('SELECT id FROM comments WHERE id=? AND tool=?').get(parentId,tool))return res.status(400).json({error:'Invalid parent'});
  const item={id:crypto.randomUUID(),tool,parentId,name,message,rating,likes:0,createdAt:new Date().toISOString(),likedBy:[]};
  db.prepare('INSERT INTO comments(id,tool,parent_id,name,message,rating,likes,created_at) VALUES(@id,@tool,@parentId,@name,@message,@rating,@likes,@createdAt)').run(item);
  res.status(201).json(item);
});
app.post('/api/comments/:id/like',(req,res)=>{
  const id=clean(req.params.id,80),visitorId=clean(req.body.visitorId,100); if(!id||!visitorId)return res.status(400).json({error:'Invalid like'});
  const tx=db.transaction(()=>{db.prepare('INSERT OR IGNORE INTO comment_likes(comment_id,visitor_id,created_at) VALUES(?,?,?)').run(id,visitorId,new Date().toISOString());const count=db.prepare('SELECT COUNT(*) AS n FROM comment_likes WHERE comment_id=?').get(id).n;db.prepare('UPDATE comments SET likes=? WHERE id=?').run(count,id);return count;});
  try{return res.json({id,likes:tx()});}catch{return res.status(404).json({error:'Comment not found'});}
});
app.listen(Number(process.env.PORT||8787),()=>console.log(`PixelSwitch comments API listening on ${process.env.PORT||8787}`));
