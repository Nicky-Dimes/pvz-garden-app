/**
 * PVZ Garden — REAL pixel-grid authoring primitives, not a filter on vector art.
 * Each indexed character represents one actual pixel in the source image.
 * This file intentionally does NOT claim to recreate the approved characters.
 */
import { logicalCanvas } from './pvz-pixel-renderer.js';

/**
 * Render a hand-authored palette-indexed bitmap at native size.
 * Symbols in rows map to opaque palette colors; '.' (or unknown symbols) are transparent.
 * For characters larger than icons, use native 64x64/96x96/etc grids.
 */
export function indexedSprite(rows, palette) {
  if (!Array.isArray(rows) || !rows.length || typeof rows[0] !== 'string') {
    throw new TypeError('rows must be a nonempty array of strings');
  }
  const width = rows[0].length;
  if (!rows.every(row => typeof row === 'string' && row.length === width)) {
    throw new Error('Every bitmap row must have exactly the same number of pixels');
  }
  const { canvas, ctx } = logicalCanvas(width, rows.length);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < width; x++) {
      const color = palette[rows[y][x]];
      if (color && rows[y][x] !== '.') {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

/** Stamp deliberate integer-coordinate pixel clusters on a native-res canvas. */
export function paintClusters(ctx, clusters, palette) {
  for (const { x, y, w = 1, h = 1, color } of clusters) {
    if (![x, y, w, h].every(Number.isInteger) || w <= 0 || h <= 0) {
      throw new RangeError('Pixel clusters require positive integer rectangle dimensions');
    }
    const fill = palette[color] || color;
    if (!fill) throw new Error(`Unknown cluster color: ${color}`);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
}

/** Example: diagnostics-only 16px leaf, NOT a production character. */
export const TECH_DEMO_LEAF = [
  '................',
  '.........o......',
  '.......ooOo.....',
  '.....ooHHHOo....',
  '....oHHHHMOOo...',
  '...oHHHHMMMOo...',
  '..oHHHMMMMOOo...',
  '..oHHMMMMOOo....',
  '..oHMMMMOOo.....',
  '...oMMMMOo......',
  '....oMMOo.......',
  '.....oMo........',
  '......o.........',
  '......s.........',
  '......s.........',
  '................',
];
export const TECH_DEMO_PALETTE = {
  o: '#29243D',
  O: '#328A4D',
  H: '#C0F45A',
  M: '#78D845',
  s: '#433657',
};
