// Procedural pixel-art for the world: ground tiles baked into one big canvas,
// plus a handful of object sprites (trees, houses, palace, stalls...) packed into
// one atlas so Phaser can draw them cheaply.
import { makeCanvas, rect, px, disc, ellipse, rng, outline } from './canvas.js';
import { TILE, W, H, G } from '../world/mapData.js';
import { FLOOR } from '../world/interiorMap.js';

// ============================================================ ground =========
const GRASS = ['#78b759', '#75b457', '#7bba5b'];
const rimColor = { [G.DIRT]: '#b48a55', [G.PLAZA]: '#a59d8b', [G.COBBLE]: '#a08a5c', [G.BRICK]: '#7f3a30' };

export function bakeGround(map) {
  const canvas = makeCanvas(W * TILE, H * TILE);
  const ctx = canvas.getContext('2d');
  const kindAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? G.GRASS : map.ground[y * W + x]);
  const rand = rng(777);

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const kind = kindAt(tx, ty);
      const x = tx * TILE, y = ty * TILE;
      const n = kindAt(tx, ty - 1), s = kindAt(tx, ty + 1), w = kindAt(tx - 1, ty), e = kindAt(tx + 1, ty);
      switch (kind) {
        case G.GRASS: drawGrass(ctx, x, y, tx, ty, { n, s, w, e }); break;
        case G.DIRT: drawDirt(ctx, x, y, rand); break;
        case G.PLAZA: drawPlaza(ctx, x, y, rand); break;
        case G.BRICK: drawBrick(ctx, x, y, { w, e }); break;
        case G.COBBLE: drawCobble(ctx, x, y, rand); break;
        case G.WATER: drawWater(ctx, x, y, tx, ty, { n, s, w, e }, rand); break;
        default: break;
      }
      if (kind !== G.GRASS && kind !== G.WATER) rims(ctx, x, y, kind, { n, s, w, e }, rand);
    }
  }

  // decoration (flowers, tufts, pebbles, lilies)
  for (const d of map.decor) {
    if (d.kind === 'tuft') {
      px(ctx, d.x, d.y, '#4f9a45'); px(ctx, d.x + 1, d.y, '#4f9a45');
      px(ctx, d.x, d.y - 1, '#9ad67a'); px(ctx, d.x + 2, d.y - 1, '#9ad67a'); px(ctx, d.x + 1, d.y - 2, '#8ccb6c');
    } else if (d.kind === 'pebble') {
      px(ctx, d.x, d.y, '#a7a49a'); px(ctx, d.x + 1, d.y, '#a7a49a'); px(ctx, d.x, d.y - 1, '#d0cdc2');
    } else if (d.kind === 'flower') {
      px(ctx, d.x, d.y + 1, '#3f8a3f'); px(ctx, d.x, d.y + 2, '#3f8a3f');
      px(ctx, d.x - 1, d.y, d.color); px(ctx, d.x + 1, d.y, d.color); px(ctx, d.x, d.y - 1, d.color);
      px(ctx, d.x, d.y, d.color === '#ffd54a' ? '#ffffff' : '#ffe27a');
    } else if (d.kind === 'lily') {
      ellipse(ctx, d.x, d.y, 3, 2, '#3f9d4a'); px(ctx, d.x + 1, d.y, '#4aa5c9'); px(ctx, d.x + 2, d.y - 1, '#4aa5c9');
      px(ctx, d.x - 1, d.y - 1, '#6fc46a');
      if (d.bloom) { px(ctx, d.x - 1, d.y - 2, '#ffb3d0'); px(ctx, d.x, d.y - 2, '#ff8fb8'); px(ctx, d.x + 1, d.y - 2, '#ffb3d0'); px(ctx, d.x, d.y - 3, '#ffd9e8'); }
    }
  }
  return canvas;
}

function drawGrass(ctx, x, y, tx, ty, nb) {
  rect(ctx, x, y, TILE, TILE, GRASS[Math.abs(Math.imul(tx >> 1, 73856093) ^ Math.imul(ty >> 1, 19349663)) % GRASS.length]);
  // sandy beach where grass meets the pond
  const sand = '#dcc98f', sandDark = '#c4ae74';
  const beach = (sx, sy, w, h, dark) => rect(ctx, x + sx, y + sy, w, h, dark ? sandDark : sand);
  if (nb.n === G.WATER) { beach(0, 0, TILE, 2); beach(0, 2, TILE, 1, true); }
  if (nb.s === G.WATER) { beach(0, TILE - 2, TILE, 2); beach(0, TILE - 3, TILE, 1, true); }
  if (nb.w === G.WATER) { beach(0, 0, 2, TILE); beach(2, 0, 1, TILE, true); }
  if (nb.e === G.WATER) { beach(TILE - 2, 0, 2, TILE); beach(TILE - 3, 0, 1, TILE, true); }
}

