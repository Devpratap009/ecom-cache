const { verifyToken } = require('../auth-crypto');
const COOKIE_NAME = 'quickmart_session';

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function optionalAuth(req, res, next) {
  try {
    const token = readCookie(req, COOKIE_NAME);
    req.user = token ? verifyToken(token) : null;
  } catch { req.user = null; }
  next();
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ message: 'Please sign in to continue.' });
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
    next();
  });
}

module.exports = { COOKIE_NAME, optionalAuth, requireAuth, requireAdmin, setSessionCookie, clearSessionCookie };
