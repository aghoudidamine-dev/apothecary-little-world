// Multiplayer relay for Deno Deploy (https://deno.com/deploy).
// Same protocol as server/rooms.js, rewritten with Deno's built-in WebSocket
// support so it needs no npm packages and no Node-specific APIs.
//
// Protocol (JSON text frames), unchanged from the Node version:
//   client -> server   {t:'create', character}
//                      {t:'join', code, character}
//                      {t:'state', x, y, dir, moving, area}   area: "outside" | "palace"
//                      {t:'resync'}
//                      {t:'chat', text}
//                      {t:'gift', kind}   kind: "flower"
//                      {t:'ping'}
//   server -> client   {t:'created', code, id}
//                      {t:'joined', code, id, peers:[{id, character, x, y, dir, moving, area}]}
//                      {t:'peer-joined', peer:{...}}   {t:'peer-left', id}
//                      {t:'state', id, x, y, dir, moving, area}
//                      {t:'resync', peers:[{id, character, x, y, dir, moving, area}]}
//                      {t:'chat', id, text}   {t:'gift', id, kind}   {t:'pong'}
//                      {t:'error', reason}   reason: no-room | room-full | character-taken | bad-request

const MAX_PLAYERS = 2;
const CHARACTERS = ["maomao", "jinshi"];
const DIRS = ["down", "left", "right", "up"];
const AREAS = ["outside", "palace"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 lookalikes
const MAP_LIMIT = 4000;

type Player = {
  id: string;
  code: string;
  character: string;
  socket: WebSocket;
  x: number | null;
  y: number | null;
  dir: string;
  moving: boolean;
  area: string;
};
type Room = { players: Map<string, Player> };

const rooms = new Map<string, Room>();
let nextId = 1;

function makeCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = "";
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error("could not allocate room code");
}

const send = (ws: WebSocket, msg: unknown) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

const num = (v: unknown, fallback: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, v)) : fallback;

function publicPeer(p: Player) {
  return { id: p.id, character: p.character, x: p.x, y: p.y, dir: p.dir, moving: p.moving, area: p.area };
}

const sockets = new WeakMap<WebSocket, Player>();

function leaveRoom(ws: WebSocket) {
  const p = sockets.get(ws);
  if (!p) return;
  sockets.delete(ws);
  const room = rooms.get(p.code);
  if (!room) return;
  room.players.delete(p.id);
  for (const other of room.players.values()) send(other.socket, { t: "peer-left", id: p.id });
  if (room.players.size === 0) rooms.delete(p.code);
}

function enterRoom(ws: WebSocket, code: string, room: Room, character: string) {
  const player: Player = {
    id: "p" + nextId++, code, character, socket: ws,
    x: null, y: null, dir: "down", moving: false, area: "outside",
  };
  sockets.set(ws, player);
  const peers = [...room.players.values()].map(publicPeer);
  room.players.set(player.id, player);
  return { player, peers };
}

function handle(ws: WebSocket, msg: Record<string, unknown>) {
  switch (msg.t) {
    case "create": {
      if (sockets.get(ws)) return send(ws, { t: "error", reason: "bad-request" });
      if (!CHARACTERS.includes(msg.character as string)) return send(ws, { t: "error", reason: "bad-request" });
      const code = makeCode();
      const room: Room = { players: new Map() };
      rooms.set(code, room);
      const { player } = enterRoom(ws, code, room, msg.character as string);
      send(ws, { t: "created", code, id: player.id });
      return;
    }
    case "join": {
      if (sockets.get(ws)) return send(ws, { t: "error", reason: "bad-request" });
      const code = String(msg.code ?? "").toUpperCase().trim();
      if (!CHARACTERS.includes(msg.character as string) || code.length !== 5) {
        return send(ws, { t: "error", reason: "bad-request" });
      }
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", reason: "no-room" });
      if (room.players.size >= MAX_PLAYERS) return send(ws, { t: "error", reason: "room-full" });
      for (const p of room.players.values()) {
        if (p.character === msg.character) return send(ws, { t: "error", reason: "character-taken" });
      }
      const { player, peers } = enterRoom(ws, code, room, msg.character as string);
      send(ws, { t: "joined", code, id: player.id, peers });
      for (const other of room.players.values()) {
        if (other.id !== player.id) send(other.socket, { t: "peer-joined", peer: publicPeer(player) });
      }
      return;
    }
    case "state": {
      const p = sockets.get(ws);
      if (!p) return;
      p.x = num(msg.x, p.x);
      p.y = num(msg.y, p.y);
      p.dir = DIRS.includes(msg.dir as string) ? (msg.dir as string) : p.dir;
      p.moving = !!msg.moving;
      p.area = AREAS.includes(msg.area as string) ? (msg.area as string) : p.area;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: "state", id: p.id, x: p.x, y: p.y, dir: p.dir, moving: p.moving, area: p.area };
      for (const other of room.players.values()) if (other.id !== p.id) send(other.socket, out);
      return;
    }
    case "resync": {
      const p = sockets.get(ws);
      if (!p) return;
      const room = rooms.get(p.code);
      if (!room) return;
      const peers = [...room.players.values()].filter((o) => o.id !== p.id).map(publicPeer);
      return send(ws, { t: "resync", peers });
    }
    case "chat": {
      const p = sockets.get(ws);
      if (!p) return;
      const text = String(msg.text ?? "").slice(0, 140).trim();
      if (!text) return;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: "chat", id: p.id, text };
      for (const other of room.players.values()) if (other.id !== p.id) send(other.socket, out);
      return;
    }
    case "gift": {
      const p = sockets.get(ws);
      if (!p) return;
      if (msg.kind !== "flower") return;
      const room = rooms.get(p.code);
      if (!room) return;
      const out = { t: "gift", id: p.id, kind: "flower" };
      for (const other of room.players.values()) if (other.id !== p.id) send(other.socket, out);
      return;
    }
    case "ping":
      return send(ws, { t: "pong" });
    default:
      return;
  }
}

Deno.serve({ port: Number(Deno.env.get("PORT")) || 8000 }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/ws" && req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg && typeof msg === "object") handle(socket, msg);
    };
    socket.onclose = () => leaveRoom(socket);
    socket.onerror = () => leaveRoom(socket);
    return response;
  }
  return new Response(`apothecary-little-world relay ok (${rooms.size} rooms)\n`, {
    headers: { "content-type": "text/plain" },
  });
});
