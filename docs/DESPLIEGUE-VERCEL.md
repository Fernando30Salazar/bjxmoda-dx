# Despliegue en Vercel

## 1. Subir el código

```bash
git init
git add .
git commit -m "BJXMODA Fashion Identity Experience"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/bjxmoda.git
git push -u origin main
```

Antes de hacer push, confirma que no se sube ningún secreto:

```bash
git ls-files | grep -E '\.env' # solo debe aparecer .env.example
```

## 2. Importar en Vercel

1. <https://vercel.com/new> → importa el repositorio.
2. Framework: **Vite** (se detecta solo; `vercel.json` ya define build y salida `dist`).
3. **Environment Variables** (Production y Preview):

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (o la anon key) |

   No agregues la service_role: todo lo que empieza con `VITE_` termina en el navegador.
4. **Deploy**.

## 3. Después del primer despliegue

1. Añade el dominio de Vercel a los orígenes permitidos de las funciones:

   ```bash
   npx supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://TU-SITIO.vercel.app"
   ```

   (Los secretos se aplican a las funciones sin volver a desplegarlas.)
2. Abre el sitio, completa el test con y sin consentimiento, revisa `#/new-faces` y
   `#/manage`, descarga el PNG e imprime la tarjeta.
3. Repite las comprobaciones con `curl` de [`SEGURIDAD-Y-PRUEBAS.md`](SEGURIDAD-Y-PRUEBAS.md)
   usando tu URL real.

El sitio usa rutas con `#` (`/#/test`, `/#/new-faces`, `/#/manage`), así que no necesita reglas de
reescritura. `vercel.json` añade cabeceras básicas de seguridad (`nosniff`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`).

## Para un QR en la actividad

Usa la URL `https://TU-SITIO.vercel.app/#/test` para que el código QR lleve directo al formulario.
