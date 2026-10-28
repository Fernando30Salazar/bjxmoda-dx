-- Pruebas de seguridad y validación del esquema.
-- Uso (local):   psql -v ON_ERROR_STOP=1 -f tests/sql/10_security_tests.sql
-- Uso (Supabase): pegar en el SQL Editor; todo corre dentro de una
--                 transacción que se revierte al final (no deja datos).
-- Cada bloque lanza una excepción si una garantía no se cumple.

begin;

-- Datos de prueba (como service_role, igual que la Edge Function).
set local role service_role;

insert into public.test_sessions (id, started_at)
values ('11111111-1111-4111-8111-111111111111', now() - interval '3 minutes');

insert into public.fashion_participants
  (public_code, public_name, archetype, secondary_archetype,
   score_avant_garde, score_icon, score_street_creative, score_muse,
   public_consent, terms_accepted_at, manage_token_hash, session_id)
values
  ('BJX-TEST-PUB2', 'Prueba Publica', 'icon', null, 1, 4, 1, 1,
   true,  now(), repeat('a', 64), null),
  ('BJX-TEST-PRV2', 'Prueba Privada', 'muse', 'avant_garde', 3, 0, 1, 3,
   false, now(), repeat('b', 64), null),
  ('BJX-TEST-HDN2', 'Prueba Oculta', 'icon', null, 0, 7, 0, 0,
   true,  now(), repeat('c', 64), null);
update public.fashion_participants set is_hidden = true where public_code = 'BJX-TEST-HDN2';

reset role;

-- ---------------------------------------------------------------
-- T1. anon no puede leer la tabla de participantes
-- ---------------------------------------------------------------
set local role anon;
do $$ begin
  perform 1 from public.fashion_participants limit 1;
  raise exception 'T1 FALLA: anon pudo leer fashion_participants';
exception when insufficient_privilege then
  raise notice 'T1 ok: anon no lee fashion_participants';
end $$;

-- T2. anon no puede insertar puntuaciones arbitrarias
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-HACK-HACK', 'Hacker', 'icon', 0, 7, 0, 0, now(), repeat('d', 64));
  raise exception 'T2 FALLA: anon pudo insertar';
exception when insufficient_privilege then
  raise notice 'T2 ok: anon no inserta';
end $$;

-- T3. anon no puede cambiar el consentimiento de nadie
do $$ begin
  update public.fashion_participants set public_consent = true;
  raise exception 'T3 FALLA: anon pudo actualizar';
exception when insufficient_privilege then
  raise notice 'T3 ok: anon no actualiza';
end $$;

-- T4. anon no puede borrar
do $$ begin
  delete from public.fashion_participants;
  raise exception 'T4 FALLA: anon pudo borrar';
exception when insufficient_privilege then
  raise notice 'T4 ok: anon no borra';
end $$;

-- T5. La galería solo devuelve personas con consentimiento y no ocultas
do $$
declare v_names text[];
begin
  select array_agg(public_name) into v_names
  from public.get_new_faces()
  where public_code like 'BJX-TEST-%';
  if v_names is distinct from array['Prueba Publica'] then
    raise exception 'T5 FALLA: la galería devolvió %', v_names;
  end if;
  raise notice 'T5 ok: galería = %', v_names;
end $$;

-- T6. La galería no expone puntuaciones, respuestas ni hashes
do $$
declare v text;
begin
  v := pg_get_function_result('public.get_new_faces()'::regprocedure);
  if v <> 'TABLE(public_code text, public_name text, archetype text, joined_on date)' then
    raise exception 'T6 FALLA: columnas expuestas %', v;
  end if;
  raise notice 'T6 ok: columnas públicas = %', v;
end $$;

-- T7. anon no puede leer analítica ni sesiones
do $$ begin
  perform 1 from public.analytics_overview;
  raise exception 'T7 FALLA: anon leyó analytics_overview';
exception when insufficient_privilege then
  raise notice 'T7 ok: anon no lee analítica';
end $$;
do $$ begin
  perform 1 from public.test_sessions;
  raise exception 'T7b FALLA: anon leyó test_sessions';
exception when insufficient_privilege then
  raise notice 'T7b ok: anon no lee sesiones';
end $$;

-- T8. anon no puede ejecutar la función privada de sesiones
do $$ begin
  perform public.complete_test_session('11111111-1111-4111-8111-111111111111');
  raise exception 'T8 FALLA: anon ejecutó complete_test_session';
exception when insufficient_privilege then
  raise notice 'T8 ok: complete_test_session es privada';
end $$;

-- T9. anon puede iniciar una sesión (y solo obtiene su id)
do $$
declare v uuid;
begin
  v := public.start_test_session();
  if v is null then raise exception 'T9 FALLA: sin id de sesión'; end if;
  raise notice 'T9 ok: sesión creada';
