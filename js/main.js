// Hash router: each screen module renders into #view and may return a cleanup function.
import { $, $$, esc, initials } from './dom.js';
import { store } from './store.js';
import * as home from './ui/home.js';
import * as join from './ui/join.js';
import * as lobby from './ui/lobby.js';
import * as play from './ui/play.js';
import * as results from './ui/results.js';
import * as board from './ui/board.js';
import * as login from './ui/login.js';
import * as studio from './ui/studio.js';
import * as editor from './ui/editor.js';
import * as stats from './ui/stats.js';
import * as about from './ui/about.js';

const routes = [
  [/^$/, home, 'home'],
  [/^join$/, join, 'join'],
  [/^quiz\/([\w-]+)$/, lobby, 'home'],
  [/^play\/([\w-]+)$/, play, 'home'],
  [/^results$/, results, 'home'],
  [/^board(?:\/([\w-]+))?$/, board, 'board'],
  [/^login$/, login, 'studio'],
  [/^studio$/, studio, 'studio'],
  [/^studio\/new$/, editor, 'studio'],
  [/^studio\/edit\/([\w-]+)$/, editor, 'studio'],
  [/^stats$/, stats, 'stats'],
  [/^about$/, about, ''],
];

const view = $('#view');
let cleanup = null;

export function go(path) { location.hash = '#/' + path.replace(/^#?\/?/, ''); }

function parse() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs = ''] = raw.split('?');
  return { path: path.replace(/\/$/, ''), query: new URLSearchParams(qs) };
}

function paintWho() {
  const who = $('#who');
  const user = store.session?.user;
  who.hidden = !user;
  if (user) who.innerHTML = `<span>${esc(user.name)}</span><b class="avatar" style="background:var(--ink)">${esc(initials(user.name))}</b>`;
  who.href = '#/studio';
  who.setAttribute('aria-label', user ? `Logged in as ${user.name}. Open Quiz Studio` : '');
}

async function render() {
  const { path, query } = parse();
  const match = routes.find(([re]) => re.test(path));
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  document.body.classList.remove('is-playing');

  if (!match) { view.innerHTML = notFound(); return; }
  const [re, screen, nav] = match;
  const params = path.match(re).slice(1);

  $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === nav));
  paintWho();
  window.scrollTo(0, 0);
  view.classList.remove('is-entering');
  void view.offsetWidth; // restart the enter animation
  view.classList.add('is-entering');
  // A fresh element per screen, so event listeners from the last screen can't pile up.
  const root = document.createElement('div');
  root.className = 'screen';
  view.replaceChildren(root);
  try {
    cleanup = await screen.render(root, { params, query, go, refreshWho: paintWho });
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="empty"><h3>That didn’t load</h3><p>${esc(err.message)}</p><a class="btn" href="#/">Back to home</a></div>`;
  }
}

function notFound() {
  return `<div class="empty"><h3>Nothing here</h3><p>This page doesn’t exist. It may be an old link.</p><a class="btn btn--primary" href="#/">Go to Quizzy home</a></div>`;
}

window.addEventListener('hashchange', render);
render();