function drawDirt(ctx, x, y, rand) {
  const base = ['#dcbb84', '#d6b47c', '#e0c08a'][Math.floor(rand() * 3)];
  rect(ctx, x, y, TILE, TILE, base);
  for (let i = 0; i < 6; i++) px(ctx, x + Math.floor(rand() * 16), y + Math.floor(rand() * 16), rand() < 0.5 ? '#c39a62' : '#efd8a8');
}

function drawPlaza(ctx, x, y, rand) {
  rect(ctx, x, y, TILE, TILE, '#d9d1c0');
  const mortar = '#bfb6a3', hi = '#ebe5d6';
  rect(ctx, x, y + 7, TILE, 1, mortar); rect(ctx, x, y + 15, TILE, 1, mortar);
  rect(ctx, x + 7, y, 1, 7, mortar); rect(ctx, x + 15, y + 8, 1, 7, mortar);
  rect(ctx, x, y, 7, 1, hi); rect(ctx, x + 8, y, 7, 1, hi); rect(ctx, x, y + 8, 15, 1, hi);
  if (rand() < 0.12) { px(ctx, x + 3, y + 4, '#a9c48a'); px(ctx, x + 4, y + 4, '#8fb070'); }
  if (rand() < 0.1) { px(ctx, x + 10, y + 11, mortar); px(ctx, x + 11, y + 12, mortar); }
}

function drawBrick(ctx, x, y, nb) {
  rect(ctx, x, y, TILE, TILE, '#b8644f');
  const mortar = '#8f4638', hi = '#cf7d66';
  rect(ctx, x, y + 3, TILE, 1, mortar); rect(ctx, x, y + 7, TILE, 1, mortar); rect(ctx, x, y + 11, TILE, 1, mortar); rect(ctx, x, y + 15, TILE, 1, mortar);
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 4 : 0;
    rect(ctx, x + off, y + r * 4, 1, 3, mortar); rect(ctx, x + off + 8, y + r * 4, 1, 3, mortar);
    rect(ctx, x, y + r * 4, TILE, 1, hi);
  }
  if (nb.w !== G.BRICK) rect(ctx, x, y, 2, TILE, '#d9b04a');
  if (nb.e !== G.BRICK) rect(ctx, x + TILE - 2, y, 2, TILE, '#d9b04a');
}

function drawCobble(ctx, x, y, rand) {
  rect(ctx, x, y, TILE, TILE, '#b39f74');
  for (let r = 0; r < 3; r++) {
    const off = r % 2 ? 3 : -2;
    for (let c = 0; c < 3; c++) {
      const sx = x + off + c * 6, sy = y + r * 5 + 1;
      if (sx + 5 <= x || sx >= x + TILE) continue;
      const cx0 = Math.max(sx, x), cx1 = Math.min(sx + 5, x + TILE);
      rect(ctx, cx0, sy, cx1 - cx0, 4, ['#d9c8a0', '#d2c097', '#dfceA6'][Math.floor(rand() * 3)]);
      rect(ctx, cx0, sy, cx1 - cx0, 1, '#ece0bc');
    }
  }
}

function drawWater(ctx, x, y, tx, ty, nb, rand) {
  rect(ctx, x, y, TILE, TILE, ((tx + ty) & 1) ? '#4a9bd0' : '#4594cb');
  for (let i = 0; i < 2; i++) {
    const wx = x + 1 + Math.floor(rand() * 10), wy = y + 2 + Math.floor(rand() * 12);
    rect(ctx, wx, wy, 4, 1, '#8ccaef'); rect(ctx, wx + 5, wy + 2, 3, 1, '#3a86bb');
  }
  const shallow = '#7cc3e6';
  if (nb.n !== G.WATER) rect(ctx, x, y, TILE, 3, shallow);
  if (nb.s !== G.WATER) rect(ctx, x, y + TILE - 3, TILE, 3, shallow);
  if (nb.w !== G.WATER) rect(ctx, x, y, 3, TILE, shallow);
  if (nb.e !== G.WATER) rect(ctx, x + TILE - 3, y, 3, TILE, shallow);
}

