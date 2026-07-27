// ====================== UI LAYER ======================
// Manages the DOM overlay panels (pause menu, inventory/stats, NPC dialog) and the
// HUD. Follows the existing #gameFrame overlay pattern (see charselect.js). Only one
// panel is open at a time; opening a panel moves Game.state to the matching scene so
// the main loop freezes world updates while still drawing the frozen frame behind it.

const UI = {
  panel: null,        // null | 'pause' | 'dialog'  (blocking panels that freeze the world)
  invOpen: false,     // inventory is a *non-blocking* overlay: world keeps simulating
  journalOpen: false, // quest journal is a *non-blocking* overlay too (like inventory)
  skillsOpen: false,  // skill tree — same non-blocking overlay pattern
  masteryOpen: false, // ability mastery tree (only from the world map, between levels)
  _dialog: null,      // { npc, player }
  _invPlayer: 0,      // which player the inventory paper-doll is showing (tab index)

  $(id){ return document.getElementById(id); },
  _show(id, on){ const el=this.$(id); if(el) el.style.display = on ? 'flex' : 'none'; },

  // ---------- HUD ----------
  updateHUD(){
    const set=(id,v)=>{ const el=this.$(id); if(el) el.textContent=v; };
    set('p1count', p1 ? p1.treats : 0);
    // Dog level + XP bar
    set('dogLevel', p1 ? (p1.dogLevel||1) : 1);
    const xf=this.$('xpFill');
    if(xf && p1 && typeof Progression!=='undefined'){
      const need=Progression.xpToNext(p1.dogLevel||1);
      xf.style.width = Math.max(0, Math.min(100, ((p1.xp||0)/need)*100)) + '%';
    }
    set('cheerCount', Game.cheeredCount);
    set('cheerTotal', (typeof friends!=='undefined' && friends) ? friends.length : CHEER_TOTAL);
    const lvl=(typeof LevelManager!=='undefined') && LevelManager.current;
    set('levelName', lvl ? lvl.name : '—');
    set('questProgress', lvl && lvl.quest ? lvl.quest.describe() : '—');
    // Heart bar + hotbar.
    const h1=this.$('p1hearts'); if(h1 && p1) h1.innerHTML=this._heartMarkup(p1);
    this.renderHotbar();
    this.renderTreeButtons();
    this.renderQuestTracker();
    // Keep the open (non-blocking) inventory panel in sync as treats/items change.
    if(this.invOpen) this.renderInventory();
    // Keep the open journal live as you collect/hand in items.
    if(this.journalOpen) this.renderJournal();
    if(this.skillsOpen) this.renderSkills();
  },

  // ---------- upgrade-tree buttons (🌳 skills / 🎓 mastery) ----------
  // Always reachable while playing, and they GLOW with a count badge whenever there are
  // unspent points — so a level-up or a cleared level is never quietly banked and forgotten.
  renderTreeButtons(){
    const box=this.$('treeBtns'); if(!box) return;
    const s=Game.state;
    const show = s===SCENES.PLAYING || s===SCENES.PAUSED || s===SCENES.DIALOG
                 || this.invOpen || this.journalOpen || this.skillsOpen;
    box.style.display = show ? 'flex' : 'none';
    if(!show || !p1){
      // Drop the glow while hidden so a stale ring can't flash when they come back.
      ['btnTreeSkills','btnTreeMastery'].forEach(id=>{ const b=this.$(id); if(b) b.classList.remove('glow'); });
      return;
    }
    const mark=(id, pts, label)=>{
      const btn=this.$(id); if(!btn) return;
      btn.classList.toggle('glow', pts>0);
      const badge=btn.querySelector('.tree-badge'); if(badge) badge.textContent=pts>0?pts:'';
      btn.title = pts>0 ? `${label} — ${pts} point${pts>1?'s':''} to spend!` : label;
    };
    mark('btnTreeSkills',  p1.skillPoints||0,   'Skill tree (K)');
    // The mastery button stays hidden until abilities are unlocked at the first boss — the
    // whole ability screen is out of reach before then.
    const mBtn=this.$('btnTreeMastery');
    if(mBtn) mBtn.style.display = p1.abilitiesUnlocked ? '' : 'none';
    if(p1.abilitiesUnlocked) mark('btnTreeMastery', p1.masteryPoints||0, 'Ability mastery');
  },

  // ---------- quest tracker (always-visible list of accepted quests) ----------
  // A small HUD overlay in the top-left of the frame. Shows only quests you've accepted
  // (state 'active'), with best-across-players progress and a "ready to hand in" flag.
  renderQuestTracker(){
    const box=this.$('questTracker'); if(!box) return;
    const worldVisible = Game.state===SCENES.PLAYING || Game.state===SCENES.PAUSED || Game.state===SCENES.DIALOG;
    const active = (typeof Quests!=='undefined') ? Quests.entriesInState('active') : [];
    if(!worldVisible || active.length===0){ box.style.display='none'; box.innerHTML=''; return; }
    const rows = active.map(({giver,q})=>{
      const ready=Quests.readyToTurnIn(q);
      const pr=Quests.bestProgress(q);
      const status = ready
        ? `<span class="qt-ready">✓ Ready — see ${giver}</span>`
        : `<span class="qt-prog">${pr.have}/${pr.need}</span>`;
      return `<div class="qt-row${ready?' ready':''}">`
        + `<span class="qt-goal">📜 ${Quests.summary(q)}</span>${status}</div>`;
    }).join('');
    box.innerHTML = `<div class="qt-title">Quests</div>${rows}`;
    box.style.display='block';
  },

  // ---------- quest journal (J): every quest in the level, grouped by state ----------
  toggleJournal(){
    if(this.journalOpen){ this.closeJournal(); return; }
    if(Game.state===SCENES.PLAYING) this.openJournal();
  },
  openJournal(){
    this.closeInventory();            // never stack the non-blocking overlays
    this.closeSkills();
    this.journalOpen=true;
    this.renderJournal();
    this._show('questScreen', true);
  },
  closeJournal(){
    this.journalOpen=false;
    this._show('questScreen', false);
  },

  // ---------- skill tree (K): per-dog character + ability upgrades ----------
  toggleSkills(){
    if(this.skillsOpen){ this.closeSkills(); return; }
    if(Game.state===SCENES.PLAYING) this.openSkills();
  },
  openSkills(){
    this.closeInventory();            // one non-blocking overlay at a time
    this.closeJournal();
    if(this.masteryOpen) this.closeMastery();   // the two trees never stack
    this.skillsOpen=true;
    if(typeof Tips!=='undefined') Tips.show('skills');
    this.renderSkills();
    // In-world it's a side dock over live gameplay; on the journey map it takes the whole
    // frame (like the mastery tree) so it can't cover Continue / Main Menu.
    const el=this.$('skillScreen');
    if(el) el.classList.toggle('overmap', Game.state===SCENES.WORLDMAP);
    this._show('skillScreen', true);
  },
  closeSkills(){
    this.skillsOpen=false;
    this._show('skillScreen', false);
  },

  renderSkills(){
    const body=this.$('skillBody'); if(!body) return;
    const p=p1; if(!p){ body.innerHTML=''; return; }
    const b=Breeds.get(p.breed);
    const sp=p.skillPoints||0;
    const nodes=Skills.nodesFor();
    const row=n=>{
      const lvl=Skills.level(p,n.id);
      const pips=`<span class="sk-pips">${Array.from({length:n.max},(_,i)=>`<span class="st-pip${i<lvl?' on':''}"></span>`).join('')}</span>`;
      return `<div class="sk-node">
        <div class="sk-head">
          <span class="sk-name">${n.icon} ${n.name}</span>
          ${pips}
          <span class="sk-btns">
            <button class="sk-btn" data-act="skdown" data-node="${n.id}" ${lvl<=0?'disabled':''}>−</button>
            <button class="sk-btn" data-act="skup" data-node="${n.id}" ${(lvl>=n.max||sp<=0)?'disabled':''}>+</button>
          </span>
        </div>
        <div class="sk-desc">${n.desc}</div>
      </div>`;
    };
    body.innerHTML=`
      <div class="sk-meta">${b.emoji} <b>${b.name}</b> · 🧠 Skill points: <b>${sp}</b> <span class="sk-note">(earned by clearing levels)</span></div>
      <div class="q-sect">Character stats</div>
      ${nodes.map(row).join('')}
      <div class="sk-note" style="margin-top:6px;">Abilities are unlocked in the 🎓 Mastery tree between levels.</div>`;
  },

  _onSkillClick(ev){
    const btn=ev.target.closest('[data-act]'); if(!btn || btn.disabled) return;
    const p=p1; if(!p) return;
    const id=btn.dataset.node;
    if(btn.dataset.act==='skup'){
      if(Skills.addPoint(p,id)){
        if(typeof sfxCollect==='function') sfxCollect();
        if(typeof spawnSparkles==='function') spawnSparkles(p.x,p.y-10,'#FFD93D',10);
      }
    } else if(btn.dataset.act==='skdown'){
      Skills.removePoint(p,id);
    }
    this.updateHUD();   // hearts/hotbar + re-renders the open tree
  },

  // ---------- mastery tree: unlock/rank abilities (world map, or the in-game 🎓 button) ----------
  toggleMastery(){
    if(this.masteryOpen){ this.closeMastery(); return; }
    this.openMastery();
  },
  openMastery(){
    // The ability screen can't be opened until the first boss awakens your abilities.
    if(!p1 || !p1.abilitiesUnlocked){
      if(typeof showToast==='function') showToast('🔒 Ability mastery unlocks after you clear the first boss.', 2400);
      return;
    }
    this.closeInventory();
    if(this.skillsOpen) this.closeSkills();     // the two trees never stack
    this.masteryOpen=true;
    if(typeof Tips!=='undefined') Tips.show('mastery');
    this.renderMastery();
    this._show('masteryScreen', true);
  },
  closeMastery(){
    this.masteryOpen=false;
    this._show('masteryScreen', false);
    this.updateHUD();                 // the 🎓 badge reflects freshly spent points
  },
  renderMastery(){
    const body=this.$('masteryBody'); if(!body) return;
    const p=p1; if(!p){ body.innerHTML=''; return; }
    const b=Breeds.get(p.breed);
    const mp=p.masteryPoints||0;
    const nodes=Mastery.nodesFor(p.breed);
    const row=n=>{
      const lvl=Mastery.level(p,n.id);
      const pips=`<span class="sk-pips">${Array.from({length:n.max},(_,i)=>`<span class="st-pip${i<lvl?' on':''}"></span>`).join('')}</span>`;
      const nextCost=lvl<n.max ? Mastery.costFor(lvl) : 0;
      const cur=(n.levels && lvl>0) ? `<div class="sk-lvldesc">${n.levels[Math.min(lvl,n.levels.length)-1]}</div>` : '';
      const next=(n.levels && lvl<n.max) ? `<div class="sk-lvldesc next">Next (${nextCost} 🎓): ${n.levels[lvl]}</div>` : '';
      return `<div class="sk-node${n.locked?' locked':''}">
        <div class="sk-head">
          <span class="sk-name">${n.icon} ${n.name}${lvl===0?' <span class="sk-lock">🔒</span>':''}</span>
          ${pips}
          <span class="sk-btns">
            <button class="sk-btn" data-act="mdown" data-node="${n.id}" ${lvl<=0?'disabled':''}>−</button>
            <button class="sk-btn" data-act="mup" data-node="${n.id}" ${(n.locked||lvl>=n.max||mp<nextCost)?'disabled':''}>+</button>
          </span>
        </div>
        <div class="sk-desc">${n.desc}</div>
        ${cur}${next}
      </div>`;
    };
    body.innerHTML=`
      <div class="sk-meta">${b.emoji} <b>${b.name}</b> · 🎓 Mastery points: <b>${mp}</b> <span class="sk-note">(earned by leveling up)</span></div>
      ${nodes.map(row).join('')}`;
  },
  _onMasteryClick(ev){
    const btn=ev.target.closest('[data-act]'); if(!btn || btn.disabled) return;
    const p=p1; if(!p) return;
    const id=btn.dataset.node;
    if(btn.dataset.act==='mup'){
      if(Mastery.addPoint(p,id)){ if(typeof sfxLevelUp==='function') sfxLevelUp(); }
    } else if(btn.dataset.act==='mdown'){
      Mastery.removePoint(p,id);
    }
    this.renderMastery();
    this.renderTreeButtons();          // badge/glow follows the points left
  },

  renderJournal(){
    const body=this.$('questBody'); if(!body) return;
    const Q=(typeof Quests!=='undefined') ? Quests : null;
    let html='';

    // The current level's completion objective (the "main quest").
    const lvl=(typeof LevelManager!=='undefined') && LevelManager.current;
    const lq=lvl && lvl.quest;
    if(lq){
      const done=(typeof lq.isComplete==='function') && lq.isComplete();
      html += `<div class="q-sect">Level Objective</div>`
        + `<div class="q-card${done?' done':''}">`
        + `<div class="q-head"><span class="q-name">📍 ${lvl.name}</span>${done?'<span class="q-badge ok">✓ Done</span>':''}</div>`
        + `<div class="q-desc">${lq.label || 'Reach the goal'}</div>`
        + `<div class="q-meta">${typeof lq.describe==='function'?lq.describe():''}</div>`
        + `</div>`;
    }

    if(Q){
      const card=({giver,q}, opts)=>{
        const reward=Q.rewardText(q);
        return `<div class="q-card${opts.done?' done':''}">`
          + `<div class="q-head"><span class="q-name">🐾 ${giver}</span>${opts.badge}</div>`
          + `<div class="q-desc">Bring ${Q.summary(q)}</div>`
          + (opts.meta?`<div class="q-meta">${opts.meta}</div>`:'')
          + (reward?`<div class="q-reward">🎁 Reward: ${reward}</div>`:'')
          + `</div>`;
      };
      const active=Q.entriesInState('active');
      const avail =Q.entriesInState('available');
      const done  =Q.entriesInState('done');

      if(active.length){
        html += `<div class="q-sect">Active (${active.length})</div>`;
        html += active.map(e=>{
          const ready=Q.readyToTurnIn(e.q), pr=Q.bestProgress(e.q);
          return card(e, {
            badge: ready?'<span class="q-badge ok">✓ Ready</span>':`<span class="q-badge">${pr.have}/${pr.need}</span>`,
            meta: ready?'Head back to hand it in!':`You have ${pr.have} of ${pr.need}.`,
          });
        }).join('');
      }
      if(avail.length){
        html += `<div class="q-sect">Available (${avail.length})</div>`;
        html += avail.map(e=>card(e, { badge:'<span class="q-badge new">! New</span>', meta:'Talk to them to accept.' })).join('');
      }
      if(done.length){
        html += `<div class="q-sect">Completed (${done.length})</div>`;
        html += done.map(e=>card(e, { badge:'<span class="q-badge ok">✓</span>', done:true })).join('');
      }
      if(!active.length && !avail.length && !done.length && !lq){
        html += `<div class="q-empty">No quests here yet — look for animal friends with a glowing <b>❗</b> and say hello!</div>`;
      }
    }
    body.innerHTML=html;
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

  // ESC: close whatever is open (blocking panel first, then non-blocking overlays), else pause.
  togglePause(){
    if(this.panel){ this.closePanel(); return; }
    if(this.masteryOpen){ this.closeMastery(); return; }
    if(this.skillsOpen){ this.closeSkills(); return; }
    if(this.journalOpen){ this.closeJournal(); return; }
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openPause();
  },

  openPause(){
    if(Game.state!==SCENES.PLAYING) return;
    this.closeInventory();            // never stack pause on top of a non-blocking overlay
    this.closeJournal();
    this.closeSkills();
    this.panel='pause'; Game.state=SCENES.PAUSED;
    this.showSeed('pauseSeed');
    this._show('pauseScreen', true);
  },

  // Print the run seed into a small label (pause menu / world map). Clicking copies it,
  // so a layout you like can be replayed or shared.
  showSeed(elId){
    const el=this.$(elId); if(!el || typeof Run==='undefined') return;
    el.textContent='🌱 Seed: '+Run.label();
    if(el._seedWired) return;
    el._seedWired=true;
    el.addEventListener('click', ()=>{
      const txt=Run.label();
      const done=()=>showToast('🌱 Seed copied: '+txt, 1600);
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, ()=>showToast('🌱 Seed: '+txt, 2000));
      else showToast('🌱 Seed: '+txt, 2000);
    });
  },

  // ---------- item tooltip (hover in inventory / shop / quest) ----------
  showItemTip(id, clientX, clientY){
    if(this._dragging) return;                 // don't cover items mid drag-drop
    const el=this.$('itemTip'); if(!el || typeof Items==='undefined') return;
    const d=Items.describe(id); if(!d){ this.hideItemTip(); return; }
    el.innerHTML=`<div class="tip-name">${d.icon} ${d.name}</div>`
      + `<div class="tip-type">${d.typeLabel}</div>`
      + d.effects.map(e=>`<div class="tip-eff${e.bad?' bad':''}">${e.text}</div>`).join('')
      + d.flavor.map(f=>`<div class="tip-flav">${f}</div>`).join('')
      + (d.value?`<div class="tip-val">Value: ${d.value} 🦴</div>`:'');
    el.style.display='block';
    this._moveItemTip(clientX, clientY);
  },
  _moveItemTip(clientX, clientY){
    const el=this.$('itemTip'); if(!el || el.style.display==='none') return;
    const w=el.offsetWidth, h=el.offsetHeight;
    let x=clientX+14, y=clientY+16;
    if(x+w>window.innerWidth-6) x=clientX-w-14;   // flip left near the right edge
    if(y+h>window.innerHeight-6) y=clientY-h-16;   // flip up near the bottom
    el.style.left=Math.max(4,x)+'px'; el.style.top=Math.max(4,y)+'px';
  },
  hideItemTip(){ const el=this.$('itemTip'); if(el) el.style.display='none'; },

  // Ability tooltip (hotbar Q/E/R slots + mastery nodes). Shows the current-level
  // effect and what the next rank adds, from the ability's mastery node.
  showAbilityTip(node, clientX, clientY){
    if(this._dragging) return;
    const el=this.$('itemTip'); if(!el) return;
    const p=p1;
    const nd=(typeof Mastery!=='undefined' && p) ? Mastery.node(p.breed, node) : null;
    if(!nd){ this.hideItemTip(); return; }
    const lvl=(typeof Skills!=='undefined' && p) ? Skills.level(p, node) : 0;
    const cur=(nd.levels && lvl>0) ? nd.levels[Math.min(lvl, nd.levels.length)-1] : null;
    const next=(nd.levels && lvl<nd.max) ? nd.levels[lvl] : null;
    el.innerHTML=`<div class="tip-name">${nd.icon} ${nd.name}</div>`
      + `<div class="tip-type">Ability · ${lvl>0?`Level ${lvl}/${nd.max}`:'Locked 🔒'}</div>`
      + `<div class="tip-flav">${nd.desc}</div>`
      + (cur?`<div class="tip-eff">Now: ${cur}</div>`:'')
      + (next?`<div class="tip-val">Next: ${next}</div>`:'')
      + (lvl===0?`<div class="tip-flav">Unlock in the 🎓 Mastery tree (between levels)</div>`:'');
    el.style.display='block';
    this._moveItemTip(clientX, clientY);
  },

  // ---------- inventory + stats ----------
  // Inventory is a non-blocking overlay: it does NOT change Game.state, so the world
  // keeps simulating while it's open, and it docks over part of the frame (see CSS).
  toggleInventory(){
    if(this.invOpen){ this.closeInventory(); return; }
    if(Game.state===SCENES.PLAYING) this.openInventory();
  },

  openInventory(){
    this.closeJournal();              // one non-blocking overlay at a time
    this.closeSkills();
    this.invOpen=true;
    this._invPlayer=0;
    if(typeof Tips!=='undefined') Tips.show('inventory');
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
      return `<button class="doll-slot slot-${slot}${id?' filled':''}" data-act="unequip" data-drop="equip" data-slot="${slot}" ${id?`draggable="true" data-drag="equip" data-item="${id}"`:''} title="${label}${id?': drag off or click to remove':' (drop a '+label.toLowerCase()+' item here)'}">`
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
        + (c?` draggable="true" data-drag="slot" data-act="item" data-item="${c.id}"`:'')
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
    // Size the 92×100 doll to device pixels; keep the CSS box at 92×100 and use logical
    // dims below so the dog stays crisp on HiDPI. Base transform = dpr; g.scale(S) composes.
    const dpr=(typeof hiDPI==='function')?hiDPI():1, LW=92, LH=100;
    if(cv.width!==Math.round(LW*dpr)){ cv.width=Math.round(LW*dpr); cv.height=Math.round(LH*dpr); cv.style.width=LW+'px'; cv.style.height=LH+'px'; }
    g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=false;
    g.clearRect(0,0,LW,LH);
    const S=1.28;                                 // scale the whole dog up for a bigger preview
    const t=(typeof performance!=='undefined')?performance.now():0;
    g.save(); g.scale(S,S);
    const cx=(LW/S)/2, cy=(LH/S)/2+5;
    const a=(typeof Wearables!=='undefined') ? Wearables.anchor(cx, cy, 'down', p.equipment||{}, t, p.breed) : null;
    if(a) Wearables.drawBack(g, a);
    drawBreedPreviewInline(g, p.breed, cx, cy, t);
    if(a) Wearables.drawFront(g, a);
    g.restore();
  },

  // ---------- hotbar (always-visible, mirrors the inventory's first row) ----------
  // Two ability slots (the dog's active abilities, fired with the Ability 1/2 keys)
  // sit left of a divider; keys 1..N map to the first HOTBAR inventory slots. Anything
  // can sit in the number slots; only some item types do something when used (useHotbar).
  renderHotbar(){
    const bar=this.$('hotbar'); if(!bar) return;
    const show = Game.state===SCENES.PLAYING||Game.state===SCENES.PAUSED||Game.state===SCENES.DIALOG||this.invOpen;
    bar.style.display = show ? 'flex' : 'none';
    if(!show){ bar.innerHTML=''; return; }
    let html='';
    // Ability slots — filled from the breed's abilities (data/breeds.js); empty slots
    // stay visible (dashed) so every dog shows where future abilities will live. Slots
    // 0/1 are the standard abilities (Q/E); slot 2 is the ULTIMATE (R), styled apart.
    const abilities=(p1&&p1.abilities)||[];
    for(let i=0;i<3;i++){
      const id=abilities[i];
      const def=Abilities.get(id);
      const ult=(i===2);
      const b=Input.bindings['ability'+(i+1)];
      const key=Input.keyName(b[0]||b[1]);
      // Abilities are dormant until the first boss awakens them (p1.abilitiesUnlocked);
      // after that they're usable at their mastery rank (0 = the base tier). A carried but
      // still-dormant ability shows as an empty slot that points at the boss.
      const lvl=(def && def.skillNode && typeof Skills!=='undefined' && p1) ? Skills.level(p1,def.skillNode) : (def?0:0);
      const learned=!!(def && p1 && p1.abilitiesUnlocked);
      const emptyLabel=ult ? 'Ultimate — coming soon' : 'No ability yet';
      const title=learned ? `${def.name||'Ability'}${def.skillNode?' L'+lvl:''} — press ${key}`
                : def ? `${def.name} — awakens after you clear the first boss`
                : emptyLabel;
      html+=`<button class="hb-slot hb-ability${ult?' hb-ultimate':''}${learned?'':' empty'}" ${def&&def.skillNode?`data-ability="${def.skillNode}"`:''} title="${title}">`
        + `<span class="hb-key">${key}</span>`
        + (learned?`<span class="hb-icon">${def.icon||'✨'}</span>`:(ult?'<span class="hb-icon hb-ult-mark">★</span>':''))
        + (learned?`<span class="hb-cd" data-ability="${id}"><i></i><b></b></span>`:'')
        + `</button>`;
    }
    html+='<span class="hb-sep"></span>';
    const cells=p1?Inventory.cells(p1):[];
    for(let i=0;i<Inventory.HOTBAR;i++){
      const c=cells[i], def=c?Items.get(c.id):null;
      html+=`<button class="hb-slot${c?' filled':''}" data-act="hotbar" data-idx="${i}" ${c?`data-item="${c.id}"`:''} ${def?`title="${def.name} — press ${i+1}"`:''}>`
        + `<span class="hb-key">${i+1}</span>`
        + (c?`<span class="hb-icon">${def?def.icon:'❓'}</span>${c.qty>1?`<span class="hb-qty">${c.qty}</span>`:''}`:'')
        + `</button>`;
    }
    bar.innerHTML=html;
  },

  // Per-frame cooldown sweep on the hotbar ability slots (called from main.js).
  // Only touches styles/text — no innerHTML rebuild, so it's cheap every frame.
  tickCooldowns(){
    if(!p1) return;
    document.querySelectorAll('.hb-cd').forEach(el=>{
      const id=el.dataset.ability;
      const left=Abilities.cdLeft(p1, id);
      if(left<=0){ if(el.style.display!=='none'){ el.style.display='none'; } return; }
      const total=el._total && el._total>=left ? el._total : left;   // remember the start for the sweep
      el._total=total;
      if(el.style.display!=='flex') el.style.display='flex';
      el.querySelector('i').style.height=Math.round((left/total)*100)+'%';
      const secs=Math.ceil(left/1000);
      const label=el.querySelector('b');
      if(label.textContent!==String(secs)) label.textContent=secs;
      if(left<=16) el._total=0;                                      // reset for the next use
    });
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
      // Standing near Lolla's placed cannon, using a ball loads the magazine instead.
      const turret=(cell.id==='ball' && typeof Abilities!=='undefined') ? Abilities.get('ballCannon') : null;
      const res=turret && turret.tryLoadBall ? turret.tryLoadBall(p) : false;
      if(res==='loaded'){ Inventory.removeAt(p, n-1, 1); }
      else if(res!=='full'){
        if(typeof sfxCollect==='function') sfxCollect();
        showToast(`🎾 You play with the ${def.name}!`,1200);
      }
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

  // ---------- dialog / shop / quest ----------
  openDialog(npc, player){
    this.closeInventory();            // dialog is blocking; don't stack it over an overlay
    this.closeJournal();
    this.closeSkills();
    this.panel='dialog'; Game.state=SCENES.DIALOG;
    this._dialog={ npc, player };
    // First-time tips for the two NPC roles (a tip surfaces over the dialog, then dismisses
    // back to it). A quest-giver teaches quests; a plain merchant teaches shopping.
    if(typeof Tips!=='undefined'){
      if(npc.quest) Tips.show('quest');
      else if(npc.wares && npc.wares.length) Tips.show('shop');
    }
    const q=npc.quest, hasQuests=(typeof Quests!=='undefined');
    if(q && hasQuests && Quests.stateOf(q)!=='done') this.renderQuest();           // offer / progress / turn-in
    else this.renderDialog(q && q.done ? q.done : npc.greeting);                   // finished quest → thanks; else shop/talk
    this._show('dialogScreen', true);
  },

  // Quest dialog: offer it, report progress, or take the hand-in — driven by quest state.
  renderQuest(){
    const d=this._dialog; if(!d || !d.npc.quest) return;
    const npc=d.npc, p=d.player, q=npc.quest;
    this.$('dialogName').textContent=npc.name;
    const choices=this.$('dialogChoices'); choices.innerHTML='';
    const add=(label,fn,item)=>{ const b=document.createElement('button'); b.className='dialog-choice'; b.textContent=label; if(item) b.dataset.item=item; b.addEventListener('click',fn); choices.appendChild(b); };
    const reqItem=q.give && q.give.item;   // the quest's required item, for hover tooltips
    const st=Quests.stateOf(q);
    if(st==='available'){
      this.$('dialogText').textContent = q.offer || `Could you help me? I need ${Quests.summary(q)}.`;
      add(`✔ Sure, I'll help!`, ()=>{ Quests.accept(q); if(typeof sfxDeliver==='function') sfxDeliver(); this.renderQuest(); }, reqItem);
      add(`🐾 Maybe later`, ()=>this.closePanel());
    } else if(Quests.canComplete(q, p)){
      this.$('dialogText').textContent = q.ready || `You've got ${Quests.summary(q)} — hand them over?`;
      add(`✅ ${Quests.turnInLabel(q)}`, ()=>{ const r=Quests.complete(q, p); if(typeof sfxCheer==='function') sfxCheer(); this.updateHUD(); this.renderDialog(q.done || `Thank you so much! 💛${r?(' ('+r+')'):''}`); }, reqItem);
      add(`🐾 Not yet`, ()=>this.closePanel());
    } else {
      this.$('dialogText').textContent = Quests.progressText(q, p);
      add(`👍 Okay`, ()=>this.closePanel());
    }
  },

  renderDialog(text){
    const d=this._dialog; if(!d) return;
    this.$('dialogName').textContent=d.npc.name;
    this.$('dialogText').textContent=text;
    const choices=this.$('dialogChoices');
    choices.innerHTML='';

    // Shop: buy items with treats as currency. Each NPC supplies its own `wares`
    // (see level generate()); fall back to a default stall if none is set — but a pure
    // quest-giver (has a quest, no wares) shows no shop, just its text.
    const wares=(d.npc.wares && d.npc.wares.length) ? d.npc.wares : (d.npc.quest ? [] : [{id:'biscuit',cost:3},{id:'ribbon',cost:5}]);
    wares.forEach(w=>{
      const def=Items.get(w.id); if(!def) return;
      // Smart dogs haggle: the smarts bar (data/breeds.js) discounts the NPC's price.
      const price=Math.max(1, Math.round(w.cost * ((d.player.stats && d.player.stats.priceMul) || 1)));
      const afford=d.player.treats>=price;
      const btn=document.createElement('button');
      btn.className='dialog-choice'+(afford?'':' disabled');
      btn.textContent=`${def.icon} Buy ${def.name} — ${price} 🦴`;
      btn.dataset.item=w.id;   // hover for effects/stats
      btn.addEventListener('click',()=>{
        if(d.player.treats<price){ this.renderDialog("You don't have enough treats for that."); return; }
        if(Inventory.roomFor(d.player, w.id) < 1){ this.renderDialog("Your bag is full! Make some room first."); return; }
        d.player.treats-=price; Inventory.add(d.player, w.id, 1); this.updateHUD();
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
    this.closeJournal();
    this.closeSkills();
    this._show('pauseScreen', false);
    this._show('dialogScreen', false);
    this.panel=null; this._dialog=null;
    Game.state=SCENES.GAMEOVER;
    if(typeof stopMusic==='function') stopMusic();   // the sad faint sound already played
    const t=this.$('gameOverText'); if(t) t.textContent=`Your dog fainted... but every good dog gets another chance.`;
    this._show('gameOverScreen', true);
    this.renderHotbar();              // hide the hotbar
  },

  // ---------- menu transitions ----------
  quitToMenu(){
    this.closeInventory();
    this.closeJournal();
    this.closeSkills();
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
    // Saving/loading goes through the slot picker (save-ui.js).
    on('btnSave', ()=>{ if(typeof SaveUI!=='undefined') SaveUI.open('save','pause'); });
    on('btnLoad', ()=>{ if(typeof SaveUI!=='undefined') SaveUI.open('load','pause'); });
    // Start-screen "Continue" appears only when a save exists.
    on('btnContinue', ()=>{ if(typeof SaveUI!=='undefined') SaveUI.open('load','menu'); });
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
    // Skill tree: +/− buttons (delegated) and the inventory-header shortcut button.
    const sk=this.$('skillBody'); if(sk) sk.addEventListener('click', e=>this._onSkillClick(e));
    const skBtn=this.$('btnSkills'); if(skBtn) skBtn.addEventListener('click', ()=>{ this.closeInventory(); this.openSkills(); });
    on('skillDone', ()=>this.closeSkills());   // shown only in the map's full-frame mode
    // In-game tree buttons (bottom-left of the frame) — same panels, always reachable.
    on('btnTreeSkills',  ()=>{ this.closeInventory(); this.toggleSkills(); });
    on('btnTreeMastery', ()=>{ this.closeInventory(); this.toggleMastery(); });
    // Mastery tree (world-map only): the body's +/- buttons, its Done button, and the
    // world-map "Mastery" button that opens it.
    // Hover tooltips — one delegated handler covers items (inventory tiles, doll slots,
    // hotbar item slots, shop/quest buttons → [data-item]) and abilities (hotbar Q/E/R
    // slots → [data-ability]).
    const SEL='[data-item],[data-ability]';
    const tipFor=(el, x, y)=>{ if(el.dataset.ability) this.showAbilityTip(el.dataset.ability, x, y); else this.showItemTip(el.dataset.item, x, y); };
    document.addEventListener('mouseover', e=>{ const el=e.target.closest(SEL); if(el) tipFor(el, e.clientX, e.clientY); });
    document.addEventListener('mousemove', e=>{ if(this.$('itemTip').style.display!=='none'){ if(e.target.closest(SEL)) this._moveItemTip(e.clientX, e.clientY); else this.hideItemTip(); } });
    document.addEventListener('mouseout', e=>{ const el=e.target.closest(SEL); if(el && !el.contains(e.relatedTarget)) this.hideItemTip(); });

    const mb=this.$('masteryBody'); if(mb) mb.addEventListener('click', e=>this._onMasteryClick(e));
    const mDone=this.$('masteryDone'); if(mDone) mDone.addEventListener('click', ()=>this.closeMastery());
    const mOpen=this.$('wmMastery'); if(mOpen) mOpen.addEventListener('click', ()=>this.toggleMastery());
    // The world map's 🌳 button reopens the skill tree after you've closed it there.
    const sOpen=this.$('wmSkills'); if(sOpen) sOpen.addEventListener('click', ()=>{ this.skillsOpen ? this.closeSkills() : this.openSkills(); });
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
