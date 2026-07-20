// ====================== CHESTS (data) ======================
// The treasure-chest loop: chests are buried invisibly around each level. A dog close
// enough smells them (sniff wisps, scent radius = stats.scentR from the smarts bar),
// digs them up on the action key (dig speed × stats.digMul — Ťapka is fastest), then
// opens them for loot. Silver chests are locked and consume a 🗝️ Chest Key. A golden
// chest (never buried) spawns beside the exit portal when a biome's last level is
// cleared — later this hook moves to "boss defeated" with no chest changes.
//
// Loot entries: {treats:n} spills n bone/heart pickups; {item:id, qty?} spills the item.
// Tables are rolled fresh on open (Math.random, like the rest of the game's spawning).

const CHEST_RARITIES = {
  wooden: {
    name:'Wooden Chest', locked:false, digMs:1000,
    base:'#8B6340', band:'#6B4A28', lid:'#A07040', glow:null,
    loot(p){
      const L=[{treats:3+Math.floor(Math.random()*4)}];             // 3–6
      if(Math.random()<0.40) L.push({item:'biscuit'});
      if(Math.random()<0.10) L.push({item:'key'});
      return L;
    },
  },
  iron: {
    name:'Iron Chest', locked:false, digMs:1400,
    base:'#9AA0AA', band:'#6A6E78', lid:'#B4BAC4', glow:null,
    loot(p){
      const L=[{treats:6+Math.floor(Math.random()*5)}];             // 6–10
      L.push({item:Math.random()<0.5?'biscuit':'trailmix'});
      if(Math.random()<0.25) L.push({item:'key'});
      if(Math.random()<0.15) L.push({item:['ribbon','ballcap','scarf'][Math.floor(Math.random()*3)]});
      return L;
    },
  },
  silver: {
    name:'Silver Chest', locked:true, digMs:1800,
    base:'#D8DCE4', band:'#AAB2C0', lid:'#EAEDF2', glow:'rgba(220,228,240,0.35)',
    loot(p){
      const L=[{treats:10+Math.floor(Math.random()*7)}];            // 10–16
      L.push({item:'feast'});
      if(Math.random()<0.60) L.push({item:['shades','tophat','raincoat','beanie','snowgoggles'][Math.floor(Math.random()*5)]});
      if(Math.random()<0.30) L.push({item:'goldbone'});
      if(Math.random()<0.20) L.push({item:'key'});
      return L;
    },
  },
  golden: {
    name:'Golden Chest', locked:false, digMs:0,
    base:'#F2C94C', band:'#D9A82E', lid:'#F8DC74', glow:'rgba(255,216,80,0.45)',
    loot(p){
      const L=[{treats:20}];
      // the crown is the trophy — once you own/wear one, later goldens pay out in gold bones
      const hasCrown=p && ((typeof Inventory!=='undefined' && Inventory.count(p,'crown')>0) ||
                           (p.equipment && p.equipment.head==='crown'));
      L.push(hasCrown ? {item:'goldbone', qty:2} : {item:'crown'});
      L.push({item:'feast', qty:2});
      L.push({item:'goldbone'});
      L.push({item:'key'});
      return L;
    },
  },
};

// Which rarities are buried in each level (order doesn't matter).
const CHEST_SPAWNS = {
  'meadow':   ['wooden','wooden'],
  'meadow-2': ['wooden','wooden','iron'],
  'meadow-3': ['wooden','wooden','iron','silver'],
  'rocky':    ['wooden','iron','iron','silver'],
};

const Chests = {
  RARITIES: CHEST_RARITIES,
  def(rarity){ return CHEST_RARITIES[rarity] || CHEST_RARITIES.wooden; },

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

  // Called from each level's generate() after terrain + entities exist.
  spawnForLevel(levelId){
    const plan=CHEST_SPAWNS[levelId]; if(!plan) return;
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
