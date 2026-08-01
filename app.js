'use strict';

const state = {
  phase: 'images',
  tool: 'convert',
  files: [],
  results: [],
  crop: { image: null, fileId: null, x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 },
  resizingWidth: false,
  resizingHeight: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const toolConfig = {
  convert: {
    phase: 'images', title: 'Convert images', action: 'Convert images', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.ico',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'], multiple: true, max: 40,
    dropTitle: 'Drop images here', dropDescription: 'or click to browse JPG, PNG, WebP, GIF, BMP, SVG, AVIF or ICO files', browse: 'Choose images',
    note: 'Up to 40 files · browser memory determines maximum size · output is PNG, JPG or WebP',
  },
  compress: {
    phase: 'images', title: 'Compress images', action: 'Compress images', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.ico',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'], multiple: true, max: 40,
    dropTitle: 'Drop images here', dropDescription: 'Choose images to reduce their file size', browse: 'Choose images',
    note: 'Up to 40 files · JPG and WebP give the strongest compression',
  },
  resize: {
    phase: 'images', title: 'Resize images', action: 'Resize images', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.ico',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'], multiple: true, max: 40,
    dropTitle: 'Drop images here', dropDescription: 'Choose images and set exact pixel dimensions', browse: 'Choose images',
    note: 'The first image supplies the initial width and height',
  },
  crop: {
    phase: 'images', title: 'Crop image', action: 'Crop image', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.ico',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'], multiple: false, max: 1,
    dropTitle: 'Drop one image here', dropDescription: 'Choose an image to crop', browse: 'Choose image',
    note: 'One image at a time',
  },
  imagepdf: {
    phase: 'images', title: 'Create PDF from images', action: 'Create PDF', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,image/x-icon,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif,.ico',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'ico'], multiple: true, max: 40,
    dropTitle: 'Drop images here', dropDescription: 'Choose images to combine into PDF pages', browse: 'Choose images',
    note: 'Images are placed into the PDF in selection order',
  },
  docxpdf: {
    phase: 'documents', title: 'Word to PDF', action: 'Convert Word to PDF', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'], multiple: false, max: 1,
    dropTitle: 'Drop a DOCX file here', dropDescription: 'Convert a modern Word document into PDF', browse: 'Choose DOCX',
    note: 'DOCX only · legacy .doc needs a server conversion engine',
    notice: 'Word conversion preserves readable content and basic structure, but it is not a pixel-perfect Microsoft Word renderer.',
  },
  xlsxpdf: {
    phase: 'documents', title: 'Excel to PDF', action: 'Convert spreadsheet to PDF', accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    extensions: ['xlsx', 'xls'], multiple: false, max: 1,
    dropTitle: 'Drop a spreadsheet here', dropDescription: 'Convert XLSX or XLS worksheets into PDF tables', browse: 'Choose spreadsheet',
    note: 'XLSX and XLS · values and basic cell formatting',
    notice: 'Spreadsheet conversion is optimized for readable tables. Charts, macros and exact print layouts are not reproduced.',
  },
  pptxpdf: {
    phase: 'documents', title: 'PPTX to PDF', action: 'Create text-first PDF', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: ['pptx'], multiple: false, max: 1,
    dropTitle: 'Drop a PPTX file here', dropDescription: 'Extract slide text into a clean presentation PDF', browse: 'Choose PPTX',
    note: 'Experimental · PPTX only',
    notice: 'This browser-only tool extracts slide text. It does not reproduce original positioning, images, diagrams, animations or media.',
  },
  pdfjpg: {
    phase: 'documents', title: 'PDF to Image', action: 'Convert PDF pages to image', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: false, max: 1,
    dropTitle: 'Drop a PDF here', dropDescription: 'Render all or selected PDF pages as JPG images', browse: 'Choose PDF',
    note: 'One PDF · each selected page becomes a JPG file',
  },
  mergepdf: {
    phase: 'documents', title: 'Merge PDF', action: 'Merge PDFs', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: true, max: 20, min: 2,
    dropTitle: 'Drop PDF files here', dropDescription: 'Select two or more PDFs to join', browse: 'Choose PDFs',
    note: 'Up to 20 PDFs · use arrows to adjust merge order',
  },
  splitpdf: {
    phase: 'documents', title: 'Split or extract PDF', action: 'Split PDF', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: false, max: 1,
    dropTitle: 'Drop a PDF here', dropDescription: 'Create one PDF per page or extract selected pages', browse: 'Choose PDF',
    note: 'One PDF at a time',
  },
  compresspdf: {
    phase: 'documents', title: 'Compress PDF', action: 'Compress PDF', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: false, max: 1,
    dropTitle: 'Drop a PDF here', dropDescription: 'Create a smaller rasterized copy of a PDF', browse: 'Choose PDF',
    note: 'Best for scans and image-heavy PDFs',
    notice: 'Compression is lossy and converts each page into an image. Searchable text, links and forms are removed.',
  },
  rotatepdf: {
    phase: 'documents', title: 'Rotate PDF', action: 'Rotate PDF', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: false, max: 1,
    dropTitle: 'Drop a PDF here', dropDescription: 'Rotate every page or selected pages', browse: 'Choose PDF',
    note: 'One PDF at a time · original page content is preserved',
  },
  createzip: {
    phase: 'phase4', title: 'Create ZIP archive', action: 'Create ZIP', accept: '*/*',
    extensions: ['*'], multiple: true, max: 100,
    dropTitle: 'Drop files here', dropDescription: 'Package up to 100 files into one ZIP archive', browse: 'Choose files',
    note: 'Any regular files · folders selected by drag-and-drop depend on browser support',
  },
  extractzip: {
    phase: 'phase4', title: 'Extract ZIP archive', action: 'Extract ZIP', accept: '.zip,application/zip,application/x-zip-compressed',
    extensions: ['zip'], multiple: false, max: 1,
    dropTitle: 'Drop a ZIP file here', dropDescription: 'Inspect and extract safe files from a ZIP archive', browse: 'Choose ZIP',
    note: 'ZIP only · up to 200 entries and 100 MB extracted data',
    notice: 'Encrypted ZIP files and 7Z/RAR archives are not supported in this browser-only build.',
  },
  epubextract: {
    phase: 'phase4', title: 'Export EPUB content', action: 'Export EPUB', accept: '.epub,application/epub+zip',
    extensions: ['epub'], multiple: true, max: 10,
    dropTitle: 'Drop EPUB files here', dropDescription: 'Export readable chapters as text, HTML or Markdown', browse: 'Choose EPUB files',
    note: 'DRM-free EPUB only · up to 10 books',
    notice: 'Fixed-layout EPUBs, DRM, scripts and advanced publisher styling are simplified or unsupported.',
  },
  epubcreate: {
    phase: 'phase4', title: 'Create EPUB e-book', action: 'Create EPUB', accept: '.txt,.html,.htm,.md,text/plain,text/html,text/markdown',
    extensions: ['txt', 'html', 'htm', 'md'], multiple: true, max: 50,
    dropTitle: 'Drop chapter files here', dropDescription: 'Combine TXT, HTML or Markdown files into one EPUB', browse: 'Choose chapters',
    note: 'Up to 50 chapter files · selection order becomes reading order',
  },
  csvjson: {
    phase: 'phase4', title: 'CSV or TSV to JSON', action: 'Convert to JSON', accept: '.csv,.tsv,text/csv,text/tab-separated-values',
    extensions: ['csv', 'tsv'], multiple: true, max: 50,
    dropTitle: 'Drop CSV or TSV files here', dropDescription: 'Convert table rows into JSON arrays', browse: 'Choose tables',
    note: 'Up to 50 files · quoted cells and embedded line breaks supported',
  },
  jsoncsv: {
    phase: 'phase4', title: 'JSON to CSV or TSV', action: 'Convert to table', accept: '.json,application/json',
    extensions: ['json'], multiple: true, max: 50,
    dropTitle: 'Drop JSON files here', dropDescription: 'Convert arrays of objects into flat tables', browse: 'Choose JSON files',
    note: 'Up to 50 files · nested objects can use dot notation',
  },
  structured: {
    phase: 'phase4', title: 'Convert structured data', action: 'Convert data', accept: '.json,.xml,.yaml,.yml,application/json,application/xml,text/xml,text/yaml',
    extensions: ['json', 'xml', 'yaml', 'yml'], multiple: true, max: 50,
    dropTitle: 'Drop data files here', dropDescription: 'Convert JSON, XML, YAML and YML files', browse: 'Choose data files',
    note: 'Up to 50 files · XML attributes are represented with an @ prefix',
  },
  subtitles: {
    phase: 'phase4', title: 'Convert subtitles', action: 'Convert subtitles', accept: '.srt,.vtt,text/vtt,text/plain',
    extensions: ['srt', 'vtt'], multiple: true, max: 50,
    dropTitle: 'Drop subtitle files here', dropDescription: 'Convert SRT and VTT or shift cue timing', browse: 'Choose subtitles',
    note: 'Up to 50 files · positive offsets delay cues; negative offsets advance them',
  },
  imageocr: {
    phase: 'phase5', title: 'Image to text OCR', action: 'Recognize text', accept: 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'], multiple: true, max: 20,
    dropTitle: 'Drop text images here', dropDescription: 'Recognize printed text in JPG, PNG, WebP, GIF or BMP images', browse: 'Choose images',
    note: 'Up to 20 images · OCR language data downloads on first use',
    notice: 'OCR accuracy depends on image sharpness, language, rotation, font and layout. Handwriting is not the main target.',
  },
  searchablepdf: {
    phase: 'phase5', title: 'Create searchable PDF', action: 'Run PDF OCR', accept: 'application/pdf,.pdf',
    extensions: ['pdf'], multiple: false, max: 1,
    dropTitle: 'Drop a scanned PDF here', dropDescription: 'Recognize page images and build a searchable copy', browse: 'Choose PDF',
    note: 'One PDF · selected pages are rasterized and recognized',
    notice: 'The generated PDF is searchable but not structurally identical to the source. Links, forms, annotations and vectors are flattened.',
  },
  emlconvert: {
    phase: 'phase5', title: 'Convert EML email', action: 'Convert email', accept: '.eml,message/rfc822,text/plain',
    extensions: ['eml'], multiple: true, max: 20,
    dropTitle: 'Drop EML files here', dropDescription: 'Export email messages and common MIME attachments', browse: 'Choose EML files',
    note: 'Up to 20 .eml files · common MIME messages supported',
  },
  fontconvert: {
    phase: 'phase5', title: 'Convert font files', action: 'Convert fonts', accept: '.ttf,.otf,.woff,.eot,.svg,font/ttf,font/otf,font/woff,application/vnd.ms-fontobject,image/svg+xml',
    extensions: ['ttf', 'otf', 'woff', 'eot', 'svg'], multiple: true, max: 20,
    dropTitle: 'Drop font files here', dropDescription: 'Convert TTF, OTF, WOFF, EOT or SVG fonts', browse: 'Choose fonts',
    note: 'Up to 20 fonts · WOFF2 is not included in this build',
    notice: 'Only convert fonts you are licensed to use and redistribute. Some font features may not survive format conversion.',
  },
  modelconvert: {
    phase: 'phase5', title: 'Convert 3D models', action: 'Convert models', accept: '.obj,.stl,.ply,text/plain,model/stl,application/sla',
    extensions: ['obj', 'stl', 'ply'], multiple: true, max: 10,
    dropTitle: 'Drop 3D model files here', dropDescription: 'Convert OBJ, STL or PLY geometry', browse: 'Choose models',
    note: 'Up to 10 files · geometry only',
    notice: 'Materials, external textures, rigs, morph targets and animations are not imported from OBJ, STL or PLY.',
  },
  apistarter: {
    phase: 'phase5', title: 'Developer API starter', action: 'Generate API starter', accept: '',
    extensions: [], multiple: false, max: 0, min: 0, noInput: true,
    noInputEyebrow: 'Backend starter generator', noInputTitle: 'Generate an API project',
    noInputDescription: 'Create an Express server scaffold with OpenAPI documentation, API-key middleware, job endpoints and optional Docker files.',
    dropTitle: '', dropDescription: '', browse: '', note: 'No upload required',
    notice: 'This generates source code only. It does not deploy a service or include production conversion engines, object storage or queues.',
  },
  businessstarter: {
    phase: 'phase5', title: 'Business account starter', action: 'Generate business starter', accept: '',
    extensions: [], multiple: false, max: 0, min: 0, noInput: true,
    noInputEyebrow: 'Account architecture generator', noInputTitle: 'Generate team and billing schemas',
    noInputDescription: 'Create database schemas, role guidance and integration notes for users, teams, API keys, usage, subscriptions and audit logs.',
    dropTitle: '', dropDescription: '', browse: '', note: 'No upload required',
    notice: 'This is a backend blueprint, not a live account system. Secure authentication, billing webhooks and privacy controls must be implemented server-side.',
  },
};

