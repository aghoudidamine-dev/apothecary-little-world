// Pure movement + collision helpers (no Phaser) so they can be unit-tested.
// Works on any map object that has {W, H, blocked}, so both the outdoor map
// and the palace interior can share the same code.
import { TILE } from './mapData.js';

// The player's collision box is a small rectangle around the feet.
export const HALF_W = 5;
export const BOX_H = 5;

export function isBlockedBox(map, x, y) {
  const x0 = Math.floor((x - HALF_W) / TILE);
  const x1 = Math.floor((x + HALF_W - 0.001) / TILE);
  const y0 = Math.floor((y - BOX_H) / TILE);
  const y1 = Math.floor((y - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= map.W || ty >= map.H) return true;
      if (map.blocked[ty * map.W + tx]) return true;
    }
  }
  return false;
}

/** Move (x,y) by (dx,dy), sliding along walls. Returns the new position. */
export function moveWithCollision(map, x, y, dx, dy) {
  let nx = x, ny = y;
  if (dx !== 0 && !isBlockedBox(map, x + dx, y)) nx = x + dx;
  if (dy !== 0 && !isBlockedBox(map, nx, y + dy)) ny = y + dy;
  return { x: nx, y: ny };
}
