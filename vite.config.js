import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La lógica de puntuación vive en supabase/functions/_shared y la comparten
// el navegador y la Edge Function; Vite la importa desde la raíz del proyecto.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
