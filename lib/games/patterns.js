import { $, $$, rand, pick, shuffle, sleep, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback, burst } from '../common';

export const markup = `
<nav class="tabs">
  <button class="tab active" data-tab="next">🐛 Feed the caterpillar</button>
  <button class="tab" data-tab="missing">🔍 Missing piece</button>
  <button class="tab" data-tab="make">🎨 Make a pattern</button>
</nav>
<main>
  <section class="panel" data-panel="next">
    <div class="toolbar">
      <span class="label">Patterns</span>
      <div class="seg" id="pnLvl"><button data-v="1" class="sel">Easy</button><button data-v="2">Tricky</button></div>
      <span class="label">Use</span>
      <div class="seg" id="pnSet"><button data-v="mix" class="sel">Mix</button><button data-v="colours">Colours</button><button data-v="shapes">Shapes</button><button data-v="fruit">Fruit</button><button data-v="animals">Animals</button></div>
      <span class="spacer"></span>
      <span class="score" id="pnBflies">🦋 0</span>
    </div>
    <div class="prompt" id="pnPrompt">What comes next? Feed me!</div>
    <div class="garden"><div class="cat" id="pnCat"></div></div>
    <div class="unit" id="pnUnit"></div>
    <div class="choices" id="pnChoices"></div>
    <div class="feedback" id="pnFb"></div>
    <div class="btnrow"><button class="btn big" id="pnNew">New caterpillar ▶</button></div>
  </section>

  <section class="panel" data-panel="missing" hidden>
    <div class="toolbar">
      <span class="label">Patterns</span>
      <div class="seg" id="msLvl"><button data-v="1" class="sel">Easy</button><button data-v="2">Tricky</button></div>
      <span class="spacer"></span>
      <span class="score" id="msScore2">⭐ 0 / 0</span>
    </div>
    <div class="prompt">Oh no – a piece fell off! Which one is missing?</div>
    <div class="garden"><div class="cat" id="msCat"></div></div>
    <div class="choices" id="msChoices"></div>
    <div class="feedback" id="msFb"></div>
    <div class="btnrow"><button class="btn big" id="msNext">Next ▶</button></div>
  </section>

  <section class="panel" data-panel="make" hidden>
    <div class="toolbar">
      <span class="label">Use</span>
      <div class="seg" id="mkSet"><button data-v="colours" class="sel">Colours</button><button data-v="shapes">Shapes</button><button data-v="fruit">Fruit</button><button data-v="animals">Animals</button></div>
      <span class="spacer"></span>
      <button class="btn alt" id="mkUndo">↶ Undo</button>
      <button class="btn alt" id="mkClear">Clear</button>
    </div>
    <div class="prompt">Make your own pattern caterpillar! Can a friend guess what comes next?</div>
    <div class="garden"><div class="cat" id="mkCat"></div></div>
    <div class="palette" id="mkPal"></div>
    <div class="feedback" id="mkFb"></div>
    <div class="btnrow"><button class="btn purple big" id="mkCheck">🔁 Is it a pattern?</button></div>
  </section>
</main>`;

