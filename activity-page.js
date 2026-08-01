(() => {
  'use strict';

  const data = window.PIXELSWITCH_TOOLS || { categories: {}, tools: [] };
  const number = new Intl.NumberFormat();
  const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function toolName(id) {
    return data.tools.find((tool) => tool.id === id)?.name || id;
  }

  function renderCategoryTables(stats) {
    const host = document.getElementById('activityCategoryList');
    if (!host) return;
    const fragments = Object.entries(data.categories).map(([categoryId, category], categoryIndex) => {
      const rows = category.tools.map((tool) => {
        const item = stats.byTool?.[tool.id] || {};
        const inputs = Array.isArray(tool.inputs) ? tool.inputs.join(', ') : 'See tool page';
        const outputs = Array.isArray(tool.outputs) ? tool.outputs.join(', ') : 'See tool page';
        return `<tr>
          <th scope="row"><a href="converter.html?tool=${encodeURIComponent(tool.id)}">${tool.name}</a><small>${tool.desc}</small></th>
          <td>${inputs}</td><td>${outputs}</td>
          <td class="number-cell">${number.format(item.conversions || 0)}</td>
          <td class="number-cell">${number.format(item.downloads || 0)}</td>
        </tr>`;
      }).join('');
      const categoryConversions = category.tools.reduce((sum, tool) => sum + (stats.byTool?.[tool.id]?.conversions || 0), 0);
      const categoryDownloads = category.tools.reduce((sum, tool) => sum + (stats.byTool?.[tool.id]?.downloads || 0), 0);
      return `<details class="activity-category" ${categoryIndex === 0 ? 'open' : ''}>
        <summary><span class="category-icon">${category.icon}</span><span><strong>${category.name}</strong><small>${category.tools.length} tools · ${number.format(categoryConversions)} conversions · ${number.format(categoryDownloads)} downloads</small></span><span aria-hidden="true" class="detail-plus">+</span></summary>
        <div class="activity-table-wrap"><table class="activity-table"><thead><tr><th>Tool</th><th>Input types</th><th>Output types</th><th>Converted</th><th>Downloaded</th></tr></thead><tbody>${rows}</tbody></table></div>
      </details>`;
    });
    host.innerHTML = fragments.join('');
  }

  function renderRecent(stats) {
    const host = document.getElementById('recentActivityList');
    if (!host) return;
    const recent = Array.isArray(stats.recent) ? stats.recent.slice(0, 12) : [];
    if (!recent.length) {
      host.innerHTML = '<p class="empty-activity">No activity has been recorded in this browser yet. Complete a conversion to see it here.</p>';
      return;
    }
    host.innerHTML = recent.map((event) => `<article class="recent-activity-item"><span class="activity-event-icon">${event.type === 'conversion' ? '⇄' : '↓'}</span><div><strong>${event.type === 'conversion' ? 'Converted' : 'Downloaded'} ${number.format(event.count)} file${event.count === 1 ? '' : 's'}</strong><p>${toolName(event.tool)} · ${dateTime.format(new Date(event.timestamp))}</p></div></article>`).join('');
  }

  function renderTotals(stats) {
    document.querySelectorAll('[data-activity-conversions]').forEach((el) => { el.textContent = number.format(stats.conversions || 0); });
    document.querySelectorAll('[data-activity-downloads]').forEach((el) => { el.textContent = number.format(stats.downloads || 0); });
    document.querySelectorAll('[data-activity-bytes-input]').forEach((el) => { el.textContent = formatBytes(stats.bytesInput || 0); });
    document.querySelectorAll('[data-activity-bytes-output]').forEach((el) => { el.textContent = formatBytes(stats.bytesOutput || 0); });
    document.querySelectorAll('[data-activity-source]').forEach((el) => { el.textContent = stats.source === 'site' ? 'Site-wide live totals' : 'Live totals in this browser'; });
    document.querySelectorAll('[data-activity-updated]').forEach((el) => { el.textContent = stats.updatedAt ? dateTime.format(new Date(stats.updatedAt)) : 'No activity yet'; });
  }

  async function refresh() {
    const stats = await window.PixelSwitchActivity.getStats();
    renderTotals(stats);
    renderCategoryTables(stats);
    renderRecent(stats);
  }

  document.getElementById('clearActivityButton')?.addEventListener('click', () => {
    window.PixelSwitchActivity.clearLocal();
    refresh();
  });
  document.addEventListener('pixelswitch:activity', refresh);
  document.addEventListener('pixelswitch:activity-sync', refresh);
  refresh();
  if (window.PixelSwitchActivity.hasSharedApi) setInterval(refresh, 30000);
})();
