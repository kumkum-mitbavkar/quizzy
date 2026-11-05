// Log in or create a host account (needed only for Quiz Studio; playing never needs one).
import { esc } from '../dom.js';
import { api } from '../api.js';
import { store } from '../store.js';

export function render(view, { go, query, refreshWho }) {
  const next = query.get('next') || 'studio';
  let mode = query.get('mode') === 'signup' ? 'signup' : 'login';

  const paint = () => {
    view.innerHTML = `
      <section class="auth">
        <div class="auth__side">
          <p class="eyebrow">Quiz Studio</p>
          <h1 class="hero__title">Make a quiz in minutes</h1>
          <ul class="auth__points">
            <li>Write questions, add a code snippet, mark the right answer</li>
            <li>Every quiz gets a 6-digit PIN to share with the class</li>
            <li>Players get a timer, scoring and their own leaderboard</li>
          </ul>
          <p class="auth__note">You don’t need an account to play. Only to make quizzes.</p>
        </div>
        <form class="auth__card card" novalidate>
          <div class="auth__tabs" role="tablist">
            <button type="button" role="tab" aria-selected="${mode === 'login'}" class="${mode === 'login' ? 'is-active' : ''}" data-mode="login">Log in</button>
            <button type="button" role="tab" aria-selected="${mode === 'signup'}" class="${mode === 'signup' ? 'is-active' : ''}" data-mode="signup">Create account</button>
          </div>
          ${mode === 'signup' ? `<label class="field"><span>Your name</span><input class="input" name="name" autocomplete="name" placeholder="e.g. Kumkum M" required></label>` : ''}
          <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" placeholder="you@college.edu.in" required></label>
          <label class="field"><span>Password</span><input class="input" name="password" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" placeholder="${mode === 'signup' ? 'At least 6 characters' : 'Your password'}" required></label>
          <p class="form-error" id="auth-err" aria-live="polite"></p>
          <button class="btn btn--primary btn--block" type="submit">${mode === 'signup' ? 'Create account' : 'Log in'}</button>
          ${mode === 'login' ? `
          <div class="demo">
            <div><b>Demo host</b><span>host@quizzy.in · demo1234</span></div>
            <button type="button" class="btn btn--sm" data-demo>Use demo login</button>
          </div>` : ''}
        </form>
      </section>`;
  };
  paint();

  view.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]');
    if (m && m.dataset.mode !== mode) { mode = m.dataset.mode; paint(); view.querySelector('input').focus(); }
    if (e.target.closest('[data-demo]')) {
      view.querySelector('[name=email]').value = 'host@quizzy.in';
      view.querySelector('[name=password]').value = 'demo1234';
      view.querySelector('form').requestSubmit();
    }
  });

  view.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const err = form.querySelector('#auth-err');
    const btn = form.querySelector('[type=submit]');
    if (!data.email || !data.password || (mode === 'signup' && !data.name)) { err.textContent = 'Fill in every field.'; return; }
    btn.disabled = true; err.textContent = '';
    try {
      const res = mode === 'signup' ? await api.signup(data) : await api.login(data.email, data.password);
      store.session = { token: res.token, user: res.user };
      refreshWho();
      go(next);
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
    }
  });
}
