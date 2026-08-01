(() => {
  const form = document.getElementById('commentForm');
  if (!form) return;
  const config = window.PIXELSWITCH_CONFIG || {};
  const data = window.PIXELSWITCH_TOOLS || { tools: [] };
  const els = {
    name: document.getElementById('commentName'), rating: document.getElementById('commentRating'),
    message: document.getElementById('commentMessage'), chars: document.getElementById('commentCharacters'),
    list: document.getElementById('commentsList'), sort: document.getElementById('commentSort'),
    count: document.getElementById('commentCount'), average: document.getElementById('averageRating'),
    stars: document.getElementById('ratingStars'), toolName: document.getElementById('commentToolName'),
    mode: document.getElementById('communityMode')
  };
  let tool = currentTool();
  let comments = [];
  const visitorId = localStorage.getItem('pixelswitchVisitorId') || crypto.randomUUID();
  localStorage.setItem('pixelswitchVisitorId', visitorId);
  els.name.value = localStorage.getItem('pixelswitchCommentName') || '';
  els.message.addEventListener('input', () => { els.chars.textContent = els.message.value.length; });
  els.sort.addEventListener('change', render);
  form.addEventListener('submit', submitComment);
  document.addEventListener('pixelswitch:toolchange', async (event) => { tool = event.detail.tool; await load(); });
  load();

  function currentTool() {
    const id = new URLSearchParams(location.search).get('tool');
    return data.tools.some((item) => item.id === id) ? id : 'convert';
  }
  function apiUrl(path='') { return String(config.commentsApiUrl || '').replace(/\/$/,'') + path; }
  function key() { return `pixelswitchComments:${tool}`; }
  async function load() {
    const info = data.tools.find((item) => item.id === tool);
    els.toolName.textContent = info ? info.name : 'this tool';
    if (config.commentsApiUrl) {
      try {
        const response = await fetch(apiUrl(`/comments?tool=${encodeURIComponent(tool)}`));
        if (!response.ok) throw new Error('Could not load comments');
        comments = await response.json();
        els.mode.textContent = 'Shared community comments are enabled.';
      } catch (error) {
        comments = readLocal();
        els.mode.textContent = 'Shared comments are temporarily unavailable. Showing comments saved in this browser.';
      }
    } else {
      comments = readLocal();
      els.mode.textContent = 'Demo mode: comments and replies are saved only in this browser. Connect the included comments API for public discussions.';
    }
    render();
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(key()) || '[]'); } catch { return []; } }
  function saveLocal() { localStorage.setItem(key(), JSON.stringify(comments)); }
  async function submitComment(event) {
    event.preventDefault();
    const name = els.name.value.trim();
    const message = els.message.value.trim();
    if (!name || message.length < 3) return;
    localStorage.setItem('pixelswitchCommentName', name);
    const payload = { tool, name, message, rating: Number(els.rating.value), parentId: null, visitorId };
    const created = await create(payload);
    if (created) comments.push(created);
    els.message.value=''; els.chars.textContent='0'; render();
  }
  async function create(payload) {
    if (config.commentsApiUrl) {
      try {
        const response = await fetch(apiUrl('/comments'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        if (!response.ok) throw new Error('Post failed');
        return await response.json();
      } catch (error) { els.mode.textContent='Could not reach the shared comments service. Your comment was saved in this browser.'; }
    }
    const item = { id: crypto.randomUUID(), ...payload, createdAt:new Date().toISOString(), likes:0, likedBy:[] };
    comments.push(item); saveLocal(); return null;
  }
  async function addReply(parentId, name, message) {
    const payload={tool,name,message,rating:0,parentId,visitorId};
    const created=await create(payload); if (created) comments.push(created); render();
  }
  async function like(id) {
    const item=comments.find((comment)=>comment.id===id); if(!item) return;
    item.likedBy=item.likedBy||[];
    if(item.likedBy.includes(visitorId)) return;
    if(config.commentsApiUrl){
      try{const response=await fetch(apiUrl(`/comments/${encodeURIComponent(id)}/like`),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})});if(response.ok){const updated=await response.json();item.likes=updated.likes;item.likedBy.push(visitorId);render();return;}}catch{}
    }
    item.likes=(item.likes||0)+1;item.likedBy.push(visitorId);saveLocal();render();
  }
  function sortedRoots() {
    const roots=comments.filter((item)=>!item.parentId);
    const mode=els.sort.value;
    return roots.sort((a,b)=>mode==='oldest'?new Date(a.createdAt)-new Date(b.createdAt):mode==='helpful'?(b.likes||0)-(a.likes||0):new Date(b.createdAt)-new Date(a.createdAt));
  }
  function render() {
    const roots=sortedRoots();
    els.list.replaceChildren();
    if(!roots.length){const empty=document.createElement('div');empty.className='empty-comments';empty.innerHTML='<strong>Start the conversation</strong><p>Share the first comment about this tool.</p>';els.list.append(empty);}
    roots.forEach((root)=>els.list.append(commentNode(root,false)));
    const rated=roots.filter((item)=>Number(item.rating)>0);
    const average=rated.length?rated.reduce((sum,item)=>sum+Number(item.rating),0)/rated.length:0;
    els.average.textContent=average?average.toFixed(1):'—';
    els.stars.textContent=average?'★'.repeat(Math.round(average))+'☆'.repeat(5-Math.round(average)):'☆☆☆☆☆';
    const total=comments.length;els.count.textContent=`${total} comment${total===1?'':'s'}`;
  }
  function commentNode(item,isReply) {
    const article=document.createElement('article');article.className=isReply?'comment-card reply-card':'comment-card';
    const head=document.createElement('div');head.className='comment-head';
    const avatar=document.createElement('span');avatar.className='comment-avatar';avatar.textContent=(item.name||'?').trim().charAt(0).toUpperCase();
    const who=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name;const meta=document.createElement('span');meta.textContent=new Date(item.createdAt).toLocaleString();who.append(name,meta);head.append(avatar,who);
    if(!isReply&&item.rating){const rating=document.createElement('span');rating.className='comment-rating';rating.textContent='★'.repeat(item.rating)+'☆'.repeat(5-item.rating);head.append(rating);}
    const text=document.createElement('p');text.textContent=item.message;
    const actions=document.createElement('div');actions.className='comment-actions';
    const likeBtn=document.createElement('button');likeBtn.type='button';likeBtn.textContent=`Helpful · ${item.likes||0}`;likeBtn.disabled=(item.likedBy||[]).includes(visitorId);likeBtn.addEventListener('click',()=>like(item.id));actions.append(likeBtn);
    if(!isReply){const replyBtn=document.createElement('button');replyBtn.type='button';replyBtn.textContent='Reply';actions.append(replyBtn);const replyWrap=document.createElement('div');replyWrap.className='reply-form-wrap hidden';const replyForm=document.createElement('form');replyForm.className='reply-form';replyForm.innerHTML='<input name="name" maxlength="60" required placeholder="Your name"><textarea name="message" maxlength="800" rows="2" required placeholder="Write a reply"></textarea><div><button type="button" class="cancel-reply">Cancel</button><button type="submit">Post reply</button></div>';replyWrap.append(replyForm);replyBtn.addEventListener('click',()=>{replyWrap.classList.toggle('hidden');replyForm.elements.name.value=els.name.value;});replyForm.querySelector('.cancel-reply').addEventListener('click',()=>replyWrap.classList.add('hidden'));replyForm.addEventListener('submit',async(event)=>{event.preventDefault();const n=replyForm.elements.name.value.trim();const m=replyForm.elements.message.value.trim();if(n&&m){await addReply(item.id,n,m);replyWrap.classList.add('hidden');}});article.append(head,text,actions,replyWrap);} else article.append(head,text,actions);
    if(!isReply){const replies=comments.filter((reply)=>reply.parentId===item.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));if(replies.length){const group=document.createElement('div');group.className='reply-group';replies.forEach((reply)=>group.append(commentNode(reply,true)));article.append(group);}}
    return article;
  }
})();
