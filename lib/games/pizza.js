import { $, $$, rand, pick, shuffle, sleep, svgEl, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback, burst } from '../common';

export const markup = `
<nav class="tabs">
  <button class="tab active" data-tab="orders">🧑‍🍳 Take orders</button>
  <button class="tab" data-tab="name">🔍 Name the fraction</button>
  <button class="tab" data-tab="bigger">⚖️ Bigger slice?</button>
</nav>
<main>
  <section class="panel" data-panel="orders">
    <div class="toolbar">
      <span class="label">Menu</span>
      <div class="seg" id="poLevel"><button data-v="1" class="sel">Halves &amp; quarters</button><button data-v="2">All fractions</button></div>
      <span class="spacer"></span>
      <span class="score" id="poScore">🍕 0 served</span>
    </div>
    <div class="pizzeria">
      <div class="customer">
        <div class="cust-face" id="poFace">🧒</div>
        <div class="bubble" id="poBubble"></div>
        <div class="reaction" id="poReact"></div>
      </div>
      <div class="kitchen">
        <svg class="pizza" id="poSvg" viewBox="-10 -10 320 320"></svg>
        <div class="cutbar"><span class="label">🔪 Cut into</span><div class="seg" id="poCut"><button data-v="1" class="sel">1</button><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button><button data-v="6">6</button><button data-v="8">8</button></div></div>
        <div class="hint-line" id="poHint">Cut the pizza, then tap slices to add toppings.</div>
      </div>
    </div>
    <div class="feedback" id="poFb"></div>
    <div class="btnrow">
      <button class="btn alt" id="poClear">🧽 Clear toppings</button>
      <button class="btn green big" id="poServe">🛎️ Serve!</button>
      <button class="btn big" id="poNext">Next customer ▶</button>
    </div>
  </section>

  <section class="panel" data-panel="name" hidden>
    <div class="toolbar">
      <span class="label">Menu</span>
      <div class="seg" id="pnLevel"><button data-v="1" class="sel">Halves &amp; quarters</button><button data-v="2">All fractions</button></div>
      <span class="spacer"></span>
      <span class="score" id="pnScore">⭐ 0 / 0</span>
    </div>
    <div class="prompt" id="pnPrompt"></div>
    <div class="center"><svg class="pizza" id="pnSvg" viewBox="-10 -10 320 320"></svg></div>
    <div class="choices" id="pnChoices"></div>
    <div class="feedback" id="pnFb"></div>
    <div class="btnrow"><button class="btn big" id="pnNext">Next ▶</button></div>
  </section>

  <section class="panel" data-panel="bigger" hidden>
    <div class="toolbar"><span class="spacer"></span><span class="score" id="pbScore">⭐ 0</span></div>
    <div class="prompt" id="pbPrompt">Which slice is bigger? Tap it!</div>
    <div class="twopizzas" id="pbPizzas"></div>
    <div class="feedback" id="pbFb"></div>
    <div class="btnrow"><button class="btn big" id="pbNext">Next ▶</button></div>
  </section>
</main>`;

