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
const _ENEMY_KINDS = ['enemy','wolf','packleader','shadowlurker','toadstool','alphawolf','grizzly',
  'crab','jellyfish','hermitcrab','crow','scarecrow','scarecrowking',
  'scarab','sentinel','sandserpent','frostwolf','icesprite','iceyeti',
  'skysprite','stormeagle'];
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
let _fetchItem = null, _fetchCount = 1;
QUEST_TYPES['fetch-from'] = {
  describe(){
    if(!_fetchItem) return 'Find the item';
    const d=(typeof Items!=='undefined') ? Items.get(_fetchItem) : null;
    const have=(typeof p1!=='undefined' && typeof Inventory!=='undefined') ? Inventory.count(p1,_fetchItem) : 0;
    if(_fetchCount>1) return have>=_fetchCount ? `${d?d.icon:''} All ${_fetchCount} gathered!` : `${d?d.icon:''} ${Math.min(have,_fetchCount)}/${_fetchCount} — dive for ${d?d.name:_fetchItem}`;
    return have>0 ? `${d?d.icon:''} Retrieved!` : `Find the ${d?d.name:_fetchItem}`;
  },
  isComplete(){
    if(!_fetchItem) return false;
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    return players.some(p=>Inventory.count(p,_fetchItem)>=_fetchCount);
  },
};

// 'deliver' — the Palm Boardwalk soft-timer loop: carry N fragile orders to their stalls
// before they spoil. All the state + logic lives in the Delivery manager (entities/delivery.js);
// this just points the level's win/describe at it.
QUEST_TYPES['deliver'] = {
  describe(){ return (typeof Delivery!=='undefined') ? Delivery.describe() : 'Run the boardwalk orders'; },
  isComplete(){ return (typeof Delivery!=='undefined') && Delivery.complete(); },
};

// 'gather' — collect N ingredients (any of a set) into the bag. Amber Orchard's Pumpkin Patch.
let _gatherSpec = null;
function _gatherHave(s){
  if(!s || typeof Inventory==='undefined' || typeof p1==='undefined') return 0;
  return (s.items||[s.item]).reduce((t,it)=>t+Inventory.count(p1, it), 0);
}
QUEST_TYPES['gather'] = {
  describe(){ const s=_gatherSpec; if(!s) return 'Gather ingredients'; return `Gathered ${Math.min(_gatherHave(s),s.count)}/${s.count}`; },
  isComplete(){ const s=_gatherSpec; return !!s && _gatherHave(s)>=s.count; },
};

// 'cook' — cook a dish at a cookpot (cooking.js). May require gathering first; the pot cooks
// the best dish you can afford.
let _cookNeed = 1;
QUEST_TYPES['cook'] = {
  describe(){ return (typeof Cooking!=='undefined') ? `Dishes cooked ${Math.min(Cooking.cooked,_cookNeed)}/${_cookNeed}` : 'Cook a dish'; },
  isComplete(){ return (typeof Cooking!=='undefined') && Cooking.cooked>=_cookNeed; },
};

// 'levers' — pull every lever to open a gate (Haybale Maze). Same "activate all" shape as
// kindle/ritual, on `lever` entities.
QUEST_TYPES['levers'] = {
  _lv(){ const es=(typeof entities!=='undefined'&&entities)?entities:[]; const all=es.filter(e=>e.kind==='lever'); return {on:all.filter(e=>e.on).length, total:all.length}; },
  describe(){ const l=this._lv(); return `Levers pulled ${l.on}/${l.total}`; },
  isComplete(){ const l=this._lv(); return l.total>0 && l.on>=l.total; },
};

// 'timed' — a production minigame: press the cider barrels N times to keep the mill running
// (Cider Mill). Cozy — no failure, just keep pressing. Counts total presses across all presses.
let _timedNeed = 6;
QUEST_TYPES['timed'] = {
  _pressed(){ const es=(typeof entities!=='undefined'&&entities)?entities:[]; return es.filter(e=>e.kind==='ciderpress').reduce((s,e)=>s+(e.presses||0),0); },
  describe(){ return `Barrels pressed ${Math.min(this._pressed(),_timedNeed)}/${_timedNeed}`; },
  isComplete(){ return _timedNeed>0 && this._pressed()>=_timedNeed; },
};

