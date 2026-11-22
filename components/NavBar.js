'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TOOLS } from '@/lib/tools';
import { Sound } from '@/lib/common';
import Logo from '@/components/Logo';

export default function NavBar() {
  const path = usePathname();
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(Sound.muted);
    Sound.listeners.add(setMuted);
    return () => Sound.listeners.delete(setMuted);
  }, []);

  return (
    <header className="top">
      <Link href="/" className="brand" title="Home"><Logo /></Link>
      {/* desktop: pills in the top bar · phone: fixed bottom tab bar */}
      <nav className="toolnav" aria-label="Tools">
        <Link href="/" className={`navhome ${path === '/' ? 'active' : ''}`}>
          <span className="ni" aria-hidden="true">🏠</span><span className="nl">Home</span>
        </Link>
        {TOOLS.map(t => (
          <Link key={t.slug} href={`/${t.slug}`} className={path === `/${t.slug}` ? 'active' : ''}>
            <span className="ni" aria-hidden="true">{t.emoji}</span><span className="nl">{t.short}</span>
          </Link>
        ))}
      </nav>
      <button className="btn alt" id="mute" title="Sound on/off" aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        onClick={() => { Sound.muted = !Sound.muted; }}>
        {muted ? '🔇' : '🔊'}
      </button>
    </header>
  );
}