export function init() {
  const SETS = {
    colours: [['red', '#ef476f'], ['yellow', '#ffd166'], ['blue', '#118ab2'], ['green', '#06d6a0'], ['purple', '#8e6cdf']].map(([k, c]) => ({ k, html: `<span class="pdot" style="background:${c}"></span>` })),
    shapes: [['▲', '#ef476f'], ['●', '#118ab2'], ['■', '#06d6a0'], ['★', '#f4b400'], ['◆', '#8e6cdf']].map(([s, c]) => ({ k: s, html: `<span class="pshape" style="color:${c}">${s}</span>` })),
    fruit: ['🍎', '🍌', '🍇', '🍊', '🍓'].map(e => ({ k: e, html: `<span class="pemoji">${e}</span>` })),
    animals: ['🐶', '🐱', '🐰', '🐸', '🐵'].map(e => ({ k: e, html: `<span class="pemoji">${e}</span>` })),
  };
  const CORES = { 1: ['AB', 'AAB', 'ABB', 'AB'], 2: ['ABC', 'AABB', 'ABBC', 'AABC', 'ABAC'] };
  const findItem = k => Object.values(SETS).flat().find(i => i.k === k);

  function makePattern(level, setName) {
    const set = SETS[setName === 'mix' ? pick(Object.keys(SETS)) : setName];
    const core = pick(CORES[level]);
    const letters = [...new Set(core)];
    const map = {};
    const used = shuffle(set).slice(0, letters.length); letters.forEach((l, i) => map[l] = used[i]);
    const seq = n => Array.from({ length: n }, (_, i) => map[core[i % core.length]]);
    return { core, map, seq, set: used, all: set };
  }

  // caterpillar renderer: items = array of item objects or null (= "?")
  function drawCat(el, items, opts = {}) {
    el.innerHTML = '';
    items.forEach((it, i) => {
      const s = document.createElement('div');
      s.className = 'cseg' + (it ? '' : ' q') + (opts.fresh === i ? ' fresh' : '') + (opts.unitLen && it ? ` u${Math.floor(i / opts.unitLen) % 2}` : '');
      s.style.setProperty('--i', i);
      s.innerHTML = it ? it.html : '<span class="qmark">?</span>';
      if (opts.onSeg) s.onclick = () => opts.onSeg(i);
      el.appendChild(s);
    });
    const head = document.createElement('div');
    head.className = 'head'; head.style.setProperty('--i', items.length);
    head.innerHTML = `<span class="face">${opts.face || '🙂'}</span>`;
    el.appendChild(head);
    return head;
  }
  function mood(el, face, cls) {
    const head = $('.head', el); if (!head) return;
    $('.face', head).textContent = face; restartAnim(head, cls);
  }

  // ---------- Feed the caterpillar (what comes next) ----------
  (() => {
    let level = '1', setName = 'mix', p, shown, fed, flies = 0, busy = false;
    const cat = $('#pnCat');
    function newCat() {
      p = makePattern(level, setName);
      shown = Math.min(9, p.core.length * 2 + rand(0, p.core.length - 1)); // keep it short enough for phones
      fed = 0; busy = false;
      $('#pnUnit').innerHTML = '';
      cat.classList.remove('flyaway');
      setFeedback($('#pnFb'), '');
      ask();
    }
    function ask() {
      const items = p.seq(shown);
      drawCat(cat, [...items, null]);
      $('#pnPrompt').textContent = fed ? `Yum! ${3 - fed} more to go… what comes next?` : 'What comes next? Feed me!';
      const want = p.seq(shown + 1)[shown];
      const opts = shuffle([...new Set([want, ...shuffle(p.all)])]).slice(0, Math.min(4, p.all.length));
      if (!opts.includes(want)) opts[0] = want;
      renderChoices($('#pnChoices'), shuffle(opts).map(o => o.k), want.k, async ok => {
        if (!ok) { mood(cat, '🤢', 'yuck'); setFeedback($('#pnFb'), 'Yuck! That doesn\'t fit the pattern. Try again!', 'bad'); return; }
        busy = true; shown++; fed++;
        drawCat(cat, p.seq(shown), { fresh: shown - 1, face: '😋' });
        mood(cat, '😋', 'munch');
        setFeedback($('#pnFb'), pick(['Yum yum!', 'Delicious!', 'Crunchy!', 'More please!']), 'good');
        await sleep(900);
        if (fed < 3) { busy = false; ask(); return; }
        // full! show the repeating unit, then turn into a butterfly
        drawCat(cat, p.seq(shown), { unitLen: p.core.length, face: '😊' });
        $('#pnUnit').innerHTML = `🔁 The part that repeats: ${p.seq(p.core.length).map(i => i.html).join('')} <b>(${p.core.split('').join(' ')})</b>`;
        $('#pnChoices').innerHTML = '';
        $('#pnPrompt').textContent = 'I\'m full! Watch this…';
        await sleep(1600);
        cat.innerHTML = '<div class="butterfly">🦋</div>';
        Sound.win(); confetti(90);
        flies++; $('#pnBflies').textContent = `🦋 ${flies}`;
        $('#pnPrompt').textContent = 'I turned into a butterfly! 🦋';
        setFeedback($('#pnFb'), 'Amazing pattern spotting! Make a new caterpillar ▶', 'good');
      }, { retry: true, render: (b, k) => b.innerHTML = findItem(k).html });
    }
    makeSeg($('#pnLvl'), v => { level = v; newCat(); });
    makeSeg($('#pnSet'), v => { setName = v; newCat(); });
    $('#pnNew').onclick = () => { Sound.click(); newCat(); };
    newCat();
  })();

  // ---------- Missing piece ----------
  (() => {
    let level = '1', right = 0, total = 0;
    const cat = $('#msCat');
    function round() {
      const p = makePattern(level, 'mix');
      const len = p.core.length * 3;
      const items = p.seq(len);
      const gap = rand(1, len - 2);
      const want = items[gap];
      drawCat(cat, items.map((it, i) => i === gap ? null : it), { face: '😟' });
      setFeedback($('#msFb'), '');
      const opts = shuffle([...new Set([want, ...shuffle(p.all)])]).slice(0, 4);
      if (!opts.includes(want)) opts[0] = want;
      renderChoices($('#msChoices'), shuffle(opts).map(o => o.k), want.k, ok => {
        total++; if (ok) right++;
        $('#msScore2').textContent = `⭐ ${right} / ${total}`;
        drawCat(cat, items, { fresh: gap, face: ok ? '😄' : '🙂', unitLen: p.core.length });
        setFeedback($('#msFb'), ok ? 'You fixed me! Thank you! 🐛' : `This piece goes there: ${want.html}`, ok ? 'good' : 'bad');
        if (!ok) $('#msFb').innerHTML = `It was ${want.html} – look at the part that repeats!`;
      }, { render: (b, k) => b.innerHTML = findItem(k).html });
    }
    makeSeg($('#msLvl'), v => { level = v; round(); });
    $('#msNext').onclick = () => { Sound.click(); round(); };
    round();
  })();

  // ---------- Make a pattern ----------
  (() => {
    let setName = 'colours', items = [];
    const cat = $('#mkCat');
    function render(fresh) { drawCat(cat, items, { fresh, face: items.length ? '😃' : '🙂' }); }
    function palette() {
      const pal = $('#mkPal'); pal.innerHTML = '';
      SETS[setName].forEach(it => {
        const b = document.createElement('button'); b.className = 'palbtn'; b.innerHTML = it.html;
        b.onclick = () => { if (items.length >= 12) { Sound.bad(); return; } items.push(it); Sound.pop(items.length); render(items.length - 1); setFeedback($('#mkFb'), ''); };
        pal.appendChild(b);
      });
    }
    // smallest repeating unit that explains the whole caterpillar (needs 2+ repeats)
    function findUnit(arr) {
      for (let L = 1; L <= arr.length / 2; L++) if (arr.every((x, i) => x.k === arr[i % L].k)) return L;
      return 0;
    }
    $('#mkCheck').onclick = () => {
      if (items.length < 4) { setFeedback($('#mkFb'), 'Add at least 4 pieces first!', 'bad'); Sound.bad(); return; }
      const L = findUnit(items);
      if (L && new Set(items.map(i => i.k)).size > 1) {
        Sound.good(); render(); drawCat(cat, items, { unitLen: L, face: '🤩' });
        $('#mkFb').className = 'feedback good';
        $('#mkFb').innerHTML = `Yes! It's a pattern. The part that repeats is ${items.slice(0, L).map(i => i.html).join('')} – next comes ${items[items.length % L].html}`;
        burst($('#mkCat'), 10);
      } else {
        Sound.bad(); mood(cat, '🤔', 'yuck');
        setFeedback($('#mkFb'), L && items.length ? 'That\'s all the same piece – try mixing two or more!' : 'Hmm, I can\'t find a part that repeats. Try again!', 'bad');
      }
    };
    $('#mkUndo').onclick = () => { items.pop(); Sound.click(); render(); };
    $('#mkClear').onclick = () => { items = []; Sound.click(); render(); setFeedback($('#mkFb'), ''); };
    makeSeg($('#mkSet'), v => { setName = v; palette(); });
    palette(); render();
  })();
}
