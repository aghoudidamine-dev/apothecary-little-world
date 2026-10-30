import Phaser from 'phaser';
import { buildHomeMap, WARDROBE_SPOT } from '../world/homeMap.js';
import { moveWithCollision } from '../world/collision.js';
import { Character } from '../entities/Character.js';
import { buildObjectSprites, packAtlas, makeLabel } from '../art/environment.js';
import { buildHomeSprites, bakeHomeGround } from '../art/homeArt.js';
import { OUTFITS, outfitKey } from '../art/characters.js';
import { playGiftToss, facingToward } from '../entities/gifts.js';
import { hud } from '../ui/hud.js';
import { dialogue } from '../ui/dialogue.js';
import { chat } from '../ui/chat.js';
import { AreaSync, CHARACTER_LABEL } from '../multiplayer/areaSync.js';

const SPEED = 72;
const WARDROBE_DIST = 26;
const GIFT_DIST = 28;

/**
 * The cozy house the two players share. Fully synced online (AreaSync, area 'home').
 * The wardrobe lives here: press E beside it to cycle through your 3 outfits.
 */
export class HomeInterior extends Phaser.Scene {
  constructor() { super('Home'); }

  init(data) { this.returnSpawn = data?.returnSpawn || null; }

  getLabelTexture(text) {
    const key = 'label_' + text;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, makeLabel(text));
    return key;
  }

  create() {
    const session = this.registry.get('session');
    this.session = session;
    const map = buildHomeMap();
    this.map = map;

    if (!this.textures.exists('home_ground')) this.textures.addCanvas('home_ground', bakeHomeGround(map));
    if (!this.textures.exists('home_objects')) {
      const base = buildObjectSprites();
      const atlas = packAtlas({ ...buildHomeSprites(), wardrobe: base.wardrobe, lantern: base.lantern });
      const t = this.textures.addCanvas('home_objects', atlas.canvas);
      for (const [name, f] of Object.entries(atlas.frames)) t.add(name, 0, f.x, f.y, f.w, f.h);
    }
    this.add.image(0, 0, 'home_ground').setOrigin(0, 0).setDepth(-10);
    for (const o of map.objects) {
      const bottom = (o.ty + o.h) * 16;
      this.add.image((o.tx + o.w / 2) * 16, bottom, 'home_objects', o.frame).setOrigin(0.5, 1).setDepth(bottom);
    }

    this.me = new Character(this, session.character, map.spawn.x, map.spawn.y, CHARACTER_LABEL[session.character]);
    this.me.setState('up', false);
    this.me.setOutfit(outfitKey(session.character, session.outfitIndex || 0));

    // the room is nearly screen-sized: centre it instead of pinning it to a corner
    const mw = map.W * 16, mh = map.H * 16, vw = 480, vh = 270;
    const cam = this.cameras.main;
    cam.setBounds(mw < vw ? -(vw - mw) / 2 : 0, mh < vh ? -(vh - mh) / 2 : 0, Math.max(mw, vw), Math.max(mh, vh));
    cam.startFollow(this.me.sprite, true, 1, 1);

    const kb = this.input.keyboard;
    this.keys = kb.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', left: 'LEFT', down: 'DOWN', right: 'RIGHT' });
    const once = (fn) => (e) => { if (!e || !e.repeat) fn(); };
    kb.on('keydown-E', once(() => this.tryInteract()));
    kb.on('keydown-ENTER', once(() => { if (!chat.isOpen && session.net) this.openChat(); }));

    chat.onSubmit = (text) => {
      this.me.showChat(text);
      chat.addLine(CHARACTER_LABEL[session.character], text);
      if (session.net) session.net.send({ t: 'chat', text });
    };
    chat.onClose = () => { this.input.keyboard.enabled = true; };

    hud.init({ code: session.code, online: !!session.net, onLeave: () => window.location.reload() });
    hud.prompt('');
    this.areaSync = new AreaSync(this, session, 'home', {
      onPlayerCount: (n) => hud.setPlayers(n),
      onChat: (label, text) => chat.addLine(label, text),
    });
    if (session.net) {
      session.net.on('gift', (m) => this.onRemoteGift(m));
      session.net.on('close', () => hud.notice('Connection lost. Leave and rejoin the room to keep playing together.'));
    }
  }

  openChat() { this.input.keyboard.enabled = false; chat.open(); }

  onRemoteGift(m) {
    if (m.kind !== 'flower') return;
    const giver = this.areaSync.remotes.get(m.id);
    if (!giver || !giver.known) { this.me.showGift('flower'); return; }
    this.me.setState(facingToward(this.me, giver.char), false);
    playGiftToss(this, giver.char, this.me, 'flower');
  }

  tryInteract() {
    if (dialogue.isOpen || chat.isOpen) return;
    if (this.nearDoor) return this.scene.start('Game', { returnSpawn: this.returnSpawn });
    if (this.nearWardrobe) return this.changeOutfit();
    if (this.nearPartner) {
      this.me.setState(facingToward(this.me, this.nearPartner.char), false);
      playGiftToss(this, this.me, this.nearPartner.char, 'flower');
      if (this.session.net) this.session.net.send({ t: 'gift', kind: 'flower' });
    }
  }

  changeOutfit() {
    const s = this.session;
    s.outfitIndex = ((s.outfitIndex || 0) + 1) % OUTFITS[s.character].length;
    this.me.setOutfit(outfitKey(s.character, s.outfitIndex));
    hud.notice('Now wearing: ' + OUTFITS[s.character][s.outfitIndex].name);
    setTimeout(() => hud.notice(''), 1800);
    if (s.net) s.net.send({ t: 'outfit', index: s.outfitIndex });
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

    this.nearDoor = Math.hypot(this.map.door.x - me.x, this.map.door.y - me.y) < 28;
    this.nearWardrobe = !this.nearDoor && Math.hypot(WARDROBE_SPOT.x - me.x, WARDROBE_SPOT.y - me.y) < WARDROBE_DIST;
    this.nearPartner = null;
    if (!this.nearDoor && !this.nearWardrobe && this.session.character === 'jinshi') {
      let best = GIFT_DIST;
      for (const r of this.areaSync.remotes.values()) {
        if (!r.known) continue;
        const d = Math.hypot(r.char.x - me.x, r.char.y - me.y);
        if (d < best) { best = d; this.nearPartner = r; }
      }
    }

    if (dialogue.isOpen || chat.isOpen) hud.prompt('');
    else if (this.nearDoor) hud.prompt('E - Leave');
    else if (this.nearWardrobe) hud.prompt('E - Change Outfit');
    else if (this.nearPartner) hud.prompt('E - Give Flower');
    else hud.prompt('');

    this.areaSync.step(dt);
    this.areaSync.sendState(time);
  }
}
