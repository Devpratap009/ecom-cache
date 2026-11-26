require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../server/db');
const User = require('../server/models/User');
const { hashPassword } = require('../server/auth-crypto');

async function main() {
  const name = process.env.ADMIN_NAME || 'QuickMart Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) throw new Error('Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD (12–128 characters) in .env first.');
  if (name.length < 2 || name.length > 100) throw new Error('ADMIN_NAME must be between 2 and 100 characters.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET to a random value of at least 32 characters in .env first.');
  await connectDB();
  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email }).select('role').lean();
  const promoteExisting = process.argv.includes('--promote-existing');
  if (existing && existing.role !== 'admin' && !promoteExisting) {
    throw new Error('That email already belongs to a customer account. Choose a different ADMIN_EMAIL, or explicitly promote it with: npm run create-admin -- --promote-existing');
  }
  await User.findOneAndUpdate(
    { email },
    { $set: { name, email, passwordHash, role: 'admin' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(existing ? `Admin account updated for ${email}` : `Admin account created for ${email}`);
}

main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
