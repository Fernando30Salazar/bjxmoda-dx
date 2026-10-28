// Edge Function: manage-participation
// Permite al participante ver su tarjeta, activar/revocar su aparición en la
// galería o borrar su participación, usando su código + clave privada.
import { createManageHandler } from '../_shared/handlers.js';
import { createDb, readEnv } from '../_shared/db.js';

const handler = createManageHandler({ db: createDb(), env: readEnv() });

Deno.serve(handler);
