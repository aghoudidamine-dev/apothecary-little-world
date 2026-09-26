// Two fake clients: create a room, join it, relay movement, leave.
import http from 'node:http';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { attachRoomServer } from '../rooms.js';

const server = http.createServer();
attachRoomServer(server);
await new Promise((r) => server.listen(0, r));
const url = `ws://127.0.0.1:${server.address().port}/ws`;

function client() {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    const i = waiters.findIndex((w) => w.pred(m));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(m); else inbox.push(m);
  });
  return {
    ws,
    open: new Promise((r) => ws.on('open', r)),
    send: (m) => ws.send(JSON.stringify(m)),
    next: (pred) => new Promise((resolve, reject) => {
      const i = inbox.findIndex(pred);
      if (i >= 0) return resolve(inbox.splice(i, 1)[0]);
      const t = setTimeout(() => reject(new Error('timeout')), 2000);
      waiters.push({ pred, resolve: (m) => { clearTimeout(t); resolve(m); } });
    }),
  };
}

const a = client(); const b = client(); const c = client();
await Promise.all([a.open, b.open, c.open]);

a.send({ t: 'create', character: 'maomao' });
const created = await a.next((m) => m.t === 'created');
assert.match(created.code, /^[A-Z2-9]{5}$/);

b.send({ t: 'join', code: 'ZZZZZ', character: 'jinshi' });
assert.equal((await b.next((m) => m.t === 'error')).reason, 'no-room');

b.send({ t: 'join', code: created.code, character: 'maomao' });
assert.equal((await b.next((m) => m.t === 'error')).reason, 'character-taken');

b.send({ t: 'join', code: created.code.toLowerCase(), character: 'jinshi' });
const joined = await b.next((m) => m.t === 'joined');
assert.equal(joined.peers.length, 1);
assert.equal(joined.peers[0].character, 'maomao');
const pj = await a.next((m) => m.t === 'peer-joined');
assert.equal(pj.peer.character, 'jinshi');

c.send({ t: 'join', code: created.code, character: 'jinshi' });
assert.equal((await c.next((m) => m.t === 'error')).reason, 'room-full');

a.send({ t: 'state', x: 100.5, y: 200, dir: 'left', moving: true });
const s = await b.next((m) => m.t === 'state');
assert.deepEqual([s.id, s.x, s.y, s.dir, s.moving], [created.id, 100.5, 200, 'left', true]);

b.send({ t: 'state', x: 'evil', y: 5, dir: 'sideways', moving: 1 });
const s2 = await a.next((m) => m.t === 'state');
assert.equal(s2.dir, 'down'); assert.equal(s2.y, 5);

a.send({ t: 'chat', text: '  Hello Jinshi!  ' });
const chat = await b.next((m) => m.t === 'chat');
assert.deepEqual([chat.id, chat.text], [created.id, 'Hello Jinshi!']);

b.ws.close();
assert.equal((await a.next((m) => m.t === 'peer-left')).id, joined.id);

console.log('server smoke test: OK');
a.ws.close(); c.ws.close(); server.close(); process.exit(0);
