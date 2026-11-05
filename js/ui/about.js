export function render(view) {
  view.innerHTML = `
    <article class="about">
      <h1 class="page-title">About Quizzy</h1>
      <p class="page-sub">Quizzy is a quiz app for quick revision before semester exams and placement tests. Play timed rounds on six BCA subjects, or make a class quiz and share it with a 6-digit PIN.</p>

      <section class="panel about__block">
        <h2 class="editor__h">How scoring works</h2>
        <ul class="about__list">
          <li>A right answer scores 10 points.</li>
          <li>The speed bonus adds up to 5 more. It drops one step for every sixth of the timer that has passed.</li>
          <li>A wrong answer or a timeout scores 0. There are no minus marks.</li>
          <li>Leaderboards keep the top 10. If two scores tie, the faster run ranks higher.</li>
          <li>The server checks every score it receives (it must match the number of correct answers and a sensible time).</li>
        </ul>
      </section>

      <section class="panel about__block">
        <h2 class="editor__h">Keyboard</h2>
        <p><kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd> answer · <kbd>Enter</kbd> goes to the next question</p>
      </section>

      <section class="panel about__block">
        <h2 class="editor__h">Credits</h2>
        <ul class="about__list">
          <li>Player photos marked “Sample” on the leaderboards are generated portraits of fictional people, made for this demo. They are not real students.</li>
          <li>Fonts: Bowlby One, Rubik and JetBrains Mono from Google Fonts (SIL Open Font License).</li>
          <li>Questions and explanations were written for this project.</li>
        </ul>
      </section>
      <p class="about__by">Built by <a href="https://kumkummitbavkar.vercel.app" target="_blank" rel="noopener">Kumkum Mitbavkar</a>, BCA, Gogte College of Commerce, Belagavi.</p>
    </article>`;
}
