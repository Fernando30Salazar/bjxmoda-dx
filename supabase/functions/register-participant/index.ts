// Edge Function: register-participant
// Valida nombre y respuestas, calcula puntuaciones en el servidor, aplica el
// consentimiento (desactivado salvo `true` explícito) y guarda con service_role.
import { createRegisterHandler } from '../_shared/handlers.js';
import { createDb, readEnv } from '../_shared/db.js';

const handler = createRegisterHandler({ db: createDb(), env: readEnv() });

Deno.serve(handler);
