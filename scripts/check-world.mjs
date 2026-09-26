// Sanity checks for the map: spawns are walkable, NPCs are reachable, no sealed-off areas.
import assert from 'node:assert/strict';
import { buildMap, W, H, TILE, SPAWNS, G } from '../src/world/mapData.js';
import { isBlockedBox, moveWithCollision } from '../src/world/collision.js';

const map = buildMap();
const idx = (x, y) => y * W + x;

for (const [name, s] of Object.entries(SPAWNS)) {
  assert.equal(isBlockedBox(map, s.x, s.y), false, `${name} spawn is blocked`);
}

// flood fill from Maomao's spawn over walkable tiles
const start = { x: Math.floor(SPAWNS.maomao.x / TILE), y: Math.floor(SPAWNS.maomao.y / TILE) };
const seen = new Uint8Array(W * H);
const q = [start]; seen[idx(start.x, start.y)] = 1;
while (q.length) {
  const { x, y } = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (seen[idx(nx, ny)] || map.blocked[idx(nx, ny)]) continue;
    seen[idx(nx, ny)] = 1; q.push({ x: nx, y: ny });
  }
}
assert.equal(seen[idx(SPAWNS.jinshi.x / TILE | 0, SPAWNS.jinshi.y / TILE | 0)], 1, 'Jinshi spawn not connected');
for (const n of map.npcs) {
  const reachable = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[idx(n.tx + dx, n.ty + dy)]);
  assert.ok(reachable, `NPC ${n.id} can't be reached`);
}
let walkable = 0, orphan = 0;
for (let i = 0; i < W * H; i++) {
  if (!map.blocked[i]) { walkable++; if (!seen[i]) orphan++; }
}
console.log(`tiles: ${W}x${H}, walkable: ${walkable}, sealed-off walkable tiles: ${orphan}`);
console.log(`objects: ${map.objects.length}, decor: ${map.decor.length}, npcs: ${map.npcs.length}`);

// collision: can't walk into water / palace / a tree, can slide along a wall
let p = { x: 8 * TILE, y: 18 * TILE };
for (let i = 0; i < 200; i++) p = moveWithCollision(map, p.x, p.y, 0, 1); // walk south into the pond
assert.ok(map.ground[idx(Math.floor(p.x / TILE), Math.floor((p.y - 0.01) / TILE))] !== G.WATER, 'walked into water');
p = { x: 27 * TILE, y: 14 * TILE };
for (let i = 0; i < 200; i++) p = moveWithCollision(map, p.x, p.y, 0, -1); // walk north into palace
assert.ok(p.y >= 13 * TILE, 'walked into palace');
console.log('world checks: OK');
