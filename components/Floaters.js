// Gently drifting maths symbols behind the home page (pure CSS animation).
const SYMBOLS = ['+', '−', '×', '÷', '=', '1', '2', '3', '5', '7', '9', '10', '▲', '●', '■', '◆', '½', '%'];
const COLORS = ['#ef476f', '#f4b400', '#06d6a0', '#118ab2', '#8e6cdf', '#f78c3a'];

// deterministic pseudo-random so server and client render identically
const prng = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

export default function Floaters({ count = 22 }) {
  const r = prng(7);
  const items = Array.from({ length: count }, (_, i) => ({
    s: SYMBOLS[i % SYMBOLS.length],
    left: Math.round(r() * 100),
    size: 1.4 + r() * 2.6,
    dur: 18 + r() * 22,
    delay: -r() * 40,
    color: COLORS[i % COLORS.length],
  }));
  return (
    <div className="floaters" aria-hidden="true">
      {items.map((it, i) => (
        <span key={i} style={{ left: `${it.left}%`, fontSize: `${it.size}rem`, color: it.color, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s` }}>
          {it.s}
        </span>
      ))}
    </div>
  );
}
