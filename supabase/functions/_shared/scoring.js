// Lógica canónica del Fashion Identity Test.
// La usan el frontend (para mostrar la vista previa) y la Edge Function
// (que es la única que calcula las puntuaciones que se guardan).
// JavaScript puro (ESM), compatible con navegador, Node y Deno.

export const ARCHETYPES = {
  A: {
    key: 'avant_garde',
    letter: 'A',
    name: 'The Avant-Garde',
    traits: 'Innovación, experimentación y originalidad',
    quote: 'I was never made to follow the frame.',
  },
  B: {
    key: 'icon',
    letter: 'B',
    name: 'The Icon',
    traits: 'Elegancia, presencia y sofisticación',
    quote: 'Elegance is a language of its own.',
  },
  C: {
    key: 'street_creative',
    letter: 'C',
    name: 'The Street Creative',
    traits: 'Autenticidad, cultura urbana e individualidad',
    quote: 'My style. My rules. My story.',
  },
  D: {
    key: 'muse',
    letter: 'D',
    name: 'The Muse',
    traits: 'Creatividad, emociones y narrativa visual',
    quote: 'I turn feelings into visual stories.',
  },
};

export const LETTERS = ['A', 'B', 'C', 'D'];
export const QUESTION_COUNT = 7;

export const ARCHETYPE_BY_KEY = Object.fromEntries(
  Object.values(ARCHETYPES).map((a) => [a.key, a]),
);

/**
 * Valida que answers sea un arreglo de 7 letras A–D.
 * @returns {string|null} mensaje de error o null si es válido
 */
export function validateAnswers(answers) {
  if (!Array.isArray(answers)) return 'answers debe ser un arreglo';
  if (answers.length !== QUESTION_COUNT) {
    return `answers debe tener exactamente ${QUESTION_COUNT} respuestas`;
  }
  for (const a of answers) {
    if (!LETTERS.includes(a)) return 'Cada respuesta debe ser A, B, C o D';
  }
  return null;
}

/**
 * Calcula puntuaciones y arquetipo.
 *
 * Regla de desempate (transparente y determinista):
 *   Si dos o más categorías comparten la puntuación más alta, gana la que
 *   la persona eligió MÁS RECIENTEMENTE, recorriendo sus respuestas desde
 *   la pregunta 7 hacia la 1. La pregunta 7 es la frase con la que cada
 *   participante resume su visión de la moda, por eso pesa como desempate.
 *   La siguiente categoría empatada encontrada con el mismo recorrido es la
 *   secundaria. Las respuestas nunca se modifican.
 *
 * Como cada categoría empatada tiene al menos un punto, siempre aparece en
 * las respuestas, así que la regla resuelve cualquier empate (2, 3 o 4).
 */
export function scoreAnswers(answers) {
  const error = validateAnswers(answers);
  if (error) throw new Error(error);

  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const a of answers) counts[a] += 1;

  const max = Math.max(...Object.values(counts));
  const tied = LETTERS.filter((l) => counts[l] === max);

  const order = [];
  for (let i = answers.length - 1; i >= 0; i -= 1) {
    const l = answers[i];
    if (tied.includes(l) && !order.includes(l)) order.push(l);
  }

  const primary = order[0];
  const secondary = order.length > 1 ? order[1] : null;

  return {
    scores: {
      avant_garde: counts.A,
      icon: counts.B,
      street_creative: counts.C,
      muse: counts.D,
    },
    archetype: ARCHETYPES[primary].key,
    secondaryArchetype: secondary ? ARCHETYPES[secondary].key : null,
    tie: tied.length > 1,
    tiedArchetypes: order.map((l) => ARCHETYPES[l].key),
  };
}

export const TIE_RULE_TEXT =
  'En caso de empate gana la categoría que elegiste más recientemente, ' +
  'revisando tus respuestas desde la pregunta 7 hacia la 1. ' +
  'La otra categoría empatada aparece como secundaria.';

// Validación de nombre público, compartida por cliente y servidor.
export const NAME_MIN = 2;
export const NAME_MAX = 40;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .'’\-]*$/u;

export function normalizeName(raw) {
  return String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** @returns {string|null} mensaje de error o null */
export function validateName(raw) {
  const name = normalizeName(raw);
  if (name.length < NAME_MIN) return `Escribe al menos ${NAME_MIN} caracteres.`;
  if (name.length > NAME_MAX) return `Usa como máximo ${NAME_MAX} caracteres.`;
  if (!NAME_RE.test(name)) {
    return 'Empieza con una letra y usa solo letras, números, espacios, puntos, guiones o apóstrofos.';
  }
  return null;
}

// Código público: BJX-XXXX-XXXX con alfabeto sin caracteres ambiguos.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^BJX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
