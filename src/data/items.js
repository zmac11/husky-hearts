// ====================== ITEMS (data) ======================
// Item definitions — everything that can live in a player's inventory (collectibles,
// consumables, wearables) — are authored in src/config/items.json and baked into the
// ITEMS_DATA global at build time (build.py). This file is the behaviour around that
// data: lookup + the tooltip/effect-line helpers.
//
// Field reference (for editing items.json):
//   type   groups the item and drives UI/behaviour:
//     'treat'/'toy'/'food'  — plain collectibles (delivery currency lives in p.treats)
//     'consumable'          — usable from the hotbar (number keys); `heal` restores hp
//     'wearable'            — equippable cosmetic; `slot` is the paper-doll slot filled
//                             (head/face/neck/body/back); `render` keys Wearables' draw table
//   value  coin/trade worth for the shop seam
//   mods   passive stat bonuses summed in Skills.apply while worn:
//     maxHp (+hp), speed (+px/frame), scentR (+px), noiseMul (× — negative = quieter),
//     smartsPrice (× shop price — negative = cheaper)
//   abilityMods  tweak a specific ability's numbers: { <skillNode>: { field:delta } }
//     (e.g. cannon capacity +1, stormfang cdMs −5000). Read by the ability modules.
// The collectible ids (bone/heart/ball/flower/fish) match the collectible `type` strings
// produced by the level builder, so a world pickup maps straight in.

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
