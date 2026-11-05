import { esc, toast, countUp, formatTime } from '../dom.js';
import { api } from '../api.js';
import { store, lastRun } from '../store.js';
import { verdict } from '../engine.js';
import { ANSWER_COLOURS, shape } from '../catalog.js';

export function render(view, { go }) {
  const run = lastRun.get();
  if (!run) {
    view.innerHTML = `<div class="empty"><h3>No round to show</h3><p>Finish a round and your results land here.</p><a class="btn btn--primary" href="#/">Pick a subject</a></div>`;
    return;
  }
  const savedId = store.savedEntry(run.id);
  const playAgain = run.kind === 'quiz' ? `#/play/${run.board}` : `#/play/${run.board}`;

  view.innerHTML = `
    <section class="results c-${esc(run.colour)}">
      <div class="results__hero card">
        <p class="eyebrow eyebrow--ink">${esc(run.title)} · round complete</p>
        <div class="results__score"><b id="r-score">0</b><span>points</span></div>
        <p class="results__verdict">${esc(verdict(run.correct, run.total))}</p>
        ${run.improved ? `<p class="results__best">New personal best on this device</p>` : ''}
        <dl class="results__facts">
          <div><dt>Correct</dt><dd>${run.correct}/${run.total}</dd></div>
          <div><dt>Accuracy</dt><dd>${run.accuracy}%</dd></div>
          <div><dt>Time</dt><dd>${formatTime(run.seconds)}</dd></div>
          <div><dt>Best streak</dt><dd>${run.streak}</dd></div>
        </dl>
        <div class="results__actions">
          <a class="btn btn--primary" href="${playAgain}">Play again</a>
          <a class="btn" target="_blank" rel="noopener" id="share-wa">Share on WhatsApp</a>
          <button class="btn btn--ghost" id="share-copy">Copy result</button>
        </div>
      </div>

      <div class="results__save panel" id="save-box">
        ${savedId ? savedMarkup(run) : `
        <h2>Put it on the leaderboard</h2>
        <p>Top 10 for <b>${esc(run.title)}</b>. Ties go to the faster run.</p>
        <form id="save-form" class="save-form" novalidate>
          <label class="field"><span>Your name</span><input class="input" id="player-name" maxlength="20" autocomplete="nickname" placeholder="e.g. Kavya R" value="${esc(store.name)}"></label>
          <p class="form-error" id="save-err"></p>
          <button class="btn btn--ink btn--block" type="submit">Save my score</button>
        </form>`}
      </div>
    </section>

    <div class="section-head"><div><h2>Answer review</h2><p>Every question, what you picked, and why the answer is right.</p></div></div>
    <ol class="review">
      ${run.answers.map((a, n) => reviewItem(a, n)).join('')}
    </ol>`;

  countUp(view.querySelector('#r-score'), run.score);

  const text = `I scored ${run.score} (${run.correct}/${run.total}) on ${run.title} on Quizzy. Can you beat it?`;
  const link = run.kind === 'quiz' ? `${location.origin}/#/join?pin=${run.pin}` : `${location.origin}/#/play/${run.board}`;
  view.querySelector('#share-wa').href = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
  view.querySelector('#share-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(`${text} ${link}`); toast('Copied. Paste it anywhere.'); }
    catch { toast('Copying isn’t allowed in this browser.', 'bad'); }
  });

  const form = view.querySelector('#save-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('#player-name');
      const err = form.querySelector('#save-err');
      const btn = form.querySelector('button');
      const name = input.value.trim();
      if (name.length < 2) { err.textContent = 'Enter a name with at least 2 characters.'; input.classList.add('is-bad'); input.focus(); return; }
      btn.disabled = true; btn.textContent = 'Saving…'; err.textContent = ''; input.classList.remove('is-bad');
      try {
        const data = await api.saveScore({ board: run.board, name, score: run.score, correct: run.correct, seconds: run.seconds });
        store.name = name;
        store.markSaved(run.id, data.entry.id);
        lastRun.set({ ...run, rank: data.rank });
        view.querySelector('#save-box').innerHTML = savedMarkup({ ...run, rank: data.rank });
        toast(data.rank && data.rank <= 10 ? `You’re #${data.rank} on the board` : 'Score saved');
      } catch (e2) {
        err.textContent = e2.message;
        btn.disabled = false; btn.textContent = 'Save my score';
      }
    });
  }
}

function savedMarkup(run) {
  const top = run.rank && run.rank <= 10;
  return `
    <div class="saved">
      <span class="saved__rank">${top ? `#${run.rank}` : '✓'}</span>
      <h2>${top ? `You’re #${run.rank} on the board` : 'Score saved'}</h2>
      <p>${top ? 'Your row is highlighted on the leaderboard.' : 'The top 10 are ahead for now. One more round?'}</p>
      <a class="btn btn--ink btn--block" href="#/board/${esc(run.board)}">See the leaderboard</a>
    </div>`;
}

function reviewItem(a, n) {
  const q = a.question;
  const yours = a.choice === -1 ? 'No answer, time ran out' : q.options[a.choice];
  return `
    <li class="review__item ${a.correct ? 'is-right' : 'is-wrong'}">
      <div class="review__head">
        <span class="review__n">Q${n + 1}</span>
        <span class="review__mark">${a.correct ? `Correct · +${a.points}` : a.choice === -1 ? 'Timed out' : 'Wrong'}</span>
        <span class="review__time">${a.taken.toFixed(1)}s</span>
      </div>
      <p class="review__q">${esc(q.q)}</p>
      ${q.code ? `<pre class="review__code"><code>${esc(q.code)}</code></pre>` : ''}
      ${a.correct ? '' : `<p class="review__yours"><span class="c-${ANSWER_COLOURS[Math.max(0, a.choice)]}">${a.choice >= 0 ? shape(a.choice) : ''}</span>Your answer: ${esc(yours)}</p>`}
      <p class="review__right"><span class="c-${ANSWER_COLOURS[q.answer]}">${shape(q.answer)}</span>Answer: ${esc(q.options[q.answer])}</p>
      ${q.why ? `<p class="review__why">${esc(q.why)}</p>` : ''}
    </li>`;
}