const els = {
  phaseButtons: $$('.phase-button'),
  phaseTabs: $$('[data-phase-tabs]'),
  tabs: $$('.tool-tab'),
  dropZone: $('#dropZone'),
  dropTitle: $('#dropTitle'),
  dropDescription: $('#dropDescription'),
  dropNote: $('#dropNote'),
  fileInput: $('#fileInput'),
  browseButton: $('#browseButton'),
  addMoreFiles: $('#addMoreFiles'),
  fileArea: $('#fileArea'),
  fileList: $('#fileList'),
  fileCount: $('#fileCount'),
  totalSize: $('#totalSize'),
  clearFiles: $('#clearFiles'),
  processButton: $('#processButton'),
  processLabel: $('#processLabel'),
  settingsTitle: $('#settingsTitle'),
  estimateBox: $('#estimateBox'),
  resultsPanel: $('#resultsPanel'),
  resultsList: $('#resultsList'),
  downloadAll: $('#downloadAll'),
  cropWorkspace: $('#cropWorkspace'),
  cropCanvasWrap: $('#cropCanvasWrap'),
  cropCanvas: $('#cropCanvas'),
  cropSelection: $('#cropSelection'),
  toolNotice: $('#toolNotice'),
  noInputPanel: $('#noInputPanel'),
  noInputEyebrow: $('#noInputEyebrow'),
  noInputTitle: $('#noInputTitle'),
  noInputDescription: $('#noInputDescription'),
  renderSandbox: $('#renderSandbox'),
  toastRegion: $('#toastRegion'),
};

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function fileExtension(name) {
  const parts = String(name).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function baseName(name) {
  return String(name).replace(/\.[^/.]+$/, '');
}

function formatName(name, suffix, ext) {
  return `${baseName(name)}${suffix}.${ext}`;
}

function sanitizeFilename(name, fallback = 'converted.pdf') {
  const cleaned = String(name || '').replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned || fallback;
}

function mimeToExt(mime) {
  return ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
    'image/bmp': 'bmp', 'image/x-icon': 'ico',
  })[mime] || 'bin';
}

function imageMimeFromExtension(ext) {
  return ({
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon',
  })[ext] || '';
}

function mimeFromExtension(ext) {
  return ({
    pdf: 'application/pdf', zip: 'application/zip', epub: 'application/epub+zip',
    json: 'application/json', xml: 'application/xml', yaml: 'application/yaml', yml: 'application/yaml',
    csv: 'text/csv', tsv: 'text/tab-separated-values', txt: 'text/plain', md: 'text/markdown',
    html: 'text/html', htm: 'text/html', srt: 'application/x-subrip', vtt: 'text/vtt', eml: 'message/rfc822',
    ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', eot: 'application/vnd.ms-fontobject', svg: 'image/svg+xml',
    obj: 'text/plain', stl: 'model/stl', ply: 'application/octet-stream', glb: 'model/gltf-binary',
  })[ext] || 'application/octet-stream';
}

function textBlob(text, mime = 'text/plain') {
  return new Blob([String(text)], { type: `${mime};charset=utf-8` });
}

async function readText(file) {
  return file.text();
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function toast(message, type = 'info') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : ''}`;
  node.textContent = message;
  els.toastRegion.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function requireLibrary(globalName, label) {
  if (!window[globalName]) {
    throw new Error(`${label} could not load. Check your internet connection or host the library locally.`);
  }
  return window[globalName];
}

function revokeObjectUrls(items) {
  items.forEach((item) => {
    if (item.url) URL.revokeObjectURL(item.url);
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
}

function setPhase(phase, chooseDefault = true) {
  state.phase = phase;
  els.phaseButtons.forEach((button) => {
    const active = button.dataset.phase === phase;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  els.phaseTabs.forEach((tabs) => tabs.classList.toggle('hidden', tabs.dataset.phaseTabs !== phase));
  if (chooseDefault && toolConfig[state.tool].phase !== phase) {
    setTool(phase === 'images' ? 'convert' : phase === 'documents' ? 'docxpdf' : phase === 'phase4' ? 'createzip' : 'imageocr');
  }
}

function filesCompatible(tool) {
  const allowed = toolConfig[tool].extensions;
  return allowed.includes('*') || state.files.every((item) => allowed.includes(item.ext));
}

function updateSeoTags(config, tool) {
  const description = `${config.title} free online — ${config.dropDescription}. No upload required, runs entirely in your browser, and your files are never sent to a server.`.replace(/\s+/g, ' ').trim();
  const url = new URL(`converter.html?tool=${encodeURIComponent(tool)}`, location.href).href;
  const titleText = `${config.title} — PixelSwitch`;
  const setMeta = (selector, attr, value) => { const node = document.querySelector(selector); if (node) node.setAttribute(attr, value); };
  setMeta('meta[name="description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', titleText);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[name="twitter:title"]', 'content', titleText);
  setMeta('meta[name="twitter:description"]', 'content', description);
}

function setTool(tool) {
  const config = toolConfig[tool];
  if (!config) return;

  if (state.files.length && (config.noInput || !filesCompatible(tool))) clearFiles();
  state.tool = tool;
  setPhase(config.phase, false);

  els.tabs.forEach((tab) => {
    const active = tab.dataset.tool === tool;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  $$('.tool-settings').forEach((node) => node.classList.add('hidden'));
  $(`#${tool}Settings`)?.classList.remove('hidden');

  const categoryMeta = {
    images: { name: 'Image Tools', page: 'image-tools.html' },
    documents: { name: 'PDF & Office', page: 'pdf-office-tools.html' },
    phase4: { name: 'Archives & Data', page: 'archive-data-tools.html' },
    phase5: { name: 'Advanced Tools', page: 'advanced-tools.html' },
  }[config.phase];
  const pageTitle = $('#converterPageTitle');
  const heroTitle = $('#converterHeroTitle');
  const breadcrumbTool = $('#converterBreadcrumbTool');
  const categoryLink = $('#converterCategoryLink');
  if (pageTitle) pageTitle.textContent = config.title;
  if (heroTitle) heroTitle.textContent = config.title;
  if (breadcrumbTool) breadcrumbTool.textContent = config.title;
  if (categoryLink && categoryMeta) { categoryLink.textContent = categoryMeta.name; categoryLink.href = categoryMeta.page; }
  document.title = `${config.title} — PixelSwitch`;
  updateSeoTags(config, tool);
  const targetUrl = `converter.html?tool=${encodeURIComponent(tool)}`;
  if (location.pathname.endsWith('converter.html') && `${location.pathname.split('/').pop()}${location.search}` !== targetUrl) history.replaceState({}, '', targetUrl);
  document.dispatchEvent(new CustomEvent('pixelswitch:toolchange', { detail: { tool, title: config.title, category: categoryMeta?.name || '' } }));

  els.settingsTitle.textContent = config.title;
  els.processLabel.textContent = config.action;
  els.fileInput.accept = config.accept;
  els.fileInput.multiple = config.multiple;
  els.dropTitle.textContent = config.dropTitle;
  els.dropDescription.textContent = config.dropDescription;
  els.browseButton.textContent = config.browse;
  els.dropNote.textContent = config.note;
  els.toolNotice.textContent = config.notice || '';
  els.toolNotice.classList.toggle('hidden', !config.notice);
  els.addMoreFiles.classList.toggle('hidden', !config.multiple || config.noInput);
  els.noInputPanel.classList.toggle('hidden', !config.noInput);
  if (config.noInput) {
    els.noInputEyebrow.textContent = config.noInputEyebrow || 'Starter generator';
    els.noInputTitle.textContent = config.noInputTitle || 'No upload required';
    els.noInputDescription.textContent = config.noInputDescription || 'Choose settings and generate the project.';
  }

  els.cropWorkspace.classList.toggle('hidden', tool !== 'crop' || state.files.length === 0);
  els.fileArea.classList.toggle('hidden', state.files.length === 0);
  if (tool === 'crop' && state.files[0]) loadCropImage(state.files[0]);
  renderFiles();
}