// 'solve' — the Ancient Ruins puzzle: step on every pressure plate to light its glyph and
// unseal the mechanism (glyphdoors open when all plates are held). Same "activate all" shape.
QUEST_TYPES['solve'] = {
  _p(){ const es=(typeof entities!=='undefined'&&entities)?entities:[]; const all=es.filter(e=>e.kind==='pressureplate'||e.kind==='beamsensor'); return {on:all.filter(e=>e.on).length, total:all.length}; },
  describe(){ const p=this._p(); return `Glyphs lit ${p.on}/${p.total}`; },
  isComplete(){ const p=this._p(); return p.total>0 && p.on>=p.total; },
};

// 'reach' — glide to the summit goal pad (Cloud Kingdom). Completed by a `reachgoal` entity.
QUEST_TYPES['reach'] = {
  _goal(){ const es=(typeof entities!=='undefined'&&entities)?entities:[]; return es.find(e=>e.kind==='reachgoal')||null; },
  describe(){ const g=this._goal(); return g && g.reached ? 'Summit reached!' : 'Glide to the summit ⭐'; },
  isComplete(){ const g=this._goal(); return !!g && g.reached; },
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
      tide: !!cfg.tide,               // drives the Seashell Cove tide cycle (tide.js)
      heat: !!cfg.heat,               // drives the Golden Dunes survival meter (survival.js)
      sandstorm: !!cfg.sandstorm,     // drives the Golden Dunes sandstorm weather (weather.js)
      blizzard: !!cfg.blizzard,       // drives the Frostfang Tundra blizzard weather (weather.js)
      sky: !!cfg.sky,                 // drives Cloud Kingdom gliding / soft-reset falls (sky.js)
      credits: !!cfg.credits,         // clearing this level rolls the finale credits (credits.js)
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
        _fetchCount  = (cfg.quest && cfg.quest.type==='fetch-from') ? (cfg.quest.count||1) : 1;
        _trapArmed   = (cfg.quest && cfg.quest.type==='trap') && (cfg.enemies||[]).some(en=>en.kind==='badgerbaron');
        // Boardwalk delivery loop: arm the manager for a `deliver` level, stand it down elsewhere.
        if(typeof Delivery!=='undefined'){
          if(cfg.quest && cfg.quest.type==='deliver') Delivery.setup(cfg.quest); else Delivery.disable();
        }
        // Orchard objectives: remember the gather/cook/timed targets for their describe/isComplete.
        _gatherSpec = (cfg.quest && cfg.quest.type==='gather')
          ? { items:cfg.quest.items||[cfg.quest.item||'pumpkin'], count:cfg.quest.count||6 } : null;
        _cookNeed   = (cfg.quest && cfg.quest.type==='cook')  ? (cfg.quest.count||1) : 1;
        _timedNeed  = (cfg.quest && cfg.quest.type==='timed') ? (cfg.quest.count||6) : 6;
        (cfg.npcs||[]).forEach(n=>{
          const p=_resolvePos(n); if(!p) return;
          const e={ x:p.x, y:p.y, name:n.name, greeting:n.greeting };
          if(n.look) e.look=n.look;
          if(n.wares) e.wares=n.wares;
          if(n.opensBestiary) e.opensBestiary=true;   // the Keeper opens the bestiary from dialog
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
        // Interactables must sit on dry land so you can always reach them (procedural ponds
        // can land on a fixed fx/fy). Nudge before spawning.
        const _dryPos=(spec)=>{ const p=_resolvePos(spec); if(p && typeof nudgeOutOfWater==='function') nudgeOutOfWater(p, 24); return p; };
        // Boardwalk delivery stalls (source + destinations for the `deliver` loop).
        (cfg.stalls||[]).forEach(s=>{
          const p=_dryPos(s); if(!p) return;
          Entities.spawn('deliverystall', { x:p.x, y:p.y, role:s.role||'dest', name:s.name, hue:s.hue });
        });
        // Cove pickups: shells (secondary currency) + pearls (dive quest), spawned as
        // collectibles so tryCollect banks them correctly. `deep:true` shells/pearls sit in
        // dive basins; low-tide shells nestle where the tide drains.
        const _ico=(id)=>{ const d=(typeof Items!=='undefined')?Items.get(id):null; return d?d.icon:'❓'; };
        (cfg.shells||[]).forEach(s=>{
          const p=_resolvePos(s); if(!p) return;
          collectibles.push({ x:p.x, y:p.y, type:'shell', qty:s.qty||1, taken:false, bob:rand(0,Math.PI*2), icon:_ico('shell') });
        });
        (cfg.pearls||[]).forEach(pl=>{
          const p=_resolvePos(pl); if(!p) return;
          collectibles.push({ x:p.x, y:p.y, type:'pearl', qty:1, taken:false, bob:rand(0,Math.PI*2), icon:_ico('pearl') });
        });
        // Orchard harvest nodes (ingredients as collectibles), cookpots, levers, cider presses.
        (cfg.harvest||[]).forEach(h=>{
          const p=_resolvePos(h); if(!p) return;
          collectibles.push({ x:p.x, y:p.y, type:h.item||'pumpkin', qty:h.qty||1, taken:false, bob:rand(0,Math.PI*2), icon:_ico(h.item||'pumpkin') });
        });
        (cfg.cookpots||[]).forEach(cp=>{ const p=_dryPos(cp); if(p) Entities.spawn('cookpot', { x:p.x, y:p.y }); });
        (cfg.levers||[]).forEach(lv=>{ const p=_dryPos(lv); if(p) Entities.spawn('lever', { x:p.x, y:p.y, on:!!lv.on }); });
        (cfg.presses||[]).forEach(pr=>{ const p=_dryPos(pr); if(p) Entities.spawn('ciderpress', { x:p.x, y:p.y }); });
        // Golden Dunes puzzle kit + hazards.
        (cfg.plates||[]).forEach(pl=>{ const p=_resolvePos(pl); if(p) Entities.spawn('pressureplate', { x:p.x, y:p.y, id:pl.id }); });
        (cfg.doors||[]).forEach(dr=>{ const p=_resolvePos(dr); if(p) Entities.spawn('glyphdoor', { x:p.x, y:p.y, horizontal:!!dr.horizontal, span:dr.span||60 }); });
        (cfg.traps||[]).forEach(tr=>{ const p=_resolvePos(tr); if(p) Entities.spawn('trappedtile', { x:p.x, y:p.y, period:tr.period, dmg:tr.dmg }); });
        (cfg.quicksands||[]).forEach(qs=>{ const p=_resolvePos(qs); if(p) Entities.spawn('quicksand', { x:p.x, y:p.y, r:qs.r||60 }); });
        // Light-beam puzzle: emitter(s), rotatable mirrors, and beam sensors (count toward `solve`).
        (cfg.emitters||[]).forEach(em=>{ const p=_resolvePos(em); if(p) Entities.spawn('beamemitter', { x:p.x, y:p.y, dir:em.dir||'right' }); });
        (cfg.mirrors||[]).forEach(mi=>{ const p=_resolvePos(mi); if(p) Entities.spawn('mirror', { x:p.x, y:p.y, orient:mi.orient||'/' }); });
        (cfg.sensors||[]).forEach(se=>{ const p=_resolvePos(se); if(p) Entities.spawn('beamsensor', { x:p.x, y:p.y }); });
        // Frostfang Tundra thin-ice floors (crack on linger).
        (cfg.thinice||[]).forEach(ti=>{ const p=_resolvePos(ti); if(p) Entities.spawn('thinice', { x:p.x, y:p.y, w:ti.w||60, h:ti.h||44 }); });
        // Cloud Kingdom sky kit: updrafts, wind zones, and the summit goal pad.
        (cfg.updrafts||[]).forEach(u=>{ const p=_resolvePos(u); if(p) Entities.spawn('updraft', { x:p.x, y:p.y, r:u.r||46, dir:u.dir||'up' }); });
        (cfg.windzones||[]).forEach(w=>{ const p=_resolvePos(w); if(p) Entities.spawn('windzone', { x:p.x, y:p.y, r:w.r||70, dir:w.dir||'right', force:w.force||1.1 }); });
        (cfg.stormbolts||[]).forEach(sb=>{ const p=_resolvePos(sb); if(p) Entities.spawn('stormbolt', { x:p.x, y:p.y, period:sb.period, dmg:sb.dmg, r:sb.r }); });
        if(cfg.goal){ const p=_resolvePos(cfg.goal); if(p) Entities.spawn('reachgoal', { x:p.x, y:p.y }); }

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
