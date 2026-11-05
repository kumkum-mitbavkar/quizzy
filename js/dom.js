// Tiny helpers. Anything typed by a user goes through esc() before it touches innerHTML.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function toast(message, tone = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 300); }, 2600);
}

// A small promise-based confirm dialog that matches the app instead of window.confirm().
export function confirmBox({ title, body, ok = 'Yes', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = `
      <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title" class="modal__title">${esc(title)}</h2>
        <p class="modal__body">${esc(body)}</p>
        <div class="modal__actions">
          <button class="btn btn--ghost" data-v="0">${esc(cancel)}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-v="1">${esc(ok)}</button>
        </div>
      </div>`;
    const close = v => { wrap.classList.remove('is-in'); document.removeEventListener('keydown', onKey); setTimeout(() => wrap.remove(), 200); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') close(false); };
    wrap.addEventListener('click', e => {
      if (e.target === wrap) return close(false);
      const b = e.target.closest('[data-v]');
      if (b) close(b.dataset.v === '1');
    });
    document.addEventListener('keydown', onKey);
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('is-in'));
    wrap.querySelector('[data-v="1"]').focus();
  });
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

// Counts a number up from 0, used on the results screen.
export function countUp(el, to, ms = 900) {
  if (reducedMotion() || to <= 0) { el.textContent = to; return; }
  const start = performance.now();
  const tick = now => {
    const t = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