async function addFiles(fileList) {
  if (toolConfig[state.tool].noInput) return;
  const incoming = [...fileList];
  if (!incoming.length) return;
  const config = toolConfig[state.tool];
  const accepted = [];

  for (const file of incoming) {
    const ext = fileExtension(file.name);
    if (!config.extensions.includes('*') && !config.extensions.includes(ext)) {
      toast(`${file.name}: unsupported for ${config.title}`, 'error');
      continue;
    }
    const mime = imageMimeFromExtension(ext) || file.type || mimeFromExtension(ext);
    accepted.push({
      id: uid(), file, ext, mime,
      previewUrl: imageMimeFromExtension(ext) ? URL.createObjectURL(file) : null,
    });
  }

  if (!config.multiple) {
    revokeObjectUrls(state.files);
    state.files = accepted.slice(0, 1);
    revokeObjectUrls(accepted.slice(1));
  } else {
    const slots = Math.max(0, config.max - state.files.length);
    state.files.push(...accepted.slice(0, slots));
    revokeObjectUrls(accepted.slice(slots));
    if (accepted.length > slots) toast(`This tool accepts up to ${config.max} files per batch.`, 'error');
  }

  els.fileInput.value = '';
  clearResults();
  renderFiles();
  if (state.tool === 'crop' && state.files[0]) await loadCropImage(state.files[0]);
}

function renderFiles() {
  const config = toolConfig[state.tool];
  const noInput = Boolean(config.noInput);
  const hasFiles = state.files.length > 0;
  els.dropZone.classList.toggle('hidden', noInput || hasFiles);
  els.fileArea.classList.toggle('hidden', noInput || !hasFiles);
  els.noInputPanel.classList.toggle('hidden', !noInput);
  els.cropWorkspace.classList.toggle('hidden', noInput || !hasFiles || state.tool !== 'crop');
  els.processButton.disabled = noInput ? false : state.files.length < (config.min ?? 1);

  const total = state.files.reduce((sum, item) => sum + item.file.size, 0);
  els.fileCount.textContent = `${state.files.length} file${state.files.length === 1 ? '' : 's'}`;
  els.totalSize.textContent = formatBytes(total);

  els.fileList.innerHTML = state.files.map((item, index) => {
    const preview = item.previewUrl
      ? `<img class="file-thumb" src="${item.previewUrl}" alt="" />`
      : `<span class="file-badge ${escapeHtml(item.ext)}">${escapeHtml(item.ext.toUpperCase())}</span>`;
    const orderControls = ['mergepdf', 'epubcreate'].includes(state.tool)
      ? `<button class="icon-button move-file" data-direction="up" data-index="${index}" type="button" aria-label="Move ${escapeHtml(item.file.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button><button class="icon-button move-file" data-direction="down" data-index="${index}" type="button" aria-label="Move ${escapeHtml(item.file.name)} down" ${index === state.files.length - 1 ? 'disabled' : ''}>↓</button>`
      : '';
    return `<div class="file-item" data-id="${item.id}">${preview}<div class="file-meta"><strong title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</strong><span>${formatBytes(item.file.size)} · ${escapeHtml(item.ext.toUpperCase())}</span></div><div class="file-actions">${orderControls}<button class="icon-button remove-file" data-id="${item.id}" type="button" aria-label="Remove ${escapeHtml(item.file.name)}">×</button></div></div>`;
  }).join('');

  $$('.remove-file').forEach((button) => button.addEventListener('click', () => removeFile(button.dataset.id)));
  $$('.move-file').forEach((button) => button.addEventListener('click', () => moveFile(Number(button.dataset.index), button.dataset.direction)));
  autoFillResizeDimensions();
  renderEstimate();
}

function moveFile(index, direction) {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= state.files.length) return;
  [state.files[index], state.files[target]] = [state.files[target], state.files[index]];
  renderFiles();
}

function removeFile(id) {
  const index = state.files.findIndex((item) => item.id === id);
  if (index < 0) return;
  revokeObjectUrls([state.files[index]]);
  state.files.splice(index, 1);
  clearResults();
  renderFiles();
  if (state.tool === 'crop' && state.files[0]) loadCropImage(state.files[0]);
}

function clearFiles() {
  revokeObjectUrls(state.files);
  state.files = [];
  state.crop.image = null;
  els.fileInput.value = '';
  clearResults();
  renderFiles();
}

function clearResults() {
  revokeObjectUrls(state.results);
  state.results = [];
  els.resultsPanel.classList.add('hidden');
  els.resultsList.innerHTML = '';
}

function renderEstimate() {
  if (toolConfig[state.tool].noInput) {
    els.estimateBox.textContent = `No upload required · Ready to generate ${toolConfig[state.tool].title.toLowerCase()}`;
    return;
  }
  if (!state.files.length) {
    els.estimateBox.textContent = 'Ready when files are added';
    return;
  }
  const total = state.files.reduce((sum, item) => sum + item.file.size, 0);
  els.estimateBox.textContent = `${state.files.length} file${state.files.length > 1 ? 's' : ''} · ${formatBytes(total)} · Ready for ${toolConfig[state.tool].title.toLowerCase()}`;
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

function canvasToBlob(canvas, mime, quality = .92) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(`Browser cannot export ${mime}`)), mime, quality));
}

function canvasToBmpBlob(canvas) {
  const { width, height } = canvas;
  const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  view.setUint8(0, 0x42); view.setUint8(1, 0x4D);
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, pixels[i + 2]);
      view.setUint8(offset++, pixels[i + 1]);
      view.setUint8(offset++, pixels[i]);
    }
    for (let p = 0; p < rowSize - width * 3; p++) view.setUint8(offset++, 0);
  }
  return new Blob([buffer], { type: 'image/bmp' });
}

async function canvasToIcoBlob(canvas) {
  const maxDim = 256;
  let source = canvas;
  if (canvas.width > maxDim || canvas.height > maxDim) {
    const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height);
    source = document.createElement('canvas');
    source.width = Math.max(1, Math.round(canvas.width * scale));
    source.height = Math.max(1, Math.round(canvas.height * scale));
    source.getContext('2d').drawImage(canvas, 0, 0, source.width, source.height);
  }
  const pngBuffer = await (await canvasToBlob(source, 'image/png')).arrayBuffer();
  const header = new ArrayBuffer(22);
  const view = new DataView(header);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  view.setUint8(6, source.width >= 256 ? 0 : source.width);
  view.setUint8(7, source.height >= 256 ? 0 : source.height);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBuffer.byteLength, true);
  view.setUint32(18, 22, true);
  return new Blob([header, pngBuffer], { type: 'image/x-icon' });
}

async function encodeImageBlob(canvas, mime, quality) {
  if (mime === 'image/bmp') return canvasToBmpBlob(canvas);
  if (mime === 'image/x-icon') return canvasToIcoBlob(canvas);
  return canvasToBlob(canvas, mime, quality);
}

function needsOpaqueBackground(mime) {
  return mime === 'image/jpeg' || mime === 'image/bmp';
}

function drawToCanvas(img, width, height, background = null) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function processConvert(item) {
  const img = await fileToImage(item.file);
  const mime = $('#outputFormat').value;
  const quality = Number($('#convertQuality').value) / 100;
  const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight, needsOpaqueBackground(mime) ? '#ffffff' : null);
  const blob = await encodeImageBlob(canvas, mime, quality);
  return resultFromBlob(blob, formatName(item.file.name, '', mimeToExt(mime)), mime);
}

async function processCompress(item) {
  const img = await fileToImage(item.file);
  const chosen = $('#compressFormat').value;
  let mime = chosen === 'same' ? item.mime : chosen;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/x-icon'].includes(mime)) mime = 'image/webp';
  const quality = Number($('#compressQuality').value) / 100;
  const canvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight, needsOpaqueBackground(mime) ? '#ffffff' : null);
  const blob = await encodeImageBlob(canvas, mime, quality);
  return resultFromBlob(blob, formatName(item.file.name, '-compressed', mimeToExt(mime)), mime, item.file.size);
}

async function processResize(item) {
  const img = await fileToImage(item.file);
  const width = Math.max(1, Number($('#resizeWidth').value) || img.naturalWidth);
  const height = Math.max(1, Number($('#resizeHeight').value) || img.naturalHeight);
  const chosen = $('#resizeFormat').value;
  const mime = chosen === 'same' ? item.mime : chosen;
  const quality = Number($('#resizeQuality').value) / 100;
  const canvas = drawToCanvas(img, width, height, needsOpaqueBackground(mime) ? '#ffffff' : null);
  const blob = await encodeImageBlob(canvas, mime, quality);
  return resultFromBlob(blob, formatName(item.file.name, `-${width}x${height}`, mimeToExt(mime)), mime);
}

async function processCrop(item) {
  const img = state.crop.image || await fileToImage(item.file);
  const x = Math.max(0, Math.min(img.naturalWidth - 1, Number($('#cropX').value) || 0));
  const y = Math.max(0, Math.min(img.naturalHeight - 1, Number($('#cropY').value) || 0));
  const width = Math.max(1, Math.min(img.naturalWidth - x, Number($('#cropWidth').value) || img.naturalWidth));
  const height = Math.max(1, Math.min(img.naturalHeight - y, Number($('#cropHeight').value) || img.naturalHeight));
  const mime = $('#cropFormat').value;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (needsOpaqueBackground(mime)) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  const blob = await encodeImageBlob(canvas, mime, .92);
  return resultFromBlob(blob, formatName(item.file.name, '-cropped', mimeToExt(mime)), mime);
}

function resultFromBlob(blob, name, mime, originalSize = null) {
  return { id: uid(), blob, name: sanitizeFilename(name), mime, url: URL.createObjectURL(blob), originalSize };
}

