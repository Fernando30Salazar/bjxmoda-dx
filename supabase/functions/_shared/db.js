// Adaptador de base de datos para las Edge Functions (Deno).
// Usa la service_role, que solo existe en el entorno seguro de Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';

const COLUMNS =
  'id, public_code, public_name, archetype, secondary_archetype, score_avant_garde, ' +
  'score_icon, score_street_creative, score_muse, public_consent, created_at, manage_token_hash';

export function createDb() {
  const url = Deno.env.get('SUPABASE_URL');
  // Clave secreta nueva (SUPABASE_SECRET_KEYS.default) o, si no, la legacy service_role.
  // Ambas las inyecta Supabase en el entorno de la función; nunca salen al navegador.
  let serviceKey = null;
  try {
    serviceKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? null;
  } catch {
    serviceKey = null;
  }
  serviceKey = serviceKey ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Faltan SUPABASE_URL o la clave secreta del proyecto');

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async completeSession(sessionId) {
      const { data, error } = await sb.rpc('complete_test_session', { p_session_id: sessionId });
      if (error) throw error;
      return data === true;
    },
    async insertParticipant(row) {
      const { data, error } = await sb
        .from('fashion_participants')
        .insert(row)
        .select(COLUMNS)
        .single();
      return { data, error };
    },
    async findByCode(code) {
      const { data, error } = await sb
        .from('fashion_participants')
        .select(COLUMNS)
        .eq('public_code', code)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async updateConsent(id, consent) {
      const { data, error } = await sb
        .from('fashion_participants')
        .update({ public_consent: consent, consent_updated_at: new Date().toISOString() })
        .eq('id', id)
        .select(COLUMNS)
        .single();
      return { data, error };
    },
    async deleteParticipant(id) {
      const { error } = await sb.from('fashion_participants').delete().eq('id', id);
      return { error };
    },
  };
}

export function readEnv() {
  return {
    ALLOWED_ORIGINS: Deno.env.get('ALLOWED_ORIGINS') ?? '',
    STORE_ANSWERS: Deno.env.get('STORE_ANSWERS') ?? 'false',
  };
}
