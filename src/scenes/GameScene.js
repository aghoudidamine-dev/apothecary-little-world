import Phaser from 'phaser';
import { TILE, W, H, SPAWNS } from '../world/mapData.js';
import { moveWithCollision } from '../world/collision.js';
import { NPC_DIALOGUE } from '../world/npcs.js';
import { Character } from '../entities/Character.js';
import { makeLabel } from '../art/environment.js';
import { hud } from '../ui/hud.js';
import { dialogue } from '../ui/dialogue.js';
import { chat } from '../ui/chat.js';

const SPEED = 72;            // px per second (16px tiles)
const INTERACT_DIST = 26;    // how close you must be to an NPC to talk
const SEND_EVERY_MS = 50;    // max 20 position updates / second
const HEARTBEAT_MS = 500;    // resend position at least this often
const CHARACTER_LABEL = { maomao: 'MAOMAO', jinshi: 'JINSHI' };

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

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
    const spawn = SPAWNS[session.character];
    this.me = new Character(this, session.character, spawn.x, spawn.y, CHARACTER_LABEL[session.character]);

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
    kb.on('keydown-E', once(() => this.tryTalk()));
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
    this.remotes = new Map();
    this.lastSent = { t: -1e9, x: NaN, y: NaN, dir: '', moving: null };
    this.nearNpc = null;

    hud.init({
      code: session.code,
      online: !!session.net,
      onLeave: () => window.location.reload(),
    });
    hud.prompt('');
    if (session.net) this.setupNetwork(session);
  }

  // ------------------------------------------------------------------ network
  setupNetwork(session) {
    const net = session.net;
    for (const p of session.peers || []) this.addRemote(p);
    this.refreshPlayerCount();

    net.on('peer-joined', (m) => { this.addRemote(m.peer); this.refreshPlayerCount(); })
      .on('peer-left', (m) => { this.removeRemote(m.id); this.refreshPlayerCount(); })
      .on('state', (m) => this.onRemoteState(m))
      .on('chat', (m) => this.onRemoteChat(m))
      .on('close', () => hud.notice('Connection lost. Leave and rejoin the room to keep playing together.'));
    this.sendState(0, true);
  }

  addRemote(p) {
    if (this.remotes.has(p.id)) return;
    const c = new Character(this, p.character, 0, 0, CHARACTER_LABEL[p.character] || 'PLAYER');
    const known = Number.isFinite(p.x) && Number.isFinite(p.y);
    if (known) { c.setPosition(p.x, p.y); c.setState(p.dir || 'down', false); }
    c.setVisible(known);
    this.remotes.set(p.id, { char: c, tx: p.x, ty: p.y, dir: p.dir || 'down', moving: !!p.moving, known });
  }

  removeRemote(id) {
    const r = this.remotes.get(id);
    if (!r) return;
    r.char.destroy();
    this.remotes.delete(id);
  }

  onRemoteState(m) {
    let r = this.remotes.get(m.id);
    if (!r) { this.addRemote({ id: m.id, character: 'maomao' }); r = this.remotes.get(m.id); } // should not happen
    if (!Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    if (!r.known) {
      r.known = true;
      r.char.setPosition(m.x, m.y);
      r.char.setVisible(true);
    }
    r.tx = m.x; r.ty = m.y; r.moving = !!m.moving;
    r.dir = m.dir;
  }

  refreshPlayerCount() { hud.setPlayers(1 + this.remotes.size); }

  openChat() {
    this.input.keyboard.enabled = false; // let the native <input> receive every keystroke
    chat.open();
  }

  onRemoteChat(m) {
    const r = this.remotes.get(m.id);
    const label = (r && CHARACTER_LABEL[r.char.key]) || 'PLAYER';
    if (r) r.char.showChat(m.text);
    chat.addLine(label, m.text);
  }

  sendState(now, force = false) {
    const net = this.session.net;
    if (!net || !net.open) return;
    const me = this.me, last = this.lastSent;
    const x = Math.round(me.x * 10) / 10, y = Math.round(me.y * 10) / 10;
    const changed = x !== last.x || y !== last.y || me.dir !== last.dir || me.moving !== last.moving;
    const due = now - last.t;
    if (!force && !((changed && due >= SEND_EVERY_MS) || due >= HEARTBEAT_MS)) return;
    net.sendState({ x, y, dir: me.dir, moving: me.moving });
    this.lastSent = { t: now, x, y, dir: me.dir, moving: me.moving };
  }

  tryTalk() {
    const near = this.nearNpc, me = this.me;
    if (!near || dialogue.isOpen || chat.isOpen) return;
    const dx = me.x - near.char.x, dy = me.y - near.char.y;
    near.char.setState(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'), false);
    me.setState(me.dir, false);
    hud.prompt('');
    dialogue.open(near.name, near.id, near.lines);
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
    hud.prompt(near && !dialogue.isOpen && !chat.isOpen ? 'E - Talk' : '');

    // other player(s): smooth toward the latest network position
    const k = 1 - Math.exp(-dt * 14);
    for (const r of this.remotes.values()) {
      if (!r.known) continue;
      const c = r.char;
      const dx = r.tx - c.x, dy = r.ty - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 96) c.setPosition(r.tx, r.ty);
      else c.setPosition(c.x + dx * k, c.y + dy * k);
      c.setState(r.dir || c.dir, r.moving || dist > 1.2);
    }

    this.sendState(time);
  }
}
