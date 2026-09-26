// Procedural pixel-art characters.
//
// Every character is a 16x24 body drawn inside a 20x28 cell (2px padding so the
// outline fits). A sprite sheet is 4 columns (frames) x 4 rows (directions):
//   rows:   0 = down, 1 = left, 2 = right, 3 = up
//   frames: 0 = idle, 1 = step A, 2 = idle (breathing), 3 = step B
import { makeCanvas, rect, px, outline } from './canvas.js';

export const CELL_W = 20;
export const CELL_H = 28;
export const DIRS = ['down', 'left', 'right', 'up'];
export const FEET_Y = 26; // y of the feet inside a cell (used as sprite origin)

const SKIN = '#f6d3b3';
const SKIN_SHADE = '#e3b58f';

/** Character definitions. Colours are the only thing that changes between them. */
export const CHARACTER_SPECS = {
  maomao: {
    label: 'Maomao',
    hair: '#1e4f55', hairLight: '#2f7a7a', hairShadow: '#143a40',
    robe: '#4f9a62', robeLight: '#7cc487', robeDark: '#356e47',
    trim: '#f2e6b8', sash: '#e8d38c', shoes: '#3b2c30',
    style: 'bob', accessory: 'ribbon', freckles: true, eye: '#1d2b33',
  },
  jinshi: {
    label: 'Jinshi',
    hair: '#2b2350', hairLight: '#463a80', hairShadow: '#1a1538',
    robe: '#4a3f86', robeLight: '#6f63b4', robeDark: '#2f2758',
    trim: '#e9c25a', sash: '#e9c25a', shoes: '#241d3d',
    style: 'long', accessory: 'pin', freckles: false, eye: '#1a1538',
  },
  guard: {
    label: 'Guard',
    hair: '#3a2a26', hairLight: '#54403a', hairShadow: '#241a18',
    robe: '#8b95a5', robeLight: '#b5bfcc', robeDark: '#5f6878',
    trim: '#c8483b', sash: '#c8483b', shoes: '#2f2a33',
    style: 'short', accessory: 'helmet', freckles: false, eye: '#1d1d22',
  },
  merchant: {
    label: 'Merchant',
    hair: '#4a3021', hairLight: '#6a4a33', hairShadow: '#2f1e15',
    robe: '#d9823a', robeLight: '#f0a55c', robeDark: '#a95d24',
    trim: '#f6e2a0', sash: '#7a3b2b', shoes: '#4a3021',
    style: 'short', accessory: 'cap', freckles: false, eye: '#2a1a12',
  },
  gardener: {
    label: 'Gardener',
    hair: '#6b5a48', hairLight: '#8b7a66', hairShadow: '#4a3d31',
    robe: '#8dab55', robeLight: '#b3cf7b', robeDark: '#617a38',
    trim: '#e6d8a0', sash: '#8a5a34', shoes: '#5a3f2b',
    style: 'short', accessory: 'straw', freckles: false, eye: '#2a2118',
  },
  villager: {
    label: 'Villager',
    hair: '#5a2f26', hairLight: '#7d4a3c', hairShadow: '#3d1f19',
    robe: '#b5694a', robeLight: '#d68d69', robeDark: '#874a31',
    trim: '#f0dcc0', sash: '#f0dcc0', shoes: '#3f2a22',
    style: 'short', accessory: 'none', freckles: false, eye: '#2a1712',
  },
  servant: {
    label: 'Servant',
    hair: '#26232f', hairLight: '#3e3a4d', hairShadow: '#17151d',
    robe: '#8fc1d9', robeLight: '#b9dcec', robeDark: '#5f93ad',
    trim: '#ffffff', sash: '#e68aa6', shoes: '#3a3550',
    style: 'bun', accessory: 'scarf', freckles: false, eye: '#1b1a24',
  },
};

// ---------------------------------------------------------------------------

