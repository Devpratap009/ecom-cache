const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !/^[a-f\d]{32}$/i.test(saltHex || '') || !/^[a-f\d]{128}$/i.test(hashHex || '')) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw Object.assign(new Error('JWT_SECRET must be set to a random value of at least 32 characters'), { status: 503 });
  return value;
}

function signToken(user, now = Math.floor(Date.now() / 1000)) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: String(user._id), role: user.role, name: user.name, iat: now, exp: now + 86400 })).toString('base64url');
  const input = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret()).update(input).digest('base64url');
  return `${input}.${signature}`;
}

function verifyToken(token, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const input = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret()).update(input).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (h.alg !== 'HS256' || h.typ !== 'JWT' || !p.sub || !['user', 'admin'].includes(p.role) || !Number.isFinite(p.exp) || p.exp <= now) return null;
    return { id: p.sub, role: p.role, name: typeof p.name === 'string' ? p.name : '' };
  } catch { return null; }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
