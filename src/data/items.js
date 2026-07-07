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

  // wearables — sold by Fenwick the Tailor; shown on the dog when equipped
  tophat:  { name:'Top Hat',    icon:'🎩', type:'wearable', value:8,  slot:'head', render:'tophat' },
  ballcap: { name:'Ball Cap',   icon:'🧢', type:'wearable', value:6,  slot:'head', render:'ballcap' },
  shades:  { name:'Cool Shades',icon:'🕶️', type:'wearable', value:7,  slot:'face', render:'shades' },
  scarf:   { name:'Cozy Scarf', icon:'🧣', type:'wearable', value:6,  slot:'neck', render:'scarf' },
  raincoat:{ name:'Rain Coat',  icon:'🧥', type:'wearable', value:9,  slot:'body', render:'raincoat' },
  cape:    { name:'Hero Cape',  icon:'🦸', type:'wearable', value:10, slot:'back', render:'cape' },

  // rocky-mountain wearables — sold by Rusk the Ranger on level 2
  beanie:     { name:'Wool Beanie',   icon:'🧶', type:'wearable',   value:6, slot:'head', render:'beanie' },
  snowgoggles:{ name:'Snow Goggles',  icon:'🥽', type:'wearable',   value:8, slot:'face', render:'snowgoggles' },
  trailmix:   { name:'Trail Mix',     icon:'🥜', type:'consumable', value:4, heal:6 },  // heals 3 hearts
};

const Items = {
  all: ITEMS_DATA,
  get(id){ return ITEMS_DATA[id] || null; },
  list(){ return Object.keys(ITEMS_DATA).map(id => Object.assign({ id }, ITEMS_DATA[id])); },
};
