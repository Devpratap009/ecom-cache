require('dotenv').config();
const base = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
async function request(path, options) {
  const response = await fetch(base + path, { ...options, headers: { ...(options?.headers || {}), ...(process.env.QUICKMART_ADMIN_COOKIE ? { Cookie: process.env.QUICKMART_ADMIN_COOKIE } : {}) }, signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok) throw Error(`${path}: ${data.message || response.status}`);
  return data;
}
async function main() {
  if (process.argv.includes('--clear')) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to clear the cache.');
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' }), signal: AbortSignal.timeout(10000) });
    const loginData = await login.json();
    if (!login.ok) throw Error(loginData.message || 'Admin login failed');
    const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
    process.env.QUICKMART_ADMIN_COOKIE = cookie;
  }
  const health = await request('/api/health');
  if (!health.redisReady) throw Error('Redis must be connected before warming');
  if (process.argv.includes('--clear')) await request('/api/products/cache/all', { method: 'DELETE' });
  const catalog = await request('/api/products');
  for (const p of catalog.products) await request(`/api/products/${encodeURIComponent(p._id)}`);
  const verify = async path => { const data = await request(path); if (!data.isCached) throw Error(`${path} did not return a cache hit`); console.log(`${path}: ${data.source} HIT`); };
  await verify('/api/products');
  for (const p of catalog.products) await verify(`/api/products/${encodeURIComponent(p._id)}`);
  console.log(`Cache warming verified for catalog + ${catalog.products.length} products.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
