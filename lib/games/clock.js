import { $, $$, rand, pick, shuffle, sleep, svgEl, tween, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback, burst } from '../common';

export const markup = `
<nav class="tabs">
  <button class="tab active" data-tab="case">🕵️ Clock Detective</button>
  <button class="tab" data-tab="read">⏰ What time is it?</button>
  <button class="tab" data-tab="play">🖐️ Play with the clock</button>
</nav>
<main>
  <section class="panel" data-panel="case">
    <div class="toolbar">
      <span class="label">Times</span>
      <div class="seg" id="cdLevel"><button data-v="0">o'clock</button><button data-v="30" class="sel">half past</button><button data-v="15">quarters</button><button data-v="5">5 minutes</button></div>
      <span class="spacer"></span>
      <span class="score" id="cdScore">🔎 0 cases solved</span>
    </div>
    <div class="casefile">
      <div class="story" id="cdStory"></div>
      <div class="cams" id="cdCams"></div>
    </div>
    <div class="clockwrap">
      <div class="clockbox" id="cdClock"></div>
      <div class="clockside">
        <div class="task" id="cdTask"></div>
        <div class="handbtns" id="cdBtns"></div>
        <button class="btn green big" id="cdCheck">📷 Check camera</button>
        <div class="feedback" id="cdFb"></div>
        <button class="btn big" id="cdNext" hidden>New case ▶</button>
      </div>
    </div>
  </section>

  <section class="panel" data-panel="read" hidden>
    <div class="toolbar">
      <span class="label">Times</span>
      <div class="seg" id="rdLevel"><button data-v="0">o'clock</button><button data-v="30" class="sel">half past</button><button data-v="15">quarters</button><button data-v="5">5 minutes</button></div>
      <span class="spacer"></span>
      <span class="score" id="rdScore">⭐ 0 / 0</span>
    </div>
    <div class="prompt">What time does the clock say?</div>
    <div class="center"><div class="clockbox small" id="rdClock"></div></div>
    <div class="choices" id="rdChoices"></div>
    <div class="feedback" id="rdFb"></div>
    <div class="btnrow"><button class="btn big" id="rdNext">Next ▶</button></div>
  </section>

  <section class="panel" data-panel="play" hidden>
    <div class="clockwrap">
      <div class="clockbox" id="plClock"></div>
      <div class="clockside">
        <div class="timeread"><div class="digital" id="plDigital">12:00</div><div class="words" id="plWords">12 o'clock</div><div class="dayemoji" id="plDay"></div></div>
        <div class="handbtns" id="plBtns"></div>
        <button class="btn purple" id="plRand">🎲 Random time</button>
        <div class="hint-line">Drag the hands, or use the buttons. Watch the short hour hand move too!</div>
      </div>
    </div>
  </section>
</main>`;

