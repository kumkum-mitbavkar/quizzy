import { pinMarkup, bindPin } from './pin.js';

export function render(view, { go, query }) {
  const pin = (query.get('pin') || '').replace(/\D/g, '').slice(0, 6);
  view.innerHTML = `
    <section class="join">
      <div class="join__card">
        <p class="eyebrow">Join a class quiz</p>
        <h1 class="hero__title">Enter the PIN</h1>
        <p class="hero__lead">The person who made the quiz can see its PIN in Quiz Studio and share it on WhatsApp or the class board.</p>
        ${pinMarkup(pin.length > 3 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin)}
        <p class="hero__try">Sample PINs: <button class="link-btn link-btn--light" data-pin="482913">482 913</button> SQL Showdown · <button class="link-btn link-btn--light" data-pin="615204">615 204</button> Aptitude Warm-up</p>
      </div>
    </section>`;
  bindPin(view, go);
  const input = view.querySelector('.pin__input');
  view.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => {
    input.value = b.dataset.pin.replace(/(\d{3})(\d{3})/, '$1 $2');
    input.form.requestSubmit();
  }));
  if (pin.length === 6) input.form.requestSubmit();
  else input.focus();
}
