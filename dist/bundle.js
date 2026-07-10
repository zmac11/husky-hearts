// ===== src/init.js =====
// ====================== CANVAS INIT ======================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ===== src/core/rng.js =====
// ====================== RNG ======================
// Seeded, reproducible pseudo-random generator.
//
// `mulberry32` was previously defined inline in world-draw.js for ground texture only.
// It's promoted here so level generation and save/load can seed a whole world
// reproducibly (a saved level regenerates identically from its stored seed).
//
// Existing callers use the bare `mulberry32(seed)` function unchanged. New code
// should prefer the `RNG` facade so there's a single shared, reseedable stream.

function mulberry32(seed){ // tiny deterministic RNG — returns a function producing [0,1)
  return function(){
    seed|=0; seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

const RNG = {
  seed: (Math.random()*1e9)|0,  // default run seed; LevelManager overrides per level
  _fn: null,

  // Reseed the shared stream (e.g. when (re)generating a level, or after loading a save).
  reseed(s){ this.seed = s>>>0; this._fn = mulberry32(this.seed); return this.seed; },

  next(){ if(!this._fn) this._fn = mulberry32(this.seed); return this._fn(); },
  range(a,b){ return a + this.next()*(b-a); },
  int(a,b){ return Math.floor(this.range(a, b+1)); },        // inclusive [a,b]
  pick(arr){ return arr[Math.floor(this.next()*arr.length)]; },
  chance(p){ return this.next() < p; },

  // A fresh independent stream derived from the current seed — handy for a subsystem
  // that needs its own reproducible sequence without disturbing the main stream.
  fork(salt){ return mulberry32((this.seed ^ (salt>>>0)) >>> 0); },
};

// ===== src/core/state.js =====
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

// ===== src/core/input.js =====
// ====================== INPUT ======================
// Owns the raw key state and per-player control maps (previously the `keys` object
// and inline listeners lived in world.js, and the c1/c2 maps were defined inside the
// main loop). Centralising here gives one place to add rebinding, gamepad support,
// and the global ESC → pause hook.

const keys = {};

window.addEventListener('keydown', e=>{
  keys[e.code] = true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code)) e.preventDefault();
  if(e.code === 'Escape'){ e.preventDefault(); Input.onEscape(); }
  if(e.code === 'KeyI'){ if(typeof UI!=='undefined' && UI.toggleInventory) UI.toggleInventory(); }
  if(e.code === 'Backquote'){ e.preventDefault(); if(typeof DevMode!=='undefined' && DevMode.toggle) DevMode.toggle(); }
  // Number keys 1-9 → use the matching P1 hotbar slot (consumables/toys).
  const m = /^Digit([1-9])$/.exec(e.code);
  if(m){ if(typeof UI!=='undefined' && UI.useHotbar) UI.useHotbar(+m[1]); }
});
window.addEventListener('keyup', e=>{ keys[e.code] = false; });

const Input = {
  keys,

  // Per-player control maps. `ability` is the active-ability trigger (Phase 1);
  // it matches the keys Lolla's ball cannon already used (Q / period).
  CONTROLS: {
    p1: { up:'KeyW',    down:'KeyS',      left:'KeyA',       right:'KeyD',        action:'Space', ability:'KeyQ'   },
    p2: { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft',  right:'ArrowRight',  action:'Enter', ability:'Period' },
  },

  down(code){ return !!keys[code]; },

  // ESC hook. Real pause-menu wiring lands in Phase 5 (UI.togglePause); until then
  // this is a guarded no-op so ESC is harmless.
  onEscape(){ if(typeof UI !== 'undefined' && UI.togglePause) UI.togglePause(); },
};

// ===== src/data/breeds.js =====
// ====================== BREEDS (data) ======================
// Single source of truth for breed identity + stats + which active ability the breed
// carries. charselect.js builds its cards from Breeds.list(); makePlayer() (world.js)
// reads stats/abilityId. This is the seam for "each dog has unique + passive abilities
// and different stats": tune numbers here, and add an entry in abilities/ for a new
// active ability, then point a breed's abilityId at it.
//
// stats:
//   speed — base walking speed (px/frame). Was hardcoded 2.6 for everyone.
//   swim  — multiplier applied to speed while swimming (was hardcoded 0.5).
// hp — starting (and max) health total. 1 heart icon = 2 hp, so these are all even:
//   e.g. 20 hp → 10 hearts. Each breed has a different total (small dogs are frailer,
//   the alpha is tankier). makePlayer() seeds player.hp/maxHp from this.
// passive — human-readable description of the stat-based perk (shown in UI later).
// abilityId — key into the Abilities registry for an active ability (null = none yet).

const BREEDS_DATA = {
  dinno:     { name:'Dinno',     desc:'The real husky boss',  emoji:'❤️', hp:24,
               stats:{ speed:2.8, swim:0.55 }, passive:'Alpha — a step faster than the pack', abilityId:null },
  lolla:     { name:'Lolla',     desc:'Fluff queen supreme',  emoji:'🌟', hp:20,
               stats:{ speed:2.6, swim:0.5  }, passive:'Playful — loves a good game of fetch', abilityId:'ballCannon' },
  husky:     { name:'Husky',     desc:'Energetic & loyal',    emoji:'🐕', hp:20,
               stats:{ speed:2.7, swim:0.5  }, passive:'Tireless runner',                       abilityId:null },
  shiba:     { name:'Shiba',     desc:'Bold & fox-like',      emoji:'🦊', hp:18,
               stats:{ speed:2.6, swim:0.5  }, passive:'Sure-footed',                           abilityId:null },
  corgi:     { name:'Corgi',     desc:'Tiny legs, big heart', emoji:'🐾', hp:16,
               stats:{ speed:2.3, swim:0.45 }, passive:'Short legs — steady but slower',        abilityId:null },
  poodle:    { name:'Poodle',    desc:'Fluffy & fabulous',    emoji:'✨', hp:18,
               stats:{ speed:2.6, swim:0.75 }, passive:'Natural swimmer — glides through water', abilityId:null },
  dalmatian: { name:'Dalmatian', desc:'Spotty & spirited',    emoji:'⚫', hp:22,
               stats:{ speed:2.9, swim:0.5  }, passive:'Spirited sprinter',                     abilityId:null },
};

// Display order for the character-select screen.
const BREED_ORDER = ['dinno','lolla','husky','shiba','corgi','poodle','dalmatian'];

const Breeds = {
  all: BREEDS_DATA,
  get(id){ return BREEDS_DATA[id] || BREEDS_DATA.husky; },
  // {id, name, desc, emoji, stats, passive, abilityId} for each breed, in display order.
  list(){ return BREED_ORDER.map(id => Object.assign({ id }, BREEDS_DATA[id])); },
};

// ===== src/data/items.js =====
// ====================== ITEMS (data) ======================
// Definitions for everything that can live in a player's inventory: collectibles,
// consumables, and wearables. `type` groups items; `value` is a coin/trade worth for
// the shop seam. The collectible ids here match the collectible `type` strings produced
// by makeCollectibles() (world.js), so a pickup maps straight in.
//
// type flavours the item and drives UI/behaviour:
//   'treat'/'toy'/'food'   — plain collectibles (delivery currency lives in p.treats)
//   'consumable'           — usable from the hotbar (number keys). `heal` (hp) restores
//                            health when used; consumed on use.
//   'wearable'             — equippable cosmetic. `slot` is which paper-doll slot it fills
//                            (head/face/neck/body/back); `render` keys into Wearables'
//                            draw table so it shows on the dog.

const ITEMS_DATA = {
  // collectibles found in the world
  bone:   { name:'Bone',   icon:'🦴', type:'treat', value:1 },
  heart:  { name:'Heart',  icon:'💛', type:'treat', value:1 },
  ball:   { name:'Ball',   icon:'🎾', type:'toy',   value:2 },
  flower: { name:'Flower', icon:'🌸', type:'treat', value:1 },
  fish:   { name:'Fish',   icon:'🐟', type:'food',  value:2 },

  // consumables — usable from the hotbar
  biscuit:{ name:'Biscuit', icon:'🍪', type:'consumable', value:3, heal:4 },  // heals 2 hearts
  ribbon: { name:'Ribbon',  icon:'🎀', type:'wearable',   value:5, slot:'head', render:'ribbon' },

  // wearables — sold by Fenwick the Tailor; shown on the dog when equipped
  tophat:  { name:'Top Hat',    icon:'🎩', type:'wearable', value:8,  slot:'head', render:'tophat' },
  ballcap: { name:'Ball Cap',   icon:'🧢', type:'wearable', value:6,  slot:'head', render:'ballcap' },
  shades:  { name:'Cool Shades',icon:'🕶️', type:'wearable', value:7,  slot:'face', render:'shades' },
  scarf:   { name:'Cozy Scarf', icon:'🧣', type:'wearable', value:6,  slot:'neck', render:'scarf' },
  raincoat:{ name:'Rain Coat',  icon:'🧥', type:'wearable', value:9,  slot:'body', render:'raincoat' },
  cape:    { name:'Hero Cape',  icon:'🦸', type:'wearable', value:10, slot:'back', render:'cape' },

  // rocky-mountain wearables — sold by Rusk the Ranger on level 2
  beanie:     { name:'Wool Beanie',   icon:'🧶', type:'wearable',   value:6, slot:'head', render:'beanie' },
  snowgoggles:{ name:'Snow Goggles',  icon:'🥽', type:'wearable',   value:8, slot:'face', render:'snowgoggles' },
  trailmix:   { name:'Trail Mix',     icon:'🥜', type:'consumable', value:4, heal:6 },  // heals 3 hearts
};

const Items = {
  all: ITEMS_DATA,
  get(id){ return ITEMS_DATA[id] || null; },
  list(){ return Object.keys(ITEMS_DATA).map(id => Object.assign({ id }, ITEMS_DATA[id])); },
};

// ===== src/data/campaign.js =====
// ====================== CAMPAIGN (data) ======================
// The overall journey shown on the world map (world-map.js). The game is organised into
// ENVIRONMENTS (biomes). The long-term design is that each environment holds 3 normal
// levels + 1 boss "mini-level" (kind:'boss'); clearing the boss unlocks the next biome.
//
// Only levels with `real:true` are actually registered/playable right now (see
// levels/*.js); everything else is a placeholder so the map can preview the road ahead
// as "coming soon". To ship a new level: build it in src/levels/, register it, then flip
// its placeholder entry here to `real:true` and give it the matching id.
//
// For testing, the meadow currently leads straight to the mountains (meadow.next →
// 'rocky'), so the two real levels sit as the first node of the first two environments.

const Campaign = {
  environments: [
    { id:'meadow', name:'Sunny Meadows', icon:'🌳', color:'#9ED87A', boss:'The Badger Baron',
      levels:[
        { id:'meadow',      name:'Sunny Meadow',    kind:'level', real:true },
        { id:'meadow-2',    name:'Wildflower Field', kind:'level', real:true },
        { id:'meadow-3',    name:'Old Orchard Path', kind:'level', real:true },
        { id:'meadow-boss', name:'The Badger Baron',  kind:'boss' },
      ] },
    { id:'mountains', name:'Rocky Mountains', icon:'⛰️', color:'#A6A29B', boss:'The Alpha Wolf',
      levels:[
        { id:'rocky',       name:'Rocky Mountains', kind:'level', real:true },
        { id:'rocky-2',     name:'Frozen Pass',     kind:'level' },
        { id:'rocky-3',     name:'Cliffside Climb',  kind:'level' },
        { id:'rocky-boss',  name:'The Alpha Wolf',   kind:'boss' },
      ] },
    { id:'woods', name:'Whispering Woods', icon:'🌲', color:'#6FA86A', boss:'The Old Grizzly',
      levels:[
        { id:'woods-1', name:'Mossy Trail',   kind:'level' },
        { id:'woods-2', name:'Fungus Hollow', kind:'level' },
        { id:'woods-3', name:'Firefly Grove', kind:'level' },
        { id:'woods-boss', name:'The Old Grizzly', kind:'boss' },
      ] },
    { id:'cove', name:'Seashell Cove', icon:'🏖️', color:'#F0D9A8', boss:'The Giant Hermit Crab',
      levels:[
        { id:'cove-1', name:'Tide Pools',     kind:'level' },
        { id:'cove-2', name:'Palm Boardwalk', kind:'level' },
        { id:'cove-3', name:'Coral Sands',    kind:'level' },
        { id:'cove-boss', name:'The Giant Hermit Crab', kind:'boss' },
      ] },
    { id:'orchard', name:'Amber Orchard', icon:'🍂', color:'#E0A85A', boss:'The Scarecrow King',
      levels:[
        { id:'orchard-1', name:'Pumpkin Patch', kind:'level' },
        { id:'orchard-2', name:'Haybale Maze',  kind:'level' },
        { id:'orchard-3', name:'Cider Mill',    kind:'level' },
        { id:'orchard-boss', name:'The Scarecrow King', kind:'boss' },
      ] },
    { id:'dunes', name:'Golden Dunes', icon:'🏜️', color:'#E8C87A', boss:'The Sand Serpent',
      levels:[
        { id:'dunes-1', name:'Dune Sea',      kind:'level' },
        { id:'dunes-2', name:'Hidden Oasis',  kind:'level' },
        { id:'dunes-3', name:'Ancient Ruins', kind:'level' },
        { id:'dunes-boss', name:'The Sand Serpent', kind:'boss' },
      ] },
    { id:'tundra', name:'Frostfang Tundra', icon:'❄️', color:'#CFE0EC', boss:'The Ice Yeti',
      levels:[
        { id:'tundra-1', name:'Icy Flats',    kind:'level' },
        { id:'tundra-2', name:'Aurora Fields', kind:'level' },
        { id:'tundra-3', name:'Glacier Cave',  kind:'level' },
        { id:'tundra-boss', name:'The Ice Yeti', kind:'boss' },
      ] },
    { id:'sky', name:'Cloud Kingdom', icon:'☁️', color:'#C9BEF0', boss:'The Storm Eagle',
      levels:[
        { id:'sky-1', name:'Sky Steps',      kind:'level' },
        { id:'sky-2', name:'Floating Isles', kind:'level' },
        { id:'sky-3', name:'Storm Peak',     kind:'level' },
        { id:'sky-boss', name:'The Storm Eagle', kind:'boss' },
      ] },
  ],

  // Which environment (index) owns a given level id (0 if not found).
  envIndexOfLevel(levelId){
    for(let i=0;i<this.environments.length;i++){
      if(this.environments[i].levels.some(l=>l.id===levelId)) return i;
    }
    return 0;
  },
};

// Campaign progress: which level ids the player has cleared this run. Persisted in the
// save (save.js) and reset when starting a brand-new game (charselect resetGame).
const Progress = {
  completed: {},
  markComplete(id){ if(id) this.completed[id] = true; },
  isDone(id){ return !!this.completed[id]; },
  reset(){ this.completed = {}; },
  countDone(ids){ return ids.filter(id => this.completed[id]).length; },
};

// ===== src/inventory.js =====
// ====================== INVENTORY ======================
// A per-player bag stored as a FIXED, positional array of slots on p.inventory. Each
// slot is null or { id, qty }. Positions are stable, which is what lets the UI drag,
// reorder, and pin items to specific cells. The first HOTBAR slots are the numeric
// quick-slots (keys 1..N) and are mirrored by the always-on hotbar.
//
// Capacity is fixed (CAP), so a full bag refuses new pickups. `treats` (world.js) stays
// the delivery currency; the inventory is the general item store. The classic
// add/remove/count/has API is preserved so shop, wearables, and pickup code keep working;
// slot-aware ops (at/removeAt/moveSlot) back the drag-and-drop layer.

const Inventory = {
  CAP: 24,          // total slots (6 columns × 4 rows)
  HOTBAR: 6,        // first row = numeric quick-slots
  MAX_STACK: 99,

  create(){ return new Array(this.CAP).fill(null); },

  // Guarantee p.inventory is a CAP-length slot array (also migrates legacy {id:qty} maps
  // and older-length arrays from saves), and return it.
  cells(p){
    let inv = p.inventory;
    if(!Array.isArray(inv)){
      const arr = this.create();
      if(inv && typeof inv === 'object'){ // migrate legacy { id: qty }
        let i=0; for(const id in inv){ if(i>=arr.length) break; arr[i++] = { id, qty: inv[id] }; }
      }
      inv = p.inventory = arr;
    } else if(inv.length !== this.CAP){
      while(inv.length < this.CAP) inv.push(null);
      inv.length = this.CAP;
    }
    return inv;
  },

  at(p, idx){ return this.cells(p)[idx] || null; },
  emptyIndex(p){ return this.cells(p).findIndex(c => !c); },
  isFull(p){ return this.emptyIndex(p) < 0; },

  // How many more of `id` will fit (partial stacks of that id + empty slots).
  roomFor(p, id){
    let room = 0;
    for(const c of this.cells(p)){
      if(!c) room += this.MAX_STACK;
      else if(c.id === id) room += (this.MAX_STACK - c.qty);
    }
    return room;
  },

  // Add n of id: top up matching stacks first, then fill empty slots. Returns the
  // amount actually added (may be < n if the bag fills up).
  add(p, id, n=1){
    const cells = this.cells(p); let left = n;
    for(const c of cells){ if(left<=0) break; if(c && c.id===id && c.qty<this.MAX_STACK){ const a=Math.min(this.MAX_STACK-c.qty,left); c.qty+=a; left-=a; } }
    for(let i=0;i<cells.length && left>0;i++){ if(!cells[i]){ const a=Math.min(this.MAX_STACK,left); cells[i]={id,qty:a}; left-=a; } }
    return n - left;
  },

  count(p, id){ return this.cells(p).reduce((s,c)=> s + (c && c.id===id ? c.qty : 0), 0); },
  has(p, id, n=1){ return this.count(p, id) >= n; },

  // Remove n of id, taking from the back so front/hotbar stacks are preserved.
  remove(p, id, n=1){
    const cells = this.cells(p); let left = n;
    for(let i=cells.length-1;i>=0 && left>0;i--){ const c=cells[i]; if(c && c.id===id){ const t=Math.min(c.qty,left); c.qty-=t; left-=t; if(c.qty<=0) cells[i]=null; } }
    return left < n;   // true if anything was removed
  },

  // Remove up to n from a specific slot; returns { id, qty } taken (or null).
  removeAt(p, idx, n=1){
    const cells=this.cells(p), c=cells[idx];
    if(!c) return null;
    const t=Math.min(c.qty, n), id=c.id;
    c.qty-=t; if(c.qty<=0) cells[idx]=null;
    return { id, qty:t };
  },
  setAt(p, idx, cell){ this.cells(p)[idx] = cell; },

  // Move / swap / merge slot `from` → `to` (drag reorder).
  moveSlot(p, from, to){
    if(from===to) return;
    const cells=this.cells(p), a=cells[from], b=cells[to];
    if(!a) return;
    if(b && a.id===b.id){ const mv=Math.min(this.MAX_STACK-b.qty, a.qty); b.qty+=mv; a.qty-=mv; if(a.qty<=0) cells[from]=null; }
    else { cells[to]=a; cells[from]=b; }
  },

  // Non-empty slots as [{idx,id,qty,def}] (compat helper for aggregate callers).
  list(p){
    const out=[]; this.cells(p).forEach((c,idx)=>{ if(c) out.push({ idx, id:c.id, qty:c.qty, def:Items.get(c.id) }); });
    return out;
  },
  total(p){ return this.cells(p).reduce((s,c)=> s + (c?c.qty:0), 0); },
};

// ===== src/quests.js =====
// ====================== QUESTS ======================
// Lightweight, data-driven quest system for NPCs. An NPC becomes a quest-giver simply by
// carrying a `quest` object (see the shape below); the NPC draw shows a yellow "!" when a
// quest is available or ready to hand in, and the dialog panel (ui.js) walks the player
// through offer → progress → turn-in. Quest state lives on the NPC entity, so it rides
// along in save/load like any other entity data.
//
// Adding a NEW quest TYPE = add an entry to `Quests.TYPES` implementing summary/canComplete/
// remaining/take. The "give" type (bring N of an item) is the first; talk-to / fetch-from /
// cheer-N / defeat-N types can slot in later without touching the NPC or dialog code.
//
// Quest object shape (on npc.quest):
//   { id, type:'give', give:{ item:'bone', count:3 },
//     offer, ready, progress, done,          // optional dialog strings (defaults generated)
//     reward:{ treats:6 }  |  { item:'ribbon', count:1 },   // optional
//     state }                                // 'available' → 'active' → 'done' (managed here)

const Quests = {
  TYPES: {
    give: {
      summary(q){ const d=Items.get(q.give.item); return `${q.give.count} ${d?d.icon+' '+d.name:q.give.item}`; },
      have(q,p){ return Inventory.count(p, q.give.item); },
      remaining(q,p){ return Math.max(0, q.give.count - Inventory.count(p, q.give.item)); },
      canComplete(q,p){ return Inventory.count(p, q.give.item) >= q.give.count; },
      take(q,p){ Inventory.remove(p, q.give.item, q.give.count); },
    },
  },

  _t(q){ return this.TYPES[(q && q.type)] || this.TYPES.give; },
  stateOf(q){ return (q && q.state) || 'available'; },
  summary(q){ return this._t(q).summary(q); },
  canComplete(q,p){ return this.stateOf(q)==='active' && !!p && this._t(q).canComplete(q,p); },

  // What mark floats over the NPC's head: 'available' / 'ready' (yellow !), 'active' (grey ?),
  // or null (nothing — quest done). "ready" means some active player can hand it in now.
  indicator(e){
    const q=e && e.quest; if(!q) return null;
    const st=this.stateOf(q);
    if(st==='available') return 'available';
    if(st==='done') return null;
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    return players.some(p=>this._t(q).canComplete(q,p)) ? 'ready' : 'active';
  },

  accept(q){
    if(this.stateOf(q)!=='available') return;
    q.state='active';
    if(typeof showToast==='function') showToast(`📜 New task: bring ${this.summary(q)}`, 2600);
  },

  progressText(q,p){
    const rem=this._t(q).remaining(q,p);
    if(q.progress) return q.progress.replace('{remaining}', rem);
    return `You still need ${rem} more — bring me ${this.summary(q)}.`;
  },

  // Hand in the quest: consume the requirement, grant any reward, mark done. Returns a short
  // reward description (e.g. "+6 treats") for the thank-you line, or '' if none.
  complete(q,p){
    const t=this._t(q);
    if(this.stateOf(q)!=='active' || !t.canComplete(q,p)) return '';
    t.take(q,p);
    q.state='done';
    let rewardStr='';
    const r=q.reward;
    if(r && r.treats){ p.treats=(p.treats||0)+r.treats; rewardStr=`+${r.treats} treats`; }
    else if(r && r.item){ const n=r.count||1; Inventory.add(p, r.item, n); const d=Items.get(r.item); rewardStr=`+${n} ${d?d.icon+' '+d.name:r.item}`; }
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#FFD93D', 18);
    if(typeof showToast==='function') showToast(`✅ Task complete!${rewardStr?' '+rewardStr:''}`, 2600);
    return rewardStr;
  },
};

// ===== src/health.js =====
// ====================== HEALTH ======================
// Per-player hit points. `p.hp` / `p.maxHp` are seeded from the breed (data/breeds.js)
// in makePlayer(). The convention across the game is 1 heart icon = 2 hp, so the HUD
// heart bar (UI.renderHearts) derives its heart count from maxHp/2 and each heart's
// state (full / shrunk / empty-black-dot) from the remaining hp in that pair.
//
// This is the seam for anything that hurts or heals a dog: enemies call Health.damage,
// consumables (biscuit) call Health.heal. `hurtTimer` drives a brief red flash on the
// sprite so a hit reads clearly.

const Health = {
  HEART_HP: 2,   // hp represented by one full heart icon

  // Whole + partial heart count for a max hp total (used to lay out the bar).
  heartsFor(maxHp){ return Math.ceil((maxHp||0) / this.HEART_HP); },

  damage(p, n){
    if(!p || p.dead || p.hp<=0) return;
    p.hp = Math.max(0, p.hp - n);
    p.hurtTimer = 260;                 // ms of red flash
    if(typeof updateHUD==='function') updateHUD();
    if(p.hp<=0) this.onDown(p);
  },

  heal(p, n){
    if(!p || p.dead) return 0;         // a fainted dog can't be healed back to life
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if(typeof updateHUD==='function') updateHUD();
    return p.hp - before;              // amount actually restored
  },

  isDown(p){ return p && (p.dead || p.hp<=0); },

  // Fainting: the dog goes down and STAYS down for the rest of the level — a grave marks
  // the spot and a sad sound plays. In co-op the surviving dog plays on; fallen dogs are
  // revived when the next level loads (LevelManager.goTo). Only once EVERY active dog is
  // down does the run end on the Game Over screen (Play Again / Main Menu).
  onDown(p){
    if(!p || p.dead) return;             // already fainted — don't grave twice
    p.dead = true;
    p.moving = false; p.howling = false; p.swimming = false;
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#8899AA', 22);
    if(typeof Entities!=='undefined' && Entities.def && Entities.def('grave')){
      Entities.spawn('grave', { x:p.x, y:p.y, forPlayer:p.id });
    }
    if(typeof sfxDeath==='function') sfxDeath();
    if(typeof showToast==='function'){
      const who = (Game.twoPlayer) ? `P${p.id}'s dog` : 'Your dog';
      showToast(`🪦 ${who} fainted...`, 1800);
    }
    if(typeof updateHUD==='function') updateHUD();

    // Everyone down? Then it's game over.
    const anyAlive = Game.players.some(pp => pp && !pp.dead);
    if(!anyAlive && typeof UI!=='undefined' && UI.gameOver){ UI.gameOver(p); }
  },

  // Decay the per-frame hurt flash.
  tick(p, dt){ if(p && p.hurtTimer>0) p.hurtTimer=Math.max(0, p.hurtTimer-dt); },
};

// ===== src/wearables.js =====
// ====================== WEARABLES ======================
// Equippable cosmetics. Each wearable item (data/items.js, type:'wearable') has a
// `slot` (head/face/neck/body/back) and a `render` key into this module's draw table.
// A player wears at most one item per slot, stored in `p.equipment = { slot: itemId }`.
//
// Equipping moves an item bag → slot (any item already in that slot returns to the bag);
// unequipping moves it back. The render half draws the worn items ON the dog: drawBack()
// runs behind the breed sprite (capes), drawFront() runs on top (hats, scarves, coats).
// Both take a plain graphics context + an `anchor` describing where the dog's head/body
// sit, so the SAME code paints the live world dog (dog-sprite.js) and the inventory
// paper-doll preview (ui.js).

// Local pixel helper (mirrors the global px(), but on an explicit context so it works
// for the off-screen paper-doll canvas too).
function _wpx(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }

const Wearables = {
  SLOTS: ['head','face','neck','body','back'],
  SLOT_LABEL: { head:'Head', face:'Face', neck:'Neck', body:'Body', back:'Back' },

  slotOf(id){ const d=Items.get(id); return d && d.slot; },
  isWearable(id){ const d=Items.get(id); return !!(d && d.type==='wearable'); },
  equipped(p, slot){ return (p.equipment && p.equipment[slot]) || null; },

  // Equip a bag item into its slot; whatever was in that slot returns to the bag.
  equip(p, id){
    const slot=this.slotOf(id);
    if(!slot || !Inventory.has(p, id)) return false;
    const eq = p.equipment || (p.equipment = {});
    const prev = eq[slot];
    Inventory.remove(p, id, 1);
    if(prev) Inventory.add(p, prev, 1);
    eq[slot]=id;
    return true;
  },

  unequip(p, slot){
    const eq=p.equipment; if(!eq || !eq[slot]) return false;
    if(Inventory.roomFor(p, eq[slot]) < 1) return false;   // nowhere to put it — bag full
    Inventory.add(p, eq[slot], 1);
    delete eq[slot];
    return true;
  },

  // ---- slot-aware variants for drag & drop ----
  // Equip the item in bag slot `idx` into wearable slot `wslot`; the previously-worn
  // item drops back into the freed bag slot (or the bag). Returns true on success.
  equipFromSlot(p, idx, wslot){
    const cell=Inventory.at(p, idx); if(!cell) return false;
    const def=Items.get(cell.id);
    if(!def || def.type!=='wearable' || def.slot!==wslot) return false;
    const eq = p.equipment || (p.equipment={});
    const prev = eq[wslot];
    Inventory.removeAt(p, idx, 1);
    eq[wslot]=cell.id;
    if(prev){
      if(!Inventory.at(p, idx)) Inventory.setAt(p, idx, { id:prev, qty:1 });
      else Inventory.add(p, prev, 1);
    }
    return true;
  },

  // Unequip wearable slot `wslot` into bag slot `idx`. If that bag slot holds a matching
  // wearable it swaps; otherwise falls back to any free bag space.
  unequipToSlot(p, wslot, idx){
    const eq=p.equipment; const id=eq && eq[wslot]; if(!id) return false;
    const target=Inventory.at(p, idx);
    if(!target){ Inventory.setAt(p, idx, { id, qty:1 }); delete eq[wslot]; return true; }
    if(target.id===id && target.qty<Inventory.MAX_STACK){ target.qty++; delete eq[wslot]; return true; }
    const tdef=Items.get(target.id);
    if(tdef && tdef.type==='wearable' && tdef.slot===wslot){   // swap the two wearables
      Inventory.removeAt(p, idx, 1);
      Inventory.setAt(p, idx, { id, qty:1 });
      eq[wslot]=target.id;
      return true;
    }
    return this.unequip(p, wslot);                            // occupied → send to bag
  },

  // ---- rendering ----
  // Build the anchor used by both the world dog and the paper-doll. `x` is the dog's
  // horizontal centre; `foot` is its baseline (`by` in drawDog). Head/face/neck/body
  // offsets are tuned to the shared breed silhouette.
  anchor(x, foot, dir, equipment, t){
    return { x, headY:foot-18, faceY:foot-11, neckY:foot-2, bodyY:foot+1, dir, t, equipment };
  },

  drawBack(g, a){
    const eq=a.equipment; if(!eq) return;
    if(eq.back) this._paint(g, eq.back, a);   // capes sit behind the dog
  },
  drawFront(g, a){
    const eq=a.equipment; if(!eq) return;
    ['body','neck','head','face'].forEach(slot=>{ if(eq[slot]) this._paint(g, eq[slot], a); });
  },
  _paint(g, id, a){
    const def=Items.get(id); if(!def) return;
    const fn=this._render[def.render];
    if(fn) fn(g, a, id);
  },

  // dir → horizontal nudge for head-mounted items
  _hdx(dir){ return dir==='right'?3 : dir==='left'?-3 : 0; },

  _render:{
    tophat(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-9, y+3, 18, 2, '#15130F');   // brim
      _wpx(g, x-6, y-6, 12, 9, '#26231C');   // crown
      _wpx(g, x-6, y-6, 12, 2, '#34302A');   // top highlight
      _wpx(g, x-6, y+1, 12, 2, '#8B2033');   // red band
    },
    ballcap(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-6, y-2, 12, 6, '#C0392B');   // dome
      _wpx(g, x-6, y-4, 12, 3, '#D9503E');   // crown top
      _wpx(g, x-2, y-5, 5, 2, '#D9503E');
      // brim points the way the dog faces
      if(a.dir==='right')      _wpx(g, x+5, y+3, 8, 2, '#9E2A1E');
      else if(a.dir==='left')  _wpx(g, x-13, y+3, 8, 2, '#9E2A1E');
      else                     _wpx(g, x-4, y+4, 8, 2, '#9E2A1E');
    },
    ribbon(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY+2;
      _wpx(g, x-5, y, 3, 4, '#FF6FA5');      // left loop
      _wpx(g, x+2, y, 3, 4, '#FF6FA5');      // right loop
      _wpx(g, x-1, y, 2, 4, '#E24C86');      // knot
      _wpx(g, x-6, y-1, 2, 2, '#FF97C0'); _wpx(g, x+4, y-1, 2, 2, '#FF97C0');
    },
    shades(g,a){
      if(a.dir==='up') return;               // eyes hidden facing away
      const y=a.faceY;
      if(a.dir==='right'){ _wpx(g, a.x+3, y, 6, 3, '#111'); _wpx(g, a.x+8, y+1, 1, 1, '#111'); }
      else if(a.dir==='left'){ _wpx(g, a.x-9, y, 6, 3, '#111'); _wpx(g, a.x-9, y+1, 1, 1, '#111'); }
      else { _wpx(g, a.x-6, y, 5, 3, '#111'); _wpx(g, a.x+1, y, 5, 3, '#111'); _wpx(g, a.x-1, y+1, 2, 1, '#111'); }
    },
    scarf(g,a){
      const y=a.neckY;
      _wpx(g, a.x-8, y, 16, 4, '#2E7D5B');   // wrap
      _wpx(g, a.x-8, y+1, 16, 1, '#F0E6C8'); // knit stripe
      const dx = a.dir==='left'? -9 : 5;     // dangling tail
      _wpx(g, a.x+dx, y+2, 3, 7, '#2E7D5B');
      _wpx(g, a.x+dx, y+5, 3, 1, '#F0E6C8');
    },
    raincoat(g,a){
      const y=a.bodyY;
      _wpx(g, a.x-10, y, 20, 11, '#F2C94C'); // coat body
      _wpx(g, a.x-10, y, 20, 2, '#E0B23C');  // collar shade
      _wpx(g, a.x-1, y+2, 2, 2, '#8A6D1A');  // buttons
      _wpx(g, a.x-1, y+6, 2, 2, '#8A6D1A');
      _wpx(g, a.x-10, y+9, 20, 2, '#D9A82E');// hem
    },
    cape(g,a){
      const y=a.bodyY;
      _wpx(g, a.x-9, y-2, 18, 12, '#B03040'); // cloth
      _wpx(g, a.x-9, y-2, 18, 3, '#D04A5A');  // shoulder collar
      _wpx(g, a.x-9, y+10, 5, 3, '#8C2434');  // ragged hem
      _wpx(g, a.x-1, y+10, 5, 3, '#8C2434');
      _wpx(g, a.x+6, y+10, 3, 3, '#8C2434');
    },
    beanie(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-7, y-1, 14, 4, '#8A3B3B');   // knit band
      _wpx(g, x-6, y-5, 12, 5, '#B24A4A');   // dome
      _wpx(g, x-6, y-5, 12, 2, '#C86060');   // highlight
      _wpx(g, x-2, y-8, 4, 4, '#E8E0D0');    // pom-pom
    },
    snowgoggles(g,a){
      if(a.dir==='up') return;               // eyes hidden facing away
      const y=a.faceY;
      const lens='#3AA0C8', frame='#2A2E36', strap='#C0463C';
      if(a.dir==='right'){ _wpx(g, a.x+3, y-1, 7, 4, frame); _wpx(g, a.x+4, y, 5, 2, lens); }
      else if(a.dir==='left'){ _wpx(g, a.x-10, y-1, 7, 4, frame); _wpx(g, a.x-9, y, 5, 2, lens); }
      else {
        _wpx(g, a.x-7, y-1, 14, 4, frame);
        _wpx(g, a.x-6, y, 5, 2, lens); _wpx(g, a.x+1, y, 5, 2, lens);
      }
      _wpx(g, a.x-8, y, 2, 2, strap); _wpx(g, a.x+6, y, 2, 2, strap); // strap peeking out
    },
  },
};

// ===== src/audio.js =====
// ====================== AUDIO ENGINE ======================
let audioCtx=null, bgGain=null, bgNodes=[], musicStarted=false;
function getAudio(){
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    bgGain=audioCtx.createGain(); bgGain.gain.value=0.38;
    bgGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function osc(ac,type,freq,gainVal,dest,startT,dur,fadeOut=true){
  const o=ac.createOscillator(),g=ac.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,startT);
  g.gain.setValueAtTime(gainVal,startT);
  if(fadeOut) g.gain.linearRampToValueAtTime(0,startT+dur);
  o.connect(g); g.connect(dest); o.start(startT); o.stop(startT+dur+0.02);
}
function noteHz(n){ return 440*Math.pow(2,(n-69)/12); }
const N={
  C3:48,D3:50,E3:52,F3:53,G3:55,A3:57,Bb3:58,B3:59,
  C4:60,D4:62,E4:64,F4:65,G4:67,A4:69,Bb4:70,B4:71,
  C5:72,D5:74,Eb5:75,E5:76,F5:77,G5:79,A5:81,Bb5:82,B5:83,C6:84
};

