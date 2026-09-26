// Shared, memoised access to generated art so menus (plain DOM) and the game (Phaser)
// use exactly the same pixels.
import { makeCharacterSheet, CELL_W, CELL_H } from './characters.js';

const sheets = {};
export const getSheet = (key) => (sheets[key] ||= makeCharacterSheet(key));

/** Draw a character's front-facing idle frame, scaled up, into a <canvas>. */
export function drawPortrait(canvas, key, scale = 6, { headOnly = false } = {}) {
  const sh = headOnly ? 15 : CELL_H;
  canvas.width = CELL_W * scale;
  canvas.height = sh * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(getSheet(key), 0, 0, CELL_W, sh, 0, 0, CELL_W * scale, sh * scale);
}
