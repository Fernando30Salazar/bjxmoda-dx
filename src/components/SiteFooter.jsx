import { navigate } from '../lib/router.js';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer__mark">BJXMODA</p>
      <p>
        Experiencia académica de neuromarketing en León, Guanajuato. Los arquetipos son perfiles
        creativos construidos a partir de tus preferencias declaradas; no son un diagnóstico
        psicológico ni miden respuestas cerebrales.
      </p>
      <p>
        <a
          href="#/manage"
          onClick={(e) => {
            e.preventDefault();
            navigate('manage');
          }}
        >
          Gestionar mi participación
        </a>
      </p>
    </footer>
  );
}