// ---------- SOUNDTRACKS ----------
// Each voice is a list of [note, beats]; note===0 is a rest. The melody's total
// length defines the loop; harmony/bass may be shorter (they simply rest out the tail).
const SOUNDTRACKS={
  meadow:{
    name:'Cozy Meadow', beat:0.32,
    melody:[[N.E5,1],[N.G5,1],[N.A5,2],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.E5,1],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.C5,1],[N.E5,1],[N.G5,2],[N.A5,1],[N.G5,1],[N.A5,1],[N.G5,1],[N.E5,1],[N.D5,1],[N.C5,1],[N.D5,2],[N.C5,4]],
    harmony:[[N.C4,4],[N.A4,4],[N.G4,4],[N.C4,4],[N.A4,4],[N.C5,4],[N.G4,4],[N.C4,4]],
    bass:[[N.C3,2],[N.C3,2],[N.G3,2],[N.C3,2],[N.C3,2],[N.G3,2],[N.C3,2],[N.G3,2]],
  },
  dogs:{
    name:'Who Let the Dogs Out', beat:0.30,
    // Call: "Who let the dogs out?"  Response: staccato "woof woof woof woof"
    melody:[
      [N.C5,1],[N.C5,0.5],[N.C5,0.5],[N.A4,1],[N.C5,1],      // who let the dogs out
      [N.C5,0.5],[N.C5,0.5],[N.C5,0.5],[N.C5,0.5],[0,1],      // woof woof woof woof
      [N.C5,1],[N.C5,0.5],[N.C5,0.5],[N.A4,1],[N.C5,1],      // who let the dogs out
      [N.A4,0.5],[N.A4,0.5],[N.G4,0.5],[N.A4,0.5],[N.C5,1],   // who who who who — out!
    ],
    harmony:[[N.E4,2],[N.F4,2],[N.C4,3],[N.E4,2],[N.F4,2],[N.C4,3]],
    bass:[[N.A3,1],[0,1],[N.A3,1],[N.F3,1],[N.C3,2],[N.G3,1],[N.A3,1],[0,1],[N.A3,1],[N.F3,1],[N.C3,2],[N.G3,1]],
  },
  sunset:{
    name:'Sleepy Sunset', beat:0.44,
    melody:[[N.G4,2],[N.C5,2],[N.E5,2],[N.D5,2],[N.C5,2],[N.A4,2],[N.G4,3],[0,1]],
    harmony:[[N.C4,4],[N.F4,4],[N.A4,4],[N.G4,4]],
    bass:[[N.C3,4],[N.F3,4],[N.A3,4],[N.G3,4]],
  },
  zoomies:{
    name:'Puppy Zoomies', beat:0.19,
    melody:[
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,1],[N.G5,1],[N.E5,1],[N.G5,1],[N.E5,1],
      [N.D5,1],[N.F5,1],[N.A5,1],[N.F5,1],[N.E5,1],[N.C5,1],[N.C5,1],[0,1],
    ],
    harmony:[[N.C4,2],[N.G4,2],[N.F4,2],[N.G4,2],[N.C4,2],[N.G4,2],[N.F4,2],[N.G4,2]],
    bass:[[N.C3,1],[N.C3,1],[N.G3,1],[N.G3,1],[N.F3,1],[N.F3,1],[N.G3,1],[N.G3,1],[N.C3,1],[N.C3,1],[N.G3,1],[N.G3,1],[N.F3,1],[N.F3,1],[N.G3,1],[N.G3,1]],
  },
};
const SOUNDTRACK_KEYS=Object.keys(SOUNDTRACKS);
let currentTrack='meadow';

function patLen(pat,beat){ return pat.reduce((s,[,b])=>s+b,0)*beat; }
function playVoice(ac,dest,pattern,beat,st,gainVal,type,octave){
  let t=st;
  pattern.forEach(([note,beats])=>{
    const d=beats*beat;
    if(note){
      osc(ac,type,noteHz(note),gainVal,dest,t,d*0.85);
      if(octave) osc(ac,'sine',noteHz(note)*2,gainVal*0.24,dest,t,d*0.6);
    }
    t+=d;
  });
}
function scheduleMusicLoop(st){
  const ac=getAudio();
  const trk=SOUNDTRACKS[currentTrack]||SOUNDTRACKS.meadow;
  const beat=trk.beat;
  const mg=ac.createGain(); mg.gain.value=0.55; mg.connect(bgGain);
  const hg=ac.createGain(); hg.gain.value=0.18; hg.connect(bgGain);
  const bg=ac.createGain(); bg.gain.value=0.22; bg.connect(bgGain);
  playVoice(ac,mg,trk.melody,beat,st,0.5,'triangle',true);
  playVoice(ac,hg,trk.harmony,beat,st,0.6,'sine',false);
  playVoice(ac,bg,trk.bass,beat,st,0.9,'sine',false);
  const loopLen=patLen(trk.melody,beat);
  const ns=st+loopLen, delay=Math.max(0,(ns-loopLen*0.15-ac.currentTime)*1000);
  bgNodes.push(setTimeout(()=>scheduleMusicLoop(ns),delay));
}
function startMusic(){ if(musicStarted)return; musicStarted=true; const ac=getAudio(); if(ac.state==='suspended')ac.resume(); scheduleMusicLoop(ac.currentTime+0.1); }
function stopMusic(){ bgNodes.forEach(clearTimeout); bgNodes=[]; musicStarted=false; }

// Play a short taste of a track (used when picking one in the menu, before the game starts)
let previewNodes=[];
function previewSoundtrack(key){
  const trk=SOUNDTRACKS[key]; if(!trk)return;
  const ac=getAudio(); if(ac.state==='suspended')ac.resume();
  previewNodes.forEach(clearTimeout); previewNodes=[];
  const pg=ac.createGain(); pg.gain.value=0.4; pg.connect(ac.destination);
  let t=ac.currentTime+0.05;
  trk.melody.slice(0,8).forEach(([note,beats])=>{
    const d=beats*trk.beat;
    if(note) osc(ac,'triangle',noteHz(note),0.5,pg,t,d*0.9);
    t+=d;
  });
}
function setSoundtrack(key){
  if(!SOUNDTRACKS[key])return;
  currentTrack=key;
  if(musicStarted){ stopMusic(); startMusic(); } // swap live if a game is in progress
}
function cycleSoundtrack(){
  const i=SOUNDTRACK_KEYS.indexOf(currentTrack);
  const next=SOUNDTRACK_KEYS[(i+1)%SOUNDTRACK_KEYS.length];
  setSoundtrack(next);
  previewSoundtrack(next);
  return next;
}
function currentTrackName(){ return SOUNDTRACKS[currentTrack].name; }

function sfxCollect(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); osc(ac,'sine',noteHz(N.G5),0.35,ac.destination,t,0.08); osc(ac,'sine',noteHz(N.C5+12),0.25,ac.destination,t+0.07,0.1); }
function sfxDeliver(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.3,ac.destination,t+i*0.1,0.18)); }
function sfxCheer(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5,N.C5+12].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.4,ac.destination,t+i*0.12,0.25)); osc(ac,'sine',noteHz(N.G5),0.3,ac.destination,t+0.5,0.4); }
function sfxHowl(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); const o=ac.createOscillator(),g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(noteHz(N.A4),t); o.frequency.linearRampToValueAtTime(noteHz(N.A5),t+0.5); g.gain.setValueAtTime(0.2,t); g.gain.linearRampToValueAtTime(0,t+0.55); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.6); }
// Sad "aww" when a dog faints — a downward trombone-ish slide with a low bell tail.
// Does NOT stop the music (a co-op partner may still be playing).
function sfxDeath(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume();
  const o=ac.createOscillator(), g=ac.createGain();
  o.type='sawtooth';
  o.frequency.setValueAtTime(noteHz(N.E4),t);
  o.frequency.exponentialRampToValueAtTime(noteHz(N.C3),t+0.7);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.26,t+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.8);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.85);
  osc(ac,'sine',noteHz(N.C3),0.16,ac.destination,t+0.1,0.7);
}
function sfxWin(){ stopMusic(); const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [[N.C4,0,.25],[N.E4,.2,.25],[N.G4,.4,.25],[N.C5,.6,.5],[N.E5,.9,.5],[N.G5,1.15,.5],[N.C5+12,1.5,.9]].forEach(([n,d,du])=>{ osc(ac,'triangle',noteHz(n),.45,ac.destination,t+d,du); osc(ac,'sine',noteHz(n)*2,.15,ac.destination,t+d,du*.6); }); [0,.15,.3,.45,.65,.85].forEach((d,i)=>osc(ac,'sine',noteHz(N.C5+12+i*2),.12,ac.destination,t+1.8+d,.18)); [N.C4,N.E4,N.G4,N.C5].forEach(n=>osc(ac,'sine',noteHz(n),.3,ac.destination,t+2.5,1.5)); }

// ===== src/world.js =====
// ====================== WORLD ======================
// World dimensions are `let` so a level can resize the world on load (LevelManager);
// the viewport is fixed. All references read these dynamically.
let WORLD_W=1920, WORLD_H=1280;
const VIEW_W=640, VIEW_H=416;
const cam={x:0,y:0};
function updateCamera(){
  // Follow the living dogs so the view doesn't sit on a grave while a co-op partner is
  // still exploring. If everyone is down, keep the framing on p1 (the death frame).
  const active=twoPlayer?[p1,p2]:[p1];
  const alive=active.filter(p=>!p.dead);
  const focus=alive.length?alive:active;
  let tx,ty;
  if(focus.length>1){ tx=(focus[0].x+focus[1].x)/2; ty=(focus[0].y+focus[1].y)/2; }
  else { tx=focus[0].x; ty=focus[0].y; }
  cam.x=Math.max(0,Math.min(WORLD_W-VIEW_W,tx-VIEW_W/2));
  cam.y=Math.max(0,Math.min(WORLD_H-VIEW_H,ty-VIEW_H/2));
}

// Scene flow now lives in Game.state (see core/state.js); twoPlayer & cheeredCount
// remain the canonical globals that Game delegates to.
let twoPlayer=false,cheeredCount=0;
const CHEER_TOTAL=5;

// Raw key state (`keys`) and listeners moved to core/input.js.

// ---------- HELPERS ----------
function rand(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ---------- COLLIDERS ----------
// Each entry: {x,y,w,h}  — axis-aligned bounding box in world space
const colliders=[];

function addCollider(x,y,w,h){ colliders.push({x,y,w,h}); }

function resolveCollisions(p){
  const PR=10, PT=16; // player collision half-width, and top offset from center
  const pl=p.x-PR, pr=p.x+PR, pt=p.y-PT, pb=p.y+6;
  for(const c of colliders){
    if(pr<c.x||pl>c.x+c.w||pb<c.y||pt>c.y+c.h) continue;
    // overlap — push out on smallest axis
    const ox=Math.min(pr-c.x, c.x+c.w-pl);
    const oy=Math.min(pb-c.y, c.y+c.h-pt);
    if(ox<oy){ p.x+=pr-c.x<=c.x+c.w-pl ? -ox : ox; }
    else      { p.y+=pb-c.y<=c.y+c.h-pt ? -oy : oy; }
  }
  p.x=clamp(p.x,20,WORLD_W-20);
  p.y=clamp(p.y,26,WORLD_H-20);
}

// ---------- WORLD OBJECTS (generated once) ----------
function rand2(ax,ay,bx,by,minDist,existing,tries=40){
  // random point avoiding existing items by minDist
  for(let t=0;t<tries;t++){
    const x=rand(ax,bx),y=rand(ay,by);
    if(existing.every(e=>Math.hypot(e.x-x,e.y-y)>minDist)) return {x,y};
  }
  return {x:rand(ax,bx),y:rand(ay,by)};
}

const worldObjects=[]; // typed world objects with draw info
let river=null; // { pos, width, amplitude, wavelength }

function buildWorld(){
  worldObjects.length=0; colliders.length=0;

  // ---- RIVER (create first so placements can avoid it) ----
  river={
    pos:WORLD_H*0.38,
    amplitude:34, wavelength:560,                 // broad meander
    amplitude2:13, wavelength2:190, phase2:1.7,    // smaller wobble layered on top, less mechanical
    baseWidth:74, widthAmp:22, widthWavelength:430, widthPhase:0.6, // river breathes wider/narrower along its length
  };
  river.pebbles=makeRiverPebbles();

  // ---- Water exclusion helper (hoisted — usable by pond placement below too) ----
  function inWater(x,y,margin){
    if(inRiver(x,y,margin)) return true;
    return worldObjects.some(o=>o.kind==='pond'&&
      ((x-o.x)/(o.w/2+margin))**2+((y-o.y)/(o.h/2+margin))**2<1);
  }
  function safePt(ax,ay,bx,by,minDist,list,margin){
    for(let a=0;a<60;a++){
      const p=rand2(ax,ay,bx,by,minDist,list);
      if(!inWater(p.x,p.y,margin)) return p;
    }
    return rand2(ax,ay,bx,by,minDist,list); // fallback
  }

  // ---- PONDS (also before other objects) — varied sizes & shapes, kept clear of the river ----
  const taken=[];
  const pondShapes=[
    ()=>({w:rand(90,130),  h:rand(80,120)}),   // small & round
    ()=>({w:rand(170,240), h:rand(110,160)}),  // medium oval
    ()=>({w:rand(240,330), h:rand(150,210)}),  // large oval
    ()=>({w:rand(110,150), h:rand(210,280)}),  // tall & narrow
    ()=>({w:rand(260,350), h:rand(90,130)}),   // long & wide
  ];
  for(let i=0;i<5;i++){
    const {w,h}=pondShapes[i%pondShapes.length]();
    // Keep clear of other ponds AND of the river along the pond's whole width (so a wide
    // pond can't overlap the river where its meander bulges toward the bank).
    let p, ok=false;
    for(let a=0;a<90 && !ok; a++){
      p=rand2(140,140,WORLD_W-140,WORLD_H-140,260,taken);
      ok = !inWater(p.x,p.y,Math.max(w,h)/2+24) && ellipseClearOfRiver(p.x,p.y,w,h,22);
    }
    taken.push(p);
    worldObjects.push({kind:'pond',x:p.x,y:p.y,w,h,seed:Math.random()*100,blobSeed:Math.floor(Math.random()*9999)});
  }

  // ---- FENCE border ----
  addCollider(0,0,WORLD_W,14);
  addCollider(0,WORLD_H-14,WORLD_W,14);
  addCollider(0,0,14,WORLD_H);
  addCollider(WORLD_W-14,0,14,WORLD_H);

  // ---- OAK TREES ---- (collider fitted to the trunk + roots at the base, not the canopy)
  for(let i=0;i<22;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,100,taken,55);
    taken.push(p);
    worldObjects.push({kind:'oak',x:p.x,y:p.y,variant:Math.floor(Math.random()*3)});
    addCollider(p.x-7,p.y+19,14,13);
  }

  // ---- PINE TREES ----
  for(let i=0;i<12;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,80,taken,45);
    taken.push(p);
    worldObjects.push({kind:'pine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+15,8,10);
  }

  // ---- ROCKS ---- (only big rocks block; collider hugs the rock's ground footprint)
  for(let i=0;i<18;i++){
    const p=safePt(60,60,WORLD_W-60,WORLD_H-60,60,taken,40);
    taken.push(p);
    const big=Math.random()<0.35;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // ---- ROCK CLUSTERS ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,120,taken,45);
    taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // ---- TALL GRASS patches (no collider) ----
  for(let i=0;i<30;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(30,30,WORLD_W-30,WORLD_H-30,40,taken.filter((_,j)=>j%3===0));
      if(!inWater(p.x,p.y,30)) break;
    }
    worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:Math.random()*100});
  }

  // ---- BUSHES ----
  for(let i=0;i<24;i++){
    const p=safePt(50,50,WORLD_W-50,WORLD_H-50,70,taken,40);
    taken.push(p);
    const variant=Math.floor(Math.random()*2);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant});
    addCollider(p.x-12,p.y+3,24,13);
  }

  // ---- FLOWERS (no collider, kept on dry land) ----
  const flowerHues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF'];
  for(let i=0;i<100;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,WORLD_W-30); fy=rand(30,WORLD_H-30); if(!inWater(fx,fy,4)) break; }
    if(inWater(fx,fy,4)) continue;   // no dry spot found this try — skip rather than float on water
    worldObjects.push({kind:'flower',x:fx,y:fy,
      hue:flowerHues[Math.floor(Math.random()*flowerHues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.3)});
  }

  // ---- WILLOW TREES ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,100,taken,50);
    taken.push(p);
    worldObjects.push({kind:'willow',x:p.x,y:p.y});
    addCollider(p.x-8,p.y+19,16,15);
  }

  // ---- MUSHROOMS ----
  for(let i=0;i<14;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(40,40,WORLD_W-40,WORLD_H-40,30,taken.filter((_,j)=>j%4===0));
      if(!inWater(p.x,p.y,25)) break;
    }
    worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:Math.random()<0.3});
  }

  // ---- MUSHROOM RINGS ----
  for(let i=0;i<4;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,90,taken,45);
    taken.push(p);
    worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:Math.random()*100});
  }

  // ---- CATTAILS / REEDS along the pond shores (no collider) ----
  worldObjects.filter(o=>o.kind==='pond').forEach(pond=>{
    const n=Math.floor(rand(3,6));
    for(let k=0;k<n;k++){
      const ang=rand(0,Math.PI*2);
      worldObjects.push({kind:'cattail', seed:Math.random()*100,
        x:pond.x+Math.cos(ang)*(pond.w/2+rand(2,10)),
        y:pond.y+Math.sin(ang)*(pond.h/2+rand(2,10))});
    }
  });

  // ---- FALLEN LOGS (solid) ----
  for(let i=0;i<5;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,90,taken,40);
    taken.push(p);
    worldObjects.push({kind:'log',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-16,p.y-1,32,9);
  }

  // ---- TREE STUMPS (solid) ----
  for(let i=0;i<5;i++){
    const p=safePt(70,70,WORLD_W-70,WORLD_H-70,80,taken,35);
    taken.push(p);
    worldObjects.push({kind:'stump',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-8,p.y-1,16,10);
  }

  // ---- BUTTERFLIES (animated ambient life, no collider) ----
  const bflyHues=['#FFFFFF','#FFD93D','#FF9E6E','#8FD4E8','#C9A6FF','#FF8FB0'];
  for(let i=0;i<14;i++){
    worldObjects.push({kind:'butterfly', x:rand(60,WORLD_W-60), y:rand(60,WORLD_H-60),
      hue:bflyHues[Math.floor(Math.random()*bflyHues.length)], seed:Math.random()*1000});
  }

  // ---- STONE PATHS ----
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.15,y1:WORLD_H*0.5,x2:WORLD_W*0.85,y2:WORLD_H*0.5,seed:11});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.5,y1:WORLD_H*0.12,x2:WORLD_W*0.5,y2:WORLD_H*0.88,seed:22});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.15,y1:WORLD_H*0.15,x2:WORLD_W*0.22,y2:WORLD_H*0.22,seed:33});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.8,y1:WORLD_H*0.18,x2:WORLD_W*0.88,y2:WORLD_H*0.25,seed:44});

  // ---- BRIDGES over ponds ----
  worldObjects.filter(o=>o.kind==='pond').slice(0,3).forEach((pond,i)=>{
    worldObjects.push({kind:'bridge',x:pond.x,y:pond.y,horizontal:i%2===0,seed:i});
  });

  // ---- RIVER BRIDGES (3 stone crossings, sized to fully span the river at their spot —
  //      drawn separately in main.js so swimmers can pass underneath) ----
  [0.22,0.5,0.78].forEach((fx,i)=>{
    const bx=WORLD_W*fx;
    const span=riverWidthAt(bx)/2+16; // half-length along the crossing, with margin onto both banks
    worldObjects.push({kind:'riverbridge',x:bx,y:riverY(bx),horizontal:false,seed:10+i,span});
  });

  // Sort by y for painter's algorithm
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}
// The world is now built via LevelManager.load() (called from main.js at startup and
// on each game start), not once at module load.

// ---------- COLLECTIBLES ----------
function makeCollectibles(){
  const types=['bone','heart','ball','flower'];
  const items=Array.from({length:24},(_,i)=>({
    x:rand(80,WORLD_W-80), y:rand(80,WORLD_H-80),
    type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2)
  }));
  // fish swimming back and forth along the river
  for(let i=0;i<6;i++){
    const baseX=rand(120,WORLD_W-120);
    items.push({
      type:'fish', taken:false, bob:rand(0,Math.PI*2), dir:1,
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(Math.random()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX)
    });
  }
  return items;
}
let collectibles=[]; // populated by LevelManager.load() → level.generate()

function updateCollectibles(t){
  collectibles.forEach(item=>{
    if(item.taken||item.type!=='fish') return;
    const ang=t/1000*item.speed+item.phase;
    item.x=clamp(item.baseX+Math.sin(ang)*item.range,30,WORLD_W-30);
    item.y=riverY(item.x)+Math.sin(t/260+item.phase)*6;
    item.dir=Math.cos(ang)>=0?1:-1;
  });
}

// ---------- NPC FRIENDS ----------
function makeFriends(){
  return [
    {name:'Cat in the tree', x:280,  y:200,  need:3,given:0,cheered:false,kind:'cat',      msg:"I'm stuck here and lonely... got any treats?"},
    {name:'Lonely Bunny',    x:1580, y:240,  need:3,given:0,cheered:false,kind:'bunny',    msg:"I lost my family's flower patch..."},
    {name:'Sad Bird',        x:300,  y:980,  need:3,given:0,cheered:false,kind:'bird',     msg:"My nest fell apart! Bring me treats?"},
    {name:'Shy Hedgehog',    x:1600, y:1020, need:3,given:0,cheered:false,kind:'hedgehog', msg:"I'm too shy to come out... bring me treats?"},
    {name:'Old Tortoise',    x:960,  y:640,  need:4,given:0,cheered:false,kind:'tortoise', msg:"It's been so quiet around here lately."},
  ];
}
let friends=[]; // populated by LevelManager.load() → level.generate()

// ---------- RIVER / POND helpers ----------
function riverY(x){
  if(!river) return 0;
  return river.pos
    + river.amplitude*Math.sin(x/river.wavelength*Math.PI*2)
    + river.amplitude2*Math.sin(x/river.wavelength2*Math.PI*2+river.phase2);
}

function riverWidthAt(x){
  if(!river) return 0;
  const w=river.baseWidth
    + river.widthAmp*Math.sin(x/river.widthWavelength*Math.PI*2+river.widthPhase)
    + river.widthAmp*0.4*Math.sin(x/(river.widthWavelength*0.37)*Math.PI*2);
  return Math.max(40,w);
}

function makeRiverPebbles(){
  const list=[];
  for(let x=40;x<WORLD_W-40;){
    const w=riverWidthAt(x), cy=riverY(x);
    const side=Math.random()<0.5?-1:1;
    list.push({x, y:cy+side*(w/2+rand(2,9)), big:Math.random()<0.3});
    x+=rand(26,46);
  }
  return list;
}

function inRiver(x,y,margin=0){
  if(!river) return false;
  return Math.abs(y-riverY(x)) < riverWidthAt(x)/2+margin;
}

// True if an elliptical water body (centre cx,cy, size w×h) stays `margin` clear of the
// river across its whole horizontal span. Checking only the centre misses the case where
// the meandering river bulges toward a wide pond's edge, so we sample across the width.
function ellipseClearOfRiver(cx,cy,w,h,margin=20){
  if(!river) return true;
  const steps=8;
  for(let i=0;i<=steps;i++){
    const sx=cx-w/2 + w*(i/steps);
    if(Math.abs(cy-riverY(sx)) < riverWidthAt(sx)/2 + h/2 + margin) return false;
  }
  return true;
}

function isOnSpecificBridge(o,px,py){
  if(o.kind==='riverbridge'){
    const span=o.span||30, road=9; // span covers the full river crossing; road is the walkway width
    if(o.horizontal) return Math.abs(px-o.x)<span && Math.abs(py-o.y)<road;
    return Math.abs(px-o.x)<road && Math.abs(py-o.y)<span;
  }
  const hw=o.horizontal?28:8, hh=o.horizontal?10:28;
  return Math.abs(px-o.x)<hw && Math.abs(py-o.y)<hh;
}

function isOnWalkableBridge(px,py){ // pond bridges — always a dry deck
  return worldObjects.some(o=>o.kind==='bridge'&&isOnSpecificBridge(o,px,py));
}

function onRiverBridge(px,py){
  return worldObjects.some(o=>o.kind==='riverbridge'&&isOnSpecificBridge(o,px,py));
}

function isOnBridge(px,py){
  return isOnWalkableBridge(px,py) || onRiverBridge(px,py);
}

function isInPond(px,py,wasSwimming){
  // Ponds (meadow) and lakes (rocky) are both swimmable elliptical water bodies.
  const inEllipse=worldObjects.some(o=>(o.kind==='pond'||o.kind==='lake')&&
    ((px-o.x)/(o.w/2))**2+((py-o.y)/(o.h/2))**2<0.92);
  const inWater=inEllipse || inRiver(px,py);
  if(!inWater) return false;
  if(isOnWalkableBridge(px,py)) return false; // pond bridge deck — never swimming
  if(onRiverBridge(px,py) && !wasSwimming) return false; // stepping onto bridge from dry land
  return true; // open water, or already swimming and passing underneath a river bridge
}

// Pure "is this point in water" test (river OR any pond/lake), ignoring bridges. Used for
// placement: keep land plants, NPCs and quest animals out of the water.
function isWater(x,y,margin=0){
  if(inRiver(x,y,margin)) return true;
  return worldObjects.some(o=>(o.kind==='pond'||o.kind==='lake')&&
    ((x-o.x)/(o.w/2+margin))**2+((y-o.y)/(o.h/2+margin))**2<1);
}

// Move an object (with .x/.y) to the nearest dry land if it spawned in water. Keeps
// merchants and quest animals off the water; searches outward in rings for a dry spot.
function nudgeOutOfWater(obj, margin=10){
  if(!obj || !isWater(obj.x,obj.y,margin)) return;
  for(let r=24; r<=560; r+=24){
    for(let a=0;a<16;a++){
      const ang=a/16*Math.PI*2;
      const nx=clamp(obj.x+Math.cos(ang)*r, 30, WORLD_W-30);
      const ny=clamp(obj.y+Math.sin(ang)*r, 30, WORLD_H-30);
      if(!isWater(nx,ny,margin)){ obj.x=nx; obj.y=ny; return; }
    }
  }
}

function makePlayer(id,color,x,y,breed='husky',markings='classic'){
  const def=Breeds.get(breed); // per-breed stats + active ability (data/breeds.js)
  const maxHp=def.hp||20;      // 1 heart = 2 hp; different starting total per breed
  return {id,color,x,y,w:24,h:24,dir:'down',moving:false,animFrame:0,animTimer:0,
    treats:0,inventory:Inventory.create(),equipment:{},hp:maxHp,maxHp,hurtTimer:0,dead:false,
    speed:def.stats.speed,stats:def.stats,abilityId:def.abilityId,
    howling:false,howlTimer:0,breed,markings,swimming:false};
}
let p1=makePlayer(1,'#6FA8C9',200,200);
let p2=makePlayer(2,'#E0855B',260,200);

let sparkles=[];
function spawnSparkles(x,y,color,count=14){
  for(let i=0;i<count;i++) sparkles.push({x,y,vx:rand(-1.8,1.8),vy:rand(-2.8,-0.8),life:rand(30,55),maxLife:50,color:color||(Math.random()<.5?'#FFD93D':'#FF8FA3'),size:rand(2,4)});
}


// ===== src/levels/index.js =====
// ====================== LEVELS REGISTRY ======================
// Levels register themselves here (see levels/meadow.js). Adding a new level =
// a new file that declares its size/theme/quest/generate and calls Levels.register().

const Levels = {
  _byId: {},
  _order: [],

  register(level){
    if(!this._byId[level.id]) this._order.push(level.id);
    this._byId[level.id] = level;
    return level;
  },
  get(id){ return this._byId[id] || null; },
  first(){ return this._byId[this._order[0]] || null; },
  ids(){ return this._order.slice(); },
};

// ===== src/levels/meadow.js =====
// ====================== LEVEL: SUNNY MEADOW ======================
// Level 1. Wraps the existing world generators (buildWorld / makeCollectibles /
// makeFriends) so the current layout logic is unchanged — the level system just
// gives it a name, size, visual theme, and a completion quest. A second level is
// now a sibling file: declare a different theme/generate/quest and register it.

Levels.register({
  id: 'meadow',
  name: 'Sunny Meadow',
  seed: 12345,                 // reserved for future seeded generation (LevelManager reseeds RNG)
  size: { w: 1920, h: 1280 },
  spawn: { x: 200, y: 200 },   // where the dogs start on this level
  next: 'meadow-2',            // on through the Sunny Meadows learning biome

  // Visual palette — moved out of world-draw.js so different levels look different.
  theme: {
    grass:'#9ED87A', grassDark:'#8DCF6A', grassLight:'#AADE88',
    dirt:'rgba(190,155,100,0.15)',
    fenceA:'#8B6340', fenceB:'#A07040', rail:'#C4904A',
    minimapGrass:'#4A9A3A', minimapWater:'#4AACDC',
  },

  // Populate world objects + colliders + entities. Runs after WORLD_W/H are set and
  // RNG is reseeded (see level-manager.js).
  generate(){
    buildWorld();
    collectibles = makeCollectibles();
    friends = makeFriends();

    // The very first level is pure basics — just wander, collect treats, and cheer up
    // friends. No merchants and no enemies yet; those are introduced in later levels
    // (shops in Wildflower Field, a first gentle enemy in Old Orchard Path).
    Entities.clear();
  },

  // Completion condition (the "quest"). checkWin() consults this.
  quest: {
    id: 'cheer-all',
    label: 'Cheer up every lonely friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});

// ===== src/levels/meadow2.js =====
// ====================== LEVEL: WILDFLOWER FIELD (Sunny Meadows 2) ======================
// The second step of the friendly Sunny Meadows biome — a bright, safe flower field with
// NO enemies. Its teaching job is the gentle stuff: keep practising collect→deliver, and
// meet the FRIENDLY WILDLIFE for the first time (ducks on the ponds, squirrels in the
// grass) so the player learns the positive "greet" interaction before it matters in the
// mountains. Reuses the meadow terrain generator (buildWorld) and carpets it in flowers.

Levels.register({
  id: 'meadow-2',
  name: 'Wildflower Field',
  seed: 13579,
  size: { w: 1600, h: 1120 },        // cozy and easy to explore
  spawn: { x: 200, y: 200 },
  next: 'meadow-3',

  // Bright spring palette.
  theme: {
    grass:'#A6DE86', grassDark:'#96D573', grassLight:'#BCEA98',
    dirt:'rgba(210,160,120,0.14)',
    fenceA:'#9A7048', fenceB:'#B0824E', rail:'#D4A45E',
    minimapGrass:'#5AAA46', minimapWater:'#4AACDC',
  },

  generate(){
    buildWorld();
    // Carpet the field in extra wildflowers — this is the wildflower field, after all.
    const hues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF','#FF9EC0','#B6E36A','#FFE066'];
    for(let i=0;i<130;i++){
      let fx,fy;
      for(let a=0;a<20;a++){ fx=rand(30,WORLD_W-30); fy=rand(30,WORLD_H-30); if(!isWater(fx,fy,4)) break; }
      if(isWater(fx,fy,4)) continue;   // keep wildflowers on dry land
      worldObjects.push({kind:'flower', x:fx, y:fy,
        hue:hues[Math.floor(Math.random()*hues.length)], sway:rand(0,Math.PI*2), size:rand(0.7,1.4)});
    }
    worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));

    collectibles = makeCollectibles();

    // Just three friends, each needing only a couple of treats — an easy, encouraging clear.
    friends = [
      {name:'Sunny the Cat',  x:WORLD_W*0.24, y:WORLD_H*0.30, need:2,given:0,cheered:false,kind:'cat',   msg:"Ooh, are those treats for me?"},
      {name:'Hoppy Bunny',    x:WORLD_W*0.78, y:WORLD_H*0.34, need:2,given:0,cheered:false,kind:'bunny', msg:"I'd love a snack, thank you!"},
      {name:'Chirpy Bird',    x:WORLD_W*0.5,  y:WORLD_H*0.74, need:3,given:0,cheered:false,kind:'bird',  msg:"Tweet! Any treats to share?"},
    ];

    Entities.clear();
    // A friendly merchant to reinforce the shop.
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.30,
      name: 'Marla the Merchant',
      greeting: "Lovely day for a stroll! Fresh biscuits and ribbons here.",
      wares: [ {id:'biscuit', cost:3}, {id:'ribbon', cost:5} ],
    });

    // A quest-giver (yellow "!"): bring her some bones and she rewards you with treats.
    // This is the first of a growing set of quest types — see src/quests.js.
    Entities.spawn('npc', {
      x: WORLD_W*0.30, y: WORLD_H*0.40,
      name: 'Nella the Nurse',
      look: 'tailor',
      greeting: "Hello, dear pup!",
      quest: {
        id: 'nella-bones', type: 'give', give: { item:'bone', count:3 },
        offer:    "Oh, hello dear! My little pups are so hungry — could you fetch me 3 🦴 bones?",
        ready:    "Three whole bones? You're a darling — may I take them?",
        progress: "Still hunting for bones? I need 3 in all. Thank you, pup!",
        done:     "Bless you! The pups are chewing away happily now. 💛",
        reward:   { treats: 6 },
      },
    });

    // Friendly wildlife — walk up and press the action key to greet them. No enemies here.
    const ponds = worldObjects.filter(o=>o.kind==='pond');
    if(ponds[0]) Entities.spawn('critter', { species:'duck', x:ponds[0].x, y:ponds[0].y });
    if(ponds[1]) Entities.spawn('critter', { species:'duck', x:ponds[1].x, y:ponds[1].y });
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.68, y:WORLD_H*0.62 });
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.30, y:WORLD_H*0.58 });
  },

  quest: {
    id: 'cheer-all-meadow2',
    label: 'Cheer up every friend in the field',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});

// ===== src/levels/meadow3.js =====
// ====================== LEVEL: OLD ORCHARD PATH (Sunny Meadows 3) ======================
// The last friendly step before the mountains. Still cozy, but it eases the player toward
// the tougher biome ahead: reinforces the shop + wearables (both merchants are here), a
// single SLOW badger reminds them enemies exist and hearts matter, and the meadow's ponds
// + bridges give a low-stakes place to practise crossing water. Reuses the meadow terrain
// generator (buildWorld) and plants extra oak "orchard" clusters over it.

// Keep augment-planted oaks out of the water (buildWorld's own placement already does this
// for its objects; ours needs the same guard).
function _orchardClearOfWater(x, y, m){
  if(typeof inRiver==='function' && inRiver(x, y, m)) return false;
  return !worldObjects.some(o => o.kind==='pond' &&
    ((x-o.x)/(o.w/2+m))**2 + ((y-o.y)/(o.h/2+m))**2 < 1);
}

Levels.register({
  id: 'meadow-3',
  name: 'Old Orchard Path',
  seed: 20241,
  size: { w: 1760, h: 1200 },
  spawn: { x: 200, y: 200 },
  next: 'rocky',                      // the trail out of the meadows climbs into the mountains

  // Warmer, late-summer palette.
  theme: {
    grass:'#9CCB6E', grassDark:'#8ABF5C', grassLight:'#B0D982',
    dirt:'rgba(196,150,96,0.18)',
    fenceA:'#7E5632', fenceB:'#946439', rail:'#BE8C48',
    minimapGrass:'#4E9838', minimapWater:'#4AACDC',
  },

  generate(){
    buildWorld();
    // Orchard clusters — extra oaks (with a toadstool or two at the base) dotted around.
    for(let i=0;i<10;i++){
      let x, y, ok=false;
      for(let a=0;a<30 && !ok; a++){
        x=rand(90,WORLD_W-90); y=rand(90,WORLD_H-90);
        ok=_orchardClearOfWater(x,y,40);
      }
      worldObjects.push({kind:'oak', x, y, variant:Math.floor(Math.random()*3)});
      addCollider(x-7, y+19, 14, 13);
      if(Math.random()<0.7) worldObjects.push({kind:'mushroom', x:x+rand(-22,22), y:y+rand(20,34), big:Math.random()<0.3});
    }
    worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));

    collectibles = makeCollectibles();

    // Four friends needing three treats each — a small step up from the field.
    friends = [
      {name:'Prickle the Hedgehog', x:WORLD_W*0.22, y:WORLD_H*0.28, need:3,given:0,cheered:false,kind:'hedgehog', msg:"Oh! You startled me... got a treat?"},
      {name:'Shelly the Tortoise',  x:WORLD_W*0.80, y:WORLD_H*0.30, need:3,given:0,cheered:false,kind:'tortoise', msg:"Slow day in the orchard, isn't it?"},
      {name:'Clover Bunny',         x:WORLD_W*0.28, y:WORLD_H*0.78, need:3,given:0,cheered:false,kind:'bunny',    msg:"These apples aren't ripe yet..."},
      {name:'Robin the Bird',       x:WORLD_W*0.76, y:WORLD_H*0.76, need:3,given:0,cheered:false,kind:'bird',     msg:"Chirp! My nest could use some cheer."},
    ];

    Entities.clear();
    // Both merchants — reinforce buying treats/consumables and trying on wearables.
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.28,
      name: 'Marla the Merchant',
      greeting: "Stock up before the trail, pup — biscuits keep your hearts full!",
      wares: [ {id:'biscuit', cost:3}, {id:'trailmix', cost:4}, {id:'ribbon', cost:5} ],
    });
    Entities.spawn('npc', {
      x: WORLD_W*0.62, y: WORLD_H*0.5,
      name: 'Fenwick the Tailor',
      look: 'tailor',
      greeting: "Heading for the mountains? Let's find you something warm to wear!",
      wares: [
        {id:'ballcap', cost:6}, {id:'scarf', cost:6}, {id:'shades', cost:7},
        {id:'raincoat',cost:9}, {id:'cape',  cost:10},
      ],
    });
    // One slow, easy badger — a gentle reminder that enemies (and hearts) exist.
    Entities.spawn('enemy', { x: WORLD_W*0.5, y: WORLD_H*0.6, speed:0.8, chaseR:90 });
    // A friendly squirrel keeps the orchard cheerful.
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.4, y:WORLD_H*0.4 });
  },

  quest: {
    id: 'cheer-all-meadow3',
    label: 'Cheer up every friend in the orchard',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});

