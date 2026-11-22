'use client';
import { useEffect, useRef } from 'react';
import * as tenFrames from '@/lib/games/tenFrames';
import * as placeValue from '@/lib/games/placeValue';
import * as measurement from '@/lib/games/measurement';
import * as shapes from '@/lib/games/shapes';
import * as hopper from '@/lib/games/hopper';
import * as pizza from '@/lib/games/pizza';
import * as clock from '@/lib/games/clock';
import * as shop from '@/lib/games/shop';
import * as patterns from '@/lib/games/patterns';
import { initTabs, watchText } from '@/lib/common';

const ENGINES = { tenFrames, placeValue, measurement, shapes, hopper, pizza, clock, shop, patterns };

// Mounts a tool's static markup, then hands it to that tool's game engine.
export default function ToolPage({ tool, title, emoji }) {
  const root = useRef(null);
  const engine = ENGINES[tool];

  useEffect(() => {
    const el = root.current;
    el.innerHTML = engine.markup;
    initTabs(el);
    engine.init();
    const stopWatching = watchText(el);
    return () => {
      stopWatching();
      el.innerHTML = '';
      document.querySelectorAll('.winner').forEach(w => w.remove());
    };
  }, [engine]);

  return (
    <>
      <h1 className="pagetitle"><span className="title-emoji" aria-hidden="true">{emoji}</span> {title}</h1>
      <div ref={root} className="toolroot" />
    </>
  );
}
