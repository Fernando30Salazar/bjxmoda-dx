import { useState } from 'react';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari necesita que la URL siga viva un momento después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function CardActions({ blob, publicCode, onReplay }) {
  const [status, setStatus] = useState('');

  const download = () => {
    if (!blob) return;
    downloadBlob(blob, `BJXMODA-${publicCode}.png`);
    setStatus('Descarga iniciada.');
  };

  return (
    <div className="card-actions">
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={download} disabled={!blob}>
          Descargar PNG
        </button>
        <button type="button" className="button button--ghost" onClick={() => window.print()} disabled={!blob}>
          Imprimir o guardar PDF
        </button>
        {onReplay && (
          <button type="button" className="button button--ghost" onClick={onReplay}>
            Ver la revelación otra vez
          </button>
        )}
      </div>
      <p className="sr-status" role="status">{status}</p>
    </div>
  );
}
