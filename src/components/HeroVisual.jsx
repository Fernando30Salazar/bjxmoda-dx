import { useState } from 'react';
import { HERO_IMAGE } from '../data/media.js';
import { ARCHETYPES } from '../../supabase/functions/_shared/scoring.js';

// Muestra la fotografía editorial si existe en /public/images/hero.jpg.
// Si no, una hoja de contactos tipográfica con los cuatro arquetipos.
export default function HeroVisual() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <figure className="hero-visual hero-visual--photo">
        <img
          src={HERO_IMAGE.src}
          alt={HERO_IMAGE.alt}
          width="1600"
          height="2000"
          fetchPriority="high"
          onError={() => setFailed(true)}
        />
        {HERO_IMAGE.credit && <figcaption>{HERO_IMAGE.credit}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="hero-visual hero-visual--sheet" aria-label="Los cuatro arquetipos de BJXMODA">
      {Object.values(ARCHETYPES).map((a) => (
        <div key={a.key} className={`sheet-frame sheet-frame--${a.key}`}>
          <span className="sheet-frame__letter" aria-hidden="true">{a.letter}</span>
          <span className="sheet-frame__name">{a.name}</span>
        </div>
      ))}
    </figure>
  );
}
