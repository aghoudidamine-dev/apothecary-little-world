// Pixel art for the cozy house interior: furniture sprites + the floor/wall bake.
import { makeCanvas, rect, px, disc, ellipse, rng, outline } from './canvas.js';
import { TILE } from '../world/mapData.js';
import { FLOOR } from '../world/homeMap.js';

const DARK = [43, 30, 46];
const sprite = (w, h) => { const canvas = makeCanvas(w, h); return { canvas, ctx: canvas.getContext('2d') }; };
const WOOD = '#6b4530', WOOD_LIGHT = '#8a5c3f', WOOD_DARK = '#4a2f20', GOLD = '#e2b43c';

function drawBed() {
  const { canvas, ctx } = sprite(48, 48);
  ellipse(ctx, 24, 45, 22, 3, 'rgba(20,10,10,0.25)');
  rect(ctx, 2, 40, 4, 6, WOOD_DARK); rect(ctx, 42, 40, 4, 6, WOOD_DARK);
  rect(ctx, 0, 0, 48, 16, WOOD_DARK); rect(ctx, 0, 0, 48, 3, WOOD_LIGHT); rect(ctx, 3, 4, 42, 10, WOOD);
  rect(ctx, 5, 12, 17, 9, '#f6ecd6'); rect(ctx, 26, 12, 17, 9, '#f6ecd6');
  rect(ctx, 5, 12, 17, 2, '#ffffff'); rect(ctx, 26, 12, 17, 2, '#ffffff');
  rect(ctx, 5, 19, 17, 2, '#d9ccb0'); rect(ctx, 26, 19, 17, 2, '#d9ccb0');
  rect(ctx, 2, 20, 44, 22, '#c4566f'); rect(ctx, 2, 20, 44, 5, '#f2e3c8');
  rect(ctx, 2, 30, 44, 2, '#a63f58'); rect(ctx, 2, 36, 44, 2, '#a63f58');
  for (let x = 8; x < 44; x += 10) { px(ctx, x, 33, '#f2d16a'); px(ctx, x - 1, 33, '#f2d16a'); px(ctx, x + 1, 33, '#f2d16a'); px(ctx, x, 32, '#f2d16a'); px(ctx, x, 34, '#f2d16a'); }
  rect(ctx, 0, 40, 48, 6, WOOD_DARK); rect(ctx, 0, 40, 48, 1, WOOD_LIGHT);
  return outline(canvas, DARK);
}

function drawTable() {
  const { canvas, ctx } = sprite(48, 32);
  ellipse(ctx, 24, 30, 22, 2, 'rgba(20,10,10,0.2)');
  rect(ctx, 4, 22, 4, 9, WOOD_DARK); rect(ctx, 40, 22, 4, 9, WOOD_DARK);
  rect(ctx, 2, 18, 44, 6, WOOD); rect(ctx, 0, 6, 48, 14, '#a87650'); rect(ctx, 0, 6, 48, 2, '#c99a6e'); rect(ctx, 0, 18, 48, 2, '#7a5238');
  ellipse(ctx, 22, 12, 5, 3, '#f2ece0'); rect(ctx, 20, 8, 5, 2, '#d0c8b0'); rect(ctx, 26, 10, 4, 1, '#f2ece0'); px(ctx, 17, 11, '#d0c8b0');
  ellipse(ctx, 35, 13, 2, 1, '#f2ece0'); ellipse(ctx, 10, 13, 2, 1, '#f2ece0');
  rect(ctx, 41, 9, 1, 4, '#4f9a45'); px(ctx, 41, 8, '#f27aa5'); px(ctx, 40, 8, '#ffb3cf'); px(ctx, 42, 8, '#ffb3cf');
  return outline(canvas, DARK);
}

function drawCushion() {
  const { canvas, ctx } = sprite(16, 16);
  ellipse(ctx, 8, 13, 6, 2, 'rgba(20,10,10,0.2)');
  ellipse(ctx, 8, 9, 7, 5, '#d9902f'); ellipse(ctx, 8, 8, 5, 3, '#f0c560');
  px(ctx, 1, 10, '#c47a2a'); px(ctx, 14, 10, '#c47a2a'); px(ctx, 8, 7, '#fbe3a0');
  return outline(canvas, DARK);
}