// ===== src/levels/rocky.js =====
// ====================== LEVEL 2: ROCKY MOUNTAINS ======================
// The trail out of the Sunny Meadow climbs into a lush Canadian-Rockies valley: a
// forested green basin ringed by jagged snow-veined peaks, dotted with vivid turquoise
// glacial lakes, fed by cascading waterfalls, with a river winding through and a pack of
// wolves on the prowl. Reached by clearing level 1 (meadow.next → 'rocky'); final level.
//
// Like meadow.js this is a thin declaration: a bigger `size`, an alpine `theme`, a
// `generate()` that lays down the terrain / animals / actors, and a `quest`. Visuals
// (mountains, lakes, waterfalls, evergreens, boulders, campfires) live in world-draw.js;
// new animals in friends.js; the wolf in entities/.

// ---- world generation (alpine valley: peaks, glacial lakes, waterfalls, a river) ----
function buildRockyWorld(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H;

  // Winding river threading the lower-middle of the valley (create first so placement
  // can steer clear of it).
  river={
    pos:H*0.62,
    amplitude:42, wavelength:680,
    amplitude2:16, wavelength2:230, phase2:2.1,
    baseWidth:58, widthAmp:18, widthWavelength:500, widthPhase:1.1,
  };
  river.pebbles=makeRiverPebbles();

  // ---- Glacial lakes (big turquoise water bodies). Placed before everything else so
  //      other objects steer around them; swimmable (isInPond treats 'lake' like 'pond'). ----
  const lakes=[
    { x:W*0.50, y:H*0.34, w:390, h:250 },   // hero lake below the central peaks
    { x:W*0.22, y:H*0.46, w:300, h:210 },   // west lake
    { x:W*0.79, y:H*0.42, w:280, h:190 },   // east lake
  ];
  // Keep every lake fully clear of the river — nudge it up the valley if it would cross.
  lakes.forEach(l=>{ let guard=0; while(!ellipseClearOfRiver(l.x,l.y,l.w,l.h,26) && guard++<50) l.y-=12; });
  lakes.forEach(l=>worldObjects.push({kind:'lake', x:l.x, y:l.y, w:l.w, h:l.h,
    seed:Math.random()*100, blobSeed:Math.floor(Math.random()*9999)}));
  function inLake(x,y,m){ return lakes.some(l=>((x-l.x)/(l.w/2+m))**2+((y-l.y)/(l.h/2+m))**2<1); }

  // Placement helper: random point avoiding the river, lakes, and existing items.
  function pt(ax,ay,bx,by,minD,list,margin){
    for(let a=0;a<60;a++){
      const p=rand2(ax,ay,bx,by,minD,list);
      if(!inRiver(p.x,p.y,margin) && !inLake(p.x,p.y,margin)) return p;
    }
    return rand2(ax,ay,bx,by,minD,list);
  }

  // log-fence border
  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];

  // ---- Mountain range along the skyline: a run of wide, overlapping peaks whose summits
  //      sit fully inside the world (apex y >= ~8) so they read as a continuous range
  //      rather than triangles cut off by the top edge. Low y → drawn behind everything. ----
  const M=6;
  for(let i=0;i<M;i++){
    const mx=W*(0.06 + (i/(M-1))*0.88) + rand(-24,24);
    const baseY=rand(196,216);
    const mh=rand(150,188);          // apex = baseY - mh stays a little below the top edge
    const mw=rand(360,500);
    worldObjects.push({kind:'mountain',x:mx,y:baseY,w:mw,h:mh,seed:Math.floor(Math.random()*9999)});
    // Solid across most of the base so you can't walk into the massif (matches the rock).
    addCollider(mx-mw*0.4, baseY-4, mw*0.8, 16);
  }

  // ---- Waterfalls tumbling into the lakes they sit above ----
  worldObjects.push({kind:'waterfall', x:lakes[0].x, y:lakes[0].y-lakes[0].h/2+10, h:120});
  worldObjects.push({kind:'waterfall', x:lakes[2].x+10, y:lakes[2].y-lakes[2].h/2+8, h:96});

  // Boulders — the valley's main obstacles.
  for(let i=0;i<15;i++){
    const p=pt(60,240,W-60,H-60,120,taken,50); taken.push(p);
    const big=Math.random()<0.6;
    worldObjects.push({kind:'boulder',x:p.x,y:p.y,big});
    addCollider(p.x-(big?16:11), p.y+(big?1:0), big?32:22, big?14:11);
  }

  // Rock clusters.
  for(let i=0;i<7;i++){
    const p=pt(80,240,W-80,H-80,120,taken,45); taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // Evergreen forest — lush green spruce/fir (a lot of them: it's a forested valley).
  for(let i=0;i<26;i++){
    const p=pt(50,240,W-50,H-50,80,taken,40); taken.push(p);
    worldObjects.push({kind:'snowypine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+14,8,9);
  }

  // A few weathered deadfall trees.
  for(let i=0;i<5;i++){
    const p=pt(60,240,W-60,H-60,110,taken,42); taken.push(p);
    worldObjects.push({kind:'deadtree',x:p.x,y:p.y});
    addCollider(p.x-6,p.y+18,12,11);
  }

  // Loose rocks (mostly walkable; big ones block).
  for(let i=0;i<18;i++){
    const p=pt(60,240,W-60,H-60,60,taken,35); taken.push(p);
    const big=Math.random()<0.25;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // Hardy shrubs.
  for(let i=0;i<14;i++){
    const p=pt(60,240,W-60,H-60,80,taken,40); taken.push(p);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant:Math.floor(Math.random()*2)});
    addCollider(p.x-12,p.y+3,24,13);
  }

  // Wildflowers + grass tufts across the green valley floor (no colliders).
  const hues=['#FF9E6E','#FFD36A','#E58AC0','#B6E36A','#7FD4E0','#C79BFF'];
  for(let i=0;i<70;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,W-30); fy=rand(220,H-30); if(!isWater(fx,fy,4)) break; }
    if(isWater(fx,fy,4)) continue;   // alpine flowers stay on dry land
    worldObjects.push({kind:'flower',x:fx,y:fy,
      hue:hues[Math.floor(Math.random()*hues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.2)});
  }
  for(let i=0;i<22;i++){
    let gx,gy;
    for(let a=0;a<20;a++){ gx=rand(40,W-40); gy=rand(220,H-40); if(!isWater(gx,gy,4)) break; }
    if(isWater(gx,gy,4)) continue;
    worldObjects.push({kind:'tallgrass',x:gx,y:gy,blades:Math.floor(rand(4,9)),seed:Math.random()*100});
  }

  // Cozy lakeside campfires — warm landmarks.
  worldObjects.push({kind:'campfire',x:W*0.63, y:H*0.30});
  worldObjects.push({kind:'campfire',x:W*0.15,y:H*0.82});

  // A couple of trails.
  worldObjects.push({kind:'stonepath',x1:W*0.12,y1:H*0.38,x2:W*0.88,y2:H*0.44,seed:71});
  worldObjects.push({kind:'stonepath',x1:W*0.66,y1:H*0.20,x2:W*0.66,y2:H*0.9, seed:72});

  // Stone crossings over the river (drawn in main.js so swimmers pass underneath).
  [0.28,0.6,0.85].forEach((fx,i)=>{
    const bx=W*fx;
    const span=riverWidthAt(bx)/2+16;
    worldObjects.push({kind:'riverbridge',x:bx,y:riverY(bx),horizontal:false,seed:30+i,span});
  });

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

// Treats are scarcer per-square-metre than the meadow (bigger map, same-ish count), so
// you have to roam to gather enough — part of what makes this level harder.
function makeRockyCollectibles(){
  const types=['bone','heart','ball','flower'];
  const items=[];
  for(let i=0;i<30;i++){
    items.push({ x:rand(80,WORLD_W-80), y:rand(240,WORLD_H-80),
      type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2) });
  }
  // fish darting in the stream
  for(let i=0;i<6;i++){
    const baseX=rand(160,WORLD_W-160);
    items.push({ type:'fish', taken:false, bob:rand(0,Math.PI*2), dir:1,
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(Math.random()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX) });
  }
  return items;
}

// Six lonely mountain animals (one more than the meadow), each needing more treats, and
// several stranded across the stream so you have to use the crossings.
function makeRockyFriends(){
  const W=WORLD_W, H=WORLD_H;
  return [
    {name:'Rusty the Fox',    x:W*0.17, y:H*0.28, need:4,given:0,cheered:false,kind:'fox',     msg:"The cold nights are so lonely up here..."},
    {name:'Old Billy Goat',   x:W*0.84, y:H*0.26, need:4,given:0,cheered:false,kind:'goat',    msg:"My herd wandered off over the ridge."},
    {name:'Hoot the Owl',     x:W*0.52, y:H*0.16, need:4,given:0,cheered:false,kind:'owl',      msg:"Whoo will keep me company tonight?"},
    {name:'Pip the Marmot',   x:W*0.15, y:H*0.82, need:5,given:0,cheered:false,kind:'marmot',   msg:"I burrowed too far from my friends..."},
    {name:'Bramble the Cub',  x:W*0.85, y:H*0.80, need:5,given:0,cheered:false,kind:'bearcub',  msg:"I can't find my way back to the den."},
    {name:'Ridge the Raven',  x:W*0.52, y:H*0.78, need:4,given:0,cheered:false,kind:'bird',     msg:"The peaks are quiet and grey today."},
  ];
}

