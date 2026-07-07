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
             equipment:Object.assign({}, p.equipment), hp:p.hp, maxHp:p.maxHp };
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
      return pl;
    };
    if(data.players[0]) p1 = restore(data.players[0]);
    if(data.players[1]) p2 = restore(data.players[1]);

    Game.cheeredCount = data.cheeredCount || 0;
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
