// ====================== DEV MODE ======================
// A testing panel with three sections:
//   • Player — manual Level Up (+1 / +5), grant skill/mastery points, Unlock All
//     (abilities + Ultimate), Full Heal, and +50 treats.
//   • Give Item — a grid of every item (data/items.js); click one to add it to the bag
//     (falls back to dropping it on the ground when the bag is full).
//   • Jump to Level — boot straight into any registered level/biome.
//
// Open it from the "🛠 Dev Mode" button on the start screen, or press the backtick key
// (`) anytime (see core/input.js). The Player/Item tools need a run in progress; opening
// mid-game pauses the world (open()) so cheats apply to the live dog, then resume on close.
// Purely a dev convenience — nothing here affects a normal playthrough.

const DevMode = {
  _pausedByDev: false,

  open(){
    // Freeze the world if we're opening mid-game so the dog doesn't wander behind the panel.
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

  render(){
    const body=document.getElementById('devBody'); if(!body) return;
    const p=(typeof p1!=='undefined' && p1) ? p1 : null;
    let html='';

    // ---- Player: manual level-up + points + heal/treats ----
    const stat = p
      ? `Lv ${p.dogLevel||1} · ${Math.floor(p.xp||0)}/${Progression.xpToNext(p.dogLevel||1)} XP · 🌳${p.skillPoints||0} · ⚡${p.masteryPoints||0} · 💰${p.treats||0}`
      : '(enter a level to use)';
    html += `<div class="dev-env"><div class="dev-env-h">🐕 Player — ${stat}</div><div class="dev-levels">`
      + `<button class="dev-lvl" data-act="lvl1">⭐ Level Up</button>`
      + `<button class="dev-lvl" data-act="lvl5">⭐ +5 Levels</button>`
      + `<button class="dev-lvl" data-act="skill">🌳 +5 Skill</button>`
      + `<button class="dev-lvl" data-act="mastery">⚡ +5 Mastery</button>`
      + `<button class="dev-lvl" data-act="unlock">🔓 Unlock All</button>`
      + `<button class="dev-lvl" data-act="heal">❤️ Full Heal</button>`
      + `<button class="dev-lvl" data-act="treats">💰 +50 Treats</button>`
      + `</div></div>`;

    // ---- Give any item (click adds one to the bag; drops on the ground if full) ----
    html += `<div class="dev-env"><div class="dev-env-h">🎒 Give Item <span style="font-weight:normal;color:#9aa39a;font-size:10px">— click to add to the bag</span></div><div class="dev-items">`;
    (typeof Items!=='undefined' ? Items.list() : []).forEach(it=>{
      html += `<button class="dev-item" data-item="${it.id}" title="${it.name}"><span class="di-ic">${it.icon||'❓'}</span><span class="di-nm">${it.name}</span></button>`;
    });
    html += `</div></div>`;

    // ---- Jump to level ----
    html += `<div class="dev-env-h" style="margin-top:4px">🗺️ Jump to Level</div>`;
    Campaign.environments.forEach(env=>{
      html += `<div class="dev-env"><div class="dev-env-h">${env.icon} ${env.name}</div><div class="dev-levels">`;
      env.levels.forEach(l=>{
        const playable = !!l.real && (typeof Levels!=='undefined') && Levels.get(l.id);
        const tag = l.kind==='boss' ? '👑 ' : '';
        html += playable
          ? `<button class="dev-lvl${l.kind==='boss'?' boss':''}" data-lvl="${l.id}">${tag}${l.name}</button>`
          : `<span class="dev-lvl soon">${tag}${l.name} · soon</span>`;
      });
      html += `</div></div>`;
    });

    body.innerHTML=html;
  },

  // Boot a run straight into `levelId` with the currently-selected dog.
  play(levelId){
    if(!(typeof Levels!=='undefined' && Levels.get(levelId))) return;
    this._pausedByDev=false;
    this.close();
    const ss=document.getElementById('startScreen'); if(ss) ss.style.display='none';
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    resetGame(dogConfig, levelId);
    if(typeof Abilities!=='undefined') Abilities.spawnAll();
    Game.state=SCENES.PLAYING;
    if(typeof updateHUD==='function') updateHUD();   // hotbar shows once PLAYING
    if(typeof startMusic==='function') startMusic();
    if(typeof isTouchDevice==='function' && isTouchDevice() && typeof showMobileControls==='function') showMobileControls(true);
    if(typeof showToast==='function') showToast('🛠 Dev: '+Levels.get(levelId).name, 1600);
  },

  // ---- cheats: player + items (run while the panel is open, mid-run) ----
  _player(){ const p=(typeof p1!=='undefined'&&p1)?p1:null; if(!p && typeof showToast==='function') showToast('🛠 Enter a level first', 1500); return p; },

  levelUp(n){
    const p=this._player(); if(!p) return;
    // award exactly enough XP to gain n dog levels (one award → one toast + correct mastery drops)
    let need=-(p.xp||0), lvl=p.dogLevel||1;
    for(let i=0;i<n;i++){ need+=Progression.xpToNext(lvl); lvl++; }
    Progression.award(p, Math.max(1,Math.round(need)), 'dev');
    this.render();
  },
  giveSkill(n){ const p=this._player(); if(!p) return; p.skillPoints=(p.skillPoints||0)+n; if(typeof updateHUD==='function') updateHUD(); if(typeof showToast==='function') showToast('🌳 +'+n+' skill points',1300); this.render(); },
  giveMastery(n){ const p=this._player(); if(!p) return;
    if(typeof Abilities!=='undefined' && Abilities.unlockAbilities) Abilities.unlockAbilities(p);
    p.abilitiesUnlocked=true; p.masteryPoints=(p.masteryPoints||0)+n;
    if(typeof Skills!=='undefined' && Skills.apply) Skills.apply(p);
    if(typeof updateHUD==='function') updateHUD(); if(typeof showToast==='function') showToast('⚡ +'+n+' mastery points (abilities unlocked)',1500); this.render(); },
  unlockAll(){ const p=this._player(); if(!p) return;
    if(typeof Abilities!=='undefined' && Abilities.unlockAbilities) Abilities.unlockAbilities(p);
    p.abilitiesUnlocked=true; p.ultimateUnlocked=true;
    if(typeof Skills!=='undefined' && Skills.apply) Skills.apply(p);
    if(typeof updateHUD==='function') updateHUD(); if(typeof showToast==='function') showToast('🔓 Abilities + Ultimate unlocked',1600); this.render(); },
  heal(){ const p=this._player(); if(!p) return; p.dead=false; p.hp=p.maxHp;
    if(typeof Status!=='undefined' && Status.clearAll) Status.clearAll(p);
    if(typeof Warmth!=='undefined' && Warmth.reset) Warmth.reset(p);
    if(typeof updateHUD==='function') updateHUD(); if(typeof showToast==='function') showToast('❤️ Full heal',1200); },
  giveTreats(n){ const p=this._player(); if(!p) return; p.treats=(p.treats||0)+n; if(typeof updateHUD==='function') updateHUD(); if(typeof showToast==='function') showToast('💰 +'+n+' treats',1200); this.render(); },
  giveItem(id){ const p=this._player(); if(!p) return;
    const nm=((typeof Items!=='undefined' && Items.get(id))||{}).name||id;
    const added=(typeof Inventory!=='undefined') ? Inventory.add(p, id, 1) : 0;
    if(added>0){ if(typeof showToast==='function') showToast('🎒 +1 '+nm,1000); }
    else if(typeof dropItemOnGround==='function'){ dropItemOnGround(p, id, 1); if(typeof showToast==='function') showToast('🎒 Bag full — dropped '+nm+' on the ground',1500); }
    else if(typeof showToast==='function') showToast('🎒 Bag full',1200);
    if(typeof updateHUD==='function') updateHUD();
    // deliberately no re-render — keep the item grid's scroll position while you add several
  },
  _act(a){
    if(a==='lvl1') return this.levelUp(1);
    if(a==='lvl5') return this.levelUp(5);
    if(a==='skill') return this.giveSkill(5);
    if(a==='mastery') return this.giveMastery(5);
    if(a==='unlock') return this.unlockAll();
    if(a==='heal') return this.heal();
    if(a==='treats') return this.giveTreats(50);
  },

  init(){
    const body=document.getElementById('devBody');
    if(body) body.addEventListener('click', e=>{
      const lvlBtn=e.target.closest('[data-lvl]'); if(lvlBtn){ this.play(lvlBtn.dataset.lvl); return; }
      const itemBtn=e.target.closest('[data-item]'); if(itemBtn){ this.giveItem(itemBtn.dataset.item); return; }
      const actBtn=e.target.closest('[data-act]'); if(actBtn){ this._act(actBtn.dataset.act); return; }
    });
    const close=document.getElementById('devClose'); if(close) close.addEventListener('click',()=>this.close());
    const open=document.getElementById('btnDev'); if(open) open.addEventListener('click',()=>this.open());
  },
};

DevMode.init();
