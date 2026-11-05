// Stats from rounds played on this device (kept in localStorage).
import { esc, formatTime, timeAgo, confirmBox, toast } from '../dom.js';
import { store } from '../store.js';
import { dayStreak } from '../engine.js';
import { subjects } from '../catalog.js';

export function render(view) {
  const paint = () => {
    const history = store.history();
    if (!history.length) {
      view.innerHTML = `
        <h1 class="page-title">My stats</h1>
        <p class="page-sub">Your rounds on this device show up here: accuracy, streaks and best scores.</p>
        <div class="empty" style="margin-top:28px"><h3>No rounds yet</h3><p>Play one round and come back.</p><a class="btn btn--primary" href="#/">Pick a subject</a></div>`;
      return;
    }
    const rounds = history.length;
    const accuracy = Math.round(history.reduce((s, h) => s + h.accuracy, 0) / rounds);
    const points = history.reduce((s, h) => s + h.score, 0);
    const streak = dayStreak(history);
    const maxBest = 150;

    view.innerHTML = `
      <header class="stats-head">
        <div><h1 class="page-title">My stats</h1><p class="page-sub">From the rounds played on this device.</p></div>
        <button class="btn btn--ghost btn--sm" data-clear>Clear history</button>
      </header>
      <div class="kpis">
        <div class="kpi c-tomato"><small>Rounds played</small><b>${rounds}</b></div>
        <div class="kpi c-azure"><small>Average accuracy</small><b>${accuracy}%</b></div>
        <div class="kpi c-jade"><small>Points earned</small><b>${points}</b></div>
        <div class="kpi c-sun"><small>Day streak</small><b>${streak}</b><span>${streak === 1 ? 'day' : 'days'} in a row</span></div>
      </div>

      <div class="stats-grid">
        <section class="panel stats-card">
          <h2 class="editor__h">Best score per subject</h2>
          <ul class="bests">
            ${subjects.map(s => {
              const best = store.best(s.key);
              return `<li class="best c-${s.colour}">
                <span class="best__name">${esc(s.short)}</span>
                <span class="best__track"><i style="width:${best ? Math.round((best.score / maxBest) * 100) : 0}%"></i></span>
                <span class="best__val">${best ? `${best.score} <small>${best.correct}/${best.total}</small>` : '<a href="#/play/' + s.key + '">Play</a>'}</span>
              </li>`;
            }).join('')}
          </ul>
          <p class="stats-note">The bar is out of 150, the most a 10-question round can score.</p>
        </section>
        <section class="panel stats-card">
          <h2 class="editor__h">Recent rounds</h2>
          <ol class="recent">
            ${history.slice(0, 10).map(h => `
              <li><span><b>${esc(h.title)}</b><small>${timeAgo(h.at)} · ${h.correct}/${h.total} · ${formatTime(h.seconds)}</small></span><span class="recent__score">${h.score}</span></li>`).join('')}
          </ol>
        </section>
      </div>`;
  };
  paint();

  view.addEventListener('click', async e => {
    if (!e.target.closest('[data-clear]')) return;
    if (await confirmBox({ title: 'Clear your history?', body: 'Your rounds and best scores on this device will be removed. Leaderboard scores stay.', ok: 'Clear', danger: true })) {
      store.clearHistory(); paint(); toast('History cleared');
    }
  });
}
