import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreAnswers,
  validateAnswers,
  validateName,
  normalizeName,
} from '../supabase/functions/_shared/scoring.js';
import { QUESTIONS } from '../src/data/questions.js';

test('cada pregunta tiene 4 opciones A–D', () => {
  assert.equal(QUESTIONS.length, 7);
  for (const q of QUESTIONS) {
    assert.deepEqual(q.options.map((o) => o.letter), ['A', 'B', 'C', 'D']);
  }
});

test('mayoría clara', () => {
  const r = scoreAnswers(['B', 'B', 'A', 'B', 'C', 'B', 'D']);
  assert.equal(r.archetype, 'icon');
  assert.equal(r.secondaryArchetype, null);
  assert.equal(r.tie, false);
  assert.deepEqual(r.scores, { avant_garde: 1, icon: 4, street_creative: 1, muse: 1 });
});

test('las puntuaciones siempre suman 7', () => {
  const letters = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 2000; i += 1) {
    const a = Array.from({ length: 7 }, () => letters[Math.floor(Math.random() * 4)]);
    const r = scoreAnswers(a);
    const s = r.scores;
    assert.equal(s.avant_garde + s.icon + s.street_creative + s.muse, 7);
    const max = Math.max(...Object.values(s));
    assert.equal(s[r.archetype], max);
    if (r.secondaryArchetype) assert.equal(s[r.secondaryArchetype], max);
  }
});

test('empate: gana la categoría elegida más recientemente (P7 → P1)', () => {
  // A=3, D=3, B=1. Última respuesta empatada: D (P7).
  const r = scoreAnswers(['A', 'A', 'A', 'B', 'D', 'D', 'D']);
  assert.equal(r.archetype, 'muse');
  assert.equal(r.secondaryArchetype, 'avant_garde');
  assert.equal(r.tie, true);
});

test('empate: la P7 no empatada se salta', () => {
  // A=3, C=3, B=1 (P7 = B). Recorriendo hacia atrás: P6 = C.
  const r = scoreAnswers(['A', 'A', 'C', 'A', 'C', 'C', 'B']);
  assert.equal(r.archetype, 'street_creative');
  assert.equal(r.secondaryArchetype, 'avant_garde');
});

test('empate triple: principal y secundaria según el orden inverso', () => {
  // A=2, B=2, C=2, D=1
  const r = scoreAnswers(['A', 'B', 'C', 'D', 'A', 'B', 'C']);
  assert.equal(r.archetype, 'street_creative');
  assert.equal(r.secondaryArchetype, 'icon');
  assert.deepEqual(r.tiedArchetypes, ['street_creative', 'icon', 'avant_garde']);
});

test('la función no modifica las respuestas', () => {
  const a = ['A', 'B', 'C', 'D', 'A', 'B', 'C'];
  const copy = [...a];
  scoreAnswers(a);
  assert.deepEqual(a, copy);
});

test('validación de respuestas', () => {
  assert.ok(validateAnswers(['A']));
  assert.ok(validateAnswers('AAAAAAA'));
  assert.ok(validateAnswers(['A', 'A', 'A', 'A', 'A', 'A', 'E']));
  assert.equal(validateAnswers(['A', 'A', 'A', 'A', 'A', 'A', 'D']), null);
  assert.throws(() => scoreAnswers(['A']));
});

test('validación de nombre', () => {
  assert.equal(validateName('Ximena Ruiz'), null);
  assert.equal(validateName('María José'), null);
  assert.equal(validateName("D'Angelo"), null);
  assert.equal(validateName('Ana-Lu 2'), null);
  assert.ok(validateName('a'));
  assert.ok(validateName(''));
  assert.ok(validateName('   '));
  assert.ok(validateName('<script>'));
  assert.ok(validateName('1abc'));
  assert.ok(validateName('x'.repeat(41)));
  assert.equal(normalizeName('  Ana   Paula  '), 'Ana Paula');
});
