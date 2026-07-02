// ====================== ITEMS (data) ======================
// Definitions for everything that can live in a player's inventory: collectibles,
// and (future) shop wares / quest items. `type` groups items; `value` is a coin/trade
// worth for the shop seam. The collectible ids here match the collectible `type`
// strings produced by makeCollectibles() (world.js), so a pickup maps straight in.

const ITEMS_DATA = {
  // collectibles found in the world
  bone:   { name:'Bone',   icon:'🦴', type:'treat', value:1 },
  heart:  { name:'Heart',  icon:'💛', type:'treat', value:1 },
  ball:   { name:'Ball',   icon:'🎾', type:'toy',   value:2 },
  flower: { name:'Flower', icon:'🌸', type:'treat', value:1 },
  fish:   { name:'Fish',   icon:'🐟', type:'food',  value:2 },

  // sample shop / quest items (wired into the shop UI in a later step)
  ribbon: { name:'Ribbon', icon:'🎀', type:'cosmetic', value:5 },
  biscuit:{ name:'Biscuit',icon:'🍪', type:'consumable', value:3 },
};

const Items = {
  all: ITEMS_DATA,
  get(id){ return ITEMS_DATA[id] || null; },
  list(){ return Object.keys(ITEMS_DATA).map(id => Object.assign({ id }, ITEMS_DATA[id])); },
};
