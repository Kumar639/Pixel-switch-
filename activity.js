(() => {
  'use strict';

  const STORAGE_KEY = 'pixelswitch.activity.v1';
  const CHANNEL_NAME = 'pixelswitch-activity';
  const MAX_RECENT = 40;
  const apiBase = String(window.PIXELSWITCH_CONFIG?.activityApiUrl || '').replace(/\/$/, '');
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

  const emptyStats = () => ({
    conversions: 0,
    downloads: 0,
    bytesInput: 0,
    bytesOutput: 0,
    byTool: {},
    recent: [],
    updatedAt: null,
    source: apiBase ? 'site' : 'browser',
  });

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return emptyStats();
      return {
        ...emptyStats(),
        ...parsed,
        byTool: parsed.byTool && typeof parsed.byTool === 'object' ? parsed.byTool : {},
        recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, MAX_RECENT) : [],
        source: 'browser',
      };
    } catch {
      return emptyStats();
    }
  }

  function writeLocal(stats) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
  }

  function emit(stats) {
    const detail = { stats };
    document.dispatchEvent(new CustomEvent('pixelswitch:activity', { detail }));
    channel?.postMessage({ type: 'refresh' });
  }

  function normalizeTool(toolId) {
    return String(toolId || 'unknown').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'unknown';
  }

  function recordLocal(type, payload = {}) {
    const stats = readLocal();
    const tool = normalizeTool(payload.toolId);
    const count = Math.max(1, safeNumber(payload.count || 1));
    const inputBytes = safeNumber(payload.inputBytes);
    const outputBytes = safeNumber(payload.outputBytes);
    const timestamp = new Date().toISOString();
    const toolStats = stats.byTool[tool] || { conversions: 0, downloads: 0, bytesInput: 0, bytesOutput: 0, lastUsed: null };

    if (type === 'conversion') {
      stats.conversions += count;
      stats.bytesInput += inputBytes;
      stats.bytesOutput += outputBytes;
      toolStats.conversions += count;
      toolStats.bytesInput += inputBytes;
      toolStats.bytesOutput += outputBytes;
    } else {
      stats.downloads += count;
      toolStats.downloads += count;
    }

    toolStats.lastUsed = timestamp;
    stats.byTool[tool] = toolStats;
    stats.updatedAt = timestamp;
    stats.recent.unshift({ type, tool, count, timestamp });
    stats.recent = stats.recent.slice(0, MAX_RECENT);
    writeLocal(stats);
    emit(stats);
    return stats;
  }

  async function postRemote(type, payload = {}) {
    if (!apiBase) return;
    try {
      await fetch(`${apiBase}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          tool: normalizeTool(payload.toolId),
          count: Math.max(1, safeNumber(payload.count || 1)),
          inputBytes: safeNumber(payload.inputBytes),
          outputBytes: safeNumber(payload.outputBytes),
        }),
        keepalive: true,
      });
      document.dispatchEvent(new CustomEvent('pixelswitch:activity-sync'));
    } catch {}
  }

  function recordConversion(payload = {}) {
    const outputCount = Math.max(1, safeNumber(payload.outputCount || payload.count || 1));
    const normalized = {
      ...payload,
      count: outputCount,
      inputBytes: safeNumber(payload.inputBytes),
      outputBytes: safeNumber(payload.outputBytes),
    };
    const stats = recordLocal('conversion', normalized);
    postRemote('conversion', normalized);
    return stats;
  }

  function recordDownload(payload = {}) {
    const normalized = {
      ...payload,
      count: Math.max(1, safeNumber(payload.fileCount || payload.count || 1)),
      outputBytes: safeNumber(payload.outputBytes),
    };
    const stats = recordLocal('download', normalized);
    postRemote('download', normalized);
    return stats;
  }

  async function getStats() {
    if (!apiBase) return readLocal();
    try {
      const response = await fetch(`${apiBase}/activity`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error('Activity API unavailable');
      const remote = await response.json();
      return {
        ...emptyStats(),
        ...remote,
        byTool: remote.byTool || {},
        recent: readLocal().recent,
        source: 'site',
      };
    } catch {
      return readLocal();
    }
  }

  function clearLocal() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const stats = readLocal();
    emit(stats);
    return stats;
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit(readLocal());
  });
  channel?.addEventListener('message', () => {
    document.dispatchEvent(new CustomEvent('pixelswitch:activity-sync'));
  });

  window.PixelSwitchActivity = {
    recordConversion,
    recordDownload,
    getStats,
    getLocalStats: readLocal,
    clearLocal,
    hasSharedApi: Boolean(apiBase),
  };
})();