function rims(ctx, x, y, kind, nb, rand) {
  const c = rimColor[kind];
  const soft = (kind === G.DIRT);
  const line = (sx, sy, w, h) => {
    if (!soft) return rect(ctx, x + sx, y + sy, w, h, c);
    for (let i = 0; i < Math.max(w, h); i++) if (rand() > 0.15) rect(ctx, x + sx + (w > h ? i : 0), y + sy + (h > w ? i : 0), w > h ? 1 : w, h > w ? 1 : h, c);
  };
  const isGrassy = (k) => k === G.GRASS || k === G.WATER;
  if (isGrassy(nb.n)) line(0, 0, TILE, 1);
  if (isGrassy(nb.s)) line(0, TILE - 1, TILE, 1);
  if (isGrassy(nb.w)) line(0, 0, 1, TILE);
  if (isGrassy(nb.e)) line(TILE - 1, 0, 1, TILE);
}

// ============================================================ objects ========
const DARK = [43, 30, 46];
const DARK_GREEN = [33, 58, 40];

function newSprite(w, h) {
  const canvas = makeCanvas(w, h);
  return { canvas, ctx: canvas.getContext('2d') };
}

function drawTree({ base, light, high, dark, trunk = '#7b4a2c', trunkLight = '#966137', trunkDark = '#5f3820', variant = 0, petals = null }) {
  const { canvas, ctx } = newSprite(32, 48);
  ellipse(ctx, 16, 45, 11, 3, 'rgba(30,40,20,0.22)');
  rect(ctx, 13, 30, 6, 16, trunk); rect(ctx, 13, 30, 2, 16, trunkLight); rect(ctx, 17, 30, 2, 16, trunkDark);
  rect(ctx, 11, 44, 3, 2, trunk); rect(ctx, 18, 44, 3, 2, trunk);
  const shapes = [
    [[16, 12, 9], [8, 19, 8], [24, 19, 8], [16, 21, 10], [10, 11, 6], [22, 11, 6]],
    [[16, 11, 10], [7, 20, 7], [25, 20, 7], [16, 22, 9], [9, 13, 6]],
    [[15, 12, 9], [8, 18, 8], [24, 21, 7], [17, 22, 10], [23, 12, 7]],
  ][variant % 3];
  shapes.forEach(([cx, cy, r]) => disc(ctx, cx, cy, r + 1, dark));
  shapes.forEach(([cx, cy, r]) => disc(ctx, cx, cy, r, base));
  shapes.forEach(([cx, cy, r]) => disc(ctx, cx - 2, cy - 2, Math.max(2, r - 3), light));
  shapes.slice(0, 3).forEach(([cx, cy, r]) => disc(ctx, cx - 3, cy - 3, Math.max(1, r - 6), high));
  const rand = rng(variant * 91 + base.length * 7);
  for (let i = 0; i < 16; i++) px(ctx, 5 + Math.floor(rand() * 22), 6 + Math.floor(rand() * 22), rand() < 0.5 ? dark : high);
  if (petals) for (let i = 0; i < 12; i++) px(ctx, 5 + Math.floor(rand() * 22), 5 + Math.floor(rand() * 24), petals);
  return outline(canvas, DARK_GREEN);
}

function drawBush() {
  const { canvas, ctx } = newSprite(16, 16);
  ellipse(ctx, 8, 14, 7, 2, 'rgba(30,40,20,0.2)');
  [[5, 9, 4], [11, 9, 4], [8, 6, 5]].forEach(([cx, cy, r]) => disc(ctx, cx, cy, r, '#3f8f4a'));
  [[4, 8, 2], [10, 8, 2], [7, 4, 3]].forEach(([cx, cy, r]) => disc(ctx, cx, cy, r, '#62b45a'));
  px(ctx, 6, 8, '#f27aa5'); px(ctx, 11, 10, '#ffd54a'); px(ctx, 9, 5, '#ffffff'); px(ctx, 4, 11, '#f27aa5');
  return outline(canvas, DARK_GREEN);
}

function drawRock() {
  const { canvas, ctx } = newSprite(16, 14);
  ellipse(ctx, 8, 12, 7, 2, 'rgba(30,30,30,0.2)');
  ellipse(ctx, 8, 8, 6, 4, '#8f948f'); ellipse(ctx, 7, 7, 4, 3, '#adb2ad'); px(ctx, 5, 5, '#d5d9d3'); px(ctx, 6, 5, '#d5d9d3');
  rect(ctx, 10, 9, 3, 2, '#767b76');
  return outline(canvas, DARK);
}

