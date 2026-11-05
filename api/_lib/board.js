// Leaderboard rules shared by the API and the tests.
export const SUBJECT_KEYS = ['c', 'java', 'python', 'dbms', 'os', 'networks'];
export const QUESTIONS_PER_ROUND = 10;
const KEEP = 50;

// Sample classmates so a subject board isn't empty on day one. The app tags these as "Sample".
export const SEED = {
  c: [['Aditya K', 128, 9], ['Sneha P', 117, 9], ['Rohan D', 104, 8], ['Megha S', 88, 7], ['Vinay H', 71, 6]],
  java: [['Pooja N', 132, 10], ['Karthik R', 115, 9], ['Anjali M', 97, 8], ['Siddharth B', 83, 7], ['Ritu G', 66, 6]],
  python: [['Shreya J', 139, 10], ['Nikhil T', 121, 9], ['Aishwarya V', 102, 8], ['Prateek L', 90, 7], ['Divya C', 74, 6]],
  dbms: [['Harsh P', 124, 9], ['Kavya R', 110, 9], ['Omkar S', 95, 8], ['Neha D', 81, 7], ['Tejas M', 63, 5]],
  os: [['Rahul B', 119, 9], ['Bhavana K', 106, 8], ['Sagar N', 92, 8], ['Isha P', 79, 7], ['Akash G', 60, 5]],
  networks: [['Tanvi H', 135, 10], ['Manoj K', 113, 9], ['Swati R', 99, 8], ['Yash D', 86, 7], ['Pallavi S', 70, 6]],
};

export function seedBoard() {
  const board = {};
  for (const key of SUBJECT_KEYS) {
    board[key] = SEED[key].map(([name, score, correct], i) => ({ id: `seed-${key}-${i}`, name, score, correct, total: QUESTIONS_PER_ROUND, seconds: 120 + i * 25 }));
  }
  return board;
}

export function cleanName(name) {
  return String(name || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
}

// `round` describes what was played: { total, seconds } (questions and seconds per question).
export function validate(entry, round = { total: QUESTIONS_PER_ROUND, seconds: 30 }) {
  const name = cleanName(entry.name);
  const score = Number(entry.score), correct = Number(entry.correct), seconds = Number(entry.seconds);
  const { total } = round;
  if (name.length < 2) return { error: 'Enter a name with at least 2 characters.' };
  if (!Number.isInteger(correct) || correct < 0 || correct > total) return { error: 'Invalid result.' };
  if (!Number.isInteger(score) || score < correct * 10 || score > correct * 15) return { error: 'Invalid score.' };
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > total * (round.seconds + 1)) return { error: 'Invalid time.' };
  return { value: { name, score, correct, total, seconds: Math.round(seconds) } };
}

// Higher score first; ties go to the faster run.
export function rank(list) {
  return [...list].sort((a, b) => b.score - a.score || a.seconds - b.seconds).slice(0, KEEP);
}