Levels.register({
  id: 'rocky',
  name: 'Rocky Mountains',
  seed: 24680,
  size: { w: 2400, h: 1600 },      // a bigger world = more ground to cover
  spawn: { x: 170, y: 250 },       // start on the lower-left plateau, below the peaks
  next: null,                      // final level

  // Lush alpine-valley palette (green basin, log-fence border, turquoise water on map).
  theme: {
    grass:'#86A867', grassDark:'#71934F', grassLight:'#9BBC79',
    dirt:'rgba(122,100,64,0.18)',
    fenceA:'#6B4A2E', fenceB:'#7C5636', rail:'#A9793F',
    minimapGrass:'#5E8A46', minimapWater:'#3FC8C0',
  },

  generate(){
    buildRockyWorld();
    collectibles = makeRockyCollectibles();
    friends = makeRockyFriends();

    Entities.clear();
    // Rusk the Ranger — a park-ranger guide/merchant by the lakeside camp, stocking
    // outdoor gear and a hearty snack.
    Entities.spawn('npc', {
      x: WORLD_W*0.60, y: WORLD_H*0.22,
      name: 'Rusk the Ranger',
      look: 'ranger',
      greeting: "Welcome to the valley, pup! Gear up before the wolves catch your scent.",
      wares: [
        {id:'beanie',   cost:6}, {id:'snowgoggles', cost:8},
        {id:'trailmix', cost:4}, {id:'biscuit',     cost:3},
        {id:'cape',     cost:10},
      ],
    });
    // A prowling wolf pack — the teeth of the level.
    Entities.spawn('wolf', { x: WORLD_W*0.40, y: WORLD_H*0.52, speed:1.15 });
    Entities.spawn('wolf', { x: WORLD_W*0.68, y: WORLD_H*0.66, speed:1.2  });
    Entities.spawn('wolf', { x: WORLD_W*0.30, y: WORLD_H*0.74, speed:1.1, chaseR:220 });
    // A grumpy badger still lurks too.
    Entities.spawn('enemy', { x: WORLD_W*0.78, y: WORLD_H*0.44, speed:1.0 });

    // Friendly Canadian wildlife — peaceful, greet them for a positive reward. Loons
    // ride on the lakes, the beaver keeps to a lakeshore, the moose roams the forest.
    const lk = worldObjects.filter(o=>o.kind==='lake');
    if(lk[0]) Entities.spawn('critter', { species:'loon',   x: lk[0].x-80, y: lk[0].y });
    if(lk[2]) Entities.spawn('critter', { species:'loon',   x: lk[2].x+50, y: lk[2].y });
    if(lk[1]) Entities.spawn('critter', { species:'beaver', x: lk[1].x,    y: lk[1].y + lk[1].h/2 + 16 });
    Entities.spawn('critter', { species:'moose', x: WORLD_W*0.34, y: WORLD_H*0.28 });
  },

  quest: {
    id: 'cheer-all-rocky',
    label: 'Cheer up every mountain friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});

// ===== src/draw-helpers.js =====
// ====================== DRAW HELPERS ======================
function px(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h); }

function shade(hex,p){
  const n=parseInt(hex.replace('#',''),16);
  const r=clamp((n>>16)+p,0,255),g=clamp(((n>>8)&255)+p,0,255),b=clamp((n&255)+p,0,255);
  return '#'+(r<<16|g<<8|b).toString(16).padStart(6,'0');
}

function roundRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}


// ===== src/world-draw.js =====
// ====================== WORLD DRAWING ======================
function drawGround(){
  // multi-tone grass base
  ctx.fillStyle='#9ED87A'; ctx.fillRect(0,0,WORLD_W,WORLD_H);
  // subtle noise patches
  const rng=mulberry32(42);
  for(let i=0;i<600;i++){
    const gx=Math.floor(rng()*WORLD_W),gy=Math.floor(rng()*WORLD_H);
    const s=Math.floor(rng()*20)+8;
    ctx.fillStyle=rng()<0.5?'#8DCF6A':'#AEDE8A';
    ctx.fillRect(gx,gy,s,Math.floor(s*0.5));
  }
  // path dirt
  ctx.fillStyle='rgba(200,170,120,0.18)';
  ctx.fillRect(0,WORLD_H/2-22,WORLD_W,44);
  ctx.fillRect(WORLD_W/2-22,0,44,WORLD_H);
}

// mulberry32 (deterministic RNG) now lives in core/rng.js.

// PRE-DRAWN ground (offscreen canvas so we don't recalculate every frame)
let groundCanvas=null;
function buildGroundCanvas(){
  groundCanvas=document.createElement('canvas');
  groundCanvas.width=WORLD_W; groundCanvas.height=WORLD_H;
  const gc=groundCanvas.getContext('2d');
  gc.imageSmoothingEnabled=false;
  // Palette comes from the current level's theme (falls back to the meadow colours).
  const th=(typeof LevelManager!=='undefined'&&LevelManager.theme)||{};
  const grass=th.grass||'#9ED87A', grassDark=th.grassDark||'#8DCF6A',
        grassLight=th.grassLight||'#AADE88', dirt=th.dirt||'rgba(190,155,100,0.15)',
        fenceA=th.fenceA||'#8B6340', fenceB=th.fenceB||'#A07040', rail=th.rail||'#C4904A';
  // grass base
  gc.fillStyle=grass; gc.fillRect(0,0,WORLD_W,WORLD_H);
  const rng=mulberry32(42);
  for(let i=0;i<800;i++){
    const gx=Math.floor(rng()*WORLD_W),gy=Math.floor(rng()*WORLD_H);
    const s=Math.floor(rng()*24)+6;
    gc.fillStyle=rng()<0.5?grassDark:grassLight;
    gc.fillRect(gx,gy,s,Math.floor(s*0.45));
  }
  // subtle dirt cross-paths
  gc.fillStyle=dirt;
  gc.fillRect(0,WORLD_H/2-24,WORLD_W,48);
  gc.fillRect(WORLD_W/2-24,0,48,WORLD_H);
  // fence border
  for(let x=0;x<WORLD_W;x+=24){
    gc.fillStyle=x%48===0?fenceA:fenceB;
    gc.fillRect(x,0,12,14); gc.fillRect(x,WORLD_H-14,12,14);
  }
  for(let y=0;y<WORLD_H;y+=24){
    gc.fillStyle=y%48===0?fenceA:fenceB;
    gc.fillRect(0,y,14,12); gc.fillRect(WORLD_W-14,y,14,12);
  }
  // fence rails
  gc.fillStyle=rail;
  gc.fillRect(0,4,WORLD_W,4); gc.fillRect(0,WORLD_H-8,WORLD_W,4);
  gc.fillRect(4,0,4,WORLD_H); gc.fillRect(WORLD_W-8,0,4,WORLD_H);
}

function drawOak(x,y,variant,t){
  const sway=Math.sin(t/800+x*0.01)*1.2;
  // trunk — multi-tone bark
  px(x-5,y+2,10,28,'#6B4226');
  px(x-3,y+4,4,22,'#7A4E2D');
  px(x+2,y+6,2,18,'#5A3018');
  // roots
  px(x-9,y+26,5,6,'#6B4226'); px(x+5,y+26,4,6,'#6B4226');
  // canopy layers (3 tiers, slight sway)
  const cx=x+sway;
  // back shadow layer
  ctx.globalAlpha=0.18; px(cx-2,y-30,40,38,'#1A4A10'); ctx.globalAlpha=1;
  // tier 3 (back)
  px(cx-18,y-22,36,22,variant===0?'#3A7A2A':variant===1?'#2A6A3A':'#4A7A1A');
  px(cx-14,y-28,28,10,variant===0?'#4A8A3A':variant===1?'#3A7A4A':'#5A8A2A');
  // tier 2
  px(cx-15,y-36,30,18,variant===0?'#4A8A3A':variant===1?'#3A7A4A':'#5A8A2A');
  px(cx-10,y-40,20,10,variant===0?'#5A9A4A':variant===1?'#4A8A5A':'#6A9A3A');
  // tier 1 (top, lightest)
  px(cx-10,y-50,20,16,variant===0?'#5A9A4A':variant===1?'#4A8A5A':'#6A9A3A');
  px(cx-6,y-56,12,8,variant===0?'#6AAA5A':variant===1?'#5A9A6A':'#7AAA4A');
  // highlight pixels
  px(cx-8,y-52,4,4,'#8AC86A'); px(cx+4,y-40,3,3,'#7AB85A');
}

function drawPine(x,y,t){
  const sway=Math.sin(t/900+x*0.013)*0.8;
  const cx=x+sway;
  // trunk
  px(x-3,y+2,6,22,'#5A3A1A'); px(x-1,y+4,3,16,'#6B4226');
  // 4 tiers top to bottom
  [[0,-52,10,12,'#1A5A2A'],[-2,-40,14,16,'#1E6830'],[-4,-24,18,18,'#226E34'],[-6,-8,22,16,'#287838']].forEach(([ox,oy,w,h,c])=>{
    px(cx+ox,y+oy,w,h,c);
    px(cx+ox+2,y+oy+2,4,4,shade(c,20)); // highlight
  });
}

function drawRock(x,y,big,t){
  if(big){
    // large rock with detail
    px(x-14,y+2,28,12,'#7A7A7A');
    px(x-12,y-4,24,10,'#8A8A8A');
    px(x-8,y-9,16,8,'#969696');
    px(x-4,y-11,8,5,'#A2A2A2');
    // shadow
    ctx.globalAlpha=0.2; px(x-12,y+10,24,6,'#2A2A2A'); ctx.globalAlpha=1;
    // highlight
    px(x-8,y-6,5,3,'#C0C0C0'); px(x-2,y-9,3,2,'#D0D0D0');
    // moss patches
    px(x+4,y,4,3,'#6A9A4A'); px(x-10,y+4,3,3,'#5A8A3A');
  } else {
    px(x-9,y+2,18,8,'#888');
    px(x-7,y-2,14,7,'#999');
    px(x-4,y-5,8,5,'#A5A5A5');
    ctx.globalAlpha=0.15; px(x-8,y+8,16,4,'#222'); ctx.globalAlpha=1;
    px(x-4,y-2,3,2,'#C0C0C0');
  }
}

function drawRockCluster(x,y,seed,t){
  const r=mulberry32(Math.floor(seed));
  const offsets=[[-18,4],[-6,-2],[6,2],[14,-4],[-2,10]];
  offsets.forEach(([ox,oy])=>{
    const s=r()<0.5;
    drawRock(x+ox,y+oy,s,t);
  });
}

function pondBlobPoints(blobSeed){
  const rng=mulberry32(Math.floor(blobSeed));
  const n=10, pts=[];
  for(let i=0;i<n;i++) pts.push({ang:(i/n)*Math.PI*2, rMul:0.84+rng()*0.32});
  return pts;
}

function tracePondPath(x,y,w,h,pts,scale){
  const n=pts.length;
  const pt=i=>{
    const p=pts[(i+n)%n];
    return [x+Math.cos(p.ang)*(w/2)*p.rMul*scale, y+Math.sin(p.ang)*(h/2)*p.rMul*scale];
  };
  ctx.beginPath();
  for(let i=0;i<=n;i++){
    const [cx,cy]=pt(i), [px0,py0]=pt(i-1);
    const mx=(cx+px0)/2, my=(cy+py0)/2;
    if(i===0) ctx.moveTo(mx,my); else ctx.quadraticCurveTo(px0,py0,mx,my);
  }
  ctx.closePath();
}

function drawPond(x,y,w,h,seed,t,blobSeed){
  const pts=pondBlobPoints(blobSeed!==undefined?blobSeed:seed);
  // shadow
  ctx.globalAlpha=0.2;
  ctx.save(); ctx.translate(3,5); tracePondPath(x,y,w,h,pts,1.04); ctx.restore();
  ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;
  // water base
  tracePondPath(x,y,w,h,pts,1);
  const grad=ctx.createRadialGradient(x-w*0.15,y-h*0.15,2,x,y,Math.max(w,h)/2);
  grad.addColorStop(0,'#7DD4F0'); grad.addColorStop(0.6,'#4AACDC'); grad.addColorStop(1,'#2A7AAA');
  ctx.fillStyle=grad; ctx.fill();
  // shore edge
  ctx.strokeStyle='#3A9ABB'; ctx.lineWidth=2; ctx.stroke();
  // animated ripples
  const rphase=t/1200+seed;
  for(let i=0;i<3;i++){
    const rscale=0.28+i*0.18+Math.sin(rphase+i)*0.06;
    ctx.globalAlpha=0.25-i*0.07;
    ctx.beginPath(); ctx.ellipse(x+Math.sin(rphase+i)*w*0.04,y,w/2*rscale,h/2*rscale,0,0,Math.PI*2);
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.globalAlpha=1;
  // lily pads
  [[-.2,-.1],[.15,.2],[-.05,.3]].forEach(([fx,fy])=>{
    ctx.beginPath(); ctx.arc(x+w*fx,y+h*fy,5,0.3,Math.PI*2-0.3); ctx.fillStyle='#4A9A3A'; ctx.fill();
    ctx.fillStyle='#FF8FA3'; ctx.fillRect(x+w*fx-1,y+h*fy-6,3,4);
  });
  ctx.globalAlpha=1;
}

function drawTallGrass(x,y,blades,seed,t){
  const rng=mulberry32(Math.floor(seed*100));
  for(let i=0;i<blades;i++){
    const bx=x+(rng()-.5)*28, by=y+(rng()-.5)*16;
    const h=rand(12,22), sway=Math.sin(t/500+bx*0.08+seed)*2.5;
    const green=rng()<0.5?'#4A9A2A':'#5DAA3A';
    px(bx+sway,by-h,2,h,green);
    px(bx+sway+1,by-h,1,h*0.6,shade(green,20));
    // tip
    px(bx+sway+(sway>0?1:0),by-h-3,2,4,'#8ACA5A');
  }
}

function drawBush(x,y,variant){
  if(variant===0){
    px(x-14,y+6,28,12,'#3A7A2A');
    px(x-12,y,24,10,'#4A8A3A');
    px(x-8,y-4,16,8,'#5A9A4A');
    px(x-4,y-6,8,5,'#6AAA5A');
    // berries
    px(x-6,y+2,3,3,'#FF4466'); px(x+4,y,3,3,'#FF4466'); px(x,y+4,3,3,'#CC2244');
    // highlight
    px(x-4,y-2,4,3,'#7ABB6A');
  } else {
    px(x-12,y+6,24,10,'#2A6A3A');
    px(x-10,y+2,20,8,'#3A7A4A');
    px(x-14,y+4,6,8,'#4A8A5A');
    px(x+8,y+4,6,8,'#4A8A5A');
    px(x-6,y-2,12,6,'#5A9A5A');
    px(x-2,y-5,4,4,'#6AAA6A');
    px(x+2,y-1,4,3,'#8ABB8A'); // highlight
  }
}

function drawFlower(x,y,hue,sway,size,t){
  const sw=Math.sin(t/500+sway)*1.8*size;
  const h=8*size;
  px(x+sw,y,2*size,h,'#5A9A3A');
  // petals — 4 pixels around center
  const ps=Math.floor(4*size);
  px(x-ps+sw,y-ps,ps,ps,hue); px(x+1+sw,y-ps,ps,ps,hue);
  px(x-ps+sw,y+1,ps,ps,hue); px(x+1+sw,y+1,ps,ps,hue);
  // center
  px(x-1+sw,y-1,3,3,'#FFE566');
}

function drawWillow(x,y,t){
  const sway=Math.sin(t/1100+x*0.009)*1.5;
  // trunk — wide gnarled base
  px(x-6,y+2,12,32,'#5A3A1A');
  px(x-4,y+4,5,26,'#6B4226');
  px(x+2,y+8,3,20,'#4A2A12');
  // roots
  px(x-12,y+28,8,6,'#5A3A1A'); px(x+5,y+30,7,5,'#5A3A1A');
  // canopy base
  px(x-22,y-18,44,28,'#2E6E26');
  px(x-18,y-26,36,14,'#388A2E');
  px(x-12,y-32,24,10,'#449A38');
  // drooping fronds — cascade downward
  const frondColor='#4AAA3A';
  const frondLight='#6AC85A';
  for(let i=0;i<8;i++){
    const fx=x-20+i*6+sway*(1+i*0.2);
    const flen=18+Math.sin(i*1.3)*8;
    px(fx, y-4, 2, flen, frondColor);
    px(fx+1, y-2, 1, flen*0.7, frondLight);
    // tip curl
    px(fx+(sway>0?1:-1),y-4+flen,2,4,'#8ACA5A');
  }
  // highlight on canopy
  px(x-10,y-28,8,5,'#6AC85A'); px(x+4,y-24,5,4,'#5ABB4A');
}

function drawMushroom(x,y,big){
  if(big){
    // stem
    px(x-4,y,8,12,'#F0E8D0'); px(x-3,y+2,6,8,'#FFFAE8');
    // cap
    px(x-10,y-8,20,12,'#CC2222');
    px(x-8,y-12,16,8,'#DD3333');
    px(x-5,y-15,10,6,'#EE4444');
    // spots
    px(x-6,y-10,4,4,'#FFFFFF'); px(x+2,y-10,3,3,'#FFFFFF');
    px(x-2,y-7,3,3,'#FFFFFF');
    // highlight
    px(x-6,y-13,3,2,'#FF8888');
  } else {
    px(x-2,y,5,7,'#F0E8D0');
    px(x-6,y-4,12,7,'#AA1111');
    px(x-4,y-7,8,5,'#CC2222');
    px(x-3,y-5,2,3,'#FFFFFF'); px(x+1,y-5,2,2,'#FFFFFF');
  }
}

function drawMushroomRing(x,y,seed){
  const rng=mulberry32(Math.floor(seed*77));
  const offsets=[[-14,-4],[-8,8],[0,-10],[8,6],[14,-2],[4,12],[-6,-8]];
  offsets.forEach(([ox,oy])=>{
    if(rng()<0.7) drawMushroom(x+ox,y+oy,rng()<0.3);
  });
}

// ---- meadow ambient life & props (Sunny Meadows biome) ----
function drawCattail(x,y,seed,t){
  const r=mulberry32(Math.floor(seed*61)+1);
  const n=3+Math.floor(r()*3);
  for(let i=0;i<n;i++){
    const bx=x+(r()-0.5)*11, by=y+(r()-0.5)*4;
    const h=16+r()*10, sway=Math.sin(t/600+bx*0.1+seed)*2;
    px(bx-3+sway*0.6, by-h*0.7, 2, 8, '#4E8A3A');       // leaf blade
    px(bx+sway,   by-h, 2, h, '#4E8A3A');                // stalk
    px(bx+sway+1, by-h, 1, Math.floor(h*0.6), '#5FA048');
    px(bx-1+sway, by-h+3, 4, 8, '#7A4A26');              // brown cattail head
    px(bx+sway,   by-h+4, 2, 6, '#93602F');
  }
}

function drawLog(x,y,seed){
  const r=mulberry32(Math.floor(seed*47)+1);
  ctx.globalAlpha=0.2; px(x-16,y+6,32,4,'#2A2018'); ctx.globalAlpha=1;
  px(x-16,y-4,32,10,'#6B4A2E');                          // bark body
  px(x-16,y-4,32,3,'#7C5636');                           // top-lit
  px(x-16,y+4,32,2,'#4E3420');                           // underside shade
  ctx.globalAlpha=0.3; for(let i=-12;i<12;i+=6) px(x+i,y-2,1,7,'#3E2A18'); ctx.globalAlpha=1;
  px(x-18,y-4,3,10,'#8A6242');                           // shaded cut end
  px(x+15,y-4,3,10,'#C79B6A');                           // lit cut end + rings
  px(x+16,y-2,1,6,'#8A6242'); px(x+16,y-1,1,4,'#A87C4E');
  if(r()<0.8){ px(x-6,y-5,6,2,'#6A9A4A'); px(x+2,y-5,4,2,'#5A8A3A'); } // moss
}

function drawStump(x,y){
  ctx.globalAlpha=0.2; px(x-8,y+5,16,4,'#2A2018'); ctx.globalAlpha=1;
  px(x-8,y-2,16,9,'#6B4A2E'); px(x-8,y+5,16,2,'#4E3420');
  px(x-8,y-2,3,9,'#7C5636'); px(x+5,y-2,3,9,'#523620');
  ctx.globalAlpha=0.3; px(x-3,y-1,1,7,'#3E2A18'); px(x+1,y-1,1,7,'#3E2A18'); ctx.globalAlpha=1;
  px(x-8,y-5,16,4,'#A87C4E'); px(x-6,y-4,12,2,'#C79B6A');    // top cut
  ctx.strokeStyle='#8A6242'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(x,y-3,4,1.6,0,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x,y-3,2,0.9,0,0,Math.PI*2); ctx.stroke();
  px(x+4,y-6,1,3,'#5FA048'); px(x-5,y-6,1,3,'#5FA048');      // grass sprouts
}

function drawButterfly(x,y,hue,seed,t){
  // loops gently around its home point; wings pulse with the beat
  const ph=seed;
  const fx=x+Math.sin(t/900+ph)*18+Math.cos(t/430+ph)*6;
  const fy=y+Math.cos(t/760+ph)*12+Math.sin(t/380+ph)*5;
  const ww=2+Math.abs(Math.sin(t/70+ph))*3, dark=shade(hue,-45);
  ctx.globalAlpha=0.12; ctx.beginPath(); ctx.ellipse(x,y+2,4,1.5,0,0,Math.PI*2); ctx.fillStyle='#2A3A2A'; ctx.fill(); ctx.globalAlpha=1;
  const bx=Math.round(fx), by=Math.round(fy);
  px(bx,by-3,1,6,dark);                                  // body
  ctx.fillStyle=hue;                                     // wings
  ctx.fillRect(Math.round(bx-1-ww),by-3,Math.round(ww),3);
  ctx.fillRect(bx+1,by-3,Math.round(ww),3);
  ctx.fillRect(Math.round(bx-1-ww*0.8),by,Math.round(ww*0.8),3);
  ctx.fillRect(bx+1,by,Math.round(ww*0.8),3);
  ctx.fillStyle=dark;
  ctx.fillRect(Math.round(bx-1-ww),by-3,1,6); ctx.fillRect(Math.round(bx+ww),by-3,1,6);
  px(bx-1,by-4,1,1,dark); px(bx+1,by-4,1,1,dark);        // antennae
}

// Expanding ripple ring drawn under a floating (aquatic) entity like a duck or loon —
// they sit naturally on the surface, so they just need a light wake, not submersion.
function drawWaterRipple(x,y,t){
  ctx.save();
  ctx.strokeStyle='#E8FBFF'; ctx.lineWidth=1;
  const p=(t/600+x*0.01)%1;
  ctx.globalAlpha=(1-p)*0.55; ctx.beginPath(); ctx.ellipse(x,y+7,7+p*7,3+p*3,0,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.28;       ctx.beginPath(); ctx.ellipse(x,y+8,11,4,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

// Full "swimming" treatment for a land creature that's entered the water — same look as
// the dog: the lower body is clipped away below a waterline, and a water disc + expanding
// ripples sit over it. `drawFn` paints the creature's normal sprite at (x,y).
function drawSwimming(x,y,t,drawFn){
  const wl=Math.round(y)+3;                        // waterline across the body
  ctx.save();
  ctx.beginPath(); ctx.rect(x-34, y-46, 68, wl-(y-46)); ctx.clip();   // keep only above the waterline
  drawFn();
  ctx.restore();
  const sw=Math.sin(t/600+x*0.05)*3;
  // water disc over the submerged lower body
  ctx.globalAlpha=0.72;
  ctx.beginPath(); ctx.ellipse(x+sw*0.3, wl, 15, 5.5, 0, 0, Math.PI*2);
  const wg=ctx.createRadialGradient(x-4,wl-2,1,x,wl,15);
  wg.addColorStop(0,'#9CE4FF'); wg.addColorStop(1,'#3AAACC');
  ctx.fillStyle=wg; ctx.fill();
  ctx.globalAlpha=1;
  // animated expanding ripples
  for(let i=0;i<3;i++){
    const phase=((t/1000+i/3)%1), rs=1+phase*1.6;
    ctx.globalAlpha=0.34*(1-phase);
    ctx.beginPath(); ctx.ellipse(x+sw*0.3, wl, 15*rs, 5.5*rs, 0, 0, Math.PI*2);
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1.5; ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawStonePath(x1,y1,x2,y2,seed){
  // draw a row of stone tiles between two points
  const rng=mulberry32(Math.floor(seed*31));
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),steps=Math.ceil(len/28);
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const sx=x1+dx*t+( rng()-.5)*6;
    const sy=y1+dy*t+(rng()-.5)*6;
    const w=Math.floor(rng()*8)+14, h=Math.floor(rng()*5)+8;
    const g=Math.floor(rng()*30)+140;
    const col=`#${g.toString(16).padStart(2,'0').repeat(3)}`;
    px(sx-w/2,sy-h/2,w,h,col);
    px(sx-w/2+2,sy-h/2+2,Math.floor(w*0.4),Math.floor(h*0.4),`#${Math.min(255,g+20).toString(16).padStart(2,'0').repeat(3)}`);
    // crack detail
    ctx.globalAlpha=0.25;
    px(sx,sy-h/4,1,h/2,'#666'); ctx.globalAlpha=1;
  }
}

function drawStoneBridge(x,y,horizontal,span){
  // solid masonry bridge: deck slab + thick parapets + bank piers, drawn in a
  // "spans left-right" local frame, then rotated for the (always vertical) river crossings.
  // HW (half-length) is sized by the caller to fully cross the river at this spot.
  const HW=span||30, HH=15;
  ctx.save();
  ctx.translate(x,y);
  if(!horizontal) ctx.rotate(Math.PI/2);

  const stone='#9B9B92', stoneLight='#C4C4B8', stoneDark='#7C7C73', stoneDeep='#5A584F';
  const mortar='rgba(56,52,44,0.4)';

  // shadow cast on the water, suggesting the deck is raised above it
  ctx.fillStyle='rgba(18,42,56,0.32)';
  ctx.fillRect(Math.round(-HW+3),Math.round(HH-3),HW*2-6,6);

  // stone abutment piers anchoring the bridge into the banks
  px(-HW-2,-HH+3,8,HH*2-6,stoneDeep);
  px(HW-6, -HH+3,8,HH*2-6,stoneDeep);
  px(-HW-1,-HH+4,3,HH*2-8,stoneDark);
  px(HW-5, -HH+4,3,HH*2-8,stoneDark);

  // deck slab — solid stone with a gentle sunlit camber
  px(-HW,-7,HW*2,14,stone);
  px(-HW,-7,HW*2,3,stoneLight);
  px(-HW,4, HW*2,3,stoneDeep);
  for(let i=-HW+10;i<HW-6;i+=10){ ctx.fillStyle=mortar; ctx.fillRect(Math.round(i),-7,1,14); }

  // thick parapet walls along both edges, with coping stones on top
  [-HH+1, HH-7].forEach(py=>{
    px(-HW,py,HW*2,6,stoneDark);
    px(-HW,py-1,HW*2,2,stoneLight);
    px(-HW,py+5,HW*2,1,stoneDeep);
    for(let i=-HW+8;i<HW-6;i+=11){ ctx.fillStyle=mortar; ctx.fillRect(Math.round(i),py,1,6); }
  });

  ctx.restore();
}

function drawBridge(x,y,horizontal,t,material,span){
  if(material==='stone'){
    drawStoneBridge(x,y,horizontal,span);
    return;
  }
  // wooden bridge over a pond
  const plankCol='#A07040', darkPlank='#8B5E30', rail='#7A4E28';
  if(horizontal){
    // deck planks
    for(let i=0;i<5;i++){
      px(x-27+i*11,y-6,9,12,i%2===0?plankCol:darkPlank);
      px(x-27+i*11+1,y-5,4,2,'#C09050'); // highlight
    }
    // rails top and bottom
    px(x-28,y-8,56,4,rail); px(x-28,y+6,56,4,rail);
    // posts
    [x-26,x-2,x+22].forEach(px2=>{ px(px2,y-10,4,20,rail); });
  } else {
    for(let i=0;i<5;i++){
      px(x-6,y-27+i*11,12,9,i%2===0?plankCol:darkPlank);
      px(x-5,y-27+i*11+1,2,4,'#C09050');
    }
    px(x-8,y-28,4,56,rail); px(x+6,y-28,4,56,rail);
    [y-26,y-2,y+22].forEach(py=>{ px(x-8,py,20,4,rail); });
  }
}


function drawRiver(t){
  if(!river) return;
  const steps=120, dx=WORLD_W/steps;

  // soft sandy/muddy bank halo where the water meets the grass
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const x=i*dx, y=riverY(x)-riverWidthAt(x)/2-9;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for(let i=steps;i>=0;i--){
    const x=i*dx, y=riverY(x)+riverWidthAt(x)/2+9;
    ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle='rgba(196,168,116,0.55)';
  ctx.fill();

  // water body — width breathes wider/narrower along its length
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const x=i*dx, y=riverY(x)-riverWidthAt(x)/2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for(let i=steps;i>=0;i--){
    const x=i*dx, y=riverY(x)+riverWidthAt(x)/2;
    ctx.lineTo(x,y);
  }
  ctx.closePath();

  const halfSpan=(river.baseWidth+river.widthAmp*1.4)/2+4;
  const minY=river.pos-river.amplitude-river.amplitude2-halfSpan;
  const maxY=river.pos+river.amplitude+river.amplitude2+halfSpan;
  const grad=ctx.createLinearGradient(0,minY,0,maxY);
  grad.addColorStop(0,   '#82CDEE');
  grad.addColorStop(0.12,'#7DD4F0');
  grad.addColorStop(0.5, '#4AACDC');
  grad.addColorStop(0.88,'#2E80AC');
  grad.addColorStop(1,   '#235F80');
  ctx.fillStyle=grad; ctx.fill();

  // shore lines
  ctx.strokeStyle='#3A9ABB'; ctx.lineWidth=2;
  for(let edge=0;edge<2;edge++){
    const sign=edge===0?-1:1;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const x=i*dx, y=riverY(x)+sign*riverWidthAt(x)/2;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // animated ripple lines, scaled to the local width
  const rphase=t/1800;
  for(let ri=0;ri<3;ri++){
    ctx.globalAlpha=0.18-ri*0.05;
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const x=i*dx, w=riverWidthAt(x);
      const y=riverY(x)+(ri-1)*w*0.27+Math.sin(x/200+rphase+ri)*4;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha=1;

  // pebbles scattered along the banks
  (river.pebbles||[]).forEach(p=>{
    if(p.big){ px(p.x-4,p.y-2,8,5,'#8C8C82'); px(p.x-3,p.y-3,5,3,'#A6A69A'); }
    else     { px(p.x-2,p.y-1,4,3,'#9A9A8E'); }
  });

  // gentle foam flecks sparkling near the edges
  const fphase=t/700;
  for(let i=0;i<=steps;i+=3){
    const x=i*dx, w=riverWidthAt(x), cy=riverY(x);
    const s=Math.sin(x*0.05+fphase);
    if(s>0.6){
      ctx.globalAlpha=(s-0.6)*1.6;
      ctx.fillStyle='#EAFBFF';
      ctx.fillRect(Math.round(x),Math.round(cy-w/2+4),2,2);
      ctx.fillRect(Math.round(x+4),Math.round(cy+w/2-5),2,2);
    }
  }
  ctx.globalAlpha=1;
}

// ====================== ROCKY-MOUNTAIN ASSETS ======================
// Renderers for the second level's theme. Registered into the drawWorld() switch and
// spawned by levels/rocky.js. Same pixel-art idiom (px/shade + a little canvas path work).

function drawMountain(x,y,w,h,seed){
  // A majestic Canadian-Rockies massif: a jagged multi-peak ridgeline over a granite
  // body with rock strata, a dark evergreen tree-line skirt at the base, and only thin
  // snow veins in the summit couloirs (no big white cap). `y` is the base; apex at y-h.
  const r=mulberry32(Math.floor((seed||7)+1));
  const half=w/2;
  const rockLit='#9B978C', rock='#84817A', rockDark='#615E58', haze='#B7C1CB';
  const forest='#2C5633', forestLt='#3B6C40', snow='#EEF4F7';

  // base cast shadow to ground the massif
  ctx.globalAlpha=0.16; ctx.beginPath(); ctx.ellipse(x,y+4,half*0.92,10,0,0,Math.PI*2); ctx.fillStyle='#20241E'; ctx.fill(); ctx.globalAlpha=1;

  // atmospheric haze silhouette behind the massif
  ctx.globalAlpha=0.32;
  ctx.beginPath(); ctx.moveTo(x-half*1.04,y);
  ctx.lineTo(x-half*0.42,y-h*0.92); ctx.lineTo(x,y-h*1.03); ctx.lineTo(x+half*0.46,y-h*0.84); ctx.lineTo(x+half*1.04,y);
  ctx.closePath(); ctx.fillStyle=haze; ctx.fill(); ctx.globalAlpha=1;

  // jagged ridgeline: main summit (slightly left) + col + a secondary summit
  const apexX=x-half*0.12;
  const ridge=[
    [x-half, y],
    [x-half*0.62, y-h*0.48-r()*h*0.05],
    [x-half*0.34, y-h*0.34],
    [apexX, y-h],
    [x-half*0.02, y-h*0.70],
    [x+half*0.20, y-h*0.84-r()*h*0.04],
    [x+half*0.50, y-h*0.48],
    [x+half*0.74, y-h*0.26],
    [x+half, y],
  ];
  ctx.beginPath(); ctx.moveTo(ridge[0][0],ridge[0][1]);
  for(let i=1;i<ridge.length;i++) ctx.lineTo(ridge[i][0],ridge[i][1]);
  ctx.closePath();
  const grad=ctx.createLinearGradient(0,y-h,0,y);
  grad.addColorStop(0,rockLit); grad.addColorStop(0.5,rock); grad.addColorStop(1,rockDark);
  ctx.fillStyle=grad; ctx.fill();

  // clip to the body for shading + strata
  ctx.save(); ctx.clip();
  // shadowed right faces (wedge from the main apex down to the right base)
  ctx.beginPath(); ctx.moveTo(apexX,y-h); ctx.lineTo(x+half,y); ctx.lineTo(apexX,y); ctx.closePath();
  ctx.fillStyle='rgba(66,64,58,0.34)'; ctx.fill();
  // horizontal rock strata bands
  ctx.strokeStyle='rgba(58,54,48,0.26)'; ctx.lineWidth=2;
  for(let i=1;i<=5;i++){ const yy=y-(h*i/6); ctx.beginPath(); ctx.moveTo(x-half,yy+9); ctx.lineTo(x+half,yy-7); ctx.stroke(); }
  // scree flecks near the base
  ctx.fillStyle='rgba(48,46,42,0.4)';
  for(let i=0;i<14;i++){ ctx.fillRect(Math.round(x-half+r()*w), Math.round(y-r()*h*0.4), 2, 2); }
  ctx.restore();

  // thin snow veins in the summit gullies (subtle — no full cap)
  ctx.strokeStyle=snow; ctx.lineCap='round'; ctx.globalAlpha=0.9;
  ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(apexX,y-h+2);      ctx.lineTo(apexX-4,y-h*0.56); ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(apexX+3,y-h+4);    ctx.lineTo(apexX+9,y-h*0.6);  ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+half*0.2,y-h*0.84+2); ctx.lineTo(x+half*0.16,y-h*0.56); ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle=snow; ctx.beginPath(); ctx.arc(apexX,y-h+3,2.6,0,Math.PI*2); ctx.fill();

  // evergreen tree-line skirt along the foot of the mountain
  const baseY=y-1;
  for(let fx=x-half+8; fx<x+half-8; fx+=9){
    const th=8+r()*8, c=r()<0.5?forest:forestLt;
    ctx.beginPath(); ctx.moveTo(fx,baseY); ctx.lineTo(fx+4,baseY-th); ctx.lineTo(fx+8,baseY); ctx.closePath();
    ctx.fillStyle=c; ctx.fill();
  }
}

function drawBoulder(x,y,big){
  // Chunky mountain boulder — bigger and cooler-grey than the meadow rocks.
  if(big){
    ctx.globalAlpha=0.22; px(x-18,y+9,36,7,'#22201C'); ctx.globalAlpha=1;
    px(x-18,y+2,36,14,'#736F68');
    px(x-15,y-6,30,12,'#847F77');
    px(x-10,y-13,20,10,'#948F86');
    px(x-4,y-16,10,6,'#A29C92');
    px(x-11,y-8,7,4,'#B4AEA3');           // highlight
    px(x+6,y-2,5,4,'#5E5A54');            // shade pocket
    px(x-14,y+4,5,3,'#5A8A4A');           // moss
    px(x+9,y+3,4,3,'#6A9A4A');
    px(x-2,y-13,3,3,'#A9C089');           // pale lichen on top
  } else {
    ctx.globalAlpha=0.18; px(x-11,y+7,22,5,'#22201C'); ctx.globalAlpha=1;
    px(x-11,y,22,10,'#7C7770');
    px(x-8,y-5,16,8,'#8C877E');
    px(x-3,y-8,8,5,'#9A948A');
    px(x-6,y-4,4,3,'#B0AAA0');
    px(x-2,y-8,3,2,'#9FB884');           // lichen fleck
  }
}

function drawSnowyPine(x,y,t){
  // Lush Canadian evergreen (spruce/fir) with just a light dusting on the crown.
  const sway=Math.sin(t/1000+x*0.012)*0.7;
  const cx=x+sway;
  // trunk
  px(x-3,y+2,6,20,'#4A3320'); px(x-1,y+4,3,14,'#5A4028');
  // full green tiers with a sunlit highlight
  [[0,-50,10,12,'#1E5A2C'],[-2,-38,14,16,'#22662F'],[-4,-22,18,18,'#2A7238'],[-6,-6,22,16,'#308040']].forEach(([ox,oy,w,h,c])=>{
    px(cx+ox,y+oy,w,h,c);
    px(cx+ox+2,y+oy+2,4,4,shade(c,20));            // sunlit highlight
    px(cx+ox+w-4,y+oy+3,3,Math.max(2,h-6),shade(c,-16)); // shaded side
  });
  // faint snow dusting only on the very crown
  px(cx-1,y-54,4,4,'#E6F1EC');
  px(cx-3,y-49,3,2,'rgba(238,244,247,0.75)');
}

function drawDeadTree(x,y,t){
  const sway=Math.sin(t/1300+x*0.01)*1.2;
  const cx=x+sway;
  // pale weathered trunk
  px(x-4,y+2,8,26,'#6B5C4A'); px(x-2,y+4,3,20,'#7C6C58'); px(x+2,y+6,2,16,'#54473A');
  px(x-8,y+24,5,5,'#5C4E3E'); px(x+4,y+24,5,5,'#5C4E3E'); // roots
  // bare branches
  ctx.strokeStyle='#6B5C4A'; ctx.lineWidth=2.5; ctx.lineCap='round';
  const branch=(bx,by,ex,ey)=>{ ctx.beginPath(); ctx.moveTo(cx+bx,y+by); ctx.lineTo(cx+ex,y+ey); ctx.stroke(); };
  branch(0,-2,-12,-16); branch(-8,-11,-16,-22); branch(0,-6,10,-20); branch(6,-14,15,-24);
  branch(0,-10,-2,-28); branch(-1,-22,-8,-32); branch(1,-22,7,-33);
  ctx.lineWidth=1.5;
  branch(-12,-16,-18,-20); branch(10,-20,16,-18); branch(-2,-28,-6,-36); branch(1,-28,5,-37);
  // a little snow catching on the limbs
  ctx.fillStyle='#E6EEF4'; px(cx-15,y-23,3,2,'#E6EEF4'); px(cx+13,y-25,3,2,'#E6EEF4'); px(cx-1,y-34,3,2,'#E6EEF4');
}

function drawCrystal(x,y,seed,t){
  // A little cluster of glowing gemstones poking out of the rock.
  const r=mulberry32(Math.floor((seed||1)*53));
  const hue=r()<0.5?['#7EC8FF','#4A9AE0','#BFE6FF']:['#C79BFF','#8A5AD0','#E4CCFF'];
  const pulse=0.5+Math.sin(t/380+seed)*0.5;
  // glow
  ctx.save(); ctx.globalAlpha=0.20+pulse*0.22;
  ctx.beginPath(); ctx.arc(x,y-4,13,0,Math.PI*2); ctx.fillStyle=hue[0]; ctx.fill();
  ctx.restore();
  const shard=(ox,oy,w,h)=>{
    ctx.beginPath(); ctx.moveTo(x+ox,y+oy); ctx.lineTo(x+ox-w/2,y+oy+h*0.5); ctx.lineTo(x+ox,y+oy+h); ctx.lineTo(x+ox+w/2,y+oy+h*0.5); ctx.closePath();
    ctx.fillStyle=hue[1]; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+ox,y+oy); ctx.lineTo(x+ox,y+oy+h); ctx.lineTo(x+ox+w/2,y+oy+h*0.5); ctx.closePath();
    ctx.fillStyle=hue[0]; ctx.fill();
    px(x+ox-1,y+oy+2,1,Math.max(2,h-6),hue[2]);   // sparkle streak
  };
  shard(-5,-6,6,14); shard(4,-9,7,17); shard(0,-2,5,11);
  ctx.globalAlpha=0.6+pulse*0.4; px(x+3,y-8,1,1,'#FFFFFF'); px(x-4,y-3,1,1,'#FFFFFF'); ctx.globalAlpha=1;
}

function drawSnowPatch(x,y,seed){
  // Soft irregular snow drift on the ground (no collider).
  const r=mulberry32(Math.floor((seed||1)*97));
  ctx.fillStyle='rgba(238,244,248,0.9)';
  ctx.beginPath();
  const n=8;
  for(let i=0;i<=n;i++){ const a=(i/n)*Math.PI*2, rad=(10+r()*8); const px0=x+Math.cos(a)*rad*1.5, py0=y+Math.sin(a)*rad*0.5; if(i===0)ctx.moveTo(px0,py0); else ctx.lineTo(px0,py0); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(x-3,y-2,8,3,0,0,Math.PI*2); ctx.fill();
}

function drawCampfire(x,y,t){
  // Ring of stones + flickering flames + warm glow — a cozy landmark on the cold peaks.
  const glow=0.4+Math.sin(t/160)*0.12+Math.sin(t/90)*0.06;
  ctx.save(); ctx.globalAlpha=0.22*glow*2; ctx.beginPath(); ctx.arc(x,y-4,26,0,Math.PI*2);
  const g=ctx.createRadialGradient(x,y-4,2,x,y-4,26); g.addColorStop(0,'#FFC65A'); g.addColorStop(1,'rgba(255,150,40,0)');
  ctx.fillStyle=g; ctx.fill(); ctx.restore();
  // stone ring
  [[-12,4],[-6,7],[2,8],[9,5],[12,-1],[-13,-1]].forEach(([ox,oy],i)=>{ px(x+ox-2,y+oy-2,7,5,i%2?'#7C7770':'#8C877E'); px(x+ox-1,y+oy-2,3,2,'#A6A29B'); });
  // logs
  px(x-7,y+2,14,3,'#5A4028'); px(x-2,y-1,12,3,'#4A3320');
  // flames (layered flicker)
  const f=Math.sin(t/70)*2, f2=Math.sin(t/110+1)*2;
  ctx.beginPath(); ctx.moveTo(x-6,y+2); ctx.quadraticCurveTo(x-4+f,y-10,x,y-16-f); ctx.quadraticCurveTo(x+5-f,y-9,x+6,y+2); ctx.closePath(); ctx.fillStyle='#FF7A2E'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-4,y+2); ctx.quadraticCurveTo(x-2+f2,y-7,x,y-12-f2); ctx.quadraticCurveTo(x+3-f2,y-6,x+4,y+2); ctx.closePath(); ctx.fillStyle='#FFB43C'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-2,y+1); ctx.quadraticCurveTo(x,y-4,x,y-8-f); ctx.quadraticCurveTo(x+2,y-4,x+2,y+1); ctx.closePath(); ctx.fillStyle='#FFE79A'; ctx.fill();
  // sparks
  px(x-1,Math.round(y-18-f*2),1,1,'#FFD36A'); px(x+3,Math.round(y-14+f2),1,1,'#FFE79A');
}

function drawLake(x,y,w,h,seed,t,blobSeed){
  // A big glacial lake — vivid turquoise fading to deep teal, ringed by a pebbly shore,
  // with drifting light bands and sun glints. Uses the pond blob path for a natural edge.
  const pts=pondBlobPoints(blobSeed!==undefined?blobSeed:seed);
  const r=mulberry32(Math.floor((seed||1)*131)+7);
  // pebbly gravel shore halo
  tracePondPath(x,y,w,h,pts,1.14); ctx.fillStyle='rgba(158,146,122,0.55)'; ctx.fill();
  tracePondPath(x,y,w,h,pts,1.07); ctx.fillStyle='rgba(198,188,166,0.5)'; ctx.fill();
  // depth shadow offset
  ctx.globalAlpha=0.18; ctx.save(); ctx.translate(3,5); tracePondPath(x,y,w,h,pts,1.02); ctx.restore();
  ctx.fillStyle='#15343C'; ctx.fill(); ctx.globalAlpha=1;
  // glacial water body
  tracePondPath(x,y,w,h,pts,1);
  const grad=ctx.createRadialGradient(x-w*0.12,y-h*0.16,4,x,y,Math.max(w,h)/2);
  grad.addColorStop(0,'#9CF0E4'); grad.addColorStop(0.42,'#40CAC4'); grad.addColorStop(0.78,'#1F97AA'); grad.addColorStop(1,'#15708A');
  ctx.fillStyle=grad; ctx.fill();
  // shoreline stroke
  ctx.strokeStyle='#2FB6B0'; ctx.lineWidth=2; ctx.stroke();
  // drifting ripple bands
  const rphase=t/1400+seed;
  for(let i=0;i<4;i++){
    const rs=0.22+i*0.16+Math.sin(rphase+i)*0.05;
    ctx.globalAlpha=0.22-i*0.045;
    ctx.beginPath(); ctx.ellipse(x+Math.sin(rphase+i)*w*0.03,y,w/2*rs,h/2*rs,0,0,Math.PI*2);
    ctx.strokeStyle='#CFF7F0'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.globalAlpha=1;
  // sparkling sun glints
  const gp=t/500;
  for(let i=0;i<6;i++){
    const gx=x+(r()-0.5)*w*0.62, gy=y+(r()-0.5)*h*0.5, s=Math.sin(gp+i*1.7);
    if(s>0.55){ ctx.globalAlpha=(s-0.55)*1.6; ctx.fillStyle='#F0FFFB'; ctx.fillRect(Math.round(gx),Math.round(gy),2,2); }
  }
  ctx.globalAlpha=1;
}

function drawWaterfall(x,y,t,h){
  // A realistic cascade: a stone cliff notch, a sheet of falling water with a vertical
  // aqua→foam gradient and multiple strands scrolling at different speeds, spilling into a
  // plunge pool with expanding ripple rings, rising mist and flicking spray at (x,y).
  h=h||110; const w=26, L=x-w/2, R=x+w/2;
  const rock='#6E6A62', rockD='#565249', rockL='#847F76';
  // rock cliff flanks
  px(L-12,y-h,12,h+6,rockD); px(L-12,y-h,12,4,rockL); px(L-10,y-h+9,4,h-12,rock);
  px(R,   y-h,12,h+6,rockD); px(R,   y-h,12,4,rockL); px(R+6, y-h+9,4,h-12,rock);
  // dark wet notch behind the water
  px(L,y-h,w,h,'#274C55'); px(L,y-h,w,6,'#1E3A42');

  // falling water sheet (clipped to the chute)
  ctx.save();
  ctx.beginPath(); ctx.rect(L,y-h,w,h); ctx.clip();
  const g=ctx.createLinearGradient(0,y-h,0,y);
  g.addColorStop(0,'#BFEFF6'); g.addColorStop(0.5,'#9FE0EC'); g.addColorStop(0.85,'#E8FBFF'); g.addColorStop(1,'#FFFFFF');
  ctx.fillStyle=g; ctx.fillRect(L+2,y-h+4,w-4,h);
  for(let i=0;i<6;i++){                                  // strands at varied speeds
    const sx=L+3+i*((w-6)/5), spd=0.3+(i%3)*0.12, scroll=(t*spd)%22;
    ctx.strokeStyle=i%2?'rgba(255,255,255,0.9)':'rgba(198,236,244,0.8)'; ctx.lineWidth=2;
    for(let yy=-22;yy<h;yy+=22){ const ya=y-h+((yy+scroll)%(h+22)); ctx.beginPath(); ctx.moveTo(sx,ya); ctx.lineTo(sx,ya+13); ctx.stroke(); }
  }
  ctx.restore();
  // lip where the water rolls over
  px(L-2,y-h-3,w+4,5,'#CFF3F8'); px(L,y-h-1,w,2,'#8FD8E4');

  // plunge pool
  ctx.fillStyle='#7FD0DC'; ctx.beginPath(); ctx.ellipse(x,y,w*0.95,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#B9EEF4'; ctx.beginPath(); ctx.ellipse(x,y-1,w*0.58,5,0,0,Math.PI*2); ctx.fill();
  // expanding ripple rings
  for(let i=0;i<3;i++){
    const p=((t/700)+i/3)%1;
    ctx.globalAlpha=(1-p)*0.5; ctx.strokeStyle='#EAFBFF'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(x,y+2,4+p*w*0.9,1.5+p*4,0,0,Math.PI*2); ctx.stroke();
  }
  // rising mist puffs
  for(let i=0;i<4;i++){
    const mp=((t/900)+i/4)%1, my=y-mp*24, mx=x+Math.sin((t/300)+i*1.7)*8;
    ctx.globalAlpha=(1-mp)*0.4; ctx.fillStyle='#FFFFFF';
    ctx.beginPath(); ctx.arc(mx,my,3+mp*3,0,Math.PI*2); ctx.fill();
  }
  // spray flicking off the base
  for(let i=0;i<6;i++){ const a=(t/200+i*0.17)%1; if(a<0.5){ ctx.globalAlpha=(0.5-a)*1.5; ctx.fillStyle='#FFFFFF'; ctx.fillRect(Math.round(x+(i-3)*6),Math.round(y-a*11),2,2); } }
  ctx.globalAlpha=1;
}

function drawWorld(t){
  // ground (pre-rendered)
  if(groundCanvas) ctx.drawImage(groundCanvas,0,0);
  else { ctx.fillStyle='#9ED87A'; ctx.fillRect(0,0,WORLD_W,WORLD_H); }

  drawRiver(t);

  // draw all world objects in y-sorted order
  worldObjects.forEach(obj=>{
    switch(obj.kind){
      case 'flower':      drawFlower(obj.x,obj.y,obj.hue,obj.sway,obj.size,t); break;
      case 'tallgrass':   drawTallGrass(obj.x,obj.y,obj.blades,obj.seed,t); break;
      case 'pond':        drawPond(obj.x,obj.y,obj.w,obj.h,obj.seed,t,obj.blobSeed); break;
      case 'bush':        drawBush(obj.x,obj.y,obj.variant); break;
      case 'rock':        drawRock(obj.x,obj.y,obj.big,t); break;
      case 'rockcluster': drawRockCluster(obj.x,obj.y,obj.seed,t); break;
      case 'oak':         drawOak(obj.x,obj.y,obj.variant,t); break;
      case 'pine':        drawPine(obj.x,obj.y,t); break;
      case 'willow':      drawWillow(obj.x,obj.y,t); break;
      case 'mushroom':    drawMushroom(obj.x,obj.y,obj.big); break;
      case 'mushroomring':drawMushroomRing(obj.x,obj.y,obj.seed); break;
      case 'cattail':     drawCattail(obj.x,obj.y,obj.seed,t); break;
      case 'log':         drawLog(obj.x,obj.y,obj.seed); break;
      case 'stump':       drawStump(obj.x,obj.y); break;
      case 'butterfly':   drawButterfly(obj.x,obj.y,obj.hue,obj.seed,t); break;
      case 'stonepath':   drawStonePath(obj.x1,obj.y1,obj.x2,obj.y2,obj.seed); break;
      case 'bridge':      drawBridge(obj.x,obj.y,obj.horizontal,t,'wood'); break;
      // --- rocky-mountain kinds (levels/rocky.js) ---
      case 'mountain':    drawMountain(obj.x,obj.y,obj.w,obj.h,obj.seed); break;
      case 'lake':        drawLake(obj.x,obj.y,obj.w,obj.h,obj.seed,t,obj.blobSeed); break;
      case 'waterfall':   drawWaterfall(obj.x,obj.y,t,obj.h); break;
      case 'boulder':     drawBoulder(obj.x,obj.y,obj.big); break;
      case 'snowypine':   drawSnowyPine(obj.x,obj.y,t); break;
      case 'deadtree':    drawDeadTree(obj.x,obj.y,t); break;
      case 'crystal':     drawCrystal(obj.x,obj.y,obj.seed,t); break;
      case 'snowpatch':   drawSnowPatch(obj.x,obj.y,obj.seed); break;
      case 'campfire':    drawCampfire(obj.x,obj.y,t); break;
      // 'riverbridge' intentionally not drawn here — layered in main.js so swimmers can pass underneath
    }
  });
}


// ===== src/collectibles.js =====
// ====================== COLLECTIBLES ======================
function drawCollectible(item,t){
  if(item.taken) return;
  const bob  = Math.sin(t/320 + item.bob) * 4;
  const pulse= 1 + Math.sin(t/260 + item.bob) * 0.1; // gentle scale throb
  const x = item.x, y = item.y + bob;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  // ---- dark badge background so it pops against any ground ----
  ctx.fillStyle = 'rgba(20,15,10,0.55)';
  roundRect(-13,-13,26,26,6,true,false);

  // ---- bright outer glow ring ----
  const glowColors = {bone:'#FFF0A0', heart:'#FF4466', ball:'#FFD93D', flower:'#D0A0FF', fish:'#4AC8FF'};
  ctx.strokeStyle = glowColors[item.type] || '#FFD93D';
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.55 + Math.sin(t/260+item.bob)*0.25;
  roundRect(-13,-13,26,26,6,false,true);
  ctx.globalAlpha = 1;

  // ---- dropped items (wearables/consumables/etc): no bespoke pixel art, so draw the
  //      item's emoji icon + a stack count. Re-collectable like any other pickup. ----
  if(item.dropped && item.icon && !['bone','heart','ball','flower','fish'].includes(item.type)){
    ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(item.icon, 0, 1);
    if(item.qty>1){
      ctx.fillStyle='#FFF8E8'; ctx.font='bold 9px monospace';
      ctx.fillText('×'+item.qty, 6, 9);
    }
    ctx.restore();
    return;
  }

  // ---- icon ----
  if(item.type==='bone'){
    // bright cream, thick, unmistakable cross-bone shape
    ctx.fillStyle='#FFF8E8';
    // shaft
    ctx.fillRect(-8,-3,16,6);
    // four knobs
    [[-10,-7],[-10,1],[4,-7],[4,1]].forEach(([kx,ky])=>{
      ctx.fillRect(kx,ky,7,7);
    });
    // shine
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-7,-2,5,2);
  } else if(item.type==='heart'){
    ctx.fillStyle='#FF3355';
    // chunky heart — two squares + diamond
    ctx.fillRect(-8,-8,7,7); ctx.fillRect(1,-8,7,7);
    ctx.fillRect(-9,-2,18,5);
    ctx.fillRect(-7,3,14,4);
    ctx.fillRect(-4,7,8,3);
    ctx.fillRect(-1,10,3,2);
    // highlight
    ctx.fillStyle='#FF99AA';
    ctx.fillRect(-6,-7,3,3); ctx.fillRect(3,-7,3,3);
  } else if(item.type==='ball'){
    // bright yellow ball with pink stripe
    ctx.fillStyle='#FFE020';
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FF7090';
    ctx.fillRect(-9,-2,18,4);
    // white shine
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-5,-6,4,3);
  } else if(item.type==='flower'){
    // bright purple petals + gold center, very distinct
    ctx.fillStyle='#CC88FF';
    [[-6,-6],[0,-8],[6,-6],[8,0],[6,6],[0,8],[-6,6],[-8,0]].forEach(([px2,py])=>{
      ctx.fillRect(px2-2,py-2,5,5);
    });
    ctx.fillStyle='#FFE020';
    ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-1,-2,2,2);
  } else if(item.type==='fish'){
    ctx.save();
    ctx.scale(item.dir||1,1);
    // body
    ctx.fillStyle='#FF9E4A';
    ctx.beginPath(); ctx.ellipse(0,0,8,5,0,0,Math.PI*2); ctx.fill();
    // belly
    ctx.fillStyle='#FFD79A';
    ctx.beginPath(); ctx.ellipse(0,2,6,2.5,0,0,Math.PI*2); ctx.fill();
    // tail
    ctx.fillStyle='#FF7A2E';
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-14,-5); ctx.lineTo(-14,5); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(4,-1,1.3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}


// ===== src/friends.js =====
// ====================== FRIENDS ======================
function drawFriend(f,t){
  const bob=f.cheered?Math.sin(t/180)*5:Math.sin(t/600)*1;
  const x=f.x, y=f.y+bob;
  ctx.save();
  // ground shadow
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+20,16,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;

  const cc=f.cheered; // cheered color flag
  if(f.kind==='cat'){
    // body
    px(x-10,y-2,20,18,cc?'#F2A65A':'#9A96C8');
    px(x-6,y+4,12,10,'#FFF0E0');
    // head
    px(x-9,y-16,18,16,cc?'#F2A65A':'#9A96C8');
    // ears
    px(x-10,y-24,7,10,cc?'#E8944A':'#8A88BC'); px(x-8,y-22,4,7,'#FFB4B4');
    px(x+3,y-24,7,10,cc?'#E8944A':'#8A88BC'); px(x+5,y-22,4,7,'#FFB4B4');
    // face
    px(x-6,y-12,4,4,cc?'#FF8C00':'#5050A0'); px(x+2,y-12,4,4,cc?'#FF8C00':'#5050A0');
    px(x-1,y-12,3,3,'#2A2A2A'); px(x+3,y-12,3,3,'#2A2A2A'); // pupils
    px(x-3,y-6,6,3,'#F0C0C0'); // muzzle
    px(x,y-5,2,2,'#CC6688'); // nose
    // tail
    const tw=Math.sin(t/200+f.x)*4;
    px(x+10,y+tw,6,14,cc?'#E8944A':'#8A88BC'); px(x+12,y-4+tw,4,10,cc?'#F2A65A':'#9A96C8');
    // stripes
    if(!cc){ px(x-8,y-14,16,2,'rgba(0,0,60,0.15)'); px(x-8,y-9,16,2,'rgba(0,0,60,0.12)'); }
  } else if(f.kind==='bunny'){
    px(x-8,y,16,16,cc?'#FFD0DE':'#DDD8CC');
    px(x-5,y+6,10,8,cc?'#FFE8F0':'#F0EDE8');
    px(x-9,y-12,18,14,cc?'#FFD0DE':'#DDD8CC');
    // long ears
    px(x-7,y-30,5,20,cc?'#FFD0DE':'#DDD8CC'); px(x-6,y-28,3,16,'#FFB4C0');
    px(x+2,y-30,5,20,cc?'#FFD0DE':'#DDD8CC'); px(x+3,y-28,3,16,'#FFB4C0');
    // face
    px(x-4,y-8,3,3,cc?'#FF6B81':'#5A5A8A'); px(x+1,y-8,3,3,cc?'#FF6B81':'#5A5A8A');
    px(x-2,y-4,5,3,'#F0E0E0'); px(x-1,y-4,2,2,'#FF88AA'); // nose
    // tail
    px(x-4,y+14,8,8,cc?'#FFF0F4':'#F0ECE8');
  } else if(f.kind==='bird'){
    // body
    px(x-10,y-4,20,14,cc?'#7EC8A3':'#A8B8C0');
    px(x-6,y+2,12,8,cc?'#9ADAB8':'#C4D0D8');
    // head
    px(x-7,y-14,14,12,cc?'#7EC8A3':'#A8B8C0');
    // wing detail
    px(x-10,y-2,6,8,cc?'#5AA885':'#8898A0'); px(x+4,y-2,6,8,cc?'#5AA885':'#8898A0');
    // beak
    px(x+6,y-9,8,5,'#FFAA44'); px(x+8,y-7,4,3,'#FF8822');
    // eye
    px(x-2,y-10,4,4,'#2A2A2A'); px(x-1,y-10,2,2,'#FFFFFF'); px(x,y-9,1,1,'#2A2A2A');
    // tail feathers
    px(x-10,y+8,6,10,cc?'#5AA885':'#8898A0'); px(x-7,y+10,4,8,cc?'#7EC8A3':'#A8B8C0');
    // crest
    px(x-3,y-18,3,6,cc?'#5AA885':'#8898A0'); px(x,y-20,3,4,cc?'#7EC8A3':'#A8B8C0');
  } else if(f.kind==='hedgehog'){
    // body
    px(x-12,y-2,24,14,cc?'#F0A855':'#8C7C68');
    px(x-8,y+4,16,8,'#F0DCC0');
    // head
    px(x-8,y-12,14,12,cc?'#E89840':'#7A6C5A');
    px(x-5,y-6,8,6,'#F0DCC0'); // muzzle
    // spines (drawn as short lines)
    const sc=cc?'#C87820':'#5A5050';
    [[-10,-6],[-8,-10],[-4,-13],[0,-14],[4,-13],[8,-10],[10,-6],[-10,0],[-11,4]].forEach(([ox,oy])=>{
      const ang=Math.atan2(oy,-12);
      px(x+ox,y+oy,2,6,sc);
      px(x+ox+(oy<-10?1:0),y+oy-2,2,4,shade(sc,20));
    });
    // face
    px(x-4,y-8,3,3,'#2A1A1A'); px(x+2,y-8,3,3,'#2A1A1A');
    px(x-1,y-5,2,2,'#331A1A'); // nose
    // feet
    px(x-6,y+12,5,5,'#C8A070'); px(x+1,y+12,5,5,'#C8A070');
  } else if(f.kind==='tortoise'){
    // shell — hexagon-ish with panels
    px(x-16,y-4,32,18,cc?'#8AC878':'#7A9A68');
    px(x-12,y-10,24,10,cc?'#9AD888':'#8AAA78');
    px(x-8,y-13,16,6,cc?'#AAEA98':'#9ABB88');
    // shell panels
    [[x-8,y-8],[x,y-8],[x-12,y-2],[x-4,y-2],[x+4,y-2]].forEach(([px2,py])=>{ px(px2,py,6,6,'rgba(0,0,0,0.1)'); });
    px(x-10,y-4,20,12,cc?'#A0DC8C':'#90B47C'); // highlight band
    // head
    px(x+14,y-4,10,8,cc?'#8AC878':'#8A9A70');
    px(x+16,y-6,6,5,cc?'#A0DC8C':'#9AAA80');
    px(x+20,y-4,2,2,'#2A2A2A'); // eye
    // legs
    [[x-14,y+10],[x-6,y+12],[x+2,y+12],[x+8,y+10]].forEach(([lx,ly])=>px(lx,ly,6,8,cc?'#8AC878':'#7A8A68'));
    // tail
    px(x-18,y+2,6,6,cc?'#8AC878':'#7A9A68');
  } else if(f.kind==='fox'){
    // ---- Mountain Fox ---- (sad = washed grey-orange; cheered = vivid orange)
    const FC=cc?'#E8792E':'#B08668', FD=cc?'#C85E1E':'#8E6A50', FW='#F6EEE0';
    // tail (bushy, white tip) swishing
    const tw=Math.sin(t/220+f.x)*4;
    px(x+8,y-2+tw*0.4,8,16,FD); px(x+10,y+8+tw,6,7,FW);
    // body
    px(x-10,y-2,20,15,FC); px(x-6,y+4,12,9,FW);
    // legs
    px(x-7,y+11,4,6,FD); px(x+3,y+11,4,6,FD);
    // head
    px(x-9,y-16,18,15,FC);
    px(x-6,y-8,12,7,FW);           // white muzzle/cheeks
    // ears (tall, dark tips)
    px(x-9,y-24,6,10,FC); px(x-8,y-26,4,5,FD);
    px(x+3,y-24,6,10,FC); px(x+4,y-26,4,5,FD);
    // eyes + nose
    px(x-5,y-12,3,3,'#2A2A2A'); px(x+3,y-12,3,3,'#2A2A2A');
    px(x-4,y-12,1,1,'#fff'); px(x+4,y-12,1,1,'#fff');
    px(x-1,y-6,3,3,'#2A2A2A');
  } else if(f.kind==='goat'){
    // ---- Mountain Goat ---- (shaggy cream coat, curved horns, beard)
    const GC=cc?'#FBF6EC':'#D8D2C4', GD=cc?'#E4DCCB':'#B8B2A4', GH='#7C6A50';
    // body (shaggy)
    px(x-11,y-2,22,15,GC); px(x-11,y+2,22,4,GD); px(x-11,y+8,22,3,GD); // fur bands
    px(x-8,y+11,4,7,GC); px(x+4,y+11,4,7,GC);
    px(x-8,y+16,4,2,GH); px(x+4,y+16,4,2,GH); // hooves
    // head
    px(x-7,y-15,15,14,GC);
    px(x-4,y-6,9,5,GD);            // muzzle
    // horns (curve back)
    px(x-6,y-21,3,7,GH); px(x-7,y-23,3,4,GH); px(x-9,y-24,3,3,GH);
    px(x+4,y-21,3,7,GH); px(x+5,y-23,3,4,GH); px(x+7,y-24,3,3,GH);
    // ears
    px(x-9,y-14,3,5,GD); px(x+7,y-14,3,5,GD);
    // beard
    px(x-2,y-1,4,6,GC); px(x-1,y+4,2,4,GD);
    // eyes + nose
    px(x-4,y-11,3,3,'#2A2A2A'); px(x+3,y-11,3,3,'#2A2A2A');
    px(x-3,y-11,1,1,'#fff'); px(x+4,y-11,1,1,'#fff');
    px(x-1,y-5,3,2,'#5A4A3A');
  } else if(f.kind==='owl'){
    // ---- Snow Owl ---- (round, big eyes, ear tufts)
    const OC=cc?'#EDEDF4':'#9AA0AE', OD=cc?'#CFD2E0':'#7C828E', OF='#F6F1E4';
    // body
    px(x-11,y-12,22,26,OC);
    px(x-8,y-6,16,16,OF);           // pale chest
    // wings
    px(x-13,y-8,5,18,OD); px(x+8,y-8,5,18,OD);
    // wing feather ticks
    px(x-12,y-4,3,2,OC); px(x-12,y+2,3,2,OC); px(x+9,y-4,3,2,OC); px(x+9,y+2,3,2,OC);
    // ear tufts
    px(x-9,y-18,4,7,OD); px(x+5,y-18,4,7,OD);
    // facial disc + huge eyes
    px(x-8,y-11,7,7,'#FFF6E0'); px(x+1,y-11,7,7,'#FFF6E0');
    const blink=(Math.sin(t/900+f.x)>0.96)?1:0;
    px(x-6,y-9,4,4,cc?'#FFC53C':'#4A4E5A'); px(x+3,y-9,4,4,cc?'#FFC53C':'#4A4E5A');
    if(!blink){ px(x-5,y-8,2,2,'#1A1A1A'); px(x+4,y-8,2,2,'#1A1A1A'); }
    // beak + feet
    px(x-1,y-5,3,4,'#E8A23C'); px(x+1,y-4,1,3,'#C8842A');
    px(x-5,y+12,4,3,'#E8A23C'); px(x+2,y+12,4,3,'#E8A23C');
  } else if(f.kind==='marmot'){
    // ---- Marmot ---- (chubby alpine ground-dweller)
    const MC=cc?'#C89050':'#9A8A78', MD=cc?'#A6733A':'#7C6E5E', MW='#EAD8BE';
    // body (round, upright)
    px(x-10,y-6,20,20,MC);
    px(x-6,y+2,12,11,MW);          // belly
    // little arms
    px(x-8,y+2,4,7,MD); px(x+4,y+2,4,7,MD);
    // feet
    px(x-6,y+13,5,4,MD); px(x+1,y+13,5,4,MD);
    // head
    px(x-8,y-16,16,12,MC);
    px(x-4,y-8,9,5,MW);            // muzzle
    // small round ears
    px(x-8,y-18,4,4,MD); px(x+4,y-18,4,4,MD);
    // eyes, nose, buck teeth
    px(x-4,y-12,3,3,'#2A2A2A'); px(x+2,y-12,3,3,'#2A2A2A');
    px(x-3,y-12,1,1,'#fff'); px(x+3,y-12,1,1,'#fff');
    px(x-1,y-6,3,2,'#4A3A2A'); px(x-1,y-4,3,2,'#FFFFFF');
  } else if(f.kind==='bearcub'){
    // ---- Bear Cub ---- (round, cuddly, big ears)
    const BC=cc?'#8A5A34':'#6E5E50', BD=cc?'#6E4526':'#544A40', BM='#D8B48C';
    // body
    px(x-11,y-4,22,18,BC);
    px(x-6,y+3,12,9,BM);           // tummy
    // legs
    px(x-9,y+12,6,6,BD); px(x+3,y+12,6,6,BD);
    // head
    px(x-9,y-16,18,14,BC);
    // big round ears
    px(x-10,y-20,7,7,BC); px(x-8,y-18,3,3,BM);
    px(x+3,y-20,7,7,BC); px(x+5,y-18,3,3,BM);
    // snout
    px(x-4,y-8,9,6,BM); px(x-1,y-6,3,3,'#2A2A2A');
    // eyes
    px(x-5,y-12,3,3,'#2A2A2A'); px(x+3,y-12,3,3,'#2A2A2A');
    px(x-4,y-12,1,1,'#fff'); px(x+4,y-12,1,1,'#fff');
  }

  ctx.restore();

  // speech bubble / progress
  if(!f.cheered){
    ctx.save();
    ctx.fillStyle='#FFF8EF'; ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1.5;
    roundRect(x-18,y-46,36,18,5,true,true);
    ctx.fillStyle='#4A3F35'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`${f.given}/${f.need} 🦴`,x,y-33);
    // indicator arrow down
    ctx.fillStyle='#FFF8EF'; ctx.beginPath(); ctx.moveTo(x-5,y-28); ctx.lineTo(x+5,y-28); ctx.lineTo(x,y-22); ctx.fill();
    ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  } else {
    ctx.save(); ctx.font='16px serif'; ctx.textAlign='center';
    ctx.fillText('💛',x,y-36+Math.sin(t/200)*4);
    ctx.fillText('✨',x-14,y-28+Math.sin(t/250+1)*3);
    ctx.fillText('✨',x+14,y-28+Math.sin(t/300+2)*3);
    ctx.restore();
  }
}




// ===== src/entities/registry.js =====
// ====================== ENTITIES ======================
// Level-owned dynamic actors (enemies, NPCs, and future kinds). Each entity is a
// plain data object with a `kind`; its behaviour comes from a def registered here.
// Adding a new kind of thing in the world = register a kind + spawn instances from a
// level's generate(). (Collectibles and friends predate this system and keep their
// own specialised arrays for now; they can fold into this registry later.)
//
// A def may implement:
//   init(e)            — one-time setup when spawned
//   update(e, t, dt)   — per-frame logic
//   draw(e, t)         — world-space render (y-sorted with players in the main loop)
//   onInteract(e, p)   — called when player p interacts (action key) within range
//   radius             — default interaction radius

let entities = [];   // rebuilt per level by generate() via Entities.clear()/spawn()

const Entities = {
  _kinds: {},

  register(kind, def){ this._kinds[kind] = def; return def; },
  def(kind){ return this._kinds[kind] || null; },

  spawn(kind, props){
    const e = Object.assign({ kind }, props);
    const d = this.def(kind);
    if(d && d.init) d.init(e);
    entities.push(e);
    return e;
  },
  clear(){ entities.length = 0; },
  all(){ return entities; },

  updateAll(t, dt){ for(const e of entities){ const d=this.def(e.kind); if(d && d.update) d.update(e, t, dt); } },

  // Nearest interactable entity to player p within range.
  interactableNear(p){
    let best=null, bestD=Infinity;
    for(const e of entities){
      const d=this.def(e.kind);
      if(!d || !d.onInteract) continue;
      const r=e.radius || d.radius || 36;
      const dist=Math.hypot(p.x-e.x, p.y-e.y);
      if(dist<r && dist<bestD){ best=e; bestD=dist; }
    }
    return best;
  },
  interact(p){
    const e=this.interactableNear(p);
    if(e){ this.def(e.kind).onInteract(e, p); return true; }
    return false;
  },
};

// ===== src/entities/enemy.js =====
// ====================== ENTITY: ENEMY (grumpy badger) ======================
// A simple wander-then-chase critter. Proof that the entity registry supports
// active adversaries; tune/extend by adding fields to the spawned instance.

function _nearestPlayer(e){
  let best=null, bestD=Infinity;
  for(const p of Game.players){ if(p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bestD){ bestD=d; best=p; } }
  return best;
}

Entities.register('enemy', {
  radius: 30,

  init(e){
    e.speed   = e.speed || 0.9;
    e.chaseR  = e.chaseR || 120;   // start chasing within this range
    e.dir     = 1;
    e.wanderT = 0;
    e.wanderAng = 0;
    e.cool    = 0;                  // touch cooldown (ms)
    e.bob     = 0;
  },

  update(e, t, dt){
    // Slow to a swim in water, just like the dogs.
    const swim = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming)) ? 0.5 : 1;
    e.swimming = swim<1;
    const target=_nearestPlayer(e);
    const dist=target ? Math.hypot(target.x-e.x, target.y-e.y) : Infinity;

    if(target && dist<e.chaseR){
      // chase
      const ang=Math.atan2(target.y-e.y, target.x-e.x);
      e.x+=Math.cos(ang)*e.speed*1.4*swim;
      e.y+=Math.sin(ang)*e.speed*1.4*swim;
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<20 && e.cool<=0){ _enemyTouch(e, target); e.cool=900; }
    } else {
      // wander
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(600,1600); }
      e.x+=Math.cos(e.wanderAng)*e.speed*swim;
      e.y+=Math.sin(e.wanderAng)*e.speed*swim;
      e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }

    e.x=clamp(e.x, 20, WORLD_W-20);
    e.y=clamp(e.y, 26, WORLD_H-20);
    if(e.cool>0) e.cool=Math.max(0, e.cool-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/300)*1);
    const D=e.dir; // 1 right, -1 left
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+10,13,4,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;
    // body (dark grey badger)
    px(x-11,y-4,22,13,'#5A5650');
    px(x-8,y+2,16,7,'#8A8680');   // lighter belly
    // legs
    px(x-8,y+8,4,5,'#3A3630'); px(x+4,y+8,4,5,'#3A3630');
    // head
    px(x+D*6-6,y-10,12,11,'#4A4640');
    // white face stripe (badger)
    px(x+D*6-1,y-10,2,10,'#F0ECE4');
    // ears
    px(x+D*6-6,y-13,3,4,'#3A3630'); px(x+D*6+3,y-13,3,4,'#3A3630');
    // eyes (angry)
    px(x+D*6-4,y-6,2,2,'#FF3030'); px(x+D*6+2,y-6,2,2,'#FF3030');
    // grumpy brow
    px(x+D*6-5,y-7,10,1,'#1A1616');
  },
});

