import { isBlockedBox } from '../world/collision.js';
import { CHARACTER_LABEL, OTHER_CHARACTER } from './areaSync.js';
import { makeHugPair, makeBedHug } from '../art/hugArt.js';
import { BED_RECT } from '../world/homeMap.js';

const HUG_DIST = 30;     // how close you must be to ask for a hug
const ASK_RANGE = 60;    // a request is ignored if the other player is farther than this
const BREAK_DIST = 38;   // drift this far apart and the hug lets go
const ASK_TIMEOUT = 15000;
const SIDE = { maomao: -1, jinshi: 1 }; // Maomao stands on the left, Jinshi on the right

/**
 * A mutual hug. One player asks (H), the other answers Y or N; on yes both step together
 * facing each other with hearts. Walking away (or drifting apart) lets go for both of you.
 * Works in any scene that has `scene.me`, `scene.map` and an AreaSync.
 */
export class HugController {
  constructor(scene, session, areaSync, hud, isBusy = () => false) {
    this.scene = scene; this.session = session; this.areaSync = areaSync; this.hud = hud; this.isBusy = isBusy;
    this.state = 'idle'; // idle | asking | asked | hugging
    this.partnerId = null;
    this.timer = null;
    this.image = null;
    this.mode = 'stand';
  }

  /** Two standing players can hug; so can two players sleeping side by side in bed. */
  pairOk(a, b) { return (a === 'stand' && b === 'stand') || (a === 'sleep' && b === 'sleep'); }

  get hugging() { return this.state === 'hugging'; }
  name() {
    const l = CHARACTER_LABEL[OTHER_CHARACTER[this.session.character]] || 'Your partner';
    return l.charAt(0) + l.slice(1).toLowerCase();
  }
  net() { return this.session.net; }
  send(action) { if (this.net()) this.net().send({ t: 'hug', action }); }
  setState(state, id = null) {
    this.state = state; this.partnerId = id;
    clearTimeout(this.timer);
    if (state === 'asking' || state === 'asked') this.timer = setTimeout(() => this.timeout(), ASK_TIMEOUT);
  }
  timeout() {
    if (this.state === 'asked') this.send('no');
    this.setState('idle'); this.hud.toast('');
  }

  /** The standing partner close enough to hug, as [id, remote] (or null). */
  findPartner() {
    const me = this.scene.me;
    if (!this.net()) return null;
    for (const [id, r] of this.areaSync.remotes) {
      if (!r.known || !this.pairOk(me.pose, r.pose)) continue;
      if (Math.hypot(r.char.x - me.x, r.char.y - me.y) < HUG_DIST) return [id, r];
    }
    return null;
  }

  ask(partner) {
    if (this.state !== 'idle' || !partner || this.isBusy()) return;
    this.setState('asking', partner[0]);
    this.send('ask');
    this.hud.toast(`Asking ${this.name()} for a hug...`);
  }

  respond(yes) {
    if (this.state !== 'asked') return;
    const id = this.partnerId;
    this.send(yes ? 'yes' : 'no');
    if (yes) this.start(id); else { this.setState('idle'); this.hud.toast(''); }
  }

  onNet(m) {
    const remote = this.areaSync.remotes.get(m.id);
    if (m.action === 'ask') {
      const near = remote && remote.known && Math.hypot(remote.char.x - this.scene.me.x, remote.char.y - this.scene.me.y) < ASK_RANGE;
      if (this.state === 'asking' && near) { this.send('yes'); this.start(m.id); return; } // both asked: that's a yes
      if (this.state !== 'idle' || this.isBusy() || !near || !this.pairOk(this.scene.me.pose, remote.pose)) { this.send('no'); return; }
      this.setState('asked', m.id);
      this.hud.toast(`${this.name()} wants a hug!   Y = yes   N = no`);
    } else if (m.action === 'yes' && this.state === 'asking') {
      this.start(m.id);
    } else if (m.action === 'no' && this.state === 'asking') {
      this.setState('idle'); this.hud.toast(`${this.name()} isn't ready for a hug`);
      setTimeout(() => { if (this.state === 'idle') this.hud.toast(''); }, 2000);
    } else if (m.action === 'end' && this.state === 'hugging') {
      this.stop(false);
    }
  }

  start(id) {
    const me = this.scene.me, r = this.areaSync.remotes.get(id);
    if (!r || !r.known || !this.pairOk(me.pose, r.pose) || Math.hypot(r.char.x - me.x, r.char.y - me.y) > ASK_RANGE) {
      this.send('end'); this.setState('idle'); this.hud.toast(''); return;
    }
    const sc = this.scene, side = SIDE[this.session.character] || 0;
    this.mode = me.pose === 'sleep' ? 'bed' : 'stand';
    const maomao = this.session.character === 'maomao';
    const kl = maomao ? me.key : r.char.key, kr = maomao ? r.char.key : me.key;
    const texKey = `hug_${this.mode}_${kl}_${kr}`;
    if (!sc.textures.exists(texKey)) sc.textures.addCanvas(texKey, (this.mode === 'bed' ? makeBedHug : makeHugPair)(kl, kr));
    if (this.mode === 'stand') {
      const mx = (me.x + r.char.x) / 2, my = (me.y + r.char.y) / 2;
      const tx = mx + side * 5;
      if (!isBlockedBox(sc.map, tx, my)) me.setPosition(tx, my);
      me.setState(side < 0 ? 'right' : 'left', false);
      this.image = sc.add.image(mx, my, texKey).setOrigin(0.5, 26 / 28).setDepth(my + 0.5);
    } else { // cuddling in bed: the picture replaces both heads on the pillows
      this.image = sc.add.image(BED_RECT.x + BED_RECT.w / 2, 25, texKey).setOrigin(0.5, 0).setDepth(65.5);
    }
    this.setState('hugging', id);
    me.setHidden(true); r.char.setHidden(true);
    me.setHugging(true); r.char.setHugging(true);
    this.hud.toast(this.mode === 'bed' ? `Cuddling with ${this.name()}` : `Hugging ${this.name()}  -  walk away to let go`);
  }

  stop(tell = true) {
    const r = this.areaSync.remotes.get(this.partnerId);
    if (this.image) { this.image.destroy(); this.image = null; }
    this.scene.me.setHidden(false); this.scene.me.setHugging(false);
    if (r) { r.char.setHidden(false); r.char.setHugging(false); }
    if (tell) this.send('end');
    this.setState('idle');
    this.hud.toast('');
  }

  /** Call every frame with whether the player is pressing a movement key. */
  update(wantsToMove) {
    if (this.state !== 'hugging') return;
    const me = this.scene.me, r = this.areaSync.remotes.get(this.partnerId);
    if (this.mode === 'stand' && wantsToMove || !r || Math.hypot(r.char.x - me.x, r.char.y - me.y) > BREAK_DIST) this.stop(true);
  }
}
