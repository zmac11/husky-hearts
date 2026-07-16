// ====================== GAME STATE ======================
// Central runtime state for a play session. This is the seam the planned features
// (pause menu, save/load, levels, inventory, dialog) build on: instead of scattered
// boolean flags, flow is a single scene value and all "current run" state hangs here.
//
// To keep this refactor low-risk, the canonical player/world globals still live where
// they always have (p1/cheeredCount in world.js; worldObjects/colliders/
// cam/WORLD_* in world.js). `Game` and `World` are thin facades that delegate to them,
// so old code keeps working while new code reads/writes through these namespaces.
// The getter/setter bodies run at call time (well after world.js has initialised), so
// referencing those globals here is safe despite load order.

// Frame-rate-independent movement. Speeds are tuned for 60 fps, so each frame the
// main loop sets `dtScale = clampedDt / FRAME_MS` (≈1 at 60 Hz, ≈0.42 at 144 Hz,
// ≈2 at 30 Hz). Every *continuous* per-frame position delta is multiplied by it, so
// the world moves the same real-world distance regardless of the display's refresh
// rate. Position *corrections* (collision resolve, knockback) are NOT scaled.
const FRAME_MS = 1000/60;
let dtScale = 1;

const SCENES = Object.freeze({
  MENU:      'menu',       // title / start screen
  CHARSELECT:'charselect', // choosing breed + colour
  PLAYING:   'playing',    // world is simulating
  PAUSED:    'paused',     // ESC menu (Phase 5)
  DIALOG:    'dialog',     // talking to an NPC (Phase 3/5)
  INVENTORY: 'inventory',  // inventory panel open (Phase 5)
  WIN:       'win',        // victory screen (world frozen)
  WORLDMAP:  'worldmap',   // between-levels campaign map (world frozen)
  GAMEOVER:  'gameover',   // all dogs fainted — run over
});

const Game = {
  state: SCENES.MENU,

  // --- scene helpers ---
  is(s){ return this.state === s; },
  set(s){ this.state = s; },
  get running(){ return this.state === SCENES.PLAYING; }, // world actively simulating?

  // --- player access (delegates to canonical globals) ---
  // Single-player for now; a future multiplayer mode would widen this list.
  get players(){ return [p1]; },
  get p1(){ return p1; },
  get cheeredCount(){ return cheeredCount; },
  set cheeredCount(v){ cheeredCount = v; },
};

// World data facade — same delegation pattern for the current level's world.
const World = {
  get objects(){ return worldObjects; },
  get colliders(){ return colliders; },
  get cam(){ return cam; },
  get W(){ return WORLD_W; },
  get H(){ return WORLD_H; },
};
