// Minimal room relay for the two-player prototype.
//
// Protocol (JSON text frames):
//   client -> server   {t:'create', character}
//                      {t:'join', code, character}
//                      {t:'state', x, y, dir, moving, area}   area: 'outside' | 'palace'
//                      {t:'resync'}
//                      {t:'chat', text}
//                      {t:'gift', kind}   kind: 'flower'
//   server -> client   {t:'created', code, id}
//                      {t:'joined', code, id, peers:[{id, character, x, y, dir, moving, area}]}
//                      {t:'peer-joined', peer:{...}}   {t:'peer-left', id}
//                      {t:'state', id, x, y, dir, moving, area}
//                      {t:'resync', peers:[{id, character, x, y, dir, moving, area}]}
//                      {t:'chat', id, text}   {t:'gift', id, kind}   {t:'pong'}
//                      {t:'error', reason}   reason: no-room | room-full | character-taken | bad-request
//
// The server never simulates anything: it only hands out room codes and relays
// each player's position to the other players in the same room.
import { WebSocketServer } from 'ws';

export const MAX_PLAYERS = 2;
export const CHARACTERS = ['maomao', 'jinshi'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 lookalikes
const DIRS = ['down', 'left', 'right', 'up'];
const AREAS = ['outside', 'palace'];
const MAP_LIMIT = 4000; // px, generous bound just to reject garbage

const rooms = new Map(); // code -> { players: Map<id, player> }
let nextId = 1;

function makeCode() {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error('could not allocate room code');
}

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

const num = (v, fallback) => (Number.isFinite(v) ? Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, v)) : fallback);

function publicPeer(p) {
  return { id: p.id, character: p.character, x: p.x, y: p.y, dir: p.dir, moving: p.moving, area: p.area };
}

function leaveRoom(ws) {
  const p = ws.player;
  if (!p) return;
  ws.player = null;
  const room = rooms.get(p.code);
  if (!room) return;
  room.players.delete(p.id);
  for (const other of room.players.values()) send(other.ws, { t: 'peer-left', id: p.id });
  if (room.players.size === 0) rooms.delete(p.code);
}

function enterRoom(ws, code, room, character) {
  const player = {
    id: 'p' + nextId++, code, character, ws,
    x: null, y: null, dir: 'down', moving: false, area: 'outside', // x/y stay null until the client sends its first state
  };
  ws.player = player;
  const peers = [...room.players.values()].map(publicPeer);
  room.players.set(player.id, player);
  return { player, peers };
}

function handle(ws, msg) {
  switch (msg.t) {
    case 'create': {
      if (ws.player) return send(ws, { t: 'error', reason: 'bad-request' });
      if (!CHARACTERS.includes(msg.character)) return send(ws, { t: 'error', reason: 'bad-request' });
      const code = makeCode();
      const room = { players: new Map() };
      rooms.set(code, room);
      const { player } = enterRoom(ws, code, room, msg.character);
      send(ws, { t: 'created', code, id: player.id });
      return;
    }
    case 'join': {
      if (ws.player) return send(ws, { t: 'error', reason: 'bad-request' });
      const code = String(msg.code || '').toUpperCase().trim();
      if (!CHARACTERS.includes(msg.character) || code.length !== 5) {
        return send(ws, { t: 'error', reason: 'bad-request' });
      }
      const room = rooms.get(code);
      if (!room) return send(ws, { t: 'error', reason: 'no-room' });
      if (room.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', reason: 'room-full' });
      for (const p of room.players.values()) {
        if (p.character === msg.character) return send(ws, { t: 'error', reason: 'character-taken' });
      }
      const { player, peers } = enterRoom(ws, code, room, msg.character);
      send(ws, { t: 'joined', code, id: player.id, peers });
      for (const other of room.players.values()) {
        if (other.id !== player.id) send(other.ws, { t: 'peer-joined', peer: publicPeer(player) });
      }
      return;
    }
    case 'state': {
      const p = ws.player;
      if (!p) return;
      p.x = num(msg.x, p.x);
      p.y = num(msg.y, p.y);
      p.dir = DIRS.includes(msg.dir) ? msg.dir : p.dir;
      p.moving = !!msg.moving;
      p.area = AREAS.includes(msg.area) ? msg.area : p.area;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: 'state', id: p.id, x: p.x, y: p.y, dir: p.dir, moving: p.moving, area: p.area };
      for (const other of room.players.values()) {
        if (other.id !== p.id) send(other.ws, out);
      }
      return;
    }
    case 'resync': {
      const p = ws.player;
      if (!p) return;
      const room = rooms.get(p.code);
      if (!room) return;
      const peers = [...room.players.values()].filter((o) => o.id !== p.id).map(publicPeer);
      return send(ws, { t: 'resync', peers });
    }
    case 'chat': {
      const p = ws.player;
      if (!p) return;
      const text = String(msg.text ?? '').slice(0, 140).trim();
      if (!text) return;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: 'chat', id: p.id, text };
      for (const other of room.players.values()) if (other.id !== p.id) send(other.ws, out);
      return;
    }
    case 'gift': {
      const p = ws.player;
      if (!p) return;
      if (msg.kind !== 'flower') return;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: 'gift', id: p.id, kind: 'flower' };
      for (const other of room.players.values()) if (other.id !== p.id) send(other.ws, out);
      return;
    }
    case 'ping':
      return send(ws, { t: 'pong' });
    default:
      return;
  }
}

/** Attach the room relay to an existing Node http(s) server, on `path`. */
export function attachRoomServer(httpServer, { path = '/ws', heartbeatMs = 25000 } = {}) {
  // noServer + a manual 'upgrade' handler so we never interfere with other
  // WebSocket users on the same server (e.g. Vite's hot-reload socket).
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });

  httpServer.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch { /* ignore */ }
    if (pathname !== path) return; // not ours
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.player = null;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (msg && typeof msg === 'object') handle(ws, msg);
    });
    ws.on('close', () => leaveRoom(ws));
    ws.on('error', () => leaveRoom(ws));
  });

  // Drop dead connections (also keeps some free hosts' proxies from idling us out).
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, heartbeatMs);
  wss.on('close', () => clearInterval(timer));
  httpServer.on('close', () => clearInterval(timer));

  return wss;
}

export const roomCount = () => rooms.size;
