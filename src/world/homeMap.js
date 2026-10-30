// The cozy house interior (west house). Fixed layout, shares TILE with the other maps.
import { TILE } from './mapData.js';

export const W = 28; // tiles (448px)
export const H = 18; // tiles (288px)
export const FLOOR = { WOOD: 0, RUG: 1 };

const DOOR_CX = 14;
export const DOOR_SPOT = { x: DOOR_CX * TILE, y: (H - 1) * TILE - 2 };
export const ENTRY_SPAWN = { x: DOOR_CX * TILE, y: (H - 3) * TILE };
// wardrobe: 2 tiles wide at tx 22-23, row 2 -> stand just below it
export const WARDROBE_SPOT = { x: 23 * TILE, y: 3 * TILE + 14 };

export function buildHomeMap() {
  const ground = new Uint8Array(W * H).fill(FLOOR.WOOD);
  const blocked = new Uint8Array(W * H);
  const objects = [];
  const idx = (x, y) => y * W + x;
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) blocked[idx(x, y)] = 1;
  };
  const add = (frame, tx, ty, w = 1, h = 1) => { objects.push({ frame, tx, ty, w, h }); block(tx, ty, w, h); };

  // walls: two-tile-high back wall, plain walls elsewhere, door gap at the bottom
  block(0, 0, W, 2); block(0, H - 1, W, 1); block(0, 0, 1, H); block(W - 1, 0, 1, H);
  [-1, 0, 1].forEach((d) => { blocked[idx(DOOR_CX + d, H - 1)] = 0; });

  // big cozy rug in the middle
  for (let y = 6; y <= 14; y++) for (let x = 8; x <= 20; x++) ground[idx(x, y)] = FLOOR.RUG;

  // back wall, left to right
  add('stove', 3, 2, 2, 1);
  add('window', 6, 0, 2, 2); add('plant', 6, 2);
  add('cabinet', 10, 2, 2, 1);
  add('bookshelf', 13, 2, 2, 1);
  add('window', 17, 0, 2, 2); add('plant', 18, 2);
  add('wardrobe', 22, 2, 2, 1);

  // living area on the rug
  add('table', 13, 9, 3, 2);
  add('cushion', 12, 11); add('cushion', 16, 11); add('cushion', 14, 12);

  // sleeping corner and the left side
  add('bed', 22, 8, 3, 2);
  add('chest', 2, 12, 2, 1);
  add('cushion', 3, 8); add('cushion', 5, 9);

  // warm touches
  add('lantern', 1, 5); add('lantern', 26, 5);
  add('plant', 1, 15); add('plant', 26, 15); add('plant', 25, 12);

  return { W, H, ground, blocked, objects, npcs: [], spawn: ENTRY_SPAWN, door: DOOR_SPOT };
}
