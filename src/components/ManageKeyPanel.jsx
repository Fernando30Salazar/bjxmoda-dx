import { useState } from 'react';
import { downloadBlob } from './CardActions.jsx';

export default function ManageKeyPanel({ publicCode, manageKey }) {
  const [copied, setCopied] = useState('');

  const text =
    `BJXMODA Fashion Identity\n` +
    `Código de participación: ${publicCode}\n` +
    `Clave privada: ${manageKey}\n\n` +
    `Con estos dos datos puedes volver a ver tu tarjeta, cambiar tu preferencia de New Faces ` +
    `o borrar tu participación en la sección "Gestionar mi participación".\n` +
    `No compartas la clave privada.\n`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('Código y clave copiados.');
    } catch {
      setCopied('No se pudo copiar automáticamente; selecciona la clave y cópiala.');
    }
  };

  return (
    <section className="key-panel" aria-labelledby="key-panel-title">
      <h2 id="key-panel-title" className="key-panel__title">Guarda tu clave privada</h2>
      <p>
        Es la única forma de volver a ver tu tarjeta en otro momento, de cambiar tu preferencia de
        galería o de borrar tu participación. No la guardamos en claro y no podemos recuperarla.
      </p>
      <dl className="key-panel__values">
        <div>
          <dt>Código</dt>
          <dd>{publicCode}</dd>
        </div>
        <div>
          <dt>Clave privada</dt>
          <dd className="key-panel__key">{manageKey}</dd>
        </div>
      </dl>
      <div className="button-row">
        <button type="button" className="button button--ghost" onClick={copy}>Copiar código y clave</button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `BJXMODA-${publicCode}-clave.txt`)}
        >
          Descargar como texto
        </button>
      </div>
      <p className="sr-status" role="status">{copied}</p>
    </section>
  );
}
