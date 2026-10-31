// The cozy house interior (west house): living room, bedroom (top-left, with the stove),
// bathroom (bottom-left, stone walls + pool) and a small two-stall toilet room (right).
import { TILE } from './mapData.js';

export const W = 34; // tiles (544px)
export const H = 22; // tiles (352px)
export const FLOOR = { WOOD: 0, RUG: 1, WALL: 2, STONE: 3, WATER: 4, STONEWALL: 5 };

const DOOR_CX = 20;
export const DOOR_SPOT = { x: DOOR_CX * TILE, y: (H - 1) * TILE - 2 };
export const ENTRY_SPAWN = { x: DOOR_CX * TILE, y: (H - 3) * TILE };
// wardrobe: 2 tiles wide at tx 24-25, back wall row 2 -> stand just below it
export const WARDROBE_SPOT = { x: 25 * TILE, y: 3 * TILE + 14 };
// spots inside each side room (used by the world check to prove they're reachable)
export const ROOM_SPOTS = {
  bedroom: { x: 5 * TILE + 8, y: 7 * TILE },
  bathroom: { x: 7 * TILE + 8, y: 15 * TILE },
  toilet: { x: 30 * TILE + 8, y: 17 * TILE + 8 },
};

export function buildHomeMap() {
  const ground = new Uint8Array(W * H).fill(FLOOR.WOOD);
  const blocked = new Uint8Array(W * H);
  const objects = [];
  const idx = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1;
  };
  const kind = (x0, y0, w, h, k) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y)) ground[idx(x, y)] = k;
  };
  const wall = (x0, y0, w, h, k = FLOOR.WALL) => { kind(x0, y0, w, h, k); block(x0, y0, w, h); };
  const add = (frame, tx, ty, w = 1, h = 1) => { objects.push({ frame, tx, ty, w, h }); block(tx, ty, w, h); };

  // outer shell: two-tile back wall, side walls, bottom wall with the front door gap
  block(0, 0, W, 2);
  wall(0, 2, 1, H - 2); wall(W - 1, 2, 1, H - 2); wall(0, H - 1, W, 1);

  // left block: bedroom (top), bathroom (bottom), separated from the living room by tx 9
  wall(9, 2, 1, 4); wall(9, 8, 1, 2);            // bedroom side, doorway at ty 6-7
  wall(1, 10, 9, 1);                              // bedroom / bathroom divider
  wall(9, 11, 1, 4); wall(9, 17, 1, 4);           // bathroom side, doorway at ty 15-16
  // the bathroom is stone-walled
  kind(1, 10, 9, 1, FLOOR.STONEWALL); kind(9, 11, 1, 10, FLOOR.STONEWALL);
  kind(0, 10, 1, 12, FLOOR.STONEWALL); kind(1, H - 1, 9, 1, FLOOR.STONEWALL);

  // toilet room, bottom-right
  wall(27, 13, 7, 1); wall(27, 14, 1, 4); wall(27, 20, 1, 1); // doorway at ty 18-19

  // front door gap
  [-1, 0, 1].forEach((d) => { blocked[idx(DOOR_CX + d, H - 1)] = 0; ground[idx(DOOR_CX + d, H - 1)] = FLOOR.WOOD; });

  // floors
  kind(1, 11, 8, 10, FLOOR.STONE); kind(9, 15, 1, 2, FLOOR.STONE);
  kind(2, 13, 5, 5, FLOOR.WATER); block(2, 13, 5, 5);             // the bath pool
  kind(3, 5, 5, 4, FLOOR.RUG);                                     // bedroom rug
  kind(13, 6, 13, 9, FLOOR.RUG);                                   // living room rug

  // ---- bedroom (top-left) ----
  add('stove', 2, 2, 2, 1);
  add('bed', 6, 2, 3, 2);
  add('chest', 1, 8, 2, 1);
  add('cushion', 4, 6);
  add('lantern', 1, 4); add('plant', 8, 9);

  // ---- living room ----
  add('window', 11, 0, 2, 2); add('plant', 11, 2);
  add('cabinet', 14, 2, 2, 1);
  add('bookshelf', 17, 2, 2, 1);
  add('window', 21, 0, 2, 2); add('plant', 22, 2);
  add('wardrobe', 24, 2, 2, 1);
  add('table', 17, 9, 3, 2);
  add('cushion', 16, 11); add('cushion', 20, 11); add('cushion', 18, 12);
  add('lantern', 10, 4); add('lantern', 27, 5);
  add('plant', 32, 2); add('plant', 32, 11); add('plant', 10, 20); add('plant', 26, 20);

  // ---- bathroom (bottom-left) ----
  add('towelrack', 2, 11, 2, 1);
  add('bucket', 8, 12); add('stool', 7, 12);
  add('stool', 8, 19); add('bucket', 7, 19);
  add('lantern', 1, 12); add('lantern', 1, 19);

  // ---- toilet room (bottom-right): two stalls ----
  add('toilet', 28, 15, 2, 1); add('divider', 30, 15, 1, 2); add('toilet', 31, 15, 2, 1);
  add('basin', 28, 20); add('bucket', 32, 20); add('plant', 32, 17);

  return { W, H, ground, blocked, objects, npcs: [], spawn: ENTRY_SPAWN, door: DOOR_SPOT };
}
