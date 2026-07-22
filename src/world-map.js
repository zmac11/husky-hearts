// ====================== WORLD MAP ======================
// The between-levels campaign screen. After a level is cleared (update.js checkWin),
// this overlay shows the whole journey as a trail of environment nodes (see
// data/campaign.js), marks how far you've come, parks the dog on the current biome, and
// offers Continue (to the next real level) or Main Menu.
//
// Tapping a biome opens a drill-down card: its levels, then one level's detail (chests
// looted, NPCs and their tasks, enemies left, quest progress) with a "Travel here"
// button. Travelling back into a place you've already been restores it exactly as you
// left it (level-state.js) — that's how you get back to a shopkeeper or a quest-giver.
//
// It renders to its own <canvas> with its own requestAnimationFrame (like the char-
// select breed previews), so it animates independently of the frozen game loop.

// Logical drawing size (the canvas's declared width/height in index.html). The backing
// store is scaled up by devicePixelRatio for crispness, but all layout/hit-testing stays
// in this logical space via a context transform.
const WM_W = 600, WM_H = 250;

const WorldMap = {
  _raf: null,
  canvas: null,
  g: null,
  _nodes: [],
  _focusIndex: 0,     // which environment the dog is standing on
  _nextId: null,      // next real level to Continue into (null = no more content yet)
  _detailEnv: null,   // biome whose level list the drill-down card is showing
  _detailLevel: null, // level id whose detail the card is showing (null = list view)
  _wired: false,

  // Show the map after finishing (or revisiting and re-exiting) `finishedLevelId`.
  showAfter(finishedLevelId){
    Progress.markComplete(finishedLevelId);
    this._nextId = this._nextUncleared(finishedLevelId);
    const focusLevel = this._nextId || finishedLevelId;
    this._focusIndex = Campaign.envIndexOfLevel(focusLevel);
    this._detailEnv = null; this._detailLevel = null;

    this.canvas = document.getElementById('worldMapCanvas');
    this.g = this.canvas ? this.canvas.getContext('2d') : null;
    this._layout();
    this._configButtons();
    this._renderDetail();
    if(typeof UI!=='undefined'){ UI._show('worldMapScreen', true); UI.showSeed && UI.showSeed('wmSeed'); }
    this._wire();
    this._start();
  },

  // Where "Continue" should lead: the first real level you haven't cleared, in campaign
  // order. (Just following level.next would send you back to level 2 after you revisit
  // level 1 late in the run.) Falls back to the finished level's own `next`.
  _nextUncleared(finishedLevelId){
    for(const env of Campaign.environments){
      for(const l of env.levels){
        if(!l.real || !Levels.get(l.id)) continue;
        if(!Progress.isDone(l.id)) return l.id;
      }
    }
    const lvl = Levels.get(finishedLevelId);
    return (lvl && lvl.next && Levels.get(lvl.next)) ? lvl.next : null;
  },

  hide(){
    this._stop();
    this._detailEnv=null; this._detailLevel=null;
    if(typeof UI!=='undefined'){ UI.closeMastery && UI.closeMastery(); UI._show('worldMapScreen', false); }
  },

  // Continue into the next real level.
  advance(){ if(this._nextId) this.travelTo(this._nextId); },

  // Walk into any level you're allowed to enter — the next one along, or somewhere you've
  // already been (which comes back exactly as you left it).
  travelTo(id){
    if(!id || typeof LevelManager==='undefined' || !LevelManager.goTo) return;
    this.hide();
    LevelManager.goTo(id);
    Game.state = SCENES.PLAYING;
    if(typeof updateHUD==='function') updateHUD();   // hotbar shows once PLAYING
    if(typeof startMusic==='function') startMusic();
  },

  // ---------- layout ----------
  _layout(){
    if(!this.canvas) return;
    const W=WM_W, H=WM_H;
    const envs=Campaign.environments, n=envs.length;
    const cols=4, marginX=70, topY=56, rowGap=124;
    const usableW=W-marginX*2;
    this._nodes=[];
    for(let i=0;i<n;i++){
      const row=Math.floor(i/cols);
      let col=i%cols;
      if(row%2===1) col=(cols-1)-col;             // serpentine: alternate rows reverse
      const x=marginX + (cols>1 ? col*(usableW/(cols-1)) : 0);
      const y=topY + row*rowGap;
      this._nodes.push({ env:envs[i], x, y, index:i });
    }
  },

  _statusOf(i){ return i<this._focusIndex ? 'cleared' : (i===this._focusIndex ? 'current' : 'locked'); },

  // ---------- draw ----------
  _start(){
    this._stop();
    const step=(t)=>{ this.draw(t); this._raf=requestAnimationFrame(step); };
    this._raf=requestAnimationFrame(step);
  },
  _stop(){ if(this._raf){ cancelAnimationFrame(this._raf); this._raf=null; } },

  draw(t){
    const g=this.g; if(!g) return;
    const W=WM_W, H=WM_H;
    // Size the backing store to device pixels and draw through a matching transform so
    // the parchment map stays crisp on high-DPI screens (layout below is in logical space).
    const dpr=(typeof hiDPI==='function')?hiDPI():1;
    if(this.canvas.width!==Math.round(W*dpr)){
      this.canvas.width=Math.round(W*dpr); this.canvas.height=Math.round(H*dpr);
      this.canvas.style.width=W+'px'; this.canvas.style.height=H+'px';
    }
    g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=false;
    g.clearRect(0,0,W,H);
    // parchment backdrop (canvas corners are rounded via CSS)
    g.fillStyle='#F4EAD4'; g.fillRect(0,0,W,H);
    g.fillStyle='rgba(198,170,120,0.10)';
    for(let i=0;i<70;i++){ const r=mulberry32(i*7+1); g.fillRect((r()*W)|0,(r()*H)|0,3,2); }

    // trail connecting the nodes in order
    g.strokeStyle='rgba(150,116,74,0.55)'; g.lineWidth=3; g.setLineDash([6,7]);
    g.beginPath();
    this._nodes.forEach((n,i)=>{ if(i===0) g.moveTo(n.x,n.y); else g.lineTo(n.x,n.y); });
    g.stroke(); g.setLineDash([]);

    this._nodes.forEach(n=>this._drawNode(g,n,t));

    // dog token bobbing over the focus (current) node
    const f=this._nodes[this._focusIndex];
    if(f){
      const bob=Math.sin(t/300)*3;
      g.font='22px serif'; g.textAlign='center'; g.textBaseline='middle';
      g.fillText('🐕', f.x, f.y-36-bob);
    }
  },

  _drawNode(g,n,t){
    const env=n.env, R=24, status=this._statusOf(n.index), locked=status==='locked';
    // base disc
    g.beginPath(); g.arc(n.x,n.y,R,0,Math.PI*2);
    g.fillStyle = locked ? '#D3CBBB' : env.color; g.fill();
    // ring by status
    let ringC='#B8AEA0', ringW=3;
    if(status==='cleared'){ ringC='#E6B24A'; ringW=4; }
    else if(status==='current'){ ringC='#4FAE54'; ringW=3+(1+Math.sin(t/220))*1.6; }
    g.lineWidth=ringW; g.strokeStyle=ringC;
    g.beginPath(); g.arc(n.x,n.y,R,0,Math.PI*2); g.stroke();
    // biome icon
    g.globalAlpha=locked?0.5:1;
    g.font='22px serif'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(env.icon, n.x, n.y+1);
    g.globalAlpha=1;
    // corner badge
    if(status==='cleared') this._badge(g,n.x+R-3,n.y-R+3,'#E6B24A','✓','#4A3A10');
    else if(locked){ g.font='13px serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('🔒', n.x+R-2, n.y-R+5); }
    // name
    g.fillStyle=locked?'#A99C88':'#5A4A38'; g.font='bold 10px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(env.name, n.x, n.y+R+13);
    // sub-level pips (3 levels + boss diamond)
    this._drawPips(g, env, n.x, n.y+R+26);
  },

  // Per-level pips under a biome: gold = cleared, tan = visited but unfinished, cream =
  // playable and untouched, faded = not built yet. A green ring marks where you are.
  _drawPips(g, env, cx, cy){
    const lv=env.levels, n=lv.length, gap=11, startX=cx-((n-1)*gap)/2;
    const cur=(typeof LevelManager!=='undefined') && LevelManager.current;
    lv.forEach((l,i)=>{
      const x=startX+i*gap, done=Progress.isDone(l.id), real=!!l.real;
      const seen=(typeof LevelState!=='undefined') && LevelState.has(l.id);
      const here=cur && cur.id===l.id;
      if(l.kind==='boss'){
        g.beginPath(); g.moveTo(x,cy-4); g.lineTo(x+4,cy); g.lineTo(x,cy+4); g.lineTo(x-4,cy); g.closePath();
        g.fillStyle = done ? '#E6B24A' : (seen ? '#D8C69A' : (real ? '#C8B48A' : '#DDD2BE')); g.fill();
        g.lineWidth=1; g.strokeStyle='#8A7A5A'; g.stroke();
      } else {
        g.beginPath(); g.arc(x,cy,3.4,0,Math.PI*2);
        g.fillStyle = done ? '#E6B24A' : (seen ? '#D8C69A' : (real ? '#FFF7E6' : '#E6DCC8'));
        g.fill(); g.lineWidth=1.2; g.strokeStyle = real ? '#8A7A5A' : '#C6BAA2'; g.stroke();
      }
      if(here){
        g.beginPath(); g.arc(x,cy,6,0,Math.PI*2);
        g.lineWidth=1.6; g.strokeStyle='#4FAE54'; g.stroke();
      }
    });
  },

  _badge(g,x,y,col,txt,txtCol){
    g.beginPath(); g.arc(x,y,7,0,Math.PI*2); g.fillStyle=col; g.fill();
    g.lineWidth=1.5; g.strokeStyle='#FFF8E8'; g.stroke();
    g.fillStyle=txtCol; g.font='bold 10px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(txt,x,y+0.5);
  },

  // ---------- buttons + clicks ----------
  _configButtons(){
    const cont=document.getElementById('wmContinue');
    const note=document.getElementById('wmNote');
    if(cont){
      if(this._nextId){
        const nx=Levels.get(this._nextId);
        cont.textContent=`Continue to ${nx.name} →`;
        cont.style.display='inline-block';
      } else {
        cont.style.display='none';
      }
    }
    if(note){
      note.textContent=this._nextId
        ? 'The trail leads onward — your journey continues!'
        : '🎉 That\'s all the trail we\'ve blazed so far — more worlds coming soon!';
    }
  },

  // ---------- drill-down card ----------
  // Where a level stands right now: what its row (and the Travel button) says.
  //   'soon'    — not built yet          'here'    — the level you're standing in
  //   'cleared' — finished               'visited' — been there, not finished
  //   'next'    — the level Continue leads to (enterable for the first time)
  //   'locked'  — real, but not reachable yet
  _statusOfLevel(l){
    if(!l.real || !(typeof Levels!=='undefined' && Levels.get(l.id))) return 'soon';
    const cur=(typeof LevelManager!=='undefined') && LevelManager.current;
    if(cur && cur.id===l.id) return 'here';
    if(Progress.isDone(l.id)) return 'cleared';
    if(typeof LevelState!=='undefined' && LevelState.has(l.id)) return 'visited';
    if(this._nextId===l.id) return 'next';
    return 'locked';
  },
  // 'here' counts: stepping back into the level you just walked out of is a normal move
  // (you left through its portal and want another look around).
  _canTravel(status){ return status==='cleared' || status==='visited' || status==='next' || status==='here'; },

  _chipFor(status){
    return { soon:'· soon', here:'▶ you are here', cleared:'✓ cleared',
             visited:'👣 visited', next:'✨ next stop', locked:'🔒 locked' }[status] || '';
  },

  openDetail(env){ this._detailEnv=env; this._detailLevel=null; this._renderDetail(); },
  closeDetail(){ this._detailEnv=null; this._detailLevel=null; this._renderDetail(); },

  _renderDetail(){
    const box=document.getElementById('wmDetail'); if(!box) return;
    if(!this._detailEnv){ box.style.display='none'; return; }
    box.style.display='flex';
    const head=document.getElementById('wmDetailHead');
    const body=document.getElementById('wmDetailBody');
    const acts=document.getElementById('wmDetailActions');
    const env=this._detailEnv;

    if(!this._detailLevel){
      // --- level list for this biome ---
      const cleared=Progress.countDone(env.levels.map(l=>l.id));
      if(head) head.innerHTML=`${env.icon} ${env.name} <span class="wm-chip">👑 ${env.boss} · ${cleared}/${env.levels.length} cleared</span>`;
      if(body) body.innerHTML=env.levels.map(l=>{
        const st=this._statusOfLevel(l);
        const cls=st==='cleared'?' cleared':(st==='here'?' here':(st==='soon'?' soon':''));
        const tag=l.kind==='boss'?'👑 ':'';
        return `<button class="wm-lvl${cls}"${st==='soon'?'':` data-lvl="${l.id}"`}>
          <span>${tag}${l.name}</span><span class="wm-chip">${this._chipFor(st)}</span></button>`;
      }).join('');
      if(acts) acts.innerHTML=`<button class="modebtn secondary" data-wm="close">✕ Close map card</button>`;
      return;
    }

    // --- one level's detail ---
    const l=env.levels.find(x=>x.id===this._detailLevel);
    const st=this._statusOfLevel(l);
    const s=(typeof LevelState!=='undefined') ? LevelState.summary(l.id) : { visited:false };
    if(head) head.innerHTML=`${l.kind==='boss'?'👑 ':'📍 '}${l.name} <span class="wm-chip">${this._chipFor(st)}</span>`;

    let rows;
    if(st==='soon') rows=`<div class="wm-stat">This part of the trail hasn't been blazed yet — coming soon!</div>`;
    else if(s.current) rows=`<div class="wm-stat">You're standing here right now. 🐾</div>`
      + `<div class="wm-stat">${this._liveLine()}</div>`;
    else if(!s.visited) rows=`<div class="wm-stat">❓ Not yet explored — no telling what's waiting.</div>`;
    else {
      const npcTxt = s.npcs.length
        ? s.npcs.map(n=>`${n.name}${n.shop?' 🛒':''}${n.quest?` (${{available:'has a task',active:'task in progress',done:'task done'}[n.quest]||n.quest})`:''}`).join(', ')
        : 'nobody about';
      rows = `<div class="wm-stat">📦 Chests: <b>${s.chests.looted}/${s.chests.total}</b> looted</div>`
           + `<div class="wm-stat">👤 NPCs: <b>${npcTxt}</b></div>`
           + `<div class="wm-stat">👹 Enemies left: <b>${s.enemies}</b> · 🐿️ Critters: <b>${s.critters}</b></div>`
           + `<div class="wm-stat">💛 Friends cheered: <b>${s.friends.cheered}/${s.friends.total}</b> · 🦴 Treats left: <b>${s.treatsLeft}</b></div>`
           + `<div class="wm-stat">${s.cleared ? '✓ Quest complete — the portal is still humming there.' : '… quest still in progress.'}</div>`;
    }
    if(body) body.innerHTML=rows;
    if(acts) acts.innerHTML =
      (this._canTravel(st) ? `<button class="modebtn" data-travel="${l.id}">🐾 ${st==='here'?'Go back in':'Travel here'}</button>` : '')
      + `<button class="modebtn secondary" data-wm="back">← Back</button>`;
  },

  // One-line summary of the level you're currently standing in (its state isn't
  // snapshotted until you leave, so read it live).
  _liveLine(){
    const chests=(typeof entities!=='undefined'?entities:[]).filter(e=>e.kind==='chest');
    const looted=chests.filter(c=>c.state==='open').length;
    const cheered=(typeof friends!=='undefined'?friends:[]).filter(f=>f.cheered).length;
    const total=(typeof friends!=='undefined'?friends:[]).length;
    const foes=(typeof entities!=='undefined'?entities:[]).filter(e=>e.kind==='enemy'||e.kind==='wolf').length;
    return `📦 ${looted}/${chests.length} chests · 💛 ${cheered}/${total} friends · 👹 ${foes} enemies`;
  },

  _onClick(ev){
    if(!this.canvas) return;
    const r=this.canvas.getBoundingClientRect();
    // Map CSS click coords into logical (WM_W×WM_H) space, where the nodes live.
    const sx=WM_W/r.width, sy=WM_H/r.height;
    const mx=(ev.clientX-r.left)*sx, my=(ev.clientY-r.top)*sy;
    const hit=this._nodes.find(n=>Math.hypot(n.x-mx,n.y-my)<26);
    if(hit) this.openDetail(hit.env);
  },

  _onDetailClick(ev){
    const trav=ev.target.closest('[data-travel]');
    if(trav){ this.travelTo(trav.dataset.travel); return; }
    const act=ev.target.closest('[data-wm]');
    if(act){ (act.dataset.wm==='back' && this._detailLevel) ? (this._detailLevel=null, this._renderDetail()) : this.closeDetail(); return; }
    const row=ev.target.closest('[data-lvl]');
    if(row){ this._detailLevel=row.dataset.lvl; this._renderDetail(); }
  },

  _wire(){
    if(this._wired) return; this._wired=true;
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('wmContinue', ()=>this.advance());
    on('wmMenu',     ()=>{ this.hide(); if(typeof UI!=='undefined') UI.quitToMenu(); });
    const det=document.getElementById('wmDetail');
    if(det) det.addEventListener('click', e=>this._onDetailClick(e));
    if(this.canvas) this.canvas.addEventListener('click', e=>this._onClick(e));
  },
};
