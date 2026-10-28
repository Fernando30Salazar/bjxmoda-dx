import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Revisando tus siete respuestas',
  'Preparando tu lugar en backstage',
  'Imprimiendo tu tarjeta',
];

export default function SavingScreen({ error, onRetry, onBack }) {
  const [i, setI] = useState(0);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1400);
    return () => clearInterval(t);
  }, [error]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (error) {
    return (
      <section className="status-screen" aria-labelledby="save-error-title">
        <h1 id="save-error-title" className="status-screen__title" tabIndex={-1} ref={errorRef}>
          Tu tarjeta no se guardó
        </h1>
        <p className="status-screen__text">{error.message}</p>
        <p className="status-screen__text">Tus respuestas siguen aquí; no tienes que repetir el test.</p>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={onRetry}>
            Intentar de nuevo
          </button>
          <button type="button" className="button button--ghost" onClick={onBack}>
            Revisar respuestas
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="status-screen" aria-busy="true" aria-live="polite">
      <span className="status-screen__pulse" aria-hidden="true" />
      <p className="status-screen__title">{MESSAGES[i]}</p>
    </section>
  );
}
