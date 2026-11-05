// Pure quiz logic: building a round and scoring it. No DOM in here, so it's easy to test.
export const ROUND_SIZE = 10;
export const SECONDS_PER_QUESTION = 30;
export const MAX_BONUS = 5;

export function shuffle(list, rand = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle options but keep "None of these" style answers in the last slot.
export function prepare(question, rand = Math.random) {
  const tagged = question.options.map((text, i) => ({ text, correct: i === question.answer }));
  const tail = tagged.filter(o => /^none of/i.test(o.text));
  const body = shuffle(tagged.filter(o => !/^none of/i.test(o.text)), rand);
  const options = [...body, ...tail];
  return { ...question, options: options.map(o => o.text), answer: options.findIndex(o => o.correct) };
}

// A subject round: 10 random questions from the bank.
export function buildRound(subject, rand = Math.random) {
  return shuffle(subject.questions, rand).slice(0, ROUND_SIZE).map(q => prepare(q, rand));
}

// A class quiz: every question, in the host's order unless they turned shuffle on.
export function buildQuizRound(quiz, rand = Math.random) {
  const list = quiz.shuffle ? shuffle(quiz.questions, rand) : quiz.questions;
  return list.map(q => prepare(q, rand));
}

// 10 points for a right answer, plus up to 5 for speed (the bonus shrinks in even steps).
export function points(isCorrect, secondsLeft, totalSeconds = SECONDS_PER_QUESTION) {
  if (!isCorrect) return 0;
  const step = totalSeconds / (MAX_BONUS + 1);
  return 10 + Math.min(MAX_BONUS, Math.floor(Math.max(0, secondsLeft) / step));
}

export function bestStreak(answers) {
  let best = 0, run = 0;
  for (const a of answers) { run = a.correct ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

export function summarise(answers) {
  const correct = answers.filter(a => a.correct).length;
  const score = answers.reduce((s, a) => s + a.points, 0);
  const seconds = Math.round(answers.reduce((s, a) => s + a.taken, 0));
  return {
    correct, total: answers.length, score, seconds,
    accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
    streak: bestStreak(answers),
  };
}

export function verdict(correct, total) {
  const r = total ? correct / total : 0;
  if (r === 1) return 'Flawless. Not a single slip.';
  if (r >= 0.8) return 'Exam-ready. Just polish the few you missed.';
  if (r >= 0.6) return 'Solid base. The review below will close the gaps.';
  if (r >= 0.4) return 'Halfway there. Read the explanations and go again.';
  return 'Rough round. The explanations below are the quickest fix.';
}

// Consecutive days (ending today or yesterday) with at least one round played.
export function dayStreak(history, today = new Date()) {
  const days = new Set(history.map(h => new Date(h.at).toDateString()));
  const d = new Date(today);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
