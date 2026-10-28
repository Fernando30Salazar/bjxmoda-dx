import { navigate } from '../lib/router.js';

export default function SiteHeader({ route }) {
  const go = (r, anchor) => (e) => {
    e.preventDefault();
    navigate(r, anchor);
  };
  return (
    <header className="site-header">
      <a href="#/" className="wordmark" onClick={go('home')} aria-label="BJXMODA, inicio">
        BJXMODA
      </a>
      <nav aria-label="Principal">
        <ul className="site-nav">
          <li>
            <a href="#/" onClick={go('home', 'experience')}>The Experience</a>
          </li>
          <li>
            <a
              href="#/new-faces"
              onClick={go('new-faces')}
              aria-current={route === 'new-faces' ? 'page' : undefined}
            >
              New Faces
            </a>
          </li>
          <li className="site-nav__cta">
            <a href="#/test" onClick={go('test')} aria-current={route === 'test' ? 'page' : undefined}>
              Discover Your Identity
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
