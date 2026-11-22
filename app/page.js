import Link from 'next/link';
import { TOOLS } from '@/lib/tools';
import Logo, { TAGLINE } from '@/components/Logo';
import Floaters from '@/components/Floaters';

function Icon({ slug }) {
  if (slug === 'ten-frames') {
    const fill = ['r', 'r', 'r', 'r', 'r', 'y', 'y', '', '', ''];
    return <div className="mini-tf">{fill.map((c, i) => <i key={i} className={c} />)}</div>;
  }
  if (slug === 'place-value') {
    return (
      <div className="pv-icon">
        <b className="f" /><b className="r" /><b className="r" />
        <span><b className="c" /><b className="c" /><b className="c" /></span>
      </div>
    );
  }
  if (slug === 'measurement') return <>📏⚖️🥛</>;
  return <>🔺🟦🎲⚽</>;
}

export default function Home() {
  return (
    <>
      <Floaters />
      <div className="home-wrap">
      <div className="hero">
        <h1><Logo size="lg" /></h1>
        <p className="tagline">{TAGLINE}</p>
        <p>Interactive teaching tools &amp; games for the whole class</p>
      </div>
      <div className="cards">
        {TOOLS.map(t => (
          <Link key={t.slug} href={`/${t.slug}`} className="tool-card" style={{ borderTopColor: t.accent }}>
            <div className="tool-icon"><Icon slug={t.slug} /></div>
            <h2>{t.title}</h2>
            <p>{t.blurb}</p>
            <ul>{t.modes.map(m => <li key={m}>{m}</li>)}</ul>
            <span className="play">Let&apos;s play →</span>
          </Link>
        ))}
      </div>
      <footer className="homefoot">Tip: put it on the big screen. Press 🔊 to switch sounds on or off.</footer>
      </div>
    </>
  );
}
