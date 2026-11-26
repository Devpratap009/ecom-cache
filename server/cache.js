const { randomUUID } = require('node:crypto');
const STRATEGIES = {
  aggressive: { redisTTL: 1800, shmTTL: 300 },
  balanced: { redisTTL: 600, shmTTL: 60 },
  relaxed: { redisTTL: 120, shmTTL: 30 },
};
function createCache({ redis, l1, strategyName = 'balanced', track = async () => {}, prefix = 'quickmart:v2', now = Date.now, strategy: override }) {
  const name = Object.hasOwn(STRATEGIES, strategyName) ? strategyName : 'balanced';
  const strategy = override || STRATEGIES[name];
  const globalKey = `${prefix}:generation`;
  const versionKey = key => `${prefix}:version:${key}`;
  const flights = new Map();
  const stats = { shm: 0, redis: 0, db: 0, errors: 0, refreshes: 0 };
  let pending = false;
  function record(key, info) { Promise.resolve().then(() => track(key, info)).catch(() => {}); }
  async function version(key) {
    if (!redis.isReady) throw Error('Redis unavailable');
    let [global, local] = await redis.mGet([globalKey, versionKey(key)]);
    if (!global) {
      await redis.set(globalKey, randomUUID(), { NX: true });
      [global, local] = await redis.mGet([globalKey, versionKey(key)]);
      if (!global) throw Error('Missing cache generation');
    }
    return `${prefix}:data:${global}:${local || '0'}:${key}`;
  }
  async function invalidate(key) {
    if (!redis.isReady) throw Error('Redis unavailable');
    await redis.set(key ? versionKey(key) : globalKey, randomUUID());
  }
  async function recover() {
    if (pending) { await invalidate(); pending = false; }
  }
  async function afterMutation() {
    try { await invalidate(); pending = false; return true; }
    catch { pending = true; stats.errors++; return false; }
  }
  async function beforeMutation() { await recover(); if (!redis.isReady) throw Error('Redis unavailable'); }
  function parse(raw) { try { return JSON.parse(raw); } catch { return undefined; } }
  async function fill(key, physical, fetcher, refresh = false) {
    if (flights.has(physical)) return flights.get(physical);
    const work = (async () => {
      const data = await fetcher();
      if (data == null) return data;
      try {
        const raw = JSON.stringify(data);
        // Old-generation writes are unreachable after invalidation, even across instances.
        const started = now();
        await redis.setEx(physical, strategy.redisTTL, raw);
        l1.set(physical, raw, Math.min(strategy.shmTTL * 1000, strategy.redisTTL * 1000 - (now() - started)));
        if (refresh) stats.refreshes++;
        record(key, { refreshed: true });
      } catch { stats.errors++; }
      return data;
    })();
    flights.set(physical, work);
    try { return await work; } finally { flights.delete(physical); }
  }
  function background(key, physical, fetcher) {
    if (flights.has(physical)) return;
    fill(key, physical, fetcher, true).catch(() => { stats.errors++; });
  }
  async function read(key, fetcher) {
    let physical;
    try { await recover(); physical = await version(key); }
    catch { stats.errors++; }
    if (physical) {
      try {
        const local = l1.get(physical);
        if (local) {
          const data = parse(local.data);
          if (data != null) {
            stats.shm++; record(key, { hit: true });
            // TTL lookup is not on the response's critical path.
            redis.pTTL(physical).then(ttl => { if (ttl > 0 && ttl < strategy.redisTTL * 200) background(key, physical, fetcher); }).catch(() => {});
            return { data, source: 'shm', isCached: true };
          }
          l1.del(physical);
        }
        const started = now();
        const [raw, ttl] = await Promise.all([redis.get(physical), redis.pTTL(physical)]);
        const data = raw == null ? undefined : parse(raw);
        if (data != null && ttl > 0) {
          l1.set(physical, raw, Math.min(strategy.shmTTL * 1000, ttl - (now() - started)));
          stats.redis++; record(key, { hit: true });
          if (ttl < strategy.redisTTL * 200) background(key, physical, fetcher);
          return { data, source: 'redis', isCached: true };
        }
      } catch { stats.errors++; }
    }
    const data = physical ? await fill(key, physical, fetcher) : await fetcher();
    stats.db++; record(key, { hit: false });
    return { data, source: 'db', isCached: false };
  }
  return { read, invalidate, beforeMutation, afterMutation, status: () => ({ strategy: name, ...strategy, l1Mode: l1.mode, redisReady: !!redis.isReady, pendingInvalidation: pending, stats: { ...stats } }) };
}
module.exports = { createCache, STRATEGIES };
