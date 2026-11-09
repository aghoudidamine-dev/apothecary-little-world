// Procedural hug art: two characters embracing, built from their own (outfit-specific) sprite
// sheets so whatever each is wearing shows up. Maomao is always on the left, Jinshi on the right.
import { makeCanvas, rect } from './canvas.js';
import { CHARACTER_SPECS, CELL_W, CELL_H } from './characters.js';
import { getSheet } from './registry.js';

const SKIN = '#f6d3b3', LINE = '#2b1e2e';
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const cell = (key, dir) => ({ sheet: getSheet(key), sy: ROW[dir] * CELL_H });

/** A short sleeve angled from (x0,y0) to (x1,y1), ending in a hand. Outlined. */
function limb(ctx, spec, x0, y0, x1, y1, t = 2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n)]);
  for (const [x, y] of pts) rect(ctx, x - 1, y - 1, t + 2, t + 2, LINE);
  pts.forEach(([x, y], i) => {
    const hand = i >= n - 1;
    rect(ctx, x, y, t, t, hand ? SKIN : (i % 3 === 2 ? spec.robe : spec.robeLight));
  });
}

/** Closed eye on a side-view head already drawn at x offset `dx` (facing `dir`). */
function closeSideEye(ctx, spec, dx, dir) {
  if (dir === 'right') { rect(ctx, dx + 12, 10, 1, 1, SKIN); rect(ctx, dx + 12, 11, 2, 1, spec.eye); }
  else { rect(ctx, dx + 7, 10, 1, 1, SKIN); rect(ctx, dx + 6, 11, 2, 1, spec.eye); }
}

/** Standing embrace, side-on: faces together, each arm wrapped round the other's back. */
export function makeHugPair(keyL, keyR) {
  const canvas = makeCanvas(28, CELL_H);
  const ctx = canvas.getContext('2d');
  const L = cell(keyL, 'right'), R = cell(keyR, 'left');
  const dxL = 1, dxR = 9; // torsos touching, cheeks together
  ctx.drawImage(L.sheet, 0, L.sy, CELL_W, CELL_H, dxL, 0, CELL_W, CELL_H);
  ctx.drawImage(R.sheet, 0, R.sy, CELL_W, CELL_H, dxR, 0, CELL_W, CELL_H);
  limb(ctx, CHARACTER_SPECS[keyL], dxL + 9, 15, dxR + 11, 18);   // Maomao's arm over Jinshi's back
  limb(ctx, CHARACTER_SPECS[keyR], dxR + 7, 18, dxL + 6, 21);    // Jinshi's arm over Maomao's back
  return canvas;
}

/** Cuddling in bed: heads on the pillows turned toward each other, eyes closed, an arm
 *  reaching over each other's shoulder. */
export function makeBedHug(keyL, keyR) {
  const canvas = makeCanvas(34, 24);
  const ctx = canvas.getContext('2d');
  const L = cell(keyL, 'right'), R = cell(keyR, 'left');
  const dxL = 2, dxR = 13;
  ctx.drawImage(R.sheet, 0, R.sy, CELL_W, 14, dxR, 0, CELL_W, 14);
  ctx.drawImage(L.sheet, 0, L.sy, CELL_W, 14, dxL, 0, CELL_W, 14);
  closeSideEye(ctx, CHARACTER_SPECS[keyL], dxL, 'right');
  closeSideEye(ctx, CHARACTER_SPECS[keyR], dxR, 'left');
  limb(ctx, CHARACTER_SPECS[keyL], 15, 15, 24, 17);  // Maomao's arm over Jinshi's shoulder
  limb(ctx, CHARACTER_SPECS[keyR], 20, 18, 10, 20);  // Jinshi's arm over Maomao's shoulder
  return canvas;
}
