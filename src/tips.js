// ====================== FEATURE TIPS ======================
// First-time teaching popups. The very first time the player meets a mechanic — collects a
// treat, digs a chest, opens a shop, is noticed by an enemy, levels up… — a modal card
// explains what it is and how it works, then never shows again. Which tips have been seen
// (and whether tips are on at all) persist in localStorage, so a returning player isn't
// re-taught, and both are controllable on the Options screen.
//
// Triggering is one call, `Tips.show('id')`, dropped at the natural first-interaction site
// across the codebase (update.js, chest.js, ui.js, progression.js, …). It self-guards on
// enabled + already-seen, so callers fire it freely every time.
//
// While a tip is up the world freezes (main.js checks Tips.active) even mid-combat, so the
// player can read it safely; dismissing (button / Enter / Esc) resumes and shows the next
// queued tip if two triggered at once.

const Tips = {
  KEY: 'husky-hearts-tips-v1',
  enabled: true,
  _seen: {},
  _queue: [],
  active: false,

  // Every footer carries this so the player always knows they can turn tips off.
  NOTE: '💡 You can turn these tips off in ⚙️ Options.',

  // id → { icon, title, body }. Ordered roughly by when they first come up in a playthrough.
  DATA: {
    seed:     { icon:'🌱', title:'World Seeds',
      body:"Every adventure is built from a seed. Type your own to replay or share the exact same world, or leave it blank for a fresh surprise each time. Your seed shows on the pause menu and map — tap it to copy." },
    collect:  { icon:'🦴', title:'Collecting Treats',
      body:"Bones, hearts, balls and flowers are treats — walk over one to pick it up. Treats are what you give to lonely friends to cheer them, and the coins you spend at shops." },
    deliver:  { icon:'💛', title:'Cheering Friends',
      body:"Lonely animals just want some company and a snack. Stand next to one and hold the action key to hand over treats from your bag. Cheer up every friend in a level to complete it!" },
    chest:    { icon:'💰', title:'Buried Treasure', art:'treasure',
      body:"Those little sniff wisps at your dog's nose mean treasure is buried nearby — smarter dogs smell it from farther. Walk onto the loose-dirt patch and hold the action key to dig, then open it for loot. Silver chests need a 🗝️ Key." },
    shop:     { icon:'🛒', title:'Shops',
      body:"Merchants trade goods for treats. Click a ware to buy it — smarter dogs haggle a better price. Stock up on food to heal and gear to wear before the trail gets tough." },
    quest:    { icon:'📜', title:'Quests',
      body:"A glowing “!” means an animal has a task for you. Hear them out, bring what they ask, and return for a reward. Accepted tasks show at the top-left, or press the quest key to open your journal." },
    enemy:    { icon:'⚔️', title:'Enemies & Hearts',
      body:"Not everyone is friendly — some critters bite, and each hit costs you a heart (top bar). Keep your distance, or fight back with your abilities. If every heart runs out your dog faints, so carry a biscuit or two to heal!" },
    ability:  { icon:'⚡', title:'Abilities Awakened!',
      body:"Clearing the boss awakened your dog's special abilities! Press Q and E to use them — each has a cooldown shown on its hotbar slot. They start at their gentlest tier; spend 🎓 mastery points (earned every 5 levels) in the new Mastery tree to rank them up." },
    wearable: { icon:'🎩', title:'Wearables',
      body:"Gear isn't just for looks. Open your inventory and drag a hat, scarf, coat or cape onto your dog to wear it — most pieces also grant stat bonuses like extra health, speed or quieter steps." },
    levelup:  { icon:'⭐', title:'Leveling Up',
      body:"Earning XP levels up your dog, and every level grants a 🎓 mastery point for ability upgrades. Clearing a whole level also awards 🌳 skill points for lasting stat boosts." },
    inventory:{ icon:'🎒', title:'Your Inventory',
      body:"Your bag holds treats, food and gear. Drag items to rearrange them, drag them onto the world to drop them, or onto your dog to wear gear. The bottom row is your hotbar — press number keys to use those items quickly." },
    skills:   { icon:'🌳', title:'Skill Tree',
      body:"Spend 🌳 skill points (earned by clearing levels) on lasting character upgrades — more health, faster paws, a keener nose, quieter steps. The 🌳 button glows whenever points are waiting to be spent." },
    ultimate: { icon:'🌟', title:'Ultimate Awakened!',
      body:"The Moonlit Rite has awoken your dog's Ultimate — press R to unleash Moonburst: a radiant blast that hits every nearby foe, heals you, and shields you for a moment. It's mighty, so it has a long cooldown." },
    mastery:  { icon:'🎓', title:'Ability Mastery',
      body:"Spend 🎓 mastery points (earned by leveling up) to unlock your dog's abilities and rank them up. Stronger effects, shorter cooldowns — build your dog your way." },
    worldmap: { icon:'🗺️', title:'Your Journey',
      body:"This map traces your progress across the biomes. Tap a place you've already been to see its details and travel back — levels stay exactly as you left them, so you can revisit shops and quest-givers whenever you like." },
    save:     { icon:'💾', title:'Saving Your Game',
      body:"You can keep several games at once in separate save slots, plus an autosave that updates as you travel between levels. Load any of them later from the main menu or the pause screen." },
  },

  // ---------- persistence ----------
  load(){
    try {
      const s=JSON.parse(localStorage.getItem(this.KEY));
      if(s){ this.enabled = s.enabled!==false; this._seen = s.seen || {}; }
    } catch(e){}
  },
  save(){
    try { localStorage.setItem(this.KEY, JSON.stringify({ enabled:this.enabled, seen:this._seen })); } catch(e){}
  },

  setEnabled(on){ this.enabled=!!on; this.save(); },
  reset(){ this._seen={}; this.save(); },   // "show all tips again"

  // ---------- showing ----------
  show(id){
    if(!this.enabled || this._seen[id] || !this.DATA[id]) return;
    this._seen[id]=true; this.save();       // mark up-front: a tip is one-and-done even if skipped
    this._queue.push(id);
    if(!this.active) this._present();
  },

  _present(){
    const id=this._queue.shift();
    if(id===undefined){ this.active=false; return; }
    const d=this.DATA[id];
    this.active=true;
    const set=(el,v)=>{ const e=document.getElementById(el); if(e) e.textContent=v; };
    set('tipIcon', d.icon); set('tipTitle', d.title); set('tipBody', d.body); set('tipNote', this.NOTE);
    // Optional illustration strip (tip-art.js): drawn when the tip declares an `art` set.
    const art=document.getElementById('tipArt');
    if(art){
      const drew = d.art && typeof TipArt!=='undefined' && TipArt.render(d.art, art);
      art.style.display = drew ? 'flex' : 'none';
      if(!drew) art.innerHTML='';
    }
    const el=document.getElementById('tipScreen'); if(el) el.style.display='flex';
  },

  dismiss(){
    const el=document.getElementById('tipScreen'); if(el) el.style.display='none';
    if(this._queue.length) this._present();   // chain into the next queued tip
    else this.active=false;
  },

  init(){
    this.load();
    const btn=document.getElementById('tipOk'); if(btn) btn.addEventListener('click',()=>this.dismiss());
    // Enter / Esc / Space dismiss. Capture phase + stopImmediatePropagation so the keypress
    // never also reaches the game (no stray howl, no stuck movement key on resume).
    window.addEventListener('keydown', e=>{
      if(!this.active) return;
      if(e.code==='Enter'||e.code==='Escape'||e.code==='Space'||e.code==='NumpadEnter'){
        e.preventDefault(); e.stopImmediatePropagation(); this.dismiss();
      }
    }, true);
  },
};

Tips.init();