end $$;

-- T10. El cuestionario exige una sesión completada
do $$ begin
  perform public.submit_brand_perception(
    '11111111-1111-4111-8111-111111111111', 4::smallint, 4::smallint, 4::smallint, 4::smallint);
  raise exception 'T10 FALLA: aceptó una sesión no completada';
exception when raise_exception then
  if sqlerrm <> 'session_not_completed' then raise; end if;
  raise notice 'T10 ok: rechaza sesión no completada';
end $$;

reset role;

-- ---------------------------------------------------------------
-- Restricciones de integridad (como service_role)
-- ---------------------------------------------------------------
set local role service_role;

-- T11. Puntuaciones fuera de rango / suma distinta de 7
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-BAD2', 'Mala Suma', 'icon', 0, 8, 0, 0, now(), repeat('e', 64));
  raise exception 'T11 FALLA: aceptó puntuación 8';
exception when check_violation then
  raise notice 'T11 ok: rechaza puntuación fuera de rango';
end $$;

-- T12. Arquetipo que no es el máximo
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-BAD3', 'No Maximo', 'muse', 5, 1, 1, 0, now(), repeat('e', 64));
  raise exception 'T12 FALLA: aceptó arquetipo no máximo';
exception when check_violation then
  raise notice 'T12 ok: arquetipo debe ser el máximo';
end $$;

-- T13. Categoría inválida
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-BAD4', 'Invalida', 'diva', 7, 0, 0, 0, now(), repeat('e', 64));
  raise exception 'T13 FALLA: aceptó categoría inválida';
exception when check_violation then
  raise notice 'T13 ok: rechaza categoría inválida';
end $$;

-- T14. Secundaria que no está empatada
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, secondary_archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-BAD5', 'Sin Empate', 'icon', 'muse', 1, 4, 1, 1, now(), repeat('e', 64));
  raise exception 'T14 FALLA: aceptó secundaria sin empate';
exception when check_violation then
  raise notice 'T14 ok: secundaria debe estar empatada';
end $$;

-- T15. Formato de código público y respuestas
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('12345', 'Codigo', 'icon', 0, 7, 0, 0, now(), repeat('e', 64));
  raise exception 'T15 FALLA: aceptó código secuencial';
exception when check_violation then
  raise notice 'T15 ok: código con formato BJX-XXXX-XXXX';
end $$;
do $$ begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, answers, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-BAD6', 'Respuestas', 'icon', 0, 7, 0, 0,
          array['B','B','B','B','B','B','Z'], now(), repeat('e', 64));
  raise exception 'T15b FALLA: aceptó respuesta Z';
exception when check_violation then
  raise notice 'T15b ok: respuestas solo A–D';
end $$;

-- T16. El consentimiento es falso por defecto
do $$
declare v boolean;
begin
  insert into public.fashion_participants
    (public_code, public_name, archetype, score_avant_garde, score_icon,
     score_street_creative, score_muse, terms_accepted_at, manage_token_hash)
  values ('BJX-TEST-DFT2', 'Por Defecto', 'icon', 0, 7, 0, 0, now(), repeat('f', 64))
  returning public_consent into v;
  if v then raise exception 'T16 FALLA: consentimiento true por defecto'; end if;
  raise notice 'T16 ok: public_consent = false por defecto';
end $$;

-- T17. Flujo de sesión: completar una vez, cuestionario una vez
do $$
declare ok1 boolean; ok2 boolean; s1 boolean; s2 boolean;
begin
  ok1 := public.complete_test_session('11111111-1111-4111-8111-111111111111');
  ok2 := public.complete_test_session('11111111-1111-4111-8111-111111111111');
  if not ok1 or ok2 then raise exception 'T17 FALLA: complete % %', ok1, ok2; end if;
  s1 := public.submit_brand_perception('11111111-1111-4111-8111-111111111111', 5::smallint, 4::smallint, 3::smallint, 5::smallint);
  s2 := public.submit_brand_perception('11111111-1111-4111-8111-111111111111', 1::smallint, 1::smallint, 1::smallint, 1::smallint);
  if not s1 or s2 then raise exception 'T17 FALLA: cuestionario % %', s1, s2; end if;
  raise notice 'T17 ok: sesión y cuestionario de un solo uso';
end $$;

-- T18. La analítica funciona para service_role
do $$
declare r record;
begin
  select * into r from public.analytics_overview;
  if r.tests_completed < 1 then raise exception 'T18 FALLA: %', r; end if;
  raise notice 'T18 ok: analytics_overview %', row_to_json(r);
end $$;

reset role;
rollback;
