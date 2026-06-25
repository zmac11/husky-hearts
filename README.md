<p align="center">
  <img src="icon.svg" alt="Husky Hearts icon" width="160">
</p>

# 🐾 Husky Hearts 🐾

A cozy 2D pixel-art game where you (and optionally a friend) explore a meadow as cute dogs, collect treats, and cheer up lonely animal friends. Built entirely with vanilla HTML, CSS, JavaScript and the Canvas API — no frameworks, no build dependencies beyond Python 3.

## Features

- 🎮 **Solo & 2-player co-op modes** — share a keyboard with a friend
- 🐕 **5 dog breeds** — Husky, Shiba, Corgi, Poodle, Dalmatian, each with its own pixel-art silhouette
- 🎨 **8 colour swatches** per player with live animated previews on the breed cards
- 🌳 **Detailed pixel-art world** — oak/pine/willow trees, ponds with lily pads, rocks, mushrooms, tall grass, stone paths, wooden bridges
- 🗺️ **Minimap** showing treats, friends, and your current viewport at a glance
- 🎵 **Synthesized ambient music** — gentle glockenspiel melody with harmony and bass, all generated in-browser via the Web Audio API (no audio files needed)
- 🔊 **Procedural sound effects** for collecting, delivering, howling, cheering and a triumphant win fanfare
- 📱 **Touch controls** — on-screen D-pad and action button auto-appear on mobile devices (solo mode)
- 🖥️ **Fullscreen mode** with iOS Safari pseudo-fullscreen fallback
- 🚫 **Smart colliders** — fitted to actual sprite footprints (small rocks and mushrooms are walkable, tree trunks and ponds are not)

## Play

### Option 1: Open the standalone build directly
```
dist/husky-hearts.html
```
Open it in any modern browser. That's it — no server needed.

### Option 2: Serve the modular source
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
This loads `index.html`, which references `dist/bundle.js`. You'll still need to run the build at least once.

### Building

```bash
python3 build.py
```

The build concatenates the modules in `src/` into:
- `dist/bundle.js` — single JS file (used by `index.html`)
- `dist/husky-hearts.html` — fully self-contained single-file build

Why bundle? Each `<script>` tag is its own top-level scope, so module-scoped `let`/`const` variables aren't visible to other tags. Concatenating into one script puts everything in the same scope so cross-module references just work.

## Controls

| Action       | Player 1     | Player 2      |
|--------------|--------------|---------------|
| Move         | `W` `A` `S` `D` | Arrow keys  |
| Howl/Deliver | `Space`      | `Enter`       |

On touch devices in solo mode an on-screen D-pad and Howl button are shown automatically.

## How to play

1. Click **Play Solo** or **Play Together** on the main menu
2. Pick a breed and a colour for each player
3. Wander the meadow collecting bones, hearts, balls and flowers
4. Walk up to a sad animal (cat, bunny, bird, hedgehog, tortoise) and hold the action key — they'll take treats from you and once you fill their need they cheer up 💛
5. Cheer up all 5 animals to win
6. In 2-player mode, stand close together and have both players howl at once for a magical synchronized howl ✨

## Project layout

```
husky-hearts/
├── index.html          ← entrypoint (loads dist/bundle.js)
├── build.py            ← bundler
├── css/
│   └── style.css       ← all styles
├── src/                ← editable JS modules
│   ├── init.js              canvas & ctx setup
│   ├── audio.js             Web Audio engine, music loop, SFX
│   ├── world.js             world constants, colliders, world objects, players, friends
│   ├── draw-helpers.js      px(), shade(), roundRect()
│   ├── world-draw.js        all tree/rock/pond/etc. renderers + drawWorld
│   ├── collectibles.js      drawCollectible (with glow badge)
│   ├── friends.js           drawFriend (NPC animals)
│   ├── dog-sprite.js        drawDog dispatcher + 5 breed renderers + dalmatian spots
│   ├── sparkles.js          particle effects
│   ├── minimap.js           top-right corner minimap
│   ├── update.js            updatePlayer, tryCollect, tryDeliver, win check, group howl
│   ├── toast.js             on-screen message popups
│   ├── main.js              main rAF loop
│   ├── fullscreen.js        native fullscreen + iOS pseudo-fullscreen fallback
│   ├── mobile-controls.js   touch d-pad binding
│   ├── start.js             default resetGame() (overridden by charselect)
│   └── charselect.js        character selection UI, launchGame, button handlers
└── dist/               ← build outputs (gitignored or committed, your choice)
    ├── bundle.js
    └── husky-hearts.html
```

## Tech notes

- **No external dependencies.** No npm, no bundler, no audio assets — just the browser.
- **All audio is synthesized.** Triangle, sine and pulse oscillators drive a C-pentatonic glockenspiel loop with harmony pad and bass. SFX are short oscillator envelopes.
- **All graphics are drawn at runtime** as pixel-art via 2D canvas `fillRect` calls. The ground (grass, fence) is pre-rendered once to an offscreen canvas on world generation; everything else is redrawn per frame.
- **Camera** smoothly follows P1, or the midpoint between P1 and P2, clamped to world bounds.
- **Painter's algorithm** sorts world objects by Y for depth.
- **Colliders** are axis-aligned bounding boxes manually tuned to each sprite's visible footprint.

## License

MIT — see [LICENSE](LICENSE)
