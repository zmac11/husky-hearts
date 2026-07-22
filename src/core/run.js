// ====================== RUN (seed) ======================
// A "run" is one playthrough, identified by a single SEED. Every level's layout is
// derived from it (LevelManager.load → RNG.beginGen(Run.levelSeed(id))), so the same
// seed always produces the same meadow, the same pond shapes, the same buried chests.
//
// The seed is generated when a new game starts, or typed by the player on the character
// select screen (charselect.js). It rides along in saves so a loaded game rebuilds the
// same worlds — that's what lets a save store only the *dynamic* state of each level
// (level-state.js) and regenerate the terrain instead of snapshotting it.
//
// Typed seeds may be anything: "12345" is used as the number, "husky" is hashed. What the
// player typed is kept verbatim in `seedText` so it can be shown back and copied.

const Run = {
  seed: 0,        // uint32 actually used for generation
  seedText: '',   // what the player typed / the decimal seed for a random run

  // Start a brand-new random run.
  newRandom(){
    this.seed = (Math.random()*4294967296)>>>0;
    this.seedText = String(this.seed);
    return this.seed;
  },

  // Apply a player-typed seed. Blank → random. Pure digits are used as-is (so sharing
  // "1234567" round-trips), anything else is hashed to a uint32.
  setFromText(str){
    const t = (str==null ? '' : String(str)).trim();
    if(!t) return this.newRandom();
    this.seedText = t;
    this.seed = /^\d+$/.test(t) ? (Number(t)>>>0) : RNG.hash32(t);
    return this.seed;
  },

  // Restore an exact seed (loading a save).
  set(seed, text){
    this.seed = (seed>>>0) || 0;
    this.seedText = text || String(this.seed);
    return this.seed;
  },

  // Per-level stream seed. `salt` is the level's own `seed:` field (levels/*.js), so two
  // levels of the same run never share a layout even if their generators match.
  levelSeed(levelId, salt){
    return RNG.mix(this.seed, RNG.hash32(levelId) ^ ((salt||0)>>>0));
  },

  // Short display string for menus ('husky' or '2841991233').
  label(){ return this.seedText || String(this.seed); },
};

// A seed exists from the very first frame — main.js builds a level before any menu runs.
Run.newRandom();
