# The Apothecary's Little World (prototype)

A very small 2D pixel-art multiplayer walking prototype inspired by *The Apothecary Diaries*.
Pick Maomao or Jinshi, walk around a little palace village, talk to 5 NPCs, and share a
room with a friend using a 5-letter room code.

Not included on purpose: accounts, database, inventory, quests, combat.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173 in two browser windows. In window 1: PLAY, pick a character,
CREATE ROOM. In window 2: JOIN ROOM, pick the *other* character, type the code.
On the same Wi-Fi a phone or second computer can use the "Network" URL Vite prints.

`npm run dev` also runs the multiplayer relay inside Vite (path `/ws`), so no second process is needed.

**Controls:** WASD or arrow keys move, E talks to a nearby NPC (or enters/leaves the palace
when you're at its door), Space/Enter continues dialogue, Enter (outside dialogue) opens a
chat box to message the other player, Esc closes dialogue/chat.

**The palace:** walk up to the palace's front door and press E to step inside and meet the
Emperor, the Empress Dowager, and the four consorts. This part is single-player sightseeing —
if you're playing online, the other player won't see you (or vice versa) while either of you
is inside; you're back in sync as soon as you both step outside.

**Giving a flower:** playing as Jinshi, walk up to Maomao's player and an "E - Give Flower"
prompt appears. Press E and she'll get a little flower-and-happy-bounce reaction on her screen.

## Tests

```bash
npm run test:server   # room create/join/full/duplicate character/relay/disconnect
npm run test:world    # spawns walkable, NPCs reachable, collision blocks water and palace
```

## Deploy for free

The game has two parts. Netlify only hosts static files, so the multiplayer relay
lives on a separate free host. Render's free tier now asks new signups for a card, so
this project's relay is written for **Deno Deploy** instead (`deno-relay/`), which as of
writing does not.

### 1. Relay server (Deno Deploy, no card required)
1. Push this project to GitHub (see below if you haven't).
2. Go to https://console.deno.com and sign in with GitHub.
3. Create an organization if asked, then click **+ New App**.
4. Pick your repo. When it asks for the entry point / root, point it at
   `deno-relay/main.ts` (the app is just that one file, no build step, no install command).
5. Deploy. Your relay's URL will look like `https://<your-app>.deno.dev`.
6. Check it works by opening `https://<your-app>.deno.dev/` directly — you should see
   "apothecary-little-world relay ok".
7. Your relay address for the game is that same URL with `wss://` and `/ws`, e.g.
   `wss://your-app.deno.dev/ws`.

### 2. Frontend (Netlify)
1. New site from Git, using the same repo. `netlify.toml` already sets the build
   command and publish folder.
2. Site settings > Environment variables: add `VITE_WS_URL` = `wss://your-app.deno.dev/ws`
3. Deploy (or redeploy, if you already deployed before adding the variable).

For a quick test without redeploying, add `?server=wss://your-app.deno.dev/ws` to your game URL.

*(There's also a Node version of the relay in `server/`, and a `render.yaml`, in case you
ever do want to use Render or another Node host later — the frontend works with either.)*

## How it works

| Part | Where |
| --- | --- |
| Menus (title, character select, room) | `src/ui/menus.js`, `index.html`, `src/style.css` |
| World data, collision (pure, testable) | `src/world/` |
| Pixel art, all drawn in code (no image files) | `src/art/` |
| Phaser scenes (boot, gameplay) | `src/scenes/` |
| WebSocket client | `src/multiplayer/net.js` |
| Room relay (create/join/relay positions) | `server/rooms.js`, `server/index.js` |

Networking: each client sends `{x, y, dir, moving}` up to 20 times a second (and every 0.5 s as a
heartbeat). The server checks the numbers and forwards them to the other player, who smooths the
movement. Rooms hold 2 players (`MAX_PLAYERS` in `server/rooms.js`), each with a different character.

## Ideas for later
Cafe, gym, home, garden activities, workplace, money, crafting, character customisation,
mobile controls, voice chat.
