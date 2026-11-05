// Leaderboards: one per subject and one per class quiz.
import { esc, initials, formatTime } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { subjects, subjectByKey } from '../catalog.js';

const AVATAR_COLOURS = ['var(--azure)', 'var(--tomato)', 'var(--jade)', 'var(--rose)', 'var(--teal)', 'var(--sun-d)'];
const colourFor = name => AVATAR_COLOURS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLOURS.length];
// Sample players get one of the generated sample portraits (matched to the name); real players get initials.
const SAMPLE_WOMEN = new Set(['Sneha', 'Megha', 'Pooja', 'Anjali', 'Ritu', 'Shreya', 'Aishwarya', 'Divya', 'Kavya', 'Neha', 'Bhavana', 'Isha', 'Tanvi', 'Swati', 'Pallavi']);
const PORTRAITS = { f: [1, 3, 5, 7, 9], m: [2, 4, 6, 8] };
function portrait(name) {
  const list = PORTRAITS[SAMPLE_WOMEN.has(name.split(' ')[0]) ? 'f' : 'm'];
  return list[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % list.length];
}
const avatar = e => e.sample
  ? `<span class="avatar"><img src="/assets/avatars/s${portrait(e.name)}.jpg" alt="" loading="lazy"></span>`
  : `<span class="avatar" style="background:${colourFor(e.name)}">${esc(initials(e.name))}</span>`;

export async function render(view, { params, go }) {
  const key = params[0] || 'c';
  let quizzes = [];
  try { quizzes = (await api.quizzes()).quizzes; } catch { /* the subject boards still work */ }
  const quiz = quizzes.find(q => q.id === key);
  const subject = subjectByKey(key);
  let title = subject?.name || quiz?.title;
  if (!title && !subject) {
    try { title = (await api.quiz(key)).quiz.title; } catch { title = 'Leaderboard'; }
  }

  const option = (k, label) => `<option value="${esc(k)}" ${k === key ? 'selected' : ''}>${esc(label)}</option>`;
  view.innerHTML = `
    <header class="board-head">
      <div>
        <h1 class="page-title">Leaderboard</h1>
        <p class="page-sub">Top 10 per subject and per class quiz. Ties go to the faster run.</p>
      </div>
      <label class="field board-pick"><span>Showing</span>
        <select class="select" id="board-select">
          <optgroup label="Subjects">${subjects.map(s => option(s.key, s.name)).join('')}</optgroup>
          ${quizzes.length ? `<optgroup label="Class quizzes">${quizzes.map(q => option(q.id, q.title)).join('')}</optgroup>` : ''}
          ${!subject && !quiz ? option(key, title) : ''}
        </select>
      </label>
    </header>
    <div class="chips-row" role="tablist" aria-label="Subjects">
      ${subjects.map(s => `<a role="tab" class="tab ${s.key === key ? 'is-active' : ''}" aria-selected="${s.key === key}" href="#/board/${s.key}">${esc(s.short)}</a>`).join('')}
    </div>
    <section class="board" id="board"><div class="skeleton" style="height:360px"></div></section>`;

  view.querySelector('#board-select').addEventListener('change', e => go(`board/${e.target.value}`));

  const box = view.querySelector('#board');
  let entries;
  try { entries = (await api.scores(key)).entries; }
  catch (err) { box.innerHTML = `<div class="empty"><h3>Couldn’t load this board</h3><p>${esc(err.message)}</p></div>`; return; }

  const mine = store.myEntryIds();
  const playHref = subject ? `#/play/${key}` : `#/quiz/${key}`;
  if (!entries.length) {
    box.innerHTML = `<div class="empty"><h3>No scores yet</h3><p>Play ${esc(title)} and take the top spot.</p><a class="btn btn--primary" href="${playHref}">Play now</a></div>`;
    return;
  }

  const podium = entries.slice(0, 3);
  const order = [1, 0, 2].filter(i => podium[i]);
  box.innerHTML = `
    <div class="podium">
      ${order.map(i => {
        const e = podium[i];
        return `<div class="podium__spot podium__spot--${i + 1} ${mine.has(e.id) ? 'is-me' : ''}">
          ${avatar(e)}
          <b class="podium__name">${esc(e.name)}</b>
          ${e.sample ? '<span class="chip chip--sample">Sample</span>' : ''}
          <span class="podium__score">${e.score}</span>
          <div class="podium__block"><span>${i + 1}</span></div>
        </div>`;
      }).join('')}
    </div>
    <ol class="ranks">
      ${entries.map((e, i) => `
        <li class="rank ${mine.has(e.id) ? 'is-me' : ''}" style="animation-delay:${i * 40}ms">
          <span class="rank__n">${i + 1}</span>
          ${avatar(e)}
          <span class="rank__who"><b>${esc(e.name)}</b>${mine.has(e.id) ? ' <span class="chip chip--ink">You</span>' : ''}${e.sample ? ' <span class="chip chip--sample">Sample</span>' : ''}
            <small>${e.correct}/${e.total} correct · ${formatTime(e.seconds)}</small></span>
          <span class="rank__score">${e.score}</span>
        </li>`).join('')}
    </ol>
    <div class="board-foot"><a class="btn btn--primary" href="${playHref}">Play ${esc(title)}</a></div>`;
}
