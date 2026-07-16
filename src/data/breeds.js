// ====================== BREEDS (data) ======================
// Single source of truth for breed identity + stats + which active abilities the breed
// carries. charselect.js builds its cards (and the 1–5 stat bars panel) from
// Breeds.list(); makePlayer() (world.js) reads hp/stats/abilities. This is the seam for
// "each dog has unique + passive abilities and different stats": tune the bars here,
// and add an entry in abilities/ for a new active ability, then point one of the
// breed's ability slots at it.
//
// bars — the CANONICAL 1–5 ratings shown on the character-select screen. All real
//   gameplay numbers are DERIVED from them (see _derive below), so the display can
//   never drift from what the game actually does:
//     health — hp = 14 + 2×bar            (1 heart = 2 hp; bar 5 → 24 hp)
//     speed  — walk speed = 2.55 + 0.05×bar (px/frame at 60 fps)
//     swim   — swim multiplier = 0.35 + 0.05×bar (applied to speed in water)
//     noise  — noiseMul = 0.7 + 0.15×(bar−1): scales every enemy's OWN detection
//              range for this dog (bar 5 → heard from 1.3× as far; bar 1 → 0.7×).
//              Howling multiplies this further (see Entities.noiseFactor).
//     smarts — priceMul = 1.15 − 0.05×bar (shop prices) and
//              questBonus = 0.05×(bar−3) (extra treats from quest rewards)
// passive — human-readable description of the dog's standout trait (shown in UI).
// abilities — two active-ability slots, [slot1, slot2], each a key into the Abilities
//   registry (null = empty slot). Slot 1 fires on the "Ability 1" key (default Q),
//   slot 2 on "Ability 2" (default E). Each dog can carry a different pair.
// color — the breed's signature colour (HUD dot / minimap marker); the dogs draw
//   their real coat colours in-sprite, so this is just their accent hue.

const BREEDS_DATA = {
  dinno:     { name:'Dinno',     desc:'The real husky boss',  emoji:'❤️', color:'#C07840',
               bars:{ health:5, speed:5, swim:4, noise:3, smarts:3 },
               passive:'Alpha — tough and a step faster than the pack', abilities:[null,null] },
  lolla:     { name:'Lolla',     desc:'Fluff queen supreme',  emoji:'🌟', color:'#6FA8C9',
               bars:{ health:3, speed:2, swim:3, noise:5, smarts:5 },
               passive:'Clever & loud — haggles well, but enemies hear her coming', abilities:['ballCannon',null] },
  tapka:     { name:'Ťapka',     desc:'Tiny Prague Ratter',   emoji:'🐭', color:'#B5854F',
               bars:{ health:1, speed:4, swim:2, noise:1, smarts:4 },
               passive:'Featherweight — frail but swift, and almost silent', abilities:[null,null] },
};

// Display order for the character-select screen.
const BREED_ORDER = ['dinno','lolla','tapka'];

// Stat metadata for the character-select bars, in display order.
const BREED_STATS = [
  { key:'health', label:'Health',   icon:'❤️', hint:'how many hearts you start with' },
  { key:'speed',  label:'Speed',    icon:'⚡', hint:'how fast you run' },
  { key:'swim',   label:'Swimming', icon:'🏊', hint:'how well you move in water' },
  { key:'noise',  label:'Noise',    icon:'🔊', hint:'how far enemies hear you — quiet dogs sneak past' },
  { key:'smarts', label:'Smarts',   icon:'🧠', hint:'better shop prices & bigger quest rewards' },
];

// Turn the 1–5 bars into the real gameplay numbers (done once, at load).
function _derive(b){
  const bars=b.bars;
  b.hp   = 14 + 2*bars.health;
  b.stats = {
    speed:      +(2.55 + 0.05*bars.speed).toFixed(2),
    swim:       +(0.35 + 0.05*bars.swim).toFixed(2),
    noiseMul:   +(0.7  + 0.15*(bars.noise-1)).toFixed(2),
    priceMul:   +(1.15 - 0.05*bars.smarts).toFixed(2),
    questBonus: +(0.05*(bars.smarts-3)).toFixed(2),
  };
  return b;
}
Object.values(BREEDS_DATA).forEach(_derive);

const Breeds = {
  all: BREEDS_DATA,
  STATS: BREED_STATS,
  get(id){ return BREEDS_DATA[id] || BREEDS_DATA.dinno; },
  // {id, name, desc, emoji, bars, stats, passive, abilities} for each breed, in display order.
  list(){ return BREED_ORDER.map(id => Object.assign({ id }, BREEDS_DATA[id])); },
};
