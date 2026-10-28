import { useEffect, useRef } from 'react';
import { ARCHETYPE_BY_KEY } from '../../supabase/functions/_shared/scoring.js';
import { archetypeCssVars } from '../data/archetypeStyles.js';

// El momento central de la experiencia: una sola revelación orquestada.
export default function Reveal({ result, onDone }) {
  const meta = ARCHETYPE_BY_KEY[result.archetype];
  const skipRef = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => doneRef.current(), reduced ? 1600 : 4200);
    skipRef.current?.focus({ preventScroll: true });
    return () => clearTimeout(t);
  }, []);

  const [the, ...rest] = meta.name.split(' ');
  const name = rest.join(' ');

  return (
    <section
      className={`reveal arch--${result.archetype}`}
      style={archetypeCssVars(result.archetype)}
      aria-live="polite"
    >
      <p className="reveal__kicker">{result.publicName}, your fashion identity is</p>
      <h1 className="reveal__name">
        <span className="reveal__the">{the}</span>
        <span className="reveal__word" aria-label={name}>
          {[...name].map((ch, i) => (
            <span key={i} aria-hidden="true" style={{ '--i': i }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </h1>
      <p className="reveal__quote">“{meta.quote}”</p>
      <button type="button" className="reveal__skip" onClick={onDone} ref={skipRef}>
        Ver mi tarjeta
      </button>
    </section>
  );
}
