import Phaser from 'phaser';
import { buildInteriorMap } from '../world/interiorMap.js';
import { moveWithCollision } from '../world/collision.js';
import { INTERIOR_DIALOGUE } from '../world/interiorNpcs.js';
import { Character } from '../entities/Character.js';
import { bakeInteriorGround, buildObjectSprites, packAtlas, makeLabel } from '../art/environment.js';
import { hud } from '../ui/hud.js';
import { dialogue } from '../ui/dialogue.js';
import { chat } from '../ui/chat.js';

const SPEED = 64;
const INTERACT_DIST = 24;

/**
 * Single-player sightseeing room: whichever player walks in sees the same fixed
 * residents and can look around and talk to them. It intentionally doesn't sync
 * with the other player online — see the note above tryEnter() in GameScene.js.
 */
export class PalaceInterior extends Phaser.Scene {
  constructor() { super('Palace'); }

  init(data) { this.returnSpawn = data?.returnSpawn || null; }

  getLabelTexture(text) {
    const key = 'label_' + text;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, makeLabel(text));
    return key;
  }

  create() {
    const session = this.registry.get('session');
    this.session = session;

    const map = buildInteriorMap();
    this.map = map;

    if (!this.textures.exists('interior_ground')) this.textures.addCanvas('interior_ground', bakeInteriorGround(map));
    if (!this.textures.exists('interior_objects')) {
      const atlas = packAtlas(buildObjectSprites());
      const t = this.textures.addCanvas('interior_objects', atlas.canvas);
      for (const [name, f] of Object.entries(atlas.frames)) t.add(name, 0, f.x, f.y, f.w, f.h);
    }

    this.add.image(0, 0, 'interior_ground').setOrigin(0, 0).setDepth(-10);
    for (const o of map.objects) {
      const bottom = (o.ty + o.h) * 16;
      this.add.image((o.tx + o.w / 2) * 16, bottom, 'interior_objects', o.frame).setOrigin(0.5, 1).setDepth(bottom);
    }

    this.residents = map.npcs.map((n) => {
      const c = new Character(this, n.id, n.tx * 16 + 8, n.ty * 16 + 14, n.name);
      c.setState(n.dir, false);
      return { ...n, lines: INTERIOR_DIALOGUE[n.id], char: c };
    });

    this.me = new Character(this, session.character, map.spawn.x, map.spawn.y, session.character.toUpperCase());
    this.me.setState('up', false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.W * 16, map.H * 16);
    cam.startFollow(this.me.sprite, true, 1, 1);

    const kb = this.input.keyboard;
    this.keys = kb.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT' });
    const once = (fn) => (e) => { if (!e || !e.repeat) fn(); };
    kb.on('keydown-E', once(() => this.tryInteract()));
    kb.on('keydown-SPACE', once(() => { if (dialogue.isOpen) dialogue.advance(); }));
    kb.on('keydown-ENTER', once(() => { if (dialogue.isOpen) dialogue.advance(); }));
    kb.on('keydown-ESC', once(() => { if (dialogue.isOpen) dialogue.close(); }));

    // Chat and further network events are ignored while inside (see class doc above);
    // GameScene re-attaches its own handlers as soon as the player steps back outside.
    if (session.net) {
      session.net.on('peer-joined', () => {}).on('peer-left', () => {}).on('state', () => {}).on('chat', () => {}).on('gift', () => {});
    }

    hud.init({ code: session.code, online: !!session.net, onLeave: () => window.location.reload() });
    if (session.net) hud.setPlayers(1); // the other player's status will refresh once you step back outside
    hud.prompt('');
    this.near = null;
  }

  tryInteract() {
    if (dialogue.isOpen || chat.isOpen) return;
    if (this.nearDoor) return this.leave();
    if (this.near) {
      const dx = this.me.x - this.near.char.x, dy = this.me.y - this.near.char.y;
      this.near.char.setState(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'), false);
      this.me.setState(this.me.dir, false);
      hud.prompt('');
      dialogue.open(this.near.name, this.near.id, this.near.lines);
    }
  }

  leave() {
    this.scene.start('Game', { returnSpawn: this.returnSpawn });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const K = this.keys;

    let ix = 0, iy = 0;
    if (!dialogue.isOpen && !chat.isOpen) {
      if (K.a.isDown || K.left.isDown) ix -= 1;
      if (K.d.isDown || K.right.isDown) ix += 1;
      if (K.w.isDown || K.up.isDown) iy -= 1;
      if (K.s.isDown || K.down.isDown) iy += 1;
    }
    const me = this.me;
    let dir = me.dir, moved = false;
    if (ix || iy) {
      const horiz = ix < 0 ? 'left' : 'right', vert = iy < 0 ? 'up' : 'down';
      if (ix && !iy) dir = horiz; else if (iy && !ix) dir = vert; else if (dir !== horiz && dir !== vert) dir = horiz;
      const len = Math.hypot(ix, iy);
      const next = moveWithCollision(this.map, me.x, me.y, (ix / len) * SPEED * dt, (iy / len) * SPEED * dt);
      moved = next.x !== me.x || next.y !== me.y;
      me.setPosition(next.x, next.y);
    }
    me.setState(dir, moved);

    let near = null, best = INTERACT_DIST;
    for (const r of this.residents) {
      const d = Math.hypot(r.char.x - me.x, r.char.y - me.y);
      if (d < best) { best = d; near = r; }
    }
    this.near = near;
    const doorDist = Math.hypot(this.map.door.x - me.x, this.map.door.y - me.y);
    this.nearDoor = !near && doorDist < 26;

    if (dialogue.isOpen || chat.isOpen) hud.prompt('');
    else if (near) hud.prompt('E - Talk');
    else if (this.nearDoor) hud.prompt('E - Leave');
    else hud.prompt('');
  }
}