/** Draw one 16x24 body into ctx (origin 0,0), facing 'down' | 'left' | 'up'. */
function drawBody(ctx, s, dir, frame) {
  const bob = frame === 2 ? 1 : 0; // breathing: upper body drops 1px
  const stepA = frame === 1;
  const stepB = frame === 3;
  const walking = stepA || stepB;
  const H = (x, y, w, h, c) => rect(ctx, x, y + bob, w, h, c); // shifted with the body

  // ----- feet / legs (not bobbing) -----
  const foot = (x, y, w = 3) => rect(ctx, x, y, w, 2, s.shoes);
  if (dir === 'down' || dir === 'up') {
    if (stepA) { foot(5, 22); foot(9, 21); }
    else if (stepB) { foot(5, 21); foot(9, 22); }
    else { foot(5, 22); foot(9, 22); }
  } else {
    if (stepA) { foot(3, 22); foot(9, 21); }
    else if (stepB) { foot(4, 21); foot(9, 22); }
    else { foot(6, 22); foot(8, 22); }
  }

  // ----- hair behind the body (long styles) -----
  if (s.style === 'long') {
    if (dir === 'down') { H(3, 5, 10, 13, s.hairShadow); }
    if (dir === 'up') { H(3, 3, 10, 16, s.hair); H(5, 8, 1, 9, s.hairLight); H(9, 6, 1, 10, s.hairLight); }
    if (dir === 'left') { H(8, 4, 5, 15, s.hair); H(9, 8, 1, 8, s.hairLight); }
  }

  // ----- skirt / robe hem -----
  if (dir === 'left') {
    H(5, 18, 6, 4, s.robe); H(5, 21, 6, 1, s.robeDark); H(5, 18, 1, 3, s.robeLight);
  } else {
    H(4, 18, 8, 4, s.robe); H(4, 21, 8, 1, s.robeDark);
    H(4, 18, 1, 3, s.robeLight); H(7, 19, 2, 2, s.robeDark);
  }

  // ----- torso -----
  if (dir === 'left') {
    H(5, 12, 6, 7, s.robe); H(5, 12, 1, 6, s.robeLight); H(10, 13, 1, 5, s.robeDark);
    H(5, 16, 6, 2, s.sash);
  } else if (dir === 'up') {
    H(4, 12, 8, 7, s.robe); H(4, 12, 1, 6, s.robeLight); H(11, 13, 1, 5, s.robeDark);
    H(4, 16, 8, 2, s.sash);
    H(7, 16, 2, 3, s.trim); // sash bow at the back
  } else {
    H(4, 12, 8, 7, s.robe); H(4, 12, 1, 6, s.robeLight); H(11, 13, 1, 5, s.robeDark);
    H(4, 16, 8, 2, s.sash);
    // crossed collar (hanfu style)
    px(ctx, 6, 12 + bob, s.trim); px(ctx, 7, 13 + bob, s.trim); px(ctx, 8, 14 + bob, s.trim); px(ctx, 9, 15 + bob, s.trim);
    px(ctx, 9, 12 + bob, s.trim); px(ctx, 8, 13 + bob, s.trim);
    px(ctx, 7, 12 + bob, SKIN_SHADE); px(ctx, 8, 12 + bob, SKIN_SHADE);
    // guard armour plates
    if (s.accessory === 'helmet') { H(5, 13, 6, 1, s.robeLight); H(5, 15, 6, 1, s.robeDark); }
  }

  // ----- arms (wide sleeves) -----
  const swing = walking ? (stepA ? 1 : -1) : 0;
  if (dir === 'left') {
    const ax = 6 + (walking ? (stepA ? -1 : 1) : 0);
    H(ax, 13, 4, 5, s.robeLight); H(ax, 17, 4, 1, s.robeDark);
    H(ax + 1, 18, 2, 2, SKIN);
  } else {
    H(2, 13 + swing, 3, 5, s.robeLight); H(2, 17 + swing, 3, 1, s.robeDark); H(3, 18 + swing, 2, 2, SKIN);
    H(11, 13 - swing, 3, 5, s.robe); H(11, 17 - swing, 3, 1, s.robeDark); H(11, 18 - swing, 2, 2, SKIN);
  }

  // ----- head -----
  drawHead(ctx, s, dir, bob);
}

