// Display details for the built-in subjects, and the answer shapes.
import { SUBJECTS } from './questions.js';

const LOOK = {
  c: { colour: 'azure', tag: 'C', short: 'C' },
  java: { colour: 'tomato', tag: 'Jv', short: 'Java' },
  python: { colour: 'sun', tag: 'Py', short: 'Python' },
  dbms: { colour: 'jade', tag: 'DB', short: 'DBMS' },
  os: { colour: 'rose', tag: 'OS', short: 'OS' },
  networks: { colour: 'teal', tag: 'CN', short: 'Networks' },
};

export const subjects = Object.entries(SUBJECTS).map(([key, s]) => ({ key, ...s, ...LOOK[key], count: s.questions.length }));
export const subjectByKey = key => subjects.find(s => s.key === key) || null;
export const isSubject = key => !!subjectByKey(key);

export const ANSWER_COLOURS = ['tomato', 'azure', 'sun', 'jade'];
export const SHAPE_NAMES = ['Triangle', 'Diamond', 'Circle', 'Square'];
const SHAPES = [
  '<path d="M12 3 22 20H2z"/>',
  '<path d="M12 2 22 12 12 22 2 12z"/>',
  '<circle cx="12" cy="12" r="9.5"/>',
  '<rect x="3" y="3" width="18" height="18" rx="2"/>',
];
export const shape = i => `<svg class="shape" viewBox="0 0 24 24" aria-hidden="true">${SHAPES[i % 4]}</svg>`;
