// ====================== LEVEL STATE ======================
// Levels you have already been in stay exactly as you left them: chests you dug up are
// still open, NPCs remember their quest state, defeated enemies stay gone, treats you
// picked up don't come back. That lets you walk back into a cleared level (via the
// journey map) to visit a shopkeeper or hand in a task.
//
// Only the DYNAMIC half of a level is stored here — entities, collectibles, friends and
// the cheer count. The terrain (worldObjects/colliders/river) is NOT stored: it is
// regenerated from the run seed (core/run.js), which is deterministic, so a snapshot is
// tiny and saves stay small. Legacy v1 saves (made before seeding existed) carry their
// own terrain in `world`, and restore() honours that when present.
//
// Snapshots are plain JSON — the same property that lets the whole thing ride along in a
// save file (save.js) with no extra serialisation code.

const LevelState = {
  _byId: {},

  // Entity kinds that are transient summons/effects — never worth preserving across a
  // level change (they'd reappear frozen mid-animation).
  TRANSIENT: ['spiritwolf'],

  _clone(v){ return JSON.parse(JSON.stringify(v)); },

  has(id){ return !!(id && this._byId[id]); },
  get(id){ return (id && this._byId[id]) || null; },
  all(){ return this._byId; },
  setAll(obj){ this._byId = obj || {}; },
  clear(){ this._byId = {}; },
  ids(){ return Object.keys(this._byId); },
  count(){ return this.ids().length; },

  // Snapshot the live world's dynamic state for `id` (called when leaving a level).
  capture(id){
    if(!id) return null;
    const keep=(typeof entities!=='undefined' && entities ? entities : [])
      .filter(e => e && this.TRANSIENT.indexOf(e.kind)===-1);
    const snap = {
      cheered: (typeof Game!=='undefined') ? Game.cheeredCount : 0,
      worldW: WORLD_W, worldH: WORLD_H,
      entities: this._clone(keep),
      collectibles: this._clone(typeof collectibles!=='undefined' && collectibles ? collectibles : []),
      friends: this._clone(typeof friends!=='undefined' && friends ? friends : []),
      at: Date.now(),
    };
    // A legacy (v1) level keeps its stored terrain for the rest of the run — it has no
    // seed to regenerate from, so dropping it here would shift the ground out from under
    // the entities the next time you walked back in.
    const prev=this._byId[id];
    if(prev && prev.world){ snap.world=prev.world; snap.worldW=prev.worldW; snap.worldH=prev.worldH; }
    this._byId[id] = snap;
    return snap;
  },

  // Apply a snapshot over a freshly generated level (LevelManager.enter does the
  // generating first, so terrain + ground canvas already match the seed). Returns false
  // when this level has never been visited.
  restore(id){
    const s = this.get(id);
    if(!s) return false;

    // Legacy (v1 save) snapshots carry their own terrain — use it rather than the
    // freshly generated one, so an old save still looks like the world it was saved in.
    if(s.world){
      if(typeof s.worldW==='number'){ WORLD_W=s.worldW; WORLD_H=s.worldH; }
      worldObjects.length=0; (s.world.objects||[]).forEach(o=>worldObjects.push(o));
      colliders.length=0;    (s.world.colliders||[]).forEach(c=>colliders.push(c));
      river = s.world.river || river;
      if(typeof buildGroundCanvas==='function') buildGroundCanvas();
    }

    entities    = this._clone(s.entities || []);
    collectibles= this._clone(s.collectibles || []);
    friends     = this._clone(s.friends || []);
    Game.cheeredCount = s.cheered || 0;
    return true;
  },

  // ---------- map detail ----------
  // What the journey map's level card shows. Reads the snapshot (an unvisited level has
  // none), so it describes the level as you left it — not as it would generate.
  summary(id){
    const cleared = (typeof Progress!=='undefined') && Progress.isDone(id);
    const s = this.get(id);
    const current = (typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.id===id);
    if(!s) return { visited:false, cleared, current };

    const es = s.entities || [];
    const chestList = es.filter(e=>e.kind==='chest');
    const npcs = es.filter(e=>e.kind==='npc').map(e=>({
      name: e.name || 'Wanderer',
      shop: !!(e.wares && e.wares.length),
      quest: e.quest ? ((typeof Quests!=='undefined') ? Quests.stateOf(e.quest) : (e.quest.state||'available')) : null,
    }));
    const fr = s.friends || [];
    const items = s.collectibles || [];
    return {
      visited: true, cleared, current,
      chests: { looted: chestList.filter(c=>c.state==='open').length, total: chestList.length },
      npcs,
      enemies: es.filter(e=>e.kind==='enemy'||e.kind==='wolf').length,
      critters: es.filter(e=>e.kind==='critter').length,
      treatsLeft: items.filter(i=>!i.taken).length,
      friends: { cheered: fr.filter(f=>f.cheered).length, total: fr.length },
      at: s.at || 0,
    };
  },
};
