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

**The palace:** walk up to the palace's front door and press E to step inside — a big hall several
times the size of the screen, with a long rug leading up to a throne. Empty for now (no
characters inside yet). Multiplayer stays fully live in there: if you're both inside you see and
chat with each other exactly like outside; whoever's elsewhere only reappears once you're both
in the same place again. Press E near the door to leave.

**Home:** the west house (reached by the dirt path from the courtyard) is your shared home. Walk up to its door and press E to go inside. The living room has a tea table, bookshelf, herb cabinet and the wardrobe; the bedroom (top-left, with the stove) has the bed; below it is the stone bathroom with the green pool; and the two-stall toilet room is on the right. Online sync works inside just like outside (chat and flowers too).
- **Wardrobe:** in the bedroom, next to the stove. E beside it opens a pop-up list of your 3 outfits (click, 1-3, or arrows + Enter). The other player sees the change live and it stays when you leave.
- **Sleep:** E beside the bed tucks you in with your head on your own pillow, eyes closed (Maomao left, Jinshi right); both of you can sleep at once. E again to get up.
- **Bath:** E beside the pool soaks you in it, head and shoulders above the water; both of you can soak together. E again to get out. You can chat while sleeping or soaking.
- The bathroom towels, the toilets and the sink are decoration only.

**Hugging:** stand next to the other player and press **H** to ask for a hug. They get "wants a hug! Y = yes, N = no". On yes you both turn to face each other and wrap your arms around each other's backs, with hearts floating up. If both of you press H at the same time it counts as a yes. Walk away (either of you) and the hug lets go for both. If you're both asleep in the bed, **H** asks for a cuddle instead: you lie with your heads together and your arms across each other; E gets you up and ends it. The hug pictures use whatever outfit each of you is wearing. Works outside and in the house.