async function processImagePdf() {
  const pageSize = $('#pageSize').value;
  const orientation = $('#orientation').value;
  const margin = Number($('#pdfMargin').value);
  const combine = $('#pdfOneFile').checked;
  const loaded = [];
  for (let i = 0; i < state.files.length; i += 1) {
    updateProgress(i + 1, state.files.length, 'Preparing');
    const item = state.files[i];
    const img = await fileToImage(item.file);
    const jpegCanvas = drawToCanvas(img, img.naturalWidth, img.naturalHeight, '#fff');
    const jpegBlob = await canvasToBlob(jpegCanvas, 'image/jpeg', .9);
    loaded.push({ name: item.file.name, width: img.naturalWidth, height: img.naturalHeight, data: new Uint8Array(await jpegBlob.arrayBuffer()) });
  }

  if (combine) {
    const pdf = buildImagePdf(loaded, { pageSize, orientation, margin });
    return [resultFromBlob(pdf, 'images.pdf', 'application/pdf')];
  }
  return loaded.map((image) => resultFromBlob(buildImagePdf([image], { pageSize, orientation, margin }), formatName(image.name, '', 'pdf'), 'application/pdf'));
}

function buildImagePdf(images, options) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const pushText = (text) => { const bytes = encoder.encode(text); chunks.push(bytes); length += bytes.length; };
  const pushBytes = (bytes) => { chunks.push(bytes); length += bytes.length; };
  const objectCount = 2 + images.length * 3;
  const pageObjectIds = images.map((_, index) => 3 + index * 3);

  pushText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const writeObject = (id, writer) => {
    offsets[id] = length;
    pushText(`${id} 0 obj\n`);
    writer();
    pushText('\nendobj\n');
  };

  writeObject(1, () => pushText('<< /Type /Catalog /Pages 2 0 R >>'));
  writeObject(2, () => pushText(`<< /Type /Pages /Count ${images.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`));

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const dims = pdfPageDimensions(image.width, image.height, options.pageSize, options.orientation);
    const margin = Math.min(options.margin, Math.min(dims.width, dims.height) / 3);
    const scale = Math.min((dims.width - margin * 2) / image.width, (dims.height - margin * 2) / image.height);
    const drawWidth = Math.max(1, image.width * scale);
    const drawHeight = Math.max(1, image.height * scale);
    const x = (dims.width - drawWidth) / 2;
    const y = (dims.height - drawHeight) / 2;
    const stream = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im${index + 1} Do\nQ\n`;
    const streamBytes = encoder.encode(stream);

    writeObject(pageId, () => pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${dims.width.toFixed(2)} ${dims.height.toFixed(2)}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    writeObject(imageId, () => {
      pushText(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`);
      pushBytes(image.data);
      pushText('\nendstream');
    });
    writeObject(contentId, () => {
      pushText(`<< /Length ${streamBytes.length} >>\nstream\n`);
      pushBytes(streamBytes);
      pushText('endstream');
    });
  });

  const xrefOffset = length;
  pushText(`xref\n0 ${objectCount + 1}\n`);
  pushText('0000000000 65535 f \n');
  for (let i = 1; i <= objectCount; i += 1) pushText(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  pushText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

function pdfPageDimensions(imageWidth, imageHeight, pageSize, orientation) {
  let width;
  let height;
  if (pageSize === 'letter') [width, height] = [612, 792];
  else if (pageSize === 'image') [width, height] = [imageWidth * .75, imageHeight * .75];
  else [width, height] = [595.28, 841.89];

  const imageLandscape = imageWidth > imageHeight;
  const shouldLandscape = orientation === 'landscape' || (orientation === 'auto' && imageLandscape);
  if (shouldLandscape && height > width) [width, height] = [height, width];
  if (orientation === 'portrait' && width > height) [width, height] = [height, width];
  return { width, height };
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(attr.value.trim())) node.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

async function elementToPdfBlob(element, options) {
  requireLibrary('html2pdf', 'HTML-to-PDF engine');
  return window.html2pdf().set({
    margin: options.margin,
    image: { type: 'jpeg', quality: options.quality || .96 },
    html2canvas: { scale: options.scale || 2, backgroundColor: options.background || '#ffffff', useCORS: false, logging: false },
    jsPDF: { unit: options.unit || 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait', compress: true },
    pagebreak: { mode: ['css', 'legacy'] },
  }).from(element).outputPdf('blob');
}

async function processDocxPdf() {
  const mammoth = requireLibrary('mammoth', 'Mammoth DOCX engine');
  const item = state.files[0];
  const arrayBuffer = await item.file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    convertImage: mammoth.images.imgElement((image) => image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` }))),
  });
  if (result.messages?.length) console.info('DOCX conversion messages', result.messages);

  els.renderSandbox.style.width = $('#docOrientation').value === 'landscape' ? '1123px' : '794px';
  const article = document.createElement('article');
  article.className = 'render-doc';
  article.innerHTML = sanitizeHtml(result.value);
  els.renderSandbox.replaceChildren(article);
  try {
    const blob = await elementToPdfBlob(article, {
      margin: Number($('#docMargin').value), format: $('#docPageSize').value,
      orientation: $('#docOrientation').value, unit: 'mm', scale: 2,
    });
    return [resultFromBlob(blob, formatName(item.file.name, '', 'pdf'), 'application/pdf')];
  } finally {
    els.renderSandbox.replaceChildren();
  }
}

async function processXlsxPdf() {
  const XLSX = requireLibrary('XLSX', 'SheetJS spreadsheet engine');
  const item = state.files[0];
  const workbook = XLSX.read(await item.file.arrayBuffer(), { type: 'array', cellDates: true });
  const allSheets = $('#sheetAll').checked;
  const names = allSheets ? workbook.SheetNames : workbook.SheetNames.slice(0, 1);
  if (!names.length) throw new Error('The spreadsheet does not contain a readable worksheet.');

  els.renderSandbox.style.width = $('#sheetOrientation').value === 'landscape' ? '1123px' : '794px';
  const article = document.createElement('article');
  article.className = 'render-doc spreadsheet-doc';
  names.forEach((name) => {
    const section = document.createElement('section');
    section.className = `sheet-section${$('#sheetGrid').checked ? '' : ' no-grid'}`;
    const heading = document.createElement('h2');
    heading.textContent = name;
    section.appendChild(heading);
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[name], { header: '', footer: '' });
    const body = document.createElement('div');
    body.innerHTML = sanitizeHtml(html);
    section.appendChild(body);
    article.appendChild(section);
  });
  els.renderSandbox.replaceChildren(article);

  try {
    const blob = await elementToPdfBlob(article, {
      margin: 8, format: 'a4', orientation: $('#sheetOrientation').value, unit: 'mm', scale: 1.6,
    });
    return [resultFromBlob(blob, formatName(item.file.name, '', 'pdf'), 'application/pdf')];
  } finally {
    els.renderSandbox.replaceChildren();
  }
}

async function processPptxPdf() {
  const JSZip = requireLibrary('JSZip', 'PPTX archive engine');
  const item = state.files[0];
  const zip = await JSZip.loadAsync(await item.file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)[1]) - Number(b.match(/slide(\d+)/i)[1]));
  if (!slidePaths.length) throw new Error('No readable slides were found in this PPTX file.');

  const presentation = document.createElement('article');
  presentation.className = 'presentation-document';
  const dark = $('#pptTheme').value === 'dark';
  for (let i = 0; i < slidePaths.length; i += 1) {
    updateProgress(i + 1, slidePaths.length, 'Reading slide');
    const xml = await zip.file(slidePaths[i]).async('text');
    const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
    const paragraphs = [...xmlDoc.getElementsByTagNameNS('*', 'p')].map((paragraph) =>
      [...paragraph.getElementsByTagNameNS('*', 't')].map((node) => node.textContent || '').join('').trim(),
    ).filter(Boolean);
    const slide = document.createElement('section');
    slide.className = `presentation-slide${dark ? ' dark' : ''}`;
    const heading = document.createElement('h1');
    heading.textContent = paragraphs[0] || `Slide ${i + 1}`;
    slide.appendChild(heading);
    if (paragraphs.length > 1) {
      const list = document.createElement('ul');
      paragraphs.slice(1, 12).forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        list.appendChild(li);
      });
      slide.appendChild(list);
    }
    if ($('#pptSlideNumbers').checked) {
      const number = document.createElement('span');
      number.className = 'slide-number';
      number.textContent = `${i + 1} / ${slidePaths.length}`;
      slide.appendChild(number);
    }
    presentation.appendChild(slide);
  }

  els.renderSandbox.style.width = '960px';
  els.renderSandbox.replaceChildren(presentation);
  try {
    const blob = await elementToPdfBlob(presentation, {
      margin: 0, format: [13.333, 7.5], orientation: 'landscape', unit: 'in', scale: 1.5,
      background: dark ? '#0f172a' : '#ffffff', quality: .94,
    });
    return [resultFromBlob(blob, formatName(item.file.name, '-text', 'pdf'), 'application/pdf')];
  } finally {
    els.renderSandbox.replaceChildren();
  }
}

async function loadPdfWithPdfJs(file) {
  const pdfjsLib = requireLibrary('pdfjsLib', 'PDF.js rendering engine');
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjsLib.getDocument({ data }).promise;
}

function parsePageSelection(value, total, allowAll = true) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'all') {
    if (!allowAll) throw new Error('Enter at least one page number or range.');
    return Array.from({ length: total }, (_, index) => index);
  }
  const selected = [];
  const seen = new Set();
  for (const part of text.split(',')) {
    const token = part.trim();
    if (!token) continue;
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start || end > total) throw new Error(`Invalid page range: ${token}. This PDF has ${total} pages.`);
      for (let page = start; page <= end; page += 1) {
        const index = page - 1;
        if (!seen.has(index)) { seen.add(index); selected.push(index); }
      }
      continue;
    }
    if (!/^\d+$/.test(token)) throw new Error(`Invalid page selection: ${token}`);
    const page = Number(token);
    if (page < 1 || page > total) throw new Error(`Page ${page} is outside this ${total}-page PDF.`);
    const index = page - 1;
    if (!seen.has(index)) { seen.add(index); selected.push(index); }
  }
  if (!selected.length) throw new Error('No pages were selected.');
  return selected;
}

async function processPdfToJpg() {
  const item = state.files[0];
  const pdf = await loadPdfWithPdfJs(item.file);
  const pages = parsePageSelection($('#pdfJpgPages').value, pdf.numPages, true);
  const scale = Number($('#pdfJpgScale').value);
  const quality = Number($('#pdfJpgQuality').value) / 100;
  const mime = $('#pdfJpgFormat')?.value || 'image/jpeg';
  const ext = mimeToExt(mime);
  const results = [];

  for (let i = 0; i < pages.length; i += 1) {
    updateProgress(i + 1, pages.length, 'Rendering');
    const pageNumber = pages[i] + 1;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: mime !== 'image/jpeg' });
    if (mime === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await canvasToBlob(canvas, mime, quality);
    results.push(resultFromBlob(blob, `${baseName(item.file.name)}-page-${String(pageNumber).padStart(3, '0')}.${ext}`, mime));
    page.cleanup();
  }
  pdf.cleanup();
  return results;
}

async function processMergePdf() {
  const { PDFDocument } = requireLibrary('PDFLib', 'pdf-lib PDF engine');
  if (state.files.length < 2) throw new Error('Choose at least two PDF files to merge.');
  const merged = await PDFDocument.create();
  for (let i = 0; i < state.files.length; i += 1) {
    updateProgress(i + 1, state.files.length, 'Merging');
    const source = await PDFDocument.load(await state.files[i].file.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save({ useObjectStreams: true });
  const name = sanitizeFilename($('#mergedName').value || 'merged.pdf');
  return [resultFromBlob(new Blob([bytes], { type: 'application/pdf' }), name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`, 'application/pdf')];
}

async function processSplitPdf() {
  const { PDFDocument } = requireLibrary('PDFLib', 'pdf-lib PDF engine');
  const item = state.files[0];
  const source = await PDFDocument.load(await item.file.arrayBuffer());
  const total = source.getPageCount();
  const mode = $('#splitMode').value;

  if (mode === 'selected') {
    const selected = parsePageSelection($('#splitPages').value, total, false);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, selected);
    pages.forEach((page) => output.addPage(page));
    const bytes = await output.save({ useObjectStreams: true });
    return [resultFromBlob(new Blob([bytes], { type: 'application/pdf' }), formatName(item.file.name, '-extracted', 'pdf'), 'application/pdf')];
  }

  if (total > 100) throw new Error('This browser build limits one-file-per-page splitting to 100 pages. Use selected pages for larger PDFs.');
  const results = [];
  for (let index = 0; index < total; index += 1) {
    updateProgress(index + 1, total, 'Splitting');
    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    const bytes = await output.save({ useObjectStreams: true });
    results.push(resultFromBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName(item.file.name)}-page-${String(index + 1).padStart(3, '0')}.pdf`, 'application/pdf'));
  }
  return results;
}

async function processRotatePdf() {
  const { PDFDocument, degrees } = requireLibrary('PDFLib', 'pdf-lib PDF engine');
  const item = state.files[0];
  const pdf = await PDFDocument.load(await item.file.arrayBuffer());
  const selected = new Set(parsePageSelection($('#rotatePages').value, pdf.getPageCount(), true));
  const delta = Number($('#rotateDegrees').value);
  pdf.getPages().forEach((page, index) => {
    if (selected.has(index)) page.setRotation(degrees((page.getRotation().angle + delta) % 360));
  });
  const bytes = await pdf.save({ useObjectStreams: true });
  return [resultFromBlob(new Blob([bytes], { type: 'application/pdf' }), formatName(item.file.name, '-rotated', 'pdf'), 'application/pdf')];
}

async function processCompressPdf() {
  const { PDFDocument } = requireLibrary('PDFLib', 'pdf-lib PDF engine');
  const item = state.files[0];
  const source = await loadPdfWithPdfJs(item.file);
  const output = await PDFDocument.create();
  const scale = Number($('#pdfCompressScale').value);
  const quality = Number($('#pdfCompressQuality').value) / 100;

  for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
    updateProgress(pageNumber, source.numPages, 'Compressing');
    const page = await source.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const originalViewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
    const embedded = await output.embedJpg(await jpegBlob.arrayBuffer());
    const outputPage = output.addPage([originalViewport.width, originalViewport.height]);
    outputPage.drawImage(embedded, { x: 0, y: 0, width: originalViewport.width, height: originalViewport.height });
    page.cleanup();
  }
  source.cleanup();
  const bytes = await output.save({ useObjectStreams: true });
  return [resultFromBlob(new Blob([bytes], { type: 'application/pdf' }), formatName(item.file.name, '-compressed', 'pdf'), 'application/pdf', item.file.size)];
}


function uniqueArchiveName(name, usedNames) {
  const clean = sanitizeFilename(name || 'file', 'file');
  if (!usedNames.has(clean)) { usedNames.add(clean); return clean; }
  const ext = fileExtension(clean);
  const root = baseName(clean);
  let index = 2;
  let candidate = `${root}-${index}${ext ? `.${ext}` : ''}`;
  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${root}-${index}${ext ? `.${ext}` : ''}`;
  }
  usedNames.add(candidate);
  return candidate;
}

