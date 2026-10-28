# Seguridad y pruebas

## Modelo de seguridad

**Principio:** el navegador no tiene acceso directo a ninguna tabla. Todo pasa por una superficie
mínima y validada en el servidor.

| Amenaza | Defensa |
|---|---|
| Leer registros privados con la clave pública | RLS activo sin políticas para `anon`/`authenticated` **y** `revoke all` en las tablas. La galería solo usa `get_new_faces()`, que devuelve 4 columnas de filas con `public_consent and not is_hidden`. |
| Insertar puntuaciones arbitrarias | Solo `register-participant` inserta (service_role). Recalcula las puntuaciones a partir de las 7 respuestas e ignora cualquier puntuación o arquetipo enviado. Además, `CHECK` en la tabla: rango 0–7, suma 7, arquetipo = máximo, secundaria empatada, categorías válidas. |
| Publicar a alguien sin consentimiento | `public_consent` es `false` por defecto en la tabla y en la función; solo el booleano `true` lo activa (`"true"` o `1` se rechazan). |
| Cambiar el consentimiento de otra persona | `manage-participation` exige código + clave privada; compara el SHA-256 en tiempo constante. Mismo mensaje para código inexistente y clave incorrecta. |
| Enumerar participantes | Códigos aleatorios `BJX-XXXX-XXXX` (32⁸ ≈ 10¹² combinaciones), no secuenciales. La clave tiene 256 bits. |
| Exponer la service_role | Solo existe en el entorno de Supabase. El frontend lee únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env*` está en `.gitignore` salvo `.env.example`. |
| Inyección de HTML en el nombre | Validación de caracteres (letras, números, espacio, `. ' -`) en cliente y servidor; React escapa el texto; el canvas dibuja texto plano. |
| Bots / spam | Honeypot oculto, límite de 4 KB por petición, validación estricta. **No hay límite de tasa por IP** (ver abajo). |
| Analítica expuesta | Vistas `analytics_*` con `security_invoker` y sin privilegios para `anon`. |
| Funciones con `search_path` manipulable | Todas las funciones `security definer` usan `set search_path = ''` y nombres calificados. |

### Riesgos residuales (conocidos)

- **Sin límite de tasa por IP.** Alguien podría crear muchas participaciones falsas llamando a la
  función. Para una actividad académica de un día suele bastar con moderar (`is_hidden`) y filtrar
  por fecha en el análisis. Si se publica abiertamente, añade un límite (por ejemplo, Cloudflare
  Turnstile en el formulario o una tabla de conteo por hash de IP con sal diaria).
- `start_test_session()` es público: inflar sesiones afecta la **tasa de finalización**. Filtra en
  el análisis por el horario de la actividad.
- Quien tenga la clave privada de alguien puede borrar su participación. La clave se muestra una
  sola vez y se recomienda guardarla.

## Pruebas automáticas

```bash
npm test
```

- `tests/scoring.test.js`: 7 preguntas × 4 opciones; mayoría; empate doble, triple y con la
  pregunta 7 no empatada; 2 000 combinaciones aleatorias (suma 7, arquetipo = máximo); las
  respuestas no se modifican; validación de nombre.
- `tests/edge-handlers.test.js`: ejecuta la lógica real de ambas funciones con una base en
  memoria: ignora puntuaciones del cliente, consentimiento solo `true`, términos, nombre,
  respuestas, honeypot, JSON inválido, cuerpo grande, método, sesión de un solo uso,
  `STORE_ANSWERS`, clave incorrecta, revocación, borrado y CORS.

### Pruebas SQL

En Supabase: pega `tests/sql/10_security_tests.sql` en el SQL Editor (todo se revierte).

En un PostgreSQL local (simula los roles de Supabase):

```bash
createdb bjx
psql -d bjx -f tests/sql/00_supabase_like_bootstrap.sql
psql -d bjx -f supabase/migrations/20261028000000_bjxmoda_schema.sql
psql -d bjx -v ON_ERROR_STOP=1 -f tests/sql/10_security_tests.sql
```

Cubren: `anon` no puede leer, insertar, actualizar ni borrar participantes; no lee sesiones ni
analítica; no ejecuta la función privada; la galería excluye privados y ocultos y solo expone 4
columnas; restricciones de rango, suma, máximo, empate, categoría, formato de código y respuestas;
consentimiento falso por defecto; sesión y cuestionario de un solo uso.

## Verificación manual en tu proyecto (antes de usarlo con participantes)

Sustituye `URL` y `KEY` por tus valores públicos.

```bash
# 1. La tabla privada NO debe ser legible con la clave pública → espera 401/403 o []
curl -s "URL/rest/v1/fashion_participants?select=*" -H "apikey: KEY" -H "Authorization: Bearer KEY"

# 2. Insertar directamente debe fallar → espera error 401/403
curl -s -X POST "URL/rest/v1/fashion_participants" -H "apikey: KEY" -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" -d '{"public_name":"x"}'

# 3. La galería solo devuelve public_code, public_name, archetype, joined_on
curl -s -X POST "URL/rest/v1/rpc/get_new_faces" -H "apikey: KEY" -H "Authorization: Bearer KEY"

# 4. La analítica no es pública → espera error
curl -s "URL/rest/v1/analytics_overview?select=*" -H "apikey: KEY" -H "Authorization: Bearer KEY"

# 5. La función ignora puntuaciones enviadas: el arquetipo devuelto debe ser street_creative
curl -s -X POST "URL/functions/v1/register-participant" -H "apikey: KEY" -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"publicName":"Prueba Seguridad","answers":["C","C","C","C","A","B","D"],"termsAccepted":true,"archetype":"icon","score_icon":7}'

# 6. Consentimiento con texto en vez de booleano → espera 400
curl -s -X POST "URL/functions/v1/register-participant" -H "apikey: KEY" -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"publicName":"Prueba","answers":["A","A","A","A","A","A","A"],"termsAccepted":true,"publicConsent":"true"}'

# 7. Gestión con clave inventada → espera 404
curl -s -X POST "URL/functions/v1/manage-participation" -H "apikey: KEY" -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"set_consent","publicCode":"BJX-AAAA-AAAA","manageKey":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","publicConsent":true}'
```

Después borra las filas de prueba (SQL Editor):
`delete from public.fashion_participants where public_name like 'Prueba%';`

Revisa también **Advisors → Security** y que **Project Settings → API → Exposed schemas** solo
incluya `public` (y `graphql_public` si lo usas).

## Accesibilidad verificada en el diseño

- Navegación completa con teclado; atajos A–D y ← en el test; el foco pasa al enunciado en cada
  pregunta y al título del resultado.
- Barra de progreso con `role="progressbar"`; errores con `role="alert"` vinculados por
  `aria-describedby`; estados con `role="status"`.
- La tarjeta (imagen) tiene texto alternativo completo y sus datos también aparecen como texto.
- Contrastes: texto secundario `#4A4A4A` sobre `#F5F5F5` (8.1:1); tonos de arquetipo entre 7:1 y 12:1; `prefers-reduced-motion`
  desactiva animaciones y acorta la revelación.