export function init() {
  const C = 150;
  const hourOf = T => Math.floor(T / 60) % 12 || 12;
  const nextHour = T => (Math.floor(T / 60) + 1) % 12 || 12;
  function words(T) {
    const h = hourOf(T), m = T % 60, nh = nextHour(T);
    if (m === 0) return `${h} o'clock`;
    if (m === 30) return `half past ${h}`;
    if (m === 15) return `quarter past ${h}`;
    if (m === 45) return `quarter to ${nh}`;
    if (m < 30) return `${m} minutes past ${h}`;
    return `${60 - m} minutes to ${nh}`;
  }
  const digital = T => `${hourOf(T)}:${String(T % 60).padStart(2, '0')}`;
  function randomTime(level) {
    const step = +level;
    const mins = step === 0 ? [0] : step === 30 ? [0, 30] : step === 15 ? [0, 15, 30, 45] : Array.from({ length: 12 }, (_, i) => i * 5);
    return rand(0, 11) * 60 + pick(mins);
  }

  // ---------- an analogue clock with draggable hands ----------
  function Clock(host, { draggable = true, onChange = () => {} } = {}) {
    let T = 0, locked = !draggable;
    const svg = svgEl('svg', { viewBox: '0 0 300 300', class: 'clock' });
    host.innerHTML = ''; host.appendChild(svg);
    svgEl('circle', { cx: C, cy: C, r: 146, fill: '#ffd166' }, svg);
    svgEl('circle', { cx: C, cy: C, r: 134, fill: '#fff', stroke: '#073b4c', 'stroke-width': 6 }, svg);
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180, big = i % 5 === 0;
      svgEl('line', { x1: C + Math.sin(a) * (big ? 112 : 120), y1: C - Math.cos(a) * (big ? 112 : 120), x2: C + Math.sin(a) * 127, y2: C - Math.cos(a) * 127, stroke: big ? '#073b4c' : '#9aa5b1', 'stroke-width': big ? 4 : 2, 'stroke-linecap': 'round' }, svg);
    }
    for (let n = 1; n <= 12; n++) {
      const a = n * 30 * Math.PI / 180;
      svgEl('text', { x: C + Math.sin(a) * 92, y: C - Math.cos(a) * 92 + 10, 'text-anchor': 'middle', 'font-size': 28, fill: '#073b4c' }, svg).textContent = n;
    }
    const hourG = svgEl('g', { class: 'hand hourhand' }, svg);
    svgEl('line', { x1: C, y1: C + 14, x2: C, y2: C - 62, stroke: '#073b4c', 'stroke-width': 12, 'stroke-linecap': 'round' }, hourG);
    const hourHit = svgEl('line', { x1: C, y1: C, x2: C, y2: C - 70, stroke: 'transparent', 'stroke-width': 34 }, hourG);
    const minG = svgEl('g', { class: 'hand minhand' }, svg);
    svgEl('line', { x1: C, y1: C + 18, x2: C, y2: C - 108, stroke: '#ef476f', 'stroke-width': 7, 'stroke-linecap': 'round' }, minG);
    const minHit = svgEl('line', { x1: C, y1: C - 30, x2: C, y2: C - 116, stroke: 'transparent', 'stroke-width': 34 }, minG);
    svgEl('circle', { cx: C, cy: C, r: 10, fill: '#073b4c' }, svg);
    svgEl('circle', { cx: C, cy: C, r: 4, fill: '#ffd166' }, svg);

    function paint(t) {
      minG.setAttribute('transform', `rotate(${(t % 60) * 6} ${C} ${C})`);
      hourG.setAttribute('transform', `rotate(${(t / 60) * 30} ${C} ${C})`);
    }
    function set(t, animate = false) {
      t = ((t % 720) + 720) % 720;
      if (!animate) { T = t; paint(T); onChange(T); return Promise.resolve(); }
      const from = T; let to = t; if (to < from) to += 720;
      return tween(700, k => paint(from + (to - from) * k)).then(() => { T = t; paint(T); onChange(T); });
    }
    // dragging
    let drag = null;
    const angleAt = e => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return (Math.atan2(p.x - C, -(p.y - C)) * 180 / Math.PI + 360) % 360;
    };
    const start = which => e => { if (locked) return; drag = which; svg.setPointerCapture(e.pointerId); svg.classList.add('dragging'); e.preventDefault(); };
    minHit.addEventListener('pointerdown', start('m'));
    hourHit.addEventListener('pointerdown', start('h'));
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const a = angleAt(e);
      if (drag === 'm') {
        const curM = T % 60, newM = Math.round(a / 6 / 5) * 5 % 60;
        let dm = newM - curM; if (dm < -30) dm += 60; if (dm > 30) dm -= 60;
        if (dm) { set(T + dm); Sound.tone(900, .03, 'square', 0, .03); }
      } else {
        const newH = Math.floor(a / 30) % 12, t = newH * 60 + T % 60;
        if (t !== T) { set(t); Sound.tone(600, .04, 'square', 0, .04); }
      }
    });
    const end = () => { drag = null; svg.classList.remove('dragging'); };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    paint(0);
    return { set, get T() { return T; }, lock(v) { locked = v; svg.classList.toggle('locked', v); } };
  }
  function handButtons(host, clock) {
    host.innerHTML = '';
    [['−1 hour', -60], ['+1 hour', 60], ['−5 min', -5], ['+5 min', 5]].forEach(([t, d]) => {
      const b = document.createElement('button'); b.className = 'btn alt'; b.textContent = t;
      b.onclick = () => { clock.set(clock.T + d); Sound.pop(2); };
      host.appendChild(b);
    });
  }

  // ---------- Clock Detective ----------
  (() => {
    const ITEMS = ['🍪 cookies', '🎂 birthday cake', '🧸 teddy bear', '👑 golden crown', '⚽ football', '🍌 bananas', '🍯 honey pot', '🎁 present'];
    const SUSPECTS = ['🐶 Dog', '🐱 Cat', '🦊 Fox', '🐰 Rabbit', '🐻 Bear', '🐵 Monkey', '🐷 Pig', '🦝 Raccoon', '🐔 Hen', '🐭 Mouse'];
    const DOING = ['fast asleep 💤', 'reading a book 📖', 'painting a picture 🎨', 'skipping 🪢', 'eating soup 🍲', 'watering plants 🪴', 'playing the drums 🥁', 'having a bath 🛁'];
    let level = '30', kase, step, solved = 0, locked = false;
    const clock = Clock($('#cdClock'));
    handButtons($('#cdBtns'), clock);
    function newCase() {
      const item = pick(ITEMS), sus = shuffle(SUSPECTS).slice(0, 3), doing = shuffle(DOING);
      const times = new Set(); while (times.size < 3) times.add(randomTime(level));
      const t = [...times].sort((a, b) => a - b);
      kase = { item, sus, doing, t };
      step = 0; locked = false;
      $('#cdStory').innerHTML = `<b>Oh no!</b> The ${item} went missing! Three suspects were near the scene: ${sus.join(', ')}. Check the security camera at each time to find out who did it!`;
      const cams = $('#cdCams'); cams.innerHTML = '';
      t.forEach((time, i) => {
        const c = document.createElement('div'); c.className = 'cam'; c.id = 'cam' + i;
        c.innerHTML = `<div class="camtime">📷 ${words(time)}</div><div class="camview">❓</div>`;
        cams.appendChild(c);
      });
      $('#cdNext').hidden = true; $('#cdCheck').hidden = false;
      clock.lock(false); clock.set((t[0] + 180) % 720); // start away from the first answer
      setFeedback($('#cdFb'), '');
      showTask();
    }
    function showTask() {
      $$('.cam').forEach((c, i) => c.classList.toggle('current', i === step));
      $('#cdTask').innerHTML = `Camera ${step + 1}: set the clock to <b>${words(kase.t[step])}</b>`;
      restartAnim($('#cdTask'), 'bump');
    }
    $('#cdCheck').onclick = async () => {
      if (locked) return;
      const want = kase.t[step];
      if (clock.T % 720 !== want % 720) {
        Sound.bad(); restartAnim($('#cdClock'), 'shake');
        setFeedback($('#cdFb'), `The camera shows ${words(clock.T)}. We need ${words(want)}.`, 'bad');
        return;
      }
      locked = true; Sound.good(); setFeedback($('#cdFb'), '');
      const cam = $('#cam' + step), view = $('.camview', cam);
      cam.classList.add('on');
      const last = step === 2;
      view.innerHTML = last
        ? `<span class="culprit">${kase.sus[2].split(' ')[0]}</span><small>${kase.sus[2]} sneaking off with the ${kase.item}!</small>`
        : `<span>${kase.sus[step].split(' ')[0]}</span><small>${kase.sus[step]} was ${kase.doing[step]}</small>`;
      restartAnim(view, 'reveal');
      await sleep(900);
      if (last) {
        solved++; $('#cdScore').textContent = `🔎 ${solved} case${solved > 1 ? 's' : ''} solved`;
        $('#cdTask').innerHTML = `<span class="stamp">CASE CLOSED ✅</span>`;
        setFeedback($('#cdFb'), `You caught ${kase.sus[2]}! Super detective! 🕵️`, 'good');
        Sound.win(); confetti();
        $('#cdCheck').hidden = true; $('#cdNext').hidden = false; clock.lock(true);
      } else { step++; locked = false; showTask(); }
    };
    $('#cdNext').onclick = () => { Sound.click(); newCase(); };
    makeSeg($('#cdLevel'), v => { level = v; newCase(); });
    newCase();
  })();

  // ---------- What time is it? ----------
  (() => {
    let level = '30', right = 0, total = 0, last = -1;
    const clock = Clock($('#rdClock'), { draggable: false });
    function round() {
      let T; do { T = randomTime(level); } while (T === last); last = T;
      clock.set(T, true);
      setFeedback($('#rdFb'), '');
      const opts = new Set([words(T)]);
      const tries = [T + 60, T - 60, (T % 60) * 12 + Math.floor(T / 60) % 12 * 5 /* hands swapped */, T + 30, T - 30, T + 15, T + 300];
      shuffle(tries).forEach(x => { if (opts.size < 4) opts.add(words(((x % 720) + 720) % 720)); });
      while (opts.size < 4) opts.add(words(randomTime(level)));
      renderChoices($('#rdChoices'), shuffle([...opts]), words(T), ok => {
        total++; if (ok) right++;
        $('#rdScore').textContent = `⭐ ${right} / ${total}`;
        setFeedback($('#rdFb'), ok ? `Yes! It's ${words(T)} (${digital(T)}). ⏰` : `It's ${words(T)} (${digital(T)}). Look at the short hour hand first!`, ok ? 'good' : 'bad');
      });
      $$('#rdChoices .choice').forEach(b => b.classList.add('txt'));
    }
    makeSeg($('#rdLevel'), v => { level = v; round(); });
    $('#rdNext').onclick = () => { Sound.click(); round(); };
    round();
  })();

  // ---------- Play with the clock ----------
  (() => {
    const ACTIVITIES = { 7: '🥣 breakfast time', 8: '🎒 off to school', 12: '🍱 lunch time', 3: '🏡 home time', 6: '🍝 dinner time', 9: '😴 bedtime story' };
    const clock = Clock($('#plClock'), {
      onChange: T => {
        $('#plDigital').textContent = digital(T);
        $('#plWords').textContent = words(T);
        $('#plDay').textContent = T % 60 === 0 && ACTIVITIES[hourOf(T)] ? ACTIVITIES[hourOf(T)] : '';
      }
    });
    handButtons($('#plBtns'), clock);
    $('#plRand').onclick = () => { Sound.click(); clock.set(randomTime('5'), true); };
    clock.set(0);
  })();
}
