import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRound, buildQuizRound, points, summarise, prepare, dayStreak, ROUND_SIZE } from '../js/engine.js';
import { SUBJECTS } from '../js/questions.js';

test('a subject round has 10 distinct questions with the answer tracked through the shuffle', () => {
  const round = buildRound(SUBJECTS.dbms);
  assert.equal(round.length, ROUND_SIZE);
  assert.equal(new Set(round.map(q => q.q)).size, ROUND_SIZE);
  for (const q of round) {
    const original = SUBJECTS.dbms.questions.find(o => o.q === q.q && (o.code || '') === (q.code || ''));
    assert.equal(q.options[q.answer], original.options[original.answer]);
  }
});

test('"None of these" style options stay last', () => {
  const q = prepare({ q: 'x', options: ['None of these must be true', 'a', 'b', 'c'], answer: 0 });
  assert.equal(q.options[3], 'None of these must be true');
  assert.equal(q.answer, 3);
});

test('class quizzes keep the host order unless shuffle is on', () => {
  const quiz = { shuffle: false, questions: ['q1', 'q2', 'q3', 'q4'].map(q => ({ q, options: ['a', 'b'], answer: 0 })) };
  assert.deepEqual(buildQuizRound(quiz).map(q => q.q), ['q1', 'q2', 'q3', 'q4']);
});

test('speed bonus scales with the timer length', () => {
  assert.equal(points(false, 30), 0);
  assert.equal(points(true, 30, 30), 15);
  assert.equal(points(true, 0, 30), 10);
  assert.equal(points(true, 12, 30), 12);
  assert.equal(points(true, 10, 10), 15);
  assert.equal(points(true, 5, 10), 13);
  assert.equal(points(true, 100, 20), 15); // capped
});

test('summary adds up score, accuracy and best streak', () => {
  const s = summarise([
    { correct: true, points: 14, taken: 4.2 },
    { correct: true, points: 11, taken: 9.9 },
    { correct: false, points: 0, taken: 30 },
    { correct: true, points: 15, taken: 1.1 },
  ]);
  assert.deepEqual(s, { correct: 3, total: 4, score: 40, seconds: 45, accuracy: 75, streak: 2 });
});

test('day streak counts back from today or yesterday', () => {
  const day = n => new Date(2026, 10, n, 12).toISOString();
  const today = new Date(2026, 10, 10, 18);
  assert.equal(dayStreak([{ at: day(10) }, { at: day(9) }, { at: day(8) }, { at: day(6) }], today), 3);
  assert.equal(dayStreak([{ at: day(9) }, { at: day(8) }], today), 2);
  assert.equal(dayStreak([{ at: day(7) }], today), 0);
});
