import { esc } from '../dom.js';

export function quizCard(q, i = 0) {
  return `
    <article class="qcard c-${esc(q.colour)} pop" style="animation-delay:${i * 60}ms">
      <div class="qcard__top">
        <span class="qcard__topic">${esc(q.topic)}</span>
        <span class="qcard__pin" title="Quiz PIN">PIN ${esc(q.pin.slice(0, 3))} ${esc(q.pin.slice(3))}</span>
      </div>
      <h3 class="qcard__title">${esc(q.title)}</h3>
      ${q.description ? `<p class="qcard__desc">${esc(q.description)}</p>` : ''}
      <p class="qcard__meta">${q.count} questions · ${q.seconds}s each · by ${esc(q.ownerName)}</p>
      <div class="qcard__actions">
        <a class="btn btn--ink btn--sm" href="#/quiz/${esc(q.id)}">Play</a>
        <a class="btn btn--ghost btn--sm" href="#/board/${esc(q.id)}">Leaderboard</a>
      </div>
    </article>`;
}