function drawBookshelf() {
  const { canvas, ctx } = sprite(32, 48);
  rect(ctx, 0, 0, 32, 48, WOOD); rect(ctx, 2, 2, 28, 44, WOOD_DARK);
  const rand = rng(11);
  const cols = ['#c4566f', '#4f7a9a', '#6b9a5a', '#d9a441', '#8a5aa6', '#e8e2d0', '#b5694a'];
  [4, 18, 32].forEach((y) => {
    rect(ctx, 2, y + 11, 28, 2, WOOD_LIGHT);
    let x = 3;
    while (x < 28) { const w = 2 + Math.floor(rand() * 3), h = 7 + Math.floor(rand() * 4); rect(ctx, x, y + 11 - h, w, h, cols[Math.floor(rand() * cols.length)]); x += w + 1; }
  });
  rect(ctx, 0, 0, 32, 2, WOOD_LIGHT);
  return outline(canvas, DARK);
}

function drawCabinet() {
  const { canvas, ctx } = sprite(32, 48);
  rect(ctx, 1, 14, 30, 33, '#7a5238'); rect(ctx, 1, 14, 30, 2, WOOD_LIGHT);
  [['#7fb069', 3], ['#d9a441', 12], ['#c9748b', 21]].forEach(([c, x]) => {
    rect(ctx, x, 5, 8, 9, c); rect(ctx, x, 3, 8, 2, '#c9a35a'); rect(ctx, x + 1, 6, 2, 5, 'rgba(255,255,255,0.35)');
  });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const x = 3 + c * 9, y = 18 + r * 7;
    rect(ctx, x, y, 8, 6, WOOD_LIGHT); rect(ctx, x, y + 5, 8, 1, WOOD_DARK);
    rect(ctx, x + 2, y + 1, 4, 2, '#f2e3c8'); px(ctx, x + 3, y + 4, GOLD); px(ctx, x + 4, y + 4, GOLD);
  }
  return outline(canvas, DARK);
}

function drawStove() {
  const { canvas, ctx } = sprite(32, 32);
  rect(ctx, 24, 0, 5, 9, '#7a6454');
  rect(ctx, 2, 10, 28, 20, '#9a7a62'); rect(ctx, 2, 10, 28, 2, '#b5967c'); rect(ctx, 0, 8, 32, 4, '#6b5646');
  rect(ctx, 6, 2, 10, 7, '#4a4a52'); rect(ctx, 5, 1, 12, 2, '#6a6a74'); px(ctx, 9, 0, '#e8e2d0'); px(ctx, 11, -1, '#e8e2d0');
  rect(ctx, 9, 16, 14, 11, '#2b1a14'); disc(ctx, 16, 23, 4, '#f28c38'); disc(ctx, 16, 23, 2, '#ffd27a');
  rect(ctx, 8, 15, 16, 2, '#6b5646');
  return outline(canvas, DARK);
}

function drawWindow() {
  const { canvas, ctx } = sprite(32, 32);
  rect(ctx, 0, 0, 32, 32, WOOD); rect(ctx, 3, 3, 26, 26, '#bfe3f2'); rect(ctx, 3, 3, 26, 9, '#e6f4f8');
  rect(ctx, 15, 3, 2, 26, WOOD); rect(ctx, 3, 15, 26, 2, WOOD);
  rect(ctx, 3, 3, 6, 26, '#d9a0b0'); rect(ctx, 23, 3, 6, 26, '#d9a0b0');
  for (let y = 3; y < 29; y += 5) { rect(ctx, 5, y, 1, 4, '#c0808f'); rect(ctx, 25, y, 1, 4, '#c0808f'); }
  rect(ctx, 0, 29, 32, 3, WOOD_LIGHT);
  return outline(canvas, DARK);
}

function drawPlant() {
  const { canvas, ctx } = sprite(16, 24);
  ellipse(ctx, 8, 22, 6, 2, 'rgba(20,10,10,0.2)');
  ellipse(ctx, 4, 10, 2, 5, '#62b45a'); ellipse(ctx, 12, 10, 2, 5, '#3f8a3f');
  ellipse(ctx, 8, 9, 3, 6, '#4f9a45'); ellipse(ctx, 8, 5, 2, 4, '#7acb6c');
  rect(ctx, 2, 14, 12, 3, '#c9805f'); rect(ctx, 3, 17, 10, 6, '#b5694a'); rect(ctx, 3, 17, 2, 6, '#d18a68');
  return outline(canvas, [33, 58, 40]);
}

