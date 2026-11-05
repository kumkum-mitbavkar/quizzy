// Accounts for quiz hosts. Passwords are hashed with scrypt; sessions are signed tokens
// (userId.expiry.signature) sent as a Bearer header, so no cookies are involved.
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createHash, randomUUID } from 'node:crypto';
import { readJSON } from './storage.js';

export const USERS = 'users';
const WEEK = 7 * 24 * 3600 * 1000;

export const DEMO_USER = { id: 'u-demo', name: 'Ms. Deshpande', email: 'host@quizzy.in', password: 'demo1234' };

function secret() {
  const base = process.env.SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || 'local-dev-secret';
  return createHash('sha256').update('quizzy-session:' + base).digest();
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

export function checkPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(password, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signToken(userId, now = Date.now()) {
  const body = `${userId}.${now + WEEK}`;
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readToken(token, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const good = createHmac('sha256', secret()).update(`${id}.${exp}`).digest('base64url');
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (Number(exp) < now) return null;
  return id;
}

// The demo host exists from the start; its hash is made the first time the file is created.
export const seedUsers = () => [{ id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email, hash: hashPassword(DEMO_USER.password) }];
export const loadUsers = () => readJSON(USERS, seedUsers);

export const publicUser = u => ({ id: u.id, name: u.name, email: u.email });

export async function currentUser(req) {
  const header = req.headers?.authorization || '';
  const id = readToken(header.replace(/^Bearer\s+/i, ''));
  if (!id) return null;
  const users = await loadUsers();
  return users.find(u => u.id === id) || null;
}

export function validateSignup({ name, email, password }) {
  name = String(name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  email = String(email || '').trim().toLowerCase();
  password = String(password || '');
  if (name.length < 2 || name.length > 40) return { error: 'Enter your name (2 to 40 characters).' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'That email address doesn’t look right.' };
  if (password.length < 6) return { error: 'Use a password with at least 6 characters.' };
  return { value: { id: 'u-' + randomUUID().slice(0, 8), name, email, hash: hashPassword(password) } };
}