function drawLantern() {
  const { canvas, ctx } = newSprite(16, 32);
  ellipse(ctx, 8, 30, 6, 2, 'rgba(30,20,30,0.22)');
  rect(ctx, 7, 12, 2, 18, '#5a3a2a'); rect(ctx, 7, 12, 1, 18, '#7a5238');
  rect(ctx, 5, 28, 6, 3, '#3f2a20'); rect(ctx, 4, 30, 8, 2, '#5a3a2a');
  rect(ctx, 5, 12, 6, 2, '#e2b43c');
  ellipse(ctx, 8, 7, 5, 6, '#c9302a'); ellipse(ctx, 8, 7, 3, 5, '#ee5540'); ellipse(ctx, 8, 7, 1, 3, '#ffd27a');
  rect(ctx, 5, 0, 7, 2, '#e2b43c'); rect(ctx, 7, 2, 3, 1, '#e2b43c');
  rect(ctx, 8, 14, 1, 3, '#e2b43c'); px(ctx, 8, 17, '#c9302a');
  return outline(canvas, DARK);
}

function drawFence(kind) {
  const { canvas, ctx } = newSprite(16, 16);
  const wood = '#b5773f', woodHi = '#d59a5c', post = '#8a5228';
  if (kind === 'h') {
    rect(ctx, 0, 6, 16, 2, wood); rect(ctx, 0, 6, 16, 1, woodHi);
    rect(ctx, 0, 10, 16, 2, wood); rect(ctx, 0, 10, 16, 1, woodHi);
    rect(ctx, 0, 3, 4, 12, post); rect(ctx, 0, 3, 4, 2, woodHi); rect(ctx, 3, 5, 1, 10, '#6e3e1c');
  } else if (kind === 'v') {
    rect(ctx, 7, 0, 2, 8, wood); rect(ctx, 7, 0, 1, 8, woodHi);
    rect(ctx, 6, 5, 4, 11, post); rect(ctx, 6, 5, 4, 2, woodHi); rect(ctx, 9, 7, 1, 9, '#6e3e1c');
  } else {
    rect(ctx, 6, 3, 4, 12, post); rect(ctx, 6, 3, 4, 2, woodHi); rect(ctx, 9, 5, 1, 10, '#6e3e1c');
  }
  return outline(canvas, DARK);
}

function drawCrate() {
  const { canvas, ctx } = newSprite(16, 16);
  ellipse(ctx, 8, 14, 7, 2, 'rgba(30,20,20,0.2)');
  rect(ctx, 1, 3, 14, 12, '#c0904f'); rect(ctx, 1, 3, 14, 2, '#dcae70');
  rect(ctx, 1, 3, 2, 12, '#8a5a2a'); rect(ctx, 13, 3, 2, 12, '#8a5a2a'); rect(ctx, 1, 13, 14, 2, '#8a5a2a');
  for (let i = 0; i < 9; i++) { px(ctx, 3 + i, 5 + i, '#8a5a2a'); px(ctx, 12 - i, 5 + i, '#8a5a2a'); }
  return outline(canvas, DARK);
}

function drawBarrel() {
  const { canvas, ctx } = newSprite(16, 16);
  ellipse(ctx, 8, 14, 7, 2, 'rgba(30,20,20,0.2)');
  rect(ctx, 2, 3, 12, 12, '#a86a3c'); rect(ctx, 1, 5, 14, 8, '#a86a3c');
  rect(ctx, 3, 3, 2, 12, '#c98a52'); rect(ctx, 11, 3, 2, 12, '#7a4a26');
  rect(ctx, 1, 5, 14, 2, '#4a3a34'); rect(ctx, 1, 11, 14, 2, '#4a3a34');
  ellipse(ctx, 8, 3, 5, 2, '#d9a468'); ellipse(ctx, 8, 3, 3, 1, '#8a5a2a');
  return outline(canvas, DARK);
}

function drawHouse(p) {
  const { canvas, ctx } = newSprite(112, 80);
  // walls
  rect(ctx, 8, 46, 96, 34, p.wall); rect(ctx, 8, 46, 96, 4, 'rgba(0,0,0,0.22)');
  rect(ctx, 8, 73, 96, 7, '#a39a8a'); rect(ctx, 8, 73, 96, 1, '#c8c0b0');
  for (let x = 8; x < 104; x += 12) rect(ctx, x, 74, 1, 6, '#8a8272');
  // timber frame
  [10, 44, 66, 98].forEach((x) => rect(ctx, x, 46, 4, 28, p.beam));
  rect(ctx, 8, 46, 96, 3, p.beam); rect(ctx, 8, 60, 96, 2, p.beam);
  // door
  rect(ctx, 48, 55, 16, 25, '#5c2c20'); rect(ctx, 49, 56, 7, 24, '#7d3d2b'); rect(ctx, 57, 56, 6, 24, '#7d3d2b');
  rect(ctx, 47, 54, 18, 2, '#e2b43c'); px(ctx, 54, 68, '#e2b43c'); px(ctx, 57, 68, '#e2b43c');
  rect(ctx, 46, 78, 20, 2, '#c8c0b0');
  // windows (warm glow) with lattice
  [[19, 20], [73, 20]].forEach(([wx]) => {
    rect(ctx, wx, 52, 20, 16, '#4a3326'); rect(ctx, wx + 2, 54, 16, 12, '#f6d98a');
    rect(ctx, wx + 9, 54, 2, 12, '#4a3326'); rect(ctx, wx + 2, 59, 16, 2, '#4a3326');
    rect(ctx, wx + 2, 54, 16, 2, '#fdeeb5');
  });
  // hanging lanterns by the door
  [42, 69].forEach((lx) => { rect(ctx, lx, 47, 1, 3, '#3f2a20'); ellipse(ctx, lx, 53, 2, 3, '#d9382f'); px(ctx, lx, 52, '#ffd27a'); });
  // roof
  drawRoof(ctx, 0, 111, 12, 47, 32, p);
  return outline(canvas, DARK);
}

