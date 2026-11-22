import { $, $$, rand, pick, shuffle, sleep, clamp, h, svgEl, numberChoices, tween, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback } from '../common';

// Static, trusted markup for this tool (rendered by the page component)
export const markup = `<nav class="tabs">
  <button class="tab active" data-tab="explore">Explore &amp; Count</button>
  <button class="tab" data-tab="sort">Sorting Game</button>
  <button class="tab" data-tab="race">🏆 Race to the Top</button>
</nav>
<main>
  <section class="panel" data-panel="explore">
    <div class="explore">
      <aside class="picker">
        <h3>2D shapes</h3><div class="picks" id="pick2"></div>
        <h3>3D objects</h3><div class="picks" id="pick3"></div>
      </aside>
      <section class="shstage">
        <div class="sname" id="sname"></div>
        <div id="stageHost"></div>
        <div class="real" id="sreal"></div>
        <div class="ctrl">
          <button class="btn alt" id="hideName">🙈 Hide name</button>
          <button class="btn alt" id="hideReal">Hide real-life objects</button>
        </div>
      </section>
      <aside class="countbox">
        <h3>Let's count!</h3>
        <div class="props" id="props"></div>
        <div class="tally" id="tally"></div>
        <div class="msg" id="cmsg">Choose what to count, then tap each one on the shape.</div>
        <div class="ctrl">
          <button class="btn green" id="cNext">Count next ▶</button>
          <button class="btn alt" id="cReset">Reset</button>
        </div>
      </aside>
    </div>
  </section>

  <section class="panel" data-panel="sort" hidden>
    <div class="toolbar">
      <span class="label">Sort by</span>
      <div class="seg" id="sortRule">
        <button data-v="dim" class="sel">2D or 3D</button>
        <button data-v="curve">Straight or curved</button>
        <button data-v="sides">Number of sides</button>
        <button data-v="roll">Roll or not</button>
        <button data-v="real">Everyday objects</button>
      </div>
      <span class="spacer"></span>
      <span class="score" id="sortScore"></span>
    </div>
    <div class="prompt" id="sortPrompt"></div>
    <div class="sortitem" id="sortItem"></div>
    <div class="feedback" id="sortFb"></div>
    <div class="bins" id="bins"></div>
  </section>

  <section class="panel" data-panel="race" hidden>
    <div class="racebar">
      <input id="teamA" value="Red Team" aria-label="Team 1 name">
      <span class="label">vs</span>
      <input id="teamB" value="Blue Team" aria-label="Team 2 name">
      <span class="label">Steps</span>
      <div class="seg" id="raceSteps"><button data-v="5">5</button><button data-v="8" class="sel">8</button><button data-v="10">10</button></div>
      <span class="label">Shapes</span>
      <div class="seg" id="raceDim"><button data-v="2">2D</button><button data-v="3">3D</button><button data-v="both" class="sel">Both</button></div>
      <button class="btn green" id="raceStart">▶ New race</button>
    </div>
    <div class="race">
      <div class="track redT" id="trackA"></div>
      <div class="qcard">
        <div class="turn" id="turn"></div>
        <div class="prompt" id="rq"></div>
        <div class="qvis" id="rvis"></div>
        <div class="choices" id="rch"></div>
        <div class="feedback" id="rfb"></div>
        <div><button class="btn big" id="rnext" hidden>Next turn ▶</button></div>
      </div>
      <div class="track blueT" id="trackB"></div>
    </div>
  </section>
</main>`;