function drawChest() {
  const { canvas, ctx } = sprite(32, 24);
  ellipse(ctx, 16, 22, 14, 2, 'rgba(20,10,10,0.2)');
  rect(ctx, 1, 8, 30, 14, WOOD_LIGHT); rect(ctx, 0, 3, 32, 7, '#a87650'); rect(ctx, 0, 3, 32, 1, '#c99a6e');
  rect(ctx, 4, 3, 3, 19, '#4a3a34'); rect(ctx, 25, 3, 3, 19, '#4a3a34');
  rect(ctx, 14, 8, 4, 5, GOLD); px(ctx, 15, 10, '#f6db7a');
  return outline(canvas, DARK);
}

export function buildHomeSprites() {
  return {
    bed: drawBed(), table: drawTable(), cushion: drawCushion(), bookshelf: drawBookshelf(),
    cabinet: drawCabinet(), stove: drawStove(), window: drawWindow(), plant: drawPlant(), chest: drawChest(),
  };
}

/** Bakes plaster back wall, plank floor, and the rose rug. */
export function bakeHomeGround(map) {
  const canvas = makeCanvas(map.W * TILE, map.H * TILE);
  const ctx = canvas.getContext('2d');
  const rand = rng(5);
  const isRug = (x, y) => x >= 0 && y >= 0 && x < map.W && y < map.H && map.ground[y * map.W + x] === FLOOR.RUG;
  for (let ty = 0; ty < map.H; ty++) {
    for (let tx = 0; tx < map.W; tx++) {
      const x = tx * TILE, y = ty * TILE;
      if (ty < 2) { // plaster wall with timber posts
        rect(ctx, x, y, TILE, TILE, rand() < 0.5 ? '#efdcc0' : '#ead6b8');
        if (ty === 0) rect(ctx, x, y, TILE, 3, '#5a3a28');
        if (tx % 7 === 0) rect(ctx, x + 6, y, 4, TILE, WOOD);
        if (ty === 1) { rect(ctx, x, y + 13, TILE, 3, WOOD); rect(ctx, x, y + 13, TILE, 1, WOOD_LIGHT); }
      } else if (isRug(tx, ty)) {
        rect(ctx, x, y, TILE, TILE, '#b84e63');
        if ((tx + ty) % 2 === 0) rect(ctx, x + 6, y + 6, 4, 4, '#cf6a80');
        if (!isRug(tx, ty - 1)) { rect(ctx, x, y, TILE, 2, '#f2e3c8'); rect(ctx, x, y + 2, TILE, 2, '#8f3347'); }
        if (!isRug(tx, ty + 1)) { rect(ctx, x, y + 14, TILE, 2, '#f2e3c8'); rect(ctx, x, y + 12, TILE, 2, '#8f3347'); }
        if (!isRug(tx - 1, ty)) { rect(ctx, x, y, 2, TILE, '#f2e3c8'); rect(ctx, x + 2, y, 2, TILE, '#8f3347'); }
        if (!isRug(tx + 1, ty)) { rect(ctx, x + 14, y, 2, TILE, '#f2e3c8'); rect(ctx, x + 12, y, 2, TILE, '#8f3347'); }
      } else { // wooden planks
        rect(ctx, x, y, TILE, 8, (tx + ty) % 2 ? '#b98b5f' : '#b08157');
        rect(ctx, x, y + 8, TILE, 8, (tx + ty) % 2 ? '#b08157' : '#b98b5f');
        rect(ctx, x, y + 7, TILE, 1, '#8a6240'); rect(ctx, x, y + 15, TILE, 1, '#8a6240');
        rect(ctx, x + ((ty % 2) ? 5 : 11), y, 1, 8, '#8a6240');
        rect(ctx, x + ((ty % 2) ? 11 : 4), y + 8, 1, 8, '#8a6240');
      }
    }
  }
  return canvas;
}
