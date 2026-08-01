'use strict';

const phase5ModuleCache = {};

function phase5MimeForExtension(ext) {
  return ({
    txt: 'text/plain', json: 'application/json', html: 'text/html', pdf: 'application/pdf',
    ttf: 'font/ttf', woff: 'font/woff', eot: 'application/vnd.ms-fontobject', svg: 'image/svg+xml',
    obj: 'text/plain', stl: 'model/stl', ply: 'application/octet-stream', glb: 'model/gltf-binary',
    sql: 'application/sql', yaml: 'application/yaml', yml: 'application/yaml', md: 'text/markdown',
  })[ext] || 'application/octet-stream';
}

function phase5Result(blob, name, mime = blob.type || 'application/octet-stream', originalSize = null) {
  return resultFromBlob(blob, name, mime, originalSize);
}

function safeSlug(value, fallback = 'pixelswitch-project') {
  const slug = String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || fallback;
}

function jsString(value) {
  return JSON.stringify(String(value));
}

async function createOcrWorker(language, psm = '3') {
  const Tesseract = requireLibrary('Tesseract', 'Tesseract.js OCR engine');
  const worker = await Tesseract.createWorker(language, 1, {
    logger(message) {
      if (message?.status && Number.isFinite(message.progress)) {
        const percent = Math.max(0, Math.min(100, Math.round(message.progress * 100)));
        els.processLabel.textContent = `${message.status} ${percent}%`;
      }
    },
  });
  await worker.setParameters({
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: $('#ocrPreserveSpaces')?.checked ? '1' : '0',
  });
  return worker;
}

async function processImageOcr() {
  const language = $('#ocrLanguage').value;
  const output = $('#ocrOutput').value;
  const psm = $('#ocrPsm').value;
  const worker = await createOcrWorker(language, psm);
  const results = [];
  try {
    for (let i = 0; i < state.files.length; i += 1) {
      const item = state.files[i];
      updateProgress(i + 1, state.files.length, 'OCR');
      const recognized = await worker.recognize(item.file);
      const data = recognized.data || {};
      if (output === 'json') {
        const payload = {
          source: item.file.name,
          language,
          confidence: Number.isFinite(data.confidence) ? data.confidence : null,
          text: data.text || '',
        };
        const blob = textBlob(JSON.stringify(payload, null, 2), 'application/json');
        results.push(phase5Result(blob, formatName(item.file.name, '-ocr', 'json'), 'application/json'));
      } else {
        const blob = textBlob(data.text || '', 'text/plain');
        results.push(phase5Result(blob, formatName(item.file.name, '-ocr', 'txt'), 'text/plain'));
      }
    }
  } finally {
    await worker.terminate();
  }
  return results;
}

