import { $, $$, rand, pick, sleep, clamp, svgEl, numberChoices, tween, restartAnim, Sound, makeSeg, renderChoices, setFeedback, burst } from '../common';

export const markup = `
<nav class="tabs">
  <button class="tab active" data-tab="hop">🐸 How many hops?</button>
  <button class="tab" data-tab="land">🪷 Where will I land?</button>
  <button class="tab" data-tab="free">🎈 Free hopping</button>
</nav>
<main>
  <section class="panel" data-panel="hop">
    <div class="toolbar">
      <span class="label">Number line to</span>
      <div class="seg" id="hpMax"><button data-v="10" class="sel">10</button><button data-v="20">20</button></div>
      <span class="label">Hop</span>
      <div class="seg" id="hpDir"><button data-v="fwd" class="sel">Forwards ➕</button><button data-v="both">Both ways ➕➖</button></div>
      <span class="spacer"></span>
      <span class="score" id="hpScore">⭐ 0</span>
    </div>
    <div class="prompt" id="hpPrompt"></div>
    <div class="pond"><svg class="nlsvg" id="hpSvg" viewBox="0 0 1000 260"></svg></div>
    <div class="choices" id="hpChoices"></div>
    <div class="equation nl-eq" id="hpEq"></div>
    <div class="feedback" id="hpFb"></div>
    <div class="btnrow"><button class="btn big" id="hpNext">Next ▶</button></div>
  </section>

  <section class="panel" data-panel="land" hidden>
    <div class="toolbar">
      <span class="label">Number line to</span>
      <div class="seg" id="ldMax"><button data-v="10" class="sel">10</button><button data-v="20">20</button></div>
      <span class="label">Hop</span>
      <div class="seg" id="ldDir"><button data-v="fwd" class="sel">Forwards ➕</button><button data-v="both">Both ways ➕➖</button></div>
      <span class="spacer"></span>
      <span class="score" id="ldScore">⭐ 0</span>
    </div>
    <div class="prompt" id="ldPrompt"></div>
    <div class="hint-line">Tap the lily pad where the frog will land.</div>
    <div class="pond"><svg class="nlsvg" id="ldSvg" viewBox="0 0 1000 260"></svg></div>
    <div class="equation nl-eq" id="ldEq"></div>
    <div class="feedback" id="ldFb"></div>
    <div class="btnrow"><button class="btn big" id="ldNext">Next ▶</button></div>
  </section>

  <section class="panel" data-panel="free" hidden>
    <div class="toolbar">
      <span class="label">Number line to</span>
      <div class="seg" id="frMax"><button data-v="10">10</button><button data-v="20" class="sel">20</button></div>
      <span class="spacer"></span>
      <button class="btn alt" id="frReset">↺ Back to 0</button>
    </div>
    <div class="pond"><svg class="nlsvg" id="frSvg" viewBox="0 0 1000 260"></svg></div>
    <div class="hopbtns" id="frBtns">
      <button class="btn red" data-d="-10">−10</button><button class="btn red" data-d="-5">−5</button><button class="btn red" data-d="-1">−1</button>
      <button class="btn green" data-d="1">+1</button><button class="btn green" data-d="2">+2</button><button class="btn green" data-d="5">+5</button><button class="btn green" data-d="10">+10</button>
    </div>
    <div class="equation nl-eq" id="frEq">🐸 is on 0</div>
    <div class="hoplog" id="frLog"></div>
  </section>
</main>`;