function _enemyTouch(e, p){
  spawnSparkles(p.x, p.y-8, '#E05555', 10);
  // A nip costs the dog health (1 heart). Health.damage handles HUD + faint.
  if(typeof Health!=='undefined') Health.damage(p, 2);
  showToast('😾 The grumpy badger nipped you! (-1 ❤️)', 1500);
  // knock the dog back a little
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*14, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*14, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}

// ===== src/entities/wolf.js =====
// ====================== ENTITY: WOLF (rocky-mountain predator) ======================
// A tougher cousin of the meadow badger: faster, spots you from farther away, lunges
// in bursts, and bites harder. Rocky Mountains spawns a small pack of these, which is
// most of why the second level bites back. Same wander→chase shape as `enemy`, tuned up.

function _wolfNearestPlayer(e){
  let best=null, bestD=Infinity;
  for(const p of Game.players){ if(p.hp<=0) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bestD){ bestD=d; best=p; } }
  return best;
}

Entities.register('wolf', {
  radius: 32,

  init(e){
    e.speed   = e.speed   || 1.15;   // brisk — outpaces a corgi, presses a husky
    e.chaseR  = e.chaseR  || 190;    // keen senses: long detection range
    e.dmg     = e.dmg     || 3;      // bites for more than a heart
    e.dir     = 1;
    e.wanderT = 0;
    e.wanderAng = 0;
    e.cool    = 0;                   // bite cooldown (ms)
    e.lunge   = 0;                   // brief speed burst timer (ms)
    e.lungeCd = 0;                   // between-lunge cooldown (ms)
    e.bob     = 0;
  },

  update(e, t, dt){
    // Slow to a swim in water, just like the dogs.
    const swim = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming)) ? 0.5 : 1;
    e.swimming = swim<1;
    const target=_wolfNearestPlayer(e);
    const dist=target ? Math.hypot(target.x-e.x, target.y-e.y) : Infinity;

    if(target && dist<e.chaseR){
      // periodic lunge: a short burst of extra speed to close the gap
      if(e.lungeCd<=0 && dist>40 && dist<e.chaseR*0.8){ e.lunge=380; e.lungeCd=2200; }
      const burst=e.lunge>0 ? 1.9 : 1.45;
      const ang=Math.atan2(target.y-e.y, target.x-e.x);
      e.x+=Math.cos(ang)*e.speed*burst*swim;
      e.y+=Math.sin(ang)*e.speed*burst*swim;
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<22 && e.cool<=0){ _wolfBite(e, target); e.cool=850; }
    } else {
      // loping wander
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(500,1400); }
      e.x+=Math.cos(e.wanderAng)*e.speed*0.8*swim;
      e.y+=Math.sin(e.wanderAng)*e.speed*0.8*swim;
      e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }

    e.x=clamp(e.x, 20, WORLD_W-20);
    e.y=clamp(e.y, 26, WORLD_H-20);
    if(e.cool>0)    e.cool=Math.max(0, e.cool-dt);
    if(e.lunge>0)   e.lunge=Math.max(0, e.lunge-dt);
    if(e.lungeCd>0) e.lungeCd=Math.max(0, e.lungeCd-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/280)*1);
    const D=e.dir; // 1 right, -1 left
    const body='#6A6E78', belly='#9AA0AA', dark='#44484F', fang='#F4F4F0';
    // shadow
    ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+11,15,4,0,0,Math.PI*2); ctx.fillStyle='#181C22'; ctx.fill(); ctx.globalAlpha=1;
    // bushy tail (trails behind the facing direction)
    px(x-D*13-2,y-6,7,6,dark); px(x-D*15-2,y-8,5,5,body);
    // body — leaner and longer than the badger
    px(x-12,y-5,24,13,body);
    px(x-9,y+1,18,6,belly);
    // legs
    px(x-9,y+7,4,6,dark); px(x-2,y+7,4,6,dark); px(x+6,y+7,4,6,dark);
    // head
    px(x+D*7-7,y-11,14,12,body);
    // pricked ears
    px(x+D*7-6,y-15,4,5,dark); px(x+D*7+2,y-15,4,5,dark);
    // snarling muzzle + fang
    px(x+D*10-3,y-4,7,5,belly);
    px(x+D*12-1,y-1,2,2,fang);
    // glowing eyes + angry brow
    px(x+D*7-4,y-7,2,2,'#FFC400'); px(x+D*7+2,y-7,2,2,'#FFC400');
    px(x+D*7-5,y-8,10,1,'#22252B');
  },
});

function _wolfBite(e, p){
  spawnSparkles(p.x, p.y-8, '#D64545', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  showToast('🐺 A mountain wolf lunged at you!', 1400);
  // strong knockback
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*18, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*18, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}

// ===== src/entities/grave.js =====
// ====================== ENTITY: GRAVE ======================
// A little headstone left where a dog fainted. Purely a marker: no update, no
// interaction — it just draws (y-sorted with the living actors in the main loop) and
// rides along in save/load like any other entity. Health.onDown spawns one at the
// death spot; LevelManager clears them when the next level generates.

Entities.register('grave', {
  radius: 0,

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // ground shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+7,12,4,0,0,Math.PI*2); ctx.fillStyle='#141414'; ctx.fill(); ctx.globalAlpha=1;
    // earth mound
    px(x-11,y+3,22,6,'#6B5A3E'); px(x-11,y+3,22,2,'#7C6A4A');
    // headstone slab (rounded top)
    px(x-7,y-13,14,17,'#9A9A92');
    px(x-5,y-16,10,4,'#9A9A92');
    px(x-3,y-18,6,3,'#9A9A92');
    px(x-7,y-13,14,2,'#B6B6AC');           // top-lit edge
    px(x+5,y-13,2,17,'#7E7E76');           // right shade
    // engraved cross
    px(x-1,y-11,2,9,'#6E6E66'); px(x-4,y-8,8,2,'#6E6E66');
    // a single flower laid at the base
    px(x-9,y+5,2,3,'#5A8A4A');
    px(x-10,y+3,2,2,'#FF9EC0'); px(x-8,y+3,2,2,'#FF9EC0'); px(x-9,y+4,2,2,'#FFE066');
  },
});

// ===== src/entities/critter.js =====
// ====================== ENTITY: CRITTER (friendly wildlife) ======================
// Peaceful Canadian wildlife that roams the valley and NEVER attacks. Walk up and press
// the action key to greet them: sparkles, a happy sound, and a cheerful message. The
// first greeting makes friends and gifts a few treats; after that they just say hello.
// Distinct from `friends` (the sad animals you must cheer to win) — critters are a
// purely positive bonus. Add a species by giving it an entry in CRITTERS + a draw branch.

const CRITTERS = {
  moose:  { name:'Moose',  icon:'🫎', gift:3, roam:74, speed:0.35,
            greet:'The gentle moose lowers its great antlers to say hello!',
            lines:['The moose snuffles your ear and huffs happily.',
                   'The moose ambles alongside you for a while.'] },
  beaver: { name:'Beaver', icon:'🦫', gift:2, roam:56, speed:0.4,
            greet:'The busy beaver waves a friendly flat-tailed hello!',
            lines:['The beaver proudly shows off its big front teeth.',
                   'The beaver nudges a little twig over to you.'] },
  loon:   { name:'Loon',   icon:'🐦', gift:2, roam:48, speed:0.28, aquatic:true,
            greet:'The loon lifts its head and sings a beautiful call!',
            lines:['The loon warbles a cheerful, echoing tune.',
                   'The loon drifts calmly at your side.'] },
  duck:   { name:'Duck',   icon:'🦆', gift:2, roam:40, speed:0.3, aquatic:true,
            greet:'The duck paddles right over with a happy quack!',
            lines:['The duck bobs its head and quacks softly.',
                   'The duck preens its glossy feathers, content.'] },
  squirrel:{name:'Squirrel',icon:'🐿️', gift:2, roam:66, speed:0.5,
            greet:'The squirrel scampers up and offers you an acorn!',
            lines:['The squirrel flicks its big bushy tail at you.',
                   'The squirrel chatters brightly from a low branch.'] },
};

Entities.register('critter', {
  radius: 40,

  init(e){
    e.species = e.species || 'moose';
    const d = CRITTERS[e.species] || {};
    e.speed = e.speed || d.speed || 0.35;
    e.roam  = e.roam  || d.roam  || 60;
    e.homeX = (typeof e.homeX==='number') ? e.homeX : e.x;
    e.homeY = (typeof e.homeY==='number') ? e.homeY : e.y;
    e.aquatic = !!d.aquatic;    // ducks/loons float on the surface; land critters submerge
    e.dir = 1; e.wanderT = 0; e.wanderAng = 0; e.cool = 0; e.greeted = !!e.greeted; e.bob = 0;
  },

  // Gentle wander around home — never chases, never leaves its patch.
  update(e, t, dt){
    // Land critters slow to a swim in water; water birds (aquatic) glide freely. Either
    // way, being on water flags a ripple in the draw pass.
    const d=CRITTERS[e.species]||{};
    const inW = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming));
    const swim = (inW && !d.aquatic) ? 0.5 : 1;
    e.swimming = inW;
    e.wanderT -= dt;
    if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(1200,2800); }
    const nx=e.x+Math.cos(e.wanderAng)*e.speed*swim, ny=e.y+Math.sin(e.wanderAng)*e.speed*swim;
    if(Math.hypot(nx-e.homeX, ny-e.homeY) < e.roam){ e.x=nx; e.y=ny; e.dir=Math.cos(e.wanderAng)>=0?1:-1; }
    else { e.wanderT=0; }                       // turned back at the edge of its range
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/600+e.homeX)*1.2), D=e.dir;
    // ground shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+14,16,5,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;

    if(e.species==='moose'){
      const B='#6E4A2E', BD='#553920', BL='#8A5E3A', M='#3A2A1C', bell='#4A3320';
      // legs
      px(x-9,y+3,3,13,M); px(x-3,y+5,3,11,M); px(x+3,y+3,3,13,M); px(x+8,y+5,3,11,M);
      // body + shoulder hump
      px(x-12,y-8,24,15,B); px(x-9,y-3,18,8,BL); px(x-12,y-12,9,6,B);
      // head (offset toward facing dir) + snout + dewlap
      const hx=x+D*11;
      px(hx-5,y-19,10,11,B); px(hx+D*4,y-15,6,5,BD); px(hx-2,y-8,5,8,bell);
      px(hx-5,y-21,3,4,BD); px(hx+4,y-21,3,4,BD);          // ears
      px(hx+(D>0?2:-2),y-15,2,2,'#141414');                // eye
      // broad palmate antlers
      px(hx-11,y-25,8,4,BL); px(hx-13,y-28,6,4,BL); px(hx-14,y-24,3,3,BL);
      px(hx+4,y-25,8,4,BL);  px(hx+8,y-28,6,4,BL);  px(hx+12,y-24,3,3,BL);
    } else if(e.species==='beaver'){
      const B='#6B4A30', BD='#523620', BL='#8A6242', T='#3E2A18', teeth='#F4EAD0';
      // flat paddle tail behind
      px(x-D*11-2,y+3,9,7,T); px(x-D*13,y+4,4,5,'#2E2012');
      // body
      px(x-8,y-4,16,13,B); px(x-5,y+2,10,6,BL);
      // head + ears + eyes + nose + buck teeth
      const hx=x+D*6;
      px(hx-5,y-12,11,10,B);
      px(hx-4,y-14,3,3,BD); px(hx+3,y-14,3,3,BD);
      px(hx-2,y-8,2,2,'#141414'); px(hx+2,y-8,2,2,'#141414');
      px(hx-1,y-4,3,2,'#3A2A1A'); px(hx-1,y-2,3,2,teeth);
      // paws
      px(x-6,y+8,3,3,BD); px(x+3,y+8,3,3,BD);
    } else if(e.species==='loon'){
      const blk='#22262C', wht='#EDEDE6', red='#C43A3A';
      // floating body (black back, pale side) with checkered specks
      px(x-10,y-4,20,10,blk); px(x-8,y+0,16,6,wht);
      px(x-6,y-3,2,2,wht); px(x-1,y-3,2,2,wht); px(x+4,y-3,2,2,wht);
      // upright neck + head + beak + red eye + white collar
      const hx=x+D*9;
      px(hx-3,y-13,6,10,blk); px(hx+D*1,y-15,5,5,blk);
      px(hx+D*5,y-13,4,2,'#2A2E34');
      px(hx+(D>0?1:-1),y-12,1,1,red);
      px(hx-3,y-6,6,2,wht);
    } else if(e.species==='duck'){
      const body='#8A6A46', head='#2E6B44', wing='#6E5236', bill='#E8A23C', wht='#EDE6D6';
      // rounded floating body + pale underside + wing + tail tuft
      px(x-9,y-3,18,10,body); px(x-7,y+1,14,6,wht); px(x-2,y-2,8,6,wing); px(x-11,y-4,4,4,body);
      // neck + glossy green head + white ring + bill + eye
      const hx=x+D*8;
      px(hx-3,y-11,6,9,head); px(hx+D*2,y-12,5,5,head); px(hx-3,y-6,6,2,wht);
      px(hx+D*5,y-10,4,3,bill);
      px(hx+(D>0?1:-1),y-10,1,1,'#141414');
    } else if(e.species==='squirrel'){
      const B='#A85A2E', BD='#8A4520', BL='#C87A44', wht='#F0DDC0', acorn='#7A5230';
      // big bushy curled tail behind
      px(x-D*8-2,y-11,6,16,BD); px(x-D*10,y-13,5,10,B); px(x-D*9,y-4,4,8,BL);
      // upright body + pale belly
      px(x-6,y-6,12,14,B); px(x-4,y+0,8,9,wht);
      // head + ears + eye + nose
      const hx=x+D*3;
      px(hx-5,y-14,10,9,B);
      px(hx-5,y-17,3,4,BD); px(hx+3,y-17,3,4,BD);
      px(hx+(D>0?2:-2),y-11,2,2,'#141414'); px(hx+(D>0?4:-4),y-9,2,2,'#3A2A1A');
      // little paws holding an acorn
      px(x-2,y-2,4,5,BL); px(x-1,y+1,3,3,acorn);
    }

    // floating mood: a heart once befriended, a chat bubble before
    const by=y-28+Math.sin(t/240+e.homeY)*3;
    ctx.font='13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(e.greeted?'💛':'💬', x, by);
  },

  onInteract(e, p){
    if(e.cool>0) return;
    e.cool=800;
    const d=CRITTERS[e.species]||{};
    spawnSparkles(e.x, e.y-8, e.greeted?'#FF8FA3':'#FFD93D', 18);
    if(typeof sfxCheer==='function') sfxCheer();
    if(!e.greeted){
      e.greeted=true;
      const gift=d.gift||2; p.treats+=gift;
      if(typeof updateHUD==='function') updateHUD();
      showToast(`${d.icon||'🐾'} ${d.greet||'A friendly critter says hi!'} (+${gift} treats)`, 2600);
    } else {
      const lines=d.lines||['So happy to see you!'];
      showToast(`${d.icon||'🐾'} ${lines[Math.floor(Math.random()*lines.length)]}`, 2000);
    }
  },
});

// ===== src/entities/npc.js =====
// ====================== ENTITY: NPC (interactable critter) ======================
// A stationary character you can walk up to and interact with (action key). Phase 3
// shows a toast; once the dialog/shop UI exists (Phase 5) onInteract routes there.
// This is the seam for talking NPCs, shopkeepers, and quest-givers.

Entities.register('npc', {
  radius: 42,

  init(e){
    e.name     = e.name     || 'Wanderer';
    e.greeting = e.greeting || 'Hello there, friend!';
    if(e.quest && !e.quest.state) e.quest.state = 'available';   // quest-givers start offering
    e.bob      = 0;
  },

  update(e, t, dt){ e.bob = t; },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/500)*1.5);
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+14,14,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;
    // Per-look palette so each NPC reads as a distinct shop: default merchant
    // (warm brown + green scarf), the tailor (plum coat + purple beret), and the
    // rocky-mountain ranger (slate-blue parka + red scarf + fur hat).
    const tailor = e.look==='tailor';
    const ranger = e.look==='ranger';
    const bodyC = tailor ? '#7E5AA6' : ranger ? '#4E6E86' : '#B07A44';
    const earC  = tailor ? '#654888' : ranger ? '#3A5468' : '#9A6636';
    const scarfC= tailor ? '#E0A93C' : ranger ? '#C0463C' : '#3E9A5A';
    px(x-10,y-2,20,16,bodyC);
    px(x-6,y+4,12,9,'#E8C48A');    // apron/belly
    px(x-9,y-16,18,15,bodyC);      // head
    px(x-10,y-22,6,8,earC); px(x+4,y-22,6,8,earC); // ears
    px(x-8,y-20,3,5,'#C89060'); px(x+5,y-20,3,5,'#C89060');
    px(x-5,y-10,3,3,'#2A2A2A'); px(x+2,y-10,3,3,'#2A2A2A'); // eyes
    px(x-4,y-10,1,1,'#fff'); px(x+3,y-10,1,1,'#fff');
    px(x-3,y-5,6,3,'#E8C48A'); px(x-1,y-6,3,3,'#2A2A2A'); // muzzle+nose
    px(x-10,y-1,20,3,scarfC); // scarf
    if(tailor){
      px(x-8,y-24,16,4,'#5B3F7E');   // beret
      px(x-9,y-21,18,2,'#4A3168');
      px(x+7,y-24,2,3,'#F0D890');     // beret nub
      px(x-13,y+2,4,6,'#E8C48A');     // arm holding a spool of thread
      px(x-15,y+3,4,4,'#E0A93C'); px(x-14,y+4,2,2,'#B07A44');
    }
    if(ranger){
      px(x-9,y-24,18,5,'#6B4A2E');    // fur trapper hat band
      px(x-8,y-27,16,4,'#8A5E38');
      px(x-10,y-23,3,4,'#B8895A'); px(x+7,y-23,3,4,'#B8895A'); // ear flaps
      px(x-2,y-27,4,2,'#C0463C');     // hat pom
      px(x-13,y+1,4,7,bodyC);         // arm holding a lantern
      px(x-16,y+3,5,6,'#3A3A44'); px(x-15,y+4,3,4,'#FFD36A'); // lantern glow
      px(x-6,y+6,12,2,'#3A5468');     // parka belt
    }

    // floating interaction prompt above the head. Quest-givers get a glowing yellow "!"
    // when there's a task to take or hand in, a grey "?" while it's in progress; plain
    // shopkeepers keep the cream "!" talk prompt.
    const by=y-30+Math.sin(t/220)*3;
    const ind=(typeof Quests!=='undefined' && Quests.indicator) ? Quests.indicator(e) : null;
    ctx.save();
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    if(ind==='available' || ind==='ready'){
      const glow=0.55+Math.sin(t/200)*0.3;
      ctx.globalAlpha=0.35*glow; ctx.beginPath(); ctx.arc(x,by,12,0,Math.PI*2); ctx.fillStyle='#FFD23D'; ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle='#FFD23D'; ctx.strokeStyle='#7A5A10'; ctx.lineWidth=1.5;
      roundRect(x-7,by-10,14,19,4,true,true);
      ctx.fillStyle='#5A3F0A'; ctx.font='bold 15px monospace'; ctx.fillText('!', x, by+5);
    } else if(ind==='active'){
      ctx.fillStyle='#EAE6DE'; ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1.5;
      roundRect(x-7,by-9,14,17,4,true,true);
      ctx.fillStyle='#6A6055'; ctx.font='bold 12px monospace'; ctx.fillText('?', x, by+3);
    } else {
      ctx.fillStyle='#FFF8EF'; ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1.5;
      roundRect(x-8,by-9,16,16,4,true,true);
      ctx.fillStyle='#4A3F35'; ctx.font='bold 12px monospace'; ctx.fillText('!', x, by+3);
    }
    ctx.restore();
  },

  onInteract(e, p){
    // Phase 5 upgrades this to a real dialog/shop panel.
    if(typeof UI !== 'undefined' && UI.openDialog){ UI.openDialog(e, p); return; }
    showToast(`${e.name}: "${e.greeting}"`, 2400);
  },
});

// ===== src/dog-sprite.js =====
// ====================== DOG SPRITE ======================
function drawDog(p,t){
  const x=Math.round(p.x), y=Math.round(p.y);
  const C=p.color;
  const D=shade(C,-30);
  const L=shade(C,40);
  const W='#F5EEE0';
  const K='#1A1A1A';

  ctx.save();

  const bounce=p.moving?Math.sin(t/90)*2.5:Math.sin(t/400);
  const by=y+bounce;
  const breed=p.breed||'husky';

  if(!p.swimming){
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+16,14,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;
  }

  if(p.swimming){
    // clip to upper portion only — waterline sits at by+2
    ctx.save();
    ctx.beginPath();
    ctx.rect(x-32, by-42, 64, 44);
    ctx.clip();
  }

  // Worn back-layer items (capes) sit behind the breed sprite.
  const _wa = (typeof Wearables!=='undefined' && p.equipment) ? Wearables.anchor(x, by, p.dir, p.equipment, t) : null;
  if(_wa) Wearables.drawBack(ctx, _wa);

  if(breed==='dinno') _drawDinno(x,by,t,C,D,L,W,K,p);
  else if(breed==='lolla') _drawLolla(x,by,t,C,D,L,W,K,p);
  else if(breed==='corgi') _drawCorgi(x,by,t,C,D,L,W,K,p);
  else if(breed==='shiba') _drawShiba(x,by,t,C,D,L,W,K,p);
  else if(breed==='poodle') _drawPoodle(x,by,t,C,D,L,W,K,p);
  else if(breed==='dalmatian') _drawDalmatian(x,by,t,C,D,L,W,K,p);
  else _drawHusky(x,by,t,C,D,L,W,K,p);

  // Worn front-layer items (hat, scarf, coat, shades) sit on top of the breed sprite.
  if(_wa) Wearables.drawFront(ctx, _wa);

  // Active-ability overlay drawn on the dog (e.g. Lolla's ball in mouth)
  Abilities.drawOnDog(p,x,by);

  // Brief red flash when the dog takes damage (Health.damage sets hurtTimer).
  if(p.hurtTimer>0){
    ctx.globalAlpha=Math.min(0.5, p.hurtTimer/520);
    px(x-13,by-26,26,42,'#FF3B3B');
    ctx.globalAlpha=1;
  }

  if(p.swimming){
    ctx.restore(); // remove clip
    // water surface at waterline
    const wl=Math.round(by)+2;
    const wswing=Math.sin(t/600)*3;
    // water fill over lower body
    ctx.globalAlpha=0.72;
    ctx.beginPath(); ctx.ellipse(x+wswing*0.3,wl,16,6,0,0,Math.PI*2);
    const wg=ctx.createRadialGradient(x-4,wl-2,1,x,wl,16);
    wg.addColorStop(0,'#9CE4FF'); wg.addColorStop(1,'#3AAACC');
    ctx.fillStyle=wg; ctx.fill();
    ctx.globalAlpha=1;
    // animated expanding ripples
    for(let i=0;i<3;i++){
      const phase=((t/1000+i/3)%1);
      const rs=1+phase*1.6;
      ctx.globalAlpha=0.38*(1-phase);
      ctx.beginPath(); ctx.ellipse(x+wswing*0.3,wl,16*rs,6*rs,0,0,Math.PI*2);
      ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1.5; ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  ctx.fillStyle='rgba(255,248,239,0.88)'; roundRect(x-11,by-34,22,11,3,true,false);
  ctx.fillStyle='#4A3F35'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
  ctx.fillText(`P${p.id}`,x,by-25);
  ctx.restore();
}

function _drawHusky(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-10,by-2,20,14,C); px(x-6,by+4,12,8,L);
    px(x-7,by-16,14,16,C); px(x-5,by-13,10,10,L);
    px(x-10,by-22,7,10,D); px(x-8,by-20,4,7,L);
    px(x+3,by-22,7,10,D); px(x+5,by-20,4,7,L);
    px(x-4,by-8,8,5,W); px(x-3,by-6,6,3,C); px(x-2,by-5,4,2,'#AA2244');
    px(x-2,by-9,5,4,K); px(x-1,by-8,2,2,'#555');
    px(x-5,by-13,4,2,K); px(x+1,by-13,4,2,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,D); px(x+10,by-6+tw,4,10,C);
    px(x-8,by+10,6,8,D); px(x+2,by+10,6,8,D);
    return;
  }
  px(x-10,by,20,14,C); px(x-7,by+4,14,8,L); px(x-10,by+2,4,10,D);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,D); px(x-6,by+18+la,4,4,shade(D,-10));
  px(x+2,by+11+la2,5,9,D); px(x+3,by+18+la2,4,4,shade(D,-10));
  px(x-7,by+19+la,5,3,'#9A7060'); px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,D); px(x-15,by+tw,4,8,C); px(x-15,by-2+tw,3,6,W); }
  else { px(x+9,by+2+tw*0.5,5,12,D); px(x+11,by+tw,4,8,C); px(x+12,by-2+tw,3,6,W); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,C);
    if(facing){ px(x-5,by-12,10,6,W); px(x-7,by-14,5,8,D); px(x+2,by-14,5,8,D); }
    px(x-9,by-22,7,10,D); px(x-7,by-20,4,7,L);
    px(x+2,by-22,7,10,D); px(x+4,by-20,4,7,L);
    px(x-6,by-19,3,5,'#FFBBAA'); px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K); px(x-4,by-11,2,2,'#4A3A2A'); px(x-3,by-10,1,1,'#FFFFFF');
      px(x+1,by-11,4,4,K); px(x+2,by-11,2,2,'#4A3A2A'); px(x+3,by-10,1,1,'#FFFFFF');
      px(x-4,by-6,8,5,W); px(x-2,by-4,5,3,L);
      px(x-2,by-7,5,4,K); px(x-1,by-6,2,2,'#444'); px(x,by-5,2,1,'#CC6688');
    } else { px(x-7,by-14,14,12,D); px(x-5,by-16,10,6,C); }
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,C); px(x-2,by-12,8,7,W); px(x+2,by-14,10,8,D);
    px(x+5,by-22,7,10,D); px(x+7,by-20,4,7,L); px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K); px(x+7,by-11,2,2,'#4A3A2A'); px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,W); px(x+14,by-7,4,4,K); px(x+15,by-6,2,2,'#444');
  } else {
    px(x-12,by-14,14,13,C); px(x-6,by-12,8,7,W); px(x-12,by-14,10,8,D);
    px(x-12,by-22,7,10,D); px(x-11,by-20,4,7,L); px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K); px(x-10,by-11,2,2,'#4A3A2A'); px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,W); px(x-20,by-7,4,4,K); px(x-19,by-6,2,2,'#444');
  }
}

