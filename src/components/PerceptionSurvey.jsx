import { useId, useState } from 'react';
import { submitPerception } from '../lib/api.js';

const ITEMS = [
  ['identity_match', 'Mi resultado refleja cómo me veo en la moda.'],
  ['personalization', 'La experiencia se sintió hecha para mí.'],
  ['belonging', 'Siento que pertenezco a la comunidad de BJXMODA.'],
  ['brand_value', 'Después de esta experiencia valoro más a BJXMODA.'],
];

const SCALE = [
  [1, 'Totalmente en desacuerdo'],
  [2, 'En desacuerdo'],
  [3, 'Neutral'],
  [4, 'De acuerdo'],
  [5, 'Totalmente de acuerdo'],
];

/** Cuestionario posterior opcional. Se guarda ligado a la sesión, no al nombre. */
export default function PerceptionSurvey({ sessionId }) {
  const id = useId();
  const [values, setValues] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  if (!sessionId) return null;

  const complete = ITEMS.every(([k]) => values[k]);

  const submit = async (e) => {
    e.preventDefault();
    if (!complete) {
      setError('Responde las cuatro afirmaciones para enviar.');
      return;
    }
    setState('sending');
    setError('');
    try {
      await submitPerception(sessionId, values);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <section className="survey" aria-live="polite">
        <h2 className="survey__title">Gracias por tu opinión</h2>
        <p>Tus respuestas se suman al análisis de la actividad de forma anónima.</p>
      </section>
    );
  }

  return (
    <section className="survey" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="survey__title">Tu opinión, en 30 segundos</h2>
      <p>
        Opcional y anónimo: estas respuestas no se asocian a tu nombre. Indica qué tanto estás de
        acuerdo con cada frase.
      </p>
      <form onSubmit={submit} noValidate>
        {ITEMS.map(([key, label]) => (
          <fieldset key={key} className="likert">
            <legend>{label}</legend>
            <div className="likert__scale">
              {SCALE.map(([v, text]) => (
                <label key={v} className="likert__option">
                  <input
                    type="radio"
                    name={`${id}-${key}`}
                    value={v}
                    checked={values[key] === v}
                    onChange={() => setValues((s) => ({ ...s, [key]: v }))}
                  />
                  <span className="likert__num" aria-hidden="true">{v}</span>
                  <span className="likert__text">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {error && <p className="field__error" role="alert">{error}</p>}
        <button type="submit" className="button button--primary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Enviando…' : 'Enviar opinión'}
        </button>
      </form>
    </section>
  );
}
