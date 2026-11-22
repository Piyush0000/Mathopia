import { $, $$, rand, pick, shuffle, sleep, restartAnim, Sound, confetti, makeSeg, renderChoices, setFeedback, burst } from '../common';

export const markup = `
<nav class="tabs">
  <button class="tab active" data-tab="pay">🛒 Pay for it</button>
  <button class="tab" data-tab="change">🧾 Give change</button>
  <button class="tab" data-tab="count">👛 Count the money</button>
</nav>
<main>
  <div class="shopbar">
    <span class="label">Money</span>
    <div class="seg" id="shCur"><button data-v="₹" class="sel">₹</button><button data-v="$">$</button><button data-v="£">£</button><button data-v="€">€</button></div>
    <span class="label">Prices up to</span>
    <div class="seg" id="shMax"><button data-v="10" class="sel">10</button><button data-v="20">20</button><button data-v="50">50</button></div>
  </div>

  <section class="panel" data-panel="pay">
    <div class="toolbar"><span class="spacer"></span><span class="score" id="pyScore">⭐ 0</span></div>
    <div class="counter-top">
      <div class="shopitem" id="pyItem"></div>
      <div class="speech" id="pyTalk"></div>
    </div>
    <div class="tray-label">Your payment: <b id="pyTotal">0</b> <small>(tap a coin to take it back)</small></div>
    <div class="tray" id="pyTray"></div>
    <div class="tray-label">👛 Your purse – tap coins to pay</div>
    <div class="purse" id="pyPurse"></div>
    <div class="feedback" id="pyFb"></div>
    <div class="btnrow">
      <button class="btn alt" id="pyClear">↺ Take all back</button>
      <button class="btn green big" id="pyPay">💳 Pay</button>
      <button class="btn big" id="pyNext">Next ▶</button>
    </div>
  </section>

  <section class="panel" data-panel="change" hidden>
    <div class="toolbar"><span class="spacer"></span><span class="score" id="chScore">⭐ 0</span></div>
    <div class="counter-top">
      <div class="shopitem" id="chItem"></div>
      <div class="speech" id="chTalk"></div>
    </div>
    <div class="tray-label">Change to give: <b id="chTotal">0</b> <small>(tap a coin to take it back)</small></div>
    <div class="tray" id="chTray"></div>
    <div class="tray-label">💰 Shop till – tap coins to give change</div>
    <div class="purse" id="chPurse"></div>
    <div class="feedback" id="chFb"></div>
    <div class="btnrow">
      <button class="btn alt" id="chClear">↺ Take all back</button>
      <button class="btn green big" id="chGive">🤝 Give change</button>
      <button class="btn big" id="chNext">Next ▶</button>
    </div>
  </section>

  <section class="panel" data-panel="count" hidden>
    <div class="toolbar"><span class="spacer"></span><span class="score" id="ctScore2">⭐ 0 / 0</span></div>
    <div class="prompt">How much money is in the purse?</div>
    <div class="openpurse" id="cnPurse"></div>
    <div class="choices" id="cnChoices"></div>
    <div class="feedback" id="cnFb"></div>
    <div class="btnrow"><button class="btn big" id="cnNext">Next ▶</button></div>
  </section>
</main>`;