/** Trapezoid tiled roof from (x0..x1) at the eaves (y1) narrowing to the ridge (y0). */
function drawRoof(ctx, x0, x1, y0, y1, topInset, p) {
  for (let y = y0; y <= y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const inset = Math.round(topInset * Math.pow(1 - t, 1.4));
    const band = Math.floor((y - y0) / 4), inBand = (y - y0) % 4;
    const left = x0 + inset, right = x1 - inset;
    rect(ctx, left, y, right - left + 1, 1, inBand === 3 ? p.roofDark : inBand === 0 ? p.roofLight : p.roof);
    for (let x = left + ((band % 2) * 3); x <= right; x += 6) px(ctx, x, y, p.roofDark);
  }
  rect(ctx, x0, y1, x1 - x0 + 1, 2, p.roofDark);
  rect(ctx, x0, y1 + 2, x1 - x0 + 1, 1, p.trim || '#e2b43c');
  // upturned eave tips
  px(ctx, x0, y1 - 1, p.roofDark); px(ctx, x0 + 1, y1 - 2, p.roofDark); px(ctx, x1, y1 - 1, p.roofDark); px(ctx, x1 - 1, y1 - 2, p.roofDark);
  // ridge
  const rl = x0 + topInset - 1, rr = x1 - topInset + 1;
  rect(ctx, rl, y0 - 3, rr - rl + 1, 3, p.ridge || '#e2b43c'); rect(ctx, rl, y0 - 3, rr - rl + 1, 1, '#f6db7a');
  rect(ctx, rl - 2, y0 - 5, 3, 4, p.ridge || '#e2b43c'); rect(ctx, rr, y0 - 5, 3, 4, p.ridge || '#e2b43c');
}

