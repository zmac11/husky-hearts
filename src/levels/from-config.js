// ====================== LEVELS FROM CONFIG ======================
// Turns each entry in src/config/levels.json (baked into LEVELS_DATA) into a registered
// level. The data says WHAT a level contains — its terrain/augment by name, collectibles,
// friends, npcs (+ shop wares / quest), enemies, critters, buried chests, and its quest —
// and this file is the generic generate() that reads that data and spawns it. Terrain and
// decoration stay code (procedural), referenced by name through TERRAIN / AUGMENTS
// (levels/index.js), populated by the level files (meadow.js, rocky.js, …).
//
// Levels/LevelManager APIs are unchanged, so save, world-map, dev-jump and level-state
// keep working exactly as before.

// ---- quest types: completion logic a level's quest.type points at ----
// (all shipped levels are 'cheer-all'; add a type here to introduce a new objective.)
QUEST_TYPES['cheer-all'] = {
  describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
  isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
};

// 'none' — no win condition. A walk-to-the-portal placeholder for auto-portal test levels
// (level-manager _armExit); checkWin never fires. No live level uses it now.
QUEST_TYPES['none'] = {
  describe(){ return 'Walk to the portal'; },
  isComplete(){ return false; },
};

// 'trap' — outwit the Badger Baron (entities/badgerbaron.js) by tricking his charges into
// the leaf-covered pit traps (entities/pittrap.js). The first boss, won without dealing any
// damage: the third pit-fall finishes him and calls checkWin() itself. `_trapArmed` (set in
// generate when the Baron spawns) stops a Baron-less level from counting as instantly won.
let _trapArmed = false;
QUEST_TYPES['trap'] = {
  _baron(){
    const es=(typeof entities!=='undefined' && entities) ? entities : [];
    return es.find(e=>e.kind==='badgerbaron') || null;
  },
  describe(){
    const b=this._baron();
    if(!b) return _trapArmed ? 'The Baron is beaten!' : 'Outwit the Baron';
    const total=b.maxHp||3, sprung=Math.max(0, total-(b.hp||0));
    return `Pits sprung ${sprung}/${total}`;
  },
  isComplete(){ return _trapArmed && !this._baron(); },
};

// 'kindle' — relight every firepit in the level (entities/firepit.js). The clear objective of
// Frozen Pass: rekindle the waystation fires to warm the pass and open the way onward.
QUEST_TYPES['kindle'] = {
  _fires(){
    const es=(typeof entities!=='undefined' && entities) ? entities : [];
    const all=es.filter(e=>e.kind==='firepit');
    return { lit:all.filter(e=>e.lit).length, total:all.length };
  },
  describe(){ const f=this._fires(); return `Fires lit ${f.lit}/${f.total}`; },
  isComplete(){ const f=this._fires(); return f.total>0 && f.lit>=f.total; },
};

// 'ritual' — light every shrine lantern (entities/shrinelantern.js). The Moonlit Rite in
// Firefly Grove; completing it (a level flagged `unlockUltimate`) awakens the R Ultimate.
QUEST_TYPES['ritual'] = {
  _lamps(){
    const es=(typeof entities!=='undefined' && entities) ? entities : [];
    const all=es.filter(e=>e.kind==='shrinelantern');
    return { lit:all.filter(e=>e.lit).length, total:all.length };
  },
  describe(){ const l=this._lamps(); return `Shrine lanterns lit ${l.lit}/${l.total}`; },
  isComplete(){ const l=this._lamps(); return l.total>0 && l.lit>=l.total; },
};

// 'defeat' — clear the level's guardians (enemies). Cliffside Climb's gauntlet: drive off
// every wolf to open the summit gate. `_armed` (set in generate when enemies spawn) stops an
// enemy-less level from counting as instantly won.
let _defeatArmed = false;
const _ENEMY_KINDS = ['enemy','wolf','packleader','shadowlurker','toadstool','alphawolf','grizzly'];
QUEST_TYPES['defeat'] = {
  _left(){
    const es=(typeof entities!=='undefined' && entities) ? entities : [];
    return es.filter(e=>_ENEMY_KINDS.indexOf(e.kind)!==-1).length;
  },
  describe(){ return `Enemies left ${this._left()}`; },
  isComplete(){ return _defeatArmed && this._left()===0; },
};

