#!/usr/bin/env python3
"""
Husky Hearts build script.

Concatenates all modules in src/ (in dependency order) into:
  - dist/bundle.js          → single JS file referenced by index.html
  - dist/husky-hearts.html  → fully self-contained single-file build (deployable anywhere)

Run from project root:
    python3 build.py
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
CSS = ROOT / 'css' / 'style.css'
HTML = ROOT / 'index.html'

# Load order matters: shared globals (let/const) must be declared before use.
LOAD_ORDER = [
    'init.js',            # canvas + ctx
    'core/rng.js',        # seeded RNG (mulberry32) — used by world gen + save
    'core/state.js',      # SCENES enum + Game/World state facades
    'core/input.js',      # keys, control maps, ESC hook
    'data/breeds.js',     # per-breed stats + abilityId (used by makePlayer at load)
    'data/items.js',      # item definitions (inventory / shop)
    'data/campaign.js',   # environments/levels world-map data + Progress tracker
    'inventory.js',       # per-player inventory add/remove/has
    'quests.js',          # NPC quest system (give-item + future types)
    'health.js',          # per-player hp/maxHp + damage/heal (hearts)
    'wearables.js',       # equippable cosmetics: equip/unequip + on-dog render
    'audio.js',           # audio engine
    'world.js',           # WORLD_W, colliders, world objects, players, friends, collectibles
    'levels/index.js',    # Levels registry
    'levels/meadow.js',   # Sunny Meadows 1 (size, theme, quest, generate)
    'levels/meadow2.js',  # Sunny Meadows 2 — Wildflower Field (friendly wildlife intro)
    'levels/meadow3.js',  # Sunny Meadows 3 — Old Orchard Path (gentle enemy + water)
    'levels/rocky.js',    # Rocky Mountains — Canadian valley (harder)
    'draw-helpers.js',    # px, shade, roundRect
    'world-draw.js',      # tree/rock/pond/etc + drawWorld
    'collectibles.js',    # drawCollectible
    'friends.js',         # drawFriend
    'entities/registry.js', # Entities registry + level entity list
    'entities/enemy.js',    # enemy kind (wander/chase)
    'entities/wolf.js',     # wolf kind (faster/tougher — rocky mountains)
    'entities/grave.js',    # grave marker left where a dog faints
    'entities/critter.js',  # friendly wildlife (moose/beaver/loon — positive interaction)
    'entities/npc.js',      # NPC kind (interactable)
    'dog-sprite.js',      # drawDog + breed renderers
    'sparkles.js',        # drawSparkles
    'minimap.js',         # drawMinimap
    'abilities/registry.js',    # Abilities registry (register/dispatch)
    'abilities/ballCannon.js',  # ball-cannon ability (formerly lolla.js)
    'level-manager.js',   # LevelManager.load (build world + themed ground)
    'update.js',          # updatePlayer, tryCollect, tryDeliver, checkWin
    'toast.js',           # showToast
    'save.js',            # save/load to localStorage (before ui.js: UI.init checks Save.has)
    'ui.js',              # UI panels (pause/inventory/dialog) + HUD (updateHUD)
    'world-map.js',       # between-levels campaign map (needs UI/Levels/LevelManager/Progress)
    'main.js',            # main loop + start
    'fullscreen.js',      # fullscreen button
    'mobile-controls.js', # touch d-pad
    'start.js',           # default resetGame (overridden by charselect)
    'charselect.js',      # character selection screen + start handlers
    'dev.js',             # dev-mode level jumper (needs resetGame/dogConfig/Campaign)
]

def build_bundle():
    DIST.mkdir(exist_ok=True)
    parts = []
    for name in LOAD_ORDER:
        path = SRC / name
        if not path.exists():
            print(f"  ✗ MISSING: src/{name}", file=sys.stderr)
            sys.exit(1)
        content = path.read_text()
        parts.append(f"// ===== src/{name} =====\n{content}")
        print(f"  ✓ src/{name} ({len(content)} chars)")

    bundle = "\n".join(parts)
    out = DIST / 'bundle.js'
    out.write_text(bundle)
    print(f"\n→ {out.relative_to(ROOT)} ({len(bundle):,} chars)")
    return bundle

def build_standalone(bundle):
    html = HTML.read_text()
    css = CSS.read_text()

    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        f'<style>\n{css}\n</style>'
    )
    html = html.replace(
        '<script src="dist/bundle.js"></script>',
        f'<script>\n{bundle}\n</script>'
    )
    out = DIST / 'husky-hearts.html'
    out.write_text(html)
    print(f"→ {out.relative_to(ROOT)} ({len(html):,} chars)")

def main():
    if not SRC.exists():
        print("Error: src/ directory not found", file=sys.stderr)
        sys.exit(1)
    print("Building Husky Hearts...\n")
    bundle = build_bundle()
    build_standalone(bundle)
    print("\nBuild complete. Open index.html (uses dist/bundle.js) or dist/husky-hearts.html (standalone).")

if __name__ == '__main__':
    main()
