import Phaser from 'phaser';
import { TILE, W, H, SPAWNS, PALACE_DOOR, PALACE_RETURN } from '../world/mapData.js';
import { moveWithCollision } from '../world/collision.js';
import { NPC_DIALOGUE } from '../world/npcs.js';
import { Character } from '../entities/Character.js';
import { makeLabel } from '../art/environment.js';
import { hud } from '../ui/hud.js';
import { dialogue } from '../ui/dialogue.js';
import { chat } from '../ui/chat.js';
import { playGiftToss } from '../entities/gifts.js';
import { AreaSync, CHARACTER_LABEL } from '../multiplayer/areaSync.js';

const SPEED = 72;            // px per second (16px tiles)
const INTERACT_DIST = 26;    // how close you must be to an NPC to talk
const DOOR_DIST = 24;        // how close you must be to the palace door to enter
const GIFT_DIST = 28;        // how close Jinshi must be to Maomao to offer a flower

/** Which way `a` should face to look at `b`. */
function facingToward(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.returnSpawn = data?.returnSpawn || null; }

  /** Cached pixel-font label textures. */
  getLabelTexture(text) {
    const key = 'label_' + text;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, makeLabel(text));
    return key;
  }

  create() {
    const session = this.registry.get('session');
    const map = this.registry.get('map');
    this.session = session;
    this.map = map;

    // ---- world -------------------------------------------------------------
    this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-10);
    for (const o of map.objects) {
      const bottom = (o.ty + o.h) * TILE;
      this.add.image((o.tx + o.w / 2) * TILE, bottom, 'objects', o.frame).setOrigin(0.5, 1).setDepth(bottom);
    }

    // ---- NPCs ----------------------------------------------------------------
    this.npcs = map.npcs.map((n) => ({
      ...n,
      lines: NPC_DIALOGUE[n.id],
      char: (() => {
        const c = new Character(this, n.id, n.tx * TILE + 8, n.ty * TILE + 14, n.name);
        c.setState(n.dir, false);
        return c;
      })(),
    }));

    // ---- me --------------------------------------------------------------------
    const spawn = this.returnSpawn || SPAWNS[session.character];
    this.me = new Character(this, session.character, spawn.x, spawn.y, CHARACTER_LABEL[session.character]);
    if (this.returnSpawn) this.me.setState('down', false);

    // ---- camera --------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W * TILE, H * TILE);
    cam.startFollow(this.me.sprite, true, 1, 1);

    // ---- input ---------------------------------------------------------------
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT',
      talk: 'E', space: 'SPACE', enter: 'ENTER', esc: 'ESC',
    });

    // Talk / dialogue keys are handled as events (not polled) so a very quick tap is never missed.
    const once = (fn) => (e) => { if (!e || !e.repeat) fn(); };
    kb.on('keydown-E', once(() => this.tryTalk() || this.tryEnterPalace() || this.tryGiveFlower()));
    kb.on('keydown-SPACE', once(() => { if (dialogue.isOpen) dialogue.advance(); }));
    kb.on('keydown-ENTER', once(() => {
      if (dialogue.isOpen) return dialogue.advance();
      if (!chat.isOpen && !dialogue.isOpen && session.net) this.openChat();
    }));
    kb.on('keydown-ESC', once(() => { if (dialogue.isOpen) dialogue.close(); }));

    chat.onSubmit = (text) => {
      this.me.showChat(text);
      chat.addLine(CHARACTER_LABEL[session.character], text);
      if (session.net) session.net.send({ t: 'chat', text });
    };
    chat.onClose = () => { this.input.keyboard.enabled = true; };

    // ---- multiplayer -----------------------------------------------------------
    this.nearNpc = null;

    hud.init({
      code: session.code,
      online: !!session.net,
      onLeave: () => window.location.reload(),
    });
    hud.prompt('');
    this.areaSync = new AreaSync(this, session, 'outside', {
      onPlayerCount: (n) => hud.setPlayers(n),
      onChat: (label, text) => chat.addLine(label, text),
    });
    if (session.net) {
      session.net.on('gift', (m) => this.onRemoteGift(m));
      session.net.on('close', () => hud.notice('Connection lost. Leave and rejoin the room to keep playing together.'));
    }
  }

  openChat() {
    this.input.keyboard.enabled = false; // let the native <input> receive every keystroke
    chat.open();
  }

  onRemoteGift(m) {
    if (m.kind !== 'flower') return;
    const giver = this.areaSync.remotes.get(m.id);
    if (!giver || !giver.known) { this.me.showGift('flower'); return; } // fallback: just show the reaction
    this.me.setState(facingToward(this.me, giver.char), false);
    playGiftToss(this, giver.char, this.me, 'flower');
  }

  tryTalk() {
    const near = this.nearNpc, me = this.me;
    if (!near || dialogue.isOpen || chat.isOpen) return false;
    const dx = me.x - near.char.x, dy = me.y - near.char.y;
    near.char.setState(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'), false);
    me.setState(me.dir, false);
    hud.prompt('');
    dialogue.open(near.name, near.id, near.lines);
    return true;
  }

  // Talking to an NPC, entering the palace, and giving a flower all share the E
  // key; each try*() runs in turn and only fires when nothing earlier was near.
  tryEnterPalace() {
    if (!this.nearDoor || dialogue.isOpen || chat.isOpen) return false;
    this.scene.start('Palace', { returnSpawn: PALACE_RETURN });
    return true;
  }

  tryGiveFlower() {
    if (!this.nearPartner || dialogue.isOpen || chat.isOpen) return false;
    this.me.setState(facingToward(this.me, this.nearPartner.char), false);
    playGiftToss(this, this.me, this.nearPartner.char, 'flower');
    if (this.session.net) this.session.net.send({ t: 'gift', kind: 'flower' });
    return true;
  }

  // -------------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const K = this.keys;

    // movement
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
      if (ix && !iy) dir = horiz;
      else if (iy && !ix) dir = vert;
      else if (dir !== horiz && dir !== vert) dir = horiz;
      const len = Math.hypot(ix, iy);
      const next = moveWithCollision(this.map, me.x, me.y, (ix / len) * SPEED * dt, (iy / len) * SPEED * dt);
      moved = next.x !== me.x || next.y !== me.y;
      me.setPosition(next.x, next.y);
    }
    me.setState(dir, moved);

    // NPC proximity + talking
    let near = null, best = INTERACT_DIST;
    for (const n of this.npcs) {
      const d = Math.hypot(n.char.x - me.x, n.char.y - me.y);
      if (d < best) { best = d; near = n; }
    }
    this.nearNpc = near;
    this.nearDoor = !near && Math.hypot(PALACE_DOOR.x - me.x, PALACE_DOOR.y - me.y) < DOOR_DIST;

    // Jinshi, near Maomao's player: offer to give a flower
    this.nearPartner = null;
    if (!near && !this.nearDoor && this.session.character === 'jinshi') {
      let gbest = GIFT_DIST;
      for (const r of this.areaSync.remotes.values()) {
        if (!r.known) continue;
        const d = Math.hypot(r.char.x - me.x, r.char.y - me.y);
        if (d < gbest) { gbest = d; this.nearPartner = r; }
      }
    }

    if (dialogue.isOpen || chat.isOpen) hud.prompt('');
    else if (near) hud.prompt('E - Talk');
    else if (this.nearDoor) hud.prompt('E - Enter');
    else if (this.nearPartner) hud.prompt('E - Give Flower');
    else hud.prompt('');

    this.areaSync.step(dt);
    this.areaSync.sendState(time);
  }
}