// 'fetch-from' — retrieve a specific item from somewhere in the level and carry it out
// (Fungus Hollow's Mooncap). `_fetchItem` is set in generate from the quest config.
let _fetchItem = null;
QUEST_TYPES['fetch-from'] = {
  describe(){
    if(!_fetchItem) return 'Find the item';
    const d=(typeof Items!=='undefined') ? Items.get(_fetchItem) : null;
    const have=(typeof p1!=='undefined' && typeof Inventory!=='undefined') ? Inventory.count(p1,_fetchItem) : 0;
    return have>0 ? `${d?d.icon:''} Retrieved!` : `Find the ${d?d.name:_fetchItem}`;
  },
  isComplete(){
    if(!_fetchItem) return false;
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    return players.some(p=>Inventory.count(p,_fetchItem)>0);
  },
};

// ---- helpers ----
// Resolve a placement to absolute world coords. Supports absolute {x,y}, fractional
// {fx,fy} (of the current WORLD_W/H), and {onWater:{kind,index,dx,dy,dyEdge}} which pins
// to a pond/lake — returns null if that water body doesn't exist (spawn is skipped).
function _resolvePos(spec){
  if(spec.onWater){
    const w=spec.onWater;
    const body=worldObjects.filter(o=>o.kind===w.kind)[w.index||0];
    if(!body) return null;
    const y=body.y + (w.dyEdge ? body.h/2 : 0) + (w.dy||0);
    return { x:body.x + (w.dx||0), y };
  }
  if(typeof spec.fx==='number' || typeof spec.fy==='number'){
    return { x:WORLD_W*(spec.fx||0), y:WORLD_H*(spec.fy||0) };
  }
  return { x:spec.x||0, y:spec.y||0 };
}

// Build the level's collectibles from a small spec: N items cycling `types` + `fish` fish
// darting along the river. Generalizes the old makeCollectibles / makeRockyCollectibles.
function buildCollectibles(spec){
  spec = spec || {};
  const types = spec.types || ['bone','heart','ball','flower'];
  const n = spec.count || 24;
  const xM = spec.xMargin || 80, yMin = spec.yMin || 80, yM = spec.yMargin || 80;
  const items = [];
  for(let i=0;i<n;i++){
    items.push({ x:rand(xM, WORLD_W-xM), y:rand(yMin, WORLD_H-yM),
      type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2) });
  }
  const fishN = (spec.fish!=null) ? spec.fish : 6, fishM = spec.fishMargin || 120;
  for(let i=0;i<fishN;i++){
    const baseX=rand(fishM, WORLD_W-fishM);
    items.push({ type:'fish', taken:false, bob:rand(0,Math.PI*2), dir:1,
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(rnd()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX) });
  }
  return items;
}

