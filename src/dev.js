// ====================== DEV MODE ======================
// A testing panel to jump straight into any level/biome, skipping the menu and
// char-select. Lists every campaign environment (data/campaign.js) with its levels;
// levels backed by a registered, playable level are buttons, the rest show "soon".
//
// Open it from the "🛠 Dev Mode" button on the start screen, or press the backtick key
// (`) anytime (see core/input.js). Purely a dev convenience — nothing here affects a
// normal playthrough.

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
    let html='';
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

  // Boot a solo run straight into `levelId` with the currently-selected dogs.
  play(levelId){
    if(!(typeof Levels!=='undefined' && Levels.get(levelId))) return;
    this._pausedByDev=false;
    this.close();
    twoPlayer=false;
    const p2p=document.getElementById('p2panel'); if(p2p) p2p.style.display='none';
    const p2c=document.getElementById('p2controls'); if(p2c) p2c.style.display='none';
    const ss=document.getElementById('startScreen'); if(ss) ss.style.display='none';
    if(typeof WorldMap!=='undefined') WorldMap.hide();
    resetGame(dogConfig.p1, dogConfig.p2, levelId);
    if(typeof Abilities!=='undefined') Abilities.spawnAll();
    Game.state=SCENES.PLAYING;
    if(typeof startMusic==='function') startMusic();
    if(typeof isTouchDevice==='function' && isTouchDevice() && typeof showMobileControls==='function') showMobileControls(true);
    if(typeof showToast==='function') showToast('🛠 Dev: '+Levels.get(levelId).name, 1600);
  },

  init(){
    const body=document.getElementById('devBody');
    if(body) body.addEventListener('click', e=>{ const b=e.target.closest('[data-lvl]'); if(b) this.play(b.dataset.lvl); });
    const close=document.getElementById('devClose'); if(close) close.addEventListener('click',()=>this.close());
    const open=document.getElementById('btnDev'); if(open) open.addEventListener('click',()=>this.open());
  },
};

DevMode.init();
