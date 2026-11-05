import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, rank, seedBoard, SUBJECT_KEYS } from '../api/_lib/board.js';
import { validateQuiz, summary } from '../api/_lib/quiz.js';
import { signToken, readToken, hashPassword, checkPassword, validateSignup } from '../api/_lib/auth.js';
import { SEED_QUIZZES } from '../api/_lib/seed-quizzes.js';

test('every subject board is seeded with sample players', () => {
  const board = seedBoard();
  for (const key of SUBJECT_KEYS) assert.equal(board[key].length, 5);
});

test('scores must match the number of correct answers and a sensible time', () => {
  const round = { total: 10, seconds: 30 };
  assert.ok(validate({ name: 'Kavya', score: 128, correct: 9, seconds: 140 }, round).value);
  assert.match(validate({ name: 'Kavya', score: 151, correct: 10, seconds: 100 }, round).error, /score/i);
  assert.match(validate({ name: 'Kavya', score: 50, correct: 6, seconds: 100 }, round).error, /score/i);
  assert.match(validate({ name: 'K', score: 0, correct: 0, seconds: 10 }, round).error, /name/i);
  assert.match(validate({ name: 'Kavya', score: 40, correct: 4, seconds: 999 }, { total: 4, seconds: 20 }).error, /time/i);
});

test('ties go to the faster run', () => {
  const ranked = rank([{ score: 100, seconds: 90 }, { score: 120, seconds: 200 }, { score: 100, seconds: 60 }]);
  assert.deepEqual(ranked.map(e => e.seconds), [200, 60, 90]);
});

const good = () => ({
  title: 'Java Basics', topic: 'Java', colour: 'tomato', seconds: 20,
  questions: [1, 2, 3].map(n => ({ q: `Question ${n}?`, options: ['Yes', 'No', '', ''], answer: 1 })),
});

test('a valid quiz passes and empty option boxes are dropped', () => {
  const { value } = validateQuiz(good());
  assert.equal(value.questions[0].options.length, 2);
  assert.equal(value.questions[0].answer, 1);
});

test('the right answer keeps its place when an earlier box is empty', () => {
  const quiz = good();
  quiz.questions[0] = { q: 'Pick C', options: ['A', '', 'C', 'D'], answer: 2 };
  const { value } = validateQuiz(quiz);
  assert.equal(value.questions[0].options[value.questions[0].answer], 'C');
});

test('quiz validation explains what is wrong', () => {
  assert.match(validateQuiz({ ...good(), title: 'x' }).error, /title/);
  assert.match(validateQuiz({ ...good(), questions: good().questions.slice(0, 2) }).error, /at least 3/);
  const blankAnswer = good(); blankAnswer.questions[1].answer = 3;
  assert.match(validateQuiz(blankAnswer).error, /question 2/);
  const dupes = good(); dupes.questions[2].options = ['Same', 'same', '', ''];
  assert.match(validateQuiz(dupes).error, /same option twice/);
});

test('list summaries leave out the questions and owner id', () => {
  const s = summary(SEED_QUIZZES[0]);
  assert.equal(s.questions, undefined);
  assert.equal(s.ownerId, undefined);
  assert.equal(s.count, SEED_QUIZZES[0].questions.length);
});

test('seed quizzes are themselves valid', () => {
  for (const q of SEED_QUIZZES) assert.ok(validateQuiz(q).value, q.title);
});

test('session tokens are signed and expire', () => {
  const token = signToken('u-1', 1000);
  assert.equal(readToken(token, 2000), 'u-1');
  assert.equal(readToken(token.replace('u-1', 'u-2'), 2000), null);
  assert.equal(readToken(token, 1000 + 8 * 24 * 3600 * 1000), null);
});

test('passwords are hashed, not stored', () => {
  const stored = hashPassword('demo1234');
  assert.ok(!stored.includes('demo1234'));
  assert.ok(checkPassword('demo1234', stored));
  assert.ok(!checkPassword('demo12345', stored));
  assert.match(validateSignup({ name: 'A', email: 'a@b.in', password: '123456' }).error, /name/);
  assert.match(validateSignup({ name: 'Asha', email: 'nope', password: '123456' }).error, /email/);
});
