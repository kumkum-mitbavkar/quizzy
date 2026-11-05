import { store } from './store.js';

async function call(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = store.session?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('You seem to be offline. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) store.session = null; // expired login
  // Some expected "no" answers (wrong PIN, wrong password) come back as 200 with an error message.
  if (!res.ok || data.error) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status });
  return data;
}

export const api = {
  scores: board => call(`/api/scores?board=${encodeURIComponent(board)}`),
  saveScore: entry => call('/api/scores', { method: 'POST', body: entry }),

  quizzes: () => call('/api/quizzes'),
  quiz: id => call(`/api/quizzes?id=${encodeURIComponent(id)}`),
  byPin: pin => call(`/api/quizzes?pin=${encodeURIComponent(pin)}`),
  myQuizzes: () => call('/api/quizzes?mine=1'),
  createQuiz: quiz => call('/api/quizzes', { method: 'POST', body: quiz }),
  updateQuiz: (id, quiz) => call(`/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'PUT', body: quiz }),
  deleteQuiz: id => call(`/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  login: (email, password) => call('/api/auth', { method: 'POST', body: { action: 'login', email, password } }),
  signup: form => call('/api/auth', { method: 'POST', body: { action: 'signup', ...form } }),
  me: () => call('/api/auth'),
};
