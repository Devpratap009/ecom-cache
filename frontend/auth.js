'use strict';
const $ = id => document.getElementById(id);
let role = 'user';
let mode = 'login';
let existingSession = null;
async function api(path, options = {}) {
  const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...options });
  const data = await response.json();
  if (!response.ok) throw Error(data.message || `HTTP ${response.status}`);
  return data;
}
function setError(message = '') { $('authError').textContent = message; }
function renderMode() {
  const admin = role === 'admin', registering = mode === 'register';
  $('nameField').hidden = !registering;
  $('nameField').querySelector('input').required = registering;
  $('authEyebrow').textContent = admin ? 'ADMINISTRATOR ACCESS' : 'CUSTOMER ACCOUNT';
  $('authTitle').textContent = registering ? 'Create account' : admin ? 'Admin sign in' : 'Sign in';
  $('authSubtitle').textContent = registering ? 'Create a customer account to browse and manage your profile.' : admin ? 'Sign in with your administrator credentials to manage products and cache controls.' : 'Access your account and explore the collection.';
  $('submitBtn').textContent = registering ? 'Create account' : admin ? 'Sign in as admin' : 'Sign in';
  $('switchText').hidden = admin;
  $('adminNote').hidden = !admin;
  const sessionNote = $('sessionNote');
  if (sessionNote) {
    sessionNote.hidden = !existingSession;
    sessionNote.textContent = existingSession ? `Currently signed in as ${existingSession.name} (${existingSession.role}). Signing in here will switch the active account.` : '';
  }
  $('switchMode').textContent = registering ? 'Sign in instead' : 'Create an account';
  $('authForm').elements.password.autocomplete = registering ? 'new-password' : 'current-password';
  document.querySelectorAll('.role-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.role === role));
}
function safeNext() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}
document.querySelectorAll('.role-tab').forEach(tab => tab.addEventListener('click', () => {
  role = tab.dataset.role; if (role === 'admin') mode = 'login'; setError(); renderMode();
}));
$('switchMode').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; setError(); renderMode(); };
$('authForm').onsubmit = async event => {
  event.preventDefault(); setError(); $('submitBtn').disabled = true;
  const form = new FormData(event.currentTarget);
  const payload = { email: String(form.get('email') || '').trim(), password: String(form.get('password') || ''), role };
  if (mode === 'register') payload.name = String(form.get('name') || '').trim();
  try {
    await api(mode === 'register' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    location.assign(safeNext());
  } catch (error) { setError(error.message); }
  finally { $('submitBtn').disabled = false; }
};
(async function init() {
  try { existingSession = (await api('/api/auth/me')).user; } catch { existingSession = null; }
  renderMode();
})();