async function processCreateZip() {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const zip = new JSZip();
  const used = new Set();
  const preserve = $('#zipPreserveNames').checked;
  state.files.forEach((item, index) => {
    const name = preserve ? uniqueArchiveName(item.file.name, used) : `file-${String(index + 1).padStart(3, '0')}${item.ext ? `.${item.ext}` : ''}`;
    zip.file(name, item.file);
  });
  const level = Number($('#zipLevel').value);
  const blob = await zip.generateAsync({ type: 'blob', compression: level === 0 ? 'STORE' : 'DEFLATE', compressionOptions: { level } });
  const name = sanitizeFilename($('#zipName').value, 'archive.zip').replace(/\.zip$/i, '') + '.zip';
  return [resultFromBlob(blob, name, 'application/zip', state.files.reduce((sum, item) => sum + item.file.size, 0))];
}

function isUnsafeArchivePath(path) {
  const normalized = String(path).replace(/\\/g, '/');
  return normalized.startsWith('/') || normalized.includes('../') || /^[a-zA-Z]:\//.test(normalized);
}

async function processExtractZip() {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const source = state.files[0];
  const zip = await JSZip.loadAsync(source.file, { checkCRC32: true });
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > 200) throw new Error('This ZIP contains more than the 200-file safety limit.');
  const skipHidden = $('#zipSkipHidden').checked;
  const keepFolders = $('#zipKeepFolders').checked;
  const results = [];
  let extractedBytes = 0;
  const used = new Set();
  for (const entry of entries) {
    if (isUnsafeArchivePath(entry.name)) continue;
    const parts = entry.name.replace(/\\/g, '/').split('/').filter(Boolean);
    if (skipHidden && parts.some((part) => part.startsWith('.') || part === '__MACOSX')) continue;
    const blob = await entry.async('blob');
    extractedBytes += blob.size;
    if (extractedBytes > 100 * 1024 * 1024) throw new Error('Extracted data exceeds the 100 MB safety limit.');
    const rawName = keepFolders ? parts.join('__') : parts.at(-1);
    const outputName = uniqueArchiveName(rawName || 'file', used);
    const ext = fileExtension(outputName);
    results.push(resultFromBlob(blob, outputName, mimeFromExtension(ext)));
  }
  if (!results.length) throw new Error('No safe files were found in this ZIP archive.');
  return results;
}

function normalizeZipPath(basePath, relativePath) {
  const parts = `${basePath ? `${basePath}/` : ''}${relativePath}`.replace(/\\/g, '/').split('/');
  const output = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') output.pop(); else output.push(part);
  });
  return output.join('/');
}

function htmlToPlainText(html) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
  return (doc.body?.innerText || doc.documentElement.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function htmlToSimpleMarkdown(html) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  doc.querySelectorAll('script,style,noscript').forEach((node) => node.remove());
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const content = [...node.childNodes].map(walk).join('');
    if (/^h[1-6]$/.test(tag)) return `\n${'#'.repeat(Number(tag[1]))} ${content.trim()}\n\n`;
    if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') return `\n${content.trim()}\n\n`;
    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return `**${content}**`;
    if (tag === 'em' || tag === 'i') return `*${content}*`;
    if (tag === 'li') return `\n- ${content.trim()}`;
    if (tag === 'a') return `[${content.trim()}](${node.getAttribute('href') || ''})`;
    return content;
  };
  return walk(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

async function readEpubSpine(file) {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const zip = await JSZip.loadAsync(file);
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: META-INF/container.xml is missing.');
  const containerXml = await containerFile.async('text');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path');
  if (!opfPath || !zip.file(opfPath)) throw new Error('Invalid EPUB: package document was not found.');
  const opfText = await zip.file(opfPath).async('text');
  const opfDoc = new DOMParser().parseFromString(opfText, 'application/xml');
  if (opfDoc.querySelector('parsererror')) throw new Error('Invalid EPUB package XML.');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const manifest = new Map();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => manifest.set(item.getAttribute('id'), {
    href: item.getAttribute('href'), media: item.getAttribute('media-type') || '',
  }));
  const titleNode = [...opfDoc.getElementsByTagName('*')].find((node) => node.localName === 'title');
  const title = titleNode?.textContent?.trim() || baseName(file.name);
  const chapters = [];
  for (const itemref of opfDoc.querySelectorAll('spine > itemref')) {
    const item = manifest.get(itemref.getAttribute('idref'));
    if (!item?.href || !/(xhtml|html)/i.test(item.media || item.href)) continue;
    const path = normalizeZipPath(opfDir, decodeURIComponent(item.href.split('#')[0]));
    const chapterFile = zip.file(path);
    if (!chapterFile) continue;
    chapters.push({ path, html: await chapterFile.async('text') });
  }
  if (!chapters.length) throw new Error('No readable EPUB spine chapters were found.');
  return { title, chapters };
}