function _drawShiba(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-9,by-1,18,12,C); px(x-5,by+3,10,7,W);
    px(x-6,by-15,12,15,C);
    px(x-8,by-22,5,10,D); px(x-6,by-20,3,7,W);
    px(x+3,by-22,5,10,D); px(x+4,by-20,3,7,W);
    px(x-3,by-7,7,5,W); px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/70)*5;
    px(x+8,by-4+tw,5,5,D); px(x+9,by-8+tw,4,4,C); px(x+8,by-11+tw,5,4,C);
    return;
  }
  px(x-9,by,18,12,C); px(x-5,by+3,10,7,W);
  const la=p.moving?Math.sin(t/120)*4:0,la2=p.moving?Math.sin(t/120+Math.PI)*4:0;
  px(x-6,by+11+la,4,8,D); px(x+2,by+11+la2,4,8,D);
  px(x-6,by+18+la,4,3,'#9A7060'); px(x+2,by+18+la2,4,3,'#9A7060');
  const tw=Math.sin(t/150)*3;
  if(p.dir==='right'){ px(x-13,by-1,5,8,D); px(x-14,by-5+tw,4,6,C); px(x-14,by-8+tw,5,4,C); px(x-11,by-7+tw,4,3,C); }
  else { px(x+8,by-1,5,8,D); px(x+10,by-5+tw,4,6,C); px(x+9,by-8+tw,5,4,C); px(x+7,by-7+tw,4,3,C); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-7,by-14,14,13,C);
    if(facing){ px(x-4,by-11,8,6,W); }
    px(x-8,by-23,5,11,D); px(x-6,by-21,3,8,W);
    px(x+3,by-23,5,11,D); px(x+4,by-21,3,8,W);
    if(facing){
      px(x-4,by-10,3,3,K); px(x-3,by-10,1,1,'#fff');
      px(x+1,by-10,3,3,K); px(x+2,by-10,1,1,'#fff');
      px(x-3,by-6,7,4,W); px(x-2,by-8,4,3,K);
    } else { px(x-6,by-14,14,11,D); }
  } else if(p.dir==='right'){
    px(x-1,by-14,13,12,C); px(x-1,by-11,7,7,W);
    px(x+4,by-23,5,11,D); px(x+5,by-21,3,8,W);
    px(x+5,by-10,3,3,K); px(x+6,by-10,1,1,'#fff');
    px(x+7,by-7,8,4,W); px(x+13,by-7,3,3,K);
  } else {
    px(x-12,by-14,13,12,C); px(x-6,by-11,7,7,W);
    px(x-9,by-23,5,11,D); px(x-8,by-21,3,8,W);
    px(x-9,by-10,3,3,K); px(x-8,by-10,1,1,'#fff');
    px(x-19,by-7,8,4,W); px(x-19,by-7,3,3,K);
  }
}

function _drawCorgi(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-11,by,22,11,C); px(x-7,by+3,14,7,W);
    px(x-7,by-14,14,15,C);
    px(x-9,by-23,7,11,D); px(x-7,by-21,4,8,'#FFBBAA');
    px(x+2,by-23,7,11,D); px(x+3,by-21,4,8,'#FFBBAA');
    px(x-3,by-6,7,5,W); px(x-2,by-8,4,3,K);
    const tw=Math.sin(t/80)*3;
    px(x+10,by+1+tw,5,6,W); px(x+11,by-1+tw,4,4,C);
    return;
  }
  px(x-11,by+1,22,10,C); px(x-7,by+4,14,6,W);
  const la=p.moving?Math.sin(t/140)*3:0,la2=p.moving?Math.sin(t/140+Math.PI)*3:0;
  px(x-7,by+11+la,5,6,D); px(x+2,by+11+la2,5,6,D);
  px(x-7,by+16+la,5,3,'#9A7060'); px(x+2,by+16+la2,5,3,'#9A7060');
  const tw=Math.sin(t/200)*2;
  if(p.dir==='right'){ px(x-15,by+1+tw,6,8,W); px(x-15,by-1+tw,5,6,L); }
  else { px(x+9,by+1+tw,6,8,W); px(x+10,by-1+tw,5,6,L); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-13,16,13,C);
    if(facing){ px(x-5,by-10,10,7,W); }
    px(x-9,by-24,7,13,D); px(x-7,by-22,4,10,'#FFBBAA');
    px(x+2,by-24,7,13,D); px(x+3,by-22,4,10,'#FFBBAA');
    if(facing){
      px(x-5,by-9,4,4,K); px(x-4,by-9,2,2,'#fff');
      px(x+1,by-9,4,4,K); px(x+2,by-9,2,2,'#fff');
      px(x-4,by-4,9,5,W); px(x-1,by-6,4,3,K);
    } else { px(x-7,by-13,15,11,D); }
  } else if(p.dir==='right'){
    px(x-1,by-13,13,12,C); px(x-1,by-10,9,7,W);
    px(x+3,by-24,7,13,D); px(x+4,by-22,4,10,'#FFBBAA');
    px(x+6,by-9,4,4,K); px(x+7,by-9,2,2,'#fff');
    px(x+7,by-5,9,5,W); px(x+14,by-5,4,3,K);
  } else {
    px(x-12,by-13,13,12,C); px(x-8,by-10,9,7,W);
    px(x-10,by-24,7,13,D); px(x-8,by-22,4,10,'#FFBBAA');
    px(x-10,by-9,4,4,K); px(x-9,by-9,2,2,'#fff');
    px(x-20,by-5,9,5,W); px(x-20,by-5,4,3,K);
  }
}

function _drawPoodle(x,by,t,C,D,L,W,K,p){
  const arc=(ax,ay,r,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(ax,ay,r,0,Math.PI*2);ctx.fill();};
  if(p.howling){
    arc(x,by+4,9,C);arc(x-5,by+7,5,C);arc(x+5,by+7,5,C);
    arc(x,by-13,7,C);arc(x-5,by-16,5,C);arc(x+5,by-16,5,C);
    arc(x-8,by-14,4,D);arc(x+8,by-14,4,D);
    px(x-2,by-8,5,3,K);px(x-1,by-10,3,3,K);
    const tw=Math.sin(t/70)*5;
    arc(x+10,by-2+tw,3,D);arc(x+12,by-4+tw,4,C);
    return;
  }
  arc(x,by+3,9,C);arc(x-5,by+6,5,C);arc(x+5,by+6,5,C);
  const la=p.moving?Math.sin(t/130)*4:0,la2=p.moving?Math.sin(t/130+Math.PI)*4:0;
  px(x-6,by+12+la,3,8,D);px(x+3,by+12+la2,3,8,D);
  arc(x-4,by+20+la,4,C);arc(x+5,by+20+la2,4,C);
  const tw=Math.sin(t/150)*4;
  if(p.dir==='right'){ arc(x-10,by-1+tw*0.5,3,D);arc(x-12,by-3+tw,4,C); }
  else { arc(x+10,by-1+tw*0.5,3,D);arc(x+12,by-3+tw,4,C); }
  arc(x,by-14,7,C);arc(x-5,by-17,5,C);arc(x+5,by-17,5,C);
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    arc(x-8,by-15,4,D);arc(x+8,by-15,4,D);
    if(facing){
      px(x-4,by-11,3,3,K);px(x-3,by-11,1,1,'#fff');
      px(x+1,by-11,3,3,K);px(x+2,by-11,1,1,'#fff');
      px(x-2,by-8,5,3,W);px(x-1,by-10,3,3,K);
    }
  } else if(p.dir==='right'){
    arc(x+8,by-15,4,D);
    px(x+5,by-11,3,3,K);px(x+6,by-11,1,1,'#fff');
    px(x+7,by-8,5,3,W);px(x+10,by-8,3,3,K);
  } else {
    arc(x-8,by-15,4,D);
    px(x-8,by-11,3,3,K);px(x-7,by-11,1,1,'#fff');
    px(x-12,by-8,5,3,W);px(x-12,by-8,3,3,K);
  }
}

function _drawDalmatian(x,by,t,C,D,L,W,K,p){
  const BASE='#F2EEE8',BSH='#D8D4CC';
  if(p.howling){
    px(x-10,by-2,20,14,BASE);px(x-6,by+4,12,8,W);
    px(x-7,by-16,14,16,BASE);
    px(x-10,by-22,7,10,BSH);px(x-8,by-20,4,7,W);
    px(x+3,by-22,7,10,BSH);px(x+5,by-20,4,7,W);
    px(x-4,by-8,8,5,W);px(x-2,by-5,4,2,'#AA2244');px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,BSH);px(x+10,by-6+tw,4,10,BASE);
    _dalSpots(x,by,C,true);return;
  }
  px(x-10,by,20,14,BASE);px(x-7,by+4,14,8,W);px(x-10,by+2,4,10,BSH);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,BSH);px(x-6,by+18+la,4,4,shade(BSH,-10));
  px(x+2,by+11+la2,5,9,BSH);px(x+3,by+18+la2,4,4,shade(BSH,-10));
  px(x-7,by+19+la,5,3,'#9A7060');px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,BSH);px(x-15,by+tw,4,8,BASE);px(x-15,by-2+tw,3,6,W); }
  else { px(x+9,by+2+tw*0.5,5,12,BSH);px(x+11,by+tw,4,8,BASE);px(x+12,by-2+tw,3,6,W); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,BASE);
    if(facing){px(x-5,by-12,10,6,W);}
    px(x-9,by-22,7,10,BSH);px(x-7,by-20,4,7,W);
    px(x+2,by-22,7,10,BSH);px(x+4,by-20,4,7,W);
    px(x-6,by-19,3,5,'#FFBBAA');px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K);px(x-4,by-11,2,2,'#4A3A2A');px(x-3,by-10,1,1,'#FFF');
      px(x+1,by-11,4,4,K);px(x+2,by-11,2,2,'#4A3A2A');px(x+3,by-10,1,1,'#FFF');
      px(x-4,by-6,8,5,W);px(x-2,by-7,5,4,K);
    } else {px(x-7,by-14,14,12,BSH);}
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,BASE);px(x-2,by-12,8,7,W);px(x+2,by-14,10,8,BSH);
    px(x+5,by-22,7,10,BSH);px(x+7,by-20,4,7,W);px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K);px(x+7,by-11,2,2,'#4A3A2A');px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,W);px(x+14,by-7,4,4,K);
  } else {
    px(x-12,by-14,14,13,BASE);px(x-6,by-12,8,7,W);px(x-12,by-14,10,8,BSH);
    px(x-12,by-22,7,10,BSH);px(x-11,by-20,4,7,W);px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K);px(x-10,by-11,2,2,'#4A3A2A');px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,W);px(x-20,by-7,4,4,K);
  }
  _dalSpots(x,by,C,false);
}

function _drawDinno(x,by,t,C,D,L,W,K,p){
  // Red/copper husky with distinctive white face mask — fixed real-dog colors
  const RC='#C07040', RD=shade(RC,-30), RL=shade(RC,40), RW='#F0EAD8';
  if(p.howling){
    px(x-10,by-2,20,14,RC); px(x-6,by+4,12,8,RW);
    px(x-7,by-16,14,16,RC); px(x-5,by-13,10,10,RW);
    px(x-10,by-22,7,10,RD); px(x-8,by-20,4,7,L);
    px(x+3,by-22,7,10,RD); px(x+5,by-20,4,7,L);
    px(x-4,by-8,8,5,RW); px(x-3,by-6,6,3,RC); px(x-2,by-5,4,2,'#AA2244');
    px(x-2,by-9,5,4,K); px(x-1,by-8,2,2,'#555');
    px(x-5,by-13,4,2,K); px(x+1,by-13,4,2,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,RD); px(x+10,by-6+tw,4,10,RC);
    px(x-8,by+10,6,8,RD); px(x+2,by+10,6,8,RD);
    return;
  }
  px(x-10,by,20,14,RC); px(x-7,by+4,14,8,RW); px(x-10,by+2,4,10,RD);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,RD); px(x-6,by+18+la,4,4,shade(RD,-10));
  px(x+2,by+11+la2,5,9,RD); px(x+3,by+18+la2,4,4,shade(RD,-10));
  px(x-7,by+19+la,5,3,'#9A7060'); px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,RD); px(x-15,by+tw,4,8,RC); px(x-15,by-2+tw,3,6,RW); }
  else { px(x+9,by+2+tw*0.5,5,12,RD); px(x+11,by+tw,4,8,RC); px(x+12,by-2+tw,3,6,RW); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,RC);
    // white mask patch
    px(x-5,by-12,10,6,RW); px(x-4,by-9,8,4,RW);
    px(x-7,by-14,5,8,RD); px(x+2,by-14,5,8,RD);
    px(x-9,by-22,7,10,RD); px(x-7,by-20,4,7,L);
    px(x+2,by-22,7,10,RD); px(x+4,by-20,4,7,L);
    px(x-6,by-19,3,5,'#FFBBAA'); px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K); px(x-4,by-11,2,2,'#4A3A2A'); px(x-3,by-10,1,1,'#FFFFFF');
      px(x+1,by-11,4,4,K); px(x+2,by-11,2,2,'#4A3A2A'); px(x+3,by-10,1,1,'#FFFFFF');
      px(x-4,by-6,8,5,RW); px(x-2,by-4,5,3,L);
      px(x-2,by-7,5,4,K); px(x-1,by-6,2,2,'#444'); px(x,by-5,2,1,'#CC6688');
    } else { px(x-7,by-14,14,12,RD); px(x-5,by-16,10,6,RC); }
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,RC); px(x-2,by-12,8,7,RW); px(x+2,by-14,10,8,RD);
    px(x+5,by-22,7,10,RD); px(x+7,by-20,4,7,L); px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K); px(x+7,by-11,2,2,'#4A3A2A'); px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,RW); px(x+14,by-7,4,4,K); px(x+15,by-6,2,2,'#444');
  } else {
    px(x-12,by-14,14,13,RC); px(x-6,by-12,8,7,RW); px(x-12,by-14,10,8,RD);
    px(x-12,by-22,7,10,RD); px(x-11,by-20,4,7,L); px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K); px(x-10,by-11,2,2,'#4A3A2A'); px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,RW); px(x-20,by-7,4,4,K); px(x-19,by-6,2,2,'#444');
  }
}

function _drawLolla(x,by,t,C,D,L,W,K,p){
  // Sheltie/collie: tricolor — fixed real-dog colors, ignores player color
  const BC='#C07838', BD=shade(BC,-35), BWH='#F4EEE2', BLK='#2A2820';
  if(p.howling){
    px(x-9,by-1,18,13,BC); px(x-5,by+3,10,7,BWH);
    px(x-4,by-3,8,10,BLK);
    px(x-6,by-15,12,15,BC);
    px(x-8,by-23,5,10,BLK); px(x-6,by-21,3,7,BC);
    px(x+3,by-23,5,10,BLK); px(x+4,by-21,3,7,BC);
    px(x-8,by-5,4,10,BWH); px(x+4,by-5,4,10,BWH);
    px(x-3,by-7,7,5,BWH); px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/70)*5;
    px(x+7,by-3+tw,5,10,BLK); px(x+9,by-7+tw,4,7,BC);
    return;
  }
  // body
  px(x-9,by,18,12,BC); px(x-5,by+3,10,7,BWH);
  px(x-4,by,8,8,BLK);
  // mane / chest fluff
  px(x-8,by-2,4,12,BWH); px(x+4,by-2,4,12,BWH);
  const la=p.moving?Math.sin(t/120)*4:0,la2=p.moving?Math.sin(t/120+Math.PI)*4:0;
  px(x-6,by+11+la,4,8,BD); px(x+2,by+11+la2,4,8,BD);
  px(x-6,by+18+la,4,3,'#9A7060'); px(x+2,by+18+la2,4,3,'#9A7060');
  // tail
  const tw=Math.sin(t/170)*4;
  if(p.dir==='right'){ px(x-13,by-1,5,10,BLK); px(x-14,by-5+tw,4,7,BC); px(x-14,by-8+tw,5,4,BWH); }
  else { px(x+8,by-1,5,10,BLK); px(x+10,by-5+tw,4,7,BC); px(x+9,by-8+tw,5,4,BWH); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-6,by-16,13,15,BC);
    px(x-4,by-16,9,8,BLK);
    if(facing){
      px(x-3,by-12,7,5,BWH);
    }
    px(x-8,by-25,5,11,BLK); px(x-6,by-23,3,8,BC);
    px(x+3,by-25,5,11,BLK); px(x+4,by-23,3,8,BC);
    px(x-8,by-5,4,12,BWH); px(x+4,by-5,4,12,BWH);
    if(facing){
      px(x-4,by-10,3,3,K); px(x-3,by-10,1,1,'#fff');
      px(x+1,by-10,3,3,K); px(x+2,by-10,1,1,'#fff');
      px(x-3,by-7,7,6,BWH); px(x-2,by-9,5,4,K);
      px(x-1,by-4,3,2,'#CC6688');
    } else { px(x-5,by-16,12,12,BLK); }
  } else if(p.dir==='right'){
    px(x-1,by-16,13,14,BC); px(x+1,by-16,9,8,BLK);
    px(x+3,by-12,7,5,BWH);
    px(x+4,by-25,5,11,BLK); px(x+5,by-23,3,8,BC);
    px(x+4,by-5,4,12,BWH);
    px(x+5,by-10,3,3,K); px(x+6,by-10,1,1,'#fff');
    px(x+7,by-7,9,5,BWH); px(x+13,by-7,4,4,K);
  } else {
    px(x-12,by-16,13,14,BC); px(x-10,by-16,9,8,BLK);
    px(x-10,by-12,7,5,BWH);
    px(x-9,by-25,5,11,BLK); px(x-8,by-23,3,8,BC);
    px(x-8,by-5,4,12,BWH);
    px(x-9,by-10,3,3,K); px(x-8,by-10,1,1,'#fff');
    px(x-20,by-7,9,5,BWH); px(x-20,by-7,4,4,K);
  }
}

function _dalSpots(x,by,C,howling){
  const spots=howling
    ?[[-3,0,4,4],[4,2,3,4],[-7,4,3,3],[5,-2,3,3],[-5,-12,3,3],[3,-11,4,3]]
    :[[-4,1,4,4],[3,3,3,4],[-7,4,3,3],[5,0,3,3],[-1,6,4,3],
      [-5,-13,3,3],[3,-12,4,3],[-6,-5,3,3],[2,-5,3,3],[-8,2,3,3]];
  ctx.fillStyle=C;
  spots.forEach(([rx,ry,rw,rh])=>ctx.fillRect(Math.round(x+rx),Math.round(by+ry),rw,rh));
}


// ===== src/sparkles.js =====
// ====================== SPARKLES ======================
function drawSparkles(){
  sparkles.forEach(s=>{
    ctx.save(); ctx.globalAlpha=Math.max(0,s.life/s.maxLife);
    ctx.fillStyle=s.color; ctx.fillRect(Math.round(s.x),Math.round(s.y),s.size,s.size);
    ctx.restore();
  });
}


// ===== src/minimap.js =====
// ====================== MINIMAP ======================
function drawMinimap(){
  const MW=120,MH=80,MX=VIEW_W-MW-8,MY=8;
  ctx.save();
  ctx.globalAlpha=0.88;
  ctx.fillStyle='#1A3A1A'; roundRect(MX,MY,MW,MH,6,true,false);
  ctx.strokeStyle='#8ACA5A'; ctx.lineWidth=1.5; roundRect(MX,MY,MW,MH,6,false,true);
  ctx.globalAlpha=1;
  const th=(typeof LevelManager!=='undefined'&&LevelManager.theme)||{};
  const mmGrass=th.minimapGrass||'#4A9A3A', mmWater=th.minimapWater||'#4AACDC';
  // grass
  ctx.fillStyle=mmGrass; ctx.fillRect(MX+1,MY+1,MW-2,MH-2);
  // river
  if(river){
    const sx=MW/WORLD_W,sy=MH/WORLD_H,steps=60;
    ctx.fillStyle=mmWater;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){const x=i*(WORLD_W/steps);if(i===0)ctx.moveTo(MX+x*sx,MY+(riverY(x)-riverWidthAt(x)/2)*sy);else ctx.lineTo(MX+x*sx,MY+(riverY(x)-riverWidthAt(x)/2)*sy);}
    for(let i=steps;i>=0;i--){const x=i*(WORLD_W/steps);ctx.lineTo(MX+x*sx,MY+(riverY(x)+riverWidthAt(x)/2)*sy);}
    ctx.closePath();ctx.fill();
  }
  // ponds + lakes
  worldObjects.filter(o=>o.kind==='pond'||o.kind==='lake').forEach(o=>{
    ctx.fillStyle=mmWater;
    ctx.beginPath(); ctx.ellipse(MX+o.x*(MW/WORLD_W),MY+o.y*(MH/WORLD_H),(o.w/2)*(MW/WORLD_W),(o.h/2)*(MH/WORLD_H),0,0,Math.PI*2); ctx.fill();
  });
  const sx=MW/WORLD_W,sy=MH/WORLD_H;
  // collectibles
  collectibles.forEach(c=>{ if(c.taken)return; ctx.fillStyle=c.type==='fish'?'#4AC8FF':'#FFD93D'; ctx.fillRect(MX+c.x*sx-1,MY+c.y*sy-1,3,3); });
  // friends
  friends.forEach(f=>{ ctx.fillStyle=f.cheered?'#FFD93D':'#FFAAAA'; ctx.fillRect(MX+f.x*sx-3,MY+f.y*sy-3,6,6); });
  // registry entities (hostiles red, friendly wildlife green, graves grey, NPCs yellow)
  const hostile={enemy:1,wolf:1};
  entities.forEach(e=>{
    if(e.kind==='grave'){ ctx.fillStyle='#9A9A92'; ctx.fillRect(MX+e.x*sx-1,MY+e.y*sy-2,3,4); return; }
    if(e.kind==='critter'){ ctx.fillStyle='#7FE0A0'; ctx.fillRect(MX+e.x*sx-2,MY+e.y*sy-2,4,4); return; }
    ctx.fillStyle=hostile[e.kind]?'#E05555':'#FFE08A'; ctx.fillRect(MX+e.x*sx-2,MY+e.y*sy-2,4,4);
  });
  // viewport
  ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
  ctx.strokeRect(MX+cam.x*sx,MY+cam.y*sy,VIEW_W*sx,VIEW_H*sy);
  // players
  ctx.fillStyle=p1.color; ctx.fillRect(MX+p1.x*sx-3,MY+p1.y*sy-3,7,7);
  if(twoPlayer){ ctx.fillStyle=p2.color; ctx.fillRect(MX+p2.x*sx-3,MY+p2.y*sy-3,7,7); }
  ctx.restore();
}


// ===== src/abilities/registry.js =====
// ====================== ABILITY REGISTRY ======================
// Active abilities are plugins keyed by id. A breed opts in via its `abilityId`
// (see data/breeds.js). Each ability def may implement any of:
//
//   spawn()               — create world state at game/level start (all abilities polled)
//   reset()               — clear world state on reset
//   update(p, controls, dt) — per-player, per-frame logic (only for the owning player)
//   drawWorld(t)          — world-space visuals, drawn once per frame
//   drawOnDog(p, x, by)   — overlay drawn on top of a specific dog sprite
//
// This replaces the bespoke Lolla globals: the ball-cannon is now just the first
// registered ability (abilities/ballCannon.js).

const Abilities = {
  _defs: {},

  register(id, def){ this._defs[id] = def; return def; },
  get(id){ return id ? (this._defs[id] || null) : null; },
  forPlayer(p){ return this.get(p && p.abilityId); },

  // Poll every registered ability; each guards internally on whether its owner exists.
  spawnAll(){ for(const id in this._defs){ const d=this._defs[id]; if(d.spawn) d.spawn(); } },
  reset(){ for(const id in this._defs){ const d=this._defs[id]; if(d.reset) d.reset(); } },

  update(p, controls, dt){ const d=this.forPlayer(p); if(d && d.update) d.update(p, controls, dt); },
  drawWorld(t){ for(const id in this._defs){ const d=this._defs[id]; if(d.drawWorld) d.drawWorld(t); } },
  drawOnDog(p, x, by){ const d=this.forPlayer(p); if(d && d.drawOnDog) d.drawOnDog(p, x, by); },
};

// ===== src/abilities/ballCannon.js =====
// ====================== ABILITY: BALL CANNON ======================
// Formerly src/lolla.js. The tennis-ball + cannon fetch mini-game, now registered
// as an ability so ANY breed with abilityId:'ballCannon' gets it (currently Lolla).
// State (ball, cannon, dropHeld) is private to this module instead of being global.

