(() => {
  const data = window.PIXELSWITCH_TOOLS || { tools: [], categories: {}, popular: [] };
  const navButton = document.getElementById('mobileNavButton');
  const nav = document.getElementById('mainNav');
  if (navButton && nav) {
    navButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navButton.setAttribute('aria-expanded', String(open));
    });
  }
  document.querySelectorAll('[data-current-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const shareUrl = encodeURIComponent(location.href);
  const shareTitle = encodeURIComponent(document.title);
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    x: `https://x.com/intent/post?url=${shareUrl}&text=${shareTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
  };
  document.querySelectorAll('[data-social-share]').forEach((link) => {
    const target = shareLinks[link.dataset.socialShare];
    if (target) link.href = target;
  });

  const numberFormat = new Intl.NumberFormat();
  const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const formatBytes = (bytes) => {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };
  async function renderActivitySummary() {
    if (!window.PixelSwitchActivity) return;
    const stats = await window.PixelSwitchActivity.getStats();
    document.querySelectorAll('[data-activity-conversions]').forEach((el) => { el.textContent = numberFormat.format(stats.conversions || 0); });
    document.querySelectorAll('[data-activity-downloads]').forEach((el) => { el.textContent = numberFormat.format(stats.downloads || 0); });
    document.querySelectorAll('[data-activity-bytes-input]').forEach((el) => { el.textContent = formatBytes(stats.bytesInput || 0); });
    document.querySelectorAll('[data-activity-bytes-output]').forEach((el) => { el.textContent = formatBytes(stats.bytesOutput || 0); });
    document.querySelectorAll('[data-activity-source]').forEach((el) => { el.textContent = stats.source === 'site' ? 'Site-wide live totals' : 'Live totals in this browser'; });
    document.querySelectorAll('[data-activity-updated]').forEach((el) => { el.textContent = stats.updatedAt ? dateFormat.format(new Date(stats.updatedAt)) : 'No activity yet'; });
  }
  document.addEventListener('pixelswitch:activity', renderActivitySummary);
  document.addEventListener('pixelswitch:activity-sync', renderActivitySummary);
  renderActivitySummary();
  if (window.PixelSwitchActivity?.hasSharedApi) setInterval(renderActivitySummary, 30000);
  const categoryDropdowns = [...document.querySelectorAll('.nav-category-dropdown')];
  const closeCategoryMenus = (except = null) => {
    categoryDropdowns.forEach((dropdown) => {
      if (dropdown === except) return;
      dropdown.classList.remove('menu-open');
      dropdown.querySelector('[data-category-toggle]')?.setAttribute('aria-expanded', 'false');
    });
  };
  categoryDropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector('[data-category-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains('menu-open');
      closeCategoryMenus(dropdown);
      dropdown.classList.toggle('menu-open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });
    dropdown.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      dropdown.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-category-dropdown')) closeCategoryMenus();
  });
  const params = new URLSearchParams(location.search);
  const toolId = params.get('tool');
  if (toolId && data.tools.length) renderRelated(toolId);
  document.addEventListener('pixelswitch:toolchange', (event) => renderRelated(event.detail.tool));

  function card(tool) {
    const link = document.createElement('a');
    link.className = 'tool-card link-card';
    link.href = `converter.html?tool=${encodeURIComponent(tool.id)}`;
    link.dataset.openTool = tool.id;
    const icon = document.createElement('span');
    icon.className = `card-icon ${tool.color}`;
    icon.textContent = tool.icon;
    const h3 = document.createElement('h3'); h3.textContent = tool.name;
    const p = document.createElement('p'); p.textContent = tool.desc;
    const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.textContent = '→'; arrow.setAttribute('aria-hidden','true');
    link.append(icon,h3,p,arrow);
    return link;
  }
  function renderRelated(id) {
    const grid = document.getElementById('relatedToolsGrid');
    if (!grid) return;
    const current = data.tools.find((tool) => tool.id === id) || data.tools[0];
    if (!current) return;
    const same = data.tools.filter((tool) => tool.cat === current.cat && tool.id !== current.id).slice(0,3);
    const other = data.popular.map((pid) => data.tools.find((tool) => tool.id === pid)).filter(Boolean).filter((tool) => tool.cat !== current.cat).slice(0,3);
    const selected = [...same, ...other].slice(0,6);
    grid.replaceChildren(...selected.map(card));
  }
})();