// ---- register every configured level ----
(function registerConfiguredLevels(){
  const list = (typeof LEVELS_DATA!=='undefined' && Array.isArray(LEVELS_DATA)) ? LEVELS_DATA : [];
  list.forEach(cfg=>{
    const qt = QUEST_TYPES[cfg.quest && cfg.quest.type] || QUEST_TYPES['cheer-all'];
    Levels.register({
      id: cfg.id,
      name: cfg.name,
      seed: cfg.seed,
      size: cfg.size,
      spawn: cfg.spawn,
      next: cfg.next || null,
      theme: cfg.theme,
      autoPortal: !!cfg.autoPortal,   // spawn the exit portal on entry (boss test level)
      cold: !!cfg.cold,               // drives the warmth-survival meter (warmth.js)
      dark: !!cfg.dark,               // drives the darkness/light overlay (darkness.js)
      unlockUltimate: !!cfg.unlockUltimate,   // clearing this level awakens the R Ultimate

      generate(){
        // 1) terrain (+ optional decoration) — procedural, from the named code hooks.
        const terrain = TERRAIN[cfg.terrain];
        if(terrain) terrain(); else console.warn('Level '+cfg.id+': unknown terrain '+cfg.terrain);
        if(cfg.augment && AUGMENTS[cfg.augment]) AUGMENTS[cfg.augment]();

        // 2) collectibles
        collectibles = buildCollectibles(cfg.collectibles);

        // 3) friends (lonely animals to cheer)
        friends = (cfg.friends||[]).map(f=>{
          const p=_resolvePos(f) || { x:0, y:0 };
          return { name:f.name, x:p.x, y:p.y, need:f.need, given:0, cheered:false,
                   kind:f.kind, msg:f.msg };
        });

        // 4) actors — npcs (shops / quest-givers), enemies, critters
        Entities.clear();
        // Arm the `defeat` objective only when this level actually fields enemies; remember
        // the `fetch-from` target item for its describe/isComplete.
        _defeatArmed = (cfg.quest && cfg.quest.type==='defeat') && (cfg.enemies||[]).length>0;
        _fetchItem   = (cfg.quest && cfg.quest.type==='fetch-from') ? (cfg.quest.item||'mooncap') : null;
        _trapArmed   = (cfg.quest && cfg.quest.type==='trap') && (cfg.enemies||[]).some(en=>en.kind==='badgerbaron');
        (cfg.npcs||[]).forEach(n=>{
          const p=_resolvePos(n); if(!p) return;
          const e={ x:p.x, y:p.y, name:n.name, greeting:n.greeting };
          if(n.look) e.look=n.look;
          if(n.wares) e.wares=n.wares;
          if(n.quest) e.quest=JSON.parse(JSON.stringify(n.quest));   // fresh per build (state mutates)
          Entities.spawn('npc', e);
        });
        (cfg.enemies||[]).forEach(en=>{
          const p=_resolvePos(en); if(!p) return;
          const e={ x:p.x, y:p.y };
          for(const k in en){ if(k!=='kind'&&k!=='x'&&k!=='y'&&k!=='fx'&&k!=='fy'&&k!=='onWater') e[k]=en[k]; }
          Entities.spawn(en.kind||'enemy', e);
        });
        (cfg.critters||[]).forEach(c=>{
          const p=_resolvePos(c); if(!p) return;
          Entities.spawn('critter', { species:c.species, x:p.x, y:p.y });
        });
        (cfg.firepits||[]).forEach(f=>{
          const p=_resolvePos(f); if(!p) return;
          Entities.spawn('firepit', { x:p.x, y:p.y, lit:!!f.lit });
        });
        (cfg.pits||[]).forEach(pt=>{
          const p=_resolvePos(pt); if(!p) return;
          if(typeof nudgeOutOfWater==='function') nudgeOutOfWater(p, 30);   // keep the Baron's traps on dry land
          Entities.spawn('pittrap', { x:p.x, y:p.y, state:'armed' });
        });
        (cfg.rockfalls||[]).forEach((rf,i)=>{
          const p=_resolvePos(rf); if(!p) return;
          const vy=v=>(v==null?undefined:(v<=1 ? WORLD_H*v : v));   // fraction or absolute y
          Entities.spawn('rockfall', { x:p.x, _i:i, top:vy(rf.top), bottom:vy(rf.bottom),
            speed:rf.speed, period:rf.period, warn:rf.warn, dmg:rf.dmg, startDelay:rf.startDelay });
        });
        (cfg.lanterns||[]).forEach(l=>{
          const p=_resolvePos(l); if(!p) return;
          Entities.spawn('lanternpost', { x:p.x, y:p.y });
        });
        (cfg.shrinelanterns||[]).forEach(l=>{
          const p=_resolvePos(l); if(!p) return;
          Entities.spawn('shrinelantern', { x:p.x, y:p.y, lit:!!l.lit });
        });
        (cfg.sporeclouds||[]).forEach(s=>{
          const p=_resolvePos(s); if(!p) return;
          Entities.spawn('sporecloud', { x:p.x, y:p.y, r:s.r||34, life:-1 });   // permanent choke points
        });
        if(cfg.mooncap){
          const p=_resolvePos(cfg.mooncap); if(p) Entities.spawn('mooncap', { x:p.x, y:p.y });
        }

        // 5) buried treasure — rarity list from the config
        if(typeof Chests!=='undefined') Chests.spawnForLevel(cfg.id, cfg.chests);

        // 6) auto-portal (boss test level): drop the exit portal right on entry so you can
        // walk straight through — no win condition needed. Works on every entry path
        // (play-through, save-load, dev jump). On a revisit the saved portal is restored
        // over this one, so there's never a duplicate.
        if(cfg.autoPortal){
          const env=(typeof Campaign!=='undefined') ? Campaign.envOfLevel(cfg.id) : null;
          const nextLvl=cfg.next && Levels.get(cfg.next);
          const nextEnv=(nextLvl && typeof Campaign!=='undefined') ? Campaign.envOfLevel(nextLvl.id) : null;
          const spawn=cfg.spawn || { x:200, y:200 };
          const spot={ x:clamp(spawn.x+110, 80, WORLD_W-80), y:clamp(spawn.y+40, 80, WORLD_H-80) };
          if(typeof nudgeOutOfWater==='function') nudgeOutOfWater(spot, 40);
          Entities.spawn('portal', { x:spot.x, y:spot.y, levelId:cfg.id,
            colA:(env&&env.color)||'#9B7EC8', colB:'#FFD93D', icon:(nextEnv&&nextEnv.icon)||'✨' });
        }
      },

      quest: {
        id: 'quest-'+cfg.id,
        type: (cfg.quest && cfg.quest.type) || 'cheer-all',
        label: (cfg.quest && cfg.quest.label) || 'Cheer up every friend',
        describe(){ return qt.describe(); },
        isComplete(){ return qt.isComplete(); },
      },
    });
  });
})();
