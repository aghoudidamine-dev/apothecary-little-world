import { defineConfig } from 'vite';
import { attachRoomServer } from './server/rooms.js';

// During `npm run dev` / `npm run preview` the multiplayer relay runs inside Vite on
// the same port (path /ws), so two browser windows or two devices on your network can
// play together with zero extra setup. When hosting for real, run server/index.js instead.
const roomServer = () => ({
  name: 'apothecary-room-server',
  configureServer(server) { if (server.httpServer) attachRoomServer(server.httpServer); },
  configurePreviewServer(server) { if (server.httpServer) attachRoomServer(server.httpServer); },
});

export default defineConfig({
  plugins: [roomServer()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { chunkSizeWarningLimit: 1500 },
});
