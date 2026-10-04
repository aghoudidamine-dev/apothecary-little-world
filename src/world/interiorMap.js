// A small, static room: no procedural generation needed, just a fixed layout.
// Shares TILE size with the outdoor map so the same Character/collision code works.
import { TILE } from './mapData.js';

export const W = 20; // tiles (320px)
export const H = 14; // tiles (224px)

export const FLOOR = { WOOD: 0, RUG: 1 };

export const DOOR_SPOT = { x: 10 * TILE, y: (H - 1) * TILE - 2 }; // walk here (or press E) to leave
export const ENTRY_SPAWN = { x: 10 * TILE, y: (H - 2) * TILE };

// Fixed character placements. `dir` is which way they face while standing still.
export const RESIDENTS = [
  { id: 'emperor', name: 'THE EMPEROR', tx: 10, ty: 3, dir: 'down' },
  { id: 'empress_dowager', name: 'EMPRESS DOWAGER', tx: 6, ty: 5, dir: 'right' },
  { id: 'gyokuyou', name: 'GYOKUYOU', tx: 14, ty: 5, dir: 'left' },
  { id: 'lihua', name: 'LIHUA', tx: 5, ty: 9, dir: 'right' },
  { id: 'lishu', name: 'LISHU', tx: 15, ty: 9, dir: 'left' },
  { id: 'ah_duo', name: 'AH DUO', tx: 10, ty: 8, dir: 'down' },
];

export function buildInteriorMap() {
  const ground = new Uint8Array(W * H).fill(FLOOR.WOOD);
  const blocked = new Uint8Array(W * H);
  const objects = [];
  const idx = (x, y) => y * W + x;
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) blocked[idx(x, y)] = 1;
  };
  const add = (frame, tx, ty, w = 1, h = 1) => { objects.push({ frame, tx, ty, w, h }); block(tx, ty, w, h); };

  // walls all around, one door gap at the bottom
  block(0, 0, W, 1); block(0, H - 1, W, 1); block(0, 0, 1, H); block(W - 1, 0, 1, H);
  blocked[idx(9, H - 1)] = 0; blocked[idx(10, H - 1)] = 0; blocked[idx(11, H - 1)] = 0;

  // red rug leading to the throne dais
  for (let y = 2; y < H - 1; y++) for (let x = 8; x <= 12; x++) ground[idx(x, y)] = FLOOR.RUG;

  // throne dais + throne
  block(8, 1, 5, 2);
  add('throne', 9, 1, 2, 2);

  // pillars flanking the room
  [[3, 2], [16, 2], [3, 7], [16, 7], [3, 11], [16, 11]].forEach(([x, y]) => add('pillar', x, y));
  // banners on the back wall
  [[5, 0], [8, 0], [11, 0], [14, 0]].forEach(([x, y]) => add('banner', x, y, 1, 1));

  RESIDENTS.forEach((r) => block(r.tx, r.ty, 1, 1));

  return { W, H, ground, blocked, objects, npcs: RESIDENTS, spawn: ENTRY_SPAWN, door: DOOR_SPOT };
}
