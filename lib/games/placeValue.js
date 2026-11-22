import { $, $$, rand, pick, shuffle, sleep, clamp, h, svgEl, numberChoices, tween, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback } from '../common';

// Static, trusted markup for this tool (rendered by the page component)
export const markup = `<nav class="tabs">
  <button class="tab active" data-tab="explore">🛠️ Workshop</button>
  <button class="tab" data-tab="build">🏗️ Build It</button>
  <button class="tab" data-tab="count">🔍 Count It</button>
  <button class="tab" data-tab="trade">🔄 Trade It</button>
</nav>
<main>
  <!-- WORKSHOP -->
  <section class="panel" data-panel="explore">
    <div class="toolbar">
      <span class="label">Use ＋ and － to add blocks. Tap a rod or flat to break it into 10.</span>
      <span class="spacer"></span>
      <button class="btn alt" id="exHide">🙈 Hide number</button>
      <button class="btn purple" id="exRand">🎲 Random</button>
      <button class="btn alt" id="exClear">Clear</button>
    </div>
    <div id="exMat"></div>
    <div class="readout"><div class="total" id="exTotal">0</div><div class="expanded" id="exExp"></div></div>
    <div class="hint" id="exHint"></div>
  </section>

  <!-- BUILD IT -->
  <section class="panel" data-panel="build" hidden>
    <div class="toolbar">
      <span class="label">Numbers up to</span>
      <div class="seg" id="bdRange"><button data-v="50">50</button><button data-v="99" class="sel">99</button><button data-v="999">999</button></div>
      <span class="spacer"></span>
      <span class="score" id="bdScore">⭐ 0</span>
    </div>
    <div class="prompt" id="bdPrompt"></div>
    <div id="bdMat"></div>
    <div class="feedback" id="bdFb"></div>
    <div class="btnrow">
      <button class="btn alt" id="bdClear">Clear</button>
      <button class="btn green big" id="bdCheck">✔ Check</button>
      <button class="btn big" id="bdNext">Next ▶</button>
    </div>
  </section>

  <!-- COUNT IT -->
  <section class="panel" data-panel="count" hidden>
    <div class="toolbar">
      <span class="label">Numbers up to</span>
      <div class="seg" id="ctRange"><button data-v="50">50</button><button data-v="99" class="sel">99</button><button data-v="999">999</button></div>
      <span class="label">Blocks</span>
      <div class="seg" id="ctMode"><button data-v="neat" class="sel">Neat</button><button data-v="tricky">Tricky (10+ in a column)</button></div>
      <span class="spacer"></span>
      <span class="score" id="ctScore">⭐ 0 / 0</span>
    </div>
    <div class="prompt">What number do these blocks make?</div>
    <div id="ctMat"></div>
    <div class="choices" id="ctChoices"></div>
    <div class="feedback" id="ctFb"></div>
    <div class="btnrow"><button class="btn big" id="ctNext">Next ▶</button></div>
  </section>

  <!-- TRADE IT -->
  <section class="panel" data-panel="trade" hidden>
    <div class="toolbar">
      <span class="label">Numbers up to</span>
      <div class="seg" id="trRange"><button data-v="99" class="sel">99</button><button data-v="999">999</button></div>
      <span class="spacer"></span>
      <span class="score" id="trScore">⭐ 0</span>
    </div>
    <div class="prompt" id="trPrompt"></div>
    <div class="hint">Tap a rod or flat to break it into 10, or bundle 10 together. The number must stay the same!</div>
    <div id="trMat"></div>
    <div class="feedback" id="trFb"></div>
    <div class="btnrow">
      <button class="btn alt" id="trReset">↺ Start again</button>
      <button class="btn green big" id="trCheck">✔ Check</button>
      <button class="btn big" id="trNext">Next ▶</button>
    </div>
  </section>
</main>`;

