import { useId, useState } from 'react';
import { manageParticipation } from '../lib/api.js';
import ResultView from './ResultView.jsx';

export default function ManageParticipation() {
  const id = useId();
  const [publicCode, setCode] = useState('');
  const [manageKey, setKey] = useState('');
  const [state, setState] = useState({ status: 'idle', data: null, error: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lookup = async (e) => {
    e.preventDefault();
    setState({ status: 'loading', data: null, error: '' });
    try {
      const data = await manageParticipation({
        action: 'get',
        publicCode: publicCode.trim(),
        manageKey: manageKey.trim(),
      });
      setState({ status: 'ready', data: { ...data, manageKey: manageKey.trim() }, error: '' });
    } catch (err) {
      setState({ status: 'idle', data: null, error: err.message });
    }
  };

  const remove = async () => {
    setState((s) => ({ ...s, status: 'deleting' }));
    try {
      await manageParticipation({
        action: 'delete',
        publicCode: state.data.publicCode,
        manageKey: state.data.manageKey,
      });
      setState({ status: 'deleted', data: null, error: '' });
      setCode('');
      setKey('');
    } catch (err) {
      setState((s) => ({ ...s, status: 'ready', error: err.message }));
    }
  };

  if (state.status === 'deleted') {
    return (
      <section className="manage page" aria-live="polite">
        <h1 className="page-title">Participación borrada</h1>
        <p>Eliminamos tu nombre, tu arquetipo y tus puntuaciones. Tu código ya no es válido.</p>
      </section>
    );
  }

  if (state.data) {
    return (
      <>
        <ResultView
          result={state.data}
          showKey={false}
          onUpdate={(patch) => setState((s) => ({ ...s, data: { ...s.data, ...patch } }))}
        />
        <section className="manage manage--danger page" aria-labelledby={`${id}-del`}>
          <h2 id={`${id}-del`} className="manage__subtitle">Borrar mi participación</h2>
          <p>Se eliminan de forma definitiva tu nombre, tu arquetipo y tus puntuaciones.</p>
          {state.error && <p className="field__error" role="alert">{state.error}</p>}
          {!confirmDelete ? (
            <button type="button" className="button button--ghost" onClick={() => setConfirmDelete(true)}>
              Borrar mi participación
            </button>
          ) : (
            <div className="button-row">
              <button
                type="button"
                className="button button--danger"
                onClick={remove}
                disabled={state.status === 'deleting'}
              >
                {state.status === 'deleting' ? 'Borrando…' : 'Sí, borrar definitivamente'}
              </button>
              <button type="button" className="link-button" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <section className="manage page" aria-labelledby={`${id}-title`}>
      <h1 id={`${id}-title`} className="page-title">Gestionar mi participación</h1>
      <p>
        Usa el código de tu tarjeta y la clave privada que recibiste al terminar el test para volver
        a ver tu tarjeta, aparecer o retirarte de New Faces, o borrar tu participación.
      </p>
      <form className="manage__form" onSubmit={lookup} noValidate>
        <div className="field">
          <label htmlFor={`${id}-code`}>Código de participación</label>
          <input
            id={`${id}-code`}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder="BJX-XXXX-XXXX"
            value={publicCode}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-key`}>Clave privada</label>
          <input
            id={`${id}-key`}
            type="password"
            autoComplete="off"
            spellCheck="false"
            value={manageKey}
            onChange={(e) => setKey(e.target.value)}
            required
          />
        </div>
        {state.error && <p className="field__error" role="alert">{state.error}</p>}
        <button
          type="submit"
          className="button button--primary"
          disabled={state.status === 'loading' || !publicCode || !manageKey}
        >
          {state.status === 'loading' ? 'Buscando…' : 'Ver mi participación'}
        </button>
      </form>
    </section>
  );
}
