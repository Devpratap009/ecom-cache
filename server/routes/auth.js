const express = require('express');
const User = require('../models/User');
const { hashPassword, verifyPassword, signToken } = require('../auth-crypto');
const { optionalAuth, setSessionCookie, clearSessionCookie } = require('../middleware/auth');

module.exports = function createAuthRoutes() {
  const router = express.Router();

  router.get('/me', optionalAuth, async (req, res, next) => {
    try {
      if (!req.user) return res.json({ user: null });
      const user = await User.findById(req.user.id).select('name email role').lean();
      if (!user) return res.json({ user: null });
      res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
    } catch (err) { next(err); }
  });

  router.post('/register', async (req, res, next) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: 'Enter a name, valid email and password (8–128 characters).' });
      }
      const existing = await User.findOne({ email }).lean();
      if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
      const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: 'user' });
      setSessionCookie(res, signToken(user));
      res.status(201).json({ message: 'Account created successfully.', user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const body = req.body || {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const requestedRole = body.role === 'admin' ? 'admin' : 'user';
      if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
      const user = await User.findOne({ email, role: requestedRole }).select('+passwordHash');
      if (!user || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
      setSessionCookie(res, signToken(user));
      res.json({ message: `Signed in as ${user.role}.`, user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
    } catch (err) { next(err); }
  });

  router.post('/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ message: 'You have been signed out.' });
  });

  return router;
};
