# Crear y configurar el proyecto Supabase

## 1. Crear el proyecto

1. Entra a <https://supabase.com/dashboard> y crea un proyecto nuevo (región recomendada: la más
   cercana a León, por ejemplo `us-east`/`us-west`).
2. Guarda la contraseña de la base de datos en un gestor de contraseñas.
3. En **Project Settings → API Keys** (o **API** en proyectos con claves legacy) copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_…`) o la **anon key** legacy → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - La **secret / service_role key no se copia a ningún lado**. Las Edge Functions la reciben
     automáticamente del entorno de Supabase como `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Aplicar el esquema

**Opción A, CLI (recomendada):**

```bash
npx supabase login
npx supabase link --project-ref TU_REF      # el ref está en la URL del dashboard
npx supabase db push                        # aplica supabase/migrations/*.sql
```

**Opción B, SQL Editor:** abre `supabase/migrations/20261028000000_bjxmoda_schema.sql`, pégalo
completo en **SQL Editor → New query** y ejecútalo. Se puede volver a ejecutar sin romper nada.

Qué crea:

| Objeto | Tipo | Acceso del navegador |
|---|---|---|
| `fashion_participants` | tabla | ninguno (RLS sin políticas + privilegios revocados) |
| `test_sessions` | tabla | ninguno |
| `brand_perception_responses` | tabla | ninguno |
| `get_new_faces()` | función | ejecutar (solo campos públicos con consentimiento) |
| `start_test_session()` | función | ejecutar (solo crea una sesión y devuelve su id) |
| `submit_brand_perception(...)` | función | ejecutar (una vez por sesión completada, 24 h) |
| `complete_test_session(uuid)` | función | **no**; solo service_role |
| `analytics_*` | vistas | **no**; solo SQL Editor / service_role |

> Si el panel **Advisors → Security** muestra avisos sobre funciones `security definer`, son
> intencionales: es la forma de exponer solo las columnas autorizadas. Todas fijan
> `search_path = ''`.

## 3. Secretos de las Edge Functions

```bash
# Orígenes permitidos (desarrollo + producción). Sin espacios extra.
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://bjxmoda.vercel.app"

# Guardar o no las respuestas A–D de cada pregunta.
# false (por defecto): solo se guardan puntuaciones y arquetipo.
# true: permite analytics_answers (distribución por pregunta). Documenta la finalidad
#       en tu protocolo académico si lo activas.
npx supabase secrets set STORE_ANSWERS=false
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen en el entorno de las funciones; no los
definas tú.

## 4. Desplegar las Edge Functions

```bash
npx supabase functions deploy register-participant
npx supabase functions deploy manage-participation
```

`supabase/config.toml` desactiva `verify_jwt` para ambas funciones, porque la clave publishable
nueva no es un JWT y las funciones hacen su propia validación. Si tu CLI usa otro `config.toml`
(por ejemplo, si ejecutaste `supabase init`), copia los bloques `[functions.*]` o despliega con:

```bash
npx supabase functions deploy register-participant --no-verify-jwt
npx supabase functions deploy manage-participation --no-verify-jwt
```

## 5. Comprobar

1. Ejecuta `tests/sql/10_security_tests.sql` en el SQL Editor. Debe terminar sin error y mostrar
   `T1 ok` … `T18 ok` en los mensajes. Corre dentro de una transacción que se revierte.
2. Con `npm run dev`, completa el test una vez con consentimiento y otra sin él.
3. En **Table Editor → fashion_participants** verifica: dos filas, `public_consent` correcto,
   `answers` vacío si `STORE_ANSWERS=false`, `manage_token_hash` de 64 caracteres.
4. En `#/new-faces` solo debe aparecer la persona con consentimiento.
5. Sigue el resto de [`SEGURIDAD-Y-PRUEBAS.md`](SEGURIDAD-Y-PRUEBAS.md).

## 6. Moderación y mantenimiento

```sql
-- Ocultar un nombre ofensivo de la galería sin borrar la participación
update public.fashion_participants set is_hidden = true where public_code = 'BJX-XXXX-XXXX';

-- Borrar sesiones abandonadas de más de 30 días (no tienen datos personales)
delete from public.test_sessions
where completed_at is null and started_at < now() - interval '30 days';

-- Al terminar la actividad: anonimizar nombres conservando la estadística
update public.fashion_participants
set public_name = 'Participante', public_consent = false;
```
