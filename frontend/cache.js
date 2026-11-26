'use strict';
const $ = id => document.getElementById(id);
let currentUser = null;
let busy = false;

async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.message || `HTTP ${response.status}`);
  return data;
}
function banner(message, type = '') {
  const el = $('cacheBanner');
  el.className = `cache-status ${type}`;
  el.textContent = message;
}
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 4500);
}
function setBusy(value) {
  busy = value;
  $('probeBtn').disabled = value;
  $('clearBtn').disabled = value || currentUser?.role !== 'admin';
}
async function loadSession() {
  try { currentUser = (await api('/api/auth/me')).user; }
  catch { currentUser = null; }
  $('signInLink').hidden = !!currentUser;
  $('accountLabel').hidden = !currentUser;
  $('accountLabel').textContent = currentUser ? `${currentUser.name} · ${currentUser.role === 'admin' ? 'Admin' : 'Customer'}` : '';
  $('logoutBtn').hidden = !currentUser;
  $('clearBtn').hidden = currentUser?.role !== 'admin';
}
function setLayerState(id, ready, goodText, badText) {
  const el = $(id);
  el.textContent = ready ? goodText : badText;
  el.classList.toggle('online', !!ready);
  el.classList.toggle('offline', !ready);
}
async function refreshHealth() {
  let response;
  try {
    response = await fetch('/api/health', { cache: 'no-store', credentials: 'same-origin' });
    const s = await response.json();
    const stats = s.stats || {};
    $('l1Hits').textContent = stats.shm ?? 0;
    $('redisHits').textContent = stats.redis ?? 0;
    $('dbHits').textContent = stats.db ?? 0;
    $('l1Info').textContent = `${s.l1Mode || 'Unknown'} · ${s.shmTTL ?? '—'}s TTL`;
    $('redisInfo').textContent = `${s.redisReady ? 'Connected' : 'Offline'} · ${s.redisTTL ?? '—'}s TTL`;
    $('strategyInfo').textContent = `${s.strategy || 'Unknown'} strategy`;
    $('healthNote').textContent = `MongoDB ${s.mongoReady ? 'connected' : 'unavailable'} · Redis ${s.redisReady ? 'connected' : 'offline; database fallback active'} · L1 ${s.l1Mode || 'unknown'} · ${stats.refreshes ?? 0} background refreshes · ${stats.errors ?? 0} cache errors · Counters since server start${s.pendingInvalidation ? ' · Invalidation retry pending' : ''}`;
    setLayerState('l1State', !!s.l1Mode, `${s.l1Mode} active · ${s.shmTTL}s TTL`, 'L1 unavailable');
    setLayerState('redisState', !!s.redisReady, `Connected · ${s.redisTTL}s TTL`, 'Offline · reads fall back to MongoDB');
    setLayerState('mongoState', !!s.mongoReady, 'Connected · source of truth', 'Unavailable · check database connection');
    if (!response.ok) $('healthNote').textContent = `Health check returned HTTP ${response.status}. ${$('healthNote').textContent}`;
  } catch (error) {
    $('healthNote').textContent = `Health check unavailable: ${error.message}`;
    setLayerState('l1State', false, '', 'Health check unavailable');
    setLayerState('redisState', false, '', 'Health check unavailable');
    setLayerState('mongoState', false, '', 'Health check unavailable');
  }
}
async function probeCatalog() {
  if (busy) return;
  setBusy(true);
  banner('Probing catalog cache…');
  try {
    const start = performance.now();
    const result = await api('/api/products');
    const ms = Math.round(performance.now() - start);
    $('latency').textContent = `${ms} ms`;
    const source = { shm: 'L1 memory', redis: 'L2 Redis', db: 'L3 MongoDB' }[result.source] || result.source || 'Unknown source';
    banner(`${result.isCached ? 'CACHE HIT' : 'CACHE MISS'} · ${source} · ${ms} ms`, result.isCached ? 'hit' : 'miss');
  } catch (error) {
    banner(error.message, 'error');
  } finally {
    await refreshHealth();
    setBusy(false);
  }
}
async function clearAllCache() {
  if (busy || currentUser?.role !== 'admin') return;
  setBusy(true);
  banner('Clearing all product caches…');
  try {
    const result = await api('/api/products/cache/all', { method: 'DELETE' });
    banner(result.message || 'All product caches cleared. Run a probe to fetch fresh data.', 'miss');
    toast('All product caches cleared.');
    await refreshHealth();
  } catch (error) {
    banner(error.message, 'error');
  } finally {
    setBusy(false);
  }
}
$('probeBtn').addEventListener('click', probeCatalog);
$('clearBtn').addEventListener('click', clearAllCache);
$('logoutBtn').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    await loadSession();
    toast('Signed out successfully.');
  } catch (error) { toast(error.message); }
});
(async function init() {
  await loadSession();
  await refreshHealth();
})();
