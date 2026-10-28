// Renderizador de la tarjeta BJXMODA en <canvas>.
// La misma imagen se muestra en pantalla, se descarga como PNG y se imprime,
// así que lo que ves es exactamente lo que guardas. Sin dependencias.

import { ARCHETYPE_BY_KEY } from '../../supabase/functions/_shared/scoring.js';
import { ARCHETYPE_STYLES } from '../data/archetypeStyles.js';
import { formatShortDate } from './format.js';

export const CARD_W = 1080;
export const CARD_H = 1440;

const SERIF = '"Bodoni Moda", "Didot", "Bodoni 72", Georgia, serif';
const SANS = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';

const TITLE_LINES = {
  avant_garde: ['Avant-', 'Garde'],
  icon: ['Icon'],
  street_creative: ['Street', 'Creative'],
  muse: ['Muse'],
};

const SCORE_ROWS = [
  ['avant_garde', 'Avant-Garde'],
  ['icon', 'Icon'],
  ['street_creative', 'Street Creative'],
  ['muse', 'Muse'],
];

/** Espera a que las fuentes de la tarjeta estén cargadas (Safari incluido). */
export async function loadCardFonts() {
  if (!document.fonts?.load) return;
  const faces = [
    `400 100px ${SERIF}`,
    `italic 400 100px ${SERIF}`,
    `600 100px ${SERIF}`,
    `400 40px ${SANS}`,
    `500 40px ${SANS}`,
    `700 40px ${SANS}`,
  ];
  try {
    await Promise.all(faces.map((f) => document.fonts.load(f, 'BJXMODA Áé')));
    await document.fonts.ready;
  } catch {
    /* se usan fuentes de respaldo */
  }
}

// ----------------------------------------------------------------------
// utilidades de dibujo
// ----------------------------------------------------------------------
function spaced(ctx, text, x, y, spacing, align = 'left') {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

/** Reduce el tamaño hasta que todas las líneas caben en maxWidth. */
function fitSize(ctx, lines, fontFor, start, min, maxWidth) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = fontFor(size);
    if (lines.every((l) => ctx.measureText(l).width <= maxWidth)) break;
  }
  ctx.font = fontFor(size);
  return size;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hashString(s) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Código de barras decorativo derivado del código público (no escaneable). */
function drawBars(ctx, code, x, y, w, h) {
  let seed = hashString(code);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(rand() * 4) * 2;
    const gap = 2 + Math.floor(rand() * 3) * 2;
    if (cx + bw > x + w) break;
    ctx.fillRect(cx, y, bw, h);
    cx += bw + gap;
  }
}

// ----------------------------------------------------------------------
// decoraciones por arquetipo (fondo)
// ----------------------------------------------------------------------
const DECOR = {
  avant_garde(ctx, s) {
    // Una franja negra rompe el marco por la derecha.
    ctx.fillStyle = s.accent;
    ctx.fillRect(CARD_W - 120, 0, 120, CARD_H);
    ctx.save();
    ctx.translate(CARD_W - 48, CARD_H - 90);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = s.ground;
    ctx.font = `600 34px ${SERIF}`;
    spaced(ctx, 'BJXMODA  NEW FACES  BJXMODA  NEW FACES  BJXMODA', 0, 0, 10);
    ctx.restore();
    return { left: 84, right: CARD_W - 120 - 64, align: 'left' };
  },
  icon(ctx, s) {
    ctx.strokeStyle = s.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, CARD_W - 88, CARD_H - 88);
    ctx.lineWidth = 1;
    ctx.strokeRect(58, 58, CARD_W - 116, CARD_H - 116);
    return { left: 110, right: CARD_W - 110, align: 'center' };
  },
  street_creative(ctx, s) {
    // Cinta de backstage cruzando la esquina.
    ctx.save();
    ctx.translate(CARD_W - 70, 70);
    ctx.rotate(-0.62);
    ctx.fillStyle = s.accent;
    ctx.fillRect(-360, -40, 720, 80);
    ctx.fillStyle = '#111111';
    ctx.font = `700 34px ${SANS}`;
    ctx.textBaseline = 'middle';
    spaced(ctx, 'BACKSTAGE   BJXMODA   BACKSTAGE', -330, 2, 6);
    ctx.restore();
    return { left: 84, right: CARD_W - 84, align: 'left' };
  },
  muse(ctx, s) {
    ctx.save();
    ctx.strokeStyle = s.accent;
    for (let i = 0; i < 7; i += 1) {
      ctx.globalAlpha = 0.5 - i * 0.06;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CARD_W - 40, 260, 160 + i * 64, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return { left: 84, right: CARD_W - 84, align: 'left' };
  },
};

