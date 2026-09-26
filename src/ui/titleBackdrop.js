// A pixel-art skyline for the title screen, drawn once with the same generators as the game.
import { rect, disc, ellipse, rng } from '../art/canvas.js';
import { buildObjectSprites } from '../art/environment.js';
import { getSheet } from '../art/registry.js';
import { CELL_W, CELL_H } from '../art/characters.js';

const W = 640, H = 360;

export function drawTitleBackdrop(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rand = rng(42);
  const sprites = buildObjectSprites();
  const scaled = (img, x, y, s) => ctx.drawImage(img, Math.round(x), Math.round(y), img.width * s, img.height * s);

  // sky in soft bands
  const sky = ['#6fb7ee', '#7cc0f0', '#8ec9f2', '#a3d3f3', '#bcdcf2', '#d5e6f0', '#ecebe6', '#f8e9d2'];
  sky.forEach((c, i) => rect(ctx, 0, i * 30, W, 30, c));

  // clouds
  [[70, 40, 1], [230, 70, 0.8], [430, 30, 1.2], [560, 84, 0.9], [340, 110, 0.7]].forEach(([cx, cy, s]) => {
    [[0, 0, 26, 8], [-18, 4, 16, 6], [20, 4, 18, 6], [4, -6, 14, 7]].forEach(([dx, dy, rx, ry]) => ellipse(ctx, cx + dx * s, cy + dy * s, rx * s, ry * s, '#ffffff'));
    ellipse(ctx, cx, cy + 8 * s, 24 * s, 3 * s, '#dfeaf6');
  });

  // mountains
  for (let x = 0; x < W; x++) {
    const h1 = 60 + Math.sin(x / 47) * 22 + Math.sin(x / 19 + 1) * 8;
    const h2 = 38 + Math.sin(x / 33 + 2) * 16 + Math.sin(x / 11) * 4;
    rect(ctx, x, 236 - Math.round(h1), 1, Math.round(h1), '#a9bddc');
    rect(ctx, x, 236 - Math.round(h2), 1, Math.round(h2), '#8fa9d0');
  }

  // distant blossom groves + palace
  rect(ctx, 0, 232, W, 40, '#7dba62');
  for (let x = -10; x < W + 10; x += 9) {
    const y = 226 + Math.sin(x / 23) * 4 + rand() * 4;
    disc(ctx, x, Math.round(y), 8 + Math.floor(rand() * 4), rand() < 0.7 ? '#f3a9c4' : '#e98db2');
    disc(ctx, x - 2, Math.round(y) - 3, 4, '#fbd0e0');
  }
  scaled(sprites.palace, W / 2 - 136 + 20, 96, 1);
  rect(ctx, 0, 262, W, H - 262, '#6fae55');

  // mid-ground trees
  for (let x = 0; x < W; x += 34) scaled(sprites.tree0, x - 6 + rand() * 8, 236 + rand() * 6, 1);
  for (let x = 12; x < W; x += 52) scaled(sprites['cherry' + (x % 2)], x, 226 + rand() * 12, 1.5);

  // path + grass
  for (let y = 262; y < H; y++) {
    const half = 16 + (y - 262) * 0.9;
    rect(ctx, Math.round(W / 2 + 60 - half), y, Math.round(half * 2), 1, y % 6 < 3 ? '#e2c48e' : '#dcbb84');
  }
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rand() * W), y = 262 + Math.floor(rand() * (H - 262));
    rect(ctx, x, y, 1, 2, rand() < 0.5 ? '#8ccb6c' : '#4f9a45');
  }

  // big cherry trees framing the scene
  scaled(sprites.cherry0, -30, 110, 5);
  scaled(sprites.cherry1, W - 150, 130, 5);

  // Maomao and Jinshi seen from behind, looking out over the palace
  const back = (key, x, y, s) => ctx.drawImage(getSheet(key), 0, 3 * CELL_H, CELL_W, CELL_H, x, y, CELL_W * s, CELL_H * s);
  back('jinshi', 96, 194, 5);
  back('maomao', 204, 218, 4);

  // wooden balcony railing
  rect(ctx, 0, 318, W, 42, '#5b3b2d'); rect(ctx, 0, 318, W, 4, '#8a5a3f'); rect(ctx, 0, 344, W, 16, '#472e24');
  for (let x = 8; x < W; x += 56) { rect(ctx, x, 296, 12, 48, '#7a4d36'); rect(ctx, x, 296, 12, 4, '#a36c4c'); rect(ctx, x + 9, 300, 3, 44, '#5b3b2d'); }
  rect(ctx, 0, 306, W, 8, '#7a4d36'); rect(ctx, 0, 306, W, 2, '#a36c4c');

  // drifting petals (static)
  for (let i = 0; i < 40; i++) rect(ctx, Math.floor(rand() * W), Math.floor(rand() * 300), 2, 1, rand() < 0.5 ? '#ffd0e0' : '#ffffff');
}