async function processEpubExtract() {
  const target = $('#ebookExtractFormat').value;
  const headings = $('#ebookChapterHeadings').checked;
  const results = [];
  for (let index = 0; index < state.files.length; index += 1) {
    updateProgress(index + 1, state.files.length, 'Reading EPUB');
    const source = state.files[index];
    const book = await readEpubSpine(source.file);
    let output;
    let mime;
    if (target === 'html') {
      const sections = book.chapters.map((chapter, i) => `<section>${headings ? `<h2>Chapter ${i + 1}</h2>` : ''}${chapter.html.replace(/^[\s\S]*?<body[^>]*>|<\/body>[\s\S]*$/gi, '')}</section>`).join('\n');
      output = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(book.title)}</title></head><body><h1>${escapeHtml(book.title)}</h1>${sections}</body></html>`;
      mime = 'text/html';
    } else if (target === 'md') {
      output = `${headings ? `# ${book.title}\n\n` : ''}${book.chapters.map((chapter, i) => `${headings ? `## Chapter ${i + 1}\n\n` : ''}${htmlToSimpleMarkdown(chapter.html)}`).join('\n\n---\n\n')}`;
      mime = 'text/markdown';
    } else {
      output = `${headings ? `${book.title}\n${'='.repeat(book.title.length)}\n\n` : ''}${book.chapters.map((chapter, i) => `${headings ? `Chapter ${i + 1}\n\n` : ''}${htmlToPlainText(chapter.html)}`).join('\n\n---\n\n')}`;
      mime = 'text/plain';
    }
    results.push(resultFromBlob(textBlob(output, mime), formatName(source.file.name, '', target), mime));
  }
  return results;
}

function markdownToHtml(markdown) {
  const escaped = escapeHtml(markdown).replace(/\r\n?/g, '\n');
  const lines = escaped.split('\n');
  const output = [];
  let inList = false;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${list[1]}</li>`);
      continue;
    }
    if (inList) { output.push('</ul>'); inList = false; }
    if (heading) output.push(`<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`);
    else if (line.trim()) output.push(`<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>`);
  }
  if (inList) output.push('</ul>');
  return output.join('\n');
}

function sourceChapterHtml(text, ext) {
  if (ext === 'html' || ext === 'htm') {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed').forEach((node) => node.remove());
    return doc.body?.innerHTML || escapeHtml(text);
  }
  if (ext === 'md') return markdownToHtml(text);
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('\n');
}

async function processEpubCreate() {
  const JSZip = requireLibrary('JSZip', 'JSZip');
  const zip = new JSZip();
  const title = $('#ebookTitle').value.trim() || 'My Book';
  const author = $('#ebookAuthor').value.trim() || 'Unknown Author';
  const language = $('#ebookLanguage').value.trim() || 'en';
  const identifier = `urn:uuid:${uid()}-${uid()}`;
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const manifest = [];
  const spine = [];
  const navItems = [];
  for (let i = 0; i < state.files.length; i += 1) {
    const item = state.files[i];
    updateProgress(i + 1, state.files.length, 'Building chapter');
    const text = await readText(item.file);
    const chapterTitle = baseName(item.file.name) || `Chapter ${i + 1}`;
    const href = `chapters/chapter-${i + 1}.xhtml`;
    const body = sourceChapterHtml(text, item.ext);
    const xhtml = `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeHtml(language)}"><head><title>${escapeHtml(chapterTitle)}</title><meta charset="utf-8"/></head><body><h1>${escapeHtml(chapterTitle)}</h1>${body}</body></html>`;
    zip.file(`OEBPS/${href}`, xhtml);
    manifest.push(`<item id="chapter-${i + 1}" href="${href}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="chapter-${i + 1}"/>`);
    navItems.push(`<li><a href="${href}">${escapeHtml(chapterTitle)}</a></li>`);
  }
  const nav = `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${navItems.join('')}</ol></nav></body></html>`;
  zip.file('OEBPS/nav.xhtml', nav);
  const opf = `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${escapeHtml(identifier)}</dc:identifier><dc:title>${escapeHtml(title)}</dc:title><dc:creator>${escapeHtml(author)}</dc:creator><dc:language>${escapeHtml(language)}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`;
  zip.file('OEBPS/content.opf', opf);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return [resultFromBlob(blob, `${sanitizeFilename(title, 'book').replace(/\.epub$/i, '')}.epub`, 'application/epub+zip')];
}

function detectDelimiter(text) {
  const sample = String(text).split(/\r?\n/).slice(0, 8).join('\n');
  const candidates = [',', '\t', ';', '|'];
  return candidates.map((delimiter) => ({ delimiter, count: sample.split(delimiter).length - 1 })).sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((current) => current.some((cell) => cell !== ''));
}

function rowsToObjects(rows, hasHeaders) {
  if (!rows.length) return [];
  const width = Math.max(...rows.map((row) => row.length));
  const rawHeaders = hasHeaders ? rows[0] : Array.from({ length: width }, (_, index) => `column_${index + 1}`);
  const seen = new Map();
  const headers = rawHeaders.map((header, index) => {
    const root = String(header || `column_${index + 1}`).trim() || `column_${index + 1}`;
    const count = (seen.get(root) || 0) + 1;
    seen.set(root, count);
    return count === 1 ? root : `${root}_${count}`;
  });
  return rows.slice(hasHeaders ? 1 : 0).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

async function processCsvJson() {
  const results = [];
  for (let i = 0; i < state.files.length; i += 1) {
    const item = state.files[i];
    updateProgress(i + 1, state.files.length);
    const text = await readText(item.file);
    const configured = $('#csvDelimiter').value;
    const delimiter = configured === 'auto' ? detectDelimiter(text) : configured === 'tab' ? '\t' : configured;
    const rows = parseDelimited(text, delimiter);
    const data = rowsToObjects(rows, $('#csvHeaders').checked);
    const json = JSON.stringify(data, null, $('#jsonPretty').checked ? 2 : 0);
    results.push(resultFromBlob(textBlob(json, 'application/json'), formatName(item.file.name, '', 'json'), 'application/json'));
  }
  return results;
}

function flattenObject(value, prefix = '', output = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    Object.entries(value).forEach(([key, child]) => flattenObject(child, prefix ? `${prefix}.${key}` : key, output));
  } else output[prefix || 'value'] = Array.isArray(value) ? JSON.stringify(value) : value ?? '';
  return output;
}

function csvCell(value, delimiter) {
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return /["\r\n]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
}

function objectsToDelimited(data, delimiter, flatten) {
  const rows = Array.isArray(data) ? data : [data];
  const normalized = rows.map((row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) return flatten ? flattenObject(row) : row;
    return { value: row };
  });
  const headers = [...new Set(normalized.flatMap((row) => Object.keys(row)))];
  return [headers.map((header) => csvCell(header, delimiter)).join(delimiter), ...normalized.map((row) => headers.map((header) => csvCell(row[header], delimiter)).join(delimiter))].join('\r\n');
}

async function processJsonCsv() {
  const results = [];
  const rawDelimiter = $('#jsonDelimiter').value;
  const delimiter = rawDelimiter === 'tab' ? '\t' : rawDelimiter;
  const ext = rawDelimiter === 'tab' ? 'tsv' : 'csv';
  const mime = rawDelimiter === 'tab' ? 'text/tab-separated-values' : 'text/csv';
  for (let i = 0; i < state.files.length; i += 1) {
    const item = state.files[i];
    updateProgress(i + 1, state.files.length);
    const data = JSON.parse(await readText(item.file));
    const output = objectsToDelimited(data, delimiter, $('#jsonFlatten').checked);
    results.push(resultFromBlob(textBlob(output, mime), formatName(item.file.name, '', ext), mime));
  }
  return results;
}

function xmlElementToValue(element) {
  const attributes = {};
  [...element.attributes].forEach((attribute) => { attributes[`@${attribute.name}`] = attribute.value; });
  const childElements = [...element.children];
  const text = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.nodeValue).join('').trim();
  if (!childElements.length) {
    if (!Object.keys(attributes).length) return text;
    return { ...attributes, ...(text ? { '#text': text } : {}) };
  }
  const output = { ...attributes };
  childElements.forEach((child) => {
    const value = xmlElementToValue(child);
    if (Object.prototype.hasOwnProperty.call(output, child.tagName)) {
      output[child.tagName] = Array.isArray(output[child.tagName]) ? [...output[child.tagName], value] : [output[child.tagName], value];
    } else output[child.tagName] = value;
  });
  if (text) output['#text'] = text;
  return output;
}

function parseYamlScalar(value) {
  const text = String(value).trim();
  if (!text || text === '~' || text === 'null' || text === 'Null' || text === 'NULL') return null;
  if (/^(true|false)$/i.test(text)) return text.toLowerCase() === 'true';
  if (/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(text)) return Number(text);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    if (text.startsWith('"')) {
      try { return JSON.parse(text); } catch {}
    }
    return text.slice(1, -1).replace(/''/g, "'");
  }
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text.replace(/'/g, '"')); } catch {}
  }
  return text.replace(/\s+#.*$/, '').trim();
}

function splitYamlKeyValue(content) {
  let quote = null;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if ((char === '"' || char === "'") && content[i - 1] !== '\\') quote = quote === char ? null : (quote || char);
    if (char === ':' && !quote && (i === content.length - 1 || /\s/.test(content[i + 1]))) {
      return [content.slice(0, i).trim(), content.slice(i + 1).trim()];
    }
  }
  return [content.trim(), null];
}

