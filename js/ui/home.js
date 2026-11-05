import { esc } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { subjects, shape } from '../catalog.js';
import { pinMarkup, bindPin } from './pin.js';
import { quizCard } from './quizcard.js';

export async function render(view, { go }) {
  const name = store.name;
  view.innerHTML = `
    <section class="hero">
      <div class="hero__pin">
        <p class="eyebrow">Class quiz</p>
        <h1 class="hero__title">Got a quiz PIN?</h1>
        <p class="hero__lead">Your teacher or a friend shares a 6-digit PIN. Type it in, play the same questions, and land on the same leaderboard.</p>
        ${pinMarkup()}
        <p class="hero__try">No PIN yet? Try <button class="link-btn link-btn--light" data-pin="482913">482 913</button>, the sample SQL Showdown.</p>
        <div class="hero__tiles" aria-hidden="true">
          ${[0, 1, 2, 3].map(i => `<span class="c-${['tomato', 'azure', 'sun', 'jade'][i]}">${shape(i)}</span>`).join('')}
        </div>
      </div>
      <div class="hero__quick card">
        <p class="eyebrow eyebrow--ink">${name ? `Hi ${esc(name.split(' ')[0])}, quick round` : 'Quick round'}</p>
        <h2>10 questions.<br>30 seconds each.</h2>
        <ul class="rules">
          <li><b>+10</b> for every right answer</li>
          <li><b>+5</b> speed bonus at most, shrinking as the clock runs</li>
          <li><b>1–4</b> on a keyboard answers, <b>Enter</b> moves on</li>
        </ul>
        <button class="btn btn--primary btn--block" data-random>Play a random subject</button>
      </div>
    </section>

    <div class="section-head">
      <div><h2>Revise a subject</h2><p>96 questions from the BCA syllabus, each with a one-line explanation.</p></div>
    </div>
    <div class="subjects">
      ${subjects.map((s, i) => {
        const best = store.best(s.key);
        return `
        <a class="subject c-${s.colour} pop" style="animation-delay:${i * 50}ms" href="#/play/${s.key}">
          <span class="subject__tag">${s.tag}</span>
          <span class="subject__name">${esc(s.name)}</span><span class="subject__name subject__name--short">${esc(s.short)}</span>
          <span class="subject__blurb">${esc(s.blurb)}</span>
          <span class="subject__foot">
            <span>${best ? `Your best: <b>${best.score}</b>` : `${s.count} questions`}</span>
            <span class="subject__go">Play ${shape(0).replace('class="shape"', 'class="shape shape--play"')}</span>
          </span>
        </a>`;
      }).join('')}
    </div>

    <div class="section-head">
      <div><h2>Class quizzes</h2><p>Made in Quiz Studio by teachers and students. Anyone can play.</p></div>
      <a class="btn btn--ghost btn--sm" href="#/studio/new">Make your own</a>
    </div>
    <div class="qgrid" id="shelf">
      ${[0, 1, 2].map(() => '<div class="skeleton" style="height:210px"></div>').join('')}
    </div>`;

  bindPin(view, go);
  view.querySelector('[data-pin]').addEventListener('click', e => {
    const input = view.querySelector('.pin__input');
    input.value = '482 913';
    input.form.requestSubmit();
  });
  view.querySelector('[data-random]').addEventListener('click', () => {
    go(`play/${subjects[Math.floor(Math.random() * subjects.length)].key}`);
  });

  const shelf = view.querySelector('#shelf');
  try {
    const { quizzes } = await api.quizzes();
    shelf.innerHTML = quizzes.length
      ? quizzes.slice(0, 9).map(quizCard).join('')
      : `<div class="empty"><h3>No class quizzes yet</h3><p>Be the first to make one.</p><a class="btn btn--primary" href="#/studio/new">Open Quiz Studio</a></div>`;
  } catch (err) {
    shelf.innerHTML = `<div class="empty"><h3>Couldn’t load class quizzes</h3><p>${esc(err.message)}</p></div>`;
  }
}
