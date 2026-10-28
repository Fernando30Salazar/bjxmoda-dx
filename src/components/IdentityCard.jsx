import { useEffect, useState } from 'react';
import { renderCardBlob, cardAltText } from '../lib/cardRenderer.js';

/**
 * Dibuja la tarjeta en canvas y la muestra como imagen. La misma imagen se
 * usa para descargar e imprimir. Expone el blob a través de onReady.
 */
export default function IdentityCard({ data, onReady }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  const key = `${data.publicCode}|${data.publicName}|${data.archetype}`;

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setFailed(false);
    renderCardBlob(data, 2)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        onReady?.(blob);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (failed) {
    return (
      <p className="card-error" role="alert">
        Tu navegador no pudo dibujar la tarjeta. Tus resultados están guardados; prueba con otro
        navegador o recarga desde “Gestionar mi participación”.
      </p>
    );
  }

  return (
    <div className="identity-card" data-ready={url ? 'true' : 'false'}>
      {url ? (
        <img className="identity-card__img" src={url} alt={cardAltText(data)} width="1080" height="1440" />
      ) : (
        <div className="identity-card__placeholder" role="status">Imprimiendo tu tarjeta</div>
      )}
    </div>
  );
}