export function init() {
  const TOPPINGS = [
    { e: '🍅', n: 'tomato' }, { e: '🍄', n: 'mushroom' }, { e: '🫒', n: 'olives' },
    { e: '🍍', n: 'pineapple' }, { e: '🌶️', n: 'peppers' }, { e: '🌽', n: 'sweetcorn' }
  ];
  const CUSTOMERS = ['🧒', '👧', '👦', '👩', '👨‍🦱', '👵', '🐻', '🐼', '🦊', '🐸', '🐵', '🐯'];
  const C = 150, R = 128;
  const frac = (k, n) => `<span class="frac"><b>${k}</b><i>${n}</i></span>`;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const FR_WORDS = { 2: 'half', 3: 'third', 4: 'quarter', 6: 'sixth', 8: 'eighth' };

  // ---------- pizza drawing ----------
  function wedge(i, n) {
    if (n === 1) return `M${C - R},${C} A${R},${R} 0 1,1 ${C + R},${C} A${R},${R} 0 1,1 ${C - R},${C} Z`;
    const a0 = (-90 + i * 360 / n) * Math.PI / 180, a1 = (-90 + (i + 1) * 360 / n) * Math.PI / 180;
    return `M${C},${C} L${C + R * Math.cos(a0)},${C + R * Math.sin(a0)} A${R},${R} 0 0,1 ${C + R * Math.cos(a1)},${C + R * Math.sin(a1)} Z`;
  }
  function drawPizza(svg, n, topped, topping, opts = {}) {
    svg.innerHTML = '';
    svgEl('circle', { cx: C, cy: C, r: R + 12, fill: '#d9944a', stroke: '#b5712c', 'stroke-width': 4 }, svg);
    svgEl('circle', { cx: C, cy: C, r: R, fill: '#e8553a' }, svg);
    svgEl('circle', { cx: C, cy: C, r: R - 6, fill: '#ffd66e' }, svg);
    for (let k = 0; k < 14; k++) { // cheesy bubbles
      const a = k * 2.4, rr = 20 + (k * 37) % (R - 30);
      svgEl('circle', { cx: C + rr * Math.cos(a), cy: C + rr * Math.sin(a), r: 5 + (k % 3) * 3, fill: '#ffe9a8', opacity: .8 }, svg);
    }
    for (let i = 0; i < n; i++) {
      const g = svgEl('g', { class: 'slice' + (opts.onSlice ? ' pickable' : '') }, svg);
      const mid = (-90 + (i + .5) * 360 / n) * Math.PI / 180;
      if (opts.pull === i) g.setAttribute('transform', `translate(${Math.cos(mid) * 16},${Math.sin(mid) * 16})`);
      const p = svgEl('path', { d: wedge(i, n), fill: topped.has(i) ? 'rgba(255,255,255,.08)' : 'transparent', stroke: '#9c5b1f', 'stroke-width': n > 1 ? 4 : 0, 'stroke-linejoin': 'round' }, g);
      if (opts.pull === i) { p.setAttribute('stroke', '#073b4c'); p.setAttribute('stroke-width', 7); }
      if (topped.has(i)) {
        const tg = svgEl('g', { class: opts.fresh === i ? 'toppings fresh' : 'toppings' }, g);
        const spots = n === 1 ? [[0, 0], [55, 0.3], [55, 2.4], [55, 4.5], [90, 1.3], [90, 3.4], [90, 5.5]] : null;
        const size = n >= 8 ? 22 : n >= 6 ? 26 : 32;
        const pts = spots ? spots.map(([r, a]) => [C + r * Math.cos(a), C + r * Math.sin(a)])
          : (n >= 6 ? [.45, .78] : [.32, .6, .85]).map((f, j) => {
            const off = n >= 6 ? 0 : (j - 1) * 0.18;
            return [C + R * f * Math.cos(mid + off * (n <= 2 ? 2 : 1)), C + R * f * Math.sin(mid + off * (n <= 2 ? 2 : 1))];
          });
        pts.forEach(([x, y], j) => {
          const t = svgEl('text', { x, y: y + size * .35, 'text-anchor': 'middle', 'font-size': size }, tg);
          t.textContent = topping.e; t.style.animationDelay = j * 60 + 'ms';
        });
      }
      if (opts.onSlice) g.onclick = () => opts.onSlice(i);
    }
  }

  function orderFor(level) {
    const opts = level === '1'
      ? [[1, 2], [1, 4], [2, 4], [3, 4], [2, 2], [4, 4]]
      : [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [2, 6], [1, 8], [3, 8], [5, 8], [6, 8], [4, 8]];
    const [k, n] = pick(opts);
    return { k, n, topping: pick(TOPPINGS) };
  }

  // ---------- Take orders ----------
  (() => {
    let level = '1', order, n = 1, topped = new Set(), served = 0, done = false;
    const svg = $('#poSvg');
    const cutSeg = $('#poCut');
    function redraw(fresh) { drawPizza(svg, n, topped, order.topping, { onSlice: tap, fresh }); }
    function tap(i) {
      if (done) return;
      if (topped.has(i)) topped.delete(i); else { topped.add(i); Sound.pop(topped.size); }
      redraw(topped.has(i) ? i : undefined);
      $('#poHint').innerHTML = n > 1 ? `${frac(topped.size, n)} has ${order.topping.e} ${order.topping.n}` : (topped.size ? `Whole pizza has ${order.topping.e}` : 'Cut the pizza, then tap slices to add toppings.');
    }
    function setCut(v) {
      n = v; topped = new Set();
      $$('button', cutSeg).forEach(b => b.classList.toggle('sel', +b.dataset.v === v));
      redraw();
      $('#poHint').innerHTML = v > 1 ? `Cut into ${v} equal slices. Now tap slices to add ${order.topping.e}` : 'Cut the pizza, then tap slices to add toppings.';
    }
    function round() {
      order = orderFor(level); done = false;
      const face = $('#poFace'); face.textContent = pick(CUSTOMERS); restartAnim(face, 'walkin');
      $('#poReact').textContent = '';
      const whole = order.k === order.n;
      const words = whole ? `${order.topping.e} ${order.topping.n} on the <b>whole</b> pizza (${frac(order.k, order.n)})`
        : level === '1' ? `${order.topping.e} ${order.topping.n} on <b>${order.k} ${FR_WORDS[order.n]}${order.k > 1 ? 's' : ''}</b> – that's ${frac(order.k, order.n)} of the pizza`
        : `${order.topping.e} ${order.topping.n} on ${frac(order.k, order.n)} of my pizza`;
      $('#poBubble').innerHTML = `Hello! Please cut my pizza into <b>equal slices</b> and put ${words}!`;
      restartAnim($('#poBubble'), 'bump');
      setFeedback($('#poFb'), '');
      setCut(1);
    }
    makeSeg(cutSeg, v => { if (!done) setCut(+v); });
    $('#poClear').onclick = () => { if (done) return; topped = new Set(); redraw(); Sound.click(); };
    $('#poServe').onclick = async () => {
      if (done) return;
      const k = topped.size;
      // accepts equivalent fractions too, e.g. 2/4 for 1/2
      const ok = k > 0 && k * order.n === order.k * n;
      const react = $('#poReact');
      if (ok) {
        done = true; served++; Sound.good();
        $('#poScore').textContent = `🍕 ${served} served`;
        react.textContent = pick(['😋', '🤩', '😍', '🥳']); restartAnim(react, 'popreact');
        const same = n !== order.n && order.k !== order.n;
        $('#poBubble').innerHTML = same ? `Yum! ${frac(k, n)} is the same as ${frac(order.k, order.n)} – clever chef!` : 'Yum yum! Thank you, chef! 🍕';
        setFeedback($('#poFb'), `Order complete! ${order.k}/${order.n} with ${order.topping.e} ${order.topping.n}`, 'good');
        burst($('#poSvg'), 14, ['🍕', '⭐', '✨']);
        if (served % 5 === 0) confetti();
      } else {
        Sound.bad();
        react.textContent = '🤔'; restartAnim(react, 'popreact');
        const equal = n > 1 ? '' : 'Remember to cut it into equal slices first! ';
        $('#poBubble').innerHTML = `Hmm… ${equal}I asked for ${frac(order.k, order.n)}, but this is ${n > 1 ? frac(k, n) : (k ? 'the whole pizza' : 'no toppings')}.`;
        restartAnim($('#poSvg'), 'shake');
      }
    };
    $('#poNext').onclick = () => { Sound.click(); round(); };
    makeSeg($('#poLevel'), v => { level = v; round(); });
    round();
  })();

  // ---------- Name the fraction ----------
  (() => {
    let level = '1', right = 0, total = 0;
    function round() {
      const o = orderFor(level);
      const set = new Set(shuffle([...Array(o.n).keys()]).slice(0, o.k));
      drawPizza($('#pnSvg'), o.n, set, o.topping);
      $('#pnPrompt').innerHTML = `What fraction of the pizza has ${o.topping.e} ${o.topping.n}?`;
      setFeedback($('#pnFb'), '');
      const ans = `${o.k}/${o.n}`, opts = new Set([ans]);
      const cands = shuffle([`${o.n - o.k}/${o.n}`, `${o.k}/${o.n + (o.n < 8 ? 2 : -2)}`, `${o.n}/${o.k}`, `${Math.max(1, o.k - 1)}/${o.n}`, `${Math.min(o.n, o.k + 1)}/${o.n}`, `1/${o.k + 1}`]);
      cands.forEach(c => { if (opts.size < 4 && c !== ans && !c.startsWith('0/')) opts.add(c); });
      renderChoices($('#pnChoices'), shuffle([...opts]), ans, ok => {
        total++; if (ok) right++;
        $('#pnScore').textContent = `⭐ ${right} / ${total}`;
        const g = gcd(o.k, o.n), simp = g > 1 ? ` (that's the same as ${o.k / g}/${o.n / g})` : '';
        setFeedback($('#pnFb'), ok ? `Yes! ${o.k} out of ${o.n} slices = ${ans}${simp} 🍕` : `It's ${ans}: ${o.k} slices with ${o.topping.e} out of ${o.n} slices.`, ok ? 'good' : 'bad');
      }, { render: (b, v) => { const [k, n] = v.split('/'); b.innerHTML = frac(k, n); } });
    }
    makeSeg($('#pnLevel'), v => { level = v; round(); });
    $('#pnNext').onclick = () => { Sound.click(); round(); };
    round();
  })();

  // ---------- Bigger slice? ----------
  (() => {
    let stars = 0, done = false;
    function round() {
      done = false; setFeedback($('#pbFb'), '');
      const [a, b] = shuffle([2, 3, 4, 6, 8]).slice(0, 2);
      const q = pick(['bigger', 'smaller']);
      $('#pbPrompt').innerHTML = `Which slice is <u>${q}</u>? Tap it!`;
      const host = $('#pbPizzas'); host.innerHTML = '';
      [a, b].forEach(n => {
        const card = document.createElement('button'); card.className = 'pizzacard';
        const svg = svgEl('svg', { class: 'pizza', viewBox: '-20 -20 340 340' }, card);
        const pull = rand(0, n - 1);
        drawPizza(svg, n, new Set([pull]), pick(TOPPINGS), { pull });
        const lab = document.createElement('div'); lab.className = 'pizzalabel'; lab.innerHTML = `1 slice = ${frac(1, n)}`;
        card.appendChild(lab);
        card.onclick = () => {
          if (done) return; done = true;
          const want = q === 'bigger' ? Math.min(a, b) : Math.max(a, b), ok = n === want;
          card.classList.add(ok ? 'right' : 'wrong');
          if (ok) { Sound.good(); stars++; $('#pbScore').textContent = `⭐ ${stars}`; }
          else Sound.bad();
          setFeedback($('#pbFb'), `${ok ? 'Yes!' : 'Not quite!'} 1/${Math.min(a, b)} is bigger than 1/${Math.max(a, b)} – fewer slices means bigger slices!`, ok ? 'good' : 'bad');
        };
        host.appendChild(card);
      });
    }
    $('#pbNext').onclick = () => { Sound.click(); round(); };
    round();
  })();
}
