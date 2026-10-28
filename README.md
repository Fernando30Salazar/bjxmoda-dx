# BJXMODA — Fashion Identity Experience

Experiencia web editorial para una actividad académica de neuromarketing: la persona responde
siete preguntas, descubre su arquetipo de moda, recibe una tarjeta de backstage descargable y,
solo si lo autoriza, aparece en la galería pública **New Faces**.

React + Vite (JavaScript, CSS separado) · Supabase (PostgreSQL, RLS, Edge Functions) · Vercel.

> **Estado:** el código, el SQL y las funciones están probados localmente (ver
> [Qué se verificó](#qué-se-verificó-y-qué-no)). La conexión con **tu** proyecto Supabase no se ha
> probado porque requiere tus credenciales: sigue la lista de verificación de
> [`docs/SEGURIDAD-Y-PRUEBAS.md`](docs/SEGURIDAD-Y-PRUEBAS.md) antes de usarlo con participantes.

---

## Proyecto Supabase ya configurado

- Proyecto: `bjxmoda` (ref `jkotuhvwtcuwkqufrpdi`, us-east-1).
- Migración aplicada; Edge Functions `register-participant` y `manage-participation` desplegadas
  con `verify_jwt = false`.
- `.env.local` ya contiene la URL y la clave publishable (valores públicos; no se sube a git).
- Pruebas ejecutadas en el proyecto real: 18 pruebas SQL de RLS y restricciones, y llamadas HTTP
  reales con la clave publishable a funciones, galería y tablas. Datos de prueba borrados.
- Pendiente: el secreto `ALLOWED_ORIGINS` con la URL de Vercel (sin él, las funciones aceptan
  cualquier origen). `STORE_ANSWERS` no está definido, así que las respuestas A–D no se guardan.

## 1. Estructura

```
bjxmoda/
├── index.html
├── package.json            vite.config.js   vercel.json   .env.example
├── public/
│   ├── favicon.svg
│   └── images/             ← coloca aquí hero.jpg (fotografía editorial)
├── src/
│   ├── main.jsx            fuentes autoalojadas + hojas de estilo
│   ├── App.jsx             rutas y flujo: formulario → test → guardado → revelación → tarjeta
│   ├── components/
│   │   ├── SiteHeader.jsx  SiteFooter.jsx
│   │   ├── Landing.jsx     HeroVisual.jsx
│   │   ├── EntryForm.jsx   nombre, condiciones, consentimiento opcional, honeypot
│   │   ├── IdentityTest.jsx  7 preguntas, barra de progreso, teclado A–D
│   │   ├── SavingScreen.jsx  carga + error con reintento (sin perder respuestas)
│   │   ├── Reveal.jsx      animación de revelación del arquetipo
│   │   ├── ResultView.jsx  tarjeta, puntuaciones, empate, acciones
│   │   ├── IdentityCard.jsx  CardActions.jsx  (PNG + imprimir/PDF)
│   │   ├── ConsentControl.jsx  ManageKeyPanel.jsx  PerceptionSurvey.jsx
│   │   ├── NewFaces.jsx    galería con filtros, contador, reintento
│   │   └── ManageParticipation.jsx  ver tarjeta / revocar / borrar
│   ├── data/               questions.js  archetypeStyles.js  media.js
│   ├── lib/                supabase.js  api.js  cardRenderer.js  router.js  format.js
│   └── styles/             tokens, base, layout, landing, forms, test, result, gallery, print
├── supabase/
│   ├── config.toml
│   ├── migrations/20261028000000_bjxmoda_schema.sql   tablas, restricciones, índices, RLS, RPC, vistas
│   └── functions/
│       ├── _shared/scoring.js    lógica única de puntuación (navegador + servidor)
│       ├── _shared/handlers.js   lógica de las funciones (probada en Node)
│       ├── _shared/http.js  db.js
│       ├── register-participant/index.ts
│       └── manage-participation/index.ts
├── tests/
│   ├── scoring.test.js        puntuación, empates, validación de nombre
│   ├── edge-handlers.test.js  seguridad de las Edge Functions
│   └── sql/                   pruebas de RLS y restricciones
└── docs/
    ├── SUPABASE.md             crear y configurar el proyecto
    ├── SEGURIDAD-Y-PRUEBAS.md  modelo de seguridad y verificación
    ├── METRICAS.md             consultas para el experimento
    └── DESPLIEGUE-VERCEL.md
```

## 2. Cómo funciona

| Paso | Dónde ocurre |
|---|---|
| Formulario: nombre público + condiciones (obligatorio) + galería (opcional, desmarcado) | `EntryForm.jsx` |
| Inicio de sesión anónima para medir finalización | RPC `start_test_session()` |
| 7 preguntas, 1 punto por respuesta a su categoría | `IdentityTest.jsx`, `scoring.js` |
| Guardado: el servidor **recalcula** las puntuaciones, valida y genera código + clave privada | Edge Function `register-participant` |
| Revelación y tarjeta (canvas → PNG, misma imagen para imprimir) | `Reveal.jsx`, `cardRenderer.js` |
| Activar/retirar galería o borrar participación con código + clave | Edge Function `manage-participation` |
| Galería: solo `public_code, public_name, archetype, joined_on` de quienes consintieron | RPC `get_new_faces()` |
| Cuestionario posterior opcional (Likert 1–5, ligado a la sesión, no al nombre) | RPC `submit_brand_perception()` |

**Regla de empate (transparente):** gana la categoría empatada que la persona eligió más
recientemente, recorriendo sus respuestas de la pregunta 7 a la 1; la siguiente empatada es la
secundaria. Las respuestas nunca se alteran. El texto de la regla se muestra en el resultado.

**Clave privada:** al terminar, la persona recibe un código público (`BJX-XXXX-XXXX`, aleatorio y no
secuencial) y una clave privada de 256 bits. En la base solo se guarda el hash SHA-256 de la clave.
Con ambos puede volver a ver su tarjeta, cambiar su consentimiento o borrar su participación
(consentimiento **revocable**). No hay cuentas, correos ni `localStorage`.

## 3. Instalación local

Requisitos: Node.js 20+ y npm.

```bash
npm install
cp .env.example .env.local     # rellena URL y clave publishable de tu proyecto
npm run dev                    # http://localhost:5173
npm test                       # pruebas de puntuación y Edge Functions (Node)
npm run build                  # genera dist/
```

Sin `.env.local` el sitio carga, pero el guardado y la galería muestran un mensaje indicando que
falta configurar Supabase.

**Fotografía de portada:** coloca `public/images/hero.jpg` (vertical 4:5, con derechos de uso). Si
no existe, la portada muestra una composición tipográfica con los cuatro arquetipos. No incluí
fotografías de terceros porque requieren licencia.

## 4. Supabase

Resumen (detalle en [`docs/SUPABASE.md`](docs/SUPABASE.md)):

```bash
npm i -g supabase                       # o: npx supabase
supabase login
supabase link --project-ref TU_REF
supabase db push                        # aplica la migración
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://TU-SITIO.vercel.app"
supabase secrets set STORE_ANSWERS=false   # true solo si el análisis por pregunta es necesario
supabase functions deploy register-participant
supabase functions deploy manage-participation
```

Después ejecuta `tests/sql/10_security_tests.sql` en el SQL Editor (se revierte solo, no deja datos)
y sigue la verificación manual de [`docs/SEGURIDAD-Y-PRUEBAS.md`](docs/SEGURIDAD-Y-PRUEBAS.md).

## 5. Despliegue en Vercel

Ver [`docs/DESPLIEGUE-VERCEL.md`](docs/DESPLIEGUE-VERCEL.md). Variables necesarias en Vercel:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. **Nunca** la service_role.

## 6. Métricas

Vistas privadas `analytics_overview`, `analytics_archetypes`, `analytics_daily`,
`analytics_perception`, `analytics_perception_by_archetype` y `analytics_answers`: ver
[`docs/METRICAS.md`](docs/METRICAS.md). Son agregadas y no incluyen nombres.

Los arquetipos son perfiles creativos construidos a partir de preferencias declaradas. No son un
diagnóstico psicológico ni una medición de respuestas cerebrales, y la tarjeta no es una
acreditación profesional.

## Qué se verificó y qué no

Verificado en este entorno:

- `npm run build` sin errores; `npm test`: 15 pruebas (puntuación, empates dobles y triples,
  2 000 combinaciones aleatorias, validación de nombre, Edge Functions: puntuaciones del cliente
  ignoradas, consentimiento solo con `true`, honeypot, límite de tamaño, sesión de un solo uso,
  gestión con clave incorrecta, revocación, borrado, CORS).
- Migración aplicada dos veces sobre PostgreSQL 16 con roles que imitan a Supabase (`anon`,
  `authenticated`, `service_role` y sus privilegios por defecto): 20 pruebas de RLS y restricciones
  superadas (`tests/sql`).
- Recorrido completo en Chromium (escritorio y móvil) con las funciones reales ejecutándose sobre
  una base en memoria: formulario y validación, test con clic y teclado, error de guardado y
  reintento, revelación, tarjeta, descarga PNG, impresión, revocar y reactivar consentimiento,
  cuestionario, galería con filtros (las personas sin consentimiento no aparecen) y gestión.

No verificado (requiere tu proyecto):

- Despliegue real de las Edge Functions en el runtime de Supabase (Deno) y la llamada desde el
  navegador con tu clave publishable.
- Que `security definer` y RLS se comporten igual en tu proyecto: ejecuta las pruebas SQL allí.
- Descarga PNG en Safari iOS real (usa `canvas.toBlob` y `<a download>`; en iOS antiguos la imagen
  se abre en una pestaña y se guarda con “Compartir → Guardar imagen”).
