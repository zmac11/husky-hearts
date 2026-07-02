// ====================== BREEDS (data) ======================
// Single source of truth for breed identity + stats + which active ability the breed
// carries. charselect.js builds its cards from Breeds.list(); makePlayer() (world.js)
// reads stats/abilityId. This is the seam for "each dog has unique + passive abilities
// and different stats": tune numbers here, and add an entry in abilities/ for a new
// active ability, then point a breed's abilityId at it.
//
// stats:
//   speed — base walking speed (px/frame). Was hardcoded 2.6 for everyone.
//   swim  — multiplier applied to speed while swimming (was hardcoded 0.5).
// passive — human-readable description of the stat-based perk (shown in UI later).
// abilityId — key into the Abilities registry for an active ability (null = none yet).

const BREEDS_DATA = {
  dinno:     { name:'Dinno',     desc:'The real husky boss',  emoji:'❤️',
               stats:{ speed:2.8, swim:0.55 }, passive:'Alpha — a step faster than the pack', abilityId:null },
  lolla:     { name:'Lolla',     desc:'Fluff queen supreme',  emoji:'🌟',
               stats:{ speed:2.6, swim:0.5  }, passive:'Playful — loves a good game of fetch', abilityId:'ballCannon' },
  husky:     { name:'Husky',     desc:'Energetic & loyal',    emoji:'🐕',
               stats:{ speed:2.7, swim:0.5  }, passive:'Tireless runner',                       abilityId:null },
  shiba:     { name:'Shiba',     desc:'Bold & fox-like',      emoji:'🦊',
               stats:{ speed:2.6, swim:0.5  }, passive:'Sure-footed',                           abilityId:null },
  corgi:     { name:'Corgi',     desc:'Tiny legs, big heart', emoji:'🐾',
               stats:{ speed:2.3, swim:0.45 }, passive:'Short legs — steady but slower',        abilityId:null },
  poodle:    { name:'Poodle',    desc:'Fluffy & fabulous',    emoji:'✨',
               stats:{ speed:2.6, swim:0.75 }, passive:'Natural swimmer — glides through water', abilityId:null },
  dalmatian: { name:'Dalmatian', desc:'Spotty & spirited',    emoji:'⚫',
               stats:{ speed:2.9, swim:0.5  }, passive:'Spirited sprinter',                     abilityId:null },
};

// Display order for the character-select screen.
const BREED_ORDER = ['dinno','lolla','husky','shiba','corgi','poodle','dalmatian'];

const Breeds = {
  all: BREEDS_DATA,
  get(id){ return BREEDS_DATA[id] || BREEDS_DATA.husky; },
  // {id, name, desc, emoji, stats, passive, abilityId} for each breed, in display order.
  list(){ return BREED_ORDER.map(id => Object.assign({ id }, BREEDS_DATA[id])); },
};