export function init() {
  const ITEMS = [
    ['🍎', 'apple'], ['🍌', 'banana'], ['🧃', 'juice box'], ['🍪', 'cookie'], ['🍭', 'lollipop'], ['✏️', 'pencil'],
    ['📒', 'notebook'], ['🧸', 'teddy bear'], ['🎈', 'balloon'], ['🍦', 'ice cream'], ['🪀', 'yo-yo'], ['🖍️', 'crayons'],
    ['🧁', 'cupcake'], ['🥭', 'mango'], ['⚽', 'football'], ['🪁', 'kite']
  ];
  const SHOPKEEPERS = ['🧑‍🍳', '👩‍🦰', '👨‍🦳', '🐻', '🐼', '🦁'];
  const DENOMS = [1, 2, 5, 10, 20, 50];
  let cur = '₹', max = 10;
  try { cur = localStorage.getItem('mathopia-currency') || '₹'; } catch (e) { }
  $$('#shCur button').forEach(b => b.classList.toggle('sel', b.dataset.v === cur));
  const money = v => `${cur}${v}`;
  const denomsUpTo = m => DENOMS.filter(d => d <= Math.max(10, m));

  function coinEl(v, small) {
    const b = document.createElement('button');
    b.className = `money ${v >= 20 ? 'note' : 'coin'} m${v}${small ? ' small' : ''}`;
    b.innerHTML = `<span>${cur}${v}</span>`;
    b.dataset.v = v;
    b.setAttribute('aria-label', `${cur}${v}`);
    return b;
  }
  const sum = list => list.reduce((a, b) => a + b, 0);
  // break an amount into the fewest coins (used for the purse & customer payments)
  function greedy(amount, denoms) { const out = []; [...denoms].reverse().forEach(d => { while (amount >= d) { out.push(d); amount -= d; } }); return out; }

  // a tray of coins the child builds by tapping the purse
  function Tray(trayEl, totalEl, purseEl, getDenoms, onChange = () => {}) {
    let coins = [];
    function render(fresh) {
      trayEl.innerHTML = '';
      coins.forEach((v, i) => {
        const c = coinEl(v, true); if (i === fresh) c.classList.add('fly');
        c.onclick = () => { coins.splice(i, 1); Sound.click(); render(); };
        trayEl.appendChild(c);
      });
      if (!coins.length) trayEl.innerHTML = '<span class="empty">empty</span>';
      totalEl.textContent = money(sum(coins));
      restartAnim(totalEl, 'bump');
      onChange();
    }
    function purse() {
      purseEl.innerHTML = '';
      getDenoms().forEach(v => {
        const c = coinEl(v);
        c.onclick = () => { if (coins.length >= 20) return; coins.push(v); coins.sort((a, b) => b - a); Sound.tone(1200 + v * 8, .08, 'triangle', 0, .12); render(coins.lastIndexOf(v)); };
        purseEl.appendChild(c);
      });
    }
    return { render, purse, clear() { coins = []; render(); }, get total() { return sum(coins); }, get count() { return coins.length; } };
  }

  // ---------- Pay for it ----------
  const pay = (() => {
    let item, price, done = false, stars = 0;
    const tray = Tray($('#pyTray'), $('#pyTotal'), $('#pyPurse'), () => denomsUpTo(max));
    function round() {
      const [e, n] = pick(ITEMS); item = { e, n };
      price = rand(max === 10 ? 1 : max === 20 ? 5 : 11, max); done = false;
      $('#pyItem').innerHTML = `<div class="itememoji">${e}</div><div class="pricetag">${money(price)}</div>`;
      restartAnim($('#pyItem'), 'slidein');
      $('#pyTalk').innerHTML = `<span class="keeper">${pick(SHOPKEEPERS)}</span> “The ${n} costs <b>${money(price)}</b>. Please pay exactly!”`;
      tray.purse(); tray.clear(); setFeedback($('#pyFb'), '');
    }
    $('#pyPay').onclick = () => {
      if (done) return;
      const t = tray.total;
      if (t === price) {
        done = true; stars++; $('#pyScore').textContent = `⭐ ${stars}`; Sound.good();
        const fewest = greedy(price, denomsUpTo(max)).length;
        setFeedback($('#pyFb'), tray.count <= fewest ? `Perfect – and with the fewest coins! Enjoy your ${item.e}` : `Exactly ${money(price)}! Enjoy your ${item.e}. Could you use fewer coins?`, 'good');
        burst($('#pyItem'), 12, [item.e, '⭐', '✨']);
        if (stars % 5 === 0) confetti();
      } else {
        Sound.bad(); restartAnim($('#pyTray'), 'shake');
        setFeedback($('#pyFb'), t < price ? `Not enough! You need ${money(price - t)} more.` : `That's too much – you paid ${money(t)}. Take back ${money(t - price)}.`, 'bad');
      }
    };
    $('#pyClear').onclick = () => { if (!done) { tray.clear(); Sound.click(); } };
    $('#pyNext').onclick = () => { Sound.click(); round(); };
    return { round };
  })();

  // ---------- Give change ----------
  const change = (() => {
    let price, paid, done = false, stars = 0;
    const tray = Tray($('#chTray'), $('#chTotal'), $('#chPurse'), () => denomsUpTo(max).filter(d => d < paid));
    function round() {
      done = false; setFeedback($('#chFb'), '');
      const [e, n] = pick(ITEMS);
      paid = max === 10 ? 10 : max === 20 ? pick([10, 20]) : pick([20, 50]);
      price = rand(Math.max(1, paid - (max === 10 ? 9 : max === 20 ? 12 : 30)), paid - 1);
      $('#chItem').innerHTML = `<div class="itememoji">${e}</div><div class="pricetag">${money(price)}</div>`;
      restartAnim($('#chItem'), 'slidein');
      $('#chTalk').innerHTML = `<span class="keeper">${pick(['🧒', '👧', '👦', '👵', '🐰', '🐨'])}</span> “I'd like the ${n}, please. Here's ${coinEl(paid, true).outerHTML}” <br>You are the shopkeeper. How much change?`;
      tray.purse(); tray.clear();
    }
    $('#chGive').onclick = () => {
      if (done) return;
      const want = paid - price, t = tray.total;
      if (t === want) {
        done = true; stars++; $('#chScore').textContent = `⭐ ${stars}`; Sound.good();
        setFeedback($('#chFb'), `Correct change! Count on: ${price} → ${paid} is ${money(want)}. 🧾`, 'good');
        if (stars % 5 === 0) confetti();
      } else {
        Sound.bad(); restartAnim($('#chTray'), 'shake');
        setFeedback($('#chFb'), t < want ? `More change please! Count on from ${price} to ${paid}.` : `Too much change! Count on from ${price} to ${paid}.`, 'bad');
      }
    };
    $('#chClear').onclick = () => { if (!done) { tray.clear(); Sound.click(); } };
    $('#chNext').onclick = () => { Sound.click(); round(); };
    return { round };
  })();

  // ---------- Count the money ----------
  const count = (() => {
    let right = 0, total = 0;
    function round() {
      setFeedback($('#cnFb'), '');
      const target = rand(max === 10 ? 3 : 6, max === 10 ? 15 : max === 20 ? 30 : 80);
      const ds = denomsUpTo(max);
      // a messy mix of coins rather than the neatest one
      let coins;
      do { // a messy mix of at least 3 coins
        coins = []; let left = target;
        while (left > 0) { const d = pick(ds.filter(x => x <= left)); coins.push(d); left -= d; }
        coins = shuffle(coins).slice(0, 12);
      } while (coins.length < 3);
      const amount = sum(coins);
      const host = $('#cnPurse'); host.innerHTML = '';
      coins.sort((a, b) => b - a).forEach((v, i) => { const c = coinEl(v); c.disabled = true; c.style.animationDelay = i * 70 + 'ms'; c.classList.add('drop'); host.appendChild(c); });
      const opts = new Set([amount]);
      [amount + 1, amount - 1, amount + 2, amount + 5, amount - 5, amount + 10, amount - 2].forEach(v => { if (opts.size < 4 && v > 0) opts.add(v); });
      renderChoices($('#cnChoices'), shuffle([...opts]), amount, ok => {
        total++; if (ok) right++;
        $('#ctScore2').textContent = `⭐ ${right} / ${total}`;
        setFeedback($('#cnFb'), ok ? `Yes! ${coins.join(' + ')} = ${money(amount)} 👛` : `It's ${money(amount)}. Start with the biggest coin and count on.`, ok ? 'good' : 'bad');
      }, { render: (b, v) => b.textContent = money(v) });
    }
    $('#cnNext').onclick = () => { Sound.click(); round(); };
    return { round };
  })();

  const all = () => { pay.round(); change.round(); count.round(); };
  makeSeg($('#shCur'), v => { cur = v; try { localStorage.setItem('mathopia-currency', v); } catch (e) { } all(); });
  makeSeg($('#shMax'), v => { max = +v; all(); });
  all();
}
