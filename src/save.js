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
             equipment:Object.assign({}, p.equipment), hp:p.hp, maxHp:p.maxHp, dead:!!p.dead,
             skills:Object.assign({}, p.skills), skillPoints:p.skillPoints||0,
             mastery:Object.assign({}, p.mastery), masteryPoints:p.masteryPoints||0,
             xp:p.xp||0, dogLevel:p.dogLevel||1 };
  },

  save(){
    if(Game.state!==SCENES.PLAYING && Game.state!==SCENES.PAUSED){
      showToast('Can only save while playing.', 1600); return false;
    }
    const data = {
      version: 1,
      levelId: LevelManager.current ? LevelManager.current.id : null,
      worldW: WORLD_W, worldH: WORLD_H,
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

    // --- player ---
    const restore = (sp)=>{
      const pl = makePlayer(sp.id, sp.color, sp.x, sp.y, sp.breed);
      pl.dir = sp.dir; pl.treats = sp.treats;
      pl.inventory = sp.inventory || Inventory.create(); Inventory.cells(pl); // normalize length
      pl.equipment = sp.equipment || {};
      pl.skills = sp.skills || {};
      pl.skillPoints = sp.skillPoints || 0;
      pl.mastery = sp.mastery || {};
      pl.masteryPoints = sp.masteryPoints || 0;
      pl.xp = sp.xp || 0;
      pl.dogLevel = sp.dogLevel || 1;
      if(typeof Mastery!=='undefined') Mastery.migrate(pl);   // pre-split saves: skills→mastery
      if(typeof Skills!=='undefined') Skills.apply(pl);       // re-derive stats from skills
      if(typeof sp.maxHp==='number') pl.maxHp = sp.maxHp;
      if(typeof sp.hp==='number') pl.hp = Math.min(sp.hp, pl.maxHp);
      pl.dead = !!sp.dead;
      return pl;
    };
    if(data.players[0]) p1 = restore(data.players[0]);

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
    sparkles = [];
    Game.state = SCENES.PLAYING;
    updateHUD();
    if(typeof startMusic === 'function') startMusic();
    showToast('📂 Game loaded!', 1500);
    return true;
  },
};
