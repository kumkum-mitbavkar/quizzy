// Create or edit a quiz. The whole form lives in one `draft` object; structural changes
// (add, remove, move) re-render the list, typing just updates the draft.
import { esc, toast, confirmBox } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';
import { ANSWER_COLOURS, SHAPE_NAMES, shape } from '../catalog.js';

const COLOURS = [['tomato', 'Tomato'], ['azure', 'Blue'], ['sun', 'Mustard'], ['jade', 'Green'], ['rose', 'Rose'], ['teal', 'Teal']];
const SECONDS = [10, 20, 30, 45, 60];
const blankQuestion = () => ({ q: '', code: '', options: ['', '', '', ''], answer: 0, why: '', showCode: false });

export async function render(view, { params, go }) {
  if (!store.session) { go(`login?next=${encodeURIComponent(location.hash.slice(2))}`); return; }
  const editingId = params[0] || null;

  let draft;
  if (editingId) {
    view.innerHTML = `<div class="skeleton" style="height:480px"></div>`;
    const [{ quiz }, { quizzes: mine }] = await Promise.all([api.quiz(editingId), api.myQuizzes()]);
    if (!mine.some(q => q.id === editingId)) {
      view.innerHTML = `<div class="empty"><h3>This isn’t your quiz</h3><p>Only the person who made it can edit it. You can still play it.</p><a class="btn btn--primary" href="#/quiz/${esc(editingId)}">Play it</a></div>`;
      return;
    }
    draft = {
      title: quiz.title, topic: quiz.topic, description: quiz.description || '', colour: quiz.colour, seconds: quiz.seconds,
      shuffle: !!quiz.shuffle, published: quiz.published !== false,
      questions: quiz.questions.map(q => ({ q: q.q, code: q.code || '', why: q.why || '', answer: q.answer, showCode: !!q.code, options: [...q.options, '', '', ''].slice(0, 4) })),
      pin: quiz.pin,
    };
  } else {
    draft = { title: '', topic: '', description: '', colour: 'azure', seconds: 20, shuffle: true, published: true, questions: [blankQuestion(), blankQuestion(), blankQuestion()] };
  }
  let dirty = false;

  view.innerHTML = `
    <form class="editor" novalidate>
      <header class="editor__head">
        <div>
          <a class="back" href="#/studio">← Your quizzes</a>
          <h1 class="page-title">${editingId ? 'Edit quiz' : 'New quiz'}</h1>
          ${draft.pin ? `<p class="page-sub">PIN ${draft.pin.slice(0, 3)} ${draft.pin.slice(3)} stays the same after you save.</p>` : '<p class="page-sub">A 6-digit PIN is created when you save.</p>'}
        </div>
      </header>

      <div class="editor__grid">
        <section class="panel editor__details">
          <h2 class="editor__h">Details</h2>
          <label class="field"><span>Title</span><input class="input" data-k="title" maxlength="60" placeholder="e.g. Java OOP Basics" value="${esc(draft.title)}"></label>
          <label class="field"><span>Topic</span><input class="input" data-k="topic" maxlength="24" placeholder="e.g. Java" value="${esc(draft.topic)}"><small>Shown as a tag on the quiz card.</small></label>
          <label class="field"><span>Description <small>(optional)</small></span><textarea class="textarea" data-k="description" maxlength="160" rows="2" placeholder="One line on what it covers">${esc(draft.description)}</textarea></label>
          <div class="field"><span>Card colour</span>
            <div class="swatches" role="radiogroup" aria-label="Card colour">
              ${COLOURS.map(([c, label]) => `<label class="swatch c-${c}" title="${label}"><input type="radio" name="colour" value="${c}" ${draft.colour === c ? 'checked' : ''} aria-label="${label}"><i></i></label>`).join('')}
            </div>
          </div>
          <div class="field"><span>Time per question</span>
            <div class="seg">${SECONDS.map(s => `<label><input type="radio" name="seconds" value="${s}" ${draft.seconds === s ? 'checked' : ''}><span>${s}s</span></label>`).join('')}</div>
          </div>
          <label class="toggle"><span><b>Shuffle questions</b><small>Each player gets a different order</small></span><input type="checkbox" data-k="shuffle" ${draft.shuffle ? 'checked' : ''}></label>
          <label class="toggle"><span><b>List on the home page</b><small>Off: only people with the PIN can find it</small></span><input type="checkbox" data-k="published" ${draft.published ? 'checked' : ''}></label>
        </section>

        <section class="editor__questions">
          <div class="editor__qhead"><h2 class="editor__h">Questions <span id="q-count" class="chip"></span></h2><small>Fill 2 to 4 options and tap the shape of the right one.</small></div>
          <ol class="qlist" id="qlist"></ol>
          <button type="button" class="btn btn--ghost btn--block add-q" data-add>+ Add a question</button>
        </section>
      </div>

      <div class="savebar">
        <p class="form-error" id="ed-err" aria-live="polite"></p>
        <button type="button" class="btn btn--ghost" data-cancel>Cancel</button>
        <button type="submit" class="btn btn--primary">${editingId ? 'Save changes' : 'Save quiz'}</button>
      </div>
    </form>`;

  const form = view.querySelector('form');
  const qlist = view.querySelector('#qlist');

  const paintQuestions = () => {
    view.querySelector('#q-count').textContent = draft.questions.length;
    qlist.innerHTML = draft.questions.map((q, qi) => `
      <li class="qedit" data-qi="${qi}">
        <div class="qedit__top">
          <b>Question ${qi + 1}</b>
          <div class="qedit__tools">
            <button type="button" class="icon-btn" data-move="-1" ${qi === 0 ? 'disabled' : ''} aria-label="Move question ${qi + 1} up">↑</button>
            <button type="button" class="icon-btn" data-move="1" ${qi === draft.questions.length - 1 ? 'disabled' : ''} aria-label="Move question ${qi + 1} down">↓</button>
            <button type="button" class="icon-btn" data-dup aria-label="Duplicate question ${qi + 1}">⧉</button>
            <button type="button" class="icon-btn icon-btn--bad" data-remove aria-label="Delete question ${qi + 1}">✕</button>
          </div>
        </div>
        <textarea class="textarea" rows="2" data-f="q" maxlength="220" placeholder="Type the question">${esc(q.q)}</textarea>
        ${q.showCode
          ? `<label class="field"><span>Code snippet <button type="button" class="link-btn" data-code>remove</button></span><textarea class="textarea textarea--code" rows="3" data-f="code" maxlength="400" spellcheck="false" placeholder="printf(&quot;%d&quot;, 5 / 2);">${esc(q.code)}</textarea></label>`
          : `<button type="button" class="link-btn qedit__codebtn" data-code>+ Add a code snippet</button>`}
        <div class="opts">
          ${q.options.map((o, oi) => `
            <div class="opt c-${ANSWER_COLOURS[oi]} ${q.answer === oi ? 'is-answer' : ''}">
              <button type="button" class="opt__mark" data-answer="${oi}" aria-pressed="${q.answer === oi}" aria-label="Mark ${SHAPE_NAMES[oi]} as the right answer">${shape(oi)}</button>
              <input class="input" data-opt="${oi}" maxlength="90" placeholder="Option ${oi + 1}${oi > 1 ? ' (optional)' : ''}" value="${esc(o)}">
              ${q.answer === oi ? '<span class="opt__tag">Right answer</span>' : ''}
            </div>`).join('')}
        </div>
        <label class="field"><span>Why it’s right <small>(optional, shown after answering)</small></span><input class="input" data-f="why" maxlength="220" placeholder="One line that explains the answer" value="${esc(q.why)}"></label>
      </li>`).join('');
  };
  paintQuestions();

  form.addEventListener('input', e => {
    dirty = true;
    view.querySelector('#ed-err').textContent = '';
    const t = e.target;
    if (t.dataset.k) draft[t.dataset.k] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.name === 'colour') draft.colour = t.value;
    if (t.name === 'seconds') draft.seconds = Number(t.value);
    const li = t.closest('[data-qi]');
    if (!li) return;
    const q = draft.questions[Number(li.dataset.qi)];
    if (t.dataset.f) q[t.dataset.f] = t.value;
    if (t.dataset.opt) q.options[Number(t.dataset.opt)] = t.value;
    t.classList.remove('is-bad');
  });

  form.addEventListener('click', async e => {
    const li = e.target.closest('[data-qi]');
    const qi = li ? Number(li.dataset.qi) : -1;
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.add !== undefined) {
      if (draft.questions.length >= 30) return toast('A quiz can have up to 30 questions.', 'bad');
      draft.questions.push(blankQuestion()); dirty = true; paintQuestions();
      const added = qlist.lastElementChild;
      added.classList.add('pop'); added.querySelector('textarea').focus();
      return;
    }
    if (b.dataset.cancel !== undefined) {
      if (!dirty || await confirmBox({ title: 'Leave without saving?', body: 'Your changes to this quiz will be lost.', ok: 'Leave', cancel: 'Keep editing', danger: true })) go('studio');
      return;
    }
    if (qi < 0) return;
    const q = draft.questions[qi];
    if (b.dataset.answer !== undefined) { q.answer = Number(b.dataset.answer); dirty = true; paintQuestions(); return; }
    if (b.dataset.code !== undefined) { q.showCode = !q.showCode; if (!q.showCode) q.code = ''; dirty = true; paintQuestions(); if (q.showCode) qlist.children[qi].querySelector('[data-f=code]').focus(); return; }
    if (b.dataset.move) {
      const to = qi + Number(b.dataset.move);
      [draft.questions[qi], draft.questions[to]] = [draft.questions[to], draft.questions[qi]];
      dirty = true; paintQuestions(); return;
    }
    if (b.dataset.dup !== undefined) {
      if (draft.questions.length >= 30) return toast('A quiz can have up to 30 questions.', 'bad');
      draft.questions.splice(qi + 1, 0, { ...q, options: [...q.options] }); dirty = true; paintQuestions(); return;
    }
    if (b.dataset.remove !== undefined) {
      if (draft.questions.length <= 3) return toast('A quiz needs at least 3 questions.', 'bad');
      const filled = q.q.trim() || q.options.some(o => o.trim());
      if (filled && !(await confirmBox({ title: `Delete question ${qi + 1}?`, body: q.q || 'This question has text in it.', ok: 'Delete', danger: true }))) return;
      draft.questions.splice(qi, 1); dirty = true; paintQuestions();
    }
  });

  // Same checks as the server, done first so the message can point at the exact box.
  function check() {
    const bad = (el, msg) => ({ el, msg });
    if (draft.title.trim().length < 3) return bad(form.querySelector('[data-k=title]'), 'Give the quiz a title (at least 3 characters).');
    for (const [qi, q] of draft.questions.entries()) {
      const li = qlist.children[qi];
      if (q.q.trim().length < 3) return bad(li.querySelector('[data-f=q]'), `Question ${qi + 1} needs some text.`);
      const filled = q.options.map(o => o.trim()).filter(Boolean);
      if (filled.length < 2) return bad(li.querySelector(`[data-opt="${q.options[0].trim() ? 1 : 0}"]`), `Question ${qi + 1} needs at least 2 answer options.`);
      if (!q.options[q.answer].trim()) return bad(li.querySelector(`[data-opt="${q.answer}"]`), `The right answer for question ${qi + 1} is empty. Type it or pick another shape.`);
      if (new Set(filled.map(o => o.toLowerCase())).size !== filled.length) return bad(li.querySelector('[data-opt="0"]'), `Question ${qi + 1} has the same option twice.`);
    }
    return null;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = view.querySelector('#ed-err');
    const problem = check();
    if (problem) {
      err.textContent = problem.msg;
      problem.el.classList.add('is-bad');
      problem.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      problem.el.focus({ preventScroll: true });
      return;
    }
    err.textContent = '';
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    const payload = { ...draft, questions: draft.questions.map(({ showCode, ...q }) => q) };
    try {
      const { quiz } = editingId ? await api.updateQuiz(editingId, payload) : await api.createQuiz(payload);
      dirty = false;
      toast(editingId ? 'Changes saved' : `Saved. PIN ${quiz.pin}`);
      go('studio');
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false; btn.textContent = editingId ? 'Save changes' : 'Save quiz';
      if (ex.status === 401) go(`login?next=${encodeURIComponent(location.hash.slice(2))}`);
    }
  });

  const beforeUnload = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  return () => window.removeEventListener('beforeunload', beforeUnload);
}
