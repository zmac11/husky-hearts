// ====================== SKILLS (data) ======================
// The skill tree: per-dog upgrades for the character itself plus the breed's active
// abilities. Every dog shares the "character" nodes; ability nodes are per breed
// (Lolla's Ball Cannon is the first — Dinno's and Ťapka's are future placeholders).
//
// Player state is plain data (save-friendly): p.skills = { nodeId: level }, plus
// p.skillPoints (reserved — EARNING points is future work; while that's unbuilt the
// tree levels freely and the − button refunds, so tuning can be playtested).
//
// Skills.apply(p) is the single place skill effects become numbers: it recomputes
// p.maxHp / p.speed / p.stats from the breed's base values + current skill levels.
// It must be called after any level change (UI), at makePlayer, and on save-load.

const SKILL_NODES = {
  // ---- character nodes (every dog) ----
  common: [
    { id:'vitality', name:'Vitality',   icon:'💪', max:3, desc:'+2 max health per level' },
    { id:'swift',    name:'Swift Paws', icon:'🐾', max:3, desc:'+0.06 speed per level' },
    { id:'nose',     name:'Keen Nose',  icon:'👃', max:2, desc:'+20 scent radius per level (buried chests)' },
    { id:'soft',     name:'Soft Steps', icon:'🤫', max:2, desc:'−8% noise per level (enemies hear you later)' },
  ],
  // ---- ability nodes (per breed) ----
  byBreed: {
    lolla: [
      { id:'cannon', name:'Ball Cannon', icon:'🎾', max:3, ability:true,
        desc:'Placeable turret (Q) — load 🎾 balls from the hotbar, auto-fires at enemies',
        levels:[
          'L1 · place with Q · 1-ball magazine · range 130 · 2 dmg + knockback',
          'L2 · 3-ball magazine · faster fire',
          'L3 · range 180 · 3 dmg · auto-reloads from your bag while you stand close',
        ] },
      { id:'scream', name:'Piercing Scream', icon:'🔊', max:3, ability:true,
        desc:'Scream (E) — a few seconds of AOE damage + knockback around you',
        levels:[
          'L1 · 2.5s · pulse damage (2) + knockback · 95px · 20s cooldown',
          'L2 · 3s · 115px · 25% chance to frighten enemies each pulse',
          'L3 · 3.5s · 135px · 3 dmg · 45% fear · 18s cooldown',
        ] },
    ],
    dinno: [
      { id:'stormfang', name:'Storm Fang', icon:'⚡', max:3, ability:true,
        desc:'Unleash the inner wolf (Q): storm form with lightning striking nearby enemies',
        levels:[
          'L1 · 8s storm · bolt every 3.5s (4 dmg) · +15% speed · 45s cooldown',
          'L2 · 10s storm · bolt every 2.5s · fear aura — enemies flee',
          'L3 · 12s storm · bolt every 2s (5 dmg) chains to a 2nd enemy · +25% speed · 40s cooldown',
        ] },
      { id:'spiritwolf', name:'Spirit of the Storm', icon:'🐺', max:3, ability:true,
        desc:'Summon a spectral storm-wolf (E) that hunts enemies with crackling bites',
        levels:[
          'L1 · 12s companion · 2 dmg bites · 40s cooldown',
          'L2 · 16s companion · 3 dmg bites',
          'L3 · bites arc lightning to a 2nd enemy · 32s cooldown',
        ] },
    ],
    tapka: [
      { id:'monster', name:'Inner Monster', icon:'👹', max:3, ability:true,
        desc:'Unleash the beast (Q): red-eyed feral form that bites enemies and heals off them',
        levels:[
          'L1 · 6s · +25% speed · bite 2 dmg · heals +1 hp/bite · 30s cooldown',
          'L2 · 8s · bite 3 dmg · heals +2 hp/bite',
          'L3 · 10s · +35% speed · 26s cooldown',
        ] },
      { id:'scurry', name:'Scurry', icon:'💨', max:3, ability:true,
        desc:'Dash (E) a short distance with a burst of invulnerability — pure escape',
        levels:[
          'L1 · dash ~90px · brief invulnerability · 9s cooldown',
          'L2 · dash ~120px · 7s cooldown',
          'L3 · dash + a 1s speed burst on landing · 5s cooldown',
        ] },
    ],
  },
};

const Skills = {
  // All nodes shown for a breed, character nodes first.
  nodesFor(breed){
    return SKILL_NODES.common.concat(SKILL_NODES.byBreed[breed] || []);
  },
  node(breed, id){ return this.nodesFor(breed).find(n=>n.id===id) || null; },

  level(p, id){ return (p && p.skills && p.skills[id]) || 0; },

  addPoint(p, id){
    const n=this.node(p.breed, id);
    if(!n || n.locked) return false;
    const cur=this.level(p, id);
    if(cur>=n.max) return false;
    (p.skills || (p.skills={}))[id]=cur+1;
    this.apply(p);
    return true;
  },
  removePoint(p, id){
    const cur=this.level(p, id);
    if(cur<=0) return false;
    p.skills[id]=cur-1;
    this.apply(p);
    return true;
  },

  // Recompute the player's derived numbers from breed base + skill levels. Never
  // mutates the breed def: p.stats becomes a fresh object each time (makePlayer used
  // to share def.stats by reference — cloning here is what makes skills safe).
  apply(p){
    if(!p) return;
    const base=Breeds.get(p.breed);
    const lv=id=>this.level(p, id);
    const wasMax = p.hp>=p.maxHp;
    p.maxHp = (base.hp||20) + 2*lv('vitality');
    if(wasMax) p.hp=p.maxHp; else p.hp=Math.min(p.hp, p.maxHp);
    p.speed = +(base.stats.speed + 0.06*lv('swift')).toFixed(2);
    p.stats = Object.assign({}, base.stats, {
      speed:    p.speed,
      scentR:   base.stats.scentR + 20*lv('nose'),
      noiseMul: +(base.stats.noiseMul * (1 - 0.08*lv('soft'))).toFixed(3),
    });
    // NOTE: no UI calls here — apply() runs during initial module evaluation
    // (makePlayer at world.js load), before ui.js's `const UI` exists. Callers
    // that change levels at runtime refresh the HUD themselves.
  },
};