function drawHead(ctx, s, dir, bob) {
  const H = (x, y, w, h, c) => rect(ctx, x, y + bob, w, h, c);
  const P = (x, y, c) => px(ctx, x, y + bob, c);
  const bobStyle = s.style === 'bob';
  const shortStyle = s.style === 'short';

  if (dir === 'down') {
    H(5, 5, 6, 6, SKIN);                                   // face
    H(6, 11, 4, 1, SKIN_SHADE);                            // neck
    // hair cap + fringe
    H(5, 1, 6, 1, s.hair); H(4, 2, 8, 1, s.hair); H(3, 3, 10, 3, s.hair);
    H(4, 2, 3, 1, s.hairLight); H(5, 3, 2, 1, s.hairLight);
    H(4, 6, 3, 1, s.hair); H(9, 6, 3, 1, s.hair);
    if (shortStyle) { H(3, 6, 1, 2, s.hair); H(12, 6, 1, 2, s.hair); H(5, 6, 1, 1, s.hair); H(10, 6, 1, 1, s.hair); }
    else { H(3, 6, 2, bobStyle ? 6 : 9, s.hair); H(11, 6, 2, bobStyle ? 6 : 9, s.hair); }
    if (bobStyle) { H(4, 12, 2, 1, s.hairShadow); H(10, 12, 2, 1, s.hairShadow); }
    // eyes, blush
    H(6, 8, 1, 2, s.eye); H(9, 8, 1, 2, s.eye);
    P(6, 8, '#ffffff'); P(9, 8, '#ffffff');
    P(6, 9, s.eye); P(9, 9, s.eye);
    P(5, 10, '#f0a0a0'); P(10, 10, '#f0a0a0');
    if (s.freckles) { P(5, 9, '#c9865e'); P(10, 9, '#c9865e'); P(7, 10, '#c9865e'); }
    P(7, 10, '#c98070'); P(8, 10, '#c98070');
  } else if (dir === 'up') {
    H(3, 2, 10, 9, s.hair); H(4, 1, 8, 1, s.hair); H(5, 0, 6, 1, s.hair);
    H(5, 3, 3, 1, s.hairLight); H(4, 4, 1, 3, s.hairLight); H(10, 5, 1, 4, s.hairShadow);
    if (bobStyle) { H(3, 11, 3, 1, s.hairShadow); H(10, 11, 3, 1, s.hairShadow); }
    if (!bobStyle && !shortStyle) H(6, 9, 4, 2, s.hairShadow);
    P(6, 10, SKIN_SHADE); P(9, 10, SKIN_SHADE);
  } else {
    // side view, facing left
    H(4, 5, 5, 6, SKIN);
    H(5, 11, 3, 1, SKIN_SHADE);                             // neck
    H(5, 1, 6, 1, s.hair); H(4, 2, 8, 1, s.hair); H(4, 3, 9, 3, s.hair);
    H(5, 2, 3, 1, s.hairLight); H(4, 3, 2, 1, s.hairLight);
    H(4, 5, 3, 1, s.hair);                                  // fringe
    H(9, 6, 4, bobStyle ? 6 : 4, s.hair);                   // hair behind ear
    H(11, 6, 1, 3, s.hairShadow);
    P(5, 8, s.eye); P(5, 9, s.eye); P(4, 10, '#f0a0a0'); P(4, 8, SKIN_SHADE);
    if (s.freckles) { P(6, 9, '#c9865e'); P(5, 10, '#c9865e'); }
    if (shortStyle) { H(9, 6, 3, 2, s.hair); }
  }

  drawAccessory(ctx, s, dir, bob);
}

