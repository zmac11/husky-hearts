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
    'audio.js',           # audio engine
    'world.js',           # WORLD_W, colliders, world objects, players, friends, collectibles
    'draw-helpers.js',    # px, shade, roundRect
    'world-draw.js',      # tree/rock/pond/etc + drawWorld
    'collectibles.js',    # drawCollectible
    'friends.js',         # drawFriend
    'dog-sprite.js',      # drawDog + breed renderers
    'sparkles.js',        # drawSparkles
    'minimap.js',         # drawMinimap
    'lolla.js',           # Lolla special: tennis ball + cannon
    'update.js',          # updatePlayer, tryCollect, tryDeliver, checkWin
    'toast.js',           # showToast
    'main.js',            # main loop + start
    'fullscreen.js',      # fullscreen button
    'mobile-controls.js', # touch d-pad
    'start.js',           # default resetGame (overridden by charselect)
    'charselect.js',      # character selection screen + start handlers
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