function drawPalace() {
  const { canvas, ctx } = newSprite(272, 176);
  const gold = '#e2b43c', goldHi = '#f6db7a';
  const roof = { roof: '#3f4f7c', roofLight: '#5a6ea3', roofDark: '#2a3556', trim: gold, ridge: gold };
  const red = '#b8382f', redHi = '#d24d40', redDk = '#8c2a24';

  // platform + stairs
  rect(ctx, 8, 150, 256, 4, '#ebe6db'); rect(ctx, 8, 154, 256, 22, '#cdc6b6');
  for (let x = 8; x < 264; x += 16) rect(ctx, x, 154, 1, 22, '#b3ac9b');
  rect(ctx, 8, 164, 256, 1, '#b3ac9b'); rect(ctx, 8, 154, 256, 1, '#e3ddd0');
  for (let i = 0; i < 6; i++) {
    rect(ctx, 116 - i * 0, 154 + i * 4, 40, 4, i % 2 ? '#c2bba9' : '#e6e0d3');
  }
  rect(ctx, 112, 154, 4, 22, '#a9a290'); rect(ctx, 156, 154, 4, 22, '#a9a290');

  // main wall
  rect(ctx, 20, 110, 232, 41, red); rect(ctx, 20, 110, 232, 3, redHi);
  [20, 58, 96, 170, 208, 246].forEach((x) => {
    rect(ctx, x, 110, 6, 41, redDk); rect(ctx, x, 110, 2, 41, '#a3322a');
    rect(ctx, x - 1, 110, 8, 4, gold); rect(ctx, x - 1, 146, 8, 5, '#ebe6db');
  });
  [28, 66, 222, 184].forEach((x) => {
    rect(ctx, x, 121, 22, 20, '#3d2a22'); rect(ctx, x + 2, 123, 18, 16, '#f0d898');
    for (let i = 0; i < 18; i += 4) { rect(ctx, x + 2 + i, 123, 1, 16, '#3d2a22'); }
    for (let j = 0; j < 16; j += 4) { rect(ctx, x + 2, 123 + j, 18, 1, '#3d2a22'); }
    rect(ctx, x - 1, 141, 24, 3, redDk);
  });
  // grand door
  rect(ctx, 118, 116, 36, 35, '#3a1a16'); rect(ctx, 120, 118, 32, 33, '#7a2a20');
  rect(ctx, 135, 118, 2, 33, '#3a1a16'); rect(ctx, 118, 116, 36, 3, gold);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { px(ctx, 123 + c * 4, 124 + r * 6, gold); px(ctx, 141 + c * 4, 124 + r * 6, gold); }
  // hanging lanterns beside the door
  [109, 162].forEach((lx) => { rect(ctx, lx, 113, 1, 6, '#3f2a20'); ellipse(ctx, lx, 125, 3, 5, '#d9382f'); ellipse(ctx, lx, 125, 1, 3, '#ffd27a'); rect(ctx, lx - 2, 119, 5, 1, gold); });

  // lower roof + trim
  drawRoof(ctx, 0, 271, 78, 112, 36, roof);
  // shadow under the eaves
  rect(ctx, 20, 115, 232, 4, 'rgba(60,20,20,0.35)');

  // upper storey
  rect(ctx, 64, 58, 144, 24, red); rect(ctx, 64, 58, 144, 3, redHi);
  [64, 100, 166, 202].forEach((x) => { rect(ctx, x, 58, 6, 24, redDk); rect(ctx, x - 1, 58, 8, 3, gold); });
  [[74, 22], [176, 22]].forEach(([x]) => { rect(ctx, x, 64, 22, 14, '#3d2a22'); rect(ctx, x + 2, 66, 18, 10, '#f0d898'); rect(ctx, x + 10, 66, 2, 10, '#3d2a22'); rect(ctx, x + 2, 70, 18, 2, '#3d2a22'); });
  disc(ctx, 136, 69, 7, gold); disc(ctx, 136, 69, 5, redDk); disc(ctx, 136, 69, 2, goldHi);
  // upper roof
  drawRoof(ctx, 34, 237, 26, 61, 52, roof);
  // finial
  rect(ctx, 134, 8, 4, 14, gold); disc(ctx, 136, 8, 3, goldHi); rect(ctx, 135, 2, 2, 4, gold);
  return outline(canvas, DARK);
}

function drawStall(colorA, colorB) {
  const { canvas, ctx } = newSprite(72, 56);
  ellipse(ctx, 36, 53, 32, 3, 'rgba(30,20,20,0.2)');
  rect(ctx, 4, 18, 4, 38, '#7a4a2c'); rect(ctx, 64, 18, 4, 38, '#7a4a2c');
  rect(ctx, 6, 38, 60, 18, '#a86a3c');
  for (let x = 6; x < 66; x += 6) rect(ctx, x, 40, 1, 16, '#8a5228');
  rect(ctx, 4, 34, 64, 5, '#c98a52'); rect(ctx, 4, 34, 64, 1, '#e6b07a');
  // goods
  const basket = (x, goods, hi) => { rect(ctx, x, 29, 12, 6, '#c9a35a'); rect(ctx, x, 29, 12, 1, '#e6c880'); rect(ctx, x + 1, 25, 10, 5, goods); rect(ctx, x + 2, 25, 4, 1, hi); };
  basket(10, '#5fae4d', '#8fd57a'); basket(24, '#d9433b', '#f27a70'); basket(38, '#e8c24a', '#f6e28a'); basket(52, '#a06ac8', '#c99be8');
  // striped awning
  for (let x = 0; x < 72; x += 8) {
    const c = (x / 8) % 2 ? colorB : colorA;
    rect(ctx, x, 8, 8, 14, c);
    ellipse(ctx, x + 4, 22, 4, 3, c);
  }
  rect(ctx, 0, 5, 72, 4, '#7a4a2c'); rect(ctx, 0, 5, 72, 1, '#a86a3c');
  rect(ctx, 0, 9, 72, 1, 'rgba(255,255,255,0.25)');
  return outline(canvas, DARK);
}

