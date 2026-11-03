import { isBlockedBox } from '../world/collision.js';
import { CHARACTER_LABEL, OTHER_CHARACTER } from './areaSync.js';

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
  }

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
    if (!this.net() || me.pose !== 'stand') return null;
    for (const [id, r] of this.areaSync.remotes) {
      if (!r.known || r.pose !== 'stand') continue;
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
      if (this.state !== 'idle' || this.isBusy() || !near || this.scene.me.pose !== 'stand') { this.send('no'); return; }
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
    if (!r || !r.known || Math.hypot(r.char.x - me.x, r.char.y - me.y) > ASK_RANGE) { this.send('end'); this.setState('idle'); this.hud.toast(''); return; }
    const mx = (me.x + r.char.x) / 2, my = (me.y + r.char.y) / 2;
    const side = SIDE[this.session.character] || 0;
    const tx = mx + side * 5;
    if (!isBlockedBox(this.scene.map, tx, my)) me.setPosition(tx, my);
    me.setState(side < 0 ? 'right' : 'left', false);
    this.setState('hugging', id);
    me.setHugging(true); r.char.setHugging(true);
    this.hud.toast(`Hugging ${this.name()}  -  walk away to let go`);
  }

  stop(tell = true) {
    const r = this.areaSync.remotes.get(this.partnerId);
    this.scene.me.setHugging(false);
    if (r) r.char.setHugging(false);
    if (tell) this.send('end');
    this.setState('idle');
    this.hud.toast('');
  }

  /** Call every frame with whether the player is pressing a movement key. */
  update(wantsToMove) {
    if (this.state !== 'hugging') return;
    const me = this.scene.me, r = this.areaSync.remotes.get(this.partnerId);
    if (wantsToMove || !r || Math.hypot(r.char.x - me.x, r.char.y - me.y) > BREAK_DIST) this.stop(true);
  }
}