function parseYamlLite(text) {
  const tokens = String(text).replace(/^\uFEFF/, '').replace(/\t/g, '  ').split(/\r?\n/)
    .map((raw) => ({ indent: raw.match(/^ */)[0].length, content: raw.trim() }))
    .filter((line) => line.content && !line.content.startsWith('#') && line.content !== '---' && line.content !== '...');
  let index = 0;

  function parseBlock(indent) {
    if (index >= tokens.length) return null;
    const isList = tokens[index].indent === indent && tokens[index].content.startsWith('-');
    const container = isList ? [] : {};

    while (index < tokens.length) {
      const token = tokens[index];
      if (token.indent < indent) break;
      if (token.indent > indent) throw new Error(`Invalid YAML indentation near: ${token.content}`);

      if (isList) {
        if (!token.content.startsWith('-')) break;
        const rest = token.content.slice(1).trim();
        index += 1;
        if (!rest) {
          container.push(index < tokens.length && tokens[index].indent > indent ? parseBlock(tokens[index].indent) : null);
          continue;
        }
        const [key, value] = splitYamlKeyValue(rest);
        if (value !== null) {
          const item = {};
          if (!key) throw new Error('Invalid YAML list mapping.');
          if (value === '') item[key] = index < tokens.length && tokens[index].indent > indent ? parseBlock(tokens[index].indent) : null;
          else item[key] = parseYamlScalar(value);
          if (index < tokens.length && tokens[index].indent > indent) {
            const extra = parseBlock(tokens[index].indent);
            if (extra && typeof extra === 'object' && !Array.isArray(extra)) Object.assign(item, extra);
            else if (extra !== null) item.value = extra;
          }
          container.push(item);
        } else container.push(parseYamlScalar(rest));
      } else {
        if (token.content.startsWith('-')) break;
        const [rawKey, value] = splitYamlKeyValue(token.content);
        if (value === null || !rawKey) throw new Error(`Invalid YAML mapping near: ${token.content}`);
        const key = parseYamlScalar(rawKey);
        index += 1;
        if (value === '') container[String(key)] = index < tokens.length && tokens[index].indent > indent ? parseBlock(tokens[index].indent) : null;
        else container[String(key)] = parseYamlScalar(value);
      }
    }
    return container;
  }

  if (!tokens.length) return null;
  return parseBlock(tokens[0].indent);
}

function yamlScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (!text || /[:#\n\r\t]|^[-?]|^(true|false|null|~|[-+]?\d)/i.test(text)) return JSON.stringify(text);
  return text;
}

function dumpYamlLite(value, indent = 0) {
  const space = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const nested = dumpYamlLite(item, indent + 2);
        const lines = nested.split('\n');
        return `${space}- ${lines[0].trimStart()}${lines.length > 1 ? `\n${lines.slice(1).join('\n')}` : ''}`;
      }
      return `${space}- ${yamlScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, child]) => {
      const safeKey = /^[A-Za-z_][\w.-]*$/.test(key) ? key : JSON.stringify(key);
      if (child && typeof child === 'object') return `${space}${safeKey}:\n${dumpYamlLite(child, indent + 2)}`;
      return `${space}${safeKey}: ${yamlScalar(child)}`;
    }).join('\n');
  }
  return `${space}${yamlScalar(value)}`;
}

function parseStructured(text, ext) {
  if (ext === 'json') return JSON.parse(text);
  if (ext === 'yaml' || ext === 'yml') return parseYamlLite(text);
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML file.');
  return { [doc.documentElement.tagName]: xmlElementToValue(doc.documentElement) };
}

function validXmlName(name, fallback = 'item') {
  const cleaned = String(name || '').replace(/[^A-Za-z0-9_.-]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `${fallback}_${cleaned || 'value'}`;
}

function objectToXml(value, name = 'item') {
  const tag = validXmlName(name);
  if (Array.isArray(value)) return value.map((child) => objectToXml(child, tag)).join('');
  if (value && typeof value === 'object') {
    const attrs = Object.entries(value).filter(([key]) => key.startsWith('@')).map(([key, val]) => ` ${validXmlName(key.slice(1), 'attr')}="${escapeHtml(val)}"`).join('');
    const text = Object.prototype.hasOwnProperty.call(value, '#text') ? escapeHtml(value['#text']) : '';
    const children = Object.entries(value).filter(([key]) => !key.startsWith('@') && key !== '#text').map(([key, child]) => objectToXml(child, key)).join('');
    return `<${tag}${attrs}>${text}${children}</${tag}>`;
  }
  return `<${tag}>${escapeHtml(value ?? '')}</${tag}>`;
}

function formatXml(xml) {
  const compact = String(xml).replace(/>\s+</g, '><').trim();
  const tokens = compact.replace(/</g, '\n<').trim().split('\n');
  let depth = 0;
  return tokens.map((token) => {
    if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
    const line = `${'  '.repeat(depth)}${token}`;
    if (/^<[^!?/][^>]*[^/]?>$/.test(token) && !/<\/[^>]+>$/.test(token)) depth += 1;
    return line;
  }).join('\n');
}

async function processStructured() {
  const target = $('#structuredTarget').value;
  const pretty = $('#structuredPretty').checked;
  const results = [];
  for (let i = 0; i < state.files.length; i += 1) {
    const item = state.files[i];
    updateProgress(i + 1, state.files.length);
    const data = parseStructured(await readText(item.file), item.ext);
    let output; let mime; let ext;
    if (target === 'yaml') {
      output = `${dumpYamlLite(data)}\n`;
      mime = 'application/yaml'; ext = 'yaml';
    } else if (target === 'xml') {
      const requestedRoot = validXmlName($('#xmlRootName').value, 'root');
      const keys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];
      let body;
      if (Array.isArray(data)) body = `<${requestedRoot}>${data.map((item) => objectToXml(item, 'item')).join('')}</${requestedRoot}>`;
      else body = keys.length === 1 && keys[0] === requestedRoot ? objectToXml(data[requestedRoot], requestedRoot) : objectToXml(data, requestedRoot);
      const rawXml = `<?xml version="1.0" encoding="UTF-8"?>${body}`;
      output = pretty ? formatXml(rawXml) : rawXml;
      mime = 'application/xml'; ext = 'xml';
    } else {
      output = JSON.stringify(data, null, pretty ? 2 : 0);
      mime = 'application/json'; ext = 'json';
    }
    results.push(resultFromBlob(textBlob(output, mime), formatName(item.file.name, '', ext), mime));
  }
  return results;
}

function parseTimestamp(value) {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':').map(Number);
  if (parts.length === 3) return Math.round(((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000);
  if (parts.length === 2) return Math.round(((parts[0] * 60) + parts[1]) * 1000);
  throw new Error(`Invalid subtitle timestamp: ${value}`);
}

function formatTimestamp(milliseconds, target) {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const ms = safe % 1000;
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${target === 'srt' ? ',' : '.'}${pad(ms, 3)}`;
}

function parseSubtitles(text) {
  const cleaned = String(text).replace(/^\uFEFF/, '').replace(/^WEBVTT[^\n]*\n+/, '').replace(/\r\n?/g, '\n');
  const blocks = cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const cues = [];
  blocks.forEach((block) => {
    const lines = block.split('\n');
    let timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return;
    const timing = lines[timingIndex].match(/([^\s]+)\s*-->\s*([^\s]+)(?:\s+.*)?$/);
    if (!timing) return;
    cues.push({ start: parseTimestamp(timing[1]), end: parseTimestamp(timing[2]), text: lines.slice(timingIndex + 1).join('\n').trim() });
  });
  if (!cues.length) throw new Error('No valid subtitle cues were found.');
  return cues;
}

async function processSubtitles() {
  const target = $('#subtitleTarget').value;
  const offset = Number($('#subtitleOffset').value || 0);
  const results = [];
  for (let i = 0; i < state.files.length; i += 1) {
    const item = state.files[i];
    updateProgress(i + 1, state.files.length);
    const cues = parseSubtitles(await readText(item.file)).map((cue) => ({ ...cue, start: cue.start + offset, end: cue.end + offset }));
    let output; let mime;
    if (target === 'txt') {
      output = cues.map((cue, index) => `${$('#subtitleKeepNumbers').checked ? `${index + 1}. ` : ''}${cue.text}`).join('\n\n');
      mime = 'text/plain';
    } else {
      const blocks = cues.map((cue, index) => `${target === 'srt' ? `${index + 1}\n` : ''}${formatTimestamp(cue.start, target)} --> ${formatTimestamp(cue.end, target)}\n${cue.text}`).join('\n\n');
      output = target === 'vtt' ? `WEBVTT\n\n${blocks}\n` : `${blocks}\n`;
      mime = target === 'vtt' ? 'text/vtt' : 'application/x-subrip';
    }
    results.push(resultFromBlob(textBlob(output, mime), formatName(item.file.name, '', target), mime));
  }
  return results;
}

function updateProgress(current, total, verb = 'Processing') {
  els.processLabel.textContent = `${verb} ${current}/${total}`;
}

async function runProcessing() {
  if ((((toolConfig[state.tool].min ?? 1) > 0) && !state.files.length) || els.processButton.disabled) return;
  clearResults();
  els.processButton.disabled = true;
  const originalLabel = toolConfig[state.tool].action;
  els.processLabel.textContent = 'Processing…';

  try {
    if (['convert', 'compress', 'resize', 'crop'].includes(state.tool)) {
      const handler = { convert: processConvert, compress: processCompress, resize: processResize, crop: processCrop }[state.tool];
      state.results = [];
      for (let i = 0; i < state.files.length; i += 1) {
        updateProgress(i + 1, state.files.length);
        state.results.push(await handler(state.files[i]));
      }
    } else {
      const batchHandler = {
        imagepdf: processImagePdf,
        docxpdf: processDocxPdf,
        xlsxpdf: processXlsxPdf,
        pptxpdf: processPptxPdf,
        pdfjpg: processPdfToJpg,
        mergepdf: processMergePdf,
        splitpdf: processSplitPdf,
        compresspdf: processCompressPdf,
        rotatepdf: processRotatePdf,
        createzip: processCreateZip,
        extractzip: processExtractZip,
        epubextract: processEpubExtract,
        epubcreate: processEpubCreate,
        csvjson: processCsvJson,
        jsoncsv: processJsonCsv,
        structured: processStructured,
        subtitles: processSubtitles,
      }[state.tool] || window.Phase5Handlers?.[state.tool];
      if (!batchHandler) throw new Error(`No processor is registered for ${state.tool}.`);
      state.results = await batchHandler();
    }
    renderResults();
    if (state.results.length) window.PixelSwitchActivity?.recordConversion({
      toolId: state.tool,
      inputCount: state.files.length,
      outputCount: state.results.length,
      inputBytes: state.files.reduce((sum, item) => sum + (item.file?.size || 0), 0),
      outputBytes: state.results.reduce((sum, item) => sum + (item.blob?.size || 0), 0),
    });
    toast(`${state.results.length} file${state.results.length === 1 ? '' : 's'} ready.`);
  } catch (error) {
    console.error(error);
    const message = /password|encrypted/i.test(error.message || '')
      ? 'This PDF appears to be encrypted or password-protected.'
      : (error.message || 'Conversion failed. Try a smaller or simpler file.');
    toast(message, 'error');
  } finally {
    els.processLabel.textContent = originalLabel;
    els.processButton.disabled = toolConfig[state.tool].noInput ? false : state.files.length < (toolConfig[state.tool].min ?? 1);
  }
}

