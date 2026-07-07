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
