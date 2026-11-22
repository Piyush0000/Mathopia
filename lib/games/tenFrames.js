import { $, $$, rand, pick, shuffle, sleep, clamp, h, svgEl, numberChoices, tween, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback } from '../common';

// Static, trusted markup for this tool (rendered by the page component)
export const markup = `<nav class="tabs">
  <button class="tab active" data-tab="explore">Explore</button>
  <button class="tab" data-tab="flash">Flash &amp; Say</button>
  <button class="tab" data-tab="make10">Make Ten</button>
  <button class="tab" data-tab="showme">Show Me!</button>
</nav>
<main>
  <!-- EXPLORE -->
  <section class="panel" data-panel="explore">
    <div class="toolbar">
      <span class="label">Frames</span>
      <div class="seg" id="exFrames"><button data-v="10" class="sel">1</button><button data-v="20">2</button></div>
      <span class="label">Counter</span>
      <div class="seg colorpick" id="exColor"><button data-v="red" class="sel"><span class="dot red"></span></button><button data-v="yellow"><span class="dot yellow"></span></button><button data-v="blue"><span class="dot blue"></span></button></div>
      <span class="spacer"></span>
      <button class="btn green" id="exAdd">＋ Add one</button>
      <button class="btn orange" id="exTake">－ Take one</button>
      <button class="btn purple" id="exRand">🎲 Random</button>
      <button class="btn alt" id="exClear">Clear</button>
    </div>
    <div class="toolbar">
      <button class="btn alt" id="exCover">🙈 Cover frame</button>
      <button class="btn alt" id="exHide">Hide number</button>
      <span class="label">Tap a box to add or remove a counter.</span>
    </div>
    <div class="frames" id="exHost"></div>
    <div class="bignum" id="exNum">0</div>
    <div class="sub" id="exSub"></div>
  </section>

  <!-- FLASH -->
  <section class="panel" data-panel="flash" hidden>
    <div class="toolbar">
      <span class="label">Numbers to</span>
      <div class="seg" id="flMax"><button data-v="10" class="sel">10</button><button data-v="20">20</button></div>
      <span class="label">Show for</span>
      <div class="seg" id="flTime"><button data-v="1000">1 s</button><button data-v="2000" class="sel">2 s</button><button data-v="3000">3 s</button></div>
      <span class="label">Layout</span>
      <div class="seg" id="flLayout"><button data-v="order" class="sel">In order</button><button data-v="scatter">Scattered</button></div>
      <span class="spacer"></span>
      <span class="score" id="flScore">⭐ 0 / 0</span>
    </div>
    <div class="prompt" id="flPrompt">Get ready… how many counters will you see?</div>
    <div class="frames" id="flHost"></div>
    <div class="center"><button class="btn big" id="flGo">⚡ Flash!</button></div>
    <div class="choices" id="flChoices"></div>
    <div class="feedback" id="flFb"></div>
  </section>

  <!-- MAKE TEN -->
  <section class="panel" data-panel="make10" hidden>
    <div class="toolbar">
      <span class="label">Make</span>
      <div class="seg" id="mtTarget"><button data-v="10" class="sel">10</button><button data-v="20">20</button></div>
      <span class="spacer"></span>
      <span class="score" id="mtScore">⭐ 0</span>
    </div>
    <div class="prompt" id="mtPrompt"></div>
    <div class="frames" id="mtHost"></div>
    <div class="choices" id="mtChoices"></div>
    <div class="equation" id="mtEq"></div>
    <div class="center"><button class="btn big" id="mtNext">Next ▶</button></div>
  </section>

  <!-- SHOW ME -->
  <section class="panel" data-panel="showme" hidden>
    <div class="toolbar">
      <span class="label">Numbers to</span>
      <div class="seg" id="smMax"><button data-v="10" class="sel">10</button><button data-v="20">20</button></div>
      <span class="spacer"></span>
      <span class="score" id="smScore">⭐ 0</span>
    </div>
    <div class="prompt" id="smPrompt"></div>
    <div class="frames" id="smHost"></div>
    <div class="feedback" id="smFb"></div>
    <div class="center" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button class="btn alt" id="smClear">Clear</button>
      <button class="btn green big" id="smCheck">✔ Check</button>
      <button class="btn big" id="smNext">Next ▶</button>
    </div>
  </section>
</main>`;

