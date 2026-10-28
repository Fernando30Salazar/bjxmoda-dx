-- =====================================================================
-- BJXMODA — Fashion Identity Experience
-- Esquema, restricciones, índices, funciones, vistas y RLS.
--
-- Modelo de seguridad:
--   * Ninguna tabla es legible ni escribible por los roles anon/authenticated.
--     RLS está activado y SIN políticas para esos roles, y además se revocan
--     los privilegios (defensa doble).
--   * Las inserciones de participantes solo las hace la Edge Function
--     `register-participant` con la service_role, que recalcula puntuaciones.
--   * La galería pública solo lee la función get_new_faces(), que devuelve
--     4 columnas de personas con public_consent = true y no ocultas.
--   * Cambiar el consentimiento o borrar la participación exige el código
--     público + la clave privada (solo se guarda su hash SHA-256).
--   * Las vistas analytics_* solo las consulta el equipo investigador
--     (SQL Editor / service_role); no exponen nombres.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Sesiones del test (analítica agregada, sin datos personales)
-- ---------------------------------------------------------------------
create table if not exists public.test_sessions (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  constraint test_sessions_completed_after_start
    check (completed_at is null or completed_at >= started_at)
);

comment on table public.test_sessions is
  'Una fila por test iniciado. Sirve para tasa de finalización y tiempo de finalización. No contiene datos personales.';

create index if not exists test_sessions_started_at_idx
  on public.test_sessions (started_at);

