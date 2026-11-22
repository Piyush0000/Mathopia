import { $, $$, rand, pick, shuffle, sleep, clamp, h, svgEl, numberChoices, tween, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback } from '../common';

// Static, trusted markup for this tool (rendered by the page component)
export const markup = `<nav class="tabs">
  <button class="tab active" data-tab="length">📏 Length</button>
  <button class="tab" data-tab="mass">⚖️ Mass</button>
  <button class="tab" data-tab="capacity">🥛 Capacity</button>
  <button class="tab" data-tab="area">🟩 Area</button>
</nav>
<main>
  <!-- LENGTH -->
  <section class="panel" data-panel="length">
    <div class="toolbar">
      <span class="label">Objects</span>
      <div class="seg" id="lnCount"><button data-v="2" class="sel">2</button><button data-v="3">3</button></div>
      <span class="spacer"></span>
      <span class="score" id="lnScore">⭐ 0</span>
    </div>
    <div class="prompt" id="lnPrompt"></div>
    <svg class="stage" id="lnSvg"></svg>
    <div class="feedback" id="lnFb"></div>
    <div class="btnrow">
      <button class="btn purple" id="lnAlign">↔ Line up the ends</button>
      <button class="btn orange" id="lnMeasure">🧊 Measure with cubes</button>
      <button class="btn big" id="lnNew">New ▶</button>
    </div>
  </section>

  <!-- MASS -->
  <section class="panel" data-panel="mass" hidden>
    <div class="toolbar">
      <div class="seg" id="msMode"><button data-v="compare" class="sel">Which is heavier?</button><button data-v="balance">Balance with cubes</button></div>
      <span class="spacer"></span>
      <span class="score" id="msScore">⭐ 0</span>
    </div>
    <div class="prompt" id="msPrompt"></div>
    <svg class="stage" id="msSvg" viewBox="0 0 900 470"></svg>
    <div class="feedback" id="msFb"></div>
    <div class="btnrow">
      <button class="btn red" id="msMinus" hidden>－ Take a cube</button>
      <button class="btn green" id="msPlus" hidden>＋ Add a cube</button>
      <button class="btn big" id="msNew">New ▶</button>
    </div>
  </section>

  <!-- CAPACITY -->
  <section class="panel" data-panel="capacity" hidden>
    <div class="toolbar">
      <span class="label">Containers</span>
      <div class="seg" id="cpCount"><button data-v="2" class="sel">2</button><button data-v="3">3</button></div>
      <span class="spacer"></span>
      <span class="score" id="cpScore">⭐ 0</span>
    </div>
    <div class="prompt" id="cpPrompt"></div>
    <svg class="stage" id="cpSvg" viewBox="0 0 900 440"></svg>
    <div class="feedback" id="cpFb"></div>
    <div class="btnrow">
      <button class="btn orange" id="cpFill">🥛 Fill with cups</button>
      <button class="btn big" id="cpNew">New ▶</button>
    </div>
  </section>

  <!-- AREA -->
  <section class="panel" data-panel="area" hidden>
    <div class="toolbar">
      <span class="spacer"></span>
      <span class="score" id="arScore">⭐ 0</span>
    </div>
    <div class="prompt" id="arPrompt"></div>
    <svg class="stage" id="arSvg" viewBox="0 0 900 400"></svg>
    <div class="feedback" id="arFb"></div>
    <div class="btnrow">
      <button class="btn orange" id="arTile">🟨 Cover with tiles</button>
      <button class="btn big" id="arNew">New ▶</button>
    </div>
  </section>
</main>`;

