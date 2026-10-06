import Phaser from 'phaser';
import { buildInteriorMap } from '../world/interiorMap.js';
import { moveWithCollision } from '../world/collision.js';
import { Character } from '../entities/Character.js';
import { bakeInteriorGround, buildObjectSprites, packAtlas, makeLabel } from '../art/environment.js';
import { hud } from '../ui/hud.js';
import { dialogue } from '../ui/dialogue.js';
import { chat } from '../ui/chat.js';
import { AreaSync, CHARACTER_LABEL } from '../multiplayer/areaSync.js';

const SPEED = 72;

/**
 * The palace hall. Empty for now (no residents) — just a big space to walk around
 * in together. Fully synced with the other player while you're both inside, via
 * AreaSync (see ../multiplayer/areaSync.js), exactly like the outdoor map.
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

    this.me = new Character(this, session.character, map.spawn.x, map.spawn.y, CHARACTER_LABEL[session.character]);
    this.me.setState('up', false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.W * 16, map.H * 16);
    cam.startFollow(this.me.sprite, true, 1, 1);

    const kb = this.input.keyboard;
    this.keys = kb.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT' });
    const once = (fn) => (e) => { if (!e || !e.repeat) fn(); };
    kb.on('keydown-E', once(() => this.tryInteract()));
    kb.on('keydown-ENTER', once(() => {
      if (!chat.isOpen && session.net) this.openChat();
    }));
    kb.on('keydown-ESC', once(() => { if (dialogue.isOpen) dialogue.close(); }));

    chat.onSubmit = (text) => {
      this.me.showChat(text);
      chat.addLine(CHARACTER_LABEL[session.character], text);
      if (session.net) session.net.send({ t: 'chat', text });
    };
    chat.onClose = () => { this.input.keyboard.enabled = true; };

    hud.init({ code: session.code, online: !!session.net, onLeave: () => window.location.reload() });
    hud.prompt('');
    this.areaSync = new AreaSync(this, session, 'palace', {
      onPlayerCount: (n) => hud.setPlayers(n),
      onChat: (label, text) => chat.addLine(label, text),
    });
    if (session.net) {
      session.net.on('close', () => hud.notice('Connection lost. Leave and rejoin the room to keep playing together.'));
    }
  }

  openChat() {
    this.input.keyboard.enabled = false;
    chat.open();
  }

  tryInteract() {
    if (dialogue.isOpen || chat.isOpen) return;
    if (this.nearDoor) this.leave();
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

    const doorDist = Math.hypot(this.map.door.x - me.x, this.map.door.y - me.y);
    this.nearDoor = doorDist < 28;

    if (dialogue.isOpen || chat.isOpen) hud.prompt('');
    else if (this.nearDoor) hud.prompt('E - Leave');
    else hud.prompt('');

    this.areaSync.step(dt);
    this.areaSync.sendState(time);
  }
}
