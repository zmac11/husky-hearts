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
import json
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
CSS = ROOT / 'css' / 'style.css'
HTML = ROOT / 'index.html'

# JSON content configs, baked into the bundle as `const <VAR> = {...};` BEFORE any JS
# module runs. Authors edit these files; the game reads the globals. Embedding (rather
# than a runtime fetch) is what keeps the single-file standalone build working offline.
# Each is validated with json.load at build time, so a typo fails the build with the
# offending file named — you never ship a broken config.
CONFIG_FILES = [
    ('config/items.json',  'ITEMS_DATA'),   # item / wearable definitions (data/items.js)
    ('config/loot.json',   'LOOT_DATA'),    # chest tables, enemy drops, XP payouts (data/loot.js)
    ('config/levels.json', 'LEVELS_DATA'),  # per-level content (levels/from-config.js)
]

# Load order matters: shared globals (let/const) must be declared before use.
LOAD_ORDER = [
    'init.js',            # canvas + ctx
    'core/rng.js',        # seeded RNG (mulberry32) — used by world gen + save
    'core/run.js',        # the run seed: every level's layout derives from it
    'core/state.js',      # SCENES enum + Game/World state facades
    'core/input.js',      # keys, control maps, ESC hook
    'data/breeds.js',     # per-breed stats + abilityId (used by makePlayer at load)
    'data/skills.js',     # skill tree nodes + Skills.apply (used by makePlayer)
    'data/progression.js',# XP curve, dog levels, mastery/skill points (Progression)
    'data/items.js',      # item definitions (inventory / shop) — reads ITEMS_DATA
    'data/loot.js',       # rollLoot(): shared drop-table roller (reads LOOT_DATA)
    'data/chests.js',     # treasure-chest rarities/loot tables (reads LOOT_DATA)
    'data/campaign.js',   # environments/levels world-map data + Progress tracker
    'inventory.js',       # per-player inventory add/remove/has
    'quests.js',          # NPC quest system (give-item + future types)
    'health.js',          # per-player hp/maxHp + damage/heal (hearts)
    'wearables.js',       # equippable cosmetics: equip/unequip + on-dog render
    'audio.js',           # audio engine
    'world.js',           # WORLD_W, colliders, world objects, players, friends, collectibles
    'levels/index.js',    # Levels registry
    'levels/meadow.js',   # meadow terrain builder + registration into TERRAIN
    'levels/meadow2.js',  # 'wildflowers' augment (extra flower scatter)
    'levels/meadow3.js',  # 'orchard' augment (extra oak clusters)
    'levels/rocky.js',    # rocky terrain builder (buildRockyWorld) + friends helper
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
    'entities/chest.js',    # buried treasure chests (sniff → dig → unlock → loot)
    'entities/portal.js',   # biome-themed exit portal (spawned by checkWin)
    'entities/spiritwolf.js', # Dinno's spectral storm-wolf companion (spiritWolf ability)
    'dog-sprite.js',      # drawDog + breed renderers
    'sparkles.js',        # drawSparkles
    'floaters.js',        # floating damage/XP numbers + level-up burst
    'xporbs.js',          # Minecraft-style XP pickup orbs (spawn/update/draw)
    'minimap.js',         # drawMinimap
    'abilities/registry.js',    # Abilities registry (register/dispatch + cooldowns)
    'abilities/ballCannon.js',  # Lolla: placeable auto-turret
    'abilities/stormFang.js',   # Dinno Q: storm transformation + lightning
    'abilities/spiritWolf.js',  # Dinno E: spectral wolf summon
    'abilities/scream.js',      # Lolla E: piercing AOE scream
    'abilities/innerMonster.js',# Ťapka Q: feral melee transform + lifesteal
    'abilities/scurry.js',      # Ťapka E: evasive dash + i-frames
    'levels/from-config.js', # register levels from LEVELS_DATA (needs terrain/augment fns + Chests)
    'level-state.js',     # per-level dynamic state so visited levels stay as you left them
    'level-manager.js',   # LevelManager.load/enter (build world + themed ground)
    'update.js',          # updatePlayer, tryCollect, tryDeliver, checkWin
    'toast.js',           # showToast
    'tips.js',            # first-time feature tip popups (Tips.show — hooked across modules)
    'save.js',            # save/load to localStorage (before ui.js: UI.init checks Save.has)
    'ui.js',              # UI panels (pause/inventory/dialog) + HUD (updateHUD)
    'save-ui.js',         # save-slot picker overlay (needs UI._show)
    'world-map.js',       # between-levels campaign map (needs UI/Levels/LevelManager/Progress)
    'main.js',            # main loop + start
    'fullscreen.js',      # fullscreen button
    'mobile-controls.js', # touch d-pad
    'start.js',           # default resetGame (overridden by charselect)
    'charselect.js',      # character selection screen + start handlers
    'options.js',         # options screen: key rebinding + sound volume/mute
    'dev.js',             # dev-mode level jumper (needs resetGame/dogConfig/Campaign)
]

def build_configs():
    """Validate each JSON config and emit it as a `const VAR = {...};` bundle part."""
    parts = []
    for name, var in CONFIG_FILES:
        path = SRC / name
        if not path.exists():
            print(f"  ✗ MISSING: src/{name}", file=sys.stderr)
            sys.exit(1)
        raw = path.read_text()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  ✗ INVALID JSON in src/{name}: {e}", file=sys.stderr)
            sys.exit(1)
        # Re-serialize compactly (drops comments/whitespace, guarantees valid JS literal).
        literal = json.dumps(data, ensure_ascii=False)
        parts.append(f"// ===== src/{name} =====\nconst {var} = {literal};")
        print(f"  ✓ src/{name} → {var} ({len(raw)} chars)")
    return parts

def build_bundle():
    DIST.mkdir(exist_ok=True)
    parts = build_configs()   # config globals first — every module below reads them
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
