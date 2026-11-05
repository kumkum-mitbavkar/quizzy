export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function query(req, key) {
  if (req.query && req.query[key] != null) return String(req.query[key]);
  return new URL(req.url, 'http://local').searchParams.get(key);
}

// Known errors (HttpError) go back as they are; anything else is logged and hidden.
export function fail(res, err) {
  if (err && err.status) return send(res, err.status, { error: err.message });
  console.error(err);
  send(res, 500, { error: 'Something went wrong on our side. Please try again.' });
}
