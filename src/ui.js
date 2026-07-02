// ====================== UI LAYER ======================
// Manages the DOM overlay panels (pause menu, inventory/stats, NPC dialog) and the
// HUD. Follows the existing #gameFrame overlay pattern (see charselect.js). Only one
// panel is open at a time; opening a panel moves Game.state to the matching scene so
// the main loop freezes world updates while still drawing the frozen frame behind it.

const UI = {
  panel: null,        // null | 'pause' | 'dialog'  (blocking panels that freeze the world)
  invOpen: false,     // inventory is a *non-blocking* overlay: world keeps simulating
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
    // Keep the open (non-blocking) inventory panel in sync as treats/items change.
    if(this.invOpen) this.renderInventory();
  },

  // ---------- panel plumbing ----------
  // Close a blocking panel (pause/dialog) and resume the world.
  closePanel(){
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    if(Game.state!==SCENES.MENU && Game.state!==SCENES.WIN) Game.state=SCENES.PLAYING;
  },

  // ESC: close whatever is open (blocking panel first, then inventory), else pause.
  togglePause(){
    if(this.panel){ this.closePanel(); return; }
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openPause();
  },

  openPause(){
    if(Game.state!==SCENES.PLAYING) return;
    this.closeInventory();            // never stack pause on top of the inventory overlay
    this.panel='pause'; Game.state=SCENES.PAUSED;
    this._show('pauseScreen', true);
  },

  // ---------- inventory + stats ----------
  // Inventory is a non-blocking overlay: it does NOT change Game.state, so the world
  // keeps simulating while it's open, and it docks over part of the frame (see CSS).
  toggleInventory(){
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openInventory();
  },

  openInventory(){
    this.invOpen=true;
    this.renderInventory();
    this._show('inventoryScreen', true);
  },

  closeInventory(){
    this.invOpen=false;
    this._show('inventoryScreen', false);
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
    this.closeInventory();            // dialog is blocking; don't stack it over inventory
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
    this.closeInventory();
    this.closePanel();
    if(typeof stopMusic==='function') stopMusic();
    this._show('winScreen', false);
    this.$('startScreen').style.display='flex';
    this.refreshContinueButton();     // a save may have been made this session
    Game.state=SCENES.MENU;
  },

  // Show the main-menu "Load Saved Game" button only when a save actually exists.
  // Called at startup and whenever we return to the menu (a save can appear mid-session).
  refreshContinueButton(){
    const c=this.$('btnContinue'); if(!c) return;
    const hasSave = (typeof Save!=='undefined') && Save.has();
    c.style.display = hasSave ? 'inline-block' : 'none';
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
    // Start-screen "Load Saved Game" appears only when a save exists.
    this.refreshContinueButton();
  },
};

// Global HUD hook used across modules (formerly defined in update.js).
function updateHUD(){ UI.updateHUD(); }

UI.init();