(function(){
  let ball   = null;   // { x, y, state:'idle'|'held'|'flying', carrier, ... }
  let cannon = null;   // { x, y, angle, firingT, smoke[] }
  let dropHeld = false;

  // The active player carrying this ability (replaces getLollaPlayer()).
  function owner(){
    for(const p of Game.players){ if(p && p.abilityId==='ballCannon') return p; }
    return null;
  }

  function spawn(){
    ball=null; cannon=null;
    const dog=owner();
    if(!dog) return;

    let bx,by;
    do{ bx=rand(200,WORLD_W-200); by=rand(200,WORLD_H-200); }
    while(Math.hypot(bx-dog.x,by-dog.y)<160 || isInPond(bx,by));

    ball={ x:bx, y:by, state:'idle', carrier:null,
           startX:bx, startY:by, landX:bx, landY:by,
           flightProgress:0, flightDuration:1500 };

    let cx,cy;
    do{ cx=rand(250,WORLD_W-250); cy=rand(250,WORLD_H-250); }
    while(Math.hypot(cx-bx,cy-by)<220 || Math.hypot(cx-dog.x,cy-dog.y)<180 || isInPond(cx,cy));

    cannon={ x:cx, y:cy, angle:Math.random()*Math.PI*2, firingT:0, smoke:[] };
  }

  function reset(){ ball=null; cannon=null; dropHeld=false; }

  function update(p, controls, dt){
    if(!ball || !cannon) return;
    const dog=owner();
    if(!dog || dog.id!==p.id) return;

    const dropKey = controls.ability;

    // Advance cannon animation
    if(cannon.firingT>0){
      cannon.firingT=Math.max(0, cannon.firingT-dt);
      cannon.smoke.forEach(s=>{ s.x+=s.vx; s.y+=s.vy; s.vy-=0.04; s.life-=dt; s.r+=0.04; });
      cannon.smoke=cannon.smoke.filter(s=>s.life>0);
    }

    if(ball.state==='idle'){
      if(Math.hypot(p.x-ball.x, p.y-ball.y)<22){
        ball.state='held'; ball.carrier=p.id;
        showToast('🎾 Ball! [ability key] near cannon to fire · elsewhere to drop',2800);
      }
    }

    if(ball.state==='held' && ball.carrier===p.id){
      ball.x=p.x; ball.y=p.y;

      if(keys[dropKey] && !dropHeld){
        dropHeld=true;
        const nearCannon=Math.hypot(p.x-cannon.x, p.y-cannon.y)<48;
        if(nearCannon){
          fire();
          showToast('💥 Fired! Go fetch!',1600);
          sfxCollect();
        } else {
          const ox=p.dir==='right'?14:p.dir==='left'?-14:0;
          const oy=p.dir==='down'?12:p.dir==='up'?-12:0;
          ball.x=clamp(p.x+ox,60,WORLD_W-60);
          ball.y=clamp(p.y+oy,60,WORLD_H-60);
          ball.state='idle'; ball.carrier=null;
        }
      }
      if(!keys[dropKey]) dropHeld=false;
    }

    if(ball.state==='flying'){
      ball.flightProgress+=dt/ball.flightDuration;
      if(ball.flightProgress>=1){
        ball.flightProgress=1;
        ball.x=ball.landX; ball.y=ball.landY;
        ball.state='idle'; ball.carrier=null;
        spawnSparkles(ball.x,ball.y,'#B5E853',8);
        showToast('🎾 Fetch!',1200);
      } else {
        ball.x=ball.startX+(ball.landX-ball.startX)*ball.flightProgress;
        ball.y=ball.startY+(ball.landY-ball.startY)*ball.flightProgress;
      }
    }
  }

  function fire(){
    // New random direction every shot
    cannon.angle=Math.random()*Math.PI*2;

    const dist=300+rand(0,120);
    ball.startX=cannon.x; ball.startY=cannon.y;
    ball.landX=clamp(cannon.x+Math.cos(cannon.angle)*dist, 80, WORLD_W-80);
    ball.landY=clamp(cannon.y+Math.sin(cannon.angle)*dist, 80, WORLD_H-80);
    ball.flightProgress=0; ball.state='flying'; ball.carrier=null;
    ball.x=cannon.x; ball.y=cannon.y;

    cannon.firingT=500; // ms total animation

    const tipX=cannon.x+Math.cos(cannon.angle)*35;
    const tipY=cannon.y+Math.sin(cannon.angle)*35;
    for(let i=0;i<6;i++){
      cannon.smoke.push({
        x:tipX+rand(-3,3), y:tipY+rand(-3,3),
        vx:Math.cos(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3),
        vy:Math.sin(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3)-0.3,
        r:rand(3,6), life:rand(280,500),
        col:Math.random()<0.5?'#CCCCCC':'#AAAAAA'
      });
    }
  }

  // ---- Drawing ----

  function drawWorld(t){ drawCannon(t); drawBall(t); }

  function drawBall(t){
    if(!ball || ball.state==='held') return;
    const flightH=ball.state==='flying' ? Math.sin(ball.flightProgress*Math.PI)*50 : 0;
    const bx=Math.round(ball.x), by=Math.round(ball.y);
    const visualY=by-flightH;

    ctx.globalAlpha=Math.max(0.04, 0.3*(1-flightH/60));
    ctx.beginPath();
    ctx.ellipse(bx, by, Math.max(2,7-flightH*0.06), Math.max(1,3-flightH*0.03), 0,0,Math.PI*2);
    ctx.fillStyle='#1A2A1A'; ctx.fill();
    ctx.globalAlpha=1;

    ctx.fillStyle='#B5E853';
    ctx.beginPath(); ctx.arc(bx, visualY, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#CCFF77';
    ctx.beginPath(); ctx.arc(bx-1, visualY-1, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(bx, visualY, 5, 0.35, Math.PI-0.35); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, visualY, 5, Math.PI+0.35, Math.PI*2-0.35); ctx.stroke();

    if(ball.state==='flying'){
      const spin=ball.flightProgress*Math.PI*6;
      ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(bx, visualY, 5, spin, spin+Math.PI); ctx.stroke();
    }
  }

  function drawCannon(t){
    if(!cannon) return;
    const cx=Math.round(cannon.x), cy=Math.round(cannon.y);
    const bob=cannon.firingT>0 ? 0 : Math.sin(t/700)*1;

    cannon.smoke.forEach(s=>{
      const a=Math.max(0, (s.life/400)*0.55);
      ctx.globalAlpha=a;
      ctx.fillStyle=s.col;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;

    ctx.save();
    ctx.translate(cx, cy+bob);

    ctx.globalAlpha=0.18;
    ctx.beginPath(); ctx.ellipse(2,8,18,7,0,0,Math.PI*2);
    ctx.fillStyle='#1A2A1A'; ctx.fill();
    ctx.globalAlpha=1;

    ctx.fillStyle='#6B4C2A'; ctx.fillRect(-16,2,32,8);
    ctx.fillStyle='#7A5830'; ctx.fillRect(-14,0,28,6);
    [-10,10].forEach(wx=>{
      ctx.fillStyle='#4A3018'; ctx.beginPath(); ctx.arc(wx,6,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#7A5830'; ctx.beginPath(); ctx.arc(wx,6,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#AA8850'; ctx.beginPath(); ctx.arc(wx,6,1,0,Math.PI*2); ctx.fill();
    });

    ctx.rotate(cannon.angle);
    let recoil=0;
    if(cannon.firingT>400){
      recoil=((500-cannon.firingT)/100)*8;
    } else if(cannon.firingT>300){
      recoil=((cannon.firingT-300)/100)*8;
    }

    ctx.fillStyle='#4A4A4A';
    ctx.beginPath(); ctx.roundRect(4-recoil,-5,28,10,3); ctx.fill();
    ctx.fillStyle='#666';
    ctx.fillRect(6-recoil,-3,24,6);
    ctx.fillStyle='#FFD700';
    ctx.fillRect(14-recoil,-3,4,6);
    ctx.fillStyle='#2A2A2A'; ctx.fillRect(30-recoil,-6,5,12);
    ctx.fillStyle='#555';   ctx.fillRect(31-recoil,-5,3,10);

    if(cannon.firingT>400){
      const flashA=(cannon.firingT-400)/100;
      ctx.globalAlpha=flashA*0.9;
      const tipX=35-recoil;
      ctx.fillStyle='#FFAA00';
      ctx.beginPath(); ctx.arc(tipX,0,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFFFFF';
      ctx.beginPath(); ctx.arc(tipX,0,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#FFDD00'; ctx.lineWidth=2;
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        ctx.beginPath();
        ctx.moveTo(tipX+Math.cos(a)*5, Math.sin(a)*5);
        ctx.lineTo(tipX+Math.cos(a)*13, Math.sin(a)*13);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    ctx.restore();

    ctx.fillStyle='rgba(255,248,220,0.88)';
    roundRect(cx-30,cy+bob-32,60,13,3,true,false);
    ctx.fillStyle='#4A3F35';
    ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText('BALL CANNON',cx,cy+bob-22);
  }

  function drawOnDog(p, x, by){
    if(!ball || ball.state!=='held' || ball.carrier!==p.id) return;
    const dir=p.dir;
    let bx, bly;
    if(dir==='right')     { bx=x+18; bly=by-8; }
    else if(dir==='left') { bx=x-18; bly=by-8; }
    else if(dir==='down') { bx=x+1;  bly=by-4; }
    else return;

    ctx.fillStyle='#B5E853';
    ctx.beginPath(); ctx.arc(bx,bly,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#CCFF77';
    ctx.beginPath(); ctx.arc(bx-1,bly-1,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(bx,bly,4,0.35,Math.PI-0.35); ctx.stroke();
  }

  Abilities.register('ballCannon', { spawn, reset, update, drawWorld, drawOnDog });
})();

// ===== src/level-manager.js =====
// ====================== LEVEL MANAGER ======================
// Loads a level: sets world size, reseeds RNG, runs the level's generator, and
// rebuilds the themed ground canvas. This is the single entry point for (re)building
// the world — called at startup (main.js) and on each game start (resetGame).

let _currentLevel = null;

const LevelManager = {
  get current(){ return _currentLevel; },
  get theme(){ return _currentLevel ? _currentLevel.theme : null; },

  // Set the active level (for theme/quest) WITHOUT regenerating — used by Save.load(),
  // which restores a world snapshot instead of building a fresh one.
  _setCurrent(level){ _currentLevel = level; },

  load(id){
    const level = Levels.get(id) || Levels.first();
    if(!level){ console.warn('LevelManager: no levels registered'); return null; }
    _currentLevel = level;

    // Resize world + reseed RNG, then generate.
    if(level.size){ WORLD_W = level.size.w; WORLD_H = level.size.h; }
    if(typeof level.seed === 'number') RNG.reseed(level.seed);
    level.generate();

    // Keep quest animals (friends) and merchants (NPC entities) out of the water — their
    // spawn points are fixed, so a procedurally-placed pond/lake can land on one.
    if(typeof nudgeOutOfWater==='function'){
      if(typeof friends!=='undefined' && friends) friends.forEach(f=>nudgeOutOfWater(f));
      if(typeof entities!=='undefined' && entities) entities.forEach(e=>{ if(e.kind==='npc') nudgeOutOfWater(e); });
    }

    // Rebuild the pre-rendered ground with this level's theme.
    buildGroundCanvas();

    // Fresh quest progress for the new level.
    Game.cheeredCount = 0;
    return level;
  },

  // Convenience: (re)load whatever level is current, defaulting to the first.
  reload(){ return this.load(_currentLevel ? _currentLevel.id : (Levels.first() && Levels.first().id)); },

  // Advance an in-progress run to another level: build it, then move the existing dogs
  // to the new spawn and heal them to full. Inventory + treats carry over as a reward
  // for finishing the previous level; quest progress (cheeredCount) resets in load().
  goTo(id){
    const lvl=this.load(id);
    if(!lvl) return null;
    const spawn=lvl.spawn || { x:200, y:200 };
    const players=Game.twoPlayer ? [p1,p2] : [p1];
    players.forEach((p,i)=>{
      if(!p) return;
      p.x=spawn.x+i*60; p.y=spawn.y;
      p.hp=p.maxHp; p.hurtTimer=0; p.swimming=false;
      p.dead=false;                 // fallen dogs are revived for the new level
    });
    if(typeof Abilities!=='undefined'){ Abilities.reset(); Abilities.spawnAll(); }
    if(typeof sparkles!=='undefined') sparkles=[];
    if(typeof updateCamera==='function') updateCamera();
    if(typeof updateHUD==='function') updateHUD();
    if(typeof showToast==='function') showToast(`⛰️ ${lvl.name}`, 2200);
    return lvl;
  },
};

// ===== src/update.js =====
// ====================== UPDATE ======================
function updatePlayer(p,controls,t,dt){
  let dx=0,dy=0;
  if(keys[controls.up])dy--;  if(keys[controls.down])dy++;
  if(keys[controls.left])dx--; if(keys[controls.right])dx++;
  p.moving=dx!==0||dy!==0;
  if(p.moving){
    const len=Math.hypot(dx,dy); dx/=len; dy/=len;
    const swimMul=(p.stats&&p.stats.swim)||0.5; // per-breed swim passive (data/breeds.js)
    const spd=p.swimming?p.speed*swimMul:p.speed;
    p.x+=dx*spd; p.y+=dy*spd;
    if(Math.abs(dx)>Math.abs(dy)) p.dir=dx>0?'right':'left';
    else p.dir=dy>0?'down':'up';
    p.animTimer+=dt;
    if(p.animTimer>160){p.animTimer=0;p.animFrame=1-p.animFrame;}
  }
  resolveCollisions(p);
  p.swimming=isInPond(p.x,p.y,p.swimming);
  if(typeof Health!=='undefined') Health.tick(p,dt);
  Abilities.update(p,controls,dt);
  if(keys[controls.action]&&!p.howling){p.howling=true;p.howlTimer=400;sfxHowl();}
  if(p.howling){p.howlTimer-=dt;if(p.howlTimer<=0)p.howling=false;}
}

function tryCollect(p){
  const now=performance.now();
  collectibles.forEach(item=>{
    if(item.taken)return;
    if(item.pickupAt && now<item.pickupAt) return;          // just-dropped: brief no-pickup window
    if(Math.hypot(p.x-item.x,p.y-item.y)<22){
      const qty=item.qty||1;
      if(Inventory.roomFor(p,item.type) < qty){             // full bag → leave it on the ground
        if(!p._invFullAt || now-p._invFullAt>2200){ showToast('🎒 Inventory full — make room to pick this up!',1600); p._invFullAt=now; }
        return;
      }
      item.taken=true;
      if(!item.dropped) p.treats++;                          // re-collecting a dropped item doesn't re-award a treat
      Inventory.add(p,item.type,qty);
      spawnSparkles(item.x,item.y,item.type==='fish'?'#4AC8FF':'#FFD93D',10);sfxCollect();updateHUD();
    }
  });
}

// Drop an item stack onto the ground just in front of the dog (used by the inventory
// drag-out gesture). Spawns a collectible the world can draw and the dog can re-collect.
function dropItemOnGround(p, id, qty){
  const def=Items.get(id); if(!def) return;
  const ang={up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0}[p.dir];
  const a=(typeof ang==='number')?ang:Math.PI/2;
  const x=clamp(p.x+Math.cos(a)*26, 30, WORLD_W-30);
  const y=clamp(p.y+Math.sin(a)*26+6, 30, WORLD_H-30);
  collectibles.push({ x, y, type:id, qty:qty||1, taken:false, bob:rand(0,Math.PI*2),
    dropped:true, icon:def.icon, pickupAt:performance.now()+950 });
}

function tryDeliver(p,controls){
  if(!keys[controls.action])return;
  friends.forEach(f=>{
    if(f.cheered)return;
    if(Math.hypot(p.x-f.x,p.y-f.y)<44&&p.treats>0){
      const give=Math.min(p.treats,f.need-f.given);
      if(give>0){
        p.treats-=give;f.given+=give;
        spawnSparkles(f.x,f.y-10,'#FF8FA3',8);updateHUD();
        if(f.given>=f.need){
          f.cheered=true;cheeredCount++;
          spawnSparkles(f.x,f.y-10,'#FFD93D',30);sfxCheer();
          showToast(`${f.name} is so happy now! 🎉`);updateHUD();checkWin();
        } else {
          sfxDeliver();showToast(`${f.name}: "${f.msg}"`,1800);
        }
      }
    }
  });
}

// Interact with the nearest interactable entity (NPC) on an action-key press.
// Edge-triggered per player so a held key fires once.
function tryInteract(p,controls){
  const pressed=!!keys[controls.action];
  if(pressed && !p._actionPrev) Entities.interact(p);
  p._actionPrev=pressed;
}

function checkGroupHowl(){
  if(!twoPlayer)return;
  if(Math.hypot(p1.x-p2.x,p1.y-p2.y)<55&&p1.howling&&p2.howling){
    if(!checkGroupHowl.last||performance.now()-checkGroupHowl.last>1500){
      checkGroupHowl.last=performance.now();
      for(let i=0;i<4;i++)spawnSparkles(rand(80,WORLD_W-80),rand(80,WORLD_H-80),'#C9A6FF',14);
      showToast('✨ A magical synchronized howl! ✨',2000);
    }
  }
}

function updateSparkles(){
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.06;s.life--;});
}

// updateHUD() now lives in ui.js (UI.updateHUD) — kept as a global for existing callers.

function checkWin(){
  // Already handled this completion (frozen behind the world map / victory overlay).
  if(Game.state===SCENES.WORLDMAP || Game.state===SCENES.WIN) return;
  // Completion is defined by the current level's quest (falls back to the cheer count).
  const lvl=LevelManager.current;
  const q=lvl&&lvl.quest;
  const done=q?q.isComplete():cheeredCount>=CHEER_TOTAL;
  if(!done) return;
  sfxWin();
  // Freeze the world, then reveal the campaign world map so you can see your progress
  // and continue to the next level (WorldMap handles "no more content yet" gracefully).
  Game.state=SCENES.WORLDMAP;
  setTimeout(()=>{ if(typeof WorldMap!=='undefined') WorldMap.showAfter(lvl.id); }, 700);
}


// ===== src/toast.js =====
// ====================== TOAST ======================
let toastTimer=null;
function showToast(msg,time=2200){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),time);
}


// ===== src/save.js =====
// ====================== SAVE / LOAD ======================
// Serialises a run to localStorage and restores it. Rather than rely on seeded
// regeneration, we snapshot the whole dynamic world (objects, colliders, entities,
// collectibles, friends) so a loaded game is exactly what was saved — including the
// procedurally-placed layout. All of these are plain data (no functions), so JSON
// round-trips cleanly; behaviour lives in the registries (Breeds/Abilities/Entities).

const Save = {
  KEY: 'husky-hearts-save-v1',

  has(){ try { return !!localStorage.getItem(this.KEY); } catch(e){ return false; } },

  _serializePlayer(p){
    return { id:p.id, breed:p.breed, color:p.color, x:p.x, y:p.y, dir:p.dir,
             treats:p.treats,
             inventory:Inventory.cells(p).map(c => c ? { id:c.id, qty:c.qty } : null),
             equipment:Object.assign({}, p.equipment), hp:p.hp, maxHp:p.maxHp, dead:!!p.dead };
  },

  save(){
    if(Game.state!==SCENES.PLAYING && Game.state!==SCENES.PAUSED){
      showToast('Can only save while playing.', 1600); return false;
    }
    const data = {
      version: 1,
      levelId: LevelManager.current ? LevelManager.current.id : null,
      worldW: WORLD_W, worldH: WORLD_H,
      twoPlayer: Game.twoPlayer,
      cheeredCount: Game.cheeredCount,
      progress: (typeof Progress!=='undefined') ? Progress.completed : {},
      players: Game.players.map(p=>this._serializePlayer(p)),
      cam: { x:cam.x, y:cam.y },
      world: { objects: worldObjects, colliders: colliders, river: river },
      collectibles: collectibles,
      friends: friends,
      entities: entities,
    };
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      showToast('💾 Game saved!', 1500);
      return true;
    } catch(e){
      showToast('Save failed: ' + e.message, 2000);
      return false;
    }
  },

  load(){
    let data;
    try { data = JSON.parse(localStorage.getItem(this.KEY)); }
    catch(e){ data = null; }
    if(!data){ showToast('No saved game found.', 1600); return false; }

    // --- level context (theme/quest) without regenerating the world ---
    const level = Levels.get(data.levelId) || Levels.first();
    if(typeof level !== 'undefined' && level) LevelManager._setCurrent(level);
    WORLD_W = data.worldW; WORLD_H = data.worldH;

    // --- world snapshot (const arrays: mutate in place; river is reassignable) ---
    worldObjects.length = 0; (data.world.objects||[]).forEach(o=>worldObjects.push(o));
    colliders.length = 0;    (data.world.colliders||[]).forEach(c=>colliders.push(c));
    river = data.world.river || null;
    collectibles = data.collectibles || [];
    friends = data.friends || [];
    entities = data.entities || [];

    // --- players ---
    twoPlayer = !!data.twoPlayer;
    const restore = (sp)=>{
      const pl = makePlayer(sp.id, sp.color, sp.x, sp.y, sp.breed);
      pl.dir = sp.dir; pl.treats = sp.treats;
      pl.inventory = sp.inventory || Inventory.create(); Inventory.cells(pl); // normalize length
      pl.equipment = sp.equipment || {};
      if(typeof sp.maxHp==='number') pl.maxHp = sp.maxHp;
      if(typeof sp.hp==='number') pl.hp = Math.min(sp.hp, pl.maxHp);
      pl.dead = !!sp.dead;
      return pl;
    };
    if(data.players[0]) p1 = restore(data.players[0]);
    if(data.players[1]) p2 = restore(data.players[1]);

    Game.cheeredCount = data.cheeredCount || 0;
    if(typeof Progress!=='undefined') Progress.completed = data.progress || {};
    cam.x = data.cam ? data.cam.x : 0; cam.y = data.cam ? data.cam.y : 0;

    // Rebuild themed ground for this level's size, and refresh ability world items.
    buildGroundCanvas();
    Abilities.reset(); Abilities.spawnAll();

    // --- enter play ---
    if(typeof UI !== 'undefined' && UI.closePanel) UI.closePanel();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('winScreen').style.display = 'none';
    document.getElementById('p2panel').style.display = twoPlayer ? 'flex' : 'none';
    const p2c = document.getElementById('p2controls'); if(p2c) p2c.style.display = twoPlayer ? 'block' : 'none';
    sparkles = [];
    Game.state = SCENES.PLAYING;
    updateHUD();
    if(typeof startMusic === 'function') startMusic();
    showToast('📂 Game loaded!', 1500);
    return true;
  },
};

// ===== src/ui.js =====
// ====================== UI LAYER ======================
// Manages the DOM overlay panels (pause menu, inventory/stats, NPC dialog) and the
// HUD. Follows the existing #gameFrame overlay pattern (see charselect.js). Only one
// panel is open at a time; opening a panel moves Game.state to the matching scene so
// the main loop freezes world updates while still drawing the frozen frame behind it.

const UI = {
  panel: null,        // null | 'pause' | 'dialog'  (blocking panels that freeze the world)
  invOpen: false,     // inventory is a *non-blocking* overlay: world keeps simulating
  _dialog: null,      // { npc, player }
  _invPlayer: 0,      // which player the inventory paper-doll is showing (tab index)

  $(id){ return document.getElementById(id); },
  _show(id, on){ const el=this.$(id); if(el) el.style.display = on ? 'flex' : 'none'; },

  // ---------- HUD ----------
  updateHUD(){
    const set=(id,v)=>{ const el=this.$(id); if(el) el.textContent=v; };
    set('p1count', p1 ? p1.treats : 0);
    set('p2count', (typeof p2!=='undefined' && p2) ? p2.treats : 0);
    set('cheerCount', Game.cheeredCount);
    set('cheerTotal', (typeof friends!=='undefined' && friends) ? friends.length : CHEER_TOTAL);
    const lvl=(typeof LevelManager!=='undefined') && LevelManager.current;
    set('levelName', lvl ? lvl.name : '—');
    set('questProgress', lvl && lvl.quest ? lvl.quest.describe() : '—');
    // Heart bars (per active player) + P1 hotbar.
    const h1=this.$('p1hearts'); if(h1 && p1) h1.innerHTML=this._heartMarkup(p1);
    const h2=this.$('p2hearts'); if(h2 && typeof p2!=='undefined' && p2) h2.innerHTML=this._heartMarkup(p2);
    this.renderHotbar();
    // Keep the open (non-blocking) inventory panel in sync as treats/items change.
    if(this.invOpen) this.renderInventory();
  },

  // ---------- hearts ----------
  // 1 heart icon = 2 hp. Each heart shows one of three states based on the hp left in
  // its pair: full (2), shrunk/half (1), or empty → a black dot (0).
  _heartMarkup(p){
    if(!p || !p.maxHp) return '';
    const n=Health.heartsFor(p.maxHp);
    let out = p.dead ? '<span class="hrt dead">🪦</span>' : '';
    for(let i=0;i<n;i++){
      const inHeart=Math.max(0, Math.min(Health.HEART_HP, p.hp - i*Health.HEART_HP));
      if(inHeart>=2)      out+='<span class="hrt full">❤</span>';
      else if(inHeart===1) out+='<span class="hrt half">❤</span>';
      else                 out+='<span class="hrt empty">●</span>';
    }
    return out;
  },

  // ---------- panel plumbing ----------
  // Close a blocking panel (pause/dialog) and resume the world.
  closePanel(){
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    // Don't yank the world back to PLAYING from a terminal/interstitial scene.
    const s=Game.state;
    const frozen = s===SCENES.MENU || s===SCENES.WIN || s===SCENES.WORLDMAP || s===SCENES.GAMEOVER;
    if(!frozen) Game.state=SCENES.PLAYING;
  },

  // ESC: close whatever is open (blocking panel first, then inventory), else pause.
  togglePause(){
    if(this.panel){ this.closePanel(); return; }
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openPause();
  },

  openPause(){
    if(Game.state!==SCENES.PLAYING) return;
    this.closeInventory();            // never stack pause on top of the inventory overlay
    this.panel='pause'; Game.state=SCENES.PAUSED;
    this._show('pauseScreen', true);
  },

  // ---------- inventory + stats ----------
  // Inventory is a non-blocking overlay: it does NOT change Game.state, so the world
  // keeps simulating while it's open, and it docks over part of the frame (see CSS).
  toggleInventory(){
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openInventory();
  },

  openInventory(){
    this.invOpen=true;
    this._invPlayer=0;
    this.renderInventory();
    this._show('inventoryScreen', true);
  },

  closeInventory(){
    this.invOpen=false;
    this._show('inventoryScreen', false);
  },

  // Which player the inventory is showing (clamped; follows the active tab).
  _invTarget(){
    const players=Game.players;
    if(this._invPlayer>=players.length) this._invPlayer=0;
    return players[this._invPlayer]||players[0];
  },

  renderInventory(){
    if(this._dragging) return;            // don't rebuild the DOM mid-drag (would abort it)
    const body=this.$('invBody'); if(!body) return;
    const players=Game.players;
    const p=this._invTarget();
    const b=Breeds.get(p.breed);

    // Player tabs (only meaningful in 2-player).
    const tabs=this.$('invTabs');
    if(tabs){
      tabs.innerHTML = players.length>1
        ? players.map((pp,i)=>`<button class="inv-tab${i===this._invPlayer?' active':''}" data-act="tab" data-idx="${i}">P${pp.id}</button>`).join('')
        : '';
    }

    // Paper-doll wearable slots. Drop a matching wearable here to equip; drag the worn
    // item off to move/unequip it; click a filled slot to send it back to the bag.
    const slotCell=(slot)=>{
      const id=Wearables.equipped(p,slot);
      const def=id?Items.get(id):null;
      const label=Wearables.SLOT_LABEL[slot];
      return `<button class="doll-slot slot-${slot}${id?' filled':''}" data-act="unequip" data-drop="equip" data-slot="${slot}" ${id?'draggable="true" data-drag="equip"':''} title="${label}${id?': '+def.name+' — drag off or click to remove':' (drop a '+label.toLowerCase()+' item here)'}">`
        + (def?`<span class="slot-icon">${def.icon}</span>`:`<span class="slot-tag">${label}</span>`)
        + `</button>`;
    };

    // Positional tile grid. First HOTBAR row = numeric quick-slots (keys 1..N). Every
    // slot is a drop target; filled slots are draggable (reorder / equip / drop / bin).
    const cellsArr=Inventory.cells(p);
    let cells='';
    for(let i=0;i<cellsArr.length;i++){
      const c=cellsArr[i];
      const hb=i<Inventory.HOTBAR;
      const def=c?Items.get(c.id):null;
      const t=def&&def.type;
      const kind = c ? (t==='wearable'?' wearable' : t==='consumable'?' consumable' : t==='toy'?' toy' : '') : '';
      cells+=`<div class="inv-tile${hb?' hb':''}${c?' filled'+kind:' empty'}" data-drop="slot" data-idx="${i}"`
        + (c?` draggable="true" data-drag="slot" data-act="item" title="${def?def.name:c.id}"`:'')
        + `>`
        + (hb?`<span class="tile-key">${i+1}</span>`:'')
        + (c?`<span class="tile-icon">${def?def.icon:'❓'}</span>${c.qty>1?`<span class="tile-qty">${c.qty}</span>`:''}`:'')
        + `</div>`;
    }

    body.innerHTML=`
      <div class="inv-doll-grid">
        ${slotCell('face')}${slotCell('head')}<span class="doll-blank"></span>
        ${slotCell('neck')}<canvas id="dollCanvas" width="92" height="100"></canvas>${slotCell('body')}
        <span class="doll-blank"></span>${slotCell('back')}<span class="doll-blank"></span>
      </div>
      <div class="inv-meta">
        <span class="inv-name">🐾 P${p.id} · ${b.name}</span>
        <span class="inv-heartline">${this._heartMarkup(p)}</span>
      </div>
      <div class="inv-substats">Treats <b>${p.treats}</b> · HP <b>${p.hp}/${p.maxHp}</b> · Slots <b>${Inventory.list(p).length}/${Inventory.CAP}</b></div>
      <div class="inv-tilegrid">${cells}</div>
      <div class="inv-binrow">
        <span class="inv-hint">Drag: reorder · onto dog to wear · out to the world to drop</span>
        <button class="inv-bin" data-drop="bin" title="Drag an item here to delete it">🗑️</button>
      </div>
    `;

    this._drawDoll(p);
  },

  // Draw the paper-doll dog (down-facing, enlarged) + its worn items onto the canvas.
  _drawDoll(p){
    const cv=this.$('dollCanvas'); if(!cv || typeof drawBreedPreviewInline!=='function') return;
    const g=cv.getContext('2d'); if(!g) return;
    g.clearRect(0,0,cv.width,cv.height);
    const S=1.28;                                 // scale the whole dog up for a bigger preview
    const t=(typeof performance!=='undefined')?performance.now():0;
    g.save(); g.scale(S,S);
    const cx=(cv.width/S)/2, cy=(cv.height/S)/2+5;
    const a=(typeof Wearables!=='undefined') ? Wearables.anchor(cx, cy, 'down', p.equipment||{}, t) : null;
    if(a) Wearables.drawBack(g, a);
    drawBreedPreviewInline(g, p.breed, p.color, cx, cy, t);
    if(a) Wearables.drawFront(g, a);
    g.restore();
  },

  // ---------- hotbar (always-visible, mirrors the inventory's first row) ----------
  // Keys 1..N map to the first HOTBAR inventory slots. Anything can sit here; only some
  // item types actually do something when used (see useHotbar).
  renderHotbar(){
    const bar=this.$('hotbar'); if(!bar) return;
    const show = Game.state===SCENES.PLAYING||Game.state===SCENES.PAUSED||Game.state===SCENES.DIALOG||this.invOpen;
    bar.style.display = show ? 'flex' : 'none';
    if(!show){ bar.innerHTML=''; return; }
    const cells=p1?Inventory.cells(p1):[];
    let html='';
    for(let i=0;i<Inventory.HOTBAR;i++){
      const c=cells[i], def=c?Items.get(c.id):null;
      html+=`<button class="hb-slot${c?' filled':''}" data-act="hotbar" data-idx="${i}" ${def?`title="${def.name} — press ${i+1}"`:''}>`
        + `<span class="hb-key">${i+1}</span>`
        + (c?`<span class="hb-icon">${def?def.icon:'❓'}</span>${c.qty>1?`<span class="hb-qty">${c.qty}</span>`:''}`:'')
        + `</button>`;
    }
    bar.innerHTML=html;
  },

  // Use P1 hotbar slot n (1-based) = inventory slot n-1: consumables heal & are consumed,
  // toys play, wearables equip; anything else isn't usable.
  useHotbar(n){
    if(Game.state!==SCENES.PLAYING) return;
    const p=p1; if(!p || p.dead) return;               // a fainted dog can't use items
    const cell=Inventory.at(p, n-1); if(!cell) return;
    const def=Items.get(cell.id);
    if(def && def.type==='consumable'){
      if(p.hp>=p.maxHp){ showToast(`${p.breed} is already at full health!`,1400); return; }
      const healed=Health.heal(p, def.heal||2);
      Inventory.removeAt(p, n-1, 1);
      if(typeof sfxCollect==='function') sfxCollect();
      showToast(`🍪 Ate ${def.name} · +${healed} HP`,1400);
    } else if(def && def.type==='toy'){
      if(typeof sfxCollect==='function') sfxCollect();
      showToast(`🎾 You play with the ${def.name}!`,1200);
    } else if(def && def.type==='wearable'){
      if(Wearables.equipFromSlot(p, n-1, def.slot)) showToast(`🎩 Equipped ${def.name}!`,1200);
    } else {
      showToast(`You can't use the ${def?def.name:'item'}.`,1200);
    }
    this.updateHUD();
  },

  // ---------- inventory interactions: clicks + drag & drop ----------
  // Clicks (no drag movement) equip/use/unequip. Drag routes through _applyDrop.
  _onInvClick(ev){
    const btn=ev.target.closest('[data-act]'); if(!btn) return;
    const p=this._invTarget();
    const act=btn.dataset.act;
    if(act==='tab'){ this._invPlayer=+btn.dataset.idx; this.renderInventory(); return; }
    if(act==='unequip'){ if(Wearables.unequip(p, btn.dataset.slot)) this.updateHUD(); else showToast('Bag is full — no room to remove that.',1400); return; }
    if(act==='item'){
      const idx=+btn.dataset.idx, cell=Inventory.at(p, idx), def=cell&&Items.get(cell.id);
      if(!def) return;
      if(def.type==='wearable'){ if(Wearables.equipFromSlot(p, idx, def.slot)) this.updateHUD(); }
      else if(def.type==='consumable'){
        if(p.dead){ showToast('That dog has fainted.',1400); return; }
        if(p.hp>=p.maxHp){ showToast(`${p.breed} is already at full health!`,1400); return; }
        const healed=Health.heal(p, def.heal||2); Inventory.removeAt(p, idx, 1);
        if(typeof sfxCollect==='function') sfxCollect();
        showToast(`🍪 Ate ${def.name} · +${healed} HP`,1400); this.updateHUD();
      }
      return;
    }
    if(act==='hotbar'){ this.useHotbar((+btn.dataset.idx)+1); return; }
  },

  // --- drag & drop plumbing (HTML5 DnD, delegated on invBody + the game canvas) ---
  _onDragStart(ev){
    const src=ev.target.closest('[data-drag]'); if(!src){ return; }
    const kind=src.dataset.drag;
    this._drag = kind==='equip' ? { kind:'equip', slot:src.dataset.slot } : { kind:'slot', idx:+src.dataset.idx };
    this._dragging=true;
    src.classList.add('dragging');
    if(ev.dataTransfer){ ev.dataTransfer.effectAllowed='move'; try{ ev.dataTransfer.setData('text/plain','item'); }catch(e){} }
  },
  _onDragOver(ev){
    const tgt=ev.target.closest('[data-drop]'); if(!tgt || !this._drag) return;
    ev.preventDefault();
    if(ev.dataTransfer) ev.dataTransfer.dropEffect='move';
  },
  _onDrop(ev){
    const tgt=ev.target.closest('[data-drop]'); if(!tgt || !this._drag) return;
    ev.preventDefault();
    this._dragging=false;                 // allow the post-drop re-render
    this._applyDrop(tgt.dataset.drop, tgt.dataset);
    this._drag=null;
  },
  _onDragEnd(){
    this._dragging=false; this._drag=null;
    const el=this.$('invBody'); if(el){ const d=el.querySelector('.dragging'); if(d) d.classList.remove('dragging'); }
  },

  _applyDrop(dropKind, data){
    const p=this._invTarget(), src=this._drag; if(!src) return;
    if(dropKind==='slot'){
      const to=+data.idx;
      if(src.kind==='slot') Inventory.moveSlot(p, src.idx, to);
      else Wearables.unequipToSlot(p, src.slot, to);
      this.updateHUD();
    } else if(dropKind==='equip'){
      const wslot=data.slot;
      if(src.kind==='slot'){ if(!Wearables.equipFromSlot(p, src.idx, wslot)) showToast("That doesn't go in that slot.",1300); }
      else if(src.kind==='equip' && src.slot!==wslot){ /* different wearable slot — no-op */ }
      this.updateHUD();
    } else if(dropKind==='bin'){
      this._askDelete(src);
    } else if(dropKind==='ground'){
      this._dropToGround(src);
    }
  },

  _dropToGround(src){
    const p=this._invTarget();
    let id, qty;
    if(src.kind==='slot'){ const c=Inventory.at(p, src.idx); if(!c) return; id=c.id; qty=c.qty; Inventory.removeAt(p, src.idx, qty); }
    else { id=p.equipment&&p.equipment[src.slot]; if(!id) return; qty=1; delete p.equipment[src.slot]; }
    if(typeof dropItemOnGround==='function') dropItemOnGround(p, id, qty);
    const def=Items.get(id);
    showToast(`Dropped ${def?def.name:id}${qty>1?' ×'+qty:''} on the ground.`,1400);
    this.updateHUD();
  },

  // Deleting is destructive, so it goes through a confirm popup.
  _askDelete(src){
    const p=this._invTarget();
    let id;
    if(src.kind==='slot'){ const c=Inventory.at(p, src.idx); id=c&&c.id; }
    else id=p.equipment&&p.equipment[src.slot];
    if(!id) return;
    const def=Items.get(id);
    this._pendingDelete={ src, player:p };
    const txt=this.$('confirmText'); if(txt) txt.innerHTML=`Permanently delete <b>${def?def.icon+' '+def.name:id}</b>?`;
    this._show('confirmPopup', true);
  },
  confirmDelete(ok){
    this._show('confirmPopup', false);
    const pd=this._pendingDelete; this._pendingDelete=null;
    if(!ok || !pd) return;
    const p=pd.player;
    if(pd.src.kind==='slot') Inventory.removeAt(p, pd.src.idx, Inventory.MAX_STACK);
    else if(p.equipment) delete p.equipment[pd.src.slot];
    if(typeof sfxHowl==='function') sfxHowl();
    this.updateHUD();
  },

  // ---------- dialog / shop / quest ----------
  openDialog(npc, player){
    this.closeInventory();            // dialog is blocking; don't stack it over inventory
    this.panel='dialog'; Game.state=SCENES.DIALOG;
    this._dialog={ npc, player };
    const q=npc.quest, hasQuests=(typeof Quests!=='undefined');
    if(q && hasQuests && Quests.stateOf(q)!=='done') this.renderQuest();           // offer / progress / turn-in
    else this.renderDialog(q && q.done ? q.done : npc.greeting);                   // finished quest → thanks; else shop/talk
    this._show('dialogScreen', true);
  },

  // Quest dialog: offer it, report progress, or take the hand-in — driven by quest state.
  renderQuest(){
    const d=this._dialog; if(!d || !d.npc.quest) return;
    const npc=d.npc, p=d.player, q=npc.quest;
    this.$('dialogName').textContent=npc.name;
    const choices=this.$('dialogChoices'); choices.innerHTML='';
    const add=(label,fn)=>{ const b=document.createElement('button'); b.className='dialog-choice'; b.textContent=label; b.addEventListener('click',fn); choices.appendChild(b); };
    const st=Quests.stateOf(q);
    if(st==='available'){
      this.$('dialogText').textContent = q.offer || `Could you help me? I need ${Quests.summary(q)}.`;
      add(`✔ Sure, I'll help!`, ()=>{ Quests.accept(q); if(typeof sfxDeliver==='function') sfxDeliver(); this.renderQuest(); });
      add(`🐾 Maybe later`, ()=>this.closePanel());
    } else if(Quests.canComplete(q, p)){
      this.$('dialogText').textContent = q.ready || `You've got ${Quests.summary(q)} — hand them over?`;
      add(`✅ Give ${Quests.summary(q)}`, ()=>{ const r=Quests.complete(q, p); if(typeof sfxCheer==='function') sfxCheer(); this.updateHUD(); this.renderDialog(q.done || `Thank you so much! 💛${r?(' ('+r+')'):''}`); });
      add(`🐾 Not yet`, ()=>this.closePanel());
    } else {
      this.$('dialogText').textContent = Quests.progressText(q, p);
      add(`👍 Okay`, ()=>this.closePanel());
    }
  },

  renderDialog(text){
    const d=this._dialog; if(!d) return;
    this.$('dialogName').textContent=d.npc.name;
    this.$('dialogText').textContent=text;
    const choices=this.$('dialogChoices');
    choices.innerHTML='';

    // Shop: buy items with treats as currency. Each NPC supplies its own `wares`
    // (see level generate()); fall back to a default stall if none is set — but a pure
    // quest-giver (has a quest, no wares) shows no shop, just its text.
    const wares=(d.npc.wares && d.npc.wares.length) ? d.npc.wares : (d.npc.quest ? [] : [{id:'biscuit',cost:3},{id:'ribbon',cost:5}]);
    wares.forEach(w=>{
      const def=Items.get(w.id); if(!def) return;
      const afford=d.player.treats>=w.cost;
      const btn=document.createElement('button');
      btn.className='dialog-choice'+(afford?'':' disabled');
      btn.textContent=`${def.icon} Buy ${def.name} — ${w.cost} 🦴`;
      btn.addEventListener('click',()=>{
        if(d.player.treats<w.cost){ this.renderDialog("You don't have enough treats for that."); return; }
        if(Inventory.roomFor(d.player, w.id) < 1){ this.renderDialog("Your bag is full! Make some room first."); return; }
        d.player.treats-=w.cost; Inventory.add(d.player, w.id, 1); this.updateHUD();
        if(typeof sfxCollect==='function') sfxCollect();
        const tail = def.type==='wearable' ? ' Open your inventory (I) to wear it!' : ' Anything else?';
        this.renderDialog(`Enjoy your ${def.name}!${tail}`);
      });
      choices.appendChild(btn);
    });

    const bye=document.createElement('button');
    bye.className='dialog-choice';
    bye.textContent='👋 Goodbye';
    bye.addEventListener('click',()=>this.closePanel());
    choices.appendChild(bye);
  },

  // ---------- game over ----------
  // A dog fainted (hp hit 0). Freeze the run and offer Play Again / Main Menu.
  // Called from Health.onDown. The frozen death frame stays visible behind the
  // translucent overlay (GAMEOVER is in the main loop's showWorld set).
  gameOver(p){
    if(Game.state===SCENES.GAMEOVER) return;   // already down — don't stack
    this.closeInventory();
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    Game.state=SCENES.GAMEOVER;
    if(typeof stopMusic==='function') stopMusic();   // the sad faint sound already played
    const who = (Game.twoPlayer && p) ? `P${p.id}'s dog` : 'Your dog';
    const t=this.$('gameOverText'); if(t) t.textContent=`${who} fainted... but every good dog gets another chance.`;
    this._show('gameOverScreen', true);
    this.renderHotbar();              // hide the hotbar
  },

  // ---------- menu transitions ----------
  quitToMenu(){
    this.closeInventory();
    this.closePanel();
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    if(typeof stopMusic==='function') stopMusic();
    this._show('winScreen', false);
    this._show('gameOverScreen', false);
    this.$('startScreen').style.display='flex';
    this.refreshContinueButton();     // a save may have been made this session
    Game.state=SCENES.MENU;
    this.renderHotbar();              // hides the hotbar back on the menu
  },

  // Show the main-menu "Load Saved Game" button only when a save actually exists.
  // Called at startup and whenever we return to the menu (a save can appear mid-session).
  refreshContinueButton(){
    const c=this.$('btnContinue'); if(!c) return;
    const hasSave = (typeof Save!=='undefined') && Save.has();
    c.style.display = hasSave ? 'inline-block' : 'none';
  },

  // Wire buttons + inventory key. Called once at startup.
  init(){
    const on=(id,fn)=>{ const el=this.$(id); if(el) el.addEventListener('click',fn); };
    on('btnResume', ()=>this.closePanel());
    on('btnQuit', ()=>this.quitToMenu());
    // Game over → replay / menu. (World-map buttons are wired inside WorldMap.)
    on('btnGameOverReplay', ()=>{ if(typeof replayRun==='function') replayRun(); });
    on('btnGameOverMenu', ()=>this.quitToMenu());
    on('btnSave', ()=>{ if(typeof Save!=='undefined') Save.save(); });
    on('btnLoad', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    // Start-screen "Continue" appears only when a save exists.
    on('btnContinue', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    // Delete-confirm popup buttons.
    on('btnDelYes', ()=>this.confirmDelete(true));
    on('btnDelNo',  ()=>this.confirmDelete(false));
    // Delegated clicks + drag/drop for the inventory (listeners sit on the stable
    // #invBody container, so they survive its innerHTML rebuilds).
    const inv=this.$('invBody');
    if(inv){
      inv.addEventListener('click', e=>this._onInvClick(e));
      inv.addEventListener('dragstart', e=>this._onDragStart(e));
      inv.addEventListener('dragover',  e=>this._onDragOver(e));
      inv.addEventListener('drop',      e=>this._onDrop(e));
      inv.addEventListener('dragend',   e=>this._onDragEnd(e));
    }
    const bar=this.$('hotbar'); if(bar) bar.addEventListener('click', e=>this._onInvClick(e));
    // The game canvas is the "drop out of the bag → onto the ground" target.
    const game=this.$('game');
    if(game){
      game.addEventListener('dragover', e=>{ if(this._drag){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move'; } });
      game.addEventListener('drop', e=>{ if(!this._drag) return; e.preventDefault(); this._dragging=false; this._applyDrop('ground',{}); this._drag=null; });
    }
    this.renderHotbar();
    // Start-screen "Load Saved Game" appears only when a save exists.
    this.refreshContinueButton();
  },
};

// Global HUD hook used across modules (formerly defined in update.js).
function updateHUD(){ UI.updateHUD(); }

UI.init();

// ===== src/world-map.js =====
// ====================== WORLD MAP ======================
// The between-levels campaign screen. After a level is cleared (update.js checkWin),
// this overlay shows the whole journey as a trail of environment nodes (see
// data/campaign.js), marks how far you've come, parks the dog on the current biome, and
// offers Continue (to the next real level) or Main Menu.
//
// It renders to its own <canvas> with its own requestAnimationFrame (like the char-
// select breed previews), so it animates independently of the frozen game loop.

const WorldMap = {
  _raf: null,
  canvas: null,
  g: null,
  _nodes: [],
  _focusIndex: 0,     // which environment the dog is standing on
  _nextId: null,      // next real level to Continue into (null = no more content yet)
  _wired: false,

  // Show the map after finishing `finishedLevelId`.
  showAfter(finishedLevelId){
    Progress.markComplete(finishedLevelId);
    const lvl = (typeof Levels!=='undefined') && Levels.get(finishedLevelId);
    this._nextId = (lvl && lvl.next && Levels.get(lvl.next)) ? lvl.next : null;
    const focusLevel = this._nextId || finishedLevelId;
    this._focusIndex = Campaign.envIndexOfLevel(focusLevel);

    this.canvas = document.getElementById('worldMapCanvas');
    this.g = this.canvas ? this.canvas.getContext('2d') : null;
    this._layout();
    this._configButtons();
    if(typeof UI!=='undefined') UI._show('worldMapScreen', true);
    this._wire();
    this._start();
  },

  hide(){ this._stop(); if(typeof UI!=='undefined') UI._show('worldMapScreen', false); },

  // Continue into the next real level.
  advance(){
    const id = this._nextId;
    this.hide();
    if(id && typeof LevelManager!=='undefined' && LevelManager.goTo){
      LevelManager.goTo(id);
      Game.state = SCENES.PLAYING;
      if(typeof startMusic==='function') startMusic();
    }
  },

  // ---------- layout ----------
  _layout(){
    if(!this.canvas) return;
    const W=this.canvas.width, H=this.canvas.height;
    const envs=Campaign.environments, n=envs.length;
    const cols=4, marginX=70, topY=56, rowGap=124;
    const usableW=W-marginX*2;
    this._nodes=[];
    for(let i=0;i<n;i++){
      const row=Math.floor(i/cols);
      let col=i%cols;
      if(row%2===1) col=(cols-1)-col;             // serpentine: alternate rows reverse
      const x=marginX + (cols>1 ? col*(usableW/(cols-1)) : 0);
      const y=topY + row*rowGap;
      this._nodes.push({ env:envs[i], x, y, index:i });
    }
  },

  _statusOf(i){ return i<this._focusIndex ? 'cleared' : (i===this._focusIndex ? 'current' : 'locked'); },

  // ---------- draw ----------
  _start(){
    this._stop();
    const step=(t)=>{ this.draw(t); this._raf=requestAnimationFrame(step); };
    this._raf=requestAnimationFrame(step);
  },
  _stop(){ if(this._raf){ cancelAnimationFrame(this._raf); this._raf=null; } },

  draw(t){
    const g=this.g; if(!g) return;
    const W=this.canvas.width, H=this.canvas.height;
    g.clearRect(0,0,W,H);
    // parchment backdrop (canvas corners are rounded via CSS)
    g.fillStyle='#F4EAD4'; g.fillRect(0,0,W,H);
    g.fillStyle='rgba(198,170,120,0.10)';
    for(let i=0;i<70;i++){ const r=mulberry32(i*7+1); g.fillRect((r()*W)|0,(r()*H)|0,3,2); }

    // trail connecting the nodes in order
    g.strokeStyle='rgba(150,116,74,0.55)'; g.lineWidth=3; g.setLineDash([6,7]);
    g.beginPath();
    this._nodes.forEach((n,i)=>{ if(i===0) g.moveTo(n.x,n.y); else g.lineTo(n.x,n.y); });
    g.stroke(); g.setLineDash([]);

    this._nodes.forEach(n=>this._drawNode(g,n,t));

    // dog token bobbing over the focus (current) node
    const f=this._nodes[this._focusIndex];
    if(f){
      const bob=Math.sin(t/300)*3;
      g.font='22px serif'; g.textAlign='center'; g.textBaseline='middle';
      g.fillText('🐕', f.x, f.y-36-bob);
    }
  },

  _drawNode(g,n,t){
    const env=n.env, R=24, status=this._statusOf(n.index), locked=status==='locked';
    // base disc
    g.beginPath(); g.arc(n.x,n.y,R,0,Math.PI*2);
    g.fillStyle = locked ? '#D3CBBB' : env.color; g.fill();
    // ring by status
    let ringC='#B8AEA0', ringW=3;
    if(status==='cleared'){ ringC='#E6B24A'; ringW=4; }
    else if(status==='current'){ ringC='#4FAE54'; ringW=3+(1+Math.sin(t/220))*1.6; }
    g.lineWidth=ringW; g.strokeStyle=ringC;
    g.beginPath(); g.arc(n.x,n.y,R,0,Math.PI*2); g.stroke();
    // biome icon
    g.globalAlpha=locked?0.5:1;
    g.font='22px serif'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(env.icon, n.x, n.y+1);
    g.globalAlpha=1;
    // corner badge
    if(status==='cleared') this._badge(g,n.x+R-3,n.y-R+3,'#E6B24A','✓','#4A3A10');
    else if(locked){ g.font='13px serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('🔒', n.x+R-2, n.y-R+5); }
    // name
    g.fillStyle=locked?'#A99C88':'#5A4A38'; g.font='bold 10px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(env.name, n.x, n.y+R+13);
    // sub-level pips (3 levels + boss diamond)
    this._drawPips(g, env, n.x, n.y+R+26);
  },

  _drawPips(g, env, cx, cy){
    const lv=env.levels, n=lv.length, gap=11, startX=cx-((n-1)*gap)/2;
    lv.forEach((l,i)=>{
      const x=startX+i*gap, done=Progress.isDone(l.id), real=!!l.real;
      if(l.kind==='boss'){
        g.beginPath(); g.moveTo(x,cy-4); g.lineTo(x+4,cy); g.lineTo(x,cy+4); g.lineTo(x-4,cy); g.closePath();
        g.fillStyle = done ? '#E6B24A' : (real ? '#C8B48A' : '#DDD2BE'); g.fill();
        g.lineWidth=1; g.strokeStyle='#8A7A5A'; g.stroke();
      } else {
        g.beginPath(); g.arc(x,cy,3.4,0,Math.PI*2);
        g.fillStyle = done ? '#E6B24A' : (real ? '#FFF7E6' : '#E6DCC8');
        g.fill(); g.lineWidth=1.2; g.strokeStyle = real ? '#8A7A5A' : '#C6BAA2'; g.stroke();
      }
    });
  },

  _badge(g,x,y,col,txt,txtCol){
    g.beginPath(); g.arc(x,y,7,0,Math.PI*2); g.fillStyle=col; g.fill();
    g.lineWidth=1.5; g.strokeStyle='#FFF8E8'; g.stroke();
    g.fillStyle=txtCol; g.font='bold 10px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(txt,x,y+0.5);
  },

  // ---------- buttons + clicks ----------
  _configButtons(){
    const cont=document.getElementById('wmContinue');
    const note=document.getElementById('wmNote');
    if(cont){
      if(this._nextId){
        const nx=Levels.get(this._nextId);
        cont.textContent=`Continue to ${nx.name} →`;
        cont.style.display='inline-block';
      } else {
        cont.style.display='none';
      }
    }
    if(note){
      note.textContent=this._nextId
        ? 'The trail leads onward — your journey continues!'
        : '🎉 That\'s all the trail we\'ve blazed so far — more worlds coming soon!';
    }
  },

  // Tapping a node tells you what levels that biome holds.
  _announce(env){
    if(typeof showToast!=='function') return;
    const cleared=Progress.countDone(env.levels.map(l=>l.id));
    const real=env.levels.some(l=>l.real);
    const tail = real ? `${cleared}/${env.levels.length} cleared` : 'coming soon';
    showToast(`${env.icon} ${env.name} — 👑 ${env.boss} · ${tail}`, 2600);
  },

  _onClick(ev){
    if(!this.canvas) return;
    const r=this.canvas.getBoundingClientRect();
    const sx=this.canvas.width/r.width, sy=this.canvas.height/r.height;
    const mx=(ev.clientX-r.left)*sx, my=(ev.clientY-r.top)*sy;
    const hit=this._nodes.find(n=>Math.hypot(n.x-mx,n.y-my)<26);
    if(hit) this._announce(hit.env);
  },

  _wire(){
    if(this._wired) return; this._wired=true;
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('wmContinue', ()=>this.advance());
    on('wmMenu',     ()=>{ this.hide(); if(typeof UI!=='undefined') UI.quitToMenu(); });
    if(this.canvas) this.canvas.addEventListener('click', e=>this._onClick(e));
  },
};

// ===== src/main.js =====
// ====================== MAIN LOOP ======================
let lastTime=performance.now();
function loop(now){
  const dt=now-lastTime;lastTime=now;
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  // Update only while actively playing; keep drawing the frozen world behind any
  // open panel (pause / inventory / dialog) so the overlay sits over the last frame.
  const playing=Game.state===SCENES.PLAYING;
  // Keep drawing the frozen world behind any overlay that sits over live gameplay
  // (pause / inventory / dialog / game over / the brief win freeze).
  const s=Game.state;
  const showWorld=playing||s===SCENES.PAUSED||s===SCENES.INVENTORY||s===SCENES.DIALOG||s===SCENES.GAMEOVER||s===SCENES.WIN||s===SCENES.WORLDMAP;
  if(playing){
    const c1=Input.CONTROLS.p1, c2=Input.CONTROLS.p2;
    updateCollectibles(now);
    Entities.updateAll(now,dt);
    // A fainted dog is frozen (a grave marks the spot) until the level ends.
    if(!p1.dead){updatePlayer(p1,c1,now,dt);tryCollect(p1);tryDeliver(p1,c1);tryInteract(p1,c1);}
    if(twoPlayer&&!p2.dead){updatePlayer(p2,c2,now,dt);tryCollect(p2);tryDeliver(p2,c2);tryInteract(p2,c2);}
    if(twoPlayer&&!p1.dead&&!p2.dead)checkGroupHowl();
    updateSparkles();updateCamera();
  }
  if(showWorld){
    ctx.save();ctx.translate(-cam.x,-cam.y);
    drawWorld(now);
    // river bridges draw above swimmers passing underneath, but below anyone walking across the deck
    const activePlayers=twoPlayer?[p1,p2]:[p1];
    const riverBridges=worldObjects.filter(o=>o.kind==='riverbridge');
    const deckBridges=riverBridges.filter(o=>activePlayers.some(p=>!p.swimming&&isOnSpecificBridge(o,p.x,p.y)));
    deckBridges.forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    Abilities.drawWorld(now);
    collectibles.forEach(item=>drawCollectible(item,now));
    friends.forEach(f=>drawFriend(f,now));
    // Dogs + registry entities (enemies/NPCs/graves) share one painter's-algorithm pass
    // by y. Fainted dogs aren't drawn — their grave (a spawned entity) stands in for them.
    const actors=activePlayers.filter(p=>!p.dead).map(p=>({y:p.y, d:()=>drawDog(p,now)}));
    entities.forEach(e=>{ const def=Entities.def(e.kind); if(!def||!def.draw) return;
      actors.push({y:e.y, d:()=>{
        if(e.swimming && !e.aquatic) drawSwimming(Math.round(e.x), Math.round(e.y), now, ()=>def.draw(e,now));  // land creature submerged like the dog
        else { if(e.swimming) drawWaterRipple(e.x,e.y,now); def.draw(e,now); }                                 // aquatic bird floats with a light wake
      }}); });
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.d());
    riverBridges.filter(o=>!deckBridges.includes(o)).forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    drawSparkles();
    ctx.restore();
    drawMinimap();
  }
  requestAnimationFrame(loop);
}

// Build the initial level (world objects + entities + themed ground), then start loop.
LevelManager.load(Levels.first().id);
requestAnimationFrame(loop);


// ===== src/fullscreen.js =====
// ====================== CANVAS / FULLSCREEN ======================
let pseudoFS=false;
function resizeCanvas(){
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  const isFS=isNativeFS||pseudoFS;
  const sw=window.innerWidth,sh=window.innerHeight;
  const scale=isFS?Math.min(sw/VIEW_W,sh/VIEW_H):Math.min((sw-32)/VIEW_W,1);
  canvas.style.width=Math.round(VIEW_W*scale)+'px';
  canvas.style.height=Math.round(VIEW_H*scale)+'px';
}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);

const fsBtn=document.getElementById('fsBtn');
const wrap=document.getElementById('wrap');
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function enterPseudoFS(){
  pseudoFS=true;
  wrap.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#FFE9D6 0%,#FFD6B8 60%,#8FD4A8 100%);padding:0;gap:0;overflow:hidden;';
  document.getElementById('gameFrame').style.cssText='padding:0;border:none;border-radius:0;box-shadow:none;background:transparent;';
  window.scrollTo(0,1);fsBtn.textContent='✕ Exit';resizeCanvas();
}
function exitPseudoFS(){
  pseudoFS=false;wrap.style.cssText='';
  document.getElementById('gameFrame').style.cssText='';
  fsBtn.textContent='⛶ Fullscreen';resizeCanvas();
}
function toggleFullscreen(){
  if(isIOS){pseudoFS?exitPseudoFS():enterPseudoFS();return;}
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  if(!isNativeFS){
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(req)req.call(el).catch(()=>enterPseudoFS());
  } else {
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(exit)exit.call(document).catch(()=>{});
  }
}
fsBtn.addEventListener('click',toggleFullscreen);
function onFSChange(){
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  fsBtn.textContent=isNativeFS?'✕ Exit':'⛶ Fullscreen';resizeCanvas();
}
document.addEventListener('fullscreenchange',onFSChange);
document.addEventListener('webkitfullscreenchange',onFSChange);


// ===== src/mobile-controls.js =====
// ====================== MOBILE CONTROLS ======================
const isTouchDevice=()=>'ontouchstart' in window||navigator.maxTouchPoints>0;
const mobileMap={'mb-up':'KeyW','mb-down':'KeyS','mb-left':'KeyA','mb-right':'KeyD','mobileHowlBtn':'Space'};
function bindMobileBtn(id,code){
  const el=document.getElementById(id);if(!el)return;
  const press=e=>{e.preventDefault();keys[code]=true;el.classList.add('pressed');};
  const release=e=>{e.preventDefault();keys[code]=false;el.classList.remove('pressed');};
  el.addEventListener('touchstart',press,{passive:false});
  el.addEventListener('touchend',release,{passive:false});
  el.addEventListener('touchcancel',release,{passive:false});
  el.addEventListener('mousedown',press);el.addEventListener('mouseup',release);el.addEventListener('mouseleave',release);
}
Object.entries(mobileMap).forEach(([id,code])=>bindMobileBtn(id,code));
function showMobileControls(show){
  document.getElementById('mobileControls').style.display=show?'flex':'none';
  document.getElementById('controls').style.display=show?'none':'flex';
}


// ===== src/start.js =====
// ====================== START / RESET (overridden by charselect.js) ======================
function resetGame(cfg1, cfg2){
  stopMusic();
  collectibles=makeCollectibles(); friends=makeFriends(); cheeredCount=0;
  const c1=cfg1||dogConfig&&dogConfig.p1||{color:{hex:'#6FA8C9'},breed:'husky'};
  const c2=cfg2||dogConfig&&dogConfig.p2||{color:{hex:'#E0855B'},breed:'shiba'};
  p1=makePlayer(1, c1.color.hex, 200, 200, c1.breed);
  p2=makePlayer(2, c2.color.hex, 260, 200, c2.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
}


// ===== src/charselect.js =====
// ====================== CHARACTER SELECTION ======================

// Breed metadata now comes from the shared registry (data/breeds.js) so charselect
// and gameplay share one source. Shape: {id,name,desc,emoji,stats,passive,abilityId}.
const BREEDS = Breeds.list();

const COLORS = [
  { id:'blue',    hex:'#6FA8C9', label:'Ice Blue'   },
  { id:'copper',  hex:'#C07840', label:'Copper'     },
  { id:'lavender',hex:'#9B7EC8', label:'Lavender'   },
  { id:'mint',    hex:'#4FAD8A', label:'Mint'       },
  { id:'rose',    hex:'#D4607A', label:'Rose'       },
  { id:'sand',    hex:'#C8A855', label:'Sand'       },
  { id:'slate',   hex:'#607890', label:'Slate'      },
  { id:'peach',   hex:'#D48060', label:'Peach'      },
];

// Current selections (defaults)
const dogConfig = {
  p1: { breed:'dinno',    color: COLORS[1] },  // copper — matches Dinno's real coat
  p2: { breed:'lolla',    color: COLORS[0] },  // ice blue for Lolla
};

// Which player we're currently configuring (null = showing mode select)
let selectingPlayer = null;
let pendingMode = null; // 'solo' | '2p'

// ---- Preview canvas (draws a mini dog for each breed card) ----
function drawBreedPreview(canvasEl, breed, colorHex, t){
  const c = canvasEl.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0,0,canvasEl.width,canvasEl.height);
  const cx=canvasEl.width/2, cy=canvasEl.height/2+6;
  // draw a small static dog using the main renderer
  const fakePlayer={x:cx,y:cy,color:colorHex,breed,dir:'down',moving:false,howling:false,animFrame:0,animTimer:0};
  // We redirect ctx temporarily to c
  const savedCtx=ctx;
  // We can't swap ctx (it's const), so we draw a simpler inline preview
  drawBreedPreviewInline(c, breed, colorHex, cx, cy, t||0);
}

function drawBreedPreviewInline(c, breed, colorHex, x, y, t){
  function f(rx,ry,rw,rh,col){ c.fillStyle=col; c.fillRect(Math.round(x+rx),Math.round(y+ry),rw,rh); }
  const C=colorHex;
  const D=shade(C,-30), L=shade(C,40), W='#F5EEE0', K='#1A1A1A';
  const bob=Math.sin(t/350)*1.5;
  const by=y+bob;

  // ground shadow
  c.globalAlpha=0.18;
  c.beginPath(); c.ellipse(x,by+14,11,4,0,0,Math.PI*2); c.fillStyle='#2A3A2A'; c.fill();
  c.globalAlpha=1;

  if(breed==='dinno'){
    // Red husky with white mask
    const RC='#C07040', RD=shade(RC,-30), RL=shade(RC,40), RW='#F0EAD8';
    f(-9,-2,18,13,RC); f(-6,2,12,7,RW);
    f(-6,10,4,7,RD); f(2,10,4,7,RD);
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,RD); f(10,tw-2,3,7,RC); f(11,tw-4,2,5,RW);
    f(-7,-14,14,13,RC);
    f(-5,-12,9,6,RW); // white face mask
    f(-6,-14,4,7,RD); f(2,-14,4,7,RD);
    f(-8,-20,6,8,RD); f(2,-20,6,8,RD);
    f(-6,-18,3,5,RL); f(3,-18,3,5,RL);
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    f(-4,-6,8,5,RW); f(-2,-8,4,3,K);
  } else if(breed==='lolla'){
    // Sheltie / collie: tricolor brown+black+white, long mane
    const BC='#C07838', BD=shade(BC,-35), BL='#D8A060';
    const BLK='#2A2A2A', BWH='#F4EEE2';
    // body
    f(-8,-2,16,12,BC); f(-5,2,10,6,BWH); // white chest
    f(-8,-2,4,6,BLK); // black saddle left
    f(4,-2,4,6,BLK);  // black saddle right
    f(-5,10,4,7,BD); f(1,10,4,7,BD);
    // mane (fluffy chest extension)
    f(-6,0,4,8,BWH); f(2,0,4,8,BWH);
    // tail
    const tw=Math.sin(t/180)*3;
    f(7,-1+tw*0.4,5,11,BLK); f(9,tw-2,3,8,BC);
    // head — elongated/pointy
    f(-6,-16,13,14,BC);
    f(-4,-14,8,6,BWH); // white blaze
    f(-8,-22,5,8,BLK); f(3,-22,5,8,BLK); // ears
    f(-7,-20,3,6,BC); f(4,-20,3,6,BC);   // ear inner
    // mane around neck
    f(-8,-6,4,8,BWH); f(4,-6,4,8,BWH);
    // eyes
    f(-3,-10,3,3,K); f(2,-10,3,3,K);
    f(-2,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    // pointy muzzle
    f(-2,-7,5,5,BWH); f(-1,-9,3,3,K);
  } else if(breed==='husky'){
    // body
    f(-9,-2,18,13,C); f(-6,2,12,7,L);
    // legs
    f(-6,10,4,7,D); f(2,10,4,7,D);
    // tail
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,D); f(10,tw-2,3,7,C); f(11,tw-4,2,5,W);
    // head
    f(-7,-14,14,13,C); f(-4,-12,9,5,W); f(-6,-14,4,7,D); f(2,-14,4,7,D);
    // ears
    f(-8,-20,6,8,D); f(2,-20,6,8,D);
    f(-6,-18,3,5,L); f(3,-18,3,5,L);
    // eyes
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    // muzzle
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
  } else if(breed==='shiba'){
    // compact sturdy body
    f(-8,-2,16,12,C); f(-5,2,10,7,W);
    f(-5,10,4,7,D); f(1,10,4,7,D);
    // curled tail (curl shape with multiple rects)
    const tw=Math.sin(t/180)*2;
    f(7,-2,5,8,D); f(9,-6+tw,4,6,C); f(10,-9+tw,3,4,C); f(8,-9+tw,4,3,C);
    // head — squarish, bold
    f(-7,-15,14,13,C); f(-4,-12,8,6,W);
    // ears — pointed, upright
    f(-7,-24,5,11,D); f(-5,-22,3,8,L);
    f(2,-24,5,11,D); f(3,-22,3,8,L);
    // eyes — almond shaped
    f(-4,-10,4,3,K); f(1,-10,4,3,K);
    f(-3,-10,1,1,'#fff'); f(2,-10,1,1,'#fff');
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
  } else if(breed==='corgi'){
    // WIDE low body
    f(-11,-1,22,10,C); f(-8,3,16,6,W);
    // SHORT stumpy legs
    f(-7,9,5,5,D); f(2,9,5,5,D);
    // fluffy butt / tail stub
    f(9,0,6,8,W); f(10,-1,5,6,L);
    // big square head
    f(-8,-14,16,14,C); f(-5,-10,10,7,W);
    // large upright ears
    f(-9,-24,7,12,D); f(-7,-22,4,9,L); f(-6,-21,2,6,'#FFBBAA');
    f(2,-24,7,12,D); f(3,-22,4,9,L); f(4,-21,2,6,'#FFBBAA');
    // wide eyes
    f(-5,-9,4,4,K); f(1,-9,4,4,K);
    f(-4,-9,2,2,'#fff'); f(2,-9,2,2,'#fff');
    f(-3,-5,7,4,W); f(-1,-7,4,3,K);
  } else if(breed==='poodle'){
    // pom-pom body (round fluffy patches)
    c.fillStyle=C;
    c.beginPath(); c.arc(x,by+2,9,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x-5,by+5,5,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by+5,5,0,Math.PI*2); c.fill();
    // legs (thin with pom ankles)
    f(-6,11,3,7,D); f(3,11,3,7,D);
    c.fillStyle=C; c.beginPath(); c.arc(x-4,by+19,4,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by+19,4,0,Math.PI*2); c.fill();
    // tail pom
    const tw=Math.sin(t/150)*4;
    c.fillStyle=D; c.beginPath(); c.arc(x+10,by-2+tw*0.5,3,0,Math.PI*2); c.fill();
    c.fillStyle=C; c.beginPath(); c.arc(x+12,by-4+tw,4,0,Math.PI*2); c.fill();
    // head pom
    c.fillStyle=C; c.beginPath(); c.arc(x,by-15,7,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x-5,by-18,5,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by-18,5,0,Math.PI*2); c.fill();
    // ear poms
    c.fillStyle=D; c.beginPath(); c.arc(x-8,by-16,4,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+8,by-16,4,0,Math.PI*2); c.fill();
    // face
    f(-3,-10,3,3,K); f(1,-10,3,3,K);
    f(-2,-10,1,1,'#fff'); f(2,-10,1,1,'#fff');
    f(-2,-7,5,3,W); f(-1,-9,3,3,K);
  } else if(breed==='dalmatian'){
    // white base coat with spots
    f(-9,-2,18,13,'#F5F0E8'); f(-6,2,12,7,W);
    f(-6,10,4,7,'#D8D4CC'); f(2,10,4,7,'#D8D4CC');
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,'#D8D4CC'); f(10,tw-2,3,7,'#F5F0E8');
    f(-7,-14,14,13,'#F5F0E8'); f(-4,-12,8,4,'#F5F0E8');
    f(-8,-20,6,8,'#D8D4CC'); f(2,-20,6,8,'#D8D4CC');
    f(-6,-18,3,4,W); f(3,-18,3,4,W);
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
    // spots using main color
    const spots=[[-4,1,4,4],[ 3,3,3,4],[-7,4,3,3],[5,0,3,3],[-1,6,4,3],
                 [-5,-13,3,3],[3,-12,4,3],[-6,-5,3,3],[2,-5,3,3]];
    c.fillStyle=C;
    spots.forEach(([rx,ry,rw,rh])=>{ c.fillRect(Math.round(x+rx),Math.round(by+ry),rw,rh); });
  }
}

// ---- Build the HTML for the selection screen ----
function buildSelectScreen(playerNum){
  const cfg = dogConfig[`p${playerNum}`];
  return `
<div id="charSelect" class="overlay-screen">
  <div class="cs-title">
    <span class="cs-player-badge p${playerNum}-badge">P${playerNum}</span>
    Choose Your Dog
  </div>

  <div class="cs-section-label">Breed</div>
  <div class="cs-breeds" id="csBreeds">
    ${BREEDS.map(b=>`
      <div class="breed-card ${cfg.breed===b.id?'selected':''}" data-breed="${b.id}">
        <canvas class="breed-preview" id="bprev-${b.id}" width="60" height="70"></canvas>
        <div class="breed-name">${b.name}</div>
        <div class="breed-desc">${b.desc}</div>
      </div>
    `).join('')}
  </div>

  ${cfg.breed==='dinno'||cfg.breed==='lolla' ? `
  <div class="cs-section-label">Colour</div>
  <div style="text-align:center;font-size:12px;color:#888;padding:8px 0;">
    ${cfg.breed==='dinno'?'Dinno':'Lolla'} keeps their real colours!
  </div>` : `
  <div class="cs-section-label">Colour</div>
  <div class="cs-colors" id="csColors">
    ${COLORS.map(col=>`
      <div class="color-swatch ${cfg.color.id===col.id?'selected':''}"
           data-colorid="${col.id}"
           style="background:${col.hex}"
           title="${col.label}">
        ${cfg.color.id===col.id?'<span class="swatch-check">✓</span>':''}
      </div>
    `).join('')}
  </div>`}

  <div class="cs-actions">
    ${playerNum===2 && pendingMode==='2p'
      ? `<button class="modebtn secondary" id="csBack">← Back</button>` : ''}
    <button class="modebtn" id="csNext">
      ${pendingMode==='2p' && playerNum===1 ? 'Next: P2 →' : '▶ Play!'}
    </button>
  </div>
</div>`;
}

function showCharSelect(playerNum){
  selectingPlayer = playerNum;
  const frame = document.getElementById('gameFrame');
  let el = document.getElementById('charSelect');
  if(el) el.remove();
  frame.insertAdjacentHTML('beforeend', buildSelectScreen(playerNum));

  // Wire breed cards
  document.querySelectorAll('.breed-card').forEach(card=>{
    card.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].breed = card.dataset.breed;
      // re-render just the cards + previews
      refreshSelectScreen(playerNum);
    });
  });

  // Wire color swatches
  document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].color = COLORS.find(c=>c.id===sw.dataset.colorid);
      refreshSelectScreen(playerNum);
    });
  });

  // Next button
  document.getElementById('csNext').addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    if(pendingMode==='2p' && playerNum===1){
      showCharSelect(2);
    } else {
      launchGame();
    }
  });

  // Back button (P2 screen → back to P1)
  const backBtn = document.getElementById('csBack');
  if(backBtn) backBtn.addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    showCharSelect(1);
  });

  // Draw breed previews (animated via RAF)
  renderBreedPreviews(playerNum);
}

