// Tonos de cada arquetipo. Se usan en CSS (como variables) y en el
// renderizador de la tarjeta (canvas), para que pantalla y PNG coincidan.
export const ARCHETYPE_STYLES = {
  avant_garde: {
    ground: '#1F2FD1', // azul cobalto
    ink: '#FFFFFF',
    accent: '#111111',
    soft: '#C9CEF6',
  },
  icon: {
    ground: '#4E1220', // vino
    ink: '#F3EBDD',
    accent: '#C7AE76', // champaña
    soft: '#7A3242',
  },
  street_creative: {
    ground: '#111111',
    ink: '#F5F5F5',
    accent: '#F2C200', // amarillo de cinta de backstage
    soft: '#3A3A3A',
  },
  muse: {
    ground: '#D9B9C6', // rosa empolvado
    ink: '#33182F', // ciruela
    accent: '#7D3F6E',
    soft: '#EEDDE4',
  },
};

export function archetypeCssVars(key) {
  const s = ARCHETYPE_STYLES[key];
  if (!s) return {};
  return {
    '--arch-ground': s.ground,
    '--arch-ink': s.ink,
    '--arch-accent': s.accent,
    '--arch-soft': s.soft,
  };
}
