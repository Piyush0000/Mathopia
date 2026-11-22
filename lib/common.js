// Shared helpers used by every game engine (browser only).
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
export function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
export function numberChoices(ans, count = 4, min = 0, max = 20) {
  const set = new Set([ans]);
  let tries = 0;
  while (set.size < count && tries++ < 300) {
    const v = ans + rand(-3, 3);
    if (v >= min && v <= max) set.add(v);
  }
  for (let v = min; set.size < count && v <= max; v++) set.add(v);
  return shuffle([...set]);
}
export function tween(dur, fn) {
  return new Promise(res => {
    const s = performance.now();
    function f(now) {
      const t = Math.min(1, (now - s) / dur);
      fn(t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      if (t < 1) requestAnimationFrame(f); else res();
    }
    requestAnimationFrame(f);
  });
}
export function restartAnim(el, cls) { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); }

const MUTE_KEY = 'maths-muted';
export const Sound = {
  _muted: null, ctx: null, listeners: new Set(),
  get muted() {
    if (this._muted === null) { try { this._muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { this._muted = false; } }
    return this._muted;
  },
  set muted(v) {
    this._muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) { }
    this.listeners.forEach(fn => fn(v));
  },
  tone(freq, dur, type = 'triangle', delay = 0, vol = 0.18) {
    if (this.muted) return;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { }
  },
  pop(n = 0) { this.tone(520 + n * 45, 0.09); },
  click() { this.tone(500, .05, 'square', 0, .05); },
  good() { [523, 659, 784].forEach((f, i) => this.tone(f, .18, 'triangle', i * .09)); },
  bad() { this.tone(180, .3, 'sawtooth', 0, .07); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, .22, 'triangle', i * .13)); }
};

export function confetti(n = 140) {
  const cv = h('canvas');
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 999 });
  document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight, ctx = cv.getContext('2d');
  const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#8e6cdf', '#f78c3a'];
  const ps = Array.from({ length: n }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: pick(cols), s: 6 + Math.random() * 8 }));
  const start = performance.now();
  (function f(now) {
    ctx.clearRect(0, 0, W, H);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .05; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (now - start < 3200) requestAnimationFrame(f); else cv.remove();
  })(start);
}

export function makeSeg(el, onChange) {
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', el).forEach(x => x.classList.toggle('sel', x === b));
    Sound.click(); onChange(b.dataset.v);
  });
  return () => $('button.sel', el).dataset.v;
}

export function renderChoices(host, values, correct, onDone, opts = {}) {
  host.innerHTML = '';
  let locked = false;
  values.forEach(v => {
    const b = h('button', 'choice');
    if (opts.render) opts.render(b, v); else b.textContent = v;
    b.onclick = () => {
      if (locked || b.disabled) return;
      const ok = v === correct;
      if (ok) { b.classList.add('right'); Sound.good(); burst(b); locked = true; $$('button', host).forEach(x => x.disabled = true); }
      else {
        b.classList.add('wrong'); Sound.bad(); b.disabled = true;
        if (!opts.retry) { locked = true; $$('button', host).forEach((x, i) => { x.disabled = true; if (values[i] === correct) x.classList.add('right'); }); }
      }
      onDone(ok, v);
    };
    host.appendChild(b);
  });
}

export function setFeedback(el, text, kind) {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'feedback' + (kind ? ' ' + kind : '');
  if (kind === 'good' && text) burst(el, 8);
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Little shower of stars/sparkles flying out of an element (used on correct answers).
export function burst(el, n = 12, emojis = ['⭐', '✨', '🌟', '💫']) {
  if (!el || reducedMotion() || !el.animate) return;
  const r = el.getBoundingClientRect();
  if (!r.width) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = h('span', 'burst-bit', pick(emojis));
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 30}px)) scale(1.1) rotate(${rand(-180, 180)}deg)`, opacity: 1, offset: .6 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.2}px), calc(-50% + ${Math.sin(a) * d + 20}px)) scale(.6)`, opacity: 0 }
    ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }
}

// Re-trigger an entrance animation whenever key text (prompts, scores, totals) changes.
export function watchText(root) {
  const SEL = '.prompt,.score,.tally,.bignum,.total,.digit,.equation,.sname,.turn';
  const mo = new MutationObserver(muts => {
    const seen = new Set();
    muts.forEach(m => {
      const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const el = t && t.closest(SEL);
      if (el && !seen.has(el)) { seen.add(el); restartAnim(el, 'bump'); }
    });
  });
  mo.observe(root, { childList: true, characterData: true, subtree: true });
  return () => mo.disconnect();
}

// Tabs inside a page root: .tab[data-tab] buttons switch [data-panel] sections.
// Supports deep links like /shapes#race.
export function initTabs(root) {
  const tabs = $$('.tab', root);
  const show = t => {
    tabs.forEach(x => x.classList.toggle('active', x === t));
    $$('[data-panel]', root).forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab);
    t.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    show(t); Sound.click();
    try { history.replaceState(history.state, '', '#' + t.dataset.tab); } catch (e) { }
  }));
  const want = location.hash.slice(1);
  const t = want && tabs.find(x => x.dataset.tab === want);
  if (t) show(t);
}