// Game engine: wires up the markup above. Call once after it is mounted.
export function init() {

// ---------- reusable ten-frame component ----------
function FrameSet(host, onClick) {
  let cells = [], els = [];
  return {
    build(n) {
      host.innerHTML = ''; host.classList.toggle('two', n > 10);
      cells = Array(n).fill(null); els = [];
      for (let f = 0; f < n / 10; f++) {
        const tf = h('div', 'tf');
        for (let i = 0; i < 10; i++) {
          const idx = f * 10 + i, c = h('div', 'cell');
          if (onClick) c.onclick = () => onClick(idx); else c.classList.add('static');
          tf.appendChild(c); els.push(c);
        }
        host.appendChild(tf);
      }
    },
    set(idx, color) {
      if (cells[idx] === color) return;
      cells[idx] = color; els[idx].innerHTML = '';
      if (color) els[idx].appendChild(h('div', 'counter ' + color));
    },
    get cells() { return cells; },
    get size() { return cells.length; },
    count(color) { return cells.filter(c => color ? c === color : c).length; },
    cover(on) {
      $$('.tf', host).forEach(tf => {
        let cv = $('.cover', tf);
        if (on && !cv) { cv = h('div', 'cover', '?'); tf.appendChild(cv); }
        if (!on && cv) cv.remove();
      });
    }
  };
}
// positions for n counters: fill first frame before second
function positions(n, size, scatter) {
  const out = [];
  for (let f = 0; f < size / 10; f++) {
    const k = clamp(n - f * 10, 0, 10);
    const idxs = [...Array(10).keys()].map(i => f * 10 + i);
    out.push(...(scatter ? shuffle(idxs).slice(0, k) : idxs.slice(0, k)));
  }
  return out;
}

// ---------- EXPLORE ----------
(() => {
  let color = 'red', covered = false, hideNum = false;
  const fs = FrameSet($('#exHost'), idx => { fs.set(idx, fs.cells[idx] ? null : color); Sound.pop(fs.count()); update(); });
  fs.build(10);
  function update() {
    const n = fs.count();
    $('#exNum').textContent = hideNum ? '?' : n;
    const parts = ['red', 'yellow', 'blue'].map(c => [c, fs.count(c)]).filter(p => p[1]);
    let sub = '';
    if (!hideNum) {
      if (parts.length > 1) sub = parts.map(([c, k]) => `<span class="dot ${c}"></span> ${k}`).join(' + ') + ` = ${n}`;
      const target = fs.size;
      if (n < target && n > 0) sub += (sub ? ' &nbsp;·&nbsp; ' : '') + `${target - n} more to make ${target}`;
      if (n === target) sub += (sub ? ' &nbsp;·&nbsp; ' : '') + `Full! ${target}`;
    }
    $('#exSub').innerHTML = sub;
  }
  makeSeg($('#exFrames'), v => { fs.build(+v); fs.cover(covered); update(); });
  makeSeg($('#exColor'), v => color = v);
  $('#exAdd').onclick = () => { const i = fs.cells.indexOf(null); if (i < 0) return; fs.set(i, color); Sound.pop(fs.count()); update(); };
  $('#exTake').onclick = () => { for (let i = fs.size - 1; i >= 0; i--) if (fs.cells[i]) { fs.set(i, null); Sound.pop(fs.count()); break; } update(); };
  $('#exClear').onclick = () => { for (let i = 0; i < fs.size; i++) fs.set(i, null); Sound.click(); update(); };
  $('#exRand').onclick = () => {
    for (let i = 0; i < fs.size; i++) fs.set(i, null);
    positions(rand(1, fs.size), fs.size, false).forEach(i => fs.set(i, color));
    Sound.pop(5); update();
  };
  $('#exCover').onclick = e => { covered = !covered; fs.cover(covered); e.target.textContent = covered ? '👀 Uncover' : '🙈 Cover frame'; Sound.click(); };
  $('#exHide').onclick = e => { hideNum = !hideNum; e.target.textContent = hideNum ? 'Show number' : 'Hide number'; Sound.click(); update(); };
  update();
})();

// ---------- FLASH ----------
(() => {
  let max = 10, time = 2000, layout = 'order', right = 0, total = 0, last = -1, busy = false;
  const fs = FrameSet($('#flHost'));
  function reset() { fs.build(max); fs.cover(true); $('#flChoices').innerHTML = ''; setFeedback($('#flFb'), ''); $('#flPrompt').textContent = 'Get ready… how many counters will you see?'; }
  makeSeg($('#flMax'), v => { max = +v; reset(); });
  makeSeg($('#flTime'), v => time = +v);
  makeSeg($('#flLayout'), v => layout = v);
  reset();
  $('#flGo').onclick = async () => {
    if (busy) return; busy = true;
    reset();
    let n; do { n = rand(1, max); } while (n === last); last = n;
    positions(n, max, layout === 'scatter').forEach(i => fs.set(i, 'red'));
    $('#flPrompt').textContent = 'Look!';
    await sleep(300); fs.cover(false); Sound.pop(4);
    await sleep(time); fs.cover(true);
    $('#flPrompt').textContent = 'How many counters did you see?';
    renderChoices($('#flChoices'), numberChoices(n, 4, 1, max), n, ok => {
      total++; if (ok) right++;
      $('#flScore').textContent = `⭐ ${right} / ${total}`;
      fs.cover(false);
      setFeedback($('#flFb'), ok ? `Yes! It was ${n}. 🎉` : `It was ${n}. Look again!`, ok ? 'good' : 'bad');
      busy = false;
    });
    $('#flGo').textContent = '⚡ Next flash';
  };
})();

// ---------- MAKE TEN ----------
(() => {
  let target = 10, stars = 0, last = -1;
  const fs = FrameSet($('#mtHost'));
  function round() {
    fs.build(target);
    let n; do { n = target === 10 ? rand(1, 9) : rand(5, 19); } while (n === last); last = n;
    positions(n, target, false).forEach(i => fs.set(i, 'red'));
    $('#mtPrompt').textContent = `How many more to make ${target}?`;
    $('#mtEq').textContent = `${n} + ? = ${target}`;
    renderChoices($('#mtChoices'), numberChoices(target - n, 4, 1, target), target - n, async ok => {
      if (!ok) return;
      stars++; $('#mtScore').textContent = `⭐ ${stars}`;
      let k = 0;
      for (let i = 0; i < target; i++) if (!fs.cells[i]) { fs.set(i, 'yellow'); Sound.pop(++k); await sleep(220); }
      $('#mtEq').innerHTML = `<span style="color:var(--red)">${n}</span> + <span style="color:#d9a400">${target - n}</span> = ${target}`;
      if (stars % 5 === 0) confetti();
    }, { retry: true });
  }
  makeSeg($('#mtTarget'), v => { target = +v; round(); });
  $('#mtNext').onclick = () => { Sound.click(); round(); };
  round();
})();

// ---------- SHOW ME ----------
(() => {
  let max = 10, t = 0, stars = 0, done = false;
  const fs = FrameSet($('#smHost'), idx => {
    if (done) return;
    fs.set(idx, fs.cells[idx] ? null : 'blue'); Sound.pop(fs.count()); setFeedback($('#smFb'), '');
  });
  function round() {
    fs.build(max); done = false;
    let n; do { n = rand(1, max); } while (n === t); t = n;
    $('#smPrompt').innerHTML = `Show me <span style="color:var(--blue);font-size:1.3em">${t}</span> on the ten frame${max > 10 ? 's' : ''}!`;
    setFeedback($('#smFb'), '');
  }
  makeSeg($('#smMax'), v => { max = +v; round(); });
  $('#smClear').onclick = () => { if (done) return; for (let i = 0; i < fs.size; i++) fs.set(i, null); Sound.click(); };
  $('#smCheck').onclick = () => {
    if (done) return;
    const n = fs.count();
    if (n === t) { done = true; stars++; $('#smScore').textContent = `⭐ ${stars}`; Sound.good(); setFeedback($('#smFb'), `Perfect! That is ${t}. 🎉`, 'good'); if (stars % 3 === 0) confetti(); }
    else { Sound.bad(); restartAnim($('#smHost'), 'shake'); setFeedback($('#smFb'), n < t ? `You have ${n}. Add ${t - n} more.` : `You have ${n}. Take away ${n - t}.`, 'bad'); }
  };
  $('#smNext').onclick = () => { Sound.click(); round(); };
  round();
})();

}
