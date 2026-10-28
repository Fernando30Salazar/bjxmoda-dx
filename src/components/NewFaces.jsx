import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchNewFaces } from '../lib/api.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY } from '../../supabase/functions/_shared/scoring.js';
import { formatDate } from '../lib/format.js';
import { navigate } from '../lib/router.js';

const FILTERS = [{ key: 'all', name: 'Todos' }, ...Object.values(ARCHETYPES)];

export default function NewFaces() {
  const [state, setState] = useState({ status: 'loading', faces: [], error: null });
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const faces = await fetchNewFaces();
      setState({ status: 'ready', faces, error: null });
    } catch (error) {
      setState({ status: 'error', faces: [], error });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: state.faces.length };
    for (const a of Object.values(ARCHETYPES)) c[a.key] = 0;
    for (const f of state.faces) c[f.archetype] = (c[f.archetype] ?? 0) + 1;
    return c;
  }, [state.faces]);

  const visible = filter === 'all' ? state.faces : state.faces.filter((f) => f.archetype === filter);

  return (
    <section className="faces page" aria-labelledby="faces-title">
      <header className="faces__head">
        <h1 id="faces-title" className="page-title">New Faces</h1>
        <p className="faces__count" aria-live="polite">
          {state.status === 'ready'
            ? `${counts.all} ${counts.all === 1 ? 'participante publicado' : 'participantes publicados'}`
            : ' '}
        </p>
        <p className="faces__lede">
          Quienes completaron la experiencia y eligieron mostrar su nombre. Cada persona puede retirarse
          de la galería cuando quiera.
        </p>
      </header>

      <div className="filters" role="group" aria-label="Filtrar por arquetipo">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter arch--${f.key}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            disabled={state.status !== 'ready'}
          >
            {f.name}
            {state.status === 'ready' && <span className="filter__count">{counts[f.key] ?? 0}</span>}
          </button>
        ))}
      </div>

      {state.status === 'loading' && (
        <p className="faces__status" role="status">Cargando New Faces…</p>
      )}

      {state.status === 'error' && (
        <div className="faces__status faces__status--error" role="alert">
          <p>
            {state.error?.code === 'not_configured'
              ? state.error.message
              : 'No pudimos cargar la galería. Revisa tu conexión e intenta otra vez.'}
          </p>
          <button type="button" className="button button--ghost" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'ready' && visible.length === 0 && (
        <div className="faces__status">
          <p>
            {filter === 'all'
              ? 'Todavía no hay nombres publicados. El tuyo puede ser el primero.'
              : `Aún no hay participantes publicados como ${ARCHETYPE_BY_KEY[filter].name}.`}
          </p>
          <a
            href="#/test"
            className="button button--primary"
            onClick={(e) => {
              e.preventDefault();
              navigate('test');
            }}
          >
            Discover Your Identity
          </a>
        </div>
      )}

      {state.status === 'ready' && visible.length > 0 && (
        <ul className="faces__grid">
          {visible.map((f) => (
            <li key={f.public_code} className={`face arch--${f.archetype}`}>
              <p className="face__name">{f.public_name}</p>
              <p className="face__arch">{ARCHETYPE_BY_KEY[f.archetype]?.name}</p>
              <p className="face__meta">
                <span className="face__code">{f.public_code}</span>
                <span className="face__date">{formatDate(f.joined_on)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
