// JSON documents in Vercel Blob, read fresh and written with compare-and-swap.
//
// The first version kept the leaderboard in a public store and read it through the CDN.
// An overwritten public blob can be served stale for a while, so a quiz saved a second ago
// could be missing from the next list, and a write built on that old copy could undo it.
// Now everything lives in a private store: reads skip the cache, and each save only goes
// through if the document hasn't changed since it was read (ETag). If it has, mutate()
// reads again and re-applies the change.
//
// Without a token (local development and tests) documents are plain files in .data/.
import { put, get, BlobPreconditionFailedError } from '@vercel/blob';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const FOLDER = 'quizzy/';
const token = () => process.env.DATA_READ_WRITE_TOKEN;
const LOCAL_DIR = process.env.QUIZZY_DATA_DIR || path.join(process.cwd(), '.data');
const seedOf = fallback => (typeof fallback === 'function' ? fallback() : structuredClone(fallback));

// An error with an HTTP status; mutate() lets it through so the handler can answer with it.
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readDoc(name, fallback) {
  if (!token()) {
    try { return { data: JSON.parse(await readFile(path.join(LOCAL_DIR, `${name}.json`), 'utf8')), etag: 'local' }; }
    catch (e) { if (e.code === 'ENOENT') return { data: seedOf(fallback), etag: null }; throw e; }
  }
  const res = await get(`${FOLDER}${name}.json`, { access: 'private', token: token(), useCache: false });
  if (!res || res.statusCode !== 200) return { data: seedOf(fallback), etag: null };
  // larger files come back compressed with a weak ETag (W/"…"); the write check needs the strong form
  return { data: JSON.parse(await new Response(res.stream).text()), etag: String(res.blob.etag).replace(/^W\//, '') };
}

// Returns false when someone else saved in between (the caller retries).
async function writeDoc(name, data, etag) {
  if (!token()) {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, `${name}.json`), JSON.stringify(data, null, 1));
    return true;
  }
  try {
    await put(`${FOLDER}${name}.json`, JSON.stringify(data), {
      access: 'private',
      token: token(),
      contentType: 'application/json',
      addRandomSuffix: false,
      ...(etag ? { allowOverwrite: true, ifMatch: etag } : { allowOverwrite: false }),
    });
    return true;
  } catch (err) {
    if (err instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(err.message)) return false;
    throw err;
  }
}

export async function readJSON(name, fallback) {
  return (await readDoc(name, fallback)).data;
}

// Read-modify-write. `change(data)` edits data in place and returns whatever the handler needs;
// it can throw an HttpError to stop without saving.
export async function mutate(name, fallback, change, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    const { data, etag } = await readDoc(name, fallback);
    const result = await change(data);
    if (await writeDoc(name, data, etag)) return result;
    await new Promise(r => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
  }
  throw new HttpError(503, 'Lots of people are saving at once. Please try again.');
}
