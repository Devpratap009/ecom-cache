'use strict';
const $ = id => document.getElementById(id);
const detailPage = !!$('productDetail');
const productId = new URLSearchParams(location.search).get('id');
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
let products = [], editing = null, toastTimer, busy = false, queued = false, currentUser = null, previewObjectUrl = null;
const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; };
async function api(path, options = {}) {
  const res = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...options });
  const data = await res.json();
  if (!res.ok) throw Error(data.message || `HTTP ${res.status}`);
  return data;
}
function toast(message) { if (!$('toast')) return; $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500); }
function banner(message, type = '') { const el = $('cacheBanner'); if (!el) return; el.className = `cache-status ${type}`; el.textContent = message; }
function isAdmin() { return currentUser?.role === 'admin'; }
async function loadSession() {
  try { currentUser = (await api('/api/auth/me')).user; } catch { currentUser = null; }
  const signIn = $('signInLink'), label = $('accountLabel'), logout = $('logoutBtn');
  if (signIn) signIn.hidden = !!currentUser;
  if (label) { label.hidden = !currentUser; label.textContent = currentUser ? `${currentUser.name} · ${currentUser.role === 'admin' ? 'Admin' : 'Customer'}` : ''; }
  if (logout) logout.hidden = !currentUser;
  if ($('addBtn')) $('addBtn').hidden = !isAdmin();
  if ($('clearBtn')) $('clearBtn').hidden = !isAdmin();
}
async function health() {
  if (!$('healthNote')) return;
  try {
    const s = await api('/api/health');
    const labels = { shm: 'l1Hits', redis: 'redisHits', db: 'dbHits' };
    for (const [key,id] of Object.entries(labels)) if ($(id)) $(id).textContent = s.stats[key];
    if ($('l1Info')) $('l1Info').textContent = `${s.l1Mode} · ${s.shmTTL}s TTL`;
    if ($('redisInfo')) $('redisInfo').textContent = `${s.redisReady ? 'Connected' : 'Offline'} · ${s.redisTTL}s TTL`;
    if ($('strategyInfo')) $('strategyInfo').textContent = `${s.strategy} strategy`;
    $('healthNote').textContent = `MongoDB ${s.mongoReady ? 'connected' : 'unavailable'} · Redis ${s.redisReady ? 'connected' : 'offline; database fallback active'} · L1 ${s.l1Mode} · ${s.stats.refreshes} background refreshes · ${s.stats.errors} cache errors · Counters since server start${s.pendingInvalidation ? ' · Invalidation retry pending' : ''}`;
  } catch(e) { $('healthNote').textContent = `Health check unavailable: ${e.message}`; }
}
function resolveImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    let candidate = raw;
    if (candidate.startsWith('//')) candidate = `${location.protocol}${candidate}`;
    else if (!/^https?:\/\//i.test(candidate) && /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:\/|$)/i.test(candidate)) candidate = `https://${candidate}`;
    const url = /^https?:\/\//i.test(candidate)
      ? new URL(candidate)
      : new URL(`/${candidate.replace(/^(?:\.\/)+|^\/+/, '')}`, location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    // Browsers block insecure image requests on HTTPS pages. Try the secure endpoint.
    if (location.protocol === 'https:' && url.protocol === 'http:') url.protocol = 'https:';
    return url.href;
  } catch { return ''; }
}
function categoryIcon(category) {
  const value = String(category || '').toLowerCase();
  if (/electronic|phone|computer|audio|tech/.test(value)) return '📱';
  if (/fashion|cloth|apparel|shoe|wear/.test(value)) return '👕';
  if (/beauty|skin|cosmetic|personal/.test(value)) return '🧴';
  if (/grocery|food|drink|fruit|vegetable/.test(value)) return '🍎';
  if (/home|kitchen|furniture|decor/.test(value)) return '🏠';
  if (/sport|fitness|outdoor/.test(value)) return '⚽';
  if (/book|stationery|office/.test(value)) return '📚';
  if (/toy|game|kid/.test(value)) return '🧸';
  return '🛍️';
}
function media(p, stock = true) {
  const el = node('div','product-media image-fallback');
  const fallback = node('span','placeholder', categoryIcon(p.category));
  fallback.setAttribute('aria-hidden', 'true');
  el.append(fallback);
  const imageUrl = resolveImageUrl(p.imageUrl);
  if (imageUrl) {
    const img = node('img'); img.alt = p.name || 'Product image'; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('load', () => el.classList.remove('image-fallback'), { once: true });
    img.addEventListener('error', () => { img.remove(); el.classList.add('image-fallback'); }, { once: true });
    img.src = imageUrl; el.append(img);
  }
  if (stock) el.append(node('span',`stock${p.inStock ? '' : ' out'}`,p.inStock ? 'In stock' : 'Out of stock'));
  return el;
}
function renderProducts() {
  const grid = $('productGrid'); if (!grid) return;
  grid.replaceChildren();
  const term = $('search').value.trim().toLowerCase(), cat = $('categoryFilter').value;
  const shown = products.filter(p => (!cat || (p.category || 'general') === cat) && [p.name,p.description,p.category].some(v => String(v || '').toLowerCase().includes(term)));
  $('productCount').textContent = shown.length;
  if (!shown.length) { grid.append(node('p','empty',products.length ? 'No products match your filters.' : 'Your catalog is empty. Add a product to get started.')); return; }
  for (const p of shown) {
    const card = node('article','product-card'); const link = node('a','product-link'); link.href = `/product.html?id=${encodeURIComponent(p._id)}`; link.setAttribute('aria-label',`View ${p.name}`); link.append(media(p));
    const body = node('div','card-body'), title = node('a','product-title'); title.href = link.href; title.append(node('h3','',p.name));
    body.append(node('span','category',p.category || 'general'),title,node('p','description',p.description),node('p','price',currency.format(p.price)));
    card.append(link,body);
    if (isAdmin()) {
      const actions = node('div','card-actions'), edit = node('button','secondary','Edit'), del = node('button','secondary danger','Delete');
      edit.onclick = () => openModal(p); del.onclick = () => deleteProduct(p); actions.append(edit,del); card.append(actions);
    }
    grid.append(card);
  }
}
function renderDetail(p) {
  const info = node('div','detail-info');
  info.append(node('span','category',p.category || 'general'),node('h1','',p.name),node('p','price',currency.format(p.price)),node('span',`stock${p.inStock ? '' : ' out'}`,p.inStock ? 'In stock' : 'Out of stock'),node('p','description',p.description));
  if (isAdmin()) info.append(node('p','admin-note','Administrator access: manage this product from the catalog.'));
  $('productDetail').replaceChildren(media(p,false),info); document.title = `${p.name} — QuickMart`;
}
function setBusy(value) { busy = value; if ($('reloadBtn')) $('reloadBtn').disabled = value; if ($('clearBtn')) $('clearBtn').disabled = value || !isAdmin(); }
async function load({ clear = false } = {}) {
  if (busy) { queued = true; return; } setBusy(true); banner(clear ? 'Clearing cache…' : 'Fetching data…');
  try {
    if (detailPage && !productId) throw Error('Missing product ID');
    if (clear) { await api(detailPage ? `/api/products/${encodeURIComponent(productId)}/cache` : '/api/products/cache/all',{method:'DELETE'}); toast('Cache cleared. Fetching fresh data.'); }
    const start = performance.now();
    const result = await api(detailPage ? `/api/products/${encodeURIComponent(productId)}` : '/api/products');
    const ms = Math.round(performance.now()-start); if ($('latency')) $('latency').textContent = `${ms} ms`;
    const source = { shm:'L1 memory',redis:'L2 Redis',db:'L3 MongoDB' }[result.source] || result.source;
    banner(`${result.isCached ? 'CACHE HIT' : 'CACHE MISS'} · ${source} · ${ms} ms${clear ? ' · After clear' : ''}`,result.isCached ? 'hit' : 'miss');
    if (detailPage) renderDetail(result.product);
    else {
      products = result.products; const sel = $('categoryFilter'), previous = sel.value;
      sel.replaceChildren(new Option('All categories',''));
      for (const category of [...new Set(products.map(p => p.category || 'general'))].sort()) sel.add(new Option(category,category));
      if ([...sel.options].some(o=>o.value===previous)) sel.value=previous;
      renderProducts();
    }
  } catch(e) { banner(e.message,'error'); if (clear) toast(`Clear/fetch failed: ${e.message}`); else (detailPage ? $('productDetail') : $('productGrid')).replaceChildren(node('p','empty',e.message)); }
  finally { await health(); setBusy(false); if (queued) { queued = false; load(); } }
}
function updateImagePreview(src) {
  const preview = $('imagePreview'); if (!preview) return;
  preview.replaceChildren();
  if (!src) { preview.append(node('span','', 'Image preview')); return; }
  const imageUrl = /^blob:/.test(String(src)) ? src : resolveImageUrl(src);
  if (!imageUrl) { preview.append(node('span','', 'Enter a valid image URL or choose an image file')); return; }
  const img = node('img'); img.alt = 'Selected product preview';
  img.addEventListener('error', () => { preview.replaceChildren(node('span','', 'Image could not be loaded')); }, { once: true });
  img.src = imageUrl; preview.append(img);
}
function openModal(p = null) {
  editing = p?._id || null; const form = $('addForm'); form.reset(); $('formTitle').textContent = editing ? 'Edit product' : 'Add product'; $('formError').textContent = '';
  if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = null; }
  if (p) for (const key of ['name','price','description','category','imageUrl','inStock']) form.elements.namedItem(key).value = p[key] ?? '';
  updateImagePreview(p?.imageUrl || ''); $('addModal').showModal();
}
async function deleteProduct(p) {
  if (!confirm(`Delete ${p.name}?`)) return;
  try { const result = await api(`/api/products/${encodeURIComponent(p._id)}`,{method:'DELETE'}); toast(result.warning || 'Product deleted'); await load(); } catch(e) { toast(e.message); }
}
function fileToDataUrl(file) {
  return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Could not read the selected image.')); reader.readAsDataURL(file); });
}
if ($('logoutBtn')) $('logoutBtn').onclick = async () => {
  try { await api('/api/auth/logout',{method:'POST'}); currentUser = null; await loadSession(); toast('Signed out successfully.'); renderProducts(); if (detailPage) await load(); }
  catch (e) { toast(e.message); }
};
if (!detailPage) {
  $('search').oninput = renderProducts; $('categoryFilter').onchange = renderProducts; $('addBtn').onclick = () => { if (isAdmin()) openModal(); };
  $('closeModal').onclick = $('cancelModal').onclick = () => $('addModal').close();
  $('imageFile').onchange = () => {
    const file = $('imageFile').files[0];
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = file ? URL.createObjectURL(file) : null;
    updateImagePreview(previewObjectUrl || $('imageUrl').value.trim());
  };
  $('imageUrl').oninput = () => { if (!$('imageFile').files.length) updateImagePreview($('imageUrl').value.trim()); };
  $('addForm').onsubmit = async e => {
    e.preventDefault(); if (!isAdmin()) { $('formError').textContent = 'Administrator access is required.'; return; }
    const formData = new FormData(e.target), data = {};
    for (const [key,value] of formData.entries()) if (key !== 'imageFile') data[key] = value;
    data.price = Number(data.price); data.inStock = data.inStock === 'true';
    $('saveBtn').disabled = true; $('formError').textContent = '';
    try {
      const file = $('imageFile').files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw Error('Product images must be 5 MB or smaller.');
        const uploaded = await api('/api/uploads/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageData:await fileToDataUrl(file)})});
        data.imageUrl = uploaded.imageUrl;
      }
      const result = await api(editing ? `/api/products/${encodeURIComponent(editing)}` : '/api/products',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      $('addModal').close(); toast(result.warning || result.message); await load();
    } catch(err) { $('formError').textContent = err.message; }
    finally { $('saveBtn').disabled = false; }
  };
}
if ($('reloadBtn')) $('reloadBtn').onclick = () => load();
if ($('clearBtn')) $('clearBtn').onclick = () => { if (isAdmin()) load({clear:true}); };
(async function init() { await loadSession(); await load(); })();