function drawAccessory(ctx, s, dir, bob) {
  const H = (x, y, w, h, c) => rect(ctx, x, y + bob, w, h, c);
  const P = (x, y, c) => px(ctx, x, y + bob, c);
  switch (s.accessory) {
    case 'ribbon': // Maomao's blue hair ornament
      if (dir === 'down') { H(3, 1, 3, 2, '#5b8fe0'); P(4, 0, '#8fb6f5'); P(2, 2, '#3f68b0'); P(6, 2, '#3f68b0'); }
      else if (dir === 'up') { H(9, 1, 3, 2, '#5b8fe0'); P(10, 0, '#8fb6f5'); }
      else { H(5, 0, 3, 2, '#5b8fe0'); P(6, 0, '#8fb6f5'); }
      break;
    case 'pin': // Jinshi's golden hairpin + topknot
      if (dir === 'down' || dir === 'up') { H(7, 0, 2, 2, s.hair); P(7, -1, s.hairLight); H(9, 1, 3, 1, '#f2d16a'); P(11, 2, '#f2d16a'); }
      else { H(8, 0, 2, 2, s.hair); H(5, 1, 4, 1, '#f2d16a'); }
      break;
    case 'helmet':
      if (dir === 'down' || dir === 'up') { H(3, 0, 10, 3, '#8b95a5'); H(4, 0, 4, 1, '#b5bfcc'); H(3, 3, 10, 1, '#5f6878'); P(7, -1, '#c8483b'); P(8, -1, '#c8483b'); P(7, -2, '#c8483b'); }
      else { H(4, 0, 9, 3, '#8b95a5'); H(4, 0, 4, 1, '#b5bfcc'); H(4, 3, 9, 1, '#5f6878'); P(8, -1, '#c8483b'); P(8, -2, '#c8483b'); }
      break;
    case 'cap': // merchant's round cap
      if (dir === 'down' || dir === 'up') { H(4, 0, 8, 3, '#b8382f'); H(4, 3, 8, 1, '#f0c95a'); H(5, 0, 3, 1, '#d9574a'); P(7, -1, '#f0c95a'); }
      else { H(4, 0, 8, 3, '#b8382f'); H(4, 3, 8, 1, '#f0c95a'); H(5, 0, 3, 1, '#d9574a'); }
      break;
    case 'straw': // gardener's wide straw hat
      H(1, 2, 14, 2, '#d8b56a'); H(4, 0, 8, 2, '#e8c97e'); H(1, 3, 14, 1, '#b8924a'); H(4, 1, 8, 1, '#f0d692');
      break;
    case 'scarf':
      H(3, 2, 10, 2, '#ffffff'); H(3, 4, 10, 1, '#dfe8f0'); if (dir === 'down') { P(12, 4, '#ffffff'); P(12, 5, '#dfe8f0'); }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------

/** Returns a 80x112 canvas containing the full 4x4 sprite sheet for one character. */
export function makeCharacterSheet(key) {
  const spec = CHARACTER_SPECS[key];
  const sheet = makeCanvas(CELL_W * 4, CELL_H * 4);
  const sctx = sheet.getContext('2d');

  const body = makeCanvas(16, 26);
  const cell = makeCanvas(CELL_W, CELL_H);
  DIRS.forEach((dir, row) => {
    for (let frame = 0; frame < 4; frame++) {
      const bctx = body.getContext('2d');
      bctx.clearRect(0, 0, 16, 26);
      bctx.translate(0, 2); // room for hats / plumes above the head
      drawBody(bctx, spec, dir === 'right' ? 'left' : dir, frame);
      bctx.setTransform(1, 0, 0, 1, 0, 0);

      const cctx = cell.getContext('2d');
      cctx.clearRect(0, 0, CELL_W, CELL_H);
      cctx.save();
      if (dir === 'right') {
        cctx.translate(2 + 16, 0);
        cctx.scale(-1, 1);
        cctx.drawImage(body, 0, 0);
      } else {
        cctx.drawImage(body, 2, 0);
      }
      cctx.restore();
      outline(cell);
      sctx.drawImage(cell, frame * CELL_W, row * CELL_H);
    }
  });
  return sheet;
}

/** Small oval shadow that sits under every character. */
export function makeShadow() {
  const c = makeCanvas(16, 6);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(30,20,40,0.28)';
  ctx.fillRect(3, 0, 10, 1);
  ctx.fillRect(1, 1, 14, 4);
  ctx.fillRect(3, 5, 10, 1);
  return c;
}
