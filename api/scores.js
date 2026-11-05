// GET  /api/scores?board=dbms        top 10 for a subject (or a class quiz id)
// POST /api/scores {board, name, score, correct, seconds}
import { randomUUID } from 'node:crypto';
import { readJSON, mutate } from './_lib/storage.js';
import { send, readBody, query, fail } from './_lib/http.js';
import { seedBoard, validate, rank, SUBJECT_KEYS, QUESTIONS_PER_ROUND } from './_lib/board.js';
import { SEED_QUIZZES } from './_lib/seed-quizzes.js';

const FILE = 'leaderboard';

// What a full round of this board looks like, or null if the board doesn't exist.
async function roundOf(key) {
  if (SUBJECT_KEYS.includes(key)) return { total: QUESTIONS_PER_ROUND, seconds: 30 };
  const quiz = (await readJSON('quizzes', SEED_QUIZZES)).find(q => q.id === key);
  return quiz ? { total: quiz.questions.length, seconds: quiz.seconds } : null;
}

const tidy = e => ({ ...e, sample: e.id.startsWith('seed-') });

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const key = String(query(req, 'board') || query(req, 'subject') || 'c');
      const board = await readJSON(FILE, seedBoard);
      return send(res, 200, { board: key, entries: (board[key] || []).slice(0, 10).map(tidy) });
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      const key = String(body.board || body.subject || '');
      const round = await roundOf(key);
      if (!round) return send(res, 400, { error: 'This quiz no longer exists, so the score can’t be saved.' });
      const { value, error } = validate(body, round);
      if (error) return send(res, 400, { error });
      const entry = { id: randomUUID(), ...value, at: new Date().toISOString() };
      const list = await mutate(FILE, seedBoard, board => {
        board[key] = rank([...(board[key] || []), entry]);
        return board[key];
      });
      const rankNo = list.findIndex(e => e.id === entry.id) + 1;
      return send(res, 201, { entry: tidy(entry), rank: rankNo || null, entries: list.slice(0, 10).map(tidy) });
    }
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    fail(res, err);
  }
}
