// ====================== LEVEL MANAGER ======================
// Loads a level: sets world size, opens a seeded generation window, runs the level's
// generator, and rebuilds the themed ground canvas. This is the single entry point for
// (re)building the world — called at startup (main.js) and on each game start (resetGame).
//
// Two ways in:
//   load(id)   — build the level FRESH from the run seed (new game, replay, dev jump)
//   enter(id)  — travel there during a run: build fresh, then lay the level's saved
//                dynamic state (level-state.js) back on top if you've been there before

let _currentLevel = null;

const LevelManager = {
  get current(){ return _currentLevel; },
  get theme(){ return _currentLevel ? _currentLevel.theme : null; },

  // Set the active level (for theme/quest) WITHOUT regenerating — used by Save.read(),
  // which restores a world snapshot instead of building a fresh one.
  _setCurrent(level){ _currentLevel = level; },

  load(id){
    const level = Levels.get(id) || Levels.first();
    if(!level){ console.warn('LevelManager: no levels registered'); return null; }
    _currentLevel = level;

    // Resize world, then generate inside a seeded window so the same run seed always
    // rebuilds this exact layout (core/run.js). Everything random in generation — terrain,
    // collectibles, buried chests — draws from this stream via rnd()/rand().
    if(level.size){ WORLD_W = level.size.w; WORLD_H = level.size.h; }
    RNG.beginGen(Run.levelSeed(level.id, level.seed));
    level.generate();

    // Keep quest animals (friends) and merchants (NPC entities) out of the water — their
    // spawn points are fixed, so a procedurally-placed pond/lake can land on one.
    if(typeof nudgeOutOfWater==='function'){
      if(typeof friends!=='undefined' && friends) friends.forEach(f=>nudgeOutOfWater(f));
      if(typeof entities!=='undefined' && entities) entities.forEach(e=>{ if(e.kind==='npc') nudgeOutOfWater(e); });
    }
    RNG.endGen();

    // Rebuild the pre-rendered ground with this level's theme.
    buildGroundCanvas();

    if(typeof Tide!=='undefined') Tide.reset();   // enter a tidal level at high tide (readable intro)
    if(typeof Sandstorm!=='undefined') Sandstorm.reset();   // desert weather clock (Golden Dunes)
    if(typeof Blizzard!=='undefined') Blizzard.reset();     // tundra weather clock (Frostfang Tundra)
    if(typeof Cooking!=='undefined') Cooking.reset();   // fresh cook count per level (Amber Orchard)

    // Fresh quest progress for the new level; drop any leftover XP orbs.
    Game.cheeredCount = 0;
    if(typeof resetXpOrbs==='function') resetXpOrbs();
    if(typeof resetFloaters==='function') resetFloaters();
    return level;
  },

  // Convenience: (re)load whatever level is current, defaulting to the first.
  reload(){ return this.load(_currentLevel ? _currentLevel.id : (Levels.first() && Levels.first().id)); },

  // Build `id` and restore its remembered state if it has any. Terrain always comes from
  // the seed; only the dynamic half (chests, NPCs, enemies, treats, cheered friends) is
  // laid back on top. `opts.keepCurrent` skips snapshotting the level we're leaving
  // (used when loading a save, where the outgoing world isn't part of that run).
  enter(id, opts){
    const o = opts || {};
    if(!o.keepCurrent && _currentLevel && typeof LevelState!=='undefined') LevelState.capture(_currentLevel.id);

    const lvl = this.load(id);
    if(!lvl) return null;
    if(typeof LevelState!=='undefined') LevelState.restore(lvl.id);

    this._armExit(lvl);
    return lvl;
  },

  // A cleared level keeps its exit portal so you can leave again after revisiting. The
  // restored portal has already been walked through (used:true), so re-arm it; and if a
  // cleared level somehow has none, put one back — otherwise checkWin() would treat the
  // revisit as a fresh clear and hand out level-clear rewards a second time.
  _armExit(lvl){
    if(typeof entities==='undefined' || !entities) return;
    let portal=null;
    entities.forEach(e=>{ if(e.kind==='portal'){ e.used=false; portal=e; } });
    const cleared=(typeof Progress!=='undefined') && Progress.isDone(lvl.id);
    // A cleared level keeps its portal. (autoPortal levels spawn their own in generate(),
    // so they already have one here — this just re-arms it above.)
    if(!cleared || portal) return;
    const env=(typeof Campaign!=='undefined') ? Campaign.envOfLevel(lvl.id) : null;
    const nextLvl=lvl.next && Levels.get(lvl.next);
    const nextEnv=(nextLvl && typeof Campaign!=='undefined') ? Campaign.envOfLevel(nextLvl.id) : null;
    const spawn=lvl.spawn || { x:200, y:200 };
    const spot={ x:clamp(spawn.x+110, 80, WORLD_W-80), y:clamp(spawn.y+40, 80, WORLD_H-80) };
    if(typeof nudgeOutOfWater==='function') nudgeOutOfWater(spot, 40);
    Entities.spawn('portal', { x:spot.x, y:spot.y, levelId:lvl.id,
      colA:(env&&env.color)||'#9B7EC8', colB:'#FFD93D', icon:(nextEnv&&nextEnv.icon)||'✨' });
  },

  // Travel to another level during a run: build/restore it, then move the existing dogs
  // to the spawn and heal them to full. Inventory + treats always carry over; the level
  // you leave is snapshotted so you can come back to it exactly as it was.
  goTo(id){
    const lvl=this.enter(id);
    if(!lvl) return null;
    const spawn=lvl.spawn || { x:200, y:200 };
    const players=Game.players;
    players.forEach((p,i)=>{
      if(!p) return;
      p.x=spawn.x+i*60; p.y=spawn.y;
      p.hp=p.maxHp; p.hurtTimer=0; p.swimming=false;
      p.dead=false;                 // fallen dogs are revived for the new level
    });
    if(typeof Abilities!=='undefined'){ Abilities.reset(); Abilities.spawnAll(); }
    if(typeof Warmth!=='undefined') Warmth.reset(p1);   // enter every level toasty-warm
    if(typeof Survival!=='undefined') Survival.reset(p1);// enter every level fully hydrated
    if(typeof Relics!=='undefined') Relics.reset(p1);   // relic cooldown fresh
    if(p1){ p1._skysafe=undefined; p1._svx=0; p1._svy=0; }   // fresh sky-glide state (Cloud Kingdom)
    if(typeof Status!=='undefined') Status.clearAll(p1);// and free of any lingering conditions
    if(typeof sparkles!=='undefined') sparkles=[];
    if(typeof updateCamera==='function') updateCamera();
    if(typeof updateHUD==='function') updateHUD();
    if(typeof showToast==='function') showToast(`⛰️ ${lvl.name}`, 2200);
    if(typeof Save!=='undefined' && Save.auto) Save.auto();   // autosave on every arrival
    return lvl;
  },
};
