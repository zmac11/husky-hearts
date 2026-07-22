// ====================== ITEMS (data) ======================
// Definitions for everything that can live in a player's inventory: collectibles,
// consumables, and wearables. `type` groups items; `value` is a coin/trade worth for
// the shop seam. The collectible ids here match the collectible `type` strings produced
// by makeCollectibles() (world.js), so a pickup maps straight in.
//
// type flavours the item and drives UI/behaviour:
//   'treat'/'toy'/'food'   — plain collectibles (delivery currency lives in p.treats)
//   'consumable'           — usable from the hotbar (number keys). `heal` (hp) restores
//                            health when used; consumed on use.
//   'wearable'             — equippable cosmetic. `slot` is which paper-doll slot it fills
//                            (head/face/neck/body/back); `render` keys into Wearables'
//                            draw table so it shows on the dog.

const ITEMS_DATA = {
  // collectibles found in the world
  bone:   { name:'Bone',   icon:'🦴', type:'treat', value:1 },
  heart:  { name:'Heart',  icon:'💛', type:'treat', value:1 },
  ball:   { name:'Ball',   icon:'🎾', type:'toy',   value:2 },
  flower: { name:'Flower', icon:'🌸', type:'treat', value:1 },
  fish:   { name:'Fish',   icon:'🐟', type:'food',  value:2 },

  // consumables — usable from the hotbar
  biscuit:{ name:'Biscuit', icon:'🍪', type:'consumable', value:3, heal:4 },  // heals 2 hearts
  ribbon: { name:'Ribbon',  icon:'🎀', type:'wearable',   value:5, slot:'head', render:'ribbon' },

  // wearables — sold by Fenwick the Tailor; shown on the dog when equipped.
  // `mods` are passive stat bonuses summed in Skills.apply while worn:
  //   maxHp (+hp), speed (+px/frame), scentR (+px), noiseMul (× — negative = quieter).
  // `abilityMods` tweak a specific ability's numbers: { <skillNode>: { field:delta } }
  //   (e.g. cannon capacity +1, stormfang cdMs −5000). Read by the ability modules.
  tophat:  { name:'Top Hat',    icon:'🎩', type:'wearable', value:8,  slot:'head', render:'tophat',  mods:{ smartsPrice:-0.05 } },
  ballcap: { name:'Ball Cap',   icon:'🧢', type:'wearable', value:6,  slot:'head', render:'ballcap', abilityMods:{ cannon:{ capacity:1 } } },
  shades:  { name:'Cool Shades',icon:'🕶️', type:'wearable', value:7,  slot:'face', render:'shades',  mods:{ noiseMul:-0.10 } },
  scarf:   { name:'Cozy Scarf', icon:'🧣', type:'wearable', value:6,  slot:'neck', render:'scarf',   mods:{ maxHp:2 } },
  raincoat:{ name:'Rain Coat',  icon:'🧥', type:'wearable', value:9,  slot:'body', render:'raincoat',mods:{ maxHp:4 } },
  cape:    { name:'Hero Cape',  icon:'🦸', type:'wearable', value:10, slot:'back', render:'cape',    mods:{ maxHp:2, speed:0.06 } },

  // rocky-mountain wearables — sold by Rusk the Ranger on level 2
  beanie:     { name:'Wool Beanie',   icon:'🧶', type:'wearable',   value:6, slot:'head', render:'beanie',      mods:{ maxHp:2 } },
  snowgoggles:{ name:'Snow Goggles',  icon:'🥽', type:'wearable',   value:8, slot:'face', render:'snowgoggles', mods:{ scentR:30 } },
  trailmix:   { name:'Trail Mix',     icon:'🥜', type:'consumable', value:4, heal:6 },  // heals 3 hearts

  // treasure-chest loop (data/chests.js): keys open silver chests; the rest is loot
  key:      { name:'Chest Key',   icon:'🗝️', type:'tool',       value:8 },
  feast:    { name:'Feast',       icon:'🍖', type:'consumable', value:7, heal:12 },  // heals 6 hearts
  goldbone: { name:'Golden Bone', icon:'🏅', type:'treat',      value:5 },
  // golden-chest exclusive — a royal set piece with real power
  crown:    { name:'Royal Crown', icon:'👑', type:'wearable',   value:15, slot:'head', render:'crown',
              mods:{ maxHp:4, speed:0.06 }, abilityMods:{ stormfang:{ cdMs:-5000 }, monster:{ dmg:1 } } },
};