function drawThrone() {
  const { canvas, ctx } = newSprite(32, 40);
  const gold = '#e2b43c', goldHi = '#f6db7a', wood = '#5a3a2a';
  ellipse(ctx, 16, 38, 13, 3, 'rgba(20,10,10,0.3)');
  rect(ctx, 4, 30, 24, 8, '#8c2a24'); rect(ctx, 4, 30, 24, 2, '#b8382f');
  rect(ctx, 2, 12, 4, 26, wood); rect(ctx, 26, 12, 4, 26, wood);
  rect(ctx, 2, 12, 4, 3, gold); rect(ctx, 26, 12, 4, 3, gold);
  rect(ctx, 6, 16, 20, 14, '#7a2a20'); rect(ctx, 6, 16, 20, 2, '#a3382c');
  rect(ctx, 6, 16, 2, 14, gold); rect(ctx, 24, 16, 2, 14, gold);
  rect(ctx, 4, 0, 24, 14, '#7a2a20'); rect(ctx, 4, 0, 24, 3, '#a3382c');
  rect(ctx, 4, 0, 3, 14, gold); rect(ctx, 25, 0, 3, 14, gold);
  disc(ctx, 16, 4, 3, gold); disc(ctx, 16, 4, 1, goldHi);
  for (let y = 6; y < 13; y += 3) { rect(ctx, 9, y, 2, 2, gold); rect(ctx, 21, y, 2, 2, gold); }
  return outline(canvas, DARK);
}

function drawPillar() {
  const { canvas, ctx } = newSprite(16, 48);
  ellipse(ctx, 8, 46, 6, 2, 'rgba(20,10,10,0.25)');
  rect(ctx, 3, 6, 10, 38, '#8c2a24'); rect(ctx, 3, 6, 3, 38, '#a3382c'); rect(ctx, 10, 6, 3, 38, '#6e1e18');
  rect(ctx, 1, 2, 14, 5, '#e2b43c'); rect(ctx, 1, 2, 14, 2, '#f6db7a'); rect(ctx, 1, 40, 14, 5, '#e2b43c'); rect(ctx, 1, 40, 14, 2, '#f6db7a');
  for (let y = 10; y < 42; y += 6) { rect(ctx, 3, y, 10, 1, '#6e1e18'); }
  return outline(canvas, DARK);
}

function drawBanner() {
  const { canvas, ctx } = newSprite(16, 32);
  rect(ctx, 1, 0, 14, 3, '#5a3a2a');
  rect(ctx, 3, 3, 10, 24, '#8c2a24'); rect(ctx, 3, 3, 10, 2, '#a3382c');
  rect(ctx, 3, 27, 10, 3, '#e2b43c');
  disc(ctx, 8, 15, 4, '#e2b43c'); disc(ctx, 8, 15, 2, '#f6db7a');
  rect(ctx, 3, 3, 2, 24, '#6e1e18'); rect(ctx, 9, 3, 2, 24, '#6e1e18');
  return outline(canvas, DARK);
}

export function buildObjectSprites() {
  const wallA = { wall: '#f0e2c0', beam: '#7a3f2b' };
  const sprites = {
    tree0: drawTree({ base: '#3f9a4e', light: '#65b95f', high: '#8ad675', dark: '#2b6b3a', variant: 0 }),
    tree1: drawTree({ base: '#4aa055', light: '#72c064', high: '#98dc80', dark: '#2f7040', variant: 1 }),
    tree2: drawTree({ base: '#5fa845', light: '#8ac557', high: '#aee27a', dark: '#3d7a30', variant: 2 }),
    cherry0: drawTree({ base: '#f0a0bd', light: '#f9c4d6', high: '#ffe6ee', dark: '#c46f95', trunk: '#6b4a3a', trunkLight: '#86604d', trunkDark: '#4e3428', variant: 0, petals: '#ffffff' }),
    cherry1: drawTree({ base: '#ee94b4', light: '#f8bad0', high: '#ffe0ea', dark: '#bb6590', trunk: '#6b4a3a', trunkLight: '#86604d', trunkDark: '#4e3428', variant: 2, petals: '#fff4f8' }),
    bush: drawBush(),
    rock: drawRock(),
    lantern: drawLantern(),
    fence_h: drawFence('h'), fence_v: drawFence('v'), fence_post: drawFence('p'),
    crate: drawCrate(),
    barrel: drawBarrel(),
    house0: drawHouse({ ...wallA, roof: '#9a5540', roofLight: '#b87058', roofDark: '#6f3a2b' }),
    house1: drawHouse({ wall: '#efe0bb', beam: '#5f3a2b', roof: '#43705f', roofLight: '#5c8f7a', roofDark: '#2e5044' }),
    house2: drawHouse({ wall: '#f2e6c8', beam: '#6b3a2a', roof: '#4f5f8c', roofLight: '#6a7db0', roofDark: '#36446a' }),
    stall0: drawStall('#d0483b', '#f6ead0'),
    stall1: drawStall('#4f9a62', '#f6ead0'),
    stall2: drawStall('#e8a93a', '#f6ead0'),
    palace: drawPalace(),
    throne: drawThrone(),
    pillar: drawPillar(),
    banner: drawBanner(),
  };
  return sprites;
}