// Game engine: wires up the markup above. Call once after it is mounted.
export function init() {

const COLORS = ['#ef476f', '#118ab2', '#06d6a0', '#8e6cdf', '#f78c3a', '#ffbe0b'];
const NAVY = '#073b4c';
function scoreKeeper(el) { let s = 0; return () => { s++; el.textContent = `⭐ ${s}`; if (s % 5 === 0) confetti(); }; }

// ================= LENGTH =================
(() => {
  const svg = $('#lnSvg'), U = 64, X0 = 70, ROW = 125;
  let n = 2, items = [], q, answered, aligned, measured, busy;
  const star = scoreKeeper($('#lnScore'));

  function drawPencil(g, w, color) {
    const H = 46;
    svgEl('rect', { x: 0, y: 0, width: 24, height: H, rx: 8, fill: '#ff9fb2' }, g);
    svgEl('rect', { x: 20, y: 0, width: 14, height: H, fill: '#b8c0cc' }, g);
    svgEl('rect', { x: 34, y: 0, width: w - 34 - 48, height: H, fill: color }, g);
    svgEl('rect', { x: 34, y: H / 3, width: w - 82, height: H / 3, fill: 'rgba(255,255,255,.22)' }, g);
    svgEl('polygon', { points: `${w - 48},0 ${w},${H / 2} ${w - 48},${H}`, fill: '#f5d6a8' }, g);
    svgEl('polygon', { points: `${w - 16},${H / 2 - 7} ${w},${H / 2} ${w - 16},${H / 2 + 7}`, fill: '#444' }, g);
  }
  function drawSnake(g, w, color) {
    const H = 46;
    svgEl('rect', { x: 0, y: 4, width: w, height: H - 8, rx: 19, fill: color }, g);
    for (let x = 30; x < w - 40; x += 36) svgEl('circle', { cx: x, cy: H / 2, r: 7, fill: 'rgba(255,255,255,.3)' }, g);
    svgEl('circle', { cx: w - 18, cy: H / 2 - 6, r: 6, fill: '#fff' }, g);
    svgEl('circle', { cx: w - 16, cy: H / 2 - 6, r: 3, fill: '#222' }, g);
    svgEl('path', { d: `M${w - 2},${H / 2 + 4} l12,0 l5,-4 M${w + 10},${H / 2 + 4} l5,4`, stroke: '#e63946', 'stroke-width': 3, fill: 'none' }, g);
  }
  function drawRibbon(g, w, color) {
    const H = 46;
    svgEl('rect', { x: 0, y: 8, width: w, height: H - 16, fill: color }, g);
    for (let x = 10; x < w; x += 24) svgEl('rect', { x, y: 8, width: 10, height: H - 16, fill: 'rgba(255,255,255,.28)' }, g);
    svgEl('polygon', { points: `0,8 14,${H / 2} 0,${H - 8}`, fill: '#fff' }, g);
    svgEl('polygon', { points: `${w},8 ${w - 14},${H / 2} ${w},${H - 8}`, fill: '#fff' }, g);
  }
  const DRAW = [drawPencil, drawSnake, drawRibbon];

  function newRound() {
    answered = false; aligned = false; measured = false; busy = false;
    const lens = shuffle([3, 4, 5, 6, 7, 8, 9, 10, 11]).slice(0, n);
    const cols = shuffle(COLORS), draw = pick(DRAW);
    items = lens.map((L, i) => ({ L, color: cols[i], off: rand(0, 3) * 40 }));
    if (items.every(it => it.off === items[0].off)) items[0].off += 80;
    q = n === 2 ? pick(['longer', 'shorter']) : pick(['longest', 'shortest']);
    $('#lnPrompt').innerHTML = `Which one is <u>${q}</u>? Tap it!`;
    setFeedback($('#lnFb'), '');
    const Hh = n * ROW + 40;
    svg.setAttribute('viewBox', `0 0 1000 ${Hh}`);
    svg.innerHTML = '';
    svgEl('line', { x1: X0, y1: 10, x2: X0, y2: Hh - 10, stroke: '#ccc', 'stroke-width': 3, 'stroke-dasharray': '8 8', id: 'startLine', opacity: 0 }, svg);
    items.forEach((it, i) => {
      const g = svgEl('g', { class: 'mv pickable' }, svg);
      g.style.transform = `translate(${X0 + it.off}px, ${30 + i * ROW}px)`;
      svgEl('rect', { class: 'hl', x: -12, y: -12, width: it.L * U + 34, height: 70, rx: 14, fill: '#ffd166' }, g);
      draw(g, it.L * U, it.color);
      it.g = g;
      g.onclick = () => guess(i);
    });
  }
  function best() {
    const Ls = items.map(it => it.L), f = (q === 'longer' || q === 'longest') ? Math.max : Math.min;
    return Ls.indexOf(f(...Ls));
  }
  async function guess(i) {
    if (answered || busy) return;
    answered = true;
    const ok = i === best();
    const hl = $('.hl', items[i].g); hl.style.opacity = .7; hl.setAttribute('fill', ok ? '#06d6a0' : '#ef476f');
    if (ok) { Sound.good(); star(); setFeedback($('#lnFb'), `Yes! That one is ${q}. Let's check…`, 'good'); }
    else { Sound.bad(); setFeedback($('#lnFb'), `Not quite – let's line them up and check!`, 'bad'); }
    await sleep(700); await align(); await measure();
    if (!ok) { const b = $('.hl', items[best()].g); b.style.opacity = .7; b.setAttribute('fill', '#06d6a0'); }
  }
  async function align() {
    if (aligned) return; aligned = true; Sound.click();
    $('#startLine').setAttribute('opacity', 1);
    items.forEach((it, i) => it.g.style.transform = `translate(${X0}px, ${30 + i * ROW}px)`);
    await sleep(950);
  }
  async function measure() {
    if (measured || busy) return; measured = true; busy = true;
    const max = Math.max(...items.map(it => it.L));
    for (let k = 0; k < max; k++) {
      items.forEach(it => {
        if (k >= it.L) return;
        const c = svgEl('g', {}, it.g); c.style.animation = 'pop .25s';
        c.style.transformOrigin = `${k * U + U / 2}px 76px`;
        svgEl('rect', { x: k * U + 2, y: 56, width: U - 4, height: 40, rx: 6, fill: '#ffd166', stroke: '#e0a800', 'stroke-width': 2 }, c);
        svgEl('text', { x: k * U + U / 2, y: 84, 'text-anchor': 'middle', 'font-size': 22, fill: NAVY }, c).textContent = k + 1;
      });
      Sound.pop(k); await sleep(330);
    }
    items.forEach(it => {
      svgEl('text', { x: it.L * U + 20, y: 88, 'font-size': 26, fill: NAVY }, it.g).textContent = `${it.L} cubes`;
    });
    busy = false;
  }
  makeSeg($('#lnCount'), v => { n = +v; newRound(); });
  $('#lnAlign').onclick = align;
  $('#lnMeasure').onclick = async () => { await align(); measure(); };
  $('#lnNew').onclick = () => { Sound.click(); newRound(); };
  newRound();
})();

// ================= MASS =================
(() => {
  const svg = $('#msSvg'), PX = 450, PY = 150, ARM = 280;
  const ITEMS = [
    { e: '🪶', n: 'feather', m: 1, s: 70 }, { e: '🎈', n: 'balloon', m: 1, s: 130 }, { e: '🍃', n: 'leaf', m: 1, s: 70 },
    { e: '✏️', n: 'pencil', m: 2, s: 70 }, { e: '🍌', n: 'banana', m: 3, s: 80 }, { e: '🍎', n: 'apple', m: 4, s: 75 },
    { e: '🧸', n: 'teddy', m: 5, s: 110 }, { e: '👟', n: 'shoe', m: 6, s: 90 }, { e: '📚', n: 'pile of books', m: 8, s: 90 },
    { e: '🧱', n: 'brick', m: 9, s: 65 }, { e: '🍉', n: 'watermelon', m: 10, s: 110 }
  ];
  let mode = 'compare', angle = 0, L, R, cubes = 0, q, answered;
  const star = scoreKeeper($('#msScore'));
  let beam, panL, panR, contL, contR;

  function build() {
    svg.innerHTML = '';
    svgEl('rect', { x: 250, y: 440, width: 400, height: 22, rx: 10, fill: '#8d6e63' }, svg);
    svgEl('polygon', { points: `${PX},${PY} ${PX - 60},440 ${PX + 60},440`, fill: '#b0855f' }, svg);
    beam = svgEl('g', {}, svg);
    svgEl('rect', { x: PX - ARM - 10, y: PY - 9, width: 2 * ARM + 20, height: 18, rx: 9, fill: '#5d4037' }, beam);
    svgEl('circle', { cx: PX, cy: PY, r: 16, fill: '#ffd166', stroke: '#5d4037', 'stroke-width': 4 }, svg);
    [panL, panR] = [0, 1].map(() => {
      const g = svgEl('g', { class: 'pickable' }, svg);
      svgEl('ellipse', { class: 'hl', cx: 0, cy: 110, rx: 120, ry: 90, fill: '#ffd166' }, g);
      svgEl('path', { d: 'M0,0 L-95,150 M0,0 L95,150', stroke: '#777', 'stroke-width': 3 }, g);
      svgEl('circle', { cx: 0, cy: 0, r: 6, fill: '#5d4037' }, g);
      const c = svgEl('g', {}, g);
      svgEl('path', { d: 'M-110,150 Q0,205 110,150 Z', fill: '#90a4ae', stroke: '#546e7a', 'stroke-width': 4 }, g);
      g.cont = c; return g;
    });
    contL = panL.cont; contR = panR.cont;
    setAngle(0);
  }
  function setAngle(a) {
    angle = a;
    beam.setAttribute('transform', `rotate(${a} ${PX} ${PY})`);
    const r = a * Math.PI / 180, dx = ARM * Math.cos(r), dy = ARM * Math.sin(r);
    panL.setAttribute('transform', `translate(${PX - dx},${PY - dy})`);
    panR.setAttribute('transform', `translate(${PX + dx},${PY + dy})`);
  }
  function animateTo(a, dur = 900) { const a0 = angle; return tween(dur, t => setAngle(a0 + (a - a0) * t)); }
  function putItem(cont, it) {
    cont.innerHTML = '';
    svgEl('text', { x: 0, y: 150, 'text-anchor': 'middle', 'font-size': it.s }, cont).textContent = it.e;
  }
  function putCubes(cont, k) {
    cont.innerHTML = '';
    const S = 30;
    for (let i = 0; i < k; i++) {
      const row = Math.floor(i / 6), inRow = Math.min(6, k - row * 6), col = i % 6;
      svgEl('rect', { x: -inRow * S / 2 + col * S + 1, y: 150 - (row + 1) * S, width: S - 2, height: S - 2, rx: 4, fill: '#06d6a0', stroke: '#048a66', 'stroke-width': 2 }, cont);
    }
  }
  function newRound() {
    build(); answered = false; setFeedback($('#msFb'), '');
    $('#msPlus').hidden = $('#msMinus').hidden = mode !== 'balance';
    if (mode === 'compare') {
      // sometimes a tricky pair: big-but-light vs small-but-heavy
      if (Math.random() < .3) [L, R] = shuffle([ITEMS[1], ITEMS[9]]);
      else do { [L, R] = shuffle(ITEMS).slice(0, 2); } while (L.m === R.m);
      q = pick(['heavier', 'lighter']);
      putItem(contL, L); putItem(contR, R);
      $('#msPrompt').innerHTML = `Which is <u>${q}</u>? Tap it, then watch the scale!`;
      panL.onclick = () => guess(0); panR.onclick = () => guess(1);
      panL.classList.add('pickable'); panR.classList.add('pickable');
    } else {
      do { L = pick(ITEMS); } while (L.m < 2);
      cubes = 0; putItem(contL, L); putCubes(contR, 0);
      panL.onclick = panR.onclick = null;
      panL.classList.remove('pickable'); panR.classList.remove('pickable');
      $('#msPrompt').innerHTML = `How many cubes weigh the same as the ${L.n} ${L.e}?`;
      setAngle(-15);
    }
  }
  async function guess(side) {
    if (answered) return; answered = true;
    const heavier = L.m > R.m ? 0 : 1, want = q === 'heavier' ? heavier : 1 - heavier, ok = side === want;
    const hl = $('.hl', side ? panR : panL); hl.style.opacity = .6; hl.setAttribute('fill', ok ? '#06d6a0' : '#ef476f');
    Sound.click();
    await animateTo(L.m > R.m ? -15 : 15);
    const H = heavier ? R : L, Lt = heavier ? L : R;
    if (ok) { Sound.good(); star(); }
    else Sound.bad();
    setFeedback($('#msFb'), `${ok ? 'Yes! ' : 'Look! '}The ${H.n} ${H.e} is heavier – it goes down. The ${Lt.n} ${Lt.e} is lighter.`, ok ? 'good' : 'bad');
  }
  async function changeCubes(d) {
    if (mode !== 'balance' || answered) return;
    cubes = clamp(cubes + d, 0, 18); putCubes(contR, cubes); Sound.pop(cubes);
    $('#msFb').textContent = '';
    setFeedback($('#msFb'), `${cubes} cube${cubes === 1 ? '' : 's'}`);
    await animateTo(clamp((cubes - L.m) * 5, -15, 15), 450);
    if (cubes === L.m) {
      answered = true; Sound.good(); star();
      setFeedback($('#msFb'), `Balanced! The ${L.n} weighs the same as ${cubes} cubes. 🎉`, 'good');
    }
  }
  $('#msPlus').onclick = () => changeCubes(1);
  $('#msMinus').onclick = () => changeCubes(-1);
  makeSeg($('#msMode'), v => { mode = v; newRound(); });
  $('#msNew').onclick = () => { Sound.click(); newRound(); };
  newRound();
})();

// ================= CAPACITY =================
(() => {
  const svg = $('#cpSvg'), A = 2500, BOTTOM = 370;
  let n = 2, cons = [], q, answered, filled, busy;
  const star = scoreKeeper($('#cpScore'));
  function newRound() {
    answered = filled = busy = false; setFeedback($('#cpFb'), '');
    svg.innerHTML = '';
    const caps = shuffle([3, 4, 5, 6, 7, 8, 9, 10]).slice(0, n), cols = shuffle(COLORS);
    const slot = 900 / n;
    cons = caps.map((c, i) => {
      let hgt, w;
      do { hgt = rand(90, 300); w = c * A / hgt; } while (w < 60 || w > Math.min(250, slot - 40));
      const x = slot * i + slot / 2 - w / 2, top = BOTTOM - hgt;
      const g = svgEl('g', { class: 'pickable' }, svg);
      svgEl('rect', { class: 'hl', x: x - 16, y: top - 16, width: w + 32, height: hgt + 70, rx: 16, fill: '#ffd166' }, g);
      const clipId = 'cp' + i + Date.now();
      const clip = svgEl('clipPath', { id: clipId }, g);
      const shapeD = `M${x},${top} L${x},${BOTTOM - 14} Q${x},${BOTTOM} ${x + 14},${BOTTOM} L${x + w - 14},${BOTTOM} Q${x + w},${BOTTOM} ${x + w},${BOTTOM - 14} L${x + w},${top}`;
      svgEl('path', { d: shapeD + ' Z' }, clip);
      svgEl('path', { d: shapeD + ' Z', fill: 'rgba(200,230,255,.35)' }, g);
      const water = svgEl('rect', { x, y: BOTTOM, width: w, height: 0, fill: '#4fc3f7', 'clip-path': `url(#${clipId})` }, g);
      svgEl('path', { d: shapeD, fill: 'none', stroke: cols[i], 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      const label = svgEl('text', { x: x + w / 2, y: BOTTOM + 42, 'text-anchor': 'middle', 'font-size': 28, fill: NAVY }, g);
      label.textContent = '? cups';
      const con = { c, w, x, water, label, g, k: 0 };
      g.onclick = () => guess(i);
      return con;
    });
    q = pick(['more', 'less']);
    $('#cpPrompt').innerHTML = `Which container holds <u>${q}</u>? Tap it!`;
  }
  async function fill() {
    if (filled || busy) return; busy = true; filled = true;
    const max = Math.max(...cons.map(c => c.c));
    for (let k = 1; k <= max; k++) {
      const anims = cons.filter(c => k <= c.c).map(c => {
        const from = (k - 1) * A / c.w, to = k * A / c.w;
        c.label.textContent = `${k} cup${k > 1 ? 's' : ''}`;
        return tween(380, t => { const lv = from + (to - from) * t; c.water.setAttribute('y', BOTTOM - lv); c.water.setAttribute('height', lv); });
      });
      Sound.pop(k); await Promise.all(anims); await sleep(120);
    }
    busy = false;
  }
  async function guess(i) {
    if (answered || busy) return; answered = true;
    const caps = cons.map(c => c.c), best = caps.indexOf((q === 'more' ? Math.max : Math.min)(...caps)), ok = i === best;
    const hl = $('.hl', cons[i].g); hl.style.opacity = .6; hl.setAttribute('fill', ok ? '#06d6a0' : '#ef476f');
    Sound.click();
    setFeedback($('#cpFb'), "Let's fill them with cups and see…");
    await fill();
    if (ok) { Sound.good(); star(); } else { Sound.bad(); const b = $('.hl', cons[best].g); b.style.opacity = .6; b.setAttribute('fill', '#06d6a0'); }
    setFeedback($('#cpFb'), ok ? `Yes! It holds ${q} – ${cons[best].c} cups. 🎉` : `This one holds ${q}: ${cons[best].c} cups. Tall isn't always more!`, ok ? 'good' : 'bad');
  }
  makeSeg($('#cpCount'), v => { n = +v; newRound(); });
  $('#cpFill').onclick = fill;
  $('#cpNew').onclick = () => { Sound.click(); newRound(); };
  newRound();
})();

// ================= AREA =================
(() => {
  const svg = $('#arSvg'), S = 52, COLS = 7, ROWS = 6;
  let shapes, q, answered, tiled, busy;
  const star = scoreKeeper($('#arScore'));
  function poly(n) {
    const set = new Set(['3,2']);
    while (set.size < n) {
      const [c, r] = pick([...set]).split(',').map(Number);
      const [dc, dr] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const nc = c + dc, nr = r + dr;
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) set.add(nc + ',' + nr);
    }
    return [...set].map(s => s.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  function newRound() {
    answered = tiled = busy = false; setFeedback($('#arFb'), ''); svg.innerHTML = '';
    let a, b; do { a = rand(4, 14); b = rand(4, 14); } while (Math.abs(a - b) < 1);
    const cols = shuffle(COLORS);
    shapes = [a, b].map((n, i) => {
      const cells = poly(n);
      const minC = Math.min(...cells.map(c => c[0])), maxC = Math.max(...cells.map(c => c[0]));
      const minR = Math.min(...cells.map(c => c[1])), maxR = Math.max(...cells.map(c => c[1]));
      const ox = (i ? 675 : 225) - ((minC + maxC + 1) * S) / 2, oy = 175 - ((minR + maxR + 1) * S) / 2;
      const g = svgEl('g', { class: 'pickable' }, svg);
      svgEl('rect', { class: 'hl', x: ox + minC * S - 20, y: oy + minR * S - 20, width: (maxC - minC + 1) * S + 40, height: (maxR - minR + 1) * S + 40, rx: 16, fill: '#ffd166' }, g);
      const has = new Set(cells.map(c => c.join(',')));
      cells.forEach(([c, r]) => svgEl('rect', { x: ox + c * S, y: oy + r * S, width: S, height: S, fill: cols[i], stroke: cols[i], 'stroke-width': 1 }, g));
      cells.forEach(([c, r]) => {
        const x = ox + c * S, y = oy + r * S;
        const seg = (x1, y1, x2, y2) => svgEl('line', { x1, y1, x2, y2, stroke: NAVY, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
        if (!has.has(c + ',' + (r - 1))) seg(x, y, x + S, y);
        if (!has.has(c + ',' + (r + 1))) seg(x, y + S, x + S, y + S);
        if (!has.has((c - 1) + ',' + r)) seg(x, y, x, y + S);
        if (!has.has((c + 1) + ',' + r)) seg(x + S, y, x + S, y + S);
      });
      const tiles = svgEl('g', {}, g);
      const label = svgEl('text', { x: i ? 675 : 225, y: 385, 'text-anchor': 'middle', 'font-size': 28, fill: NAVY }, g);
      label.textContent = '? tiles';
      g.onclick = () => guess(i);
      return { n, cells, ox, oy, g, tiles, label };
    });
    q = pick(['more', 'less']);
    $('#arPrompt').innerHTML = `Which shape covers <u>${q}</u> space? Tap it!`;
  }
  async function tile() {
    if (tiled || busy) return; tiled = busy = true;
    const max = Math.max(...shapes.map(s => s.n));
    for (let k = 0; k < max; k++) {
      shapes.forEach(s => {
        if (k >= s.n) return;
        const [c, r] = s.cells[k], x = s.ox + c * S, y = s.oy + r * S;
        const t = svgEl('g', {}, s.tiles); t.style.animation = 'pop .25s'; t.style.transformOrigin = `${x + S / 2}px ${y + S / 2}px`;
        svgEl('rect', { x: x + 4, y: y + 4, width: S - 8, height: S - 8, rx: 6, fill: '#fff6d5', stroke: '#e0a800', 'stroke-width': 2 }, t);
        svgEl('text', { x: x + S / 2, y: y + S / 2 + 9, 'text-anchor': 'middle', 'font-size': 24, fill: NAVY }, t).textContent = k + 1;
        s.label.textContent = `${k + 1} tile${k ? 's' : ''}`;
      });
      Sound.pop(k); await sleep(300);
    }
    busy = false;
  }
  async function guess(i) {
    if (answered || busy) return; answered = true;
    const best = (q === 'more') === (shapes[0].n > shapes[1].n) ? 0 : 1, ok = i === best;
    const hl = $('.hl', shapes[i].g); hl.style.opacity = .55; hl.setAttribute('fill', ok ? '#06d6a0' : '#ef476f');
    Sound.click(); setFeedback($('#arFb'), "Let's cover them with tiles…");
    await tile();
    if (ok) { Sound.good(); star(); } else { Sound.bad(); const b = $('.hl', shapes[best].g); b.style.opacity = .55; b.setAttribute('fill', '#06d6a0'); }
    setFeedback($('#arFb'), ok ? `Yes! ${shapes[best].n} tiles is ${q} than ${shapes[1 - best].n}. 🎉` : `This one covers ${q} space: ${shapes[best].n} tiles.`, ok ? 'good' : 'bad');
  }
  $('#arTile').onclick = tile;
  $('#arNew').onclick = () => { Sound.click(); newRound(); };
  newRound();
})();

}
