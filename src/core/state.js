// ====================== GAME STATE ======================
// Central runtime state for a play session. This is the seam the planned features
// (pause menu, save/load, levels, inventory, dialog) build on: instead of scattered
// boolean flags, flow is a single scene value and all "current run" state hangs here.
//
// To keep this refactor low-risk, the canonical player/world globals still live where
// they always have (p1/p2/twoPlayer/cheeredCount in world.js; worldObjects/colliders/
// cam/WORLD_* in world.js). `Game` and `World` are thin facades that delegate to them,
// so old code keeps working while new code reads/writes through these namespaces.
// The getter/setter bodies run at call time (well after world.js has initialised), so
// referencing those globals here is safe despite load order.

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
  get players(){ return this.twoPlayer ? [p1, p2] : [p1]; },
  get p1(){ return p1; },
  get p2(){ return p2; },
  get twoPlayer(){ return typeof twoPlayer !== 'undefined' ? twoPlayer : false; },
  set twoPlayer(v){ twoPlayer = v; },
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
