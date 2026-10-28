// Utilidades HTTP compartidas por las Edge Functions (JS puro, Deno/Node).

import { CODE_ALPHABET } from './scoring.js';

/**
 * Devuelve las cabeceras CORS para la petición.
 * ALLOWED_ORIGINS: lista separada por comas. Vacía o "*" = cualquier origen.
 * (CORS no es un control de seguridad: los datos están protegidos por RLS
 * y por la validación del servidor; aun así conviene restringirlo.)
 */
export function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.get('origin') ?? '';
  const list = String(allowedOrigins ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let allow = '*';
  if (list.length && !list.includes('*')) {
    allow = list.includes(origin) ? origin : list[0];
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const MAX_BODY_BYTES = 4096;

/** Lee JSON con límite de tamaño. Lanza Error('bad_request') si no es válido. */
export async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error('bad_request');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error('bad_request');
  }
}

// --------------------------------------------------------------------
// Criptografía
// --------------------------------------------------------------------

export function randomCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // 256 es múltiplo de 32 → sin sesgo de módulo.
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `BJX-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

export function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