-- ---------------------------------------------------------------------
-- 2. Participantes
-- ---------------------------------------------------------------------
create table if not exists public.fashion_participants (
  id                     uuid primary key default gen_random_uuid(),
  public_code            text not null unique,
  public_name            text not null,
  archetype              text not null,
  secondary_archetype    text,
  score_avant_garde      smallint not null,
  score_icon             smallint not null,
  score_street_creative  smallint not null,
  score_muse             smallint not null,
  answers                text[],
  public_consent         boolean not null default false,
  consent_updated_at     timestamptz,
  is_hidden              boolean not null default false,
  terms_accepted_at      timestamptz not null,
  manage_token_hash      text not null,
  session_id             uuid unique references public.test_sessions (id) on delete set null,
  created_at             timestamptz not null default now(),

  constraint fp_public_code_format
    check (public_code ~ '^BJX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  constraint fp_public_name_length
    check (char_length(public_name) between 2 and 40),
  constraint fp_public_name_trimmed
    check (public_name = btrim(public_name) and public_name !~ '\s{2,}'),
  constraint fp_archetype_valid
    check (archetype in ('avant_garde', 'icon', 'street_creative', 'muse')),
  constraint fp_secondary_valid
    check (secondary_archetype is null
           or (secondary_archetype in ('avant_garde', 'icon', 'street_creative', 'muse')
               and secondary_archetype <> archetype)),
  constraint fp_scores_range
    check (score_avant_garde between 0 and 7
       and score_icon between 0 and 7
       and score_street_creative between 0 and 7
       and score_muse between 0 and 7),
  constraint fp_scores_total
    check (score_avant_garde + score_icon + score_street_creative + score_muse = 7),
  -- El arquetipo principal debe tener la puntuación máxima.
  constraint fp_archetype_is_max
    check (
      (case archetype
         when 'avant_garde'     then score_avant_garde
         when 'icon'            then score_icon
         when 'street_creative' then score_street_creative
         when 'muse'            then score_muse
       end)
      = greatest(score_avant_garde, score_icon, score_street_creative, score_muse)
    ),
  -- Si hay secundaria, debe estar empatada con la principal.
  constraint fp_secondary_is_tied
    check (
      secondary_archetype is null or
      (case secondary_archetype
         when 'avant_garde'     then score_avant_garde
         when 'icon'            then score_icon
         when 'street_creative' then score_street_creative
         when 'muse'            then score_muse
       end)
      = greatest(score_avant_garde, score_icon, score_street_creative, score_muse)
    ),
  constraint fp_answers_shape
    check (answers is null
           or (cardinality(answers) = 7 and answers <@ array['A', 'B', 'C', 'D']::text[])),
  constraint fp_manage_token_hash_format
    check (manage_token_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.fashion_participants is
  'Registros personales del test. Privados: solo service_role. La galería usa get_new_faces().';
comment on column public.fashion_participants.answers is
  'Respuestas A–D en orden. Solo se guardan si la Edge Function tiene STORE_ANSWERS=true, para analizar la distribución por pregunta en la actividad académica.';
comment on column public.fashion_participants.is_hidden is
  'Moderación: el equipo puede ocultar un nombre de la galería sin borrar la participación.';
comment on column public.fashion_participants.manage_token_hash is
  'SHA-256 (hex) de la clave privada entregada al participante. La clave nunca se guarda en claro.';

create index if not exists fp_gallery_idx
  on public.fashion_participants (created_at desc)
  where public_consent and not is_hidden;
create index if not exists fp_archetype_idx
  on public.fashion_participants (archetype);
create index if not exists fp_created_at_idx
  on public.fashion_participants (created_at);

-- ---------------------------------------------------------------------
-- 3. Cuestionario posterior opcional (percepción de marca)
--    Ligado a la sesión, no al nombre.
-- ---------------------------------------------------------------------
create table if not exists public.brand_perception_responses (
  session_id        uuid primary key references public.test_sessions (id) on delete cascade,
  belonging         smallint not null check (belonging between 1 and 5),
  identity_match    smallint not null check (identity_match between 1 and 5),
  personalization   smallint not null check (personalization between 1 and 5),
  brand_value       smallint not null check (brand_value between 1 and 5),
  created_at        timestamptz not null default now()
);

comment on table public.brand_perception_responses is
  'Escala Likert 1–5, opcional, anónima a nivel de sesión. belonging = pertenencia; identity_match = el resultado me representa; personalization = la experiencia se sintió personal; brand_value = percepción de valor de BJXMODA.';

-- ---------------------------------------------------------------------
-- 4. RLS y privilegios
-- ---------------------------------------------------------------------
alter table public.test_sessions               enable row level security;
alter table public.fashion_participants        enable row level security;
alter table public.brand_perception_responses  enable row level security;

-- Sin políticas para anon/authenticated => acceso denegado por RLS.
-- Además se retiran los privilegios que Supabase concede por defecto.
revoke all on table public.test_sessions              from anon, authenticated;
revoke all on table public.fashion_participants       from anon, authenticated;
revoke all on table public.brand_perception_responses from anon, authenticated;

grant all on table public.test_sessions              to service_role;
grant all on table public.fashion_participants       to service_role;
grant all on table public.brand_perception_responses to service_role;

-- service_role ignora RLS (bypassrls) en Supabase; esta política solo
-- documenta la intención y cubre entornos donde no fuera así.
drop policy if exists service_role_all on public.test_sessions;
create policy service_role_all on public.test_sessions
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.fashion_participants;
create policy service_role_all on public.fashion_participants
  for all to service_role using (true) with check (true);
drop policy if exists service_role_all on public.brand_perception_responses;
create policy service_role_all on public.brand_perception_responses
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------
-- 5. Funciones públicas (RPC) — superficie mínima para el navegador
-- ---------------------------------------------------------------------

-- 5.1 Galería: solo campos autorizados de personas con consentimiento.
create or replace function public.get_new_faces()
returns table (
  public_code  text,
  public_name  text,
  archetype    text,
  joined_on    date
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_code,
         p.public_name,
         p.archetype,
         (p.created_at at time zone 'America/Mexico_City')::date as joined_on
  from public.fashion_participants p
  where p.public_consent
    and not p.is_hidden
  order by p.created_at desc
  limit 2000;
$$;

comment on function public.get_new_faces() is
  'Endpoint público de la galería New Faces. No expone puntuaciones, respuestas ni personas sin consentimiento.';

-- 5.2 Inicio del test: crea una sesión anónima y devuelve su id.
create or replace function public.start_test_session()
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.test_sessions default values returning id;
$$;

-- 5.3 Cuestionario posterior: una respuesta por sesión completada,
--     dentro de las 24 h siguientes a completar el test.
create or replace function public.submit_brand_perception(
  p_session_id      uuid,
  p_belonging       smallint,
  p_identity_match  smallint,
  p_personalization smallint,
  p_brand_value     smallint
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_completed timestamptz;
begin
  select s.completed_at into v_completed
  from public.test_sessions s
  where s.id = p_session_id;

  if v_completed is null then
    raise exception 'session_not_completed' using errcode = 'P0001';
  end if;
  if v_completed < now() - interval '24 hours' then
    raise exception 'session_expired' using errcode = 'P0001';
  end if;

  insert into public.brand_perception_responses
    (session_id, belonging, identity_match, personalization, brand_value)
  values
    (p_session_id, p_belonging, p_identity_match, p_personalization, p_brand_value)
  on conflict (session_id) do nothing;

  return found;
end;
$$;

-- Las funciones son ejecutables por PUBLIC por defecto: se retira y se
-- concede de forma explícita.
revoke all on function public.get_new_faces()          from public;
revoke all on function public.start_test_session()     from public;
revoke all on function public.submit_brand_perception(uuid, smallint, smallint, smallint, smallint) from public;

-- La experiencia no usa inicio de sesión: solo anon (y service_role) las ejecutan.
grant execute on function public.get_new_faces()        to anon, service_role;
grant execute on function public.start_test_session()   to anon, service_role;
grant execute on function public.submit_brand_perception(uuid, smallint, smallint, smallint, smallint)
  to anon, service_role;

-- ---------------------------------------------------------------------
-- 6. Funciones privadas usadas por las Edge Functions (service_role)
-- ---------------------------------------------------------------------

-- Marca una sesión como completada (solo una vez, dentro de 6 h).
create or replace function public.complete_test_session(p_session_id uuid)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with upd as (
    update public.test_sessions
       set completed_at = now()
     where id = p_session_id
       and completed_at is null
       and started_at > now() - interval '6 hours'
    returning 1
  )
  select exists (select 1 from upd);
$$;

revoke all on function public.complete_test_session(uuid) from public, anon, authenticated;
grant execute on function public.complete_test_session(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 7. Analítica agregada (solo equipo investigador)
-- ---------------------------------------------------------------------
create or replace view public.analytics_overview
with (security_invoker = true) as
select
  (select count(*) from public.test_sessions)                                   as tests_started,
  (select count(*) from public.test_sessions where completed_at is not null)    as tests_completed,
  round(100.0 * (select count(*) from public.test_sessions where completed_at is not null)
        / nullif((select count(*) from public.test_sessions), 0), 1)             as completion_rate_pct,
  (select count(*) from public.fashion_participants)                            as participants,
  round(100.0 * (select count(*) from public.fashion_participants where public_consent)
        / nullif((select count(*) from public.fashion_participants), 0), 1)      as gallery_consent_pct,
  (select round(percentile_cont(0.5) within group (
            order by extract(epoch from completed_at - started_at))::numeric, 1)
     from public.test_sessions
    where completed_at is not null
      and completed_at - started_at between interval '5 seconds' and interval '1 hour')
                                                                                 as median_completion_seconds;

create or replace view public.analytics_archetypes
with (security_invoker = true) as
select
  archetype,
  count(*)                                                        as participants,
  round(100.0 * count(*) / sum(count(*)) over (), 1)              as share_pct,
  count(*) filter (where secondary_archetype is not null)         as with_tie,
  count(*) filter (where public_consent)                          as in_gallery
from public.fashion_participants
group by archetype
order by participants desc;

create or replace view public.analytics_daily
with (security_invoker = true) as
select
  (started_at at time zone 'America/Mexico_City')::date            as day,
  count(*)                                                         as started,
  count(*) filter (where completed_at is not null)                 as completed
from public.test_sessions
group by 1
order by 1;

create or replace view public.analytics_perception
with (security_invoker = true) as
select
  count(*)                                   as responses,
  round(avg(belonging), 2)                   as avg_belonging,
  round(avg(identity_match), 2)              as avg_identity_match,
  round(avg(personalization), 2)             as avg_personalization,
  round(avg(brand_value), 2)                 as avg_brand_value
from public.brand_perception_responses;

-- Percepción por arquetipo (une por sesión; sin nombres).
create or replace view public.analytics_perception_by_archetype
with (security_invoker = true) as
select
  p.archetype,
  count(*)                          as responses,
  round(avg(r.belonging), 2)        as avg_belonging,
  round(avg(r.identity_match), 2)   as avg_identity_match,
  round(avg(r.personalization), 2)  as avg_personalization,
  round(avg(r.brand_value), 2)      as avg_brand_value
from public.brand_perception_responses r
join public.fashion_participants p on p.session_id = r.session_id
group by p.archetype;

-- Distribución por pregunta (solo si STORE_ANSWERS=true).
create or replace view public.analytics_answers
with (security_invoker = true) as
select
  q.question,
  q.answer,
  count(*) as picks
from public.fashion_participants p
cross join lateral unnest(p.answers) with ordinality as q(answer, question)
where p.answers is not null
group by q.question, q.answer
order by q.question, q.answer;

revoke all on table public.analytics_overview                from anon, authenticated;
revoke all on table public.analytics_archetypes              from anon, authenticated;
revoke all on table public.analytics_daily                   from anon, authenticated;
revoke all on table public.analytics_perception              from anon, authenticated;
revoke all on table public.analytics_perception_by_archetype from anon, authenticated;
revoke all on table public.analytics_answers                 from anon, authenticated;

grant select on public.analytics_overview, public.analytics_archetypes, public.analytics_daily,
                public.analytics_perception, public.analytics_perception_by_archetype,
                public.analytics_answers
  to service_role;
