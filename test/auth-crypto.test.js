const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../server/auth-crypto');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hmac-signing';

test('password hashes are salted and verify only the matching password', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('JWT contains role and expires after one day', () => {
  const now = 1_800_000_000;
  const token = signToken({ _id: 'user-123', role: 'admin', name: 'QuickMart Admin' }, now);
  assert.deepEqual(verifyToken(token, now + 1), { id: 'user-123', role: 'admin', name: 'QuickMart Admin' });
  assert.equal(verifyToken(token, now + 86400), null);
  assert.equal(verifyToken(`${token}tampered`, now + 1), null);
});

const { requireAuth, requireAdmin } = require('../server/middleware/auth');
function mockResponse() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test('auth middleware rejects anonymous requests and limits admin routes by role', () => {
  const anonymous = { headers: {} }, denied = mockResponse();
  let called = false;
  requireAuth(anonymous, denied, () => { called = true; });
  assert.equal(denied.statusCode, 401); assert.equal(called, false);

  const customerToken = signToken({ _id: 'customer-1', role: 'user', name: 'Customer' });
  const customer = { headers: { cookie: `quickmart_session=${customerToken}` } }, customerDenied = mockResponse();
  requireAdmin(customer, customerDenied, () => { called = true; });
  assert.equal(customerDenied.statusCode, 403); assert.equal(called, false);

  const adminToken = signToken({ _id: 'admin-1', role: 'admin', name: 'Admin' });
  const admin = { headers: { cookie: `quickmart_session=${adminToken}` } };
  requireAdmin(admin, mockResponse(), () => { called = true; });
  assert.equal(called, true);
});
