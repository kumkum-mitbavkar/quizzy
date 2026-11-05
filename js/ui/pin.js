// The 6-digit PIN box used on the home hero and the Join page.
import { esc } from '../dom.js';
import { api } from '../api.js';

export function pinMarkup(value = '') {
  return `
    <form class="pin" novalidate>
      <label class="pin__label" for="pin-input">Quiz PIN</label>
      <div class="pin__row">
        <input id="pin-input" class="pin__input" inputmode="numeric" autocomplete="off" maxlength="7" placeholder="000 000" value="${esc(value)}" aria-describedby="pin-msg">
        <button class="btn btn--sun pin__go" type="submit">Join quiz</button>
      </div>
      <p class="pin__msg" id="pin-msg" aria-live="polite"></p>
    </form>`;
}

export function bindPin(root, go) {
  const form = root.querySelector('.pin');
  const input = form.querySelector('.pin__input');
  const msg = form.querySelector('.pin__msg');
  const btn = form.querySelector('.pin__go');

  // show the PIN as "482 913" while typing
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
    msg.textContent = '';
    form.classList.remove('is-bad');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const pin = input.value.replace(/\D/g, '');
    if (pin.length !== 6) {
      form.classList.add('is-bad');
      msg.textContent = 'A quiz PIN has 6 digits.';
      input.focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Finding…';
    try {
      const { quiz } = await api.byPin(pin);
      go(`quiz/${quiz.id}`);
    } catch (err) {
      form.classList.add('is-bad');
      msg.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Join quiz';
    }
  });
}
