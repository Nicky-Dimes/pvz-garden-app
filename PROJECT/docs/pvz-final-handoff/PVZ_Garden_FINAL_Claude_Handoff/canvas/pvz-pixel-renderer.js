/**
 * PVZ Garden — zero-dependency Canvas sprite renderer (ES module).
 * Integration helper ONLY. Do not overwrite the game's renderer blindly.
 * Works with the existing image assets or actual native-grid pixel sprites.
 */

/** Create an integer-resolution source canvas, never a rescaled screenshot. */
export function logicalCanvas(width, height) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new RangeError('Logical sprite width and height must be positive integers');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Configure a dedicated canvas to render in logical units on Retina displays.
 * DO NOT call this on an existing game canvas until its viewport/transform
 * conventions are understood; setting .width and .height clears its contents.
 */
export function configureLogicalCanvas(canvas, logicalWidth, logicalHeight, cssScale = 2) {
  if (!Number.isInteger(cssScale) || cssScale < 1) {
    throw new RangeError('cssScale must be a positive integer');
  }
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssWidth = logicalWidth * cssScale;
  const cssHeight = logicalHeight * cssScale;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.imageRendering = 'pixelated';
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / logicalWidth, 0, 0, canvas.height / logicalHeight, 0, 0);
  ctx.imageSmoothingEnabled = false; // canvas resize resets context state
  return ctx;
}

/**
 * Draw a complete sprite to an existing canvas without disturbing its transform.
 * target x and y are in destination canvas coordinates, aligned to integer units.
 * image should be loaded/cached once, not created inside the frame loop.
 */
export function drawPixelSprite(ctx, image, x, y, options = {}) {
  if (!image) return false;
  const {
    sourceX = 0,
    sourceY = 0,
    sourceWidth = image.width,
    sourceHeight = image.height,
    scale = 1,
    anchorX = 0,
    anchorY = 0,
    opacity = 1,
  } = options;
  if (!Number.isInteger(scale) || scale <= 0) throw new RangeError('Sprite scale must be positive integer');
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;
  const dx = Math.round(x - anchorX * scale);
  const dy = Math.round(y - anchorY * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= Math.max(0, Math.min(1, opacity));
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
    dx, dy, sourceWidth * scale, sourceHeight * scale);
  ctx.restore();
  return true;
}

/** Image loader: no network besides the project's own static assets. */
export function loadSpriteImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load sprite asset: ${url}`));
    img.src = url;
  });
}

/**
 * Cached assets with graceful fallbacks. Use existing game IDs where possible.
 * Avoid repeated Image() allocations in per-frame loops.
 */
export class PixelAssetCache {
  constructor() { this.pending = new Map(); }
  load(id, url) {
    if (!id || !url) throw new Error('Sprite requires stable id and URL');
    if (!this.pending.has(id)) this.pending.set(id, loadSpriteImage(url));
    return this.pending.get(id);
  }
  get(id) { return this.pending.get(id) || null; }
  clear(id) { this.pending.delete(id); }
}
