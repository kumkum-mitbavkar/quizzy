// Quiz Studio home: the signed-in host's quizzes.
import { esc, toast, confirmBox, timeAgo } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';

export async function render(view, { go, refreshWho }) {
  const session = store.session;
  if (!session) { go('login?next=studio'); return; }

  view.innerHTML = `
    <header class="studio-head">
      <div>
        <p class="eyebrow eyebrow--ink">Quiz Studio</p>
        <h1 class="page-title">Your quizzes</h1>
        <p class="page-sub">Signed in as ${esc(session.user.name)} (${esc(session.user.email)}). Share a quiz’s PIN and anyone can play it.</p>
      </div>
      <div class="studio-head__actions">
        <a class="btn btn--primary" href="#/studio/new"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>New quiz</a>
        <button class="btn btn--ghost" data-logout>Log out</button>
      </div>
    </header>
    <div class="studio-list" id="list"><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px"></div></div>`;

  view.querySelector('[data-logout]').addEventListener('click', () => {
    store.session = null; refreshWho(); toast('Logged out'); go('');
  });

  const list = view.querySelector('#list');
  let quizzes;
  try { quizzes = (await api.myQuizzes()).quizzes; }
  catch (err) {
    if (err.status === 401) { refreshWho(); go('login?next=studio'); return; }
    list.innerHTML = `<div class="empty"><h3>Couldn’t load your quizzes</h3><p>${esc(err.message)}</p></div>`;
    return;
  }

  const paint = () => {
    list.innerHTML = quizzes.length ? quizzes.map((q, i) => `
      <article class="srow c-${esc(q.colour)} pop" style="animation-delay:${i * 50}ms" data-id="${esc(q.id)}">
        <span class="srow__swatch" aria-hidden="true"></span>
        <div class="srow__main">
          <h3>${esc(q.title)}</h3>
          <p>${esc(q.topic)} · ${q.count} questions · ${q.seconds}s each${q.updatedAt ? ` · edited ${timeAgo(q.updatedAt)}` : ''}</p>
          <div class="srow__chips">
            <span class="chip ${q.published ? 'chip--good' : 'chip--warn'}">${q.published ? 'Listed on home' : 'Hidden · PIN only'}</span>
            <button class="chip srow__pin" data-copy="${esc(q.pin)}" title="Copy PIN">PIN ${q.pin.slice(0, 3)} ${q.pin.slice(3)} <span>Copy</span></button>
          </div>
        </div>
        <div class="srow__actions">
          <a class="btn btn--sm" href="#/studio/edit/${esc(q.id)}">Edit</a>
          <a class="btn btn--sm btn--ghost" href="#/quiz/${esc(q.id)}">Play</a>
          <a class="btn btn--sm btn--ghost" href="#/board/${esc(q.id)}">Scores</a>
          <button class="btn btn--sm btn--ghost srow__del" data-del>Delete</button>
        </div>
      </article>`).join('')
      : `<div class="empty"><h3>No quizzes yet</h3><p>Make your first one. It takes about five minutes for ten questions.</p><a class="btn btn--primary" href="#/studio/new">Make a quiz</a></div>`;
  };
  paint();

  list.addEventListener('click', async e => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const pin = copy.dataset.copy;
      try { await navigator.clipboard.writeText(`Join my quiz on Quizzy with PIN ${pin}: ${location.origin}/#/join?pin=${pin}`); toast(`PIN ${pin} copied with a join link`); }
      catch { toast(`PIN: ${pin}`); }
      return;
    }
    if (e.target.closest('[data-del]')) {
      const row = e.target.closest('[data-id]');
      const quiz = quizzes.find(q => q.id === row.dataset.id);
      const ok = await confirmBox({ title: `Delete “${quiz.title}”?`, body: 'Its PIN stops working and players can’t open it any more. This can’t be undone.', ok: 'Delete quiz', danger: true });
      if (!ok) return;
      try {
        await api.deleteQuiz(quiz.id);
        quizzes = quizzes.filter(q => q.id !== quiz.id);
        paint();
        toast('Quiz deleted');
      } catch (err) { toast(err.message, 'bad'); }
    }
  });
}
