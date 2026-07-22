// ====================== CHESTS (data) ======================
// The treasure-chest loop: chests are buried invisibly around each level. A dog close
// enough smells them (sniff wisps, scent radius = stats.scentR from the smarts bar),
// digs them up on the action key (dig speed × stats.digMul — Ťapka is fastest), then
// opens them for loot. Silver chests are locked and consume a 🗝️ Chest Key. A golden
// chest (never buried) spawns beside the exit portal when a biome's last level is
// cleared — later this hook moves to "boss defeated" with no chest changes.
//
// Rarity definitions (visuals + dig time + loot table) live in src/config/loot.json
// (LOOT_DATA.chests). Loot entries: {treats:n} spills n bone/heart pickups; {item:id,
// qty?} spills the item. Tables are rolled fresh on open via rollLoot() (data/loot.js).

const CHEST_RARITIES = (typeof LOOT_DATA!=='undefined' && LOOT_DATA.chests) ? LOOT_DATA.chests : {};

const Chests = {
  RARITIES: CHEST_RARITIES,
  def(rarity){ return CHEST_RARITIES[rarity] || CHEST_RARITIES.wooden; },

  // Roll a chest's loot. The generic drops come from the config table; golden chests add
  // one bespoke reward: the 👑 Crown the first time, gold bones once you already own/wear
  // one (the crown is a one-per-run trophy — a rule kept in code, flagged by crownReward).
  roll(rarity, p){
    const d=this.def(rarity);
    const loot=rollLoot(d && d.loot, p);
    if(d && d.crownReward){
      const hasCrown = p && ((typeof Inventory!=='undefined' && Inventory.count(p,'crown')>0) ||
                             (p.equipment && p.equipment.head==='crown'));
      loot.unshift(hasCrown ? {item:'goldbone', qty:2} : {item:'crown'});
    }
    return loot;
  },

  // Find a dry, walkable, out-of-the-way burial spot: never in ponds/lakes/rivers
  // (digging underwater is nonsense), clear of colliders (visibility), away from the
  // dog's spawn and from other chests.
  _findSpot(spawn, placed){
    for(let tries=0; tries<80; tries++){
      const x=rand(120, WORLD_W-120), y=rand(120, WORLD_H-120);
      if(isWater(x,y,40)) continue;                                        // dry land only, with margin
      if(colliders.some(c=> x>c.x-30 && x<c.x+c.w+30 && y>c.y-34 && y<c.y+c.h+30)) continue;
      if(spawn && Math.hypot(x-spawn.x,y-spawn.y)<260) continue;           // not right at the start
      if(placed.some(s=>Math.hypot(x-s.x,y-s.y)<140)) continue;            // spread out
      return {x,y};
    }
    return null;   // crowded level — better to skip a chest than bury it badly
  },

  // Called from each level's generate() after terrain + entities exist. `plan` is the
  // level's chest list (rarity ids) from levels.json — passed in by the config builder.
  spawnForLevel(levelId, plan){
    if(!plan || !plan.length) return;
    const spawn=(typeof Levels!=='undefined' && Levels.get(levelId) && Levels.get(levelId).spawn) || {x:200,y:200};
    const placed=[];
    plan.forEach(rarity=>{
      const spot=this._findSpot(spawn, placed);
      if(!spot) return;
      placed.push(spot);
      Entities.spawn('chest', { x:spot.x, y:spot.y, rarity, state:'buried' });
    });
  },
};