// --- tooltip helpers: turn an item's numbers into readable effect lines ---
const _TYPE_LABEL = { treat:'Treat', toy:'Toy', food:'Food', consumable:'Consumable', wearable:'Wearable', tool:'Tool' };

// Friendly name for an ability skill-node (data/skills.js SKILL_NODES), for abilityMods.
function _abilityNodeName(node){
  if(typeof SKILL_NODES!=='undefined'){
    for(const breed in SKILL_NODES.byBreed){
      const n=SKILL_NODES.byBreed[breed].find(x=>x.id===node);
      if(n) return n.name;
    }
  }
  return node;
}
function _abilityModLabel(field, v){
  if(field==='capacity') return `+${v} magazine`;
  if(field==='cdMs')     return `${v<0?'−':'+'}${Math.abs(v/1000)}s cooldown`;
  if(field==='dmg')      return `+${v} damage`;
  if(field==='range')    return `+${v} range`;
  return `${field} ${v>0?'+':''}${v}`;
}
function _statLine(k, v){
  switch(k){
    case 'maxHp':       return `+${v} max health (${v/2>0?'+':''}${v/2} heart${Math.abs(v/2)!==1?'s':''})`;
    case 'speed':       return `${v>0?'+':''}${v} speed`;
    case 'scentR':      return `+${v} treasure scent range`;
    case 'noiseMul':    return `${Math.round(v*100)}% enemy detection`;   // negative = sneakier
    case 'smartsPrice': return `${Math.round(v*100)}% shop prices`;       // negative = cheaper
    default:            return `${k} ${v>0?'+':''}${v}`;
  }
}

const Items = {
  all: ITEMS_DATA,
  get(id){ return ITEMS_DATA[id] || null; },
  list(){ return Object.keys(ITEMS_DATA).map(id => Object.assign({ id }, ITEMS_DATA[id])); },

  // Structured description for tooltips (inventory / shop / quest). Returns null for
  // unknown ids. `effects` are {text,bad} lines; `flavor` is grey italic text.
  describe(id){
    const d=ITEMS_DATA[id]; if(!d) return null;
    const effects=[], flavor=[];
    if(d.heal) effects.push({ text:`Restores ${d.heal} HP (${d.heal/2} heart${d.heal/2!==1?'s':''})` });
    if(d.slot) flavor.push(`Worn: ${d.slot}`);
    if(d.mods) for(const k in d.mods){ const v=d.mods[k]; if(!v) continue;
      const bad=(k==='noiseMul' && v>0) || (k==='smartsPrice' && v>0);   // louder / pricier
      effects.push({ text:_statLine(k, v), bad });
    }
    if(d.abilityMods) for(const node in d.abilityMods){
      const am=d.abilityMods[node];
      for(const f in am) effects.push({ text:`${_abilityNodeName(node)}: ${_abilityModLabel(f, am[f])}` });
    }
    if(!effects.length && !flavor.length){
      if(d.type==='treat' || d.type==='food' || d.type==='toy') flavor.push('A gift lonely friends love');
      else if(id==='key') flavor.push('Opens a locked 🩶 Silver chest');
    }
    return { id, name:d.name, icon:d.icon, typeLabel:_TYPE_LABEL[d.type]||'Item', effects, flavor, value:d.value||0 };
  },
};
