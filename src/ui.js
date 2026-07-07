// ====================== UI LAYER ======================
// Manages the DOM overlay panels (pause menu, inventory/stats, NPC dialog) and the
// HUD. Follows the existing #gameFrame overlay pattern (see charselect.js). Only one
// panel is open at a time; opening a panel moves Game.state to the matching scene so
// the main loop freezes world updates while still drawing the frozen frame behind it.

const UI = {
  panel: null,        // null | 'pause' | 'dialog'  (blocking panels that freeze the world)
  invOpen: false,     // inventory is a *non-blocking* overlay: world keeps simulating
  _dialog: null,      // { npc, player }
  _invPlayer: 0,      // which player the inventory paper-doll is showing (tab index)

  $(id){ return document.getElementById(id); },
  _show(id, on){ const el=this.$(id); if(el) el.style.display = on ? 'flex' : 'none'; },

  // ---------- HUD ----------
  updateHUD(){
    const set=(id,v)=>{ const el=this.$(id); if(el) el.textContent=v; };
    set('p1count', p1 ? p1.treats : 0);
    set('p2count', (typeof p2!=='undefined' && p2) ? p2.treats : 0);
    set('cheerCount', Game.cheeredCount);
    set('cheerTotal', (typeof friends!=='undefined' && friends) ? friends.length : CHEER_TOTAL);
    const lvl=(typeof LevelManager!=='undefined') && LevelManager.current;
    set('levelName', lvl ? lvl.name : '—');
    set('questProgress', lvl && lvl.quest ? lvl.quest.describe() : '—');
    // Heart bars (per active player) + P1 hotbar.
    const h1=this.$('p1hearts'); if(h1 && p1) h1.innerHTML=this._heartMarkup(p1);
    const h2=this.$('p2hearts'); if(h2 && typeof p2!=='undefined' && p2) h2.innerHTML=this._heartMarkup(p2);
    this.renderHotbar();
    // Keep the open (non-blocking) inventory panel in sync as treats/items change.
    if(this.invOpen) this.renderInventory();
  },

  // ---------- hearts ----------
  // 1 heart icon = 2 hp. Each heart shows one of three states based on the hp left in
  // its pair: full (2), shrunk/half (1), or empty → a black dot (0).
  _heartMarkup(p){
    if(!p || !p.maxHp) return '';
    const n=Health.heartsFor(p.maxHp);
    let out = p.dead ? '<span class="hrt dead">🪦</span>' : '';
    for(let i=0;i<n;i++){
      const inHeart=Math.max(0, Math.min(Health.HEART_HP, p.hp - i*Health.HEART_HP));
      if(inHeart>=2)      out+='<span class="hrt full">❤</span>';
      else if(inHeart===1) out+='<span class="hrt half">❤</span>';
      else                 out+='<span class="hrt empty">●</span>';
    }
    return out;
  },

  // ---------- panel plumbing ----------
  // Close a blocking panel (pause/dialog) and resume the world.
  closePanel(){
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    // Don't yank the world back to PLAYING from a terminal/interstitial scene.
    const s=Game.state;
    const frozen = s===SCENES.MENU || s===SCENES.WIN || s===SCENES.WORLDMAP || s===SCENES.GAMEOVER;
    if(!frozen) Game.state=SCENES.PLAYING;
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
    this._invPlayer=0;
    this.renderInventory();
    this._show('inventoryScreen', true);
  },

  closeInventory(){
    this.invOpen=false;
    this._show('inventoryScreen', false);
  },

  // Which player the inventory is showing (clamped; follows the active tab).
  _invTarget(){
    const players=Game.players;
    if(this._invPlayer>=players.length) this._invPlayer=0;
    return players[this._invPlayer]||players[0];
  },

  renderInventory(){
    if(this._dragging) return;            // don't rebuild the DOM mid-drag (would abort it)
    const body=this.$('invBody'); if(!body) return;
    const players=Game.players;
    const p=this._invTarget();
    const b=Breeds.get(p.breed);

    // Player tabs (only meaningful in 2-player).
    const tabs=this.$('invTabs');
    if(tabs){
      tabs.innerHTML = players.length>1
        ? players.map((pp,i)=>`<button class="inv-tab${i===this._invPlayer?' active':''}" data-act="tab" data-idx="${i}">P${pp.id}</button>`).join('')
        : '';
    }

    // Paper-doll wearable slots. Drop a matching wearable here to equip; drag the worn
    // item off to move/unequip it; click a filled slot to send it back to the bag.
    const slotCell=(slot)=>{
      const id=Wearables.equipped(p,slot);
      const def=id?Items.get(id):null;
      const label=Wearables.SLOT_LABEL[slot];
      return `<button class="doll-slot slot-${slot}${id?' filled':''}" data-act="unequip" data-drop="equip" data-slot="${slot}" ${id?'draggable="true" data-drag="equip"':''} title="${label}${id?': '+def.name+' — drag off or click to remove':' (drop a '+label.toLowerCase()+' item here)'}">`
        + (def?`<span class="slot-icon">${def.icon}</span>`:`<span class="slot-tag">${label}</span>`)
        + `</button>`;
    };

    // Positional tile grid. First HOTBAR row = numeric quick-slots (keys 1..N). Every
    // slot is a drop target; filled slots are draggable (reorder / equip / drop / bin).
    const cellsArr=Inventory.cells(p);
    let cells='';
    for(let i=0;i<cellsArr.length;i++){
      const c=cellsArr[i];
      const hb=i<Inventory.HOTBAR;
      const def=c?Items.get(c.id):null;
      const t=def&&def.type;
      const kind = c ? (t==='wearable'?' wearable' : t==='consumable'?' consumable' : t==='toy'?' toy' : '') : '';
      cells+=`<div class="inv-tile${hb?' hb':''}${c?' filled'+kind:' empty'}" data-drop="slot" data-idx="${i}"`
        + (c?` draggable="true" data-drag="slot" data-act="item" title="${def?def.name:c.id}"`:'')
        + `>`
        + (hb?`<span class="tile-key">${i+1}</span>`:'')
        + (c?`<span class="tile-icon">${def?def.icon:'❓'}</span>${c.qty>1?`<span class="tile-qty">${c.qty}</span>`:''}`:'')
        + `</div>`;
    }

    body.innerHTML=`
      <div class="inv-doll-grid">
        ${slotCell('face')}${slotCell('head')}<span class="doll-blank"></span>
        ${slotCell('neck')}<canvas id="dollCanvas" width="92" height="100"></canvas>${slotCell('body')}
        <span class="doll-blank"></span>${slotCell('back')}<span class="doll-blank"></span>
      </div>
      <div class="inv-meta">
        <span class="inv-name">🐾 P${p.id} · ${b.name}</span>
        <span class="inv-heartline">${this._heartMarkup(p)}</span>
      </div>
      <div class="inv-substats">Treats <b>${p.treats}</b> · HP <b>${p.hp}/${p.maxHp}</b> · Slots <b>${Inventory.list(p).length}/${Inventory.CAP}</b></div>
      <div class="inv-tilegrid">${cells}</div>
      <div class="inv-binrow">
        <span class="inv-hint">Drag: reorder · onto dog to wear · out to the world to drop</span>
        <button class="inv-bin" data-drop="bin" title="Drag an item here to delete it">🗑️</button>
      </div>
    `;

    this._drawDoll(p);
  },

  // Draw the paper-doll dog (down-facing, enlarged) + its worn items onto the canvas.
  _drawDoll(p){
    const cv=this.$('dollCanvas'); if(!cv || typeof drawBreedPreviewInline!=='function') return;
    const g=cv.getContext('2d'); if(!g) return;
    g.clearRect(0,0,cv.width,cv.height);
    const S=1.28;                                 // scale the whole dog up for a bigger preview
    const t=(typeof performance!=='undefined')?performance.now():0;
    g.save(); g.scale(S,S);
    const cx=(cv.width/S)/2, cy=(cv.height/S)/2+5;
    const a=(typeof Wearables!=='undefined') ? Wearables.anchor(cx, cy, 'down', p.equipment||{}, t) : null;
    if(a) Wearables.drawBack(g, a);
    drawBreedPreviewInline(g, p.breed, p.color, cx, cy, t);
    if(a) Wearables.drawFront(g, a);
    g.restore();
  },

  // ---------- hotbar (always-visible, mirrors the inventory's first row) ----------
  // Keys 1..N map to the first HOTBAR inventory slots. Anything can sit here; only some
  // item types actually do something when used (see useHotbar).
  renderHotbar(){
    const bar=this.$('hotbar'); if(!bar) return;
    const show = Game.state===SCENES.PLAYING||Game.state===SCENES.PAUSED||Game.state===SCENES.DIALOG||this.invOpen;
    bar.style.display = show ? 'flex' : 'none';
    if(!show){ bar.innerHTML=''; return; }
    const cells=p1?Inventory.cells(p1):[];
    let html='';
    for(let i=0;i<Inventory.HOTBAR;i++){
      const c=cells[i], def=c?Items.get(c.id):null;
      html+=`<button class="hb-slot${c?' filled':''}" data-act="hotbar" data-idx="${i}" ${def?`title="${def.name} — press ${i+1}"`:''}>`
        + `<span class="hb-key">${i+1}</span>`
        + (c?`<span class="hb-icon">${def?def.icon:'❓'}</span>${c.qty>1?`<span class="hb-qty">${c.qty}</span>`:''}`:'')
        + `</button>`;
    }
    bar.innerHTML=html;
  },

  // Use P1 hotbar slot n (1-based) = inventory slot n-1: consumables heal & are consumed,
  // toys play, wearables equip; anything else isn't usable.
  useHotbar(n){
    if(Game.state!==SCENES.PLAYING) return;
    const p=p1; if(!p || p.dead) return;               // a fainted dog can't use items
    const cell=Inventory.at(p, n-1); if(!cell) return;
    const def=Items.get(cell.id);
    if(def && def.type==='consumable'){
      if(p.hp>=p.maxHp){ showToast(`${p.breed} is already at full health!`,1400); return; }
      const healed=Health.heal(p, def.heal||2);
      Inventory.removeAt(p, n-1, 1);
      if(typeof sfxCollect==='function') sfxCollect();
      showToast(`🍪 Ate ${def.name} · +${healed} HP`,1400);
    } else if(def && def.type==='toy'){
      if(typeof sfxCollect==='function') sfxCollect();
      showToast(`🎾 You play with the ${def.name}!`,1200);
    } else if(def && def.type==='wearable'){
      if(Wearables.equipFromSlot(p, n-1, def.slot)) showToast(`🎩 Equipped ${def.name}!`,1200);
    } else {
      showToast(`You can't use the ${def?def.name:'item'}.`,1200);
    }
    this.updateHUD();
  },

  // ---------- inventory interactions: clicks + drag & drop ----------
  // Clicks (no drag movement) equip/use/unequip. Drag routes through _applyDrop.
  _onInvClick(ev){
    const btn=ev.target.closest('[data-act]'); if(!btn) return;
    const p=this._invTarget();
    const act=btn.dataset.act;
    if(act==='tab'){ this._invPlayer=+btn.dataset.idx; this.renderInventory(); return; }
    if(act==='unequip'){ if(Wearables.unequip(p, btn.dataset.slot)) this.updateHUD(); else showToast('Bag is full — no room to remove that.',1400); return; }
    if(act==='item'){
      const idx=+btn.dataset.idx, cell=Inventory.at(p, idx), def=cell&&Items.get(cell.id);
      if(!def) return;
      if(def.type==='wearable'){ if(Wearables.equipFromSlot(p, idx, def.slot)) this.updateHUD(); }
      else if(def.type==='consumable'){
        if(p.dead){ showToast('That dog has fainted.',1400); return; }
        if(p.hp>=p.maxHp){ showToast(`${p.breed} is already at full health!`,1400); return; }
        const healed=Health.heal(p, def.heal||2); Inventory.removeAt(p, idx, 1);
        if(typeof sfxCollect==='function') sfxCollect();
        showToast(`🍪 Ate ${def.name} · +${healed} HP`,1400); this.updateHUD();
      }
      return;
    }
    if(act==='hotbar'){ this.useHotbar((+btn.dataset.idx)+1); return; }
  },

  // --- drag & drop plumbing (HTML5 DnD, delegated on invBody + the game canvas) ---
  _onDragStart(ev){
    const src=ev.target.closest('[data-drag]'); if(!src){ return; }
    const kind=src.dataset.drag;
    this._drag = kind==='equip' ? { kind:'equip', slot:src.dataset.slot } : { kind:'slot', idx:+src.dataset.idx };
    this._dragging=true;
    src.classList.add('dragging');
    if(ev.dataTransfer){ ev.dataTransfer.effectAllowed='move'; try{ ev.dataTransfer.setData('text/plain','item'); }catch(e){} }
  },
  _onDragOver(ev){
    const tgt=ev.target.closest('[data-drop]'); if(!tgt || !this._drag) return;
    ev.preventDefault();
    if(ev.dataTransfer) ev.dataTransfer.dropEffect='move';
  },
  _onDrop(ev){
    const tgt=ev.target.closest('[data-drop]'); if(!tgt || !this._drag) return;
    ev.preventDefault();
    this._dragging=false;                 // allow the post-drop re-render
    this._applyDrop(tgt.dataset.drop, tgt.dataset);
    this._drag=null;
  },
  _onDragEnd(){
    this._dragging=false; this._drag=null;
    const el=this.$('invBody'); if(el){ const d=el.querySelector('.dragging'); if(d) d.classList.remove('dragging'); }
  },

  _applyDrop(dropKind, data){
    const p=this._invTarget(), src=this._drag; if(!src) return;
    if(dropKind==='slot'){
      const to=+data.idx;
      if(src.kind==='slot') Inventory.moveSlot(p, src.idx, to);
      else Wearables.unequipToSlot(p, src.slot, to);
      this.updateHUD();
    } else if(dropKind==='equip'){
      const wslot=data.slot;
      if(src.kind==='slot'){ if(!Wearables.equipFromSlot(p, src.idx, wslot)) showToast("That doesn't go in that slot.",1300); }
      else if(src.kind==='equip' && src.slot!==wslot){ /* different wearable slot — no-op */ }
      this.updateHUD();
    } else if(dropKind==='bin'){
      this._askDelete(src);
    } else if(dropKind==='ground'){
      this._dropToGround(src);
    }
  },

  _dropToGround(src){
    const p=this._invTarget();
    let id, qty;
    if(src.kind==='slot'){ const c=Inventory.at(p, src.idx); if(!c) return; id=c.id; qty=c.qty; Inventory.removeAt(p, src.idx, qty); }
    else { id=p.equipment&&p.equipment[src.slot]; if(!id) return; qty=1; delete p.equipment[src.slot]; }
    if(typeof dropItemOnGround==='function') dropItemOnGround(p, id, qty);
    const def=Items.get(id);
    showToast(`Dropped ${def?def.name:id}${qty>1?' ×'+qty:''} on the ground.`,1400);
    this.updateHUD();
  },

  // Deleting is destructive, so it goes through a confirm popup.
  _askDelete(src){
    const p=this._invTarget();
    let id;
    if(src.kind==='slot'){ const c=Inventory.at(p, src.idx); id=c&&c.id; }
    else id=p.equipment&&p.equipment[src.slot];
    if(!id) return;
    const def=Items.get(id);
    this._pendingDelete={ src, player:p };
    const txt=this.$('confirmText'); if(txt) txt.innerHTML=`Permanently delete <b>${def?def.icon+' '+def.name:id}</b>?`;
    this._show('confirmPopup', true);
  },
  confirmDelete(ok){
    this._show('confirmPopup', false);
    const pd=this._pendingDelete; this._pendingDelete=null;
    if(!ok || !pd) return;
    const p=pd.player;
    if(pd.src.kind==='slot') Inventory.removeAt(p, pd.src.idx, Inventory.MAX_STACK);
    else if(p.equipment) delete p.equipment[pd.src.slot];
    if(typeof sfxHowl==='function') sfxHowl();
    this.updateHUD();
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

    // Shop: buy items with treats as currency. Each NPC supplies its own `wares`
    // (see level generate()); fall back to a default stall if none is set.
    const wares=(d.npc.wares && d.npc.wares.length) ? d.npc.wares : [{id:'biscuit',cost:3},{id:'ribbon',cost:5}];
    wares.forEach(w=>{
      const def=Items.get(w.id); if(!def) return;
      const afford=d.player.treats>=w.cost;
      const btn=document.createElement('button');
      btn.className='dialog-choice'+(afford?'':' disabled');
      btn.textContent=`${def.icon} Buy ${def.name} — ${w.cost} 🦴`;
      btn.addEventListener('click',()=>{
        if(d.player.treats<w.cost){ this.renderDialog("You don't have enough treats for that."); return; }
        if(Inventory.roomFor(d.player, w.id) < 1){ this.renderDialog("Your bag is full! Make some room first."); return; }
        d.player.treats-=w.cost; Inventory.add(d.player, w.id, 1); this.updateHUD();
        if(typeof sfxCollect==='function') sfxCollect();
        const tail = def.type==='wearable' ? ' Open your inventory (I) to wear it!' : ' Anything else?';
        this.renderDialog(`Enjoy your ${def.name}!${tail}`);
      });
      choices.appendChild(btn);
    });

    const bye=document.createElement('button');
    bye.className='dialog-choice';
    bye.textContent='👋 Goodbye';
    bye.addEventListener('click',()=>this.closePanel());
    choices.appendChild(bye);
  },

  // ---------- game over ----------
  // A dog fainted (hp hit 0). Freeze the run and offer Play Again / Main Menu.
  // Called from Health.onDown. The frozen death frame stays visible behind the
  // translucent overlay (GAMEOVER is in the main loop's showWorld set).
  gameOver(p){
    if(Game.state===SCENES.GAMEOVER) return;   // already down — don't stack
    this.closeInventory();
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    Game.state=SCENES.GAMEOVER;
    if(typeof stopMusic==='function') stopMusic();   // the sad faint sound already played
    const who = (Game.twoPlayer && p) ? `P${p.id}'s dog` : 'Your dog';
    const t=this.$('gameOverText'); if(t) t.textContent=`${who} fainted... but every good dog gets another chance.`;
    this._show('gameOverScreen', true);
    this.renderHotbar();              // hide the hotbar
  },

  // ---------- menu transitions ----------
  quitToMenu(){
    this.closeInventory();
    this.closePanel();
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    if(typeof stopMusic==='function') stopMusic();
    this._show('winScreen', false);
    this._show('gameOverScreen', false);
    this.$('startScreen').style.display='flex';
    this.refreshContinueButton();     // a save may have been made this session
    Game.state=SCENES.MENU;
    this.renderHotbar();              // hides the hotbar back on the menu
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
    on('btnQuit', ()=>this.quitToMenu());
    // Game over → replay / menu. (World-map buttons are wired inside WorldMap.)
    on('btnGameOverReplay', ()=>{ if(typeof replayRun==='function') replayRun(); });
    on('btnGameOverMenu', ()=>this.quitToMenu());
    on('btnSave', ()=>{ if(typeof Save!=='undefined') Save.save(); });
    on('btnLoad', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    // Start-screen "Continue" appears only when a save exists.
    on('btnContinue', ()=>{ if(typeof Save!=='undefined') Save.load(); });
    // Delete-confirm popup buttons.
    on('btnDelYes', ()=>this.confirmDelete(true));
    on('btnDelNo',  ()=>this.confirmDelete(false));
    // Delegated clicks + drag/drop for the inventory (listeners sit on the stable
    // #invBody container, so they survive its innerHTML rebuilds).
    const inv=this.$('invBody');
    if(inv){
      inv.addEventListener('click', e=>this._onInvClick(e));
      inv.addEventListener('dragstart', e=>this._onDragStart(e));
      inv.addEventListener('dragover',  e=>this._onDragOver(e));
      inv.addEventListener('drop',      e=>this._onDrop(e));
      inv.addEventListener('dragend',   e=>this._onDragEnd(e));
    }
    const bar=this.$('hotbar'); if(bar) bar.addEventListener('click', e=>this._onInvClick(e));
    // The game canvas is the "drop out of the bag → onto the ground" target.
    const game=this.$('game');
    if(game){
      game.addEventListener('dragover', e=>{ if(this._drag){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move'; } });
      game.addEventListener('drop', e=>{ if(!this._drag) return; e.preventDefault(); this._dragging=false; this._applyDrop('ground',{}); this._drag=null; });
    }
    this.renderHotbar();
    // Start-screen "Load Saved Game" appears only when a save exists.
    this.refreshContinueButton();
  },
};

// Global HUD hook used across modules (formerly defined in update.js).
function updateHUD(){ UI.updateHUD(); }

UI.init();
