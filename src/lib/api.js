// Acceso a Supabase desde el navegador.
// El navegador solo puede: iniciar una sesión anónima, llamar a las Edge
// Functions, leer la galería por get_new_faces() y enviar el cuestionario.
import { supabase, isSupabaseConfigured } from './supabase.js';

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function requireClient() {
  if (!isSupabaseConfigured) {
    throw new ApiError(
      'La conexión con Supabase no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.',
      'not_configured',
    );
  }
  return supabase;
}

async function invoke(name, body) {
  const sb = requireClient();
  const { data, error } = await sb.functions.invoke(name, { body });
  if (!error) return data;

  // FunctionsHttpError trae la respuesta del servidor en error.context.
  let payload = null;
  try {
    payload = await error.context?.json?.();
  } catch {
    /* respuesta sin JSON */
  }
  if (payload?.message) throw new ApiError(payload.message, payload.error);
  throw new ApiError(
    'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    'network',
  );
}

/** Crea una sesión anónima para medir finalización. Nunca bloquea el test. */
export async function startTestSession() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('start_test_session');
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export function registerParticipant({ publicName, answers, termsAccepted, publicConsent, sessionId, website }) {
  return invoke('register-participant', {
    publicName,
    answers,
    termsAccepted,
    publicConsent,
    sessionId,
    website,
  });
}

export function manageParticipation(payload) {
  return invoke('manage-participation', payload);
}

export async function fetchNewFaces() {
  const sb = requireClient();
  const { data, error } = await sb.rpc('get_new_faces');
  if (error) throw new ApiError('No pudimos cargar New Faces.', 'gallery_failed');
  return data ?? [];
}

export async function submitPerception(sessionId, values) {
  const sb = requireClient();
  const { data, error } = await sb.rpc('submit_brand_perception', {
    p_session_id: sessionId,
    p_belonging: values.belonging,
    p_identity_match: values.identity_match,
    p_personalization: values.personalization,
    p_brand_value: values.brand_value,
  });
  if (error) {
    const expired = /session_(expired|not_completed)/.test(error.message ?? '');
    throw new ApiError(
      expired
        ? 'Este cuestionario ya no está disponible para tu sesión.'
        : 'No pudimos enviar tus respuestas. Intenta de nuevo.',
      'survey_failed',
    );
  }
  return data;
}
