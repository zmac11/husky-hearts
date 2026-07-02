// ====================== UI LAYER ======================
// Manages the DOM overlay panels (pause menu, inventory/stats, NPC dialog) and the
// HUD. Follows the existing #gameFrame overlay pattern (see charselect.js). Only one
// panel is open at a time; opening a panel moves Game.state to the matching scene so
// the main loop freezes world updates while still drawing the frozen frame behind it.

const UI = {
  panel: null,        // null | 'pause' | 'inventory' | 'dialog'
  _dialog: null,      // { npc, player }

  $(id){ return document.getElementById(id); },
  _show(id, on){ const el=this.$(id); if(el) el.style.display = on ? 'flex' : 'none'; },

  // ---------- HUD ----------
  updateHUD(){
    const set=(id,v)=>{ const el=this.$(id); if(el) el.textContent=v; };
    set('p1count', p1 ? p1.treats : 0);
    set('p2count', (typeof p2!=='undefined' && p2) ? p2.treats : 0);
    set('cheerCount', Game.cheeredCount);
    const lvl=(typeof LevelManager!=='undefined') && LevelManager.current;
    set('levelName', lvl ? lvl.name : '—');
    set('questProgress', lvl && lvl.quest ? lvl.quest.describe() : '—');
  },

  // ---------- panel plumbing ----------
  closePanel(){
    this._show('pauseScreen', false);
    this._show('inventoryScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    if(Game.state!==SCENES.MENU && Game.state!==SCENES.WIN) Game.state=SCENES.PLAYING;
  },

  // ESC: close any open panel, else pause when playing.
  togglePause(){
    if(this.panel){ this.closePanel(); return; }
    if(Game.state===SCENES.PLAYING) this.openPause();
  },

  openPause(){
    if(Game.state!==SCENES.PLAYING) return;
    this.panel='pause'; Game.state=SCENES.PAUSED;
    this._show('pauseScreen', true);
  },

  // ---------- inventory + stats ----------
  toggleInventory(){
    if(Game.state===SCENES.INVENTORY){ this.closePanel(); return; }
    if(Game.state===SCENES.PLAYING) this.openInventory();
  },

  openInventory(){
    this.panel='inventory'; Game.state=SCENES.INVENTORY;
    this.renderInventory();
    this._show('inventoryScreen', true);
  },

  renderInventory(){
    const body=this.$('invBody'); if(!body) return;
    const players=Game.players;
    body.innerHTML=players.map(p=>{
      const b=Breeds.get(p.breed);
      const items=Inventory.list(p);
      const cells=items.length
        ? items.map(e=>`<span class="inv-cell">${e.def?e.def.icon:'❓'} ${e.id}<span class="qty">×${e.qty}</span></span>`).join('')
        : `<span class="inv-empty">No items yet — go collect some!</span>`;
      return `<div class="inv-player">
        <h3>🐾 P${p.id} · ${b.name}</h3>
        <div class="inv-stats">
          Treats: <b>${p.treats}</b><br>
          Speed: <b>${p.stats.speed}</b> · Swim: <b>${p.stats.swim}</b><br>
          Passive: ${b.passive}${b.abilityId?`<br>Ability: <b>${b.abilityId}</b>`:''}
        </div>
        <div class="inv-grid">${cells}</div>
      </div>`;
    }).join('');
  },

  // ---------- dialog / shop ----------
  openDialog(npc, player){
    this.panel='dialog'; Game.state=SCENES.DIALOG;
    this._dialog={ npc, player };
    this.renderDialog(npc.greeting);
    this._show('dialogScreen', true);
  },

  renderDialog(text){
    const d=this._dialog; if(!d) return;
    this.$('dialogName').textContent=d.npc.name;
    this.$('dialogText').textContent=text;
    const choices=this.$('dialogChoices');
    choices.innerHTML='';

    // Sample shop: buy items with treats as currency. Future NPCs can supply their
    // own choice lists via npc.choices.
    const wares=[{id:'biscuit',cost:3},{id:'ribbon',cost:5}];
    wares.forEach(w=>{
      const def=Items.get(w.id);
      const afford=d.player.treats>=w.cost;
      const btn=document.createElement('button');
      btn.className='dialog-choice'+(afford?'':' disabled');
      btn.textContent=`${def.icon} Buy ${def.name} — ${w.cost} 🦴`;
      btn.addEventListener('click',()=>{
        if(d.player.treats<w.cost){ this.renderDialog("You don't have enough treats for that."); return; }
        d.player.treats-=w.cost; Inventory.add(d.player, w.id, 1); this.updateHUD();
        if(typeof sfxCollect==='function') sfxCollect();
        this.renderDialog(`Enjoy your ${def.name}! Anything else?`);
      });
      choices.appendChild(btn);
    });

    const bye=document.createElement('button');
    bye.className='dialog-choice';
    bye.textContent='👋 Goodbye';
    bye.addEventListener('click',()=>this.closePanel());
    choices.appendChild(bye);
  },

  // ---------- menu transitions ----------
  quitToMenu(){
    this.closePanel();
    if(typeof stopMusic==='function') stopMusic();
    this._show('winScreen', false);
    this.$('startScreen').style.display='flex';
    Game.state=SCENES.MENU;
  },

  // Wire buttons + inventory key. Called once at startup.
  init(){
    const on=(id,fn)=>{ const el=this.$(id); if(el) el.addEventListener('click',fn); };
    on('btnResume', ()=>this.closePanel());
    on('btnInvClose', ()=>this.closePanel());
    on('btnQuit', ()=>this.quitToMenu());
    on('btnSave', ()=>{ if(typeof Save!=='undefined') Save.save(); });
    on('btnLoad', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    // Start-screen "Continue" appears only when a save exists.
    on('btnContinue', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    if(typeof Save!=='undefined' && Save.has()){
      const c=this.$('btnContinue'); if(c) c.style.display='inline-block';
    }
  },
};

// Global HUD hook used across modules (formerly defined in update.js).
function updateHUD(){ UI.updateHUD(); }

UI.init();
