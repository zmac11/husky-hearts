// ====================== SAVE / LOAD ======================
// Saves live in numbered SLOTS (1–6) plus a separate autosave that updates whenever you
// arrive in a level. The picker UI is save-ui.js; this file is only storage + (de)serialisation.
//
// A save is small because levels are seeded: it stores the run seed (core/run.js) and,
// per level you've visited, only the DYNAMIC state (level-state.js) — chests, NPCs,
// enemies, treats, cheered friends. Terrain regenerates from the seed on load. Everything
// stored is plain data (no functions), so JSON round-trips cleanly; behaviour lives in the
// registries (Breeds/Abilities/Entities).
//
// localStorage layout:
//   hh-save-v2:meta          → { slotId: {breed, dogLevel, levelName, …} }  (for the picker)
//   hh-save-v2:slot:<id>     → the full payload for one slot
//   hh-save-v2:migrated      → set once the pre-slot save (v1) has been imported

const Save = {
  KEY_V1: 'husky-hearts-save-v1',      // the single pre-slot save; imported once, then left alone
  META:   'hh-save-v2:meta',
  MIGRATED: 'hh-save-v2:migrated',
  SLOTS: ['1','2','3','4','5','6'],
  AUTO: 'auto',

  slotKey(id){ return 'hh-save-v2:slot:' + id; },
  allSlots(){ return this.SLOTS.concat([this.AUTO]); },

  // ---------- metadata index (what the slot cards show) ----------
  meta(){
    try { return JSON.parse(localStorage.getItem(this.META)) || {}; }
    catch(e){ return {}; }
  },
  _writeMeta(m){ try { localStorage.setItem(this.META, JSON.stringify(m)); } catch(e){} },
  metaOf(slotId){ return this.meta()[slotId] || null; },

  // Slot list for the picker: [{id, meta}] in fixed order; empty slots have meta:null.
  list(){ const m=this.meta(); return this.allSlots().map(id=>({ id, meta: m[id] || null })); },
  has(){ const m=this.meta(); return this.allSlots().some(id=>!!m[id]); },
  isEmpty(slotId){ return !this.metaOf(slotId); },

  // ---------- serialisation ----------
  _serializePlayer(p){
    return { id:p.id, breed:p.breed, color:p.color, x:p.x, y:p.y, dir:p.dir,
             treats:p.treats,
             inventory:Inventory.cells(p).map(c => c ? { id:c.id, qty:c.qty } : null),
             equipment:Object.assign({}, p.equipment), hp:p.hp, maxHp:p.maxHp, dead:!!p.dead,
             skills:Object.assign({}, p.skills), skillPoints:p.skillPoints||0,
             mastery:Object.assign({}, p.mastery), masteryPoints:p.masteryPoints||0,
             xp:p.xp||0, dogLevel:p.dogLevel||1 };
  },

  // Snapshot the whole run. The level you're standing in is captured into LevelState
  // first, so `levels` always includes it.
  capture(){
    const levelId = LevelManager.current ? LevelManager.current.id : null;
    if(levelId && typeof LevelState!=='undefined') LevelState.capture(levelId);
    return {
      version: 2,
      seed: Run.seed, seedText: Run.seedText,
      levelId,
      cheeredCount: Game.cheeredCount,
      progress: (typeof Progress!=='undefined') ? Progress.completed : {},
      players: Game.players.map(p=>this._serializePlayer(p)),
      cam: { x:cam.x, y:cam.y },
      levels: (typeof LevelState!=='undefined') ? LevelState.all() : {},
      at: Date.now(),
    };
  },

  _metaFrom(data){
    const p=(data.players && data.players[0]) || {};
    const lvl=(typeof Levels!=='undefined') && Levels.get(data.levelId);
    const env=(typeof Campaign!=='undefined') ? Campaign.envOfLevel(data.levelId) : null;
    const breedDef=(typeof Breeds!=='undefined') && p.breed ? Breeds.get(p.breed) : null;
    return {
      breed: p.breed || '—',
      breedName: breedDef ? breedDef.name : (p.breed||'Dog'),
      breedIcon: breedDef ? breedDef.emoji : '🐕',
      dogLevel: p.dogLevel || 1,
      levelId: data.levelId,
      levelName: lvl ? lvl.name : (data.levelId || 'Unknown'),
      envIcon: env ? env.icon : '🐾',
      seedText: data.seedText || String(data.seed||''),
      levelsVisited: data.levels ? Object.keys(data.levels).length : 0,
      cleared: data.progress ? Object.keys(data.progress).length : 0,
      at: data.at || Date.now(),
    };
  },

  // ---------- write ----------
  write(slotId, opts){
    const quiet=opts && opts.quiet;
    if(Game.state!==SCENES.PLAYING && Game.state!==SCENES.PAUSED && Game.state!==SCENES.WORLDMAP){
      if(!quiet) showToast('Can only save while playing.', 1600);
      return false;
    }
    const data=this.capture();
    try {
      localStorage.setItem(this.slotKey(slotId), JSON.stringify(data));
      const m=this.meta(); m[slotId]=this._metaFrom(data); this._writeMeta(m);
      if(!quiet) showToast(`💾 Saved to slot ${slotId}!`, 1500);
      if(typeof UI!=='undefined' && UI.refreshContinueButton) UI.refreshContinueButton();
      return true;
    } catch(e){
      const full = e && (e.name==='QuotaExceededError' || e.code===22);
      if(!quiet) showToast(full ? 'Storage full — delete a save first.' : 'Save failed: '+e.message, 2400);
      return false;
    }
  },

  // Autosave: silent, never blocks, always the same slot.
  auto(){ return this.write(this.AUTO, { quiet:true }); },

  remove(slotId){
    try { localStorage.removeItem(this.slotKey(slotId)); } catch(e){}
    const m=this.meta(); delete m[slotId]; this._writeMeta(m);
    if(typeof UI!=='undefined' && UI.refreshContinueButton) UI.refreshContinueButton();
    return true;
  },

  // ---------- read ----------
  read(slotId){
    let data;
    try { data = JSON.parse(localStorage.getItem(this.slotKey(slotId))); }
    catch(e){ data = null; }
    if(!data){ showToast('That save slot is empty.', 1600); return false; }
    return this._apply(data);
  },

  _apply(data){
    // --- run seed first: every level rebuilds from it ---
    Run.set(data.seed, data.seedText);

    // --- campaign progress + remembered level states ---
    if(typeof Progress!=='undefined') Progress.completed = data.progress || {};
    if(typeof LevelState!=='undefined') LevelState.setAll(data.levels || {});

    // --- player (rebuilt before the level so the HUD and ability spawns see it) ---
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
    if(data.players && data.players[0]) p1 = restore(data.players[0]);

    // --- the level: regenerate from the seed, then lay its saved state back on top ---
    const levelId = (typeof Levels!=='undefined' && Levels.get(data.levelId)) ? data.levelId
                                                                             : (Levels.first() && Levels.first().id);
    LevelManager.enter(levelId, { keepCurrent:true });
    if(typeof data.cheeredCount==='number') Game.cheeredCount = data.cheeredCount;

    // The dog stands where it was saved (enter() doesn't move players).
    if(data.players && data.players[0] && p1){ p1.x=data.players[0].x; p1.y=data.players[0].y; }
    cam.x = data.cam ? data.cam.x : 0; cam.y = data.cam ? data.cam.y : 0;

    Abilities.reset(); Abilities.spawnAll();

    // --- enter play ---
    if(typeof UI !== 'undefined' && UI.closePanel) UI.closePanel();
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('winScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    sparkles = [];
    if(typeof resetXpOrbs==='function') resetXpOrbs();
    Game.state = SCENES.PLAYING;
    updateHUD();
    if(typeof startMusic === 'function') startMusic();
    if(typeof isTouchDevice==='function' && isTouchDevice() && typeof showMobileControls==='function') showMobileControls(true);
    showToast('📂 Game loaded!', 1500);
    return true;
  },

  // ---------- legacy import ----------
  // The pre-slot save has no seed and carries its own terrain snapshot. It's imported
  // into the first free slot with that terrain tucked inside the level snapshot;
  // LevelState.restore() honours a snapshot's `world` block, so it loads as it was saved.
  migrateV1(){
    try {
      if(localStorage.getItem(this.MIGRATED)) return false;
      const raw=localStorage.getItem(this.KEY_V1);
      localStorage.setItem(this.MIGRATED, '1');
      if(!raw) return false;
      const old=JSON.parse(raw);
      if(!old || !old.players) return false;
      const target=this.SLOTS.find(id=>this.isEmpty(id));
      if(!target) return false;

      const data={
        version:2,
        seed:Run.seed, seedText:Run.seedText,     // unknown — terrain comes from the snapshot below
        levelId: old.levelId,
        cheeredCount: old.cheeredCount||0,
        progress: old.progress || {},
        players: old.players,
        cam: old.cam || {x:0,y:0},
        levels: {},
        at: Date.now(),
      };
      data.levels[old.levelId] = {
        cheered: old.cheeredCount||0,
        worldW: old.worldW, worldH: old.worldH,
        world: old.world || null,                 // legacy terrain — see LevelState.restore
        entities: old.entities || [],
        collectibles: old.collectibles || [],
        friends: old.friends || [],
        at: Date.now(),
      };
      localStorage.setItem(this.slotKey(target), JSON.stringify(data));
      const m=this.meta(); m[target]=this._metaFrom(data); this._writeMeta(m);
      return true;
    } catch(e){ return false; }
  },
};

Save.migrateV1();
