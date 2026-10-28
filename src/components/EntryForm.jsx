import { useId, useState } from 'react';
import { validateName, normalizeName, NAME_MAX } from '../../supabase/functions/_shared/scoring.js';

export default function EntryForm({ initial, onStart }) {
  const id = useId();
  const [publicName, setPublicName] = useState(initial?.publicName ?? '');
  const [termsAccepted, setTerms] = useState(initial?.termsAccepted ?? false);
  const [publicConsent, setConsent] = useState(initial?.publicConsent ?? false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    const next = {};
    const nameError = validateName(publicName);
    if (nameError) next.name = nameError;
    if (!termsAccepted) next.terms = 'Acepta las condiciones para comenzar.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(next.name ? `${id}-name` : `${id}-terms`)?.focus();
      return;
    }
    onStart({ publicName: normalizeName(publicName), termsAccepted, publicConsent, website });
  };

  return (
    <section className="entry page" aria-labelledby={`${id}-title`}>
      <div className="entry__intro">
        <h1 id={`${id}-title`} className="page-title">Before the first look</h1>
        <p>
          Para tu tarjeta solo necesitamos el nombre con el que quieres aparecer. Puede ser tu
          nombre, tu nombre artístico o un apodo.
        </p>
      </div>

      <form className="entry__form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${id}-name`}>Nombre público</label>
          <input
            id={`${id}-name`}
            name="publicName"
            type="text"
            autoComplete="nickname"
            maxLength={NAME_MAX}
            value={publicName}
            onChange={(e) => {
              setPublicName(e.target.value);
              if (touched) setErrors((er) => ({ ...er, name: validateName(e.target.value) || undefined }));
            }}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={`${id}-name-hint${errors.name ? ` ${id}-name-error` : ''}`}
            required
          />
          <p id={`${id}-name-hint`} className="field__hint">
            Entre 2 y {NAME_MAX} caracteres. Aparecerá en tu tarjeta.
          </p>
          {errors.name && (
            <p id={`${id}-name-error`} className="field__error" role="alert">{errors.name}</p>
          )}
        </div>

        {/* Campo trampa para bots: oculto a personas y lectores de pantalla. */}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor={`${id}-website`}>Sitio web</label>
          <input
            id={`${id}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <details className="conditions">
          <summary>Leer las condiciones de participación</summary>
          <ul>
            <li>BJXMODA realiza esta experiencia como parte de una actividad académica de neuromarketing.</li>
            <li>Guardamos tu nombre público, tu arquetipo, tus puntuaciones, la fecha y un código de participación. No pedimos teléfono, correo, domicilio ni fecha de nacimiento.</li>
            <li>Los resultados se analizan de forma agregada (por ejemplo, cuántas personas obtuvieron cada arquetipo). Tu nombre no forma parte de ese análisis.</li>
            <li>Los arquetipos son perfiles creativos basados en tus respuestas. No son un diagnóstico psicológico.</li>
            <li>La tarjeta es un recuerdo de la experiencia: no es una acreditación profesional ni garantiza oportunidades de modelaje.</li>
            <li>Recibirás una clave privada para cambiar tu preferencia de galería o borrar tu participación cuando quieras.</li>
          </ul>
        </details>

        <div className="check">
          <input
            id={`${id}-terms`}
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTerms(e.target.checked);
              if (e.target.checked) setErrors((er) => ({ ...er, terms: undefined }));
            }}
            aria-invalid={errors.terms ? 'true' : 'false'}
            aria-describedby={errors.terms ? `${id}-terms-error` : undefined}
          />
          <label htmlFor={`${id}-terms`}>Acepto las condiciones de participación.</label>
        </div>
        {errors.terms && (
          <p id={`${id}-terms-error`} className="field__error" role="alert">{errors.terms}</p>
        )}

        <fieldset className="consent">
          <legend>Galería New Faces (opcional)</legend>
          <div className="check">
            <input
              id={`${id}-consent`}
              type="checkbox"
              checked={publicConsent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-describedby={`${id}-consent-hint`}
            />
            <label htmlFor={`${id}-consent`}>
              Quiero que mi nombre público y mi arquetipo aparezcan en New Faces.
            </label>
          </div>
          <p id={`${id}-consent-hint`} className="field__hint">
            Puedes hacer el test sin marcar esta casilla. Tus puntuaciones nunca se publican y puedes
            retirar tu nombre después.
          </p>
        </fieldset>

        <button type="submit" className="button button--primary">Comenzar el test</button>
      </form>
    </section>
  );
}
