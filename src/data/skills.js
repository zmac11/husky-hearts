// ====================== SKILLS + MASTERY (data) ======================
// Two separate upgrade tracks:
//   • Skills  — CHARACTER stat nodes (shared by every dog), spent from p.skillPoints
//     (earned by clearing levels). Editable anytime via the skill tree (K).
//   • Mastery — per-breed ABILITY nodes, spent from p.masteryPoints (earned by dog
//     level-ups). Editable only BETWEEN levels via the mastery tree (world map).
//
// Player state is plain data (save-friendly): p.skills / p.mastery = { nodeId: level },
// with p.skillPoints / p.masteryPoints as the spendable pools. Skills.level(p, id)
// routes reads to the right map, so the ability modules (which call Skills.level with
// their skillNode) need no change.
//
// Skills.apply(p) is the single place stat effects become numbers: it recomputes
// p.maxHp / p.speed / p.stats from the breed's base + current stat-node levels.
// It must be called after any change (UI), at makePlayer, and on save-load.

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

// All ability-node ids (across breeds) — used to route Skills.level reads to p.mastery.
const _ABILITY_NODE_IDS = new Set();
Object.values(SKILL_NODES.byBreed).forEach(list => list.forEach(n => { if(n.ability) _ABILITY_NODE_IDS.add(n.id); }));

const Skills = {
  // The skill tree shows CHARACTER (stat) nodes only now; abilities live in Mastery.
  nodesFor(){ return SKILL_NODES.common.slice(); },
  node(id){ return SKILL_NODES.common.find(n=>n.id===id) || null; },

  // Route reads: ability nodes → p.mastery, stat nodes → p.skills.
  level(p, id){
    if(!p) return 0;
    if(_ABILITY_NODE_IDS.has(id)) return (p.mastery && p.mastery[id]) || 0;
    return (p.skills && p.skills[id]) || 0;
  },

  // Stat nodes cost 1 skill point per rank; − refunds.
  addPoint(p, id){
    const n=this.node(id);
    if(!n || n.locked) return false;
    if((p.skillPoints||0) <= 0) return false;
    const cur=this.level(p, id);
    if(cur>=n.max) return false;
    (p.skills || (p.skills={}))[id]=cur+1;
    p.skillPoints--;
    this.apply(p);
    return true;
  },
  removePoint(p, id){
    const cur=this.level(p, id);
    if(cur<=0) return false;
    p.skills[id]=cur-1;
    p.skillPoints=(p.skillPoints||0)+1;
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
    // Equipment stat bonuses (data/items.js `mods`), summed once.
    const eq=(typeof Equip!=='undefined') ? Equip.statMods(p) : { maxHp:0, speed:0, scentR:0, noiseMul:0, priceMul:0 };
    const wasMax = p.hp>=p.maxHp;
    p.maxHp = (base.hp||20) + 2*lv('vitality') + eq.maxHp;
    if(wasMax) p.hp=p.maxHp; else p.hp=Math.min(p.hp, p.maxHp);
    p.speed = +(base.stats.speed + 0.06*lv('swift') + eq.speed).toFixed(2);
    p.stats = Object.assign({}, base.stats, {
      speed:    p.speed,
      scentR:   base.stats.scentR + 20*lv('nose') + eq.scentR,
      noiseMul: +(base.stats.noiseMul * (1 - 0.08*lv('soft')) + eq.noiseMul).toFixed(3),
      priceMul: +(base.stats.priceMul + eq.priceMul).toFixed(3),
    });
    // NOTE: no UI calls here — apply() runs during initial module evaluation
    // (makePlayer at world.js load), before ui.js's `const UI` exists. Callers
    // that change levels at runtime refresh the HUD themselves.
  },
};

// Ability mastery — a separate track spent from p.masteryPoints, editable only between
// levels (the mastery tree on the world map). Costs rise per rank: 1 / 1 / 2 mp.
const Mastery = {
  COST: [1, 1, 2],   // mastery points to reach rank 1 / 2 / 3
  nodesFor(breed){ return (SKILL_NODES.byBreed[breed] || []).slice(); },
  node(breed, id){ return this.nodesFor(breed).find(n=>n.id===id) || null; },
  level(p, id){ return (p && p.mastery && p.mastery[id]) || 0; },
  costFor(cur){ return this.COST[cur] || 1; },   // cost to go cur → cur+1

  addPoint(p, id){
    const n=this.node(p.breed, id);
    if(!n || n.locked) return false;
    const cur=this.level(p, id);
    if(cur>=n.max) return false;
    const cost=this.costFor(cur);
    if((p.masteryPoints||0) < cost) return false;
    (p.mastery || (p.mastery={}))[id]=cur+1;
    p.masteryPoints-=cost;
    return true;
  },
  removePoint(p, id){
    const cur=this.level(p, id);
    if(cur<=0) return false;
    p.mastery[id]=cur-1;
    p.masteryPoints=(p.masteryPoints||0)+this.costFor(cur-1);   // refund that rank's cost
    return true;
  },

  // Migrate ability levels saved under the old unified p.skills map into p.mastery
  // (one-time, on load) so pre-split saves keep their unlocked abilities.
  migrate(p){
    if(!p || !p.skills) return;
    this.nodesFor(p.breed).forEach(n=>{
      if(p.skills[n.id]!=null){
        p.mastery=p.mastery||{};
        p.mastery[n.id]=Math.max(p.mastery[n.id]||0, p.skills[n.id]);
        delete p.skills[n.id];
      }
    });
  },
};
