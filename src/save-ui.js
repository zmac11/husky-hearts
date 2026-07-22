// ====================== SAVE PICKER ======================
// One overlay (#savesScreen) in two modes:
//   open('save') — pick a slot to write into (occupied slots ask before overwriting)
//   open('load') — pick a slot to load, or 🗑 delete one
//
// Slot 'auto' is the autosave (written by LevelManager.goTo): it can be loaded and
// deleted, but never picked as a save target. Storage lives in save.js.

const SaveUI = {
  mode: 'load',
  _returnTo: null,   // 'pause' | 'menu' — where the ✕ button goes back to
  _pending: null,    // { action:'save'|'delete', slot } awaiting the inline confirm
  _wired: false,

  isOpen(){ const el=document.getElementById('savesScreen'); return !!el && getComputedStyle(el).display!=='none'; },

  open(mode, returnTo){
    this.mode = mode==='save' ? 'save' : 'load';
    this._returnTo = returnTo || (Game.state===SCENES.PAUSED ? 'pause' : 'menu');
    this._pending = null;
    if(this._returnTo==='pause' && typeof UI!=='undefined') UI._show('pauseScreen', false);
    this.render();
    if(typeof UI!=='undefined') UI._show('savesScreen', true);
    this._wire();
  },

  close(){
    this._pending=null;
    if(typeof UI!=='undefined') UI._show('savesScreen', false);
    if(this._returnTo==='pause' && Game.state===SCENES.PAUSED && typeof UI!=='undefined') UI._show('pauseScreen', true);
    this._returnTo=null;
  },

  // ---------- rendering ----------
  _when(ts){
    if(!ts) return '';
    const d=new Date(ts), pad=n=>String(n).padStart(2,'0');
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  _card(id, meta){
    const isAuto = id===Save.AUTO;
    const title = isAuto ? '⏱ Autosave' : `Slot ${id}`;
    const saving = this.mode==='save';
    const pending = this._pending && this._pending.slot===id;
    // The autosave is never a save target — it belongs to the game, not the player.
    const disabled = saving && isAuto;

    if(pending){
      const what = this._pending.action==='delete' ? 'Delete this save?' : 'Overwrite this save?';
      return `<div class="save-slot confirming">
        <div class="ss-title">${title}</div>
        <div class="ss-confirm">${what}</div>
        <div class="ss-confirm-btns">
          <button class="modebtn" data-confirm="yes">✓ Yes</button>
          <button class="modebtn secondary" data-confirm="no">✕ No</button>
        </div>
      </div>`;
    }

    if(!meta){
      return `<div class="save-slot empty${disabled?' disabled':''}"${disabled?'':` data-slot="${id}"`}>
        <div class="ss-title">${title}</div>
        <div class="ss-empty">${saving && !disabled ? '＋ Save here' : '— empty —'}</div>
      </div>`;
    }

    return `<div class="save-slot${disabled?' disabled':''}"${disabled?'':` data-slot="${id}"`}>
      <div class="ss-title">${title}${disabled?' <span class="ss-tag">auto only</span>':''}</div>
      <div class="ss-row"><b>${meta.breedIcon||'🐕'} ${meta.breedName||meta.breed}</b> · Lv ${meta.dogLevel||1}</div>
      <div class="ss-row">${meta.envIcon||'🐾'} ${meta.levelName||'—'}</div>
      <div class="ss-row dim">🌱 ${meta.seedText||'—'} · 🗺️ ${meta.levelsVisited||0} explored</div>
      <div class="ss-row dim">${this._when(meta.at)}</div>
      ${this.mode==='load' ? `<button class="ss-del" data-del="${id}" title="Delete this save">🗑</button>` : ''}
    </div>`;
  },

  render(){
    const body=document.getElementById('savesBody'); if(!body) return;
    const head=document.getElementById('savesTitle');
    if(head) head.textContent = this.mode==='save' ? '💾 Save Game' : '📂 Load Game';
    const hint=document.getElementById('savesHint');
    if(hint) hint.textContent = this.mode==='save'
      ? 'Pick a slot to save into · the autosave updates by itself'
      : 'Pick a save to load · 🗑 removes one';
    body.innerHTML = Save.list().map(s=>this._card(s.id, s.meta)).join('');
  },

  // ---------- actions ----------
  _pick(slotId){
    if(this.mode==='save'){
      if(!Save.isEmpty(slotId)){ this._pending={ action:'save', slot:slotId }; this.render(); return; }
      this._doSave(slotId);
    } else {
      if(Save.isEmpty(slotId)) return;
      this.close();
      Save.read(slotId);
    }
  },

  _doSave(slotId){
    if(Save.write(slotId)) this.close();
    else this.render();
  },

  _confirm(ok){
    const p=this._pending; this._pending=null;
    if(!ok || !p){ this.render(); return; }
    if(p.action==='delete'){ Save.remove(p.slot); this.render(); }
    else this._doSave(p.slot);
  },

  _wire(){
    if(this._wired) return; this._wired=true;
    const body=document.getElementById('savesBody');
    if(body) body.addEventListener('click', e=>{
      const yes=e.target.closest('[data-confirm]');
      if(yes){ this._confirm(yes.dataset.confirm==='yes'); return; }
      const del=e.target.closest('[data-del]');
      if(del){ this._pending={ action:'delete', slot:del.dataset.del }; this.render(); return; }
      const card=e.target.closest('[data-slot]');
      if(card) this._pick(card.dataset.slot);
    });
    const close=document.getElementById('savesClose');
    if(close) close.addEventListener('click', ()=>this.close());
  },
};
