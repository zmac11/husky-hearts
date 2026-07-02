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
├── index.html          ← entrypoint (loads dist/bundle.js) + UI panel markup
├── build.py            ← bundler (LOAD_ORDER controls concat sequence)
├── css/
│   └── style.css       ← all styles (incl. pause/inventory/dialog panels)
├── src/                ← editable JS modules
│   ├── init.js              canvas & ctx setup
│   ├── core/
│   │   ├── rng.js           seeded RNG (mulberry32) — reproducible generation
│   │   ├── state.js         SCENES enum + Game/World state facades
│   │   └── input.js         key state, per-player control maps, ESC/I hooks
│   ├── data/
│   │   ├── breeds.js        per-breed stats + passive + abilityId (single source)
│   │   └── items.js         item definitions (inventory / shop wares)
│   ├── inventory.js         per-player inventory add/remove/has
│   ├── audio.js             Web Audio engine, music loop, SFX
│   ├── world.js             world size, colliders, world objects, players, makePlayer
│   ├── levels/
│   │   ├── index.js         Levels registry
│   │   └── meadow.js        level 1 (size, theme, quest, generate)
│   ├── level-manager.js     LevelManager.load — build world + themed ground
│   ├── draw-helpers.js      px(), shade(), roundRect()
│   ├── world-draw.js        tree/rock/pond/etc. renderers + drawWorld (theme-aware)
│   ├── collectibles.js      drawCollectible (with glow badge)
│   ├── friends.js           drawFriend (rescue animals)
│   ├── entities/
│   │   ├── registry.js      Entities registry + level entity list + interaction
│   │   ├── enemy.js         enemy kind (wander/chase)
│   │   └── npc.js           NPC kind (interactable → dialog/shop)
│   ├── abilities/
│   │   ├── registry.js      Abilities registry (spawn/update/draw dispatch)
│   │   └── ballCannon.js    Lolla's active ability (formerly lolla.js)
│   ├── dog-sprite.js        drawDog dispatcher + breed renderers
│   ├── sparkles.js          particle effects
│   ├── minimap.js           top-right corner minimap (theme-aware)
│   ├── update.js            updatePlayer, tryCollect, tryDeliver, tryInteract, checkWin
│   ├── toast.js             on-screen message popups
│   ├── save.js              save/load a run to localStorage (world snapshot)
│   ├── ui.js                pause / inventory / dialog panels + HUD (updateHUD)
│   ├── main.js              main rAF loop (scene-gated) + startup LevelManager.load
│   ├── fullscreen.js        native fullscreen + iOS pseudo-fullscreen fallback
│   ├── mobile-controls.js   touch d-pad binding
│   ├── start.js             default resetGame() (overridden by charselect)
│   └── charselect.js        character selection UI, launchGame, button handlers
└── dist/               ← build outputs
    ├── bundle.js
    └── husky-hearts.html
```

## Architecture & extending

State is grouped into a few namespaces rather than loose globals: `Game` (scene +
run state), `World`, `Input`, `RNG`. Flow is a scene machine (`SCENES.MENU`,
`CHARSELECT`, `PLAYING`, `PAUSED`, `INVENTORY`, `DIALOG`, `WIN`) that the main loop
dispatches on — the world only updates while `PLAYING`, and freezes (but keeps
drawing) behind any open UI panel. Content is data-driven via registries, so the
common extensions are additive:

- **New dog / stats / passive** → add an entry to `src/data/breeds.js`.
- **New active ability** → implement `{spawn, update, drawWorld, drawOnDog}` in
  `src/abilities/`, register it, and point a breed's `abilityId` at it.
- **New level** (different visuals/contents/quest) → add a file in `src/levels/`
  declaring `size`, `theme`, `generate()`, and `quest`, then `Levels.register(...)`.
- **New enemy / NPC / world actor** → register a kind in `src/entities/` (with
  `update`/`draw`/`onInteract`) and `Entities.spawn()` it from a level's `generate()`.
- **New item / shop ware** → add to `src/data/items.js`; use the `Inventory` API.

Remember to add any new file to `LOAD_ORDER` in `build.py` (dependency order).

## Tech notes

- **No external dependencies.** No npm, no bundler, no audio assets — just the browser.
- **All audio is synthesized.** Triangle, sine and pulse oscillators drive a C-pentatonic glockenspiel loop with harmony pad and bass. SFX are short oscillator envelopes.
- **All graphics are drawn at runtime** as pixel-art via 2D canvas `fillRect` calls. The ground (grass, fence) is pre-rendered once to an offscreen canvas on world generation; everything else is redrawn per frame.
- **Camera** smoothly follows P1, or the midpoint between P1 and P2, clamped to world bounds.
- **Painter's algorithm** sorts world objects by Y for depth.
- **Colliders** are axis-aligned bounding boxes manually tuned to each sprite's visible footprint.

## License

MIT — see [LICENSE](LICENSE)
