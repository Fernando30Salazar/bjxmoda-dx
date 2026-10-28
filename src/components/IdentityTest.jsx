import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '../data/questions.js';

const ADVANCE_MS = 380;

export default function IdentityTest({ initialAnswers, onComplete, onExit }) {
  const [answers, setAnswers] = useState(() => initialAnswers ?? Array(QUESTIONS.length).fill(null));
  const [index, setIndex] = useState(() => {
    if (!initialAnswers) return 0;
    const firstEmpty = initialAnswers.indexOf(null);
    return firstEmpty === -1 ? QUESTIONS.length - 1 : firstEmpty;
  });
  const [leaving, setLeaving] = useState(false);
  const headingRef = useRef(null);
  const timer = useRef(null);

  const q = QUESTIONS[index];
  const answered = answers.filter(Boolean).length;
  const isLast = index === QUESTIONS.length - 1;

  // Mueve el foco al enunciado en cada pregunta (teclado y lector de pantalla).
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [index]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = useCallback(
    (letter) => {
      if (leaving) return;
      const next = [...answers];
      next[index] = letter;
      setAnswers(next);
      setLeaving(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setLeaving(false);
        if (index < QUESTIONS.length - 1) setIndex(index + 1);
        else if (next.every(Boolean)) onComplete(next);
      }, ADVANCE_MS);
    },
    [answers, index, leaving, onComplete],
  );

  // Atajos: teclas A–D eligen; flecha izquierda vuelve.
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest?.('input, textarea')) return;
      const k = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(k)) {
        e.preventDefault();
        choose(k);
      } else if (e.key === 'ArrowLeft' && index > 0 && !leaving) {
        setIndex(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, index, leaving]);

  return (
    <section className="test" aria-labelledby="question-heading">
      <div className="test__top">
        <button type="button" className="link-button" onClick={onExit}>
          Salir del test
        </button>
        <div className="progress">
          <p className="progress__label" id="progress-label">
            Pregunta {index + 1} de {QUESTIONS.length}
          </p>
          <div
            className="progress__track"
            role="progressbar"
            aria-labelledby="progress-label"
            aria-valuemin={0}
            aria-valuemax={QUESTIONS.length}
            aria-valuenow={answered}
          >
            {QUESTIONS.map((item, i) => (
              <span
                key={item.id}
                className={`progress__seg ${answers[i] ? 'is-done' : ''} ${i === index ? 'is-current' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div key={q.id} className={`question ${leaving ? 'is-leaving' : ''}`}>
        <h1 id="question-heading" className="question__prompt" tabIndex={-1} ref={headingRef}>
          {q.prompt}
        </h1>
        <ul className="options" aria-label="Opciones">
          {q.options.map((o) => {
            const selected = answers[index] === o.letter;
            return (
              <li key={o.letter}>
                <button
                  type="button"
                  className={`option ${selected ? 'is-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => choose(o.letter)}
                >
                  <span className="option__letter" aria-hidden="true">{o.letter}</span>
                  <span className="option__text">{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="question__foot">
          <button
            type="button"
            className="link-button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0 || leaving}
          >
            Pregunta anterior
          </button>
          <p className="question__hint">
            {isLast ? 'Tu respuesta final revela tu identidad.' : 'También puedes usar las teclas A, B, C y D.'}
          </p>
        </div>
      </div>
    </section>
  );
}
