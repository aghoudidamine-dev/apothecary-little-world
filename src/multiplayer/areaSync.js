import { Character } from '../entities/Character.js';

export const CHARACTER_LABEL = { maomao: 'MAOMAO', jinshi: 'JINSHI' };
// Only two character slots ever exist in a room, so the other player's character
// is always deducible from your own — handy for labeling their chat even when
// they're not currently visible to you (e.g. you're in different areas).
export const OTHER_CHARACTER = { maomao: 'jinshi', jinshi: 'maomao' };

const SEND_EVERY_MS = 50; // max 20 position updates / second
const HEARTBEAT_MS = 500; // resend position at least this often

/**
 * Keeps the other player in sync while `scene` is showing `area` ('outside' or
 * 'palace'). A peer only appears once their last known area matches yours, so
 * walking into or out of the palace naturally shows/hides them on both sides.
 */
export class AreaSync {
  constructor(scene, session, area, { onPlayerCount, onChat } = {}) {
    this.scene = scene;
    this.session = session;
    this.area = area;
    this.onPlayerCount = onPlayerCount || (() => {});
    this.onChat = onChat || (() => {});
    this.remotes = new Map();
    this.lastSent = { t: -1e9, x: NaN, y: NaN, dir: '', moving: null };
    if (!session.net) return;

    const net = session.net;
    const relevant = (p) => (p.area || 'outside') === this.area;

    for (const p of session.peers || []) if (relevant(p)) this.addRemote(p);
    this.refresh();

    net.on('peer-joined', (m) => {
        session.peers = [...(session.peers || []).filter((p) => p.id !== m.peer.id), m.peer];
        if (relevant(m.peer)) this.addRemote(m.peer); else this.removeRemote(m.peer.id);
        this.refresh();
      })
      .on('peer-left', (m) => {
        session.peers = (session.peers || []).filter((p) => p.id !== m.id);
        this.removeRemote(m.id);
        this.refresh();
      })
      .on('state', (m) => {
        const peer = (session.peers || []).find((p) => p.id === m.id);
        if (peer) { peer.x = m.x; peer.y = m.y; peer.dir = m.dir; peer.moving = m.moving; peer.area = m.area; }
        // a state message never carries `character` (see server protocol) — if this is
        // the first time we're seeing this id in this area, borrow it from session.peers
        // (known since they joined the room) so a brand-new avatar isn't built without one
        const withCharacter = m.character ? m : { ...m, character: (this.remotes.get(m.id)?.character) || peer?.character };
        const hadRemote = this.remotes.has(m.id);
        if (relevant(m)) this.updateRemote(withCharacter); else this.removeRemote(m.id);
        // a plain state update can be the first sign someone just entered/left this
        // area (e.g. walked through the palace door), so the player count can change here too
        if (hadRemote !== this.remotes.has(m.id)) this.refresh();
      })
      .on('chat', (m) => {
        const r = this.remotes.get(m.id);
        const peer = (session.peers || []).find((p) => p.id === m.id);
        const character = (r && r.character) || (peer && peer.character) || OTHER_CHARACTER[session.character];
        if (r) r.char.showChat(m.text);
        this.onChat(CHARACTER_LABEL[character] || 'PLAYER', m.text);
      })
      .on('resync', (m) => {
        session.peers = m.peers;
        const ids = new Set(m.peers.filter(relevant).map((p) => p.id));
        for (const id of [...this.remotes.keys()]) if (!ids.has(id)) this.removeRemote(id);
        for (const p of m.peers) if (relevant(p)) this.addRemote(p);
        this.refresh();
      });
    net.send({ t: 'resync' }); // double-check who's actually here (e.g. after a trip to the palace)
    this.sendState(0, true);
  }

  addRemote(p) {
    if (this.remotes.has(p.id)) { this.updateRemote(p); return; }
    const c = new Character(this.scene, p.character, 0, 0, CHARACTER_LABEL[p.character] || 'PLAYER');
    const known = Number.isFinite(p.x) && Number.isFinite(p.y);
    if (known) { c.setPosition(p.x, p.y); c.setState(p.dir || 'down', false); }
    c.setVisible(known);
    this.remotes.set(p.id, { char: c, character: p.character, tx: p.x, ty: p.y, dir: p.dir || 'down', moving: !!p.moving, known });
  }

  updateRemote(m) {
    let r = this.remotes.get(m.id);
    if (!r) { this.addRemote(m); r = this.remotes.get(m.id); }
    if (!Number.isFinite(m.x) || !Number.isFinite(m.y)) return;
    if (!r.known) { r.known = true; r.char.setPosition(m.x, m.y); r.char.setVisible(true); }
    r.tx = m.x; r.ty = m.y; r.moving = !!m.moving; r.dir = m.dir;
  }

  removeRemote(id) {
    const r = this.remotes.get(id);
    if (!r) return;
    r.char.destroy();
    this.remotes.delete(id);
  }

  refresh() { this.onPlayerCount(1 + this.remotes.size); }

  /** Call every frame: smooths remote positions toward their last known network position. */
  step(dt) {
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
  }

  sendState(now, force = false) {
    const net = this.session.net;
    if (!net || !net.open) return;
    const me = this.scene.me, last = this.lastSent;
    const x = Math.round(me.x * 10) / 10, y = Math.round(me.y * 10) / 10;
    const changed = x !== last.x || y !== last.y || me.dir !== last.dir || me.moving !== last.moving;
    const due = now - last.t;
    if (!force && !((changed && due >= SEND_EVERY_MS) || due >= HEARTBEAT_MS)) return;
    net.sendState({ x, y, dir: me.dir, moving: me.moving, area: this.area });
    this.lastSent = { t: now, x, y, dir: me.dir, moving: me.moving };
  }
}
