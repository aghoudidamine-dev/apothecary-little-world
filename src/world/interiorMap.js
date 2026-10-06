// A big, static palace hall. No procedural generation needed, just a fixed layout.
// Shares TILE size with the outdoor map so the same Character/collision code works.
import { TILE } from './mapData.js';

export const W = 48; // tiles (768px) — several times the size of the outdoor viewport
export const H = 34; // tiles (544px)

export const FLOOR = { WOOD: 0, RUG: 1 };

const DOOR_CX = Math.floor(W / 2);
export const DOOR_SPOT = { x: DOOR_CX * TILE, y: (H - 1) * TILE - 2 }; // walk here (or press E) to leave
export const ENTRY_SPAWN = { x: DOOR_CX * TILE, y: (H - 3) * TILE };

export function buildInteriorMap() {
  const ground = new Uint8Array(W * H).fill(FLOOR.WOOD);
  const blocked = new Uint8Array(W * H);
  const objects = [];
  const idx = (x, y) => y * W + x;
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) blocked[idx(x, y)] = 1;
  };
  const add = (frame, tx, ty, w = 1, h = 1) => { objects.push({ frame, tx, ty, w, h }); block(tx, ty, w, h); };

  // perimeter walls, with a door gap at the bottom-center
  block(0, 0, W, 1); block(0, H - 1, W, 1); block(0, 0, 1, H); block(W - 1, 0, 1, H);
  [-1, 0, 1].forEach((d) => { blocked[idx(DOOR_CX + d, H - 1)] = 0; });

  // a long red rug running from the door up to the throne dais
  const rugHalf = 3;
  for (let y = 2; y < H - 1; y++) for (let x = DOOR_CX - rugHalf; x <= DOOR_CX + rugHalf; x++) ground[idx(x, y)] = FLOOR.RUG;

  // throne dais at the far end of the hall
  block(DOOR_CX - 3, 2, 7, 3);
  add('throne', DOOR_CX - 1, 2, 2, 2);

  // two long rows of pillars flanking the rug the whole length of the hall
  for (let y = 4; y < H - 3; y += 4) {
    add('pillar', DOOR_CX - rugHalf - 3, y);
    add('pillar', DOOR_CX + rugHalf + 2, y);
  }
  // a second, outer row for extra grandeur
  for (let y = 5; y < H - 3; y += 6) {
    add('pillar', 4, y);
    add('pillar', W - 5, y);
  }

  // banners along the back wall and partway down both side walls
  for (let x = 4; x < W - 4; x += 5) add('banner', x, 0, 1, 1);
  for (let y = 3; y < H - 4; y += 6) { add('banner', 0, y, 1, 1); add('banner', W - 1, y, 1, 1); }

  return { W, H, ground, blocked, objects, npcs: [], spawn: ENTRY_SPAWN, door: DOOR_SPOT };
}
