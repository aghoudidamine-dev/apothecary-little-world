// Tiny canvas helpers. All art in this prototype is drawn in code (no image files),
// so there are no external or copyrighted assets.
let factory = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  // the outline pass reads pixels back a lot; tell the browser so it stays on the CPU
  const get = c.getContext.bind(c);
  c.getContext = (type, opts) => get(type, { willReadFrequently: true, ...opts });
  return c;
};
export const setCanvasFactory = (f) => { factory = f; };
export const makeCanvas = (w, h) => factory(w, h);

export const rect = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};
export const px = (ctx, x, y, color) => rect(ctx, x, y, 1, 1, color);

/** Filled pixel disc (no anti-aliasing). */
export function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r + r * 0.6 - y * y));
    if (half >= 0) ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Filled pixel ellipse. */
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.5))) + 0.5);
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Deterministic random numbers so art looks identical on every machine. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add a 1px dark outline around every opaque pixel (classic pixel-art look). */
export function outline(canvas, color = [43, 30, 46]) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  out.data.set(src.data);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src.data[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) > 128 || a(x + 1, y) > 128 || a(x, y - 1) > 128 || a(x, y + 1) > 128) {
        const i = (y * w + x) * 4;
        out.data[i] = color[0];
        out.data[i + 1] = color[1];
        out.data[i + 2] = color[2];
        out.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