async function processSearchablePdf() {
  const item = state.files[0];
  const language = $('#pdfOcrLanguage').value;
  const scale = Number($('#pdfOcrScale').value) || 2;
  const sourcePdf = await loadPdfWithPdfJs(item.file);
  const pages = parsePageSelection($('#pdfOcrPages').value, sourcePdf.numPages, true);
  const PDFLib = requireLibrary('PDFLib', 'pdf-lib');
  const outputPdf = await PDFLib.PDFDocument.create();
  outputPdf.setTitle(`${baseName(item.file.name)} searchable copy`);
  outputPdf.setProducer('PixelSwitch OCR');
  const worker = await createOcrWorker(language, '3');
  const recognizedText = [];

  try {
    for (let i = 0; i < pages.length; i += 1) {
      const pageNumber = pages[i] + 1;
      updateProgress(i + 1, pages.length, 'OCR page');
      const page = await sourcePdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const recognized = await worker.recognize(
        canvas,
        { pdfTitle: `${baseName(item.file.name)} page ${pageNumber}` },
        { pdf: true },
      );
      const pdfBytes = recognized?.data?.pdf;
      if (!pdfBytes) throw new Error('The OCR engine did not return a searchable PDF page.');
      const pagePdf = await PDFLib.PDFDocument.load(new Uint8Array(pdfBytes));
      const copied = await outputPdf.copyPages(pagePdf, pagePdf.getPageIndices());
      copied.forEach((copiedPage) => outputPdf.addPage(copiedPage));
      recognizedText.push(`--- Page ${pageNumber} ---\n${recognized.data.text || ''}`);
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    await worker.terminate();
  }

  const pdfBlob = new Blob([await outputPdf.save()], { type: 'application/pdf' });
  const results = [phase5Result(pdfBlob, formatName(item.file.name, '-searchable', 'pdf'), 'application/pdf', item.file.size)];
  if ($('#pdfOcrTextCopy').checked) {
    results.push(phase5Result(textBlob(recognizedText.join('\n\n'), 'text/plain'), formatName(item.file.name, '-ocr', 'txt'), 'text/plain'));
  }
  return results;
}

function latin1StringToBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function decodeBytes(bytes, charset = 'utf-8') {
  const normalized = String(charset || 'utf-8').replace(/["']/g, '').trim().toLowerCase();
  const aliases = { utf8: 'utf-8', latin1: 'windows-1252', 'iso-8859-1': 'windows-1252', usascii: 'utf-8', 'us-ascii': 'utf-8' };
  try {
    return new TextDecoder(aliases[normalized] || normalized, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

function decodeQuotedPrintableBytes(value) {
  const softRemoved = value.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < softRemoved.length; i += 1) {
    if (softRemoved[i] === '=' && /^[0-9a-f]{2}$/i.test(softRemoved.slice(i + 1, i + 3))) {
      bytes.push(parseInt(softRemoved.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(softRemoved.charCodeAt(i) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function decodeBase64Bytes(value) {
  const clean = value.replace(/\s+/g, '');
  if (!clean) return new Uint8Array();
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeMimeWords(value) {
  return String(value || '').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, mode, payload) => {
    try {
      const bytes = mode.toLowerCase() === 'b'
        ? decodeBase64Bytes(payload)
        : decodeQuotedPrintableBytes(payload.replace(/_/g, ' '));
      return decodeBytes(bytes, charset);
    } catch {
      return payload;
    }
  });
}

function parseHeaderBlock(rawHeaders) {
  const unfolded = String(rawHeaders || '').replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const name = line.slice(0, index).trim().toLowerCase();
    const value = decodeMimeWords(line.slice(index + 1).trim());
    if (headers[name]) headers[name] += `, ${value}`;
    else headers[name] = value;
  }
  return headers;
}

function splitHeaderAndBody(raw) {
  const match = /\r?\n\r?\n/.exec(raw);
  if (!match) return { headerText: raw, body: '' };
  return { headerText: raw.slice(0, match.index), body: raw.slice(match.index + match[0].length) };
}

function parseHeaderValue(value) {
  const segments = String(value || '').split(';');
  const type = segments.shift().trim().toLowerCase();
  const params = {};
  for (const segment of segments) {
    const index = segment.indexOf('=');
    if (index < 0) continue;
    const key = segment.slice(0, index).trim().toLowerCase();
    let val = segment.slice(index + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    params[key] = decodeMimeWords(val);
  }
  return { type, params };
}

function splitMultipartBody(body, boundary) {
  const delimiter = `--${boundary}`;
  const closing = `${delimiter}--`;
  const lines = String(body || '').split(/\r?\n/);
  const parts = [];
  let current = null;
  for (const line of lines) {
    if (line === delimiter || line === closing) {
      if (current !== null) parts.push(current.join('\r\n'));
      current = line === closing ? null : [];
      if (line === closing) break;
    } else if (current !== null) {
      current.push(line);
    }
  }
  if (current?.length) parts.push(current.join('\r\n'));
  return parts.filter((part) => part.trim());
}

function decodeMimeBody(body, transferEncoding, charset) {
  const encoding = String(transferEncoding || '').toLowerCase();
  let bytes;
  if (encoding === 'base64') bytes = decodeBase64Bytes(body);
  else if (encoding === 'quoted-printable') bytes = decodeQuotedPrintableBytes(body);
  else bytes = latin1StringToBytes(body);
  return { bytes, text: decodeBytes(bytes, charset) };
}

function parseMimePart(raw, depth = 0) {
  if (depth > 12) throw new Error('This email contains too many nested MIME sections.');
  const { headerText, body } = splitHeaderAndBody(raw);
  const headers = parseHeaderBlock(headerText);
  const contentType = parseHeaderValue(headers['content-type'] || 'text/plain; charset=utf-8');
  const disposition = parseHeaderValue(headers['content-disposition'] || '');
  const result = { headers, plain: [], html: [], attachments: [] };

  if (contentType.type.startsWith('multipart/')) {
    const boundary = contentType.params.boundary;
    if (!boundary) return result;
    for (const partRaw of splitMultipartBody(body, boundary)) {
      const part = parseMimePart(partRaw, depth + 1);
      result.plain.push(...part.plain);
      result.html.push(...part.html);
      result.attachments.push(...part.attachments);
    }
    return result;
  }

  const charset = contentType.params.charset || 'utf-8';
  const decoded = decodeMimeBody(body, headers['content-transfer-encoding'], charset);
  const filename = disposition.params.filename || contentType.params.name || '';
  const attachmentLike = disposition.type === 'attachment' || Boolean(filename) || (!contentType.type.startsWith('text/') && contentType.type !== 'message/rfc822');

  if (attachmentLike) {
    result.attachments.push({
      name: sanitizeFilename(filename || `attachment-${Date.now()}.${contentType.type.split('/')[1] || 'bin'}`, 'attachment.bin'),
      type: contentType.type || 'application/octet-stream',
      bytes: decoded.bytes,
    });
  } else if (contentType.type === 'text/html') {
    result.html.push(decoded.text);
  } else if (contentType.type === 'message/rfc822') {
    const nested = parseMimePart(decoded.text, depth + 1);
    result.plain.push(...nested.plain);
    result.html.push(...nested.html);
    result.attachments.push(...nested.attachments);
  } else {
    result.plain.push(decoded.text);
  }
  return result;
}

function htmlToPlainText(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizeEmailHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,link,meta,form,input,button,video,audio').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || ((name === 'href' || name === 'src') && (value.startsWith('javascript:') || value.startsWith('http:') || value.startsWith('https:') || value.startsWith('//')))) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function emailHeaderRows(headers) {
  const fields = [['From', 'from'], ['To', 'to'], ['Cc', 'cc'], ['Date', 'date'], ['Subject', 'subject'], ['Message-ID', 'message-id']];
  return fields.filter(([, key]) => headers[key]).map(([label, key]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(headers[key])}</td></tr>`).join('');
}

function emailAsText(headers, bodyText, includeHeaders) {
  const headerLines = includeHeaders
    ? [['From', 'from'], ['To', 'to'], ['Cc', 'cc'], ['Date', 'date'], ['Subject', 'subject'], ['Message-ID', 'message-id']]
      .filter(([, key]) => headers[key]).map(([label, key]) => `${label}: ${headers[key]}`).join('\n')
    : '';
  return `${headerLines}${headerLines ? '\n\n' : ''}${bodyText}`.trim() + '\n';
}

async function processEmlConvert() {
  const target = $('#emlTarget').value;
  const includeHeaders = $('#emlHeaders').checked;
  const extractAttachments = $('#emlAttachments').checked;
  const results = [];
  const usedNames = new Set();

  for (let i = 0; i < state.files.length; i += 1) {
    updateProgress(i + 1, state.files.length, 'Parsing');
    const item = state.files[i];
    const raw = new TextDecoder('windows-1252').decode(await item.file.arrayBuffer());
    const parsed = parseMimePart(raw);
    const headers = parsed.headers;
    const sanitizedHtml = parsed.html.length ? sanitizeEmailHtml(parsed.html.join('<hr>')) : '';
    const bodyText = parsed.plain.join('\n\n').trim() || htmlToPlainText(sanitizedHtml);
    const stem = baseName(item.file.name);

    if (target === 'txt') {
      const blob = textBlob(emailAsText(headers, bodyText, includeHeaders), 'text/plain');
      results.push(phase5Result(blob, uniqueArchiveName(`${stem}.txt`, usedNames), 'text/plain'));
    } else if (target === 'html') {
      const headerTable = includeHeaders ? `<table class="email-meta">${emailHeaderRows(headers)}</table>` : '';
      const body = sanitizedHtml || `<pre>${escapeHtml(bodyText)}</pre>`;
      const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(headers.subject || stem)}</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#172033}.email-meta{width:100%;border-collapse:collapse;margin-bottom:28px}.email-meta th,.email-meta td{padding:8px 10px;border-bottom:1px solid #dbe3ee;text-align:left;vertical-align:top}.email-meta th{width:110px;color:#526173}img{max-width:100%;height:auto}pre{white-space:pre-wrap}</style></head><body>${headerTable}<main>${body}</main></body></html>`;
      results.push(phase5Result(textBlob(documentHtml, 'text/html'), uniqueArchiveName(`${stem}.html`, usedNames), 'text/html'));
    } else {
      const container = document.createElement('article');
      container.className = 'render-doc email-render';
      const title = document.createElement('h1');
      title.textContent = headers.subject || item.file.name;
      container.appendChild(title);
      if (includeHeaders) {
        const table = document.createElement('table');
        table.innerHTML = emailHeaderRows(headers);
        container.appendChild(table);
      }
      const body = document.createElement('section');
      if (sanitizedHtml) body.innerHTML = sanitizedHtml;
      else {
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.fontFamily = 'Arial, sans-serif';
        pre.textContent = bodyText;
        body.appendChild(pre);
      }
      container.appendChild(body);
      els.renderSandbox.replaceChildren(container);
      try {
        const blob = await elementToPdfBlob(container, { margin: 12, format: 'a4', orientation: 'portrait', unit: 'mm', scale: 1.5, background: '#ffffff', quality: .92 });
        results.push(phase5Result(blob, uniqueArchiveName(`${stem}.pdf`, usedNames), 'application/pdf'));
      } finally {
        els.renderSandbox.replaceChildren();
      }
    }

    if (extractAttachments) {
      for (const attachment of parsed.attachments.slice(0, 50)) {
        const name = uniqueArchiveName(`${stem}-attachments/${attachment.name}`, usedNames);
        results.push(phase5Result(new Blob([attachment.bytes], { type: attachment.type }), name, attachment.type));
      }
    }
  }
  return results;
}

async function loadFontEditor() {
  if (!phase5ModuleCache.fontEditor) {
    phase5ModuleCache.fontEditor = import('https://esm.sh/fonteditor-core@2.6.3?bundle');
  }
  return phase5ModuleCache.fontEditor;
}

async function processFontConvert() {
  const module = await loadFontEditor();
  const createFont = module.createFont || module.default?.createFont;
  if (!createFont) throw new Error('The font conversion module did not expose createFont().');
  const target = $('#fontTarget').value;
  const hinting = $('#fontHinting').checked;
  const kerning = $('#fontKerning').checked;
  const results = [];

  for (let i = 0; i < state.files.length; i += 1) {
    updateProgress(i + 1, state.files.length, 'Converting font');
    const item = state.files[i];
    const input = item.ext === 'svg' ? await item.file.text() : await item.file.arrayBuffer();
    const readOptions = { type: item.ext, hinting, kerning, compound2simple: item.ext === 'otf' };
    if (item.ext === 'woff') readOptions.inflate = window.pako?.inflate;
    const font = createFont(input, readOptions);
    const writeOptions = { type: target, hinting, kerning };
    if (target === 'woff') writeOptions.deflate = window.pako?.deflate;
    const output = font.write(writeOptions);
    const blob = new Blob([output], { type: phase5MimeForExtension(target) });
    results.push(phase5Result(blob, formatName(item.file.name, '', target), phase5MimeForExtension(target), item.file.size));
  }
  return results;
}

async function loadThreeConverters() {
  if (!phase5ModuleCache.three) {
    phase5ModuleCache.three = Promise.all([
      import('three'),
      import('three/addons/loaders/OBJLoader.js'),
      import('three/addons/loaders/STLLoader.js'),
      import('three/addons/loaders/PLYLoader.js'),
      import('three/addons/exporters/OBJExporter.js'),
      import('three/addons/exporters/STLExporter.js'),
      import('three/addons/exporters/PLYExporter.js'),
      import('three/addons/exporters/GLTFExporter.js'),
    ]).then(([THREE, objLoader, stlLoader, plyLoader, objExporter, stlExporter, plyExporter, gltfExporter]) => ({
      THREE,
      OBJLoader: objLoader.OBJLoader,
      STLLoader: stlLoader.STLLoader,
      PLYLoader: plyLoader.PLYLoader,
      OBJExporter: objExporter.OBJExporter,
      STLExporter: stlExporter.STLExporter,
      PLYExporter: plyExporter.PLYExporter,
      GLTFExporter: gltfExporter.GLTFExporter,
    }));
  }
  return phase5ModuleCache.three;
}

function exporterResultToBlob(result, mime) {
  if (typeof result === 'string') return new Blob([result], { type: mime });
  if (result instanceof ArrayBuffer) return new Blob([result], { type: mime });
  if (ArrayBuffer.isView(result)) return new Blob([result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength)], { type: mime });
  return new Blob([JSON.stringify(result, null, 2)], { type: mime });
}

async function importModel(item, modules) {
  const { THREE, OBJLoader, STLLoader, PLYLoader } = modules;
  if (item.ext === 'obj') return new OBJLoader().parse(await item.file.text());
  const buffer = await item.file.arrayBuffer();
  let geometry;
  if (item.ext === 'stl') geometry = new STLLoader().parse(buffer);
  else geometry = new PLYLoader().parse(buffer);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xb8c5d6, roughness: 0.8, metalness: 0 }));
}

async function exportModel(object, target, binary, modules) {
  if (target === 'obj') return new Blob([new modules.OBJExporter().parse(object)], { type: 'text/plain' });
  if (target === 'stl') {
    const data = new modules.STLExporter().parse(object, { binary });
    return exporterResultToBlob(data, binary ? 'model/stl' : 'text/plain');
  }
  if (target === 'ply') {
    const exporter = new modules.PLYExporter();
    const data = await new Promise((resolve, reject) => {
      try {
        const immediate = exporter.parse(object, resolve, { binary });
        if (immediate !== undefined) resolve(immediate);
      } catch (error) { reject(error); }
    });
    return exporterResultToBlob(data, binary ? 'application/octet-stream' : 'text/plain');
  }
  const exporter = new modules.GLTFExporter();
  const data = await new Promise((resolve, reject) => exporter.parse(object, resolve, reject, { binary: true, onlyVisible: false, truncateDrawRange: true }));
  return exporterResultToBlob(data, 'model/gltf-binary');
}

async function processModelConvert() {
  const modules = await loadThreeConverters();
  const target = $('#modelTarget').value;
  const scale = Math.max(0.0001, Number($('#modelScale').value) || 1);
  const center = $('#modelCenter').checked;
  const binary = $('#modelBinary').checked;
  const results = [];

  for (let i = 0; i < state.files.length; i += 1) {
    updateProgress(i + 1, state.files.length, 'Converting model');
    const item = state.files[i];
    const object = await importModel(item, modules);
    object.scale.setScalar(scale);
    object.updateMatrixWorld(true);
    if (center) {
      const box = new modules.THREE.Box3().setFromObject(object);
      if (!box.isEmpty()) {
        const midpoint = box.getCenter(new modules.THREE.Vector3());
        object.position.sub(midpoint);
        object.updateMatrixWorld(true);
      }
    }
    const blob = await exportModel(object, target, binary, modules);
    results.push(phase5Result(blob, formatName(item.file.name, '', target), phase5MimeForExtension(target), item.file.size));
    object.traverse?.((node) => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose?.());
      else node.material?.dispose?.();
    });
  }
  return results;
}

function apiServerTemplate({ name, maxMb, retentionHours, auth }) {
  return `'use strict';\n\nconst express = require('express');\nconst helmet = require('helmet');\nconst cors = require('cors');\nconst rateLimit = require('express-rate-limit');\nconst multer = require('multer');\nconst crypto = require('crypto');\nconst fs = require('fs/promises');\nconst path = require('path');\n\nconst app = express();\nconst port = Number(process.env.PORT || 3000);\nconst uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'tmp');\nconst maxFileBytes = Number(process.env.MAX_FILE_MB || ${maxMb}) * 1024 * 1024;\nconst retentionMs = Number(process.env.RETENTION_HOURS || ${retentionHours}) * 60 * 60 * 1000;\nconst jobs = new Map();\n\napp.use(helmet());\napp.use(cors({ origin: process.env.CORS_ORIGIN || false }));\napp.use(express.json({ limit: '1mb' }));\napp.use(rateLimit({ windowMs: 60_000, max: 60 }));\n\nasync function ensureStorage() { await fs.mkdir(uploadDir, { recursive: true }); }\n\n${auth ? `function requireApiKey(req, res, next) {\n  const expected = process.env.API_KEY;\n  const supplied = req.get('x-api-key');\n  const expectedBuffer = Buffer.from(expected || '');\n  const suppliedBuffer = Buffer.from(supplied || '');\n  if (!expected || !supplied || expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {\n    return res.status(401).json({ error: 'invalid_api_key' });\n  }\n  next();\n}\napp.use('/v1', requireApiKey);` : '// API-key middleware disabled by generator settings.'}\n\nconst upload = multer({\n  dest: uploadDir,\n  limits: { fileSize: maxFileBytes, files: 1 },\n});\n\napp.get('/health', (_req, res) => res.json({ ok: true, service: ${jsString(name)} }));\n\napp.post('/v1/jobs', upload.single('file'), async (req, res, next) => {\n  try {\n    if (!req.file) return res.status(400).json({ error: 'file_required' });\n    const targetFormat = String(req.body.target_format || '').toLowerCase();\n    if (!targetFormat) return res.status(400).json({ error: 'target_format_required' });\n    const id = crypto.randomUUID();\n    const job = {\n      id, status: 'queued', sourceName: req.file.originalname, sourcePath: req.file.path,\n      targetFormat, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + retentionMs).toISOString(),\n    };\n    jobs.set(id, job);\n    queueMicrotask(async () => {\n      job.status = 'processing';\n      try {\n        // Replace this placeholder with an isolated conversion-worker queue.\n        throw new Error('conversion_worker_not_configured');\n      } catch (error) {\n        job.status = 'failed';\n        job.error = error.message;\n      }\n    });\n    res.status(202).json({ id, status: job.status, expires_at: job.expiresAt });\n  } catch (error) { next(error); }\n});\n\napp.get('/v1/jobs/:id', (req, res) => {\n  const job = jobs.get(req.params.id);\n  if (!job) return res.status(404).json({ error: 'job_not_found' });\n  res.json(job);\n});\n\napp.get('/v1/jobs/:id/download', (req, res) => {\n  const job = jobs.get(req.params.id);\n  if (!job) return res.status(404).json({ error: 'job_not_found' });\n  if (job.status !== 'completed' || !job.outputPath) return res.status(409).json({ error: 'job_not_ready' });\n  res.download(job.outputPath);\n});\n\napp.delete('/v1/jobs/:id', async (req, res) => {\n  const job = jobs.get(req.params.id);\n  if (!job) return res.status(404).json({ error: 'job_not_found' });\n  await Promise.allSettled([job.sourcePath, job.outputPath].filter(Boolean).map((file) => fs.unlink(file)));\n  jobs.delete(job.id);\n  res.status(204).end();\n});\n\napp.use((error, _req, res, _next) => {\n  console.error(error);\n  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'file_too_large' });\n  res.status(500).json({ error: 'internal_error' });\n});\n\nensureStorage().then(() => app.listen(port, () => console.log(\`${name} listening on :\${port}\`))).catch((error) => {\n  console.error(error);\n  process.exit(1);\n});\n`;
}

function openApiTemplate({ name, maxMb, auth }) {
  return `openapi: 3.1.0\ninfo:\n  title: ${name}\n  version: 0.1.0\n  description: Starter contract for asynchronous file-conversion jobs.\nservers:\n  - url: http://localhost:3000\ncomponents:\n  securitySchemes:\n    ApiKey:\n      type: apiKey\n      in: header\n      name: x-api-key\n  schemas:\n    Job:\n      type: object\n      properties:\n        id: { type: string, format: uuid }\n        status: { type: string, enum: [queued, processing, completed, failed, expired] }\n        expires_at: { type: string, format: date-time }\npaths:\n  /health:\n    get:\n      responses:\n        '200': { description: Service health }\n  /v1/jobs:\n    post:\n      ${auth ? 'security:\n        - ApiKey: []' : 'security: []'}\n      requestBody:\n        required: true\n        content:\n          multipart/form-data:\n            schema:\n              type: object\n              required: [file, target_format]\n              properties:\n                file:\n                  type: string\n                  format: binary\n                  description: Maximum ${maxMb} MB.\n                target_format: { type: string, example: pdf }\n      responses:\n        '202': { description: Job accepted }\n        '413': { description: File too large }\n  /v1/jobs/{id}:\n    parameters:\n      - in: path\n        name: id\n        required: true\n        schema: { type: string, format: uuid }\n    get:\n      ${auth ? 'security:\n        - ApiKey: []' : 'security: []'}\n      responses:\n        '200': { description: Job status }\n        '404': { description: Job not found }\n    delete:\n      ${auth ? 'security:\n        - ApiKey: []' : 'security: []'}\n      responses:\n        '204': { description: Job deleted }\n  /v1/jobs/{id}/download:\n    get:\n      ${auth ? 'security:\n        - ApiKey: []' : 'security: []'}\n      parameters:\n        - in: path\n          name: id\n          required: true\n          schema: { type: string, format: uuid }\n      responses:\n        '200': { description: Converted file }\n        '409': { description: Job not ready }\n`;
}

async function processApiStarter() {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const name = safeSlug($('#apiProjectName').value, 'pixelswitch-api');
  const maxMb = Math.max(1, Math.min(5000, Number($('#apiMaxSize').value) || 100));
  const retentionHours = Math.max(1, Math.min(168, Number($('#apiRetention').value) || 1));
  const auth = $('#apiAuth').checked;
  const docker = $('#apiDocker').checked;
  const zip = new JSZip();
  const root = zip.folder(name);
  root.file('package.json', JSON.stringify({
    name, version: '0.1.0', private: true, main: 'server.js',
    scripts: { start: 'node server.js', dev: 'node --watch server.js' },
    engines: { node: '>=20' },
    dependencies: { cors: '^2.8.5', express: '^5.1.0', 'express-rate-limit': '^8.0.1', helmet: '^8.1.0', multer: '^2.0.2' },
  }, null, 2));
  root.file('server.js', apiServerTemplate({ name, maxMb, retentionHours, auth }));
  root.file('openapi.yaml', openApiTemplate({ name, maxMb, auth }));
  root.file('.env.example', `PORT=3000\nMAX_FILE_MB=${maxMb}\nRETENTION_HOURS=${retentionHours}\nUPLOAD_DIR=./tmp\nCORS_ORIGIN=http://localhost:8080\n${auth ? 'API_KEY=replace-with-a-long-random-secret\n' : ''}`);
  root.file('.gitignore', 'node_modules/\n.env\ntmp/\n*.log\n');
  root.file('README.md', `# ${name}\n\nGenerated by PixelSwitch. This is a backend scaffold, not a production converter.\n\n## Start\n\n\`\`\`bash\ncp .env.example .env\nnpm install\nnpm start\n\`\`\`\n\n## Required production work\n\n- Put conversion jobs on a durable queue.\n- Run each conversion engine in an isolated worker with CPU, memory and time limits.\n- Validate file signatures, not only extensions.\n- Store uploads privately and expire them automatically.\n- Add malware scanning, structured logging, metrics and tracing.\n- Replace the in-memory job map with a database.\n- Use a secrets manager and rotate API keys.\n- Add signed download URLs and per-tenant usage limits.\n`);
  root.file('src/worker.example.js', `'use strict';\n\nasync function convertJob(job) {\n  // Route by source and target format, then call an isolated worker.\n  // Never execute converters in the public API process.\n  throw new Error('Implement conversion worker');\n}\n\nmodule.exports = { convertJob };\n`);
  if (docker) {
    root.file('Dockerfile', `FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --omit=dev\nCOPY . .\nUSER node\nEXPOSE 3000\nCMD ["node", "server.js"]\n`);
    root.file('compose.yaml', `services:\n  api:\n    build: .\n    env_file: .env\n    ports:\n      - "3000:3000"\n    volumes:\n      - converter_tmp:/app/tmp\nvolumes:\n  converter_tmp:\n`);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return [phase5Result(blob, `${name}-starter.zip`, 'application/zip')];
}

function postgresSchema({ teams, billing, audit }) {
  return `-- PixelSwitch business schema (PostgreSQL)\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n\nCREATE TABLE users (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  email text NOT NULL UNIQUE,\n  display_name text,\n  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now()\n);\n\n${teams ? `CREATE TABLE teams (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  name text NOT NULL,\n  slug text NOT NULL UNIQUE,\n  created_by uuid NOT NULL REFERENCES users(id),\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE team_memberships (\n  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,\n  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  role text NOT NULL CHECK (role IN ('owner','admin','developer','billing','viewer')),\n  created_at timestamptz NOT NULL DEFAULT now(),\n  PRIMARY KEY (team_id, user_id)\n);\n` : ''}\nCREATE TABLE api_keys (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  ${teams ? 'team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,' : 'user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,'}\n  name text NOT NULL,\n  key_prefix text NOT NULL,\n  secret_hash text NOT NULL,\n  last_used_at timestamptz,\n  expires_at timestamptz,\n  revoked_at timestamptz,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\n\nCREATE TABLE conversion_jobs (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  ${teams ? 'team_id uuid NOT NULL REFERENCES teams(id),' : 'user_id uuid NOT NULL REFERENCES users(id),'}\n  source_format text NOT NULL,\n  target_format text NOT NULL,\n  input_bytes bigint NOT NULL CHECK (input_bytes >= 0),\n  output_bytes bigint CHECK (output_bytes >= 0),\n  status text NOT NULL CHECK (status IN ('uploading','queued','processing','completed','failed','expired','deleted')),\n  error_code text,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  completed_at timestamptz,\n  expires_at timestamptz NOT NULL\n);\nCREATE INDEX conversion_jobs_owner_created_idx ON conversion_jobs (${teams ? 'team_id' : 'user_id'}, created_at DESC);\n\nCREATE TABLE usage_events (\n  id bigserial PRIMARY KEY,\n  ${teams ? 'team_id uuid NOT NULL REFERENCES teams(id),' : 'user_id uuid NOT NULL REFERENCES users(id),'}\n  job_id uuid REFERENCES conversion_jobs(id),\n  event_type text NOT NULL,\n  quantity bigint NOT NULL DEFAULT 1,\n  occurred_at timestamptz NOT NULL DEFAULT now(),\n  idempotency_key text UNIQUE\n);\n${billing ? `\nCREATE TABLE plans (\n  id text PRIMARY KEY,\n  name text NOT NULL,\n  monthly_price_minor integer NOT NULL DEFAULT 0,\n  currency char(3) NOT NULL DEFAULT 'USD',\n  included_conversions integer NOT NULL DEFAULT 0,\n  included_bytes bigint NOT NULL DEFAULT 0,\n  active boolean NOT NULL DEFAULT true\n);\n\nCREATE TABLE subscriptions (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  ${teams ? 'team_id uuid NOT NULL REFERENCES teams(id),' : 'user_id uuid NOT NULL REFERENCES users(id),'}\n  plan_id text NOT NULL REFERENCES plans(id),\n  provider text NOT NULL,\n  provider_customer_id text,\n  provider_subscription_id text UNIQUE,\n  status text NOT NULL,\n  current_period_start timestamptz,\n  current_period_end timestamptz,\n  cancel_at_period_end boolean NOT NULL DEFAULT false,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now()\n);\n` : ''}${audit ? `\nCREATE TABLE audit_logs (\n  id bigserial PRIMARY KEY,\n  ${teams ? 'team_id uuid REFERENCES teams(id),' : ''}\n  actor_user_id uuid REFERENCES users(id),\n  action text NOT NULL,\n  target_type text,\n  target_id text,\n  ip_hash text,\n  user_agent text,\n  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,\n  created_at timestamptz NOT NULL DEFAULT now()\n);\nCREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);\n` : ''}`;
}

function sqliteSchema({ teams, billing, audit }) {
  return `-- PixelSwitch business schema (SQLite development)\nPRAGMA foreign_keys = ON;\n\nCREATE TABLE users (\n  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT,\n  status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL\n);\n${teams ? `CREATE TABLE teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL);\nCREATE TABLE team_memberships (team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(team_id,user_id));\n` : ''}\nCREATE TABLE api_keys (id TEXT PRIMARY KEY, ${teams ? 'team_id TEXT NOT NULL REFERENCES teams(id)' : 'user_id TEXT NOT NULL REFERENCES users(id)'}, name TEXT NOT NULL, key_prefix TEXT NOT NULL, secret_hash TEXT NOT NULL, last_used_at TEXT, expires_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL);\nCREATE TABLE conversion_jobs (id TEXT PRIMARY KEY, ${teams ? 'team_id TEXT NOT NULL REFERENCES teams(id)' : 'user_id TEXT NOT NULL REFERENCES users(id)'}, source_format TEXT NOT NULL, target_format TEXT NOT NULL, input_bytes INTEGER NOT NULL, output_bytes INTEGER, status TEXT NOT NULL, error_code TEXT, created_at TEXT NOT NULL, completed_at TEXT, expires_at TEXT NOT NULL);\nCREATE TABLE usage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ${teams ? 'team_id TEXT NOT NULL REFERENCES teams(id)' : 'user_id TEXT NOT NULL REFERENCES users(id)'}, job_id TEXT REFERENCES conversion_jobs(id), event_type TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, occurred_at TEXT NOT NULL, idempotency_key TEXT UNIQUE);\n${billing ? 'CREATE TABLE plans (id TEXT PRIMARY KEY, name TEXT NOT NULL, monthly_price_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT \'USD\', included_conversions INTEGER NOT NULL DEFAULT 0, included_bytes INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);\nCREATE TABLE subscriptions (id TEXT PRIMARY KEY, ' + (teams ? 'team_id TEXT NOT NULL REFERENCES teams(id)' : 'user_id TEXT NOT NULL REFERENCES users(id)') + ', plan_id TEXT NOT NULL REFERENCES plans(id), provider TEXT NOT NULL, provider_customer_id TEXT, provider_subscription_id TEXT UNIQUE, status TEXT NOT NULL, current_period_start TEXT, current_period_end TEXT, cancel_at_period_end INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);\n' : ''}${audit ? 'CREATE TABLE audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ' + (teams ? 'team_id TEXT REFERENCES teams(id), ' : '') + 'actor_user_id TEXT REFERENCES users(id), action TEXT NOT NULL, target_type TEXT, target_id TEXT, ip_hash TEXT, user_agent TEXT, metadata_json TEXT NOT NULL DEFAULT \'{}\', created_at TEXT NOT NULL);\n' : ''}`;
}

async function processBusinessStarter() {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const name = safeSlug($('#businessProjectName').value, 'pixelswitch-business');
  const database = $('#businessDatabase').value;
  const billing = $('#businessBilling').checked;
  const teams = $('#businessTeams').checked;
  const audit = $('#businessAudit').checked;
  const zip = new JSZip();
  const root = zip.folder(name);
  root.file(database === 'postgres' ? 'schema.postgres.sql' : 'schema.sqlite.sql', database === 'postgres' ? postgresSchema({ teams, billing, audit }) : sqliteSchema({ teams, billing, audit }));
  root.file('RBAC.md', `# Role-based access control\n\n| Role | Conversions | API keys | Members | Billing | Audit |\n|---|---:|---:|---:|---:|---:|\n| Owner | Full | Full | Full | Full | Read |\n| Admin | Full | Full | Manage | Read | Read |\n| Developer | Create/read | Own/manage | No | No | No |\n| Billing | Read usage | No | No | Full | No |\n| Viewer | Read only | No | No | No | No |\n\nEnforce authorization in the API on every request. Never trust roles sent by the browser.\n`);
  root.file('AUTHENTICATION.md', `# Authentication implementation notes\n\n- Use a maintained identity provider or audited authentication library.\n- Store only password hashes produced by an appropriate password-hashing algorithm.\n- Require verified email before sensitive actions.\n- Protect sessions with secure, HttpOnly and SameSite cookies.\n- Add MFA for owners and administrators.\n- Hash API-key secrets; display the full secret only once.\n- Rotate signing keys and API keys.\n- Rate-limit sign-in, password reset and invitation endpoints.\n`);
  if (billing) root.file('BILLING.md', `# Billing integration notes\n\n- Treat provider webhooks as the source of truth.\n- Verify webhook signatures and store event IDs for idempotency.\n- Map provider customers and subscriptions to the owning user or team.\n- Keep entitlements separate from price labels.\n- Meter conversion count, input bytes, output bytes and worker seconds.\n- Reconcile usage events before invoicing.\n- Do not store raw card details.\n`);
  root.file('PRIVACY_SECURITY.md', `# File privacy and security checklist\n\n- Validate file signatures and allowlist formats.\n- Isolate converters from the public API and from the internet.\n- Limit CPU, memory, disk, page count, archive expansion and run time.\n- Encrypt private objects and databases.\n- Use signed, short-lived download URLs.\n- Delete input and output objects through lifecycle rules.\n- Record security-relevant actions without logging file contents or secrets.\n- Provide account export and deletion workflows.\n- Document retention, subprocessors and incident response.\n`);
  root.file('README.md', `# ${name}\n\nGenerated by PixelSwitch. The package contains a starting database schema and implementation guidance for business accounts. It is not a complete authentication or billing system.\n\n## Selected options\n\n- Database: ${database}\n- Teams and RBAC: ${teams ? 'included' : 'not included'}\n- Subscription tables: ${billing ? 'included' : 'not included'}\n- Audit logs: ${audit ? 'included' : 'not included'}\n\nReview the schema with your backend, security, privacy and legal teams before production use.\n`);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return [phase5Result(blob, `${name}-starter.zip`, 'application/zip')];
}

window.Phase5Handlers = {
  imageocr: processImageOcr,
  searchablepdf: processSearchablePdf,
  emlconvert: processEmlConvert,
  fontconvert: processFontConvert,
  modelconvert: processModelConvert,
  apistarter: processApiStarter,
  businessstarter: processBusinessStarter,
};
