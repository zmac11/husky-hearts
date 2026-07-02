// ====================== RNG ======================
// Seeded, reproducible pseudo-random generator.
//
// `mulberry32` was previously defined inline in world-draw.js for ground texture only.
// It's promoted here so level generation and save/load can seed a whole world
// reproducibly (a saved level regenerates identically from its stored seed).
//
// Existing callers use the bare `mulberry32(seed)` function unchanged. New code
// should prefer the `RNG` facade so there's a single shared, reseedable stream.

function mulberry32(seed){ // tiny deterministic RNG — returns a function producing [0,1)
  return function(){
    seed|=0; seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

const RNG = {
  seed: (Math.random()*1e9)|0,  // default run seed; LevelManager overrides per level
  _fn: null,

  // Reseed the shared stream (e.g. when (re)generating a level, or after loading a save).
  reseed(s){ this.seed = s>>>0; this._fn = mulberry32(this.seed); return this.seed; },

  next(){ if(!this._fn) this._fn = mulberry32(this.seed); return this._fn(); },
  range(a,b){ return a + this.next()*(b-a); },
  int(a,b){ return Math.floor(this.range(a, b+1)); },        // inclusive [a,b]
  pick(arr){ return arr[Math.floor(this.next()*arr.length)]; },
  chance(p){ return this.next() < p; },

  // A fresh independent stream derived from the current seed — handy for a subsystem
  // that needs its own reproducible sequence without disturbing the main stream.
  fork(salt){ return mulberry32((this.seed ^ (salt>>>0)) >>> 0); },
};
