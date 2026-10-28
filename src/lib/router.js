import { useEffect, useState } from 'react';

// Enrutado por hash: funciona en Vercel o cualquier hosting estático sin
// reglas de reescritura y no añade dependencias.
export const ROUTES = ['home', 'test', 'new-faces', 'manage'];

function parse() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [route] = raw.split(/[?#]/);
  return ROUTES.includes(route) ? route : 'home';
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(route, anchor) {
  const target = route === 'home' ? '#/' : `#/${route}`;
  if (window.location.hash !== target) window.location.hash = target;
  requestAnimationFrame(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0 });
  });
}