function renderResults() {
  els.resultsPanel.classList.remove('hidden');
  els.downloadAll.textContent = state.results.length > 1 ? 'Download all as ZIP' : 'Download file';
  els.resultsList.innerHTML = state.results.map((result, index) => {
    const savings = result.originalSize ? Math.round((1 - result.blob.size / result.originalSize) * 100) : null;
    const meta = savings !== null ? `${formatBytes(result.blob.size)} · ${savings >= 0 ? `${savings}% smaller` : 'larger result'}` : formatBytes(result.blob.size);
    const ext = fileExtension(result.name).toUpperCase() || 'FILE';
    const preview = result.mime.startsWith('image/')
      ? `<img class="result-preview" src="${result.url}" alt="" />`
      : `<span class="result-icon${result.mime === 'application/pdf' ? '' : ' doc'}">${escapeHtml(ext)}</span>`;
    return `<div class="result-card">${preview}<div class="result-info"><strong title="${escapeHtml(result.name)}">${escapeHtml(result.name)}</strong><span>${meta}</span><br><a href="${result.url}" download="${escapeHtml(result.name)}" data-download-result="${index}">Download</a></div></div>`;
  }).join('');
  els.resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function recordDownloads(results) {
  const files = results || [];
  window.PixelSwitchActivity?.recordDownload({
    toolId: state.tool,
    fileCount: files.length || 1,
    outputBytes: files.reduce((sum, item) => sum + (item.blob?.size || 0), 0),
  });
}

async function downloadAll() {
  if (!state.results.length) return;
  if (state.results.length === 1) {
    const result = state.results[0];
    const anchor = document.createElement('a');
    anchor.href = result.url;
    anchor.download = result.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    recordDownloads([result]);
    return;
  }
  try {
    const JSZip = requireLibrary('JSZip', 'JSZip');
    const zip = new JSZip();
    const used = new Set();
    for (const result of state.results) zip.file(uniqueArchiveName(result.name, used), result.blob);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pixelswitch-results.zip';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    recordDownloads(state.results);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast(error.message || 'Could not prepare the ZIP download.', 'error');
  }
}

async function autoFillResizeDimensions() {
  if (!state.files.length || !imageMimeFromExtension(state.files[0].ext)) return;
  try {
    const img = await fileToImage(state.files[0].file);
    if (!$('#resizeWidth').value) $('#resizeWidth').value = img.naturalWidth;
    if (!$('#resizeHeight').value) $('#resizeHeight').value = img.naturalHeight;
    $('#resizeWidth').dataset.ratio = img.naturalWidth / img.naturalHeight;
  } catch {}
}

async function loadCropImage(item) {
  if (!item) return;
  const img = await fileToImage(item.file);
  state.crop.image = img;
  state.crop.fileId = item.id;
  const maxWidth = Math.max(240, els.cropCanvasWrap.clientWidth || 700);
  const maxHeight = 500;
  const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
  els.cropCanvas.width = Math.round(img.naturalWidth * scale);
  els.cropCanvas.height = Math.round(img.naturalHeight * scale);
  const ctx = els.cropCanvas.getContext('2d');
  ctx.drawImage(img, 0, 0, els.cropCanvas.width, els.cropCanvas.height);
  state.crop.scaleX = img.naturalWidth / els.cropCanvas.width;
  state.crop.scaleY = img.naturalHeight / els.cropCanvas.height;
  setCropValues(0, 0, img.naturalWidth, img.naturalHeight);
}

function setCropValues(x, y, width, height) {
  const img = state.crop.image;
  if (!img) return;
  const safeX = Math.max(0, Math.min(Math.round(x), img.naturalWidth - 1));
  const safeY = Math.max(0, Math.min(Math.round(y), img.naturalHeight - 1));
  const safeW = Math.max(1, Math.min(Math.round(width), img.naturalWidth - safeX));
  const safeH = Math.max(1, Math.min(Math.round(height), img.naturalHeight - safeY));
  $('#cropX').value = safeX;
  $('#cropY').value = safeY;
  $('#cropWidth').value = safeW;
  $('#cropHeight').value = safeH;
  renderCropSelection();
}

function renderCropSelection() {
  if (!state.crop.image) return;
  const rect = els.cropCanvas.getBoundingClientRect();
  const wrapRect = els.cropCanvasWrap.getBoundingClientRect();
  const x = Number($('#cropX').value) / state.crop.scaleX;
  const y = Number($('#cropY').value) / state.crop.scaleY;
  const width = Number($('#cropWidth').value) / state.crop.scaleX;
  const height = Number($('#cropHeight').value) / state.crop.scaleY;
  els.cropSelection.style.left = `${rect.left - wrapRect.left + x}px`;
  els.cropSelection.style.top = `${rect.top - wrapRect.top + y}px`;
  els.cropSelection.style.width = `${width}px`;
  els.cropSelection.style.height = `${height}px`;
}

function setupCropPointer() {
  let start = null;
  els.cropCanvasWrap.addEventListener('pointerdown', (event) => {
    if (!state.crop.image || state.tool !== 'crop') return;
    const rect = els.cropCanvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    els.cropCanvasWrap.setPointerCapture(event.pointerId);
  });
  els.cropCanvasWrap.addEventListener('pointermove', (event) => {
    if (!start) return;
    const rect = els.cropCanvas.getBoundingClientRect();
    const endX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const endY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const x = Math.min(start.x, endX) * state.crop.scaleX;
    const y = Math.min(start.y, endY) * state.crop.scaleY;
    const width = Math.abs(endX - start.x) * state.crop.scaleX;
    const height = Math.abs(endY - start.y) * state.crop.scaleY;
    if (width >= 1 && height >= 1) setCropValues(x, y, width, height);
  });
  const stop = () => { start = null; };
  els.cropCanvasWrap.addEventListener('pointerup', stop);
  els.cropCanvasWrap.addEventListener('pointercancel', stop);
}

function setupEvents() {
  els.phaseButtons.forEach((button) => button.addEventListener('click', () => setPhase(button.dataset.phase)));
  els.tabs.forEach((tab) => tab.addEventListener('click', () => setTool(tab.dataset.tool)));
  els.browseButton.addEventListener('click', (event) => { event.stopPropagation(); els.fileInput.click(); });
  els.addMoreFiles.addEventListener('click', () => els.fileInput.click());
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.fileInput.click(); }
  });
  els.fileInput.addEventListener('change', () => addFiles(els.fileInput.files));
  ['dragenter', 'dragover'].forEach((name) => els.dropZone.addEventListener(name, (event) => {
    event.preventDefault(); els.dropZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach((name) => els.dropZone.addEventListener(name, (event) => {
    event.preventDefault(); els.dropZone.classList.remove('dragover');
  }));
  els.dropZone.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
  els.clearFiles.addEventListener('click', clearFiles);
  els.processButton.addEventListener('click', runProcessing);
  els.downloadAll.addEventListener('click', downloadAll);
  els.resultsList.addEventListener('click', (event) => {
    const link = event.target.closest('[data-download-result]');
    if (!link) return;
    const result = state.results[Number(link.dataset.downloadResult)];
    if (result) recordDownloads([result]);
  });

  $$('.tool-card').forEach((card) => card.addEventListener('click', () => {
    setTool(card.dataset.openTool);
    if (card.dataset.format) $('#outputFormat').value = card.dataset.format;
    $('#workspace').scrollIntoView({ behavior: 'smooth' });
  }));

  [
    ['convertQuality', 'convertQualityValue', '%'], ['compressQuality', 'compressQualityValue', '%'],
    ['resizeQuality', 'resizeQualityValue', '%'], ['pdfMargin', 'pdfMarginValue', ' px'],
    ['docMargin', 'docMarginValue', ' mm'], ['pdfJpgQuality', 'pdfJpgQualityValue', '%'],
    ['pdfCompressQuality', 'pdfCompressQualityValue', '%'], ['zipLevel', 'zipLevelValue', ''],
  ].forEach(([inputId, outputId, suffix]) => {
    const input = $(`#${inputId}`);
    input.addEventListener('input', () => { $(`#${outputId}`).textContent = `${input.value}${suffix}`; });
  });

  $('#resizeWidth').addEventListener('input', () => {
    if (!$('#lockRatio').checked || state.resizingHeight) return;
    const ratio = Number($('#resizeWidth').dataset.ratio || 1);
    state.resizingWidth = true;
    $('#resizeHeight').value = Math.max(1, Math.round(Number($('#resizeWidth').value) / ratio));
    state.resizingWidth = false;
  });
  $('#resizeHeight').addEventListener('input', () => {
    if (!$('#lockRatio').checked || state.resizingWidth) return;
    const ratio = Number($('#resizeWidth').dataset.ratio || 1);
    state.resizingHeight = true;
    $('#resizeWidth').value = Math.max(1, Math.round(Number($('#resizeHeight').value) * ratio));
    state.resizingHeight = false;
  });

  ['cropX', 'cropY', 'cropWidth', 'cropHeight'].forEach((id) => $(`#${id}`).addEventListener('input', renderCropSelection));
  $('#resetCrop').addEventListener('click', () => {
    if (state.crop.image) setCropValues(0, 0, state.crop.image.naturalWidth, state.crop.image.naturalHeight);
  });
  $('#splitMode').addEventListener('change', () => $('#splitRangeGroup').classList.toggle('hidden', $('#splitMode').value !== 'selected'));
  window.addEventListener('resize', () => { if (state.tool === 'crop' && state.files[0]) loadCropImage(state.files[0]); });
  window.addEventListener('beforeunload', () => { revokeObjectUrls(state.files); revokeObjectUrls(state.results); });
  setupCropPointer();
}

setupEvents();
const requestedTool = new URLSearchParams(window.location.search).get('tool');
setTool(toolConfig[requestedTool] ? requestedTool : 'convert');
renderFiles();