// ----------------------------------------------------------------------
// dibujo principal
// ----------------------------------------------------------------------
export function drawCard(canvas, data, scale = 1) {
  const { publicName, archetype, secondaryArchetype, scores, publicCode, createdAt } = data;
  const s = ARCHETYPE_STYLES[archetype];
  const meta = ARCHETYPE_BY_KEY[archetype];
  if (!s || !meta) throw new Error(`Arquetipo desconocido: ${archetype}`);

  canvas.width = CARD_W * scale;
  canvas.height = CARD_H * scale;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = 'alphabetic';

  // fondo
  ctx.fillStyle = s.ground;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const box = DECOR[archetype](ctx, s);
  const width = box.right - box.left;
  const cx = box.align === 'center' ? box.left + width / 2 : box.left;
  ctx.textAlign = box.align;
  ctx.textBaseline = 'alphabetic';

  // ranura para el cordón
  ctx.fillStyle = archetype === 'muse' ? s.soft : 'rgba(255,255,255,0.16)';
  roundRect(ctx, CARD_W / 2 - 80, 30, 160, 26, 13);
  ctx.fill();

  ctx.fillStyle = s.ink;

  // cabecera
  ctx.font = `600 40px ${SERIF}`;
  spaced(ctx, 'BJXMODA', cx, 150, 14, box.align);
  ctx.font = `500 22px ${SANS}`;
  ctx.globalAlpha = 0.8;
  const year = new Date(createdAt ?? Date.now()).getFullYear();
  ctx.fillText(`Fashion Identity Experience, León ${year}`, cx, 192);
  ctx.globalAlpha = 1;

  // título del arquetipo
  ctx.font = `italic 400 52px ${SERIF}`;
  ctx.fillText('The', cx, 330);
  const titleLines = TITLE_LINES[archetype];
  const tSize = fitSize(ctx, titleLines, (z) => `400 ${z}px ${SERIF}`, 190, 90, width);
  let y = 330 + tSize * 0.92;
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += tSize * 0.9;
  }
  y -= tSize * 0.9;

  // frase
  ctx.font = `italic 400 42px ${SERIF}`;
  const quote = wrap(ctx, `“${meta.quote}”`, width, 2);
  y += 92;
  for (const line of quote) {
    ctx.fillText(line, cx, y);
    y += 54;
  }
  if (secondaryArchetype) {
    ctx.font = `500 24px ${SANS}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(`Empate con ${ARCHETYPE_BY_KEY[secondaryArchetype].name}`, cx, y + 4);
    ctx.globalAlpha = 1;
    y += 40;
  }

  // línea divisoria
  y = Math.max(y + 24, 770);
  ctx.fillRect(box.left, y, width, 2);

  // nombre
  const nameUpper = archetype === 'street_creative';
  const nameText = nameUpper ? publicName.toUpperCase() : publicName;
  const nameFont = (z) => (nameUpper ? `700 ${z}px ${SANS}` : `400 ${z}px ${SERIF}`);
  ctx.font = nameFont(68);
  const nameLines = wrap(ctx, nameText, width, 2);
  const nSize = fitSize(ctx, nameLines, nameFont, 68, 40, width);
  y += 30 + nSize;
  for (const line of nameLines) {
    ctx.fillText(line, cx, y);
    y += nSize * 1.08;
  }

  // puntuaciones (al estilo de las medidas de una comp card)
  const inset = archetype === 'icon' ? 40 : 0; // el doble marco de Icon
  const footY = CARD_H - 150 - inset;
  let sy = Math.max(y + 30, 990);
  const rowStep = Math.max(36, Math.min(48, (footY - 78 - sy) / 3));
  const cell = 34;
  const gap = 8;
  const barW = 7 * cell + 6 * gap;
  const barX = box.right - barW;
  ctx.textAlign = 'left';
  for (const [key, label] of SCORE_ROWS) {
    const v = scores[key];
    const isMain = key === archetype;
    ctx.font = `${isMain ? 700 : 500} 26px ${SANS}`;
    ctx.fillStyle = s.ink;
    ctx.fillText(label, box.left, sy + 26);
    ctx.textAlign = 'right';
    ctx.fillText(`${v}/7`, barX - 24, sy + 26);
    ctx.textAlign = 'left';
    for (let i = 0; i < 7; i += 1) {
      const x = barX + i * (cell + gap);
      if (i < v) {
        ctx.fillStyle = isMain ? s.accent : s.ink;
        ctx.globalAlpha = isMain ? 1 : 0.75;
        ctx.fillRect(x, sy + 2, cell, 28);
      } else {
        ctx.strokeStyle = s.ink;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, sy + 2.75, cell - 1.5, 26.5);
      }
      ctx.globalAlpha = 1;
    }
    sy += rowStep;
  }

  // pie: código, fecha, barras
  ctx.fillStyle = s.ink;
  ctx.font = `700 40px ${SANS}`;
  ctx.textAlign = 'left';
  spaced(ctx, publicCode, box.left, footY, 3);
  ctx.font = `500 26px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(formatShortDate(createdAt ?? Date.now()), box.right, footY);
  drawBars(ctx, publicCode, box.left, footY + 22, width, 40);

  ctx.font = `400 19px ${SANS}`;
  ctx.globalAlpha = 0.8;
  ctx.textAlign = box.align;
  ctx.fillText(
    'Tarjeta conmemorativa de la experiencia BJXMODA. No es una acreditación profesional.',
    cx,
    CARD_H - 52 - inset,
  );
  ctx.globalAlpha = 1;
  return canvas;
}

export async function renderCardBlob(data, scale = 1) {
  await loadCardFonts();
  const canvas = document.createElement('canvas');
  drawCard(canvas, data, scale);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png');
  });
  return blob;
}

export function cardAltText({ publicName, archetype, secondaryArchetype, scores, publicCode }) {
  const meta = ARCHETYPE_BY_KEY[archetype];
  const tie = secondaryArchetype ? `, empate con ${ARCHETYPE_BY_KEY[secondaryArchetype].name}` : '';
  return (
    `Tarjeta BJXMODA de ${publicName}: ${meta.name}${tie}. “${meta.quote}” ` +
    `Puntuaciones: Avant-Garde ${scores.avant_garde}, Icon ${scores.icon}, ` +
    `Street Creative ${scores.street_creative}, Muse ${scores.muse} de 7. Código ${publicCode}.`
  );
}
