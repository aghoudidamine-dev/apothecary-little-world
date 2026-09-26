// Standalone multiplayer server (deploy this to Render / Fly / Railway / any Node host).
// Locally, `npm run dev` already runs the same relay inside Vite, so you only
// need this file when hosting the game online.
import http from 'node:http';
import { attachRoomServer, roomCount } from './rooms.js';

const PORT = Number(process.env.PORT) || 8787;

const server = http.createServer((req, res) => {
  // Health check for hosting platforms.
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`apothecary-little-world relay ok (${roomCount()} rooms)\n`);
    return;
  }
  res.writeHead(404);
  res.end();
});

attachRoomServer(server);
server.listen(PORT, () => console.log(`relay listening on :${PORT}  (WebSocket path: /ws)`));
