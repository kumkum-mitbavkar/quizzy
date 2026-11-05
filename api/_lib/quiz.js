// Rules for quizzes made in the Studio. The browser checks the same things before saving,
// but the server is the one that decides.
export const COLOURS = ['tomato', 'azure', 'sun', 'jade', 'rose', 'teal'];
export const SECONDS = [10, 20, 30, 45, 60];
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 30;

// Text is stored as typed; the app always renders it as text, never as HTML.
const clean = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanCode = (s, max) => String(s ?? '').replace(/\r/g, '').replace(/\s+$/, '').slice(0, max);

export function validateQuiz(input) {
  const title = clean(input.title, 60);
  const topic = clean(input.topic, 24) || 'General';
  const description = clean(input.description, 160);
  const colour = COLOURS.includes(input.colour) ? input.colour : 'azure';
  const seconds = SECONDS.includes(Number(input.seconds)) ? Number(input.seconds) : 30;
  const list = Array.isArray(input.questions) ? input.questions : [];

  if (title.length < 3) return { error: 'Give the quiz a title (at least 3 characters).' };
  if (list.length < MIN_QUESTIONS) return { error: `Add at least ${MIN_QUESTIONS} questions.` };
  if (list.length > MAX_QUESTIONS) return { error: `A quiz can have up to ${MAX_QUESTIONS} questions.` };

  const questions = [];
  for (const [i, raw] of list.entries()) {
    const n = i + 1;
    const q = clean(raw.q, 220);
    const typed = (Array.isArray(raw.options) ? raw.options : []).slice(0, 4).map(o => clean(o, 90));
    const picked = Number(raw.answer);
    if (q.length < 3) return { error: `Question ${n} needs some text.` };
    if (!Number.isInteger(picked) || !typed[picked]) return { error: `Pick the right answer for question ${n}.` };
    // Empty option boxes are dropped, so work out where the right answer ends up.
    const options = typed.filter(Boolean);
    const answer = typed.slice(0, picked).filter(Boolean).length;
    if (options.length < 2) return { error: `Question ${n} needs at least 2 answer options.` };
    if (new Set(options.map(o => o.toLowerCase())).size !== options.length) return { error: `Question ${n} has the same option twice.` };
    const item = { q, options, answer };
    const code = cleanCode(raw.code, 400);
    const why = clean(raw.why, 220);
    if (code) item.code = code;
    if (why) item.why = why;
    questions.push(item);
  }
  return { value: { title, topic, description, colour, seconds, shuffle: !!input.shuffle, published: input.published !== false, questions } };
}

export function newPin(taken) {
  for (;;) {
    const pin = String(100000 + Math.floor(Math.random() * 900000));
    if (!taken.has(pin)) return pin;
  }
}

// What players see in lists (no questions, so the shelf stays light).
export function summary(quiz) {
  const { questions, ownerId, ...rest } = quiz;
  return { ...rest, count: questions.length };
}
