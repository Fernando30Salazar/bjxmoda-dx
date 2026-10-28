import { useState } from 'react';
import { manageParticipation } from '../lib/api.js';

/** Activa o retira la aparición en New Faces usando código + clave privada. */
export default function ConsentControl({ publicCode, manageKey, publicConsent, onChange }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const toggle = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = !publicConsent;
      const data = await manageParticipation({
        action: 'set_consent',
        publicCode,
        manageKey,
        publicConsent: next,
      });
      onChange(data.publicConsent);
      setMessage(data.publicConsent ? 'Listo: ya formas parte de New Faces.' : 'Listo: tu nombre ya no aparece en New Faces.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="consent-control">
      <p className="consent-control__state">
        {publicConsent
          ? 'Tu nombre público y tu arquetipo aparecen en New Faces.'
          : 'Tu participación es privada: no apareces en New Faces.'}
      </p>
      <button type="button" className="button button--ghost" onClick={toggle} disabled={busy} aria-busy={busy}>
        {busy ? 'Guardando…' : publicConsent ? 'Retirar mi nombre de New Faces' : 'Aparecer en New Faces'}
      </button>
      <p className="sr-status" role="status">{message}</p>
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  );
}