// Game engine: wires up the markup above. Call once after it is mounted.
export function init() {

// ===================== SHAPE DATA =====================
const NAVY = '#073b4c';
function reg(n, a0, r = 115, cx = 150, cy = 150) {
  return Array.from({ length: n }, (_, k) => { const a = (a0 + k * 360 / n) * Math.PI / 180; return [Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]; });
}
const ptsD = pts => 'M' + pts.map(p => p.join(',')).join(' L') + ' Z';
const ellD = (cx, cy, rx, ry) => `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;

function poly2D(id, pts, color, real) { return { id, name: id, dim: 2, color, pts, straight: true, sides: pts.length, corners: pts.length, real }; }

// polyhedron builder: P = {A:[x,y],...}; faces 'ABCD' with shade; edges 'AB' ('-' prefix = hidden); hiddenV = letters
function polyhedron(id, color, P, faces, edges, hiddenV, real, extra = {}) {
  return Object.assign({
    id, name: id, dim: 3, color, real, rolls: false,
    faces: faces.map(f => ({ d: ptsD([...f.v].map(c => P[c])), shade: f.s || 0, hidden: !!f.h, curved: false })),
    edges: edges.map(e => { const hid = e[0] === '-', k = hid ? e.slice(1) : e; return { d: `M${P[k[0]].join(',')} L${P[k[1]].join(',')}`, hidden: hid }; }),
    vertices: Object.keys(P).map(k => ({ x: P[k][0], y: P[k][1], hidden: hiddenV.includes(k) })),
    outline: []
  }, extra);
}
function boxPts(x1, y1, x2, y2, dx, dy) {
  return { A: [x1, y1], B: [x2, y1], C: [x2, y2], D: [x1, y2], E: [x1 + dx, y1 + dy], F: [x2 + dx, y1 + dy], G: [x2 + dx, y2 + dy], H: [x1 + dx, y2 + dy] };
}
const BOX_FACES = [{ v: 'ABCD', s: 0 }, { v: 'AEFB', s: 1 }, { v: 'BFGC', s: -1 }, { v: 'EFGH', h: 1 }, { v: 'AEHD', h: 1 }, { v: 'DCGH', h: 1 }];
const BOX_EDGES = ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', '-GH', '-HE', 'AE', 'BF', 'CG', '-DH'];

const SHAPES = [
  { id: 'circle', name: 'circle', dim: 2, color: '#ef476f', ellipse: [150, 150, 115, 115], straight: false, sides: 0, corners: 0, real: ['🕒', '🍪', '🍩', '🎯'],
    note: 'A circle has no straight sides and no corners – just one curved line!' },
  poly2D('triangle', reg(3, -90, 120, 150, 168), '#ffd166', ['🍕', '📐', '🔺']),
  poly2D('square', reg(4, -135, 125), '#118ab2', ['🧇', '🪟', '🟦']),
  poly2D('rectangle', [[35, 85], [265, 85], [265, 215], [35, 215]], '#06d6a0', ['🚪', '📱', '💵']),
  poly2D('pentagon', reg(5, -90, 120, 150, 158), '#8e6cdf', ['🏠']),
  poly2D('hexagon', reg(6, 0, 120), '#f78c3a', ['🐝', '🍯']),
  poly2D('octagon', reg(8, -67.5, 120), '#e63946', ['🛑']),
  poly2D('rhombus', [[150, 30], [245, 150], [150, 270], [55, 150]], '#ff9fb2', ['🪁', '🔶']),
  { id: 'oval', name: 'oval', dim: 2, color: '#4cc9f0', ellipse: [150, 150, 130, 85], straight: false, sides: 0, corners: 0, real: ['🥚', '🪞'],
    note: 'An oval has no straight sides and no corners – it is curved all the way round!' },

  polyhedron('cube', '#ef476f', boxPts(55, 115, 185, 245, 60, -55), BOX_FACES, BOX_EDGES, ['H'], ['🎲', '🧊', '🎁']),
  polyhedron('cuboid', '#118ab2', boxPts(30, 140, 205, 245, 65, -60), BOX_FACES, BOX_EDGES, ['H'], ['📦', '🧱', '🧃'], { also: 'rectangular prism' }),
  polyhedron('square pyramid', '#ffd166', { P: [150, 40], W: [50, 240], X: [200, 240], Y: [255, 185], Z: [105, 185] },
    [{ v: 'PWX', s: 0 }, { v: 'PXY', s: -1 }, { v: 'PYZ', h: 1 }, { v: 'PZW', h: 1 }, { v: 'WXYZ', h: 1 }],
    ['WX', 'XY', '-YZ', '-ZW', 'PW', 'PX', 'PY', '-PZ'], ['Z'], []),
  polyhedron('triangular prism', '#06d6a0', { L: [40, 240], R: [170, 240], T: [105, 130], M: [120, 190], N: [250, 190], O: [185, 80] },
    [{ v: 'LRT', s: 0 }, { v: 'RTON', s: 1 }, { v: 'LTOM', h: 1 }, { v: 'MNO', h: 1 }, { v: 'LRNM', h: 1 }],
    ['LR', 'RT', 'TL', 'RN', 'TO', 'NO', '-LM', '-MN', '-MO'], ['M'], ['⛺', '🧀']),
  { id: 'cylinder', name: 'cylinder', dim: 3, color: '#8e6cdf', rolls: true, real: ['🥫', '🔋', '🥁', '🕯️'],
    faces: [
      { d: 'M65,70 L65,230 A85,26 0 0,0 235,230 L235,70 A85,26 0 0,1 65,70 Z', shade: 0, curved: true },
      { d: ellD(150, 70, 85, 26), shade: 1 },
      { d: ellD(150, 230, 85, 26), hidden: true }],
    edges: [{ d: ellD(150, 70, 85, 26) }, { d: ellD(150, 230, 85, 26), nodraw: true }],
    vertices: [],
    outline: [{ d: 'M65,70 L65,230 M235,70 L235,230' }, { d: 'M65,230 A85,26 0 0,0 235,230' }, { d: 'M65,230 A85,26 0 0,1 235,230', dash: 1 }] },
  { id: 'cone', name: 'cone', dim: 3, color: '#f78c3a', rolls: true, real: ['🍦', '🎉'],
    faces: [
      { d: 'M150,40 L55,232 A95,28 0 0,0 245,232 Z', shade: 0, curved: true },
      { d: ellD(150, 232, 95, 28), hidden: true }],
    edges: [{ d: ellD(150, 232, 95, 28), nodraw: true }],
    vertices: [{ x: 150, y: 40 }],
    outline: [{ d: 'M150,40 L55,232 M150,40 L245,232' }, { d: 'M55,232 A95,28 0 0,0 245,232' }, { d: 'M55,232 A95,28 0 0,1 245,232', dash: 1 }] },
  { id: 'sphere', name: 'sphere', dim: 3, color: '#4cc9f0', rolls: true, real: ['⚽', '🌍', '🏀', '🍊'],
    faces: [{ d: ellD(150, 150, 110, 110), shade: 0, curved: true }], edges: [], vertices: [],
    outline: [{ d: ellD(150, 150, 110, 110) }, { d: 'M40,150 A110,32 0 0,0 260,150', thin: 1 }, { d: 'M40,150 A110,32 0 0,1 260,150', dash: 1, thin: 1 }],
    note: 'A sphere has one curved surface, no edges and no vertices. It rolls in every direction!' }
];
SHAPES.forEach(s => {
  if (s.dim === 3) { s.nFaces = s.faces.length; s.nEdges = s.edges.length; s.nVerts = s.vertices.length; }
});
const byId = id => SHAPES.find(s => s.id === id);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Draw a shape into a fresh <svg>
function shapeSVG(s) {
  const svg = svgEl('svg', { viewBox: '0 0 300 300' });
  const base = svgEl('g', {}, svg);
  if (s.dim === 2) {
    if (s.ellipse) { const [cx, cy, rx, ry] = s.ellipse; svgEl('ellipse', { cx, cy, rx, ry, fill: s.color, stroke: NAVY, 'stroke-width': 7 }, base); }
    else svgEl('path', { d: ptsD(s.pts), fill: s.color, stroke: NAVY, 'stroke-width': 7, 'stroke-linejoin': 'round' }, base);
  } else {
    s.faces.filter(f => !f.hidden).forEach(f => svgEl('path', { d: f.d, fill: shade(s.color, f.shade > 0 ? .35 : f.shade < 0 ? -.2 : 0) }, base));
    if (s.id === 'sphere') svgEl('ellipse', { cx: 110, cy: 105, rx: 28, ry: 18, fill: 'rgba(255,255,255,.45)', transform: 'rotate(-30 110 105)' }, base);
    s.outline.forEach(o => svgEl('path', { d: o.d, fill: 'none', stroke: NAVY, 'stroke-width': o.thin ? 3 : 6, 'stroke-dasharray': o.dash ? '10 8' : 'none', opacity: o.dash ? .6 : 1, 'stroke-linecap': 'round' }, base));
    s.edges.filter(e => !e.nodraw).forEach(e => svgEl('path', { d: e.d, fill: 'none', stroke: NAVY, 'stroke-width': 6, 'stroke-dasharray': e.hidden ? '10 8' : 'none', opacity: e.hidden ? .6 : 1, 'stroke-linecap': 'round' }, base));
  }
  return svg;
}
function propsFor(s) {
  return s.dim === 2
    ? [{ k: 'sides', t: 'Sides', n: s.sides }, { k: 'corners', t: 'Corners', n: s.corners }]
    : [{ k: 'faces', t: 'Faces', n: s.nFaces }, { k: 'edges', t: 'Edges', n: s.nEdges }, { k: 'vertices', t: 'Vertices (corners)', n: s.nVerts }];
}
function elementsFor(s, prop) {
  if (s.dim === 2) {
    if (!s.pts) return [];
    if (prop === 'corners') return s.pts.map(p => ({ kind: 'point', x: p[0], y: p[1] }));
    return s.pts.map((p, i) => { const q = s.pts[(i + 1) % s.pts.length]; return { kind: 'line', d: `M${p.join(',')} L${q.join(',')}` }; });
  }
  if (prop === 'faces') return s.faces.map(f => ({ kind: 'face', d: f.d, hidden: f.hidden, curved: f.curved }));
  if (prop === 'edges') return s.edges.map(e => ({ kind: 'line', d: e.d, hidden: e.hidden }));
  return s.vertices.map(v => ({ kind: 'point', x: v.x, y: v.y, hidden: v.hidden }));
}

// ===================== EXPLORE =====================
(() => {
  let cur = SHAPES[0], prop = null, els = [], counted = [], overlay, svg, nameHidden = false, realHidden = false;
  const HL = '#f78c3a';
  ['pick2', 'pick3'].forEach((id, i) => SHAPES.filter(s => s.dim === i + 2).forEach(s => {
    const b = h('button', 'pickbtn'); b.title = s.name; b.appendChild(shapeSVG(s)); b.dataset.id = s.id;
    b.onclick = () => { Sound.click(); select(s); };
    $('#' + id).appendChild(b);
  }));
  function select(s) {
    cur = s; prop = null;
    $$('.pickbtn').forEach(b => b.classList.toggle('sel', b.dataset.id === s.id));
    $('#sname').textContent = nameHidden ? '❓' : s.name + (s.also ? ` (${s.also})` : '');
    $('#sreal').textContent = realHidden ? '' : s.real.join('');
    const host = $('#stageHost'); host.innerHTML = '';
    svg = shapeSVG(s); svg.classList.add('bigsvg'); host.appendChild(svg);
    overlay = svgEl('g', {}, svg);
    const pb = $('#props'); pb.innerHTML = '';
    propsFor(s).forEach(p => {
      const b = h('button', 'btn alt', p.t); b.dataset.k = p.k;
      b.onclick = () => { Sound.click(); setProp(p.k); };
      pb.appendChild(b);
    });
    $('#tally').textContent = '';
    $('#cmsg').textContent = 'Choose what to count, then tap each one on the shape.';
  }
  function setProp(k) {
    prop = k; counted = [];
    $$('#props .btn').forEach(b => { b.classList.toggle('alt', b.dataset.k !== k); b.classList.toggle('sel', b.dataset.k === k); });
    overlay.innerHTML = '';
    els = elementsFor(cur, k);
    // hidden ones first so visible ones sit on top
    const order = [...els.keys()].sort((a, b) => (els[b].hidden ? 1 : 0) - (els[a].hidden ? 1 : 0));
    order.forEach(i => {
      const e = els[i], g = svgEl('g', {}, overlay);
      if (e.kind === 'face') {
        e.vis = svgEl('path', { d: e.d, fill: 'transparent', stroke: 'none' }, g);
        if (!e.hidden) { e.vis.classList.add('hit'); e.vis.onclick = () => count(i); }
        else e.vis.style.pointerEvents = 'none';
      } else if (e.kind === 'line') {
        e.vis = svgEl('path', { d: e.d, fill: 'none', stroke: 'transparent', 'stroke-width': 11, 'stroke-linecap': 'round' }, g);
        const hit = svgEl('path', { d: e.d, fill: 'none', stroke: 'transparent', 'stroke-width': 26, class: 'hit' }, g);
        hit.onclick = () => count(i);
      } else {
        e.vis = svgEl('circle', { cx: e.x, cy: e.y, r: 11, fill: 'transparent' }, g);
        const hit = svgEl('circle', { cx: e.x, cy: e.y, r: 22, fill: 'transparent', class: 'hit' }, g);
        hit.onclick = () => count(i);
      }
      e.g = g;
    });
    const total = els.length, p = propsFor(cur).find(p => p.k === k);
    $('#tally').textContent = `${p.t.split(' ')[0]}: 0`;
    $('#cmsg').textContent = total ? 'Tap each one to count it, or press “Count next”.' : (cur.note || `A ${cur.name} has no ${k}.`);
    if (!total) { $('#tally').textContent = `${p.t.split(' ')[0]}: 0`; }
  }
  function count(i) {
    if (!prop || counted.includes(i)) return;
    counted.push(i);
    const e = els[i], n = counted.length;
    if (e.kind === 'face') { e.vis.setAttribute('fill', e.hidden ? 'rgba(247,140,58,.25)' : 'rgba(247,140,58,.55)'); e.vis.setAttribute('stroke', HL); e.vis.setAttribute('stroke-width', 4); if (e.hidden) e.vis.setAttribute('stroke-dasharray', '8 6'); }
    else if (e.kind === 'line') { e.vis.setAttribute('stroke', HL); if (e.hidden) e.vis.setAttribute('stroke-dasharray', '12 8'); }
    else e.vis.setAttribute('fill', HL);
    // number badge
    let bx, by;
    if (e.kind === 'point') { bx = e.x + (e.x < 150 ? -24 : 24); by = e.y + (e.y < 150 ? -20 : 20); }
    else if (e.kind === 'line') { const L = e.vis.getTotalLength(), pt = e.vis.getPointAtLength(e.d.includes('A') ? L * .25 : L / 2); bx = pt.x; by = pt.y; }
    else { const bb = e.vis.getBBox(); bx = bb.x + bb.width / 2; by = bb.y + bb.height / 2 + (e.hidden ? 18 : 0); }
    bx = clamp(bx, 18, 282); by = clamp(by, 18, 282);
    const bg = svgEl('g', {}, overlay); bg.style.animation = 'pop .25s'; bg.style.transformOrigin = `${bx}px ${by}px`;
    svgEl('circle', { cx: bx, cy: by, r: 17, fill: '#fff', stroke: HL, 'stroke-width': 4 }, bg);
    svgEl('text', { x: bx, y: by + 7, 'text-anchor': 'middle', 'font-size': 20, fill: NAVY }, bg).textContent = n;
    Sound.pop(n);
    const p = propsFor(cur).find(p => p.k === prop);
    $('#tally').textContent = `${p.t.split(' ')[0]}: ${n}`;
    if (n === els.length) {
      Sound.good();
      let msg = `A ${cur.name} has ${n} ${n === 1 ? prop.replace(/s$/, '').replace('vertice', 'vertex') : prop}!`;
      if (prop === 'faces') { const c = els.filter(e => e.curved).length; if (c) msg = `A ${cur.name} has ${n} face${n > 1 ? 's' : ''}: ${n - c} flat and ${c} curved.`; }
      if (els.some(e => e.hidden)) msg += ' Some are hiding at the back!';
      $('#cmsg').textContent = msg;
    }
  }
  $('#cNext').onclick = () => {
    if (!prop) { const first = $('#props .btn'); if (first) first.click(); return; }
    const vis = els.findIndex((e, i) => !counted.includes(i) && !e.hidden);
    const i = vis >= 0 ? vis : els.findIndex((e, i) => !counted.includes(i));
    if (i >= 0) count(i);
  };
  $('#cReset').onclick = () => { Sound.click(); if (prop) setProp(prop); };
  $('#hideName').onclick = e => { nameHidden = !nameHidden; e.target.textContent = nameHidden ? '👀 Show name' : '🙈 Hide name'; select(cur); };
  $('#hideReal').onclick = e => { realHidden = !realHidden; e.target.textContent = realHidden ? 'Show real-life objects' : 'Hide real-life objects'; $('#sreal').textContent = realHidden ? '' : cur.real.join(''); };
  select(SHAPES[0]);
})();

// ===================== SORT =====================
(() => {
  const realItems = [];
  [['sphere', 'Sphere'], ['cylinder', 'Cylinder'], ['cone', 'Cone'], ['cube', 'Cube / cuboid'], ['cuboid', 'Cube / cuboid']]
    .forEach(([id, bin]) => byId(id).real.forEach(e => realItems.push({ emoji: e, key: bin })));
  const RULES = {
    dim: { q: 'Is it a flat 2D shape or a solid 3D object?', bins: [['2', '2D shape (flat)'], ['3', '3D object (solid)']], items: () => SHAPES.map(s => ({ shape: s, key: String(s.dim) })) },
    curve: { q: 'Does it have only straight sides, or curves?', bins: [['s', 'Only straight sides'], ['c', 'Has curves']], items: () => SHAPES.filter(s => s.dim === 2).map(s => ({ shape: s, key: s.straight ? 's' : 'c' })) },
    sides: { q: 'How many sides does it have?', bins: [['3', '3 sides'], ['4', '4 sides'], ['5', '5 or more sides']], items: () => SHAPES.filter(s => s.dim === 2 && s.straight).map(s => ({ shape: s, key: String(Math.min(s.sides, 5)) })) },
    roll: { q: 'Can this object roll?', bins: [['r', 'Can roll 🛞'], ['n', 'Cannot roll']], items: () => SHAPES.filter(s => s.dim === 3).map(s => ({ shape: s, key: s.rolls ? 'r' : 'n' })) },
    real: { q: 'What 3D shape is this everyday object?', bins: [['Sphere', 'Sphere'], ['Cylinder', 'Cylinder'], ['Cone', 'Cone'], ['Cube / cuboid', 'Cube / cuboid']], items: () => realItems }
  };
  let rule = 'dim', queue = [], cur, firstTry, right, total, busy;
  function itemNode(it, small) {
    if (it.emoji) return h('span', '', it.emoji);
    const s = shapeSVG(it.shape); return s;
  }
  function start() {
    const R = RULES[rule];
    queue = shuffle(R.items()).slice(0, 10); right = 0; total = queue.length;
    $('#sortPrompt').textContent = R.q;
    const bins = $('#bins'); bins.innerHTML = '';
    R.bins.forEach(([k, t]) => {
      const b = h('div', 'bin'); b.dataset.k = k;
      b.appendChild(h('div', 't', t)); b.appendChild(h('div', 'tray'));
      b.onclick = () => drop(b);
      bins.appendChild(b);
    });
    next();
  }
  function next() {
    busy = false; setFeedback($('#sortFb'), '');
    $('#sortScore').textContent = `⭐ ${right} · ${total - queue.length} / ${total}`;
    const host = $('#sortItem'); host.innerHTML = '';
    cur = queue.shift();
    if (!cur) {
      Sound.win(); confetti();
      host.innerHTML = '';
      const done = h('div', 'sortcard'); done.textContent = '🏆'; host.appendChild(done);
      setFeedback($('#sortFb'), `All sorted! ${right} out of ${total} right first time.`, 'good');
      const again = h('button', 'btn big', 'Play again ▶'); again.onclick = start; again.style.marginLeft = '20px';
      host.appendChild(again);
      return;
    }
    firstTry = true;
    const card = h('div', 'sortcard'); card.appendChild(itemNode(cur)); card.style.animation = 'pop .3s';
    host.appendChild(card);
  }
  async function drop(bin) {
    if (!cur || busy) return;
    if (bin.dataset.k === cur.key) {
      busy = true; Sound.good(); if (firstTry) right++;
      $('.tray', bin).appendChild(itemNode(cur, true));
      const name = cur.shape ? `A ${cur.shape.name}` : 'Yes';
      setFeedback($('#sortFb'), cur.shape ? `${name} – well done!` : 'Well done!', 'good');
      await sleep(900); next();
    } else {
      firstTry = false; Sound.bad(); restartAnim(bin, 'shake');
      setFeedback($('#sortFb'), 'Hmm, look again – try another group!', 'bad');
    }
  }
  makeSeg($('#sortRule'), v => { rule = v; start(); });
  start();
})();

// ===================== RACE TO THE TOP =====================
(() => {
  let steps = 8, dim = 'both', pos = [0, 0], turn = 0, over = false, lastId = null, climbed = -1;
  const tracks = [$('#trackA'), $('#trackB')];
  const teamName = i => ($(i ? '#teamB' : '#teamA').value.trim() || (i ? 'Blue Team' : 'Red Team'));
  function pool() { return SHAPES.filter(s => dim === 'both' || String(s.dim) === dim); }
  function drawTracks() {
    tracks.forEach((t, i) => {
      t.innerHTML = '';
      t.appendChild(h('div', 'trophy', '🏆'));
      const lad = h('div', 'ladder');
      for (let k = 1; k <= steps; k++) { const st = h('div', 'step' + (k <= pos[i] ? ' done' : '') + (i === climbed && k === pos[i] ? ' top' : '')); st.appendChild(h('span', '', k)); lad.appendChild(st); }
      t.appendChild(lad);
      t.appendChild(h('div', 'tname', teamName(i)));
      t.classList.toggle('active', i === turn && !over);
    });
    $('#turn').innerHTML = over ? '' : `<span style="color:${turn ? 'var(--blue)' : 'var(--red)'}">${teamName(turn)}</span>, your turn!`;
  }
  function makeQ() {
    const P = pool();
    let s; do { s = pick(P); } while (s.id === lastId && P.length > 1); lastId = s.id;
    const types = ['name', 'count', 'count', 'which'];
    if (s.real.length) types.push('real');
    const type = pick(types);
    const others = n => shuffle(P.filter(x => x.id !== s.id && x.dim === s.dim)).slice(0, n);
    if (type === 'name') return { prompt: 'What is this shape called?', vis: shapeSVG(s), values: shuffle([s, ...others(3)]).map(x => x.name), correct: s.name, txt: true };
    if (type === 'real') return { prompt: 'Which shape is this like?', vis: h('span', '', pick(s.real)), values: shuffle([s, ...others(3)]).map(x => x.name), correct: s.name, txt: true };
    if (type === 'which') {
      const opts = shuffle([s, ...others(3)]);
      return { prompt: `Which one is a ${s.name}?`, vis: null, values: opts.map(x => x.id), correct: s.id, render: (b, id) => b.appendChild(shapeSVG(byId(id))) };
    }
    const p = pick(propsFor(s));
    const word = p.k === 'vertices' ? 'vertices (corners)' : p.k;
    return { prompt: `How many ${word} does a ${s.name} have?`, vis: shapeSVG(s), values: numberChoices(p.n, 4, 0, 12), correct: p.n };
  }
  function ask() {
    $('#rnext').hidden = true; setFeedback($('#rfb'), '');
    const q = makeQ();
    $('#rq').textContent = q.prompt;
    const vis = $('#rvis'); vis.innerHTML = ''; if (q.vis) vis.appendChild(q.vis);
    vis.style.minHeight = q.vis ? '' : '0';
    renderChoices($('#rch'), q.values, q.correct, async ok => {
      if (q.txt) $$('#rch .choice').forEach(b => b.classList.add('txt'));
      if (ok) {
        pos[turn]++; climbed = turn;
        setFeedback($('#rfb'), `Correct! ${teamName(turn)} climbs up! 🧗`, 'good');
        drawTracks();
        if (pos[turn] >= steps) { over = true; drawTracks(); await sleep(500); win(turn); return; }
      } else setFeedback($('#rfb'), 'Not this time!', 'bad');
      $('#rnext').hidden = false;
    }, { render: q.render });
    if (q.txt) $$('#rch .choice').forEach(b => b.classList.add('txt'));
  }
  function win(i) {
    Sound.win(); confetti(220);
    const w = h('div', 'winner'); const box = h('div');
    box.innerHTML = `🏆<br>${teamName(i)} wins!<br>`;
    const b = h('button', 'btn big green', 'Play again'); b.onclick = () => { w.remove(); start(); };
    box.appendChild(b); w.appendChild(box); document.body.appendChild(w);
  }
  function start() { climbed = -1; pos = [0, 0]; turn = 0; over = false; drawTracks(); ask(); }
  $('#rnext').onclick = () => { Sound.click(); climbed = -1; turn = 1 - turn; drawTracks(); ask(); };
  $('#raceStart').onclick = () => { Sound.click(); start(); };
  makeSeg($('#raceSteps'), v => { steps = +v; start(); });
  makeSeg($('#raceDim'), v => { dim = v; start(); });
  ['#teamA', '#teamB'].forEach(id => $(id).addEventListener('input', drawTracks));
  start();
})();

}