/** Pack all sprite canvases into one atlas canvas. Returns { canvas, frames }. */
export function packAtlas(sprites, atlasW = 512) {
  const entries = Object.entries(sprites).sort((a, b) => b[1].height - a[1].height);
  const frames = {};
  let x = 0, y = 0, rowH = 0;
  for (const [name, c] of entries) {
    if (x + c.width > atlasW) { x = 0; y += rowH + 1; rowH = 0; }
    frames[name] = { x, y, w: c.width, h: c.height };
    x += c.width + 1;
    rowH = Math.max(rowH, c.height);
  }
  const canvas = makeCanvas(atlasW, y + rowH);
  const ctx = canvas.getContext('2d');
  for (const [name, c] of entries) ctx.drawImage(c, frames[name].x, frames[name].y);
  return { canvas, frames };
}

// ============================================================ labels =========
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '111101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110', '-': '000000111000000',
};

/** Tiny 3x5 pixel-font label with a dark outline, returned as a canvas. */
export function makeLabel(text, color = '#ffffff') {
  const chars = [...text.toUpperCase()];
  const width = Math.max(1, chars.length * 4 - 1);
  const canvas = makeCanvas(width + 4, 5 + 4);
  const ctx = canvas.getContext('2d');
  chars.forEach((ch, i) => {
    const g = FONT[ch];
    if (!g) return;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') px(ctx, 2 + i * 4 + c, 2 + r, color);
  });
  return outline(canvas, [40, 26, 44]);
}


// ============================================================ interior ======
const WOOD_A = '#8a6a48', WOOD_B = '#7f6041';
const RUG = '#8c2a24', RUG_TRIM = '#e2b43c';

/** Bakes the throne-room floor (wood planks + a red rug leading to the dais). */
export function bakeInteriorGround(map) {
  const canvas = makeCanvas(map.W * TILE, map.H * TILE);
  const ctx = canvas.getContext('2d');
  for (let ty = 0; ty < map.H; ty++) {
    for (let tx = 0; tx < map.W; tx++) {
      const x = tx * TILE, y = ty * TILE;
      const isRug = map.ground[ty * map.W + tx] === FLOOR.RUG;
      if (isRug) {
        rect(ctx, x, y, TILE, TILE, RUG);
        if (tx === 8 || map.ground[ty * map.W + tx - 1] !== FLOOR.RUG) rect(ctx, x, y, 2, TILE, RUG_TRIM);
        if (tx === 12 || map.ground[ty * map.W + tx + 1] !== FLOOR.RUG) rect(ctx, x + TILE - 2, y, 2, TILE, RUG_TRIM);
      } else {
        rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? WOOD_A : WOOD_B);
        rect(ctx, x, y, TILE, 1, 'rgba(255,255,255,0.06)');
        rect(ctx, x, y + TILE - 1, TILE, 1, 'rgba(0,0,0,0.12)');
      }
    }
  }
  // back wall strip along the top
  rect(ctx, 0, 0, map.W * TILE, TILE, '#4a3326');
  rect(ctx, 0, TILE - 3, map.W * TILE, 3, '#2e1e16');
  return canvas;
}

// ============================================================ gift icon ======
/** A small pink pixel flower, used as the "gave a flower" reaction icon. */
export function makeFlowerIcon() {
  const canvas = makeCanvas(14, 16);
  const ctx = canvas.getContext('2d');
  rect(ctx, 6, 9, 2, 6, '#4f9a45');
  rect(ctx, 6, 13, 3, 1, '#3f8a3f');
  const petal = '#f27aa5', petalLight = '#ffb3cf', center = '#ffd54a';
  disc(ctx, 7, 5, 3, petal); disc(ctx, 4, 7, 3, petal); disc(ctx, 10, 7, 3, petal);
  disc(ctx, 5, 9, 3, petal); disc(ctx, 9, 9, 3, petal);
  disc(ctx, 7, 7, 2, center); px(ctx, 6, 6, petalLight); px(ctx, 9, 6, petalLight);
  return outline(canvas, [63, 40, 50]);
}

/** A tiny pixel heart, used for the "aww, happy" reaction after a gift lands. */
export function makeHeartIcon() {
  const canvas = makeCanvas(10, 9);
  const ctx = canvas.getContext('2d');
  const red = '#e8536b', light = '#ff8fa3';
  rect(ctx, 1, 1, 3, 3, red); rect(ctx, 6, 1, 3, 3, red);
  rect(ctx, 1, 4, 8, 2, red);
  rect(ctx, 2, 6, 6, 1, red); rect(ctx, 3, 7, 4, 1, red); rect(ctx, 4, 8, 2, 1, red);
  px(ctx, 2, 2, light); px(ctx, 7, 2, light);
  return outline(canvas, [63, 25, 35]);
}
