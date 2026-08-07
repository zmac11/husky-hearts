// ====================== DEV MODE ======================
// A testing panel. Open from the "🛠 Dev Mode" start-screen button, or press ` (backtick)
// or "<" anytime (core/input.js). Opening mid-run pauses the world so cheats apply to the
// live dog; closing resumes. Sections:
//   • Player — level-up/points, unlock, heal, treats, godmode, noclip, speed, reset cooldowns.
//   • Abilities / Status / World — swap any breed's Q/E kit, apply any status, force dark/cold,
//     time controls (pause/step/slow-mo), a debug overlay, and teleports.
//   • Spawn — drop any entity (enemies, bosses, hazards, NPCs, chests…) by the dog; boss
//     phase-jump; clear enemies/hazards.
//   • Progress / Save / Character — complete/reset progress, quick save/load, wipe saves, set
//     the run seed, swap breed, equip any wearable.
//   • Give Item — every item, with a ×1/×10/×99 qty picker and a name filter.
//   • Jump to Level — boot straight into any registered level.
// Debug flags (god/noclip/timeScale/paused/debug/speedMul) default OFF so normal play is
// untouched; the loop (main.js), updatePlayer (update.js) and input.js read them when set.

const DevMode = {
  _pausedByDev: false,
  // live cheat flags (read by main.js / update.js) — all inert at their defaults
  god:false, noclip:false, speedMul:1, timeScale:1, paused:false, _step:false, debug:false,
  _qty:1, _filter:'',

  open(){
    if(Game.state===SCENES.PLAYING){ Game.state=SCENES.PAUSED; this._pausedByDev=true; }
    this.render();
    if(typeof UI!=='undefined') UI._show('devScreen', true);
  },
  close(){
    if(typeof UI!=='undefined') UI._show('devScreen', false);
    if(this._pausedByDev && Game.state===SCENES.PAUSED){ Game.state=SCENES.PLAYING; }
    this._pausedByDev=false;
  },
  toggle(){
    const el=document.getElementById('devScreen'); if(!el) return;
    (getComputedStyle(el).display==='none') ? this.open() : this.close();
  },

  // ---- render ----
  _row(title, buttons){ return `<div class="dev-env"><div class="dev-env-h">${title}</div><div class="dev-levels">${buttons}</div></div>`; },
  _b(act, label, on){ return `<button class="dev-lvl${on?' on':''}" data-act="${act}">${label}</button>`; },

  render(){
    const body=document.getElementById('devBody'); if(!body) return;
    const p=(typeof p1!=='undefined' && p1) ? p1 : null;
    const lm=(typeof LevelManager!=='undefined') ? LevelManager.current : null;
    let html='';

    // ---- Player ----
    const stat = p
      ? `Lv ${p.dogLevel||1} · ${Math.floor(p.xp||0)}/${Progression.xpToNext(p.dogLevel||1)} XP · 🌳${p.skillPoints||0} · ⚡${p.masteryPoints||0} · 💰${p.treats||0}`
      : '(enter a level to use)';
    html += this._row(`🐕 Player — ${stat}`,
        this._b('lvl1','⭐ Level Up') + this._b('lvl5','⭐ +5 Levels')
      + this._b('skill','🌳 +5 Skill') + this._b('mastery','⚡ +5 Mastery')
      + this._b('unlock','🔓 Unlock All') + this._b('heal','❤️ Full Heal')
      + this._b('treats','💰 +50 Treats')
      + this._b('god','🛡 God '+(this.god?'ON':'OFF'), this.god)
      + this._b('noclip','👻 Noclip '+(this.noclip?'ON':'OFF'), this.noclip)
      + this._b('speed','🏃 Speed ×'+this.speedMul, this.speedMul!==1)
      + this._b('resetcd','♻️ Reset CDs'));

    // ---- Abilities (swap the live Q/E kit) ----
    html += this._row('🎮 Abilities — equip a breed\'s Q/E',
        this._b('kit-dinno','⚡ Dinno (Storm/Wolf)') + this._b('kit-lolla','🎾 Lolla (Cannon/Scream)')
      + this._b('kit-tapka','👹 Ťapka (Monster/Scurry)'));

    // ---- Status ----
    html += this._row('🤕 Status — inflict on the dog',
        this._b('st-poisoned','🤢 Poison') + this._b('st-bleeding','🩸 Bleed')
      + this._b('st-stunned','💫 Stun') + this._b('st-slow','🐌 Slow') + this._b('st-clear','🧹 Clear'));

    // ---- World + time + debug ----
    html += this._row('🌍 World & Time',
        this._b('dark','🌑 Dark '+(lm&&lm.dark?'ON':'OFF'), lm&&lm.dark)
      + this._b('cold','❄️ Cold '+(lm&&lm.cold?'ON':'OFF'), lm&&lm.cold)
      + this._b('pause','⏸ Pause '+(this.paused?'ON':'OFF'), this.paused)
      + this._b('step','⏭ Step')
      + this._b('time','🐢 Time ×'+this.timeScale, this.timeScale!==1)
      + this._b('debug','🐛 Debug '+(this.debug?'ON':'OFF'), this.debug));

    // ---- Teleport ----
    html += this._row('🌀 Teleport',
        this._b('tp-spawn','→ Spawn') + this._b('tp-portal','→ Portal')
      + this._b('tp-boss','→ Boss') + this._b('tp-npc','→ NPC'));

    // ---- Spawn ----
    let sp='';
    this._SPAWN.forEach(s=>{ sp += `<button class="dev-lvl${s[2]?' boss':''}" data-spawn="${s[0]}" title="${s[1]}">${s[1]}</button>`; });
    html += this._row('🧬 Spawn (by the dog) · <span style="font-weight:normal;color:#9aa39a;font-size:10px">boss: '
      + this._b('boss-p2','P2') + this._b('boss-p3','P3') + this._b('boss-1hp','1HP')
      + this._b('kill-enemies','💀 Enemies') + this._b('clear-hazards','🧹 Hazards') + '</span>', sp);

    // ---- Progress / Save / Seed ----
    html += this._row('🗺️ Progress',
        this._b('prog-level','✅ This Level') + this._b('prog-biome','✅ Biome')
      + this._b('prog-all','✅ All') + this._b('prog-reset','♻️ Reset'));
    html += this._row('💾 Save · 🎲 Seed'
      + ` <input class="dev-input" data-seed placeholder="seed…" style="width:90px">`,
        this._b('save','💾 Save') + this._b('load','📂 Load') + this._b('wipe','🗑 Wipe')
      + this._b('seed','🎲 Apply Seed')
      + `<span style="font-size:10px;color:#9aa39a;align-self:center">${(typeof Run!=='undefined'&&Run.label)?Run.label():''}</span>`);

    // ---- Character: breed + wearables ----
    html += this._row('🐶 Breed (live swap)',
        this._b('breed-dinno','🐺 Dinno') + this._b('breed-lolla','🐕 Lolla') + this._b('breed-tapka','🦴 Ťapka'));
    let wr='';
    this._wearables().forEach(it=>{ wr += `<button class="dev-lvl" data-wear="${it.id}" title="${it.name}">${it.icon||'❓'} ${it.name}</button>`; });
    if(wr) html += this._row('👕 Equip Wearable', wr);

    // ---- Give item (qty + filter) ----
    html += `<div class="dev-env"><div class="dev-env-h">🎒 Give Item `
      + this._b('qty1','×1', this._qty===1) + this._b('qty10','×10', this._qty===10) + this._b('qty99','×99', this._qty===99)
      + ` <input class="dev-input" data-filter placeholder="filter…" style="width:110px"></div><div class="dev-items">`;
    (typeof Items!=='undefined' ? Items.list() : []).forEach(it=>{
      html += `<button class="dev-item" data-item="${it.id}" title="${it.name}"><span class="di-ic">${it.icon||'❓'}</span><span class="di-nm">${it.name}</span></button>`;
    });
    html += `</div></div>`;

    // ---- Jump to level ----
    html += `<div class="dev-env-h" style="margin-top:4px">🚀 Jump to Level</div>`;
    Campaign.environments.forEach(env=>{
      let lv='';
      env.levels.forEach(l=>{
        const playable = !!l.real && (typeof Levels!=='undefined') && Levels.get(l.id);
        const tag = l.kind==='boss' ? '👑 ' : '';
        lv += playable
          ? `<button class="dev-lvl${l.kind==='boss'?' boss':''}" data-lvl="${l.id}">${tag}${l.name}</button>`
          : `<span class="dev-lvl soon">${tag}${l.name} · soon</span>`;
      });
      html += this._row(`${env.icon} ${env.name}`, lv);
    });

    body.innerHTML=html;
    const fi=body.querySelector('[data-filter]'); if(fi) fi.value=this._filter||'';
    this._applyFilter(this._filter);
  },

  // ---- boot a run straight into a level ----
  play(levelId){
    if(!(typeof Levels!=='undefined' && Levels.get(levelId))) return;
    this._pausedByDev=false; this.close();
    const ss=document.getElementById('startScreen'); if(ss) ss.style.display='none';
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    resetGame(dogConfig, levelId);
    if(typeof Abilities!=='undefined') Abilities.spawnAll();
    Game.state=SCENES.PLAYING;
    if(typeof updateHUD==='function') updateHUD();
    if(typeof startMusic==='function') startMusic();
    if(typeof isTouchDevice==='function' && isTouchDevice() && typeof showMobileControls==='function') showMobileControls(true);
    if(typeof showToast==='function') showToast('🛠 Dev: '+Levels.get(levelId).name, 1600);
  },

  // ============================ cheats ============================
  _player(){ const p=(typeof p1!=='undefined'&&p1)?p1:null; if(!p && typeof showToast==='function') showToast('🛠 Enter a level first', 1500); return p; },
  _toast(m,t){ if(typeof showToast==='function') showToast(m, t||1100); },
  _hud(){ if(typeof updateHUD==='function') updateHUD(); },

  // -- player --
  levelUp(n){ const p=this._player(); if(!p) return;
    let need=-(p.xp||0), lvl=p.dogLevel||1; for(let i=0;i<n;i++){ need+=Progression.xpToNext(lvl); lvl++; }
    Progression.award(p, Math.max(1,Math.round(need)), 'dev'); this.render(); },
  giveSkill(n){ const p=this._player(); if(!p) return; p.skillPoints=(p.skillPoints||0)+n; this._hud(); this._toast('🌳 +'+n+' skill points'); this.render(); },
  giveMastery(n){ const p=this._player(); if(!p) return;
    if(typeof Abilities!=='undefined' && Abilities.unlockAbilities) Abilities.unlockAbilities(p);
    p.abilitiesUnlocked=true; p.masteryPoints=(p.masteryPoints||0)+n;
    if(typeof Skills!=='undefined' && Skills.apply) Skills.apply(p); this._hud(); this._toast('⚡ +'+n+' mastery'); this.render(); },
  unlockAll(){ const p=this._player(); if(!p) return;
    if(typeof Abilities!=='undefined' && Abilities.unlockAbilities) Abilities.unlockAbilities(p);
    p.abilitiesUnlocked=true; p.ultimateUnlocked=true;
    if(typeof Skills!=='undefined' && Skills.apply) Skills.apply(p); this._hud(); this._toast('🔓 Abilities + Ultimate unlocked',1500); this.render(); },
  heal(){ const p=this._player(); if(!p) return; p.dead=false; p.hp=p.maxHp;
    if(typeof Status!=='undefined' && Status.clearAll) Status.clearAll(p);
    if(typeof Warmth!=='undefined' && Warmth.reset) Warmth.reset(p); this._hud(); this._toast('❤️ Full heal'); },
  giveTreats(n){ const p=this._player(); if(!p) return; p.treats=(p.treats||0)+n; this._hud(); this._toast('💰 +'+n+' treats'); this.render(); },
  toggleGod(){ this.god=!this.god; const p=(typeof p1!=='undefined'&&p1)?p1:null; if(p && !this.god) p.invulnT=0; this._toast('🛡 Godmode '+(this.god?'ON':'OFF')); this.render(); },
  toggleNoclip(){ this.noclip=!this.noclip; this._toast('👻 Noclip '+(this.noclip?'ON':'OFF')); this.render(); },
  cycleSpeed(){ const o=[1,2,3,0.5]; this.speedMul=o[(o.indexOf(this.speedMul)+1)%o.length]; this.render(); },
  resetCd(){ const p=this._player(); if(!p) return; p.abilityCd={}; this._toast('♻️ Cooldowns reset'); },

  // -- abilities --
  _KITS:{ dinno:['stormFang','spiritWolf',null], lolla:['ballCannon','scream',null], tapka:['innerMonster','scurry',null] },
  giveKit(breed){ const p=this._player(); if(!p) return;
    p.abilities=(this._KITS[breed]||this._KITS.dinno).slice();
    if(typeof Abilities!=='undefined'){ if(Abilities.unlockAbilities) Abilities.unlockAbilities(p); p.abilitiesUnlocked=true; if(Abilities.reset) Abilities.reset(); if(Abilities.spawnAll) Abilities.spawnAll(); }
    p.abilityCd={}; this._hud(); this._toast('🎮 '+breed+' abilities equipped',1400); this.render(); },

  // -- status --
  applyStatus(name){ const p=this._player(); if(!p) return; if(typeof Status!=='undefined') Status.apply(p, name, 6000); this._hud(); },
  clearStatus(){ const p=this._player(); if(!p) return; if(typeof Status!=='undefined') Status.clearAll(p); this._hud(); this._toast('🧹 Statuses cleared'); },

  // -- world + time --
  toggleDark(){ const lm=(typeof LevelManager!=='undefined')?LevelManager.current:null; if(!lm){ this._toast('No level'); return; } lm.dark=!lm.dark; this._hud(); this._toast('🌑 Darkness '+(lm.dark?'ON':'OFF')); this.render(); },
  toggleCold(){ const lm=(typeof LevelManager!=='undefined')?LevelManager.current:null; if(!lm){ this._toast('No level'); return; } lm.cold=!lm.cold; const p=(typeof p1!=='undefined'&&p1)?p1:null; if(p && typeof Warmth!=='undefined' && Warmth.reset) Warmth.reset(p); this._hud(); this._toast('❄️ Cold '+(lm.cold?'ON':'OFF')); this.render(); },
  togglePause(){ this.paused=!this.paused; this._toast('⏸ '+(this.paused?'Paused':'Resumed')); this.render(); },
  step(){ this._step=true; this._toast('⏭ Step',600); },
  cycleTime(){ const o=[1,0.5,0.25,2]; this.timeScale=o[(o.indexOf(this.timeScale)+1)%o.length]; this._toast('🐢 Time ×'+this.timeScale); this.render(); },
  toggleDebug(){ this.debug=!this.debug; this._toast('🐛 Debug '+(this.debug?'ON':'OFF')); this.render(); },

  // -- teleport --
  teleport(where){ const p=this._player(); if(!p) return; const es=(typeof entities!=='undefined'?entities:[]); let t=null;
    if(where==='spawn'){ const s=(LevelManager.current&&LevelManager.current.spawn)||{x:200,y:200}; t={x:s.x,y:s.y}; }
    else if(where==='portal'){ const e=es.find(x=>x.kind==='portal'); if(e) t={x:e.x,y:e.y-30}; }
    else if(where==='boss'){ const e=es.find(x=>x.boss); if(e) t={x:e.x,y:e.y+50}; }
    else if(where==='npc'){ const e=es.find(x=>x.kind==='npc'); if(e) t={x:e.x,y:e.y+34}; }
    if(!t){ this._toast('Target not found'); return; }
    p.x=clamp(t.x,20,WORLD_W-20); p.y=clamp(t.y,26,WORLD_H-20);
    if(typeof updateCamera==='function') updateCamera(); this._toast('🌀 → '+where); },

  // -- spawn --
  _SPAWN:[
    ['enemy','🦡 Badger'],['wolf','🐺 Wolf'],['shadowlurker','👤 Lurker'],['toadstool','🍄 Toadstool'],
    ['badgerbaron','👑 Baron',1],['alphawolf','👑 Alpha Wolf',1],['grizzly','👑 Grizzly',1],
    ['chest','🎁 Chest'],['npc','🧑 NPC'],['critter','🐿 Critter'],
    ['firepit','🔥 Firepit'],['shrinelantern','🏮 Shrine'],['lanternpost','💡 Lantern'],
    ['sporecloud','☁️ Spore'],['rockfall','🪨 Rockfall'],['pittrap','🕳 Pit'],['patrol','🔦 Patrol'],['groundzone','⭕ AoE'],
  ],
  spawnKind(kind){ const p=this._player(); if(!p) return;
    const near={ x:clamp(p.x+(p.dir==='left'?-130:130), 40, WORLD_W-40), y:clamp(p.y, 40, WORLD_H-40) };
    if(typeof nudgeOutOfWater==='function') nudgeOutOfWater(near, 30);
    const props={ x:near.x, y:near.y };
    if(kind==='chest'){ props.rarity='silver'; props.state='dug'; }
    else if(kind==='npc'){ props.name='Dev NPC'; props.greeting='Hi! I was spawned by Dev Mode.'; }
    else if(kind==='critter'){ props.species='squirrel'; }
    else if(kind==='sporecloud'){ props.r=40; props.life=6000; }
    else if(kind==='groundzone'){ props.r=70; props.warnMs=900; props.dmg=4; props.color='#E0503C'; props.scale=1; }
    else if(kind==='rockfall'){ props.top=Math.max(40,near.y-150); props.bottom=WORLD_H-40; props.period=2600; }
    else if(kind==='firepit'||kind==='shrinelantern'){ props.lit=false; }
    else if(kind==='pittrap'){ props.state='armed'; }
    else if(kind==='patrol'){ props.range=300; }
    Entities.spawn(kind, props); this._hud(); this._toast('🧬 Spawned '+kind); },
  bossHp(f){ const b=(typeof entities!=='undefined')?entities.find(e=>e.boss):null; if(!b){ this._toast('No boss present'); return; } b.hp=Math.max(1,Math.ceil((b.maxHp||b.hp)*f)); this._hud(); this._toast('👑 Boss → '+Math.round(f*100)+'% HP'); },
  _clear(list,label){ const es=(typeof entities!=='undefined')?entities:[]; for(let i=es.length-1;i>=0;i--){ if(list.indexOf(es[i].kind)!==-1) Entities.remove(es[i]); } this._hud(); this._toast('🧹 Cleared '+label); },
  _ENEMY:['enemy','wolf','shadowlurker','toadstool','badgerbaron','alphawolf','grizzly','patrol'],
  _HAZARD:['groundzone','sporecloud','rockfall','pittrap'],

  // -- progress / save / seed --
  progLevel(){ const lm=(typeof LevelManager!=='undefined')?LevelManager.current:null; if(lm && typeof Progress!=='undefined'){ Progress.markComplete(lm.id); this._toast('✅ '+lm.name+' complete'); } this.render(); },
  progBiome(){ const lm=(typeof LevelManager!=='undefined')?LevelManager.current:null; if(!lm) return; Campaign.envOfLevel(lm.id).levels.forEach(l=>{ if(l.real) Progress.markComplete(l.id); }); this._toast('✅ Biome complete'); this.render(); },
  progAll(){ Campaign.environments.forEach(env=>env.levels.forEach(l=>{ if(l.real) Progress.markComplete(l.id); })); this._toast('✅ All levels complete',1400); this.render(); },
  progReset(){ if(typeof Progress!=='undefined') Progress.reset(); this._toast('♻️ Progress reset'); this.render(); },
  quickSave(){ if(typeof Save!=='undefined' && Save.write){ Save.write('1',{quiet:true}); this._toast('💾 Saved to slot 1'); } },
  quickLoad(){ if(typeof Save!=='undefined' && Save.read){ this.close(); Save.read('1'); this._toast('📂 Loaded slot 1'); } },
  wipeSaves(){ if(typeof Save!=='undefined' && Save.remove){ (Save.SLOTS||['1','2','3','4','5','6']).forEach(s=>Save.remove(s)); if(Save.AUTO) Save.remove(Save.AUTO); this._toast('🗑 All saves wiped',1400); } },
  applySeed(){ const inp=document.querySelector('#devBody [data-seed]'); if(!inp) return; if(typeof Run!=='undefined' && Run.setFromText){ Run.setFromText(inp.value); this._toast('🎲 Seed set — applies on the next level',2000); } this.render(); },

  // -- breed / wearables --
  swapBreed(breed){ const p=this._player(); if(!p) return;
    if(typeof dogConfig!=='undefined') dogConfig.breed=breed;
    if(typeof makePlayer==='function'){
      const np=makePlayer(p.id, p.color, p.x, p.y, breed, p.markings);
      ['treats','xp','dogLevel','skillPoints','masteryPoints','abilitiesUnlocked','ultimateUnlocked','skills','mastery','inventory','equipment','dir'].forEach(k=>{ if(p[k]!==undefined) np[k]=p[k]; });
      np.hp=Math.min(np.maxHp, p.hp||np.maxHp);
      if(typeof Skills!=='undefined' && Skills.apply) Skills.apply(np);
      p1=np;   // Game.players is a getter over p1
      if(typeof Abilities!=='undefined'){ if(Abilities.reset) Abilities.reset(); if(Abilities.spawnAll) Abilities.spawnAll(); }
    }
    this._hud(); this._toast('🐕 Breed → '+breed); this.render(); },
  _wearables(){ return (typeof Items!=='undefined'?Items.list():[]).filter(it=>it.type==='wearable'); },
  equipWear(id){ const p=this._player(); if(!p) return;
    if(typeof Inventory!=='undefined' && !Inventory.has(p,id)) Inventory.add(p,id,1);
    if(typeof Wearables!=='undefined' && Wearables.equip) Wearables.equip(p,id);
    this._hud(); this._toast('👕 Equipped '+((Items.get(id)||{}).name||id)); },

  // -- give item (qty) --
  setQty(n){ this._qty=n; this.render(); },
  giveItem(id){ const p=this._player(); if(!p) return; const n=this._qty||1;
    const nm=((typeof Items!=='undefined' && Items.get(id))||{}).name||id;
    const added=(typeof Inventory!=='undefined') ? Inventory.add(p, id, n) : 0;
    if(added>0) this._toast('🎒 +'+added+' '+nm);
    if(added<n && typeof dropItemOnGround==='function'){ dropItemOnGround(p, id, n-added); this._toast('🎒 Bag full — dropped the rest',1400); }
    this._hud();   // no re-render — keep the item grid's scroll
  },

  // ---- filter (live; no re-render so focus/scroll stay put) ----
  _applyFilter(text){ this._filter=text||''; const q=(text||'').trim().toLowerCase();
    document.querySelectorAll('#devBody .dev-item, #devBody [data-spawn], #devBody [data-wear]').forEach(b=>{
      const name=(b.getAttribute('title')||b.textContent||'').toLowerCase();
      b.style.display = (!q || name.indexOf(q)!==-1) ? '' : 'none';
    }); },

  // ---- action dispatch ----
  _act(a){
    const M={ lvl1:()=>this.levelUp(1), lvl5:()=>this.levelUp(5), skill:()=>this.giveSkill(5), mastery:()=>this.giveMastery(5),
      unlock:()=>this.unlockAll(), heal:()=>this.heal(), treats:()=>this.giveTreats(50),
      god:()=>this.toggleGod(), noclip:()=>this.toggleNoclip(), speed:()=>this.cycleSpeed(), resetcd:()=>this.resetCd(),
      'kit-dinno':()=>this.giveKit('dinno'), 'kit-lolla':()=>this.giveKit('lolla'), 'kit-tapka':()=>this.giveKit('tapka'),
      'st-poisoned':()=>this.applyStatus('poisoned'), 'st-bleeding':()=>this.applyStatus('bleeding'), 'st-stunned':()=>this.applyStatus('stunned'), 'st-slow':()=>this.applyStatus('slow'), 'st-clear':()=>this.clearStatus(),
      dark:()=>this.toggleDark(), cold:()=>this.toggleCold(), pause:()=>this.togglePause(), step:()=>this.step(), time:()=>this.cycleTime(), debug:()=>this.toggleDebug(),
      'tp-spawn':()=>this.teleport('spawn'), 'tp-portal':()=>this.teleport('portal'), 'tp-boss':()=>this.teleport('boss'), 'tp-npc':()=>this.teleport('npc'),
      'boss-p2':()=>this.bossHp(0.79), 'boss-p3':()=>this.bossHp(0.39), 'boss-1hp':()=>{ const b=(typeof entities!=='undefined')?entities.find(e=>e.boss):null; if(b){ b.hp=1; this._hud(); this._toast('👑 Boss → 1 HP'); } },
      'kill-enemies':()=>this._clear(this._ENEMY,'enemies'), 'clear-hazards':()=>this._clear(this._HAZARD,'hazards'),
      'prog-level':()=>this.progLevel(), 'prog-biome':()=>this.progBiome(), 'prog-all':()=>this.progAll(), 'prog-reset':()=>this.progReset(),
      save:()=>this.quickSave(), load:()=>this.quickLoad(), wipe:()=>this.wipeSaves(), seed:()=>this.applySeed(),
      'breed-dinno':()=>this.swapBreed('dinno'), 'breed-lolla':()=>this.swapBreed('lolla'), 'breed-tapka':()=>this.swapBreed('tapka'),
      qty1:()=>this.setQty(1), qty10:()=>this.setQty(10), qty99:()=>this.setQty(99),
    };
    if(M[a]) M[a]();
  },

  // ---- debug overlay (called from main.js while `debug` is on) ----
  drawDebug(now){
    if(typeof ctx==='undefined') return;
    const es=(typeof entities!=='undefined'?entities:[]);
    // world-space: radii + boss ranges + state labels
    ctx.save();
    ctx.setTransform(renderScale,0,0,renderScale,0,0);
    if(typeof cam!=='undefined') ctx.translate(-cam.x,-cam.y);
    ctx.lineWidth=1; ctx.font='9px monospace'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    es.forEach(e=>{
      const d=(typeof Entities!=='undefined')?Entities.def(e.kind):null;
      const r=(e.radius||(d&&d.radius)||16);
      ctx.strokeStyle=e.boss?'#FF5B5B':(typeof e.hp==='number'?'#FFD34D':'#7FD0FF');
      ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.stroke();
      if(e.boss){
        if(typeof e.slamR==='number'){ ctx.strokeStyle='rgba(255,90,90,0.45)'; ctx.beginPath(); ctx.arc(e.x,e.y,e.slamR*(e.scale||1),0,Math.PI*2); ctx.stroke(); }
        ctx.fillStyle='#FFF'; ctx.fillText((e.state||'')+' '+(e.hp!=null?Math.ceil(e.hp)+'/'+(e.maxHp||'?'):''), e.x, e.y-r-4);
      }
    });
    if(typeof p1!=='undefined'&&p1){ ctx.strokeStyle='#88FFCC'; ctx.beginPath(); ctx.arc(p1.x,p1.y,14,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
    // screen-space HUD
    if(!this._ft) this._ft=[]; this._ft.push(now); while(this._ft.length && now-this._ft[0]>1000) this._ft.shift();
    ctx.save(); ctx.setTransform(renderScale,0,0,renderScale,0,0);
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(3,3,164,46);
    ctx.fillStyle='#9FE870'; ctx.font='9px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
    const P=(typeof p1!=='undefined'&&p1)?p1:null;
    const lines=[
      'FPS '+this._ft.length+'   entities '+es.length,
      P?('xy '+Math.round(P.x)+','+Math.round(P.y)+'   hp '+Math.ceil(P.hp)+'/'+P.maxHp):'',
      'time×'+this.timeScale+(this.paused?' ⏸':'')+(this.god?' 🛡':'')+(this.noclip?' 👻':'')+(this.speedMul!==1?' 🏃×'+this.speedMul:''),
    ];
    lines.forEach((l,i)=>ctx.fillText(l,7,7+i*12));
    ctx.restore();
  },

  init(){
    const body=document.getElementById('devBody');
    if(body){
      body.addEventListener('click', e=>{
        const lvlBtn=e.target.closest('[data-lvl]'); if(lvlBtn){ this.play(lvlBtn.dataset.lvl); return; }
        const spBtn=e.target.closest('[data-spawn]'); if(spBtn){ this.spawnKind(spBtn.dataset.spawn); return; }
        const wrBtn=e.target.closest('[data-wear]'); if(wrBtn){ this.equipWear(wrBtn.dataset.wear); return; }
        const itemBtn=e.target.closest('[data-item]'); if(itemBtn){ this.giveItem(itemBtn.dataset.item); return; }
        const actBtn=e.target.closest('[data-act]'); if(actBtn){ this._act(actBtn.dataset.act); return; }
      });
      body.addEventListener('input', e=>{ if(e.target.matches('[data-filter]')) this._applyFilter(e.target.value); });
    }
    const close=document.getElementById('devClose'); if(close) close.addEventListener('click',()=>this.close());
    const open=document.getElementById('btnDev'); if(open) open.addEventListener('click',()=>this.open());
  },
};

DevMode.init();
