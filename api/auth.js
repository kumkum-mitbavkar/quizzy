import { send, readBody, fail } from './_lib/http.js';
import { mutate, HttpError } from './_lib/storage.js';
import { USERS, seedUsers, loadUsers, checkPassword, signToken, publicUser, currentUser, validateSignup } from './_lib/auth.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const user = await currentUser(req);
      return send(res, 200, user ? { user: publicUser(user) } : { user: null });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });

    const body = await readBody(req);

    if (body.action === 'signup') {
      const { value, error } = validateSignup(body);
      if (error) return send(res, 400, { error });
      const user = await mutate(USERS, seedUsers, users => {
        // a normal "no" (200 + message), so the browser console stays clean
        if (users.some(u => u.email === value.email)) throw new HttpError(200, 'An account with this email already exists. Log in instead.');
        users.push(value);
        return value;
      });
      return send(res, 201, { user: publicUser(user), token: signToken(user.id) });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const user = (await loadUsers()).find(u => u.email === email);
    // Wrong details are a normal answer (200 + message), so the browser console stays clean.
    if (!user || !checkPassword(String(body.password || ''), user.hash)) {
      return send(res, 200, { error: 'Email or password is wrong. Try the demo login shown below.' });
    }
    return send(res, 200, { user: publicUser(user), token: signToken(user.id) });
  } catch (err) {
    fail(res, err);
  }
}
