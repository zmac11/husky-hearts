// ====================== OPTIONS SCREEN ======================
// Key rebinding (Input.bindings) + sound volume/mute (AudioSettings). Opened from
// the start menu (⚙️ Options) or the pause menu; also owns the two always-visible
// HUD quick-mute buttons (music / effects) and keeps the on-page control hints
// (ctrl-card + footer) in sync with the current bindings.

const Options = {
  _returnTo: null,   // 'menu' | 'pause' — which screen to restore on close
  _capture:  null,   // {action, slot} while waiting for the user to press a key

  isOpen(){ const el=document.getElementById('optionsScreen'); return !!el && el.style.display==='flex'; },

  open(returnTo){
    this._returnTo=returnTo||'menu';
    if(this._returnTo==='pause' && typeof UI!=='undefined') UI._show('pauseScreen', false);
    this.render();
    document.getElementById('optionsScreen').style.display='flex';
  },

  close(){
    this._capture=null;
    const el=document.getElementById('optionsScreen'); if(el) el.style.display='none';
    if(this._returnTo==='pause' && typeof UI!=='undefined') UI._show('pauseScreen', true);
    this._returnTo=null;
    this.refreshControlHints();
    this.refreshMuteButtons();
  },

  render(){
    const el=document.getElementById('optionsScreen'); if(!el) return;
    const A=AudioSettings;
    const pct=v=>Math.round(v*100);
    el.innerHTML=`
      <h2>⚙️ Options</h2>
      <div class="opt-section">
        <div class="opt-h">🔊 Sound</div>
        <div class="opt-row">
          <span class="opt-label">🎵 Music</span>
          <input type="range" id="optMusicVol" min="0" max="100" value="${pct(A.musicVol)}">
          <span class="opt-val" id="optMusicPct">${pct(A.musicVol)}%</span>
          <button class="opt-mute ${A.musicMuted?'muted':''}" id="optMusicMute" title="Mute music">${A.musicMuted?'🔇':'🔊'}</button>
        </div>
        <div class="opt-row">
          <span class="opt-label">✨ Effects</span>
          <input type="range" id="optSfxVol" min="0" max="100" value="${pct(A.sfxVol)}">
          <span class="opt-val" id="optSfxPct">${pct(A.sfxVol)}%</span>
          <button class="opt-mute ${A.sfxMuted?'muted':''}" id="optSfxMute" title="Mute sound effects">${A.sfxMuted?'🔇':'🔊'}</button>
        </div>
      </div>
      <div class="opt-section">
        <div class="opt-h">🎮 Controls <span class="opt-hint">· click a key, then press the new one · right-click a key to clear it</span></div>
        <div id="optBindings"></div>
        <div class="opt-row" style="justify-content:center;">
          <button class="modebtn secondary" id="optReset">↺ Reset to Defaults</button>
        </div>
      </div>
      <button class="modebtn" id="optClose">✓ Done</button>`;
    this.renderBindings();

    const musicVol=document.getElementById('optMusicVol');
    musicVol.addEventListener('input',()=>{
      AudioSettings.set('musicVol', musicVol.value/100);
      document.getElementById('optMusicPct').textContent=musicVol.value+'%';
    });
    const sfxVol=document.getElementById('optSfxVol');
    sfxVol.addEventListener('input',()=>{
      AudioSettings.set('sfxVol', sfxVol.value/100);
      document.getElementById('optSfxPct').textContent=sfxVol.value+'%';
    });
    sfxVol.addEventListener('change',()=>{ if(typeof sfxCollect==='function') sfxCollect(); }); // audible feedback
    document.getElementById('optMusicMute').addEventListener('click',()=>this.toggleMute('musicMuted'));
    document.getElementById('optSfxMute').addEventListener('click',()=>this.toggleMute('sfxMuted'));
    document.getElementById('optReset').addEventListener('click',()=>{
      Input.resetBindings(); this._capture=null;
      this.renderBindings(); this.refreshControlHints();
      showToast('↺ Controls reset to defaults',1500);
    });
    document.getElementById('optClose').addEventListener('click',()=>this.close());
  },

  renderBindings(){
    const box=document.getElementById('optBindings'); if(!box) return;
    box.innerHTML=Input.ACTIONS.map(a=>{
      const b=Input.bindings[a.id];
      return `<div class="opt-row">
        <span class="opt-label">${a.label}</span>
        ${[0,1].map(slot=>{
          const listening=this._capture && this._capture.action===a.id && this._capture.slot===slot;
          return `<button class="opt-key ${listening?'listening':''} ${b[slot]?'':'empty'}"
                          data-action="${a.id}" data-slot="${slot}">
                    ${listening?'press a key…':Input.keyName(b[slot])}
                  </button>`;
        }).join('')}
      </div>`;
    }).join('');
    box.querySelectorAll('.opt-key').forEach(btn=>{
      btn.addEventListener('click',()=>{
        this._capture={action:btn.dataset.action, slot:+btn.dataset.slot};
        this.renderBindings();
      });
      btn.addEventListener('contextmenu',e=>{   // right-click clears the slot
        e.preventDefault();
        Input.clearBinding(btn.dataset.action, +btn.dataset.slot);
        this._capture=null;
        this.renderBindings(); this.refreshControlHints();
      });
    });
  },

  toggleMute(key){
    AudioSettings.set(key, !AudioSettings[key]);
    if(key==='sfxMuted' && !AudioSettings.sfxMuted && typeof sfxCollect==='function') sfxCollect();
    this.refreshMuteButtons();
    if(this.isOpen()) this.render();   // keep the Options rows in sync
  },

  // HUD quick-mute buttons (always visible in the top bar).
  refreshMuteButtons(){
    const A=AudioSettings;
    const m=document.getElementById('muteMusicBtn');
    if(m){ m.classList.toggle('muted',A.musicMuted); m.title=A.musicMuted?'Unmute music':'Mute music'; }
    const s=document.getElementById('muteSfxBtn');
    if(s){ s.textContent=A.sfxMuted?'🔇':'🔊'; s.classList.toggle('muted',A.sfxMuted); s.title=A.sfxMuted?'Unmute sound effects':'Mute sound effects'; }
  },

  // Keep the controls card + footer hints matching the current bindings.
  refreshControlHints(){
    const kn=c=>Input.keyName(c);
    const b=Input.bindings;
    const card=document.getElementById('ctrlCard');
    if(card){
      const mv=slot=>['up','left','down','right'].map(a=>b[a][slot]).filter(Boolean).map(kn).join('');
      const prim=mv(0), alt=mv(1);
      const act=[b.action[0],b.action[1]].filter(Boolean).map(kn).join(' / ');
      card.innerHTML=`<b>Controls</b>${prim||'—'}${alt?' or '+alt:''} · ${act||'—'} to howl/deliver`;
    }
    const foot=document.getElementById('footKeys');
    if(foot){
      foot.innerHTML=`<b>Esc</b> pause · <b>${kn(b.inventory[0]||b.inventory[1])}</b> inventory · <b>${kn(b.journal[0]||b.journal[1])}</b> quests`;
    }
    // Hotbar ability slots show their bound keys — keep them in sync too.
    if(typeof UI!=='undefined' && UI.renderHotbar) UI.renderHotbar();
  },

  init(){
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('btnOptions',      ()=>this.open('menu'));
    on('btnPauseOptions', ()=>this.open('pause'));
    on('muteMusicBtn',    ()=>this.toggleMute('musicMuted'));
    on('muteSfxBtn',      ()=>this.toggleMute('sfxMuted'));

    // Capture-phase listener grabs the next keypress while rebinding, before the
    // game's own keydown handler can react to it. Escape cancels the rebind.
    window.addEventListener('keydown', e=>{
      if(!this._capture) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if(e.code!=='Escape') Input.setBinding(this._capture.action, this._capture.slot, e.code);
      this._capture=null;
      this.renderBindings();
      this.refreshControlHints();
    }, true);

    this.refreshMuteButtons();
    this.refreshControlHints();
  },
};

Options.init();