export function init() {
  const BASE = 170;

  // ---------- a pond with a number line, lily pads and a frog ----------
  function Pond(svg, onPad) {
    let max = 10, pos = 0, frog, arcs, pads = [], flower = null;
    const X = i => 50 + i * (900 / max);
    function build(m, start) {
      max = m; pos = start; svg.innerHTML = ''; pads = []; flower = null;
      svgEl('rect', { x: 0, y: 118, width: 1000, height: 142, rx: 34, fill: '#bfe9f5' }, svg);
      for (let k = 0; k < 6; k++) svgEl('path', { d: `M${60 + k * 160},232 q20,-10 40,0 t40,0`, fill: 'none', stroke: '#8fd3ea', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      svgEl('line', { x1: 26, y1: BASE, x2: 974, y2: BASE, stroke: '#0b6a8a', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      arcs = svgEl('g', {}, svg);
      const rx = max > 10 ? 19 : 30;
      for (let i = 0; i <= max; i++) {
        const g = svgEl('g', { class: 'pad' + (onPad ? ' pickable' : '') }, svg);
        g.style.transformOrigin = `${X(i)}px ${BASE}px`;
        g.lily = svgEl('ellipse', { cx: X(i), cy: BASE, rx, ry: rx * .45, fill: '#3dbb6b', stroke: '#1f8a49', 'stroke-width': 3 }, g);
        svgEl('text', { x: X(i), y: BASE + 50, 'text-anchor': 'middle', 'font-size': max > 10 ? 24 : 32, fill: '#073b4c' }, g).textContent = i;
        if (onPad) { svgEl('rect', { x: X(i) - 900 / max / 2, y: 110, width: 900 / max, height: 150, fill: 'transparent' }, g); g.onclick = () => onPad(i, g); }
        pads.push(g);
      }
      frog = svgEl('text', { x: X(pos), y: BASE - 10, 'text-anchor': 'middle', 'font-size': max > 10 ? 46 : 60, class: 'frog' }, svg);
      frog.textContent = '🐸';
    }
    function setFlower(i) {
      flower = svgEl('text', { x: X(i), y: BASE - 14, 'text-anchor': 'middle', 'font-size': max > 10 ? 34 : 44, class: 'flower' }, svg);
      flower.textContent = '🪷';
      svg.appendChild(frog); // keep frog on top
    }
    async function hop(delta, label) {
      const from = pos, to = pos + delta;
      const x0 = X(from), x1 = X(clamp(to, -0.6, max + 0.6));
      const height = 70 + Math.min(Math.abs(delta), 10) * 8;
      svgEl('path', { d: `M${x0},${BASE - 32} Q${(x0 + x1) / 2},${BASE - 32 - height * 2} ${x1},${BASE - 32}`, fill: 'none', stroke: delta > 0 ? '#f78c3a' : '#8e6cdf', 'stroke-width': 4, 'stroke-dasharray': '9 7', class: 'arc' }, arcs);
      if (label != null) {
        const t = svgEl('text', { x: (x0 + x1) / 2, y: BASE - 40 - height, 'text-anchor': 'middle', 'font-size': max > 10 ? 22 : 26, fill: delta > 0 ? '#c2601a' : '#5b3fb5', class: 'arclabel' }, arcs);
        t.textContent = label;
      }
      Sound.tone(420 + Math.random() * 120, .12, 'sine', 0, .12);
      await tween(Math.abs(delta) > 1 ? 560 : 380, t => {
        frog.setAttribute('x', x0 + (x1 - x0) * t);
        frog.setAttribute('y', BASE - 10 - Math.sin(Math.PI * t) * height);
      });
      pos = to;
      if (to >= 0 && to <= max) restartAnim(pads[to], 'squish');
    }
    async function splash() {
      const s = svgEl('text', { x: frog.getAttribute('x'), y: BASE + 4, 'text-anchor': 'middle', 'font-size': 56, class: 'splash' }, svg);
      s.textContent = '💦'; Sound.tone(160, .35, 'sine', 0, .14);
      frog.style.opacity = .35;
      await sleep(900); s.remove(); frog.style.opacity = 1;
    }
    async function goTo(i) { // quick slide back (e.g. after a wrong try)
      const x0 = +frog.getAttribute('x'), x1 = X(i);
      await tween(450, t => { frog.setAttribute('x', x0 + (x1 - x0) * t); frog.setAttribute('y', BASE - 10 - Math.sin(Math.PI * t) * 40); });
      pos = i; arcs.innerHTML = '';
    }
    return { build, setFlower, hop, splash, goTo, get pos() { return pos; }, get max() { return max; }, pads: () => pads, clearArcs: () => arcs.innerHTML = '' };
  }
  const starKeeper = el => { let n = 0; return () => { n++; el.textContent = `⭐ ${n}`; }; };
  function makeProblem(max, dir) {
    for (;;) {
      const back = dir === 'both' && Math.random() < .5;
      const k = rand(1, Math.min(max - 1, max > 10 ? 9 : 6));
      const start = back ? rand(k, max) : rand(0, max - k);
      const end = back ? start - k : start + k;
      if (end >= 0 && end <= max && start !== end) return { start, end, k, sign: back ? -1 : 1 };
    }
  }

  // ---------- How many hops? ----------
  (() => {
    let max = 10, dir = 'fwd', p;
    const pond = Pond($('#hpSvg')), star = starKeeper($('#hpScore'));
    function round() {
      p = makeProblem(max, dir);
      pond.build(max, p.start); pond.setFlower(p.end);
      $('#hpPrompt').innerHTML = `🐸 is on <b>${p.start}</b>. How many hops ${p.sign > 0 ? 'forwards' : 'backwards'} to the 🪷 on <b>${p.end}</b>?`;
      $('#hpEq').textContent = `${p.start} ${p.sign > 0 ? '+' : '−'} ? = ${p.end}`;
      setFeedback($('#hpFb'), '');
      renderChoices($('#hpChoices'), numberChoices(p.k, 4, 1, max), p.k, async (ok, v) => {
        const btns = $$('#hpChoices button'); btns.forEach(b => b.style.pointerEvents = 'none');
        pond.clearArcs();
        for (let i = 1; i <= v; i++) {
          await pond.hop(p.sign, i);
          if (pond.pos < 0 || pond.pos > max) break;
        }
        if (ok) {
          star();
          $('#hpEq').textContent = `${p.start} ${p.sign > 0 ? '+' : '−'} ${p.k} = ${p.end}`;
          setFeedback($('#hpFb'), `Yes! ${p.k} hops lands on the lily flower! 🪷`, 'good');
        } else {
          await pond.splash();
          const landed = p.start + p.sign * v;
          setFeedback($('#hpFb'), landed < 0 || landed > max ? 'Splash! Off the end of the line – try again!' : `Splash! ${v} hops lands on ${landed}. Try again!`, 'bad');
          await pond.goTo(p.start);
          btns.forEach(b => b.style.pointerEvents = '');
        }
      }, { retry: true });
    }
    makeSeg($('#hpMax'), v => { max = +v; round(); });
    makeSeg($('#hpDir'), v => { dir = v; round(); });
    $('#hpNext').onclick = () => { Sound.click(); round(); };
    round();
  })();

  // ---------- Where will I land? ----------
  (() => {
    let max = 10, dir = 'fwd', p, busy = false, done = false;
    const star = starKeeper($('#ldScore'));
    const pond = Pond($('#ldSvg'), async (i, g) => {
      if (busy || done) return;
      busy = true; Sound.click();
      g.lily.setAttribute('fill', '#ffd166');
      pond.clearArcs();
      for (let s = 1; s <= p.k; s++) await pond.hop(p.sign, s);
      if (i === p.end) {
        done = true; Sound.good(); star();
        g.lily.setAttribute('fill', '#06d6a0');
        $('#ldEq').textContent = `${p.start} ${p.sign > 0 ? '+' : '−'} ${p.k} = ${p.end}`;
        setFeedback($('#ldFb'), `Spot on! The frog landed on ${p.end}! 🎉`, 'good');
      } else {
        Sound.bad();
        g.lily.setAttribute('fill', '#ef476f');
        setFeedback($('#ldFb'), `It landed on ${p.end}, not ${i}. Watch the hops and try again!`, 'bad');
        await sleep(900);
        g.lily.setAttribute('fill', '#3dbb6b');
        await pond.goTo(p.start);
      }
      busy = false;
    });
    function round() {
      p = makeProblem(max, dir); done = false; busy = false;
      pond.build(max, p.start);
      $('#ldPrompt').innerHTML = `🐸 is on <b>${p.start}</b> and hops <b>${p.k}</b> ${p.sign > 0 ? 'forwards' : 'backwards'}. Where will it land?`;
      $('#ldEq').textContent = `${p.start} ${p.sign > 0 ? '+' : '−'} ${p.k} = ?`;
      setFeedback($('#ldFb'), '');
    }
    makeSeg($('#ldMax'), v => { max = +v; round(); });
    makeSeg($('#ldDir'), v => { dir = v; round(); });
    $('#ldNext').onclick = () => { Sound.click(); round(); };
    round();
  })();

  // ---------- Free hopping ----------
  (() => {
    let max = 20, busy = false;
    const pond = Pond($('#frSvg'));
    const log = $('#frLog');
    function reset() { pond.build(max, 0); $('#frEq').textContent = '🐸 is on 0'; log.innerHTML = ''; }
    $('#frBtns').addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      const d = +b.dataset.d, from = pond.pos, to = from + d;
      if (to < 0 || to > max) { Sound.bad(); restartAnim(b, 'shake'); $('#frEq').textContent = `Oops! ${from} ${d > 0 ? '+' : '−'} ${Math.abs(d)} is off the line`; return; }
      busy = true;
      if (Math.abs(d) <= 2) for (let i = 0; i < Math.abs(d); i++) await pond.hop(Math.sign(d), null);
      else await pond.hop(d, (d > 0 ? '+' : '−') + Math.abs(d));
      const eq = `${from} ${d > 0 ? '+' : '−'} ${Math.abs(d)} = ${to}`;
      $('#frEq').textContent = eq;
      const chip = document.createElement('span'); chip.className = 'chip ' + (d > 0 ? 'up' : 'down'); chip.textContent = eq;
      log.prepend(chip); while (log.children.length > 8) log.lastChild.remove();
      if (to === max) burst($('#frEq'));
      busy = false;
    });
    makeSeg($('#frMax'), v => { max = +v; reset(); });
    $('#frReset').onclick = () => { Sound.click(); reset(); };
    reset();
  })();
}