// Game engine: wires up the markup above. Call once after it is mounted.
export function init() {

// ================= Place value mat component =================
const COLS = [
  { k: 'h', cls: 'H', name: 'Hundreds', one: 'hundred', lim: 9 },
  { k: 't', cls: 'T', name: 'Tens', one: 'ten', lim: 30 },
  { k: 'o', cls: 'O', name: 'Ones', one: 'one', lim: 30 }
];
function Mat(host, { editable = true, onChange = () => {}, onMsg = () => {} } = {}) {
  const s = { h: 0, t: 0, o: 0 };
  let prev = { h: 0, t: 0, o: 0 }, locked = false;
  const mat = h('div', 'mat ' + (editable ? 'editable' : 'readonly'));
  const refs = {};
  COLS.forEach((c, i) => {
    const col = h('div', 'col ' + c.cls);
    col.appendChild(h('div', 'colhead', c.name));
    const dg = h('div', 'digit', '0'); col.appendChild(dg);
    const area = h('div', 'area'); col.appendChild(area);
    const btns = h('div', 'colbtns');
    const minus = h('button', 'btn red', '－'), plus = h('button', 'btn green', '＋');
    minus.onclick = () => change(c.k, -1); plus.onclick = () => change(c.k, 1);
    btns.append(minus, plus);
    let bundle = null;
    if (i > 0) {
      bundle = h('button', 'btn orange bundle', `📦 Bundle 10 → 1 ${COLS[i - 1].one}`);
      bundle.onclick = () => doBundle(i);
      btns.appendChild(bundle);
    }
    col.appendChild(btns);
    area.addEventListener('click', e => {
      const b = e.target.closest('.flat,.rod');
      if (!b || !editable || locked) return;
      doBreak(b.classList.contains('flat') ? 0 : 1);
    });
    refs[c.k] = { col, dg, area, minus, plus, bundle };
    mat.appendChild(col);
  });
  host.innerHTML = ''; host.appendChild(mat);

  function change(k, d) {
    if (locked) return;
    const c = COLS.find(c => c.k === k);
    const v = s[k] + d;
    if (v < 0) return;
    if (v > c.lim) { onMsg(`That's the most ${c.name.toLowerCase()} we can fit!`); Sound.bad(); return; }
    s[k] = v; Sound.pop(v); render();
  }
  function doBreak(i) { // break one block in column i into 10 of column i+1
    const a = COLS[i], b = COLS[i + 1];
    if (s[a.k] < 1) return;
    if (s[b.k] + 10 > b.lim) { onMsg(`Too many ${b.name.toLowerCase()}! Bundle some first.`); Sound.bad(); restartAnim(refs[b.k].col, 'shake'); return; }
    s[a.k]--; s[b.k] += 10; Sound.tone(300, .12, 'square', 0, .08); Sound.pop(8);
    onMsg(`🔨 1 ${a.one} → 10 ${b.name.toLowerCase()}`); render();
  }
  function doBundle(i) { // bundle 10 of column i into 1 of column i-1
    const a = COLS[i - 1], b = COLS[i];
    if (locked || s[b.k] < 10) return;
    if (s[a.k] + 1 > a.lim) { onMsg(`No room for another ${a.one}!`); Sound.bad(); return; }
    s[b.k] -= 10; s[a.k]++; Sound.good();
    onMsg(`📦 10 ${b.name.toLowerCase()} → 1 ${a.one}`); render();
  }
  function render() {
    COLS.forEach(c => {
      const r = refs[c.k], n = s[c.k];
      r.area.innerHTML = '';
      if (c.k === 'o') {
        for (let g = 0; g * 10 < n; g++) {
          const grp = h('div', 'onesgrp');
          for (let j = g * 10; j < Math.min(n, g * 10 + 10); j++) {
            const b = h('div', 'blk cube' + (j >= prev.o ? ' new' : ''));
            b.style.animationDelay = Math.min(j - prev.o, 12) * 25 + 'ms';
            grp.appendChild(b);
          }
          r.area.appendChild(grp);
        }
      } else {
        for (let j = 0; j < n; j++) {
          const b = h('div', 'blk ' + (c.k === 'h' ? 'flat' : 'rod') + (j >= prev[c.k] ? ' new' : ''));
          b.title = editable ? 'Tap to break into 10' : '';
          r.area.appendChild(b);
        }
      }
      r.dg.textContent = n;
      r.col.classList.toggle('warn', n >= 10 && c.k !== 'h');
      r.minus.disabled = n === 0; r.plus.disabled = n >= c.lim;
      if (r.bundle) r.bundle.hidden = n < 10;
    });
    prev = { ...s };
    onChange(s);
  }
  return {
    state: s,
    get value() { return s.h * 100 + s.t * 10 + s.o; },
    set(H, T, O, anim = true) { s.h = H; s.t = T; s.o = O; if (!anim) prev = { ...s }; else prev = { h: 0, t: 0, o: 0 }; render(); },
    lock(v) { locked = v; }
  };
}
const split = n => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
function expandedHTML(s, value) {
  const parts = [];
  if (s.h) parts.push(`<span class="h">${s.h * 100}</span>`);
  if (s.t) parts.push(`<span class="t">${s.t * 10}</span>`);
  if (s.o || !parts.length) parts.push(`<span class="o">${s.o}</span>`);
  return parts.join(' + ') + (parts.length > 1 ? ` = ${value}` : '');
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function wordsHTML(s) {
  return `<span class="h">${plural(s.h, 'hundred')}</span>, <span class="t">${plural(s.t, 'ten')}</span>, <span class="o">${plural(s.o, 'one')}</span>`;
}
function starKeeper(el) { let n = 0; return () => { n++; el.textContent = `⭐ ${n}`; if (n % 5 === 0) confetti(); }; }

// ================= WORKSHOP =================
(() => {
  let hidden = false;
  const mat = Mat($('#exMat'), { onChange: upd, onMsg: m => $('#exHint').textContent = m });
  function upd(s) {
    const v = s.h * 100 + s.t * 10 + s.o;
    $('#exTotal').textContent = hidden ? '?' : v;
    $('#exExp').innerHTML = hidden ? wordsHTML(s) : `${wordsHTML(s)}<br>${expandedHTML(s, v)}`;
  }
  $('#exHide').onclick = e => { hidden = !hidden; e.target.textContent = hidden ? '👀 Show number' : '🙈 Hide number'; Sound.click(); upd(mat.state); };
  $('#exRand').onclick = () => { const [a, b, c] = split(rand(1, 999)); mat.set(a, b, c); $('#exHint').textContent = ''; Sound.pop(5); };
  $('#exClear').onclick = () => { mat.set(0, 0, 0); $('#exHint').textContent = ''; Sound.click(); };
  upd(mat.state);
})();

// ================= BUILD IT =================
(() => {
  let max = 99, target = 0, done = false;
  const star = starKeeper($('#bdScore'));
  const mat = Mat($('#bdMat'), { onMsg: m => setFeedback($('#bdFb'), m), onChange: () => { if (!done) setFeedback($('#bdFb'), ''); } });
  function round() {
    let n; do { n = rand(max > 99 ? 100 : 11, max); } while (n === target); target = n; done = false; mat.lock(false);
    mat.set(0, 0, 0, false);
    $('#bdPrompt').innerHTML = `Build the number <span class="target">${target}</span>`;
    setFeedback($('#bdFb'), '');
  }
  $('#bdCheck').onclick = () => {
    if (done) return;
    const v = mat.value, s = mat.state;
    if (v === target) {
      done = true; mat.lock(true); Sound.good(); star();
      const neat = s.t < 10 && s.o < 10;
      setFeedback($('#bdFb'), neat ? `Brilliant! ${wordsHTML(s).replace(/<[^>]+>/g, '')} = ${target} 🎉` : `Yes, that makes ${target}! Can you bundle to use fewer blocks?`, 'good');
    } else {
      Sound.bad(); restartAnim($('#bdMat'), 'shake');
      setFeedback($('#bdFb'), `You made ${v}. ${v < target ? 'You need more.' : 'That is too many.'}`, 'bad');
    }
  };
  $('#bdClear').onclick = () => { if (!done) { mat.set(0, 0, 0, false); Sound.click(); } };
  $('#bdNext').onclick = () => { Sound.click(); round(); };
  makeSeg($('#bdRange'), v => { max = +v; round(); });
  round();
})();

// ================= COUNT IT =================
(() => {
  let max = 99, mode = 'neat', last = -1, right = 0, total = 0;
  const mat = Mat($('#ctMat'), { editable: false });
  function distractors(n) {
    const set = new Set([n]);
    const d = String(n).split('');
    const cands = [n + 10, n - 10, n + 1, n - 1, n + 100, n - 100, +d.slice().reverse().join('')];
    if (d.length === 3) cands.push(+(d[0] + d[2] + d[1]), +(d[1] + d[0] + d[2]));
    shuffle(cands).forEach(c => { if (set.size < 4 && c > 0 && c <= 999 && c !== n) set.add(c); });
    while (set.size < 4) set.add(clamp(n + rand(-15, 15), 1, 999));
    return shuffle([...set]);
  }
  function round() {
    let n; do { n = rand(max > 99 ? 100 : 11, max); } while (n === last); last = n;
    let [H, T, O] = split(n);
    if (mode === 'tricky') {
      if (T > 0 && (Math.random() < .6 || H === 0)) { T--; O += 10; }
      else if (H > 0) { H--; T += 10; }
    }
    mat.set(H, T, O);
    setFeedback($('#ctFb'), '');
    renderChoices($('#ctChoices'), distractors(n), n, ok => {
      total++; if (ok) right++;
      $('#ctScore').textContent = `⭐ ${right} / ${total}`;
      setFeedback($('#ctFb'), ok ? `Yes! ${expandedHTML({ h: H, t: T, o: O }, n).replace(/<[^>]+>/g, '')}` : `It is ${n}. Count the hundreds, then tens, then ones.`, ok ? 'good' : 'bad');
      if (ok && right % 5 === 0) confetti();
    });
  }
  makeSeg($('#ctRange'), v => { max = +v; round(); });
  makeSeg($('#ctMode'), v => { mode = v; round(); });
  $('#ctNext').onclick = () => { Sound.click(); round(); };
  round();
})();

// ================= TRADE IT =================
(() => {
  let max = 99, task = null, done = false;
  const star = starKeeper($('#trScore'));
  const mat = Mat($('#trMat'), { onMsg: m => setFeedback($('#trFb'), m), onChange: () => {} });
  function make() {
    for (;;) {
      const n = rand(max > 99 ? 110 : 12, max), [H, T, O] = split(n), opts = [];
      if (T > 0) { const k = T >= 2 && Math.random() < .3 ? 2 : 1; opts.push({ n, col: 'o', want: O + 10 * k, word: 'ones' }); opts.push({ n, col: 't', want: T - k, word: 'tens', alsoOnes: O + 10 * k }); }
      if (H > 0) opts.push({ n, col: 't', want: T + 10, word: 'tens' });
      if (opts.length) return { ...pick(opts), start: [H, T, O] };
    }
  }
  function reset() { mat.lock(false); mat.set(...task.start, false); setFeedback($('#trFb'), ''); }
  function round() {
    task = make(); done = false;
    $('#trPrompt').innerHTML = `Show <span class="target">${task.n}</span> using exactly <u>${task.want} ${task.word}</u>`;
    reset();
  }
  $('#trCheck').onclick = () => {
    if (done) return;
    const v = mat.value, got = mat.state[task.col];
    if (v !== task.n) { Sound.bad(); setFeedback($('#trFb'), `Oops – your blocks now make ${v}, not ${task.n}. Trade, don't add or take away!`, 'bad'); return; }
    if (got !== task.want) { Sound.bad(); restartAnim($('#trMat'), 'shake'); setFeedback($('#trFb'), `It's still ${task.n} 👍 but you have ${got} ${task.word}. You need ${task.want}.`, 'bad'); return; }
    done = true; mat.lock(true); Sound.good(); star();
    const s = mat.state;
    setFeedback($('#trFb'), `Great trading! ${s.h * 100} + ${s.t * 10} + ${s.o} = ${task.n} 🎉`, 'good');
  };
  $('#trReset').onclick = () => { Sound.click(); reset(); };
  $('#trNext').onclick = () => { Sound.click(); round(); };
  makeSeg($('#trRange'), v => { max = +v; round(); });
  round();
})();

}