let previewRAF = null;
function renderBreedPreviews(playerNum){
  if(previewRAF) cancelAnimationFrame(previewRAF);
  const cfg = dogConfig[`p${playerNum}`];
  function frame(t){
    BREEDS.forEach(b=>{
      const el = document.getElementById(`bprev-${b.id}`);
      if(!el) return;
      drawBreedPreviewInline(el.getContext('2d'), b.id, cfg.color.hex, 30, 42, t);
    });
    previewRAF = requestAnimationFrame(frame);
  }
  previewRAF = requestAnimationFrame(frame);
}

function refreshSelectScreen(playerNum){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  const el = document.getElementById('charSelect');
  if(el) el.remove();
  const frame = document.getElementById('gameFrame');
  frame.insertAdjacentHTML('beforeend', buildSelectScreen(playerNum));

  document.querySelectorAll('.breed-card').forEach(card=>{
    card.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].breed = card.dataset.breed;
      refreshSelectScreen(playerNum);
    });
  });
  document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].color = COLORS.find(c=>c.id===sw.dataset.colorid);
      refreshSelectScreen(playerNum);
    });
  });
  document.getElementById('csNext').addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    if(pendingMode==='2p' && playerNum===1) showCharSelect(2);
    else launchGame();
  });
  const backBtn = document.getElementById('csBack');
  if(backBtn) backBtn.addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    showCharSelect(1);
  });
  renderBreedPreviews(playerNum);
}

function launchGame(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  const cfg1 = dogConfig.p1, cfg2 = dogConfig.p2;
  if(pendingMode==='2p'){
    twoPlayer=true;
    document.getElementById('p2panel').style.display='flex';
    document.getElementById('p2controls').style.display='block';
  } else {
    twoPlayer=false;
    document.getElementById('p2panel').style.display='none';
    document.getElementById('p2controls').style.display='none';
  }
  // Update HUD dot colors safely (some browsers' querySelector returns NodeList that needs guarding)
  const dots = document.querySelectorAll('#hud .dot');
  if(dots[0]) dots[0].style.background = cfg1.color.hex;
  if(dots[1]) dots[1].style.background = cfg2.color.hex;

  document.getElementById('startScreen').style.display='none';
  // A brand-new game always starts at the first level (the current level may be a
  // later one if a previous run progressed before quitting).
  resetGame(cfg1, cfg2, Levels.first().id);
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  startMusic();
  if(!twoPlayer && isTouchDevice()) showMobileControls(true);
}

// Override resetGame to accept configs. `levelId` picks which level to build; omit it
// to rebuild whatever level is current (used by Play Again after a game over).
function resetGame(cfg1, cfg2, levelId){
  stopMusic();
  // A brand-new game (levelId given = starting at level 1) wipes campaign progress.
  if(levelId && typeof Progress!=='undefined' && Levels.first() && levelId===Levels.first().id) Progress.reset();
  if(levelId) LevelManager.load(levelId);   // regenerate a specific level
  else LevelManager.reload();               // rebuild the current level
  Abilities.reset();
  const c1 = cfg1 || dogConfig.p1;
  const c2 = cfg2 || dogConfig.p2;
  const spawn = (LevelManager.current && LevelManager.current.spawn) || { x:200, y:200 };
  p1=makePlayer(1, c1.color.hex, spawn.x, spawn.y, c1.breed);
  p2=makePlayer(2, c2.color.hex, spawn.x+60, spawn.y, c2.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
  document.getElementById('gameOverScreen').style.display='none';
  if(typeof WorldMap!=='undefined') WorldMap.hide();
}

// Play Again after a game over: rebuild the level the run ended on (keeping the same
// dogs) and drop straight back into play — no trip through the menu / char-select.
function replayRun(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  resetGame(dogConfig.p1, dogConfig.p2);   // no levelId → current level
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  startMusic();
  if(!twoPlayer && isTouchDevice()) showMobileControls(true);
}

// Wire main menu buttons → char select flow
document.getElementById('btn1p').addEventListener('click',()=>{
  pendingMode='solo';
  Game.state=SCENES.CHARSELECT;
  document.getElementById('startScreen').style.display='none';
  showCharSelect(1);
});
document.getElementById('btn2p').addEventListener('click',()=>{
  pendingMode='2p';
  Game.state=SCENES.CHARSELECT;
  document.getElementById('startScreen').style.display='none';
  showCharSelect(1);
});
document.getElementById('btnReplay').addEventListener('click',()=>{
  stopMusic();
  document.getElementById('winScreen').style.display='none';
  document.getElementById('startScreen').style.display='flex';
  Game.state=SCENES.MENU;
});

// Soundtrack picker — cycles through tracks and previews the choice
const soundtrackBtn=document.getElementById('btnSoundtrack');
if(soundtrackBtn){
  const refreshSoundtrackBtn=()=>{ soundtrackBtn.textContent='🎵 Music: '+currentTrackName(); };
  refreshSoundtrackBtn();
  soundtrackBtn.addEventListener('click',()=>{
    cycleSoundtrack();
    refreshSoundtrackBtn();
  });
}

// ===== src/dev.js =====
// ====================== DEV MODE ======================
// A testing panel to jump straight into any level/biome, skipping the menu and
// char-select. Lists every campaign environment (data/campaign.js) with its levels;
// levels backed by a registered, playable level are buttons, the rest show "soon".
//
// Open it from the "🛠 Dev Mode" button on the start screen, or press the backtick key
// (`) anytime (see core/input.js). Purely a dev convenience — nothing here affects a
// normal playthrough.

const DevMode = {
  _pausedByDev: false,

  open(){
    // Freeze the world if we're opening mid-game so the dog doesn't wander behind the panel.
    if(Game.state===SCENES.PLAYING){ Game.state=SCENES.PAUSED; this._pausedByDev=true; }
    this.render();
    if(typeof UI!=='undefined') UI._show('devScreen', true);
  },

  close(){
    if(typeof UI!=='undefined') UI._show('devScreen', false);
    if(this._pausedByDev && Game.state===SCENES.PAUSED){ Game.state=SCENES.PLAYING; }
    this._pausedByDev=false;
  },

  toggle(){
    const el=document.getElementById('devScreen'); if(!el) return;
    (getComputedStyle(el).display==='none') ? this.open() : this.close();
  },

  render(){
    const body=document.getElementById('devBody'); if(!body) return;
    let html='';
    Campaign.environments.forEach(env=>{
      html += `<div class="dev-env"><div class="dev-env-h">${env.icon} ${env.name}</div><div class="dev-levels">`;
      env.levels.forEach(l=>{
        const playable = !!l.real && (typeof Levels!=='undefined') && Levels.get(l.id);
        const tag = l.kind==='boss' ? '👑 ' : '';
        html += playable
          ? `<button class="dev-lvl${l.kind==='boss'?' boss':''}" data-lvl="${l.id}">${tag}${l.name}</button>`
          : `<span class="dev-lvl soon">${tag}${l.name} · soon</span>`;
      });
      html += `</div></div>`;
    });
    body.innerHTML=html;
  },

  // Boot a solo run straight into `levelId` with the currently-selected dogs.
  play(levelId){
    if(!(typeof Levels!=='undefined' && Levels.get(levelId))) return;
    this._pausedByDev=false;
    this.close();
    twoPlayer=false;
    const p2p=document.getElementById('p2panel'); if(p2p) p2p.style.display='none';
    const p2c=document.getElementById('p2controls'); if(p2c) p2c.style.display='none';
    const ss=document.getElementById('startScreen'); if(ss) ss.style.display='none';
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    resetGame(dogConfig.p1, dogConfig.p2, levelId);
    if(typeof Abilities!=='undefined') Abilities.spawnAll();
    Game.state=SCENES.PLAYING;
    if(typeof startMusic==='function') startMusic();
    if(typeof isTouchDevice==='function' && isTouchDevice() && typeof showMobileControls==='function') showMobileControls(true);
    if(typeof showToast==='function') showToast('🛠 Dev: '+Levels.get(levelId).name, 1600);
  },

  init(){
    const body=document.getElementById('devBody');
    if(body) body.addEventListener('click', e=>{ const b=e.target.closest('[data-lvl]'); if(b) this.play(b.dataset.lvl); });
    const close=document.getElementById('devClose'); if(close) close.addEventListener('click',()=>this.close());
    const open=document.getElementById('btnDev'); if(open) open.addEventListener('click',()=>this.open());
  },
};

DevMode.init();
