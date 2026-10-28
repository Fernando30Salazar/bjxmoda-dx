// Lógica de las Edge Functions, independiente del runtime.
// `db` se inyecta: en producción usa supabase-js con service_role (index.ts);
// en las pruebas (tests/edge-handlers.test.js) se usa un doble en memoria.

import {
  scoreAnswers,
  validateAnswers,
  validateName,
  normalizeName,
  CODE_RE,
} from './scoring.js';
import {
  corsHeaders,
  json,
  readJson,
  randomCode,
  randomToken,
  sha256Hex,
  timingSafeEqualHex,
  TOKEN_RE,
  UUID_RE,
} from './http.js';

const UNIQUE_VIOLATION = '23505';

function publicView(row) {
  return {
    publicCode: row.public_code,
    publicName: row.public_name,
    archetype: row.archetype,
    secondaryArchetype: row.secondary_archetype,
    scores: {
      avant_garde: row.score_avant_garde,
      icon: row.score_icon,
      street_creative: row.score_street_creative,
      muse: row.score_muse,
    },
    publicConsent: row.public_consent,
    createdAt: row.created_at,
  };
}

/**
 * POST /register-participant
 * body: { publicName, answers[7], termsAccepted: true, publicConsent?: boolean,
 *         sessionId?: uuid, website?: '' (honeypot) }
 */
export function createRegisterHandler({ db, env, log = console }) {
  return async function handle(request) {
    const cors = corsHeaders(request, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors);

    let body;
    try {
      body = await readJson(request);
    } catch {
      return json(400, { error: 'bad_request', message: 'Solicitud no válida.' }, cors);
    }

    // Honeypot: un campo oculto que las personas no rellenan.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return json(400, { error: 'bad_request', message: 'Solicitud no válida.' }, cors);
    }

    if (body.termsAccepted !== true) {
      return json(400, {
        error: 'terms_required',
        message: 'Acepta las condiciones de participación para continuar.',
      }, cors);
    }

    if (body.publicConsent !== undefined && typeof body.publicConsent !== 'boolean') {
      return json(400, { error: 'bad_consent', message: 'Consentimiento no válido.' }, cors);
    }
    // Nunca se publica por defecto: solo `true` explícito activa la galería.
    const publicConsent = body.publicConsent === true;

    const nameError = validateName(body.publicName);
    if (nameError) return json(400, { error: 'bad_name', message: nameError }, cors);
    const publicName = normalizeName(body.publicName);

    const answersError = validateAnswers(body.answers);
    if (answersError) return json(400, { error: 'bad_answers', message: answersError }, cors);

    let sessionId = null;
    if (body.sessionId != null) {
      if (typeof body.sessionId !== 'string' || !UUID_RE.test(body.sessionId)) {
        return json(400, { error: 'bad_session', message: 'Sesión no válida.' }, cors);
      }
      sessionId = body.sessionId;
    }

    // Las puntuaciones SIEMPRE se calculan aquí, nunca se aceptan del cliente.
    const result = scoreAnswers(body.answers);

    // La sesión solo se vincula si existe, está abierta y es reciente.
    // Si no, la participación se guarda igual (sin tiempo de finalización).
    let linkedSession = null;
    if (sessionId) {
      try {
        if (await db.completeSession(sessionId)) linkedSession = sessionId;
      } catch (e) {
        log.error('complete_session_failed', e?.message);
      }
    }

    const manageKey = randomToken();
    const manageHash = await sha256Hex(manageKey);
    const now = new Date().toISOString();
    const storeAnswers = String(env.STORE_ANSWERS ?? '').toLowerCase() === 'true';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const row = {
        public_code: randomCode(),
        public_name: publicName,
        archetype: result.archetype,
        secondary_archetype: result.secondaryArchetype,
        score_avant_garde: result.scores.avant_garde,
        score_icon: result.scores.icon,
        score_street_creative: result.scores.street_creative,
        score_muse: result.scores.muse,
        answers: storeAnswers ? body.answers : null,
        public_consent: publicConsent,
        consent_updated_at: now,
        terms_accepted_at: now,
        manage_token_hash: manageHash,
        session_id: linkedSession,
      };

      const { data, error } = await db.insertParticipant(row);
      if (!error) {
        return json(201, {
          ...publicView(data),
          tie: result.tie,
          tiedArchetypes: result.tiedArchetypes,
          manageKey,
          sessionLinked: Boolean(linkedSession),
        }, cors);
      }
      if (error.code === UNIQUE_VIOLATION && String(error.message).includes('public_code')) {
        continue; // colisión de código: reintentar con otro
      }
      log.error('insert_failed', error.code, error.message);
      return json(500, {
        error: 'save_failed',
        message: 'No pudimos guardar tu participación. Intenta de nuevo en unos segundos.',
      }, cors);
    }

    return json(500, { error: 'save_failed', message: 'No pudimos generar tu código. Intenta de nuevo.' }, cors);
  };
}

/**
 * POST /manage-participation
 * body: { action: 'get' | 'set_consent' | 'delete', publicCode, manageKey, publicConsent? }
 */
export function createManageHandler({ db, env, log = console }) {
  return async function handle(request) {
    const cors = corsHeaders(request, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, cors);

    let body;
    try {
      body = await readJson(request);
    } catch {
      return json(400, { error: 'bad_request', message: 'Solicitud no válida.' }, cors);
    }

    const action = body.action;
    if (!['get', 'set_consent', 'delete'].includes(action)) {
      return json(400, { error: 'bad_action', message: 'Acción no válida.' }, cors);
    }

    const code = String(body.publicCode ?? '').trim().toUpperCase();
    const key = String(body.manageKey ?? '').trim();
    // Respuesta idéntica para código inexistente y clave incorrecta.
    const notFound = json(404, {
      error: 'not_found',
      message: 'El código o la clave privada no coinciden.',
    }, cors);
    if (!CODE_RE.test(code) || !TOKEN_RE.test(key)) return notFound;

    const row = await db.findByCode(code);
    if (!row) return notFound;
    const hash = await sha256Hex(key);
    if (!timingSafeEqualHex(hash, row.manage_token_hash)) return notFound;

    if (action === 'get') return json(200, publicView(row), cors);

    if (action === 'set_consent') {
      if (typeof body.publicConsent !== 'boolean') {
        return json(400, { error: 'bad_consent', message: 'Indica true o false.' }, cors);
      }
      const { data, error } = await db.updateConsent(row.id, body.publicConsent);
      if (error) {
        log.error('consent_update_failed', error.message);
        return json(500, { error: 'save_failed', message: 'No pudimos actualizar tu preferencia.' }, cors);
      }
      return json(200, publicView(data), cors);
    }

    const { error } = await db.deleteParticipant(row.id);
    if (error) {
      log.error('delete_failed', error.message);
      return json(500, { error: 'delete_failed', message: 'No pudimos borrar tu participación.' }, cors);
    }
    return json(200, { deleted: true }, cors);
  };
}
