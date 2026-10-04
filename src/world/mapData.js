// The whole world as plain data (no Phaser, no canvas) so it is easy to test:
// tile kinds, which tiles block movement, static objects and decoration.
import { rng } from '../art/canvas.js';

export const TILE = 16;
export const W = 56; // tiles  (896 px)
export const H = 40; // tiles  (640 px)

export const G = { GRASS: 0, DIRT: 1, PLAZA: 2, WATER: 3, COBBLE: 4, BRICK: 5 };

// Just outside the palace's grand door, on the ceremonial brick lane.
export const PALACE_DOOR = { x: 28 * TILE, y: 13 * TILE + 2 };
export const PALACE_RETURN = { x: 28 * TILE, y: 15 * TILE };

export const SPAWNS = {
  maomao: { x: 26 * TILE + 8, y: 16 * TILE + 14 },
  jinshi: { x: 29 * TILE + 8, y: 16 * TILE + 14 },
};

export function buildMap() {
  const ground = new Uint8Array(W * H).fill(G.GRASS);
  const blocked = new Uint8Array(W * H);
  const objects = [];
  const decor = [];
  const idx = (x, y) => y * W + x;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  const fill = (x0, y0, x1, y1, kind) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ground[idx(x, y)] = kind;
  };
  const block = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inMap(x, y)) blocked[idx(x, y)] = 1;
  };
  const free = (x, y, w = 1, h = 1) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!inMap(xx, yy) || blocked[idx(xx, yy)] || ground[idx(xx, yy)] === G.WATER) return false;
      }
    }
    return true;
  };
  /** Add a static object. Its footprint (tx,ty,w,h) blocks movement. */
  const add = (frame, tx, ty, w = 1, h = 1, extra = {}) => {
    objects.push({ frame, tx, ty, w, h, ...extra });
    block(tx, ty, w, h);
  };
  /** Same as add(), but skips (returns false) if the spot is not free. */
  const tryAdd = (frame, tx, ty, w = 1, h = 1, extra = {}) => {
    if (!free(tx, ty, w, h)) return false;
    add(frame, tx, ty, w, h, extra);
    return true;
  };

  // ---- ground -------------------------------------------------------------
  fill(14, 13, 41, 22, G.PLAZA);       // palace courtyard
  fill(27, 13, 28, 23, G.BRICK);       // ceremonial brick lane
  fill(20, 24, 35, 31, G.COBBLE);      // market square
  fill(27, 32, 28, 35, G.DIRT);        // market -> south road
  fill(8, 34, 47, 35, G.DIRT);         // south road
  fill(8, 9, 9, 18, G.DIRT);           // west house path
  fill(10, 17, 13, 18, G.DIRT);
  fill(46, 9, 47, 18, G.DIRT);         // east house path
  fill(42, 17, 45, 18, G.DIRT);
  fill(36, 23, 43, 24, G.DIRT);        // market -> garden gate
  fill(8, 32, 9, 33, G.DIRT);          // south-west house door
  fill(46, 32, 47, 33, G.DIRT);        // south-east house door

  // pond (union of an ellipse, so the shore is nicely irregular)
  const pcx = 8.5, pcy = 23.5, prx = 4.9, pry = 3.4;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - pcx) / prx, dy = (y + 0.5 - pcy) / pry;
      if (dx * dx + dy * dy <= 1) ground[idx(x, y)] = G.WATER;
    }
  }
  for (let i = 0; i < ground.length; i++) if (ground[i] === G.WATER) blocked[i] = 1;

  // ---- world border: blocked strip + forest ---------------------------------
  block(0, 0, W, 2); block(0, H - 2, W, 2); block(0, 0, 2, H); block(W - 2, 0, 2, H);
  const treeFrame = (i) => 'tree' + (i % 3);
  for (let x = 0; x < W; x += 2) {
    objects.push({ frame: treeFrame(x / 2), tx: x, ty: 1, w: 1, h: 1 });
    objects.push({ frame: treeFrame(x / 2 + 1), tx: x + 1, ty: 0, w: 1, h: 1 });
    objects.push({ frame: treeFrame(x / 2 + 2), tx: x, ty: H - 1, w: 1, h: 1 });
    objects.push({ frame: treeFrame(x / 2), tx: x + 1, ty: H - 2, w: 1, h: 1 });
  }
  for (let y = 2; y < H - 2; y += 2) {
    objects.push({ frame: treeFrame(y / 2 + 1), tx: 0, ty: y + 1, w: 1, h: 1 });
    objects.push({ frame: treeFrame(y / 2 + 2), tx: 1, ty: y, w: 1, h: 1 });
    objects.push({ frame: treeFrame(y / 2), tx: W - 1, ty: y + 1, w: 1, h: 1 });
    objects.push({ frame: treeFrame(y / 2 + 1), tx: W - 2, ty: y, w: 1, h: 1 });
  }

  // ---- buildings ----------------------------------------------------------
  add('palace', 20, 2, 16, 11);                  // sprite is 272px wide: 8px eaves each side
  add('house0', 6, 5, 6, 4);
  add('house1', 44, 5, 6, 4);
  add('house2', 6, 28, 6, 4);
  add('house0', 44, 28, 6, 4);

  // market stalls + goods
  add('stall0', 21, 26, 4, 2);
  add('stall1', 31, 26, 4, 2);
  add('stall2', 31, 30, 4, 2);
  add('crate', 22, 29); add('barrel', 23, 29); add('crate', 21, 30); add('barrel', 20, 25);
  add('crate', 34, 28);  add('barrel', 30, 31);

  // ---- courtyard dressing -------------------------------------------------
  [[18, 14], [37, 14], [18, 21], [37, 21], [25, 18], [30, 18], [25, 21], [30, 21]]
    .forEach(([x, y]) => add('lantern', x, y));
  // lanterns along the roads
  [[10, 16], [45, 16], [26, 33], [29, 33], [14, 33], [41, 33], [38, 22]].forEach(([x, y]) => tryAdd('lantern', x, y));
  // cherry trees planted in the courtyard (a little grass patch under each)
  [[15, 16], [40, 16], [15, 20], [40, 20]].forEach(([x, y], i) => {
    fill(x - 1, y, x + 1, y, G.GRASS);
    add('cherry' + (i % 2), x, y);
  });

  // ---- flower garden (east) -----------------------------------------------
  const gx0 = 44, gy0 = 19, gx1 = 51, gy1 = 25;
  const gates = new Set(['46,19', '47,19', '44,23', '44,24']);
  for (let x = gx0; x <= gx1; x++) {
    for (const y of [gy0, gy1]) {
      if (gates.has(`${x},${y}`)) continue;
      const nextGate = gates.has(`${x + 1},${y}`) || gates.has(`${x - 1},${y}`);
      add(x === gx0 || x === gx1 || nextGate ? 'fence_post' : 'fence_h', x, y);
    }
  }
  for (let y = gy0 + 1; y < gy1; y++) {
    for (const x of [gx0, gx1]) {
      if (gates.has(`${x},${y}`)) continue;
      const nextGate = gates.has(`${x},${y + 1}`) || gates.has(`${x},${y - 1}`);
      add(nextGate ? 'fence_post' : 'fence_v', x, y);
    }
  }
  add('cherry0', 49, 22);

  // ---- scattered trees, bushes, rocks -------------------------------------
  const trees = [
    [14, 5], [17, 8], [4, 9], [14, 10], [3, 14], [12, 13], [5, 18], [16, 12],
    [41, 5], [38, 8], [52, 9], [42, 11], [52, 15], [38, 12], [43, 14], [51, 17],
    [4, 28], [4, 32], [15, 28], [16, 31], [13, 33], [18, 30], [18, 27],
    [38, 28], [38, 32], [41, 30], [52, 30], [52, 27], [43, 33], [52, 33],
    [4, 36], [10, 37], [20, 37], [34, 37], [46, 37], [52, 37], [24, 36], [30, 37],
  ];
  trees.forEach(([x, y], i) => tryAdd('tree' + (i % 3), x, y));
  [[2 + 3, 12], [13, 26], [14, 21], [44, 11], [50, 12], [12, 7], [5, 7], [43, 26], [50, 27], [20, 33], [36, 33]]
    .forEach(([x, y]) => tryAdd('bush', x, y));
  [[13, 22], [4, 25], [12, 27], [6, 21]].forEach(([x, y]) => tryAdd('rock', x, y));

  // ---- NPCs -----------------------------------------------------------------
  const npcs = [
    { id: 'guard', name: 'GUARD', tx: 23, ty: 13, dir: 'down' },
    { id: 'servant', name: 'SERVANT', tx: 21, ty: 16, dir: 'right' },
    { id: 'merchant', name: 'MERCHANT', tx: 30, ty: 27, dir: 'left' },
    { id: 'gardener', name: 'GARDENER', tx: 47, ty: 22, dir: 'down' },
    { id: 'villager', name: 'VILLAGER', tx: 11, ty: 19, dir: 'down' },
  ];
  npcs.forEach((n) => block(n.tx, n.ty, 1, 1));

  // ---- decoration painted into the ground (no collision) --------------------
  const rand = rng(20240607);
  const grassAt = (x, y) => inMap(x, y) && ground[idx(x, y)] === G.GRASS && !blocked[idx(x, y)];
  const flowerColors = ['#f27aa5', '#ffffff', '#ffd54a', '#e8524a', '#b58cf0', '#ff9f5a'];
  const patch = (cx, cy, radius, count) => {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * radius;
      const tx = Math.floor((cx + Math.cos(a) * r) / TILE), ty = Math.floor((cy + Math.sin(a) * r) / TILE);
      if (!grassAt(tx, ty)) continue;
      decor.push({ kind: 'flower', x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r), color: flowerColors[Math.floor(rand() * flowerColors.length)] });
    }
  };
  // garden beds
  for (let gy = gy0 + 1; gy < gy1; gy++) for (let gx = gx0 + 1; gx < gx1; gx++) patch(gx * TILE + 8, gy * TILE + 8, 8, 4);
  // wild flower meadows
  [[16, 24], [24, 9], [36, 9], [52, 24], [33, 37], [22, 34], [6, 12], [14, 30], [40, 26], [28, 36], [45, 12], [10, 12], [18, 18]]
    .forEach(([tx, ty]) => patch(tx * TILE, ty * TILE, 28, 14));
  // grass tufts + pebbles everywhere else
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!grassAt(x, y)) continue;
      const r = rand();
      if (r < 0.28) decor.push({ kind: 'tuft', x: x * TILE + Math.floor(rand() * 13) + 1, y: y * TILE + Math.floor(rand() * 13) + 1 });
      else if (r < 0.31) decor.push({ kind: 'pebble', x: x * TILE + Math.floor(rand() * 12) + 2, y: y * TILE + Math.floor(rand() * 12) + 2 });
    }
  }
  // lily pads
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (ground[idx(x, y)] !== G.WATER) continue;
      const interior = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => inMap(x + dx, y + dy) && ground[idx(x + dx, y + dy)] === G.WATER);
      if (interior && rand() < 0.35) decor.push({ kind: 'lily', x: x * TILE + 4 + Math.floor(rand() * 6), y: y * TILE + 5 + Math.floor(rand() * 5), bloom: rand() < 0.4 });
    }
  }

  return { W, H, ground, blocked, objects, npcs, decor, spawns: SPAWNS };
}
