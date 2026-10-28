import { navigate } from '../lib/router.js';
import { ARCHETYPES } from '../../supabase/functions/_shared/scoring.js';
import HeroVisual from './HeroVisual.jsx';

export default function Landing() {
  const goTest = (e) => {
    e.preventDefault();
    navigate('test');
  };
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__mega" aria-hidden="true">BJXMODA</p>
        <div className="hero__grid">
          <div className="hero__copy">
            <h1 id="hero-title" className="hero__title">
              Discover your fashion identity
            </h1>
            <p className="hero__subtitle">Your style. Your identity. Your place in fashion.</p>
            <p className="hero__lede">
              Responde siete preguntas sobre cómo miras, eliges y vives la moda. Al final recibes
              tu tarjeta editorial y decides si quieres aparecer en New Faces.
            </p>
            <a href="#/test" className="button button--primary" onClick={goTest}>
              Discover Your Identity
            </a>
            <p className="hero__note">7 preguntas, unos dos minutos. Solo te pedimos un nombre público.</p>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section id="experience" className="experience" aria-labelledby="experience-title">
        <h2 id="experience-title" className="section-title">The Experience</h2>
        <ol className="experience__steps">
          <li>
            <h3>Responde</h3>
            <p>Siete preguntas con cuatro opciones cada una. No hay respuestas correctas: elige la que se sienta más tuya.</p>
          </li>
          <li>
            <h3>Recibe tu tarjeta</h3>
            <p>Tu arquetipo, tu frase y tus puntuaciones en una tarjeta de backstage que puedes descargar o imprimir.</p>
          </li>
          <li>
            <h3>Únete a New Faces</h3>
            <p>Solo si lo autorizas, tu nombre público y tu arquetipo aparecen en la galería. Puedes retirarlo cuando quieras.</p>
          </li>
        </ol>

        <div className="archetype-index">
          {Object.values(ARCHETYPES).map((a) => (
            <article key={a.key} className={`archetype-index__item arch--${a.key}`}>
              <h3>{a.name}</h3>
              <p className="archetype-index__traits">{a.traits}.</p>
              <blockquote>“{a.quote}”</blockquote>
            </article>
          ))}
        </div>
      </section>

      <section className="faces-teaser" aria-labelledby="faces-teaser-title">
        <h2 id="faces-teaser-title" className="section-title">New Faces</h2>
        <p>
          La galería reúne a quienes completaron la experiencia y decidieron mostrar su nombre.
          Sin fotos obligatorias, sin puntuaciones públicas.
        </p>
        <a
          href="#/new-faces"
          className="button button--ghost"
          onClick={(e) => {
            e.preventDefault();
            navigate('new-faces');
          }}
        >
          Ver New Faces
        </a>
      </section>
    </>
  );
}
