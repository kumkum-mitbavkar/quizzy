// GET    /api/quizzes            published quizzes (summaries)
// GET    /api/quizzes?pin=482913 one quiz to play, found by its PIN
// GET    /api/quizzes?id=…       one quiz to play (or to edit, if it's yours)
// GET    /api/quizzes?mine=1     your quizzes (needs login)
// POST   /api/quizzes            create (needs login)
// PUT    /api/quizzes?id=…       update your quiz
// DELETE /api/quizzes?id=…       delete your quiz
import { randomUUID } from 'node:crypto';
import { readJSON, mutate, HttpError } from './_lib/storage.js';
import { send, readBody, query, fail } from './_lib/http.js';
import { currentUser } from './_lib/auth.js';
import { validateQuiz, newPin, summary } from './_lib/quiz.js';
import { SEED_QUIZZES } from './_lib/seed-quizzes.js';

const FILE = 'quizzes';

function ownIndex(quizzes, id, user) {
  const index = quizzes.findIndex(q => q.id === id);
  if (index < 0) throw new HttpError(404, 'This quiz was deleted or never existed.');
  if (quizzes[index].ownerId !== user.id) throw new HttpError(403, 'Only the person who made this quiz can change it.');
  return index;
}

export default async function handler(req, res) {
  try {
    const id = query(req, 'id');

    if (req.method === 'GET') {
      const quizzes = await readJSON(FILE, SEED_QUIZZES);
      const pin = query(req, 'pin');
      if (pin) {
        const quiz = quizzes.find(q => q.pin === pin.replace(/\D/g, ''));
        // A wrong PIN is an everyday typo, not a server error, so it answers 200 with a message.
        return send(res, 200, quiz ? { quiz: summary(quiz) } : { quiz: null, error: 'No quiz has that PIN. Check the 6 digits and try again.' });
      }
      if (id) {
        const quiz = quizzes.find(q => q.id === id);
        if (!quiz) return send(res, 404, { error: 'This quiz was deleted or never existed.' });
        const { ownerId, ...playable } = quiz;
        return send(res, 200, { quiz: playable });
      }
      if (query(req, 'mine')) {
        const user = await currentUser(req);
        if (!user) return send(res, 401, { error: 'Please log in.' });
        return send(res, 200, { quizzes: quizzes.filter(q => q.ownerId === user.id).map(summary) });
      }
      return send(res, 200, { quizzes: quizzes.filter(q => q.published).map(summary) });
    }

    const user = await currentUser(req);
    if (!user) return send(res, 401, { error: 'Your session ended. Please log in again.' });

    if (req.method === 'POST') {
      const { value, error } = validateQuiz(await readBody(req));
      if (error) return send(res, 400, { error });
      const quiz = await mutate(FILE, SEED_QUIZZES, quizzes => {
        if (quizzes.filter(q => q.ownerId === user.id).length >= 40) throw new HttpError(400, 'You have 40 quizzes already. Delete one to make room.');
        const created = {
          id: 'qz-' + randomUUID().slice(0, 8),
          pin: newPin(new Set(quizzes.map(q => q.pin))),
          ownerId: user.id, ownerName: user.name,
          ...value,
          updatedAt: new Date().toISOString(),
        };
        quizzes.unshift(created);
        return created;
      });
      return send(res, 201, { quiz: summary(quiz) });
    }

    if (req.method === 'PUT') {
      const { value, error } = validateQuiz(await readBody(req));
      if (error) return send(res, 400, { error });
      const quiz = await mutate(FILE, SEED_QUIZZES, quizzes => {
        const i = ownIndex(quizzes, id, user);
        quizzes[i] = { ...quizzes[i], ...value, ownerName: user.name, updatedAt: new Date().toISOString() };
        return quizzes[i];
      });
      return send(res, 200, { quiz: summary(quiz) });
    }

    if (req.method === 'DELETE') {
      const gone = await mutate(FILE, SEED_QUIZZES, quizzes => quizzes.splice(ownIndex(quizzes, id, user), 1)[0]);
      return send(res, 200, { deleted: gone.id });
    }

    return send(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    fail(res, err);
  }
}
