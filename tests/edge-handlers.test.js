// Pruebas de las Edge Functions con una base de datos en memoria.
// Verifican que el servidor ignora puntuaciones del cliente, que el
// consentimiento es explícito y que la gestión exige la clave privada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRegisterHandler,
  createManageHandler,
} from '../supabase/functions/_shared/handlers.js';
import { sha256Hex } from '../supabase/functions/_shared/http.js';

function memoryDb() {
  const rows = [];
  const sessions = new Map([['11111111-1111-4111-8111-111111111111', { done: false }]]);
  return {
    rows,
    async completeSession(id) {
      const s = sessions.get(id);
      if (!s || s.done) return false;
      s.done = true;
      return true;
    },
    async insertParticipant(row) {
      const data = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
      rows.push(data);
      return { data, error: null };
    },
    async findByCode(code) {
      return rows.find((r) => r.public_code === code) ?? null;
    },
    async updateConsent(id, consent) {
      const r = rows.find((x) => x.id === id);
      r.public_consent = consent;
      return { data: r, error: null };
    },
    async deleteParticipant(id) {
      rows.splice(rows.findIndex((x) => x.id === id), 1);
      return { error: null };
    },
  };
}

const silent = { error() {} };
const post = (body) =>
  new Request('http://local/fn', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const valid = {
  publicName: '  Ana   Paula ',
  answers: ['C', 'C', 'A', 'C', 'B', 'D', 'C'],
  termsAccepted: true,
};

test('registro válido: calcula en servidor e ignora puntuaciones del cliente', async () => {
  const db = memoryDb();
  const h = createRegisterHandler({ db, env: { STORE_ANSWERS: 'false' }, log: silent });
  const res = await h(post({ ...valid, archetype: 'icon', scores: { icon: 7 }, score_icon: 7 }));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.archetype, 'street_creative');
  assert.equal(body.scores.street_creative, 4);
  assert.equal(body.scores.icon, 1);
  assert.equal(body.publicName, 'Ana Paula');
  assert.match(body.publicCode, /^BJX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.match(body.manageKey, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(body.publicConsent, false, 'sin consentimiento explícito no se publica');
  assert.equal(db.rows[0].answers, null, 'STORE_ANSWERS=false no guarda respuestas');
  assert.equal(db.rows[0].manage_token_hash, await sha256Hex(body.manageKey));
  assert.ok(!('manageKey' in db.rows[0]), 'la clave no se guarda en claro');
});

test('consentimiento: solo true booleano publica', async () => {
  const db = memoryDb();
  const h = createRegisterHandler({ db, env: {}, log: silent });
  assert.equal((await h(post({ ...valid, publicConsent: 'true' }))).status, 400);
  assert.equal((await h(post({ ...valid, publicConsent: 1 }))).status, 400);
  const ok = await (await h(post({ ...valid, publicConsent: true }))).json();
  assert.equal(ok.publicConsent, true);
});

test('rechaza términos no aceptados, nombre inválido, respuestas inválidas y honeypot', async () => {
  const h = createRegisterHandler({ db: memoryDb(), env: {}, log: silent });
  assert.equal((await h(post({ ...valid, termsAccepted: false }))).status, 400);
  assert.equal((await h(post({ ...valid, publicName: '<b>x</b>' }))).status, 400);
  assert.equal((await h(post({ ...valid, answers: ['A', 'B'] }))).status, 400);
  assert.equal((await h(post({ ...valid, answers: ['A', 'A', 'A', 'A', 'A', 'A', 'X'] }))).status, 400);
  assert.equal((await h(post({ ...valid, website: 'spam.example' }))).status, 400);
  assert.equal((await h(post({ ...valid, sessionId: 'not-a-uuid' }))).status, 400);
  assert.equal((await h(post('{malformed'))).status, 400);
  assert.equal((await h(post('x'.repeat(5000)))).status, 400);
  const get = await h(new Request('http://local/fn', { method: 'GET' }));
  assert.equal(get.status, 405);
});

test('guarda respuestas solo con STORE_ANSWERS=true y vincula sesión una vez', async () => {
  const db = memoryDb();
  const h = createRegisterHandler({ db, env: { STORE_ANSWERS: 'true' }, log: silent });
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const a = await (await h(post({ ...valid, sessionId }))).json();
  const b = await (await h(post({ ...valid, sessionId }))).json();
  assert.equal(a.sessionLinked, true);
  assert.equal(b.sessionLinked, false, 'una sesión no se reutiliza');
  assert.deepEqual(db.rows[0].answers, valid.answers);
});

test('gestión: requiere código + clave; permite revocar y borrar', async () => {
  const db = memoryDb();
  const env = {};
  const reg = createRegisterHandler({ db, env, log: silent });
  const man = createManageHandler({ db, env, log: silent });
  const p = await (await reg(post({ ...valid, publicConsent: true }))).json();

  const wrongKey = await man(post({ action: 'get', publicCode: p.publicCode, manageKey: 'A'.repeat(43) }));
  assert.equal(wrongKey.status, 404);
  const wrongCode = await man(post({ action: 'get', publicCode: 'BJX-AAAA-AAAA', manageKey: p.manageKey }));
  assert.equal(wrongCode.status, 404);
  assert.deepEqual(await wrongKey.json(), await wrongCode.json(), 'mismo mensaje en ambos casos');

  const got = await (await man(post({ action: 'get', publicCode: p.publicCode.toLowerCase(), manageKey: p.manageKey }))).json();
  assert.equal(got.publicName, 'Ana Paula');
  assert.ok(!('manage_token_hash' in got) && !('manageTokenHash' in got));

  const revoked = await (await man(post({
    action: 'set_consent', publicCode: p.publicCode, manageKey: p.manageKey, publicConsent: false,
  }))).json();
  assert.equal(revoked.publicConsent, false);
  assert.equal(db.rows[0].public_consent, false);

  const del = await man(post({ action: 'delete', publicCode: p.publicCode, manageKey: p.manageKey }));
  assert.equal(del.status, 200);
  assert.equal(db.rows.length, 0);
});

test('CORS restringido a ALLOWED_ORIGINS', async () => {
  const h = createRegisterHandler({
    db: memoryDb(), env: { ALLOWED_ORIGINS: 'https://bjxmoda.vercel.app' }, log: silent,
  });
  const res = await h(new Request('http://local/fn', {
    method: 'OPTIONS', headers: { origin: 'https://evil.example' },
  }));
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://bjxmoda.vercel.app');
});
