const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

function createL1({ dir = process.env.SHM_DIR || '/dev/shm/quickmart-v2', maxEntries = 1000, now = Date.now, forceMemory = false } = {}) {
  const memory = new Map();
  let shared = !forceMemory && (process.platform === 'linux' || !!process.env.SHM_DIR);
  if (shared) {
    try { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK); }
    catch { shared = false; }
  }
  const filename = key => path.join(dir, createHash('sha256').update(key).digest('hex') + '.json');
  function del(key) {
    memory.delete(key);
    if (shared) { try { fs.unlinkSync(filename(key)); } catch {} }
  }
  function get(key) {
    let entry;
    if (shared) { try { entry = JSON.parse(fs.readFileSync(filename(key), 'utf8')); } catch { entry = memory.get(key); } }
    else entry = memory.get(key);
    if (!entry || entry.expiresAt <= now() || typeof entry.data !== 'string') { if (entry) del(key); return null; }
    return { data: entry.data, remainingMs: entry.expiresAt - now() };
  }
  function set(key, data, ttlMs) {
    if (!(ttlMs > 0)) return;
    const entry = { data, expiresAt: now() + ttlMs };
    if (shared) {
      const file = filename(key), temp = file + '.' + randomUUID() + '.tmp';
      try { fs.writeFileSync(temp, JSON.stringify(entry), { mode: 0o600 }); fs.renameSync(temp, file); return; }
      catch { try { fs.unlinkSync(temp); } catch {} }
    }
    memory.delete(key); memory.set(key, entry);
    while (memory.size > maxEntries) memory.delete(memory.keys().next().value);
  }
  function sweep() {
    for (const [key, entry] of memory) if (entry.expiresAt <= now()) memory.delete(key);
    if (shared) {
      try { for (const file of fs.readdirSync(dir)) {
        if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
        const p = path.join(dir, file);
        try { const entry = JSON.parse(fs.readFileSync(p, 'utf8')); if (entry.expiresAt <= now()) fs.unlinkSync(p); } catch {}
      } } catch {}
    }
  }
  return { get, set, del, sweep, get mode() { return shared ? 'shared-memory' : 'process-memory'; } };
}
module.exports = { createL1 };
