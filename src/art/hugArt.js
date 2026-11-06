// Procedural hug art: two characters embracing, built from their own (outfit-specific) sprite
// sheets so whatever each is wearing shows up. Maomao is always on the left, Jinshi on the right.
import { makeCanvas, rect, px } from './canvas.js';
import { CHARACTER_SPECS, CELL_W, CELL_H } from './characters.js';
import { getSheet } from './registry.js';

const SKIN = '#f6d3b3', SKIN_SHADE = '#e3b58f', LINE = '#2b1e2e';
const ROW = { down: 0, left: 1, right: 2, up: 3 };

const cell = (key, dir) => ({ sheet: getSheet(key), sy: ROW[dir] * CELL_H });

/** A sleeve + hand reaching from (x0,y) to (x1,y) (either direction), outlined. */
function arm(ctx, spec, x0, x1, y, h = 2) {
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  rect(ctx, lo - 1, y - 1, hi - lo + 2, h + 2, LINE);
  rect(ctx, lo, y, hi - lo, h, spec.robeLight);
  rect(ctx, lo, y + h - 1, hi - lo, 1, spec.robe);
  // hand at the far end
  const hx = x1 > x0 ? hi : lo - 2;
  rect(ctx, hx - 1, y - 1, 4, h + 1, LINE);
  rect(ctx, hx, y, 2, h - 1, SKIN); px(ctx, hx, y + h - 2, SKIN_SHADE);
}

/** Standing embrace: side-on, arms wrapped around each other's backs. */
export function makeHugPair(keyL, keyR) {
  const canvas = makeCanvas(40, CELL_H);
  const ctx = canvas.getContext('2d');
  const L = cell(keyL, 'right'), R = cell(keyR, 'left');
  const dxL = 1, dxR = 12; // faces side by side, bodies close
  ctx.drawImage(L.sheet, 0, L.sy, CELL_W, CELL_H, dxL, 0, CELL_W, CELL_H);
  ctx.drawImage(R.sheet, 0, R.sy, CELL_W, CELL_H, dxR, 0, CELL_W, CELL_H);
  // Maomao's arm reaches round Jinshi's back (higher), Jinshi's round hers (lower)
  arm(ctx, CHARACTER_SPECS[keyL], dxL + 8, dxR + 14, 15);
  arm(ctx, CHARACTER_SPECS[keyR], dxR + 12, dxL + 2, 18);
  return canvas;
}

/** Cuddling in bed: heads turned toward each other, arms over each other on the blanket. */
export function makeBedHug(keyL, keyR) {
  const canvas = makeCanvas(48, 30);
  const ctx = canvas.getContext('2d');
  const L = cell(keyL, 'right'), R = cell(keyR, 'left');
  const dxL = 4, dxR = 15; // heads side by side, close together
  ctx.drawImage(R.sheet, 0, R.sy, CELL_W, 13, dxR, 0, CELL_W, 13);
  ctx.drawImage(L.sheet, 0, L.sy, CELL_W, 13, dxL, 0, CELL_W, 13);
  // a little shoulder line under each chin
  rect(ctx, 11, 13, 8, 3, CHARACTER_SPECS[keyL].robeLight); rect(ctx, 22, 13, 8, 3, CHARACTER_SPECS[keyR].robeLight);
  arm(ctx, CHARACTER_SPECS[keyL], 13, 31, 17);
  arm(ctx, CHARACTER_SPECS[keyR], 32, 12, 21);
  return canvas;
}
