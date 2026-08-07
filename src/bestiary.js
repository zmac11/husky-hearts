// ====================== BESTIARY / JOURNAL ======================
// The Keeper's journal (debuts in Amber Orchard). It quietly records every creature you meet
// across the campaign — a kind is "discovered" the first time it comes near you — and tallies
// how many you've bested. Entries carry a short blurb and their home biome. Discovery + tallies
// are campaign progress, saved alongside Progress (save.js), and reset on a brand-new game.

const Bestiary = {
  seen: {},        // kind → true (discovered)
  defeats: {},     // kind → count bested

  DATA: {
    enemy:        { name:'Grumpy Badger',   icon:'🦡', biome:'🌳', blurb:'All bluster — it wanders and nips, but a quick paw sends it off.' },
    badgerbaron:  { name:'The Badger Baron', icon:'🦡', biome:'🌳', blurb:'A charging brute you beat with wits: bait it into its own pit traps.', boss:true },
    wolf:         { name:'Grey Wolf',        icon:'🐺', biome:'⛰️', blurb:'A fast pack-hunter of the peaks. Kite it and mind its lunges.' },
    alphawolf:    { name:'The Alpha Wolf',   icon:'🐺', biome:'⛰️', blurb:'Pack leader — interrupt its howl before it rallies the whole pack.', boss:true },
    shadowlurker: { name:'Shadow Lurker',    icon:'👁️', biome:'🌲', blurb:'Only bold in the dark. Stay in the light and it keeps its distance.' },
    toadstool:    { name:'Toadstool Spitter',icon:'🍄', biome:'🌲', blurb:'A rooted spitter that lobs poisonous spore-globs. Break line of sight.' },
    patrol:       { name:'The Watcher',      icon:'🔦', biome:'🌲', blurb:'A sweeping sight-cone. Slip through its blind spots during the rite.' },
    grizzly:      { name:'The Old Grizzly',  icon:'🐻', biome:'🌲', blurb:'Slow but immense — dodge its ground-slam ring and its charge.', boss:true },
    crab:         { name:'Snapping Crab',    icon:'🦀', biome:'🏖️', blurb:'A slow shore chaser with a mean pincer. Keep moving on the sand.' },
    jellyfish:    { name:'Jellyfish',        icon:'🎐', biome:'🏖️', blurb:'A drifting sting — dive beneath it, since it only strikes at the surface.' },
    hermitcrab:   { name:'The Giant Hermit Crab', icon:'🦀', biome:'🏖️', blurb:'Armored at high tide — bait its charge into the rocks to crack the shell.', boss:true },
    crow:         { name:'Thieving Crow',    icon:'🐦', biome:'🍂', blurb:'Swoops to snatch a gathered ingredient. Shoo it or pop it.' },
    scarecrow:    { name:'Scarecrow',        icon:'🌾', biome:'🍂', blurb:'A harmless prop by day; it stirs and lurches after you in the dark.' },
    scarecrowking:{ name:'The Scarecrow King', icon:'🎃', biome:'🍂', blurb:'Summons minions and fire-lanes, and eats your buff-foods. Cook spares.', boss:true },
    scarab:       { name:'Scarab',           icon:'🪲', biome:'🏜️', blurb:'Fast and weak, and it swarms. A Mirage Decoy pulls it away.' },
    sentinel:     { name:'Ruin Sentinel',    icon:'🗿', biome:'🏜️', blurb:'A rooted stone guardian that lobs sand-bolts. Duck behind ruin walls.' },
    sandserpent:  { name:'The Sand Serpent', icon:'🐍', biome:'🏜️', blurb:'Burrows unseen — bait it to the surface with a decoy or a plate, then strike.', boss:true },
    frostwolf:    { name:'Frost Wolf',       icon:'🐺', biome:'❄️', blurb:'An elite wolf whose bite leaves you frostbitten. Drops frost crystals.' },
    icesprite:    { name:'Ice Sprite',       icon:'❄️', biome:'❄️', blurb:'A frost wisp that lobs chilling shards from range.' },
    iceyeti:      { name:'The Ice Yeti',     icon:'🧊', biome:'❄️', blurb:'Ground-pounds shockwave rings and freezes you solid. Warmth is life.', boss:true },
    skysprite:    { name:'Sky Sprite',       icon:'🌬️', biome:'☁️', blurb:'A wind-wisp that gusts you toward the void. Weave its shots.' },
    stormeagle:   { name:'The Storm Eagle',  icon:'🦅', biome:'☁️', blurb:'The finale — aerial dives and lightning, then a grounded window to punish.', boss:true },
  },

  reset(){ this.seen={}; this.defeats={}; },
  discovered(kind){ return !!this.seen[kind]; },
  count(){ return Object.keys(this.DATA).length; },
  foundCount(){ return Object.keys(this.seen).filter(k=>this.DATA[k]).length; },

  see(kind){
    if(!this.DATA[kind] || this.seen[kind]) return;
    this.seen[kind]=true;
    if(typeof showToast==='function') showToast(`📖 New journal entry: ${this.DATA[kind].icon} ${this.DATA[kind].name}`, 2000);
    if(typeof UI!=='undefined' && UI.journalOpen && UI.renderJournal) UI.renderJournal();
  },
  recordDefeat(kind){ if(!this.DATA[kind]) return; this.see(kind); this.defeats[kind]=(this.defeats[kind]||0)+1; },

  // Mark nearby enemies discovered — called each frame for p1 (cheap: a handful of entities).
  scan(p){
    if(!p || p.dead) return;
    const es=(typeof entities!=='undefined'&&entities)?entities:[];
    for(const e of es){ if(this.DATA[e.kind] && Math.hypot(p.x-e.x, p.y-e.y)<400) this.see(e.kind); }
  },

  // Ordered entries for the panel (discovered first, grouped by biome order).
  entries(){
    const order=Object.keys(this.DATA);
    return order.map(k=>({ kind:k, def:this.DATA[k], found:!!this.seen[k], defeats:this.defeats[k]||0 }));
  },

  export(){ return { seen:Object.assign({}, this.seen), defeats:Object.assign({}, this.defeats) }; },
  import(data){ this.seen=(data&&data.seen)||{}; this.defeats=(data&&data.defeats)||{}; },
};
