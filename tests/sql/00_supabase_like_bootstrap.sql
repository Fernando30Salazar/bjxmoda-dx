-- Simula, en un PostgreSQL local, los roles y privilegios por defecto de
-- Supabase, para probar la migración y las políticas sin un proyecto real.
-- NO ejecutar en Supabase: allí estos roles ya existen.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema if not exists extensions;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase concede por defecto todo sobre objetos nuevos de public a estos
-- roles; la migración debe revocarlo explícitamente.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
