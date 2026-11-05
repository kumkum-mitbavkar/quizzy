// The play screen: one question at a time, a countdown ring, four colour/shape answers.
import { esc, confirmBox, reducedMotion } from '../dom.js';
import { api } from '../api.js';
import { store, lastRun } from '../store.js';
import { buildRound, buildQuizRound, points, summarise, SECONDS_PER_QUESTION } from '../engine.js';
import { subjectByKey, ANSWER_COLOURS, SHAPE_NAMES, shape } from '../catalog.js';

const RING = 2 * Math.PI * 44;

export async function render(view, { params, go }) {
  const [key] = params;
  const subject = subjectByKey(key);
  let meta;
  if (subject) {
    meta = { board: key, title: subject.name, colour: subject.colour, seconds: SECONDS_PER_QUESTION, questions: buildRound(subject), kind: 'subject' };
  } else {
    view.innerHTML = `<div class="skeleton" style="height:420px"></div>`;
    const { quiz } = await api.quiz(key);
    meta = { board: quiz.id, title: quiz.title, colour: quiz.colour, seconds: quiz.seconds, questions: buildQuizRound(quiz), kind: 'quiz', pin: quiz.pin };
  }

  document.body.classList.add('is-playing');
  const { questions, seconds } = meta;
  const answers = [];
  let index = 0, timer = 0, startedAt = 0, locked = false, finished = false;

  view.innerHTML = `
    <section class="play c-${esc(meta.colour)}">
      <div class="play__bar">
        <button class="btn btn--ghost btn--sm play__quit" data-quit aria-label="Quit this round">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z"/></svg><span>Quit</span>
        </button>
        <div class="play__progress">
          <div class="play__label"><span>${esc(meta.title)}</span><span id="p-count"></span></div>
          <div class="bar" role="progressbar" aria-label="Round progress" aria-valuemin="0" aria-valuemax="${questions.length}"><i id="p-bar"></i></div>
        </div>
        <div class="play__score" aria-live="polite"><small>Score</small><b id="p-score">0</b></div>
      </div>

      <div class="play__stage">
        <div class="qbox">
          <div class="timer" aria-hidden="true">
            <svg viewBox="0 0 100 100"><circle class="timer__track" cx="50" cy="50" r="44"/><circle class="timer__ring" id="t-ring" cx="50" cy="50" r="44" stroke-dasharray="${RING}" stroke-dashoffset="0"/></svg>
            <b id="t-num">${seconds}</b>
          </div>
          <p class="qbox__n" id="q-n"></p>
          <h1 class="qbox__q" id="q-text"></h1>
          <pre class="qbox__code" id="q-code" hidden><code></code></pre>
          <p class="sr-only" id="t-sr" aria-live="polite"></p>
        </div>
        <div class="answers" id="answers"></div>
        <div class="feedback" id="feedback" hidden></div>
      </div>
    </section>`;

  const $ = s => view.querySelector(s);

  function show() {
    const q = questions[index];
    locked = false;
    $('#p-count').textContent = `Question ${index + 1} of ${questions.length}`;
    $('#p-bar').style.width = `${(index / questions.length) * 100}%`;
    $('#q-n').textContent = `Question ${index + 1}`;
    $('#q-text').textContent = q.q;
    const code = $('#q-code');
    code.hidden = !q.code;
    code.firstElementChild.textContent = q.code || '';
    $('#feedback').hidden = true;
    const box = $('#answers');
    box.className = `answers answers--${q.options.length}`;
    box.innerHTML = q.options.map((text, i) => `
      <button class="answer c-${ANSWER_COLOURS[i]}" data-i="${i}" style="animation-delay:${i * 50}ms" aria-label="${SHAPE_NAMES[i]}: ${esc(text)}">
        ${shape(i)}<span class="answer__text">${esc(text)}</span><kbd>${i + 1}</kbd>
      </button>`).join('');
    $('.qbox').classList.remove('is-in'); void $('.qbox').offsetWidth; $('.qbox').classList.add('is-in');
    startClock();
  }

  function startClock() {
    cancelAnimationFrame(timer);
    startedAt = performance.now();
    let lastWhole = seconds;
    const ring = $('#t-ring'), num = $('#t-num'), sr = $('#t-sr');
    ring.classList.remove('is-low');
    const tick = now => {
      const left = Math.max(0, seconds - (now - startedAt) / 1000);
      ring.style.strokeDashoffset = String(RING * (1 - left / seconds));
      const whole = Math.ceil(left);
      if (whole !== lastWhole) {
        lastWhole = whole;
        num.textContent = whole;
        if (whole <= 5) ring.classList.add('is-low');
        if (whole === 10 || whole === 5) sr.textContent = `${whole} seconds left`;
      }
      if (left <= 0) return answer(-1);
      timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  }

  function answer(choice) {
    if (locked || finished) return;
    locked = true;
    cancelAnimationFrame(timer);
    const q = questions[index];
    const taken = Math.min(seconds, (performance.now() - startedAt) / 1000);
    const left = seconds - taken;
    const correct = choice === q.answer;
    const got = points(correct, choice === -1 ? 0 : left, seconds);
    answers.push({ question: q, choice, correct, points: got, taken: Math.round(taken * 10) / 10 });

    view.querySelectorAll('.answer').forEach(b => {
      const i = Number(b.dataset.i);
      b.disabled = true;
      if (i === q.answer) b.classList.add('is-right');
      else if (i === choice) b.classList.add('is-wrong');
      else b.classList.add('is-dim');
    });
    $('#p-score').textContent = summarise(answers).score;
    $('#p-bar').style.width = `${((index + 1) / questions.length) * 100}%`;

    const last = index === questions.length - 1;
    const fb = $('#feedback');
    const bonus = got - 10;
    fb.className = `feedback ${correct ? 'feedback--good' : 'feedback--bad'}`;
    fb.innerHTML = `
      <div class="feedback__head">
        <b>${correct ? 'Correct!' : choice === -1 ? 'Time’s up' : 'Not quite'}</b>
        ${correct ? `<span class="chip chip--good">+${got}${bonus > 0 ? ` · speed bonus +${bonus}` : ''}</span>` : `<span class="feedback__ans">Answer: ${esc(q.options[q.answer])}</span>`}
      </div>
      ${q.why ? `<p class="feedback__why">${esc(q.why)}</p>` : ''}
      <button class="btn ${correct ? 'btn--jade' : 'btn--ink'} feedback__next" data-next>${last ? 'See results' : 'Next question'} <kbd>Enter</kbd></button>`;
    fb.hidden = false;
    const next = fb.querySelector('[data-next]');
    next.focus({ preventScroll: true });
    if (window.innerWidth < 760 && !reducedMotion()) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    if (!locked) return;
    if (index < questions.length - 1) { index++; show(); window.scrollTo({ top: 0 }); return; }
    finish();
  }

  function finish() {
    finished = true;
    const summary = summarise(answers);
    const run = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      board: meta.board, title: meta.title, colour: meta.colour, kind: meta.kind, pin: meta.pin,
      at: new Date().toISOString(), ...summary,
    };
    const improved = store.record({ id: run.id, board: run.board, title: run.title, at: run.at, score: run.score, correct: run.correct, total: run.total, accuracy: run.accuracy, seconds: run.seconds });
    lastRun.set({ ...run, improved, answers });
    go('results');
  }

  view.addEventListener('click', async e => {
    const b = e.target.closest('.answer');
    if (b) return answer(Number(b.dataset.i));
    if (e.target.closest('[data-next]')) return next();
    if (e.target.closest('[data-quit]')) {
      // the clock keeps running behind the dialog, so quitting can't be used to stop time
      const ok = await confirmBox({ title: 'Quit this round?', body: 'Your answers so far won’t be saved.', ok: 'Quit round', cancel: 'Keep playing', danger: true });
      if (ok) { finished = true; cancelAnimationFrame(timer); go(meta.kind === 'quiz' ? `quiz/${meta.board}` : ''); }
    }
  });

  const onKey = e => {
    if (document.querySelector('.modal')) return;
    const n = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    if (n !== undefined && !locked && n < questions[index].options.length) { e.preventDefault(); answer(n); }
    else if (e.key === 'Enter' && locked && !e.target.closest('[data-next]')) { e.preventDefault(); next(); }
  };
  document.addEventListener('keydown', onKey);

  show();

  return () => {
    finished = true;
    cancelAnimationFrame(timer);
    document.removeEventListener('keydown', onKey);
  };
}
