// The page you land on after entering a PIN: what the quiz is, then Start.
import { esc } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';

export async function render(view, { params }) {
  const [id] = params;
  view.innerHTML = `<div class="skeleton" style="height:340px;max-width:720px;margin:0 auto"></div>`;
  const { quiz } = await api.quiz(id);
  const best = store.best(quiz.id);
  const share = `${location.origin}/#/join?pin=${quiz.pin}`;
  view.innerHTML = `
    <section class="lobby c-${esc(quiz.colour)}">
      <div class="lobby__band">
        <span class="chip chip--ink">${esc(quiz.topic)}</span>
        <span class="lobby__pin">PIN <b>${quiz.pin.slice(0, 3)} ${quiz.pin.slice(3)}</b></span>
      </div>
      <h1 class="lobby__title">${esc(quiz.title)}</h1>
      ${quiz.description ? `<p class="lobby__desc">${esc(quiz.description)}</p>` : ''}
      <dl class="lobby__facts">
        <div><dt>Questions</dt><dd>${quiz.questions.length}</dd></div>
        <div><dt>Time each</dt><dd>${quiz.seconds}s</dd></div>
        <div><dt>Made by</dt><dd>${esc(quiz.ownerName)}</dd></div>
        <div><dt>Your best</dt><dd>${best ? best.score : '–'}</dd></div>
      </dl>
      <div class="lobby__actions">
        <a class="btn btn--primary" href="#/play/${esc(quiz.id)}">Start quiz</a>
        <a class="btn" href="#/board/${esc(quiz.id)}">Leaderboard</a>
        <a class="btn btn--ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Play "${quiz.title}" on Quizzy. PIN ${quiz.pin}: ${share}`)}">Share on WhatsApp</a>
      </div>
      <p class="lobby__note">Right answers score 10, plus up to 5 for speed. Your score can go on this quiz’s leaderboard at the end.</p>
    </section>`;
}
