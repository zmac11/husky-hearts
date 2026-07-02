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
};
