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

// 'none' — no win condition. Used by the first-boss test level, which just walks you to an
// auto-spawned portal (level-manager _armExit) with no reward flow (checkWin never fires).
QUEST_TYPES['none'] = {
  describe(){ return 'Walk to the portal'; },
  isComplete(){ return false; },
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
