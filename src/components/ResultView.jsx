import { useEffect, useRef, useState } from 'react';
import { ARCHETYPE_BY_KEY, TIE_RULE_TEXT } from '../../supabase/functions/_shared/scoring.js';
import { archetypeCssVars } from '../data/archetypeStyles.js';
import { formatDate } from '../lib/format.js';
import { navigate } from '../lib/router.js';
import IdentityCard from './IdentityCard.jsx';
import CardActions from './CardActions.jsx';
import ConsentControl from './ConsentControl.jsx';
import ManageKeyPanel from './ManageKeyPanel.jsx';
import PerceptionSurvey from './PerceptionSurvey.jsx';

const SCORE_ROWS = [
  ['avant_garde', 'Avant-Garde'],
  ['icon', 'Icon'],
  ['street_creative', 'Street Creative'],
  ['muse', 'Muse'],
];

export default function ResultView({ result, sessionId, onReplay, onRestart, onUpdate, showKey = true }) {
  const [blob, setBlob] = useState(null);
  const titleRef = useRef(null);
  const meta = ARCHETYPE_BY_KEY[result.archetype];
  const secondary = result.secondaryArchetype ? ARCHETYPE_BY_KEY[result.secondaryArchetype] : null;

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section
      className={`result page arch--${result.archetype}`}
      style={archetypeCssVars(result.archetype)}
      aria-labelledby="result-title"
    >
      <div className="result__card print-card">
        <IdentityCard data={result} onReady={setBlob} />
      </div>

      <div className="result__body">
        <p className="result__confirm" role="status">
          Participación registrada el {formatDate(result.createdAt)} con el código{' '}
          <strong>{result.publicCode}</strong>.
        </p>
        <h1 id="result-title" className="result__title" tabIndex={-1} ref={titleRef}>
          {meta.name}
        </h1>
        <p className="result__traits">{meta.traits}.</p>

        <h2 className="result__subhead">Tus puntuaciones</h2>
        <dl className="scores">
          {SCORE_ROWS.map(([key, label]) => (
            <div key={key} className={`scores__row ${key === result.archetype ? 'is-main' : ''}`}>
              <dt>{label}</dt>
              <dd>
                <meter min={0} max={7} value={result.scores[key]} aria-hidden="true" />
                <span>{result.scores[key]} de 7</span>
              </dd>
            </div>
          ))}
        </dl>
        {secondary && (
          <p className="result__tie">
            Empataste con <strong>{secondary.name}</strong>. {TIE_RULE_TEXT}
          </p>
        )}

        <CardActions blob={blob} publicCode={result.publicCode} onReplay={onReplay} />

        {result.manageKey && (
          <ConsentControl
            publicCode={result.publicCode}
            manageKey={result.manageKey}
            publicConsent={result.publicConsent}
            onChange={(publicConsent) => onUpdate({ publicConsent })}
          />
        )}

        <p className="result__disclaimer">
          Tu arquetipo es un perfil creativo basado en las preferencias que elegiste. No es un
          diagnóstico psicológico, y la tarjeta es un recuerdo de la experiencia, no una acreditación
          profesional ni una promesa de oportunidades de modelaje.
        </p>

        {showKey && result.manageKey && (
          <ManageKeyPanel publicCode={result.publicCode} manageKey={result.manageKey} />
        )}

        <PerceptionSurvey sessionId={sessionId} />

        <div className="button-row result__next">
          {result.publicConsent && (
            <a
              href="#/new-faces"
              className="button button--ghost"
              onClick={(e) => {
                e.preventDefault();
                navigate('new-faces');
              }}
            >
              Ver New Faces
            </a>
          )}
          {onRestart && (
            <button type="button" className="link-button" onClick={onRestart}>
              Hacer el test con otro nombre
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
