// ====================== WORLD MAP ======================
// The between-levels campaign screen. After a level is cleared (update.js checkWin),
// this overlay shows the whole journey as a trail of environment nodes (see
// data/campaign.js), marks how far you've come, parks the dog on the current biome, and
// offers Continue (to the next real level) or Main Menu.
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
  _wired: false,

  // Show the map after finishing `finishedLevelId`.
  showAfter(finishedLevelId){
    Progress.markComplete(finishedLevelId);
    const lvl = (typeof Levels!=='undefined') && Levels.get(finishedLevelId);
    this._nextId = (lvl && lvl.next && Levels.get(lvl.next)) ? lvl.next : null;
    const focusLevel = this._nextId || finishedLevelId;
    this._focusIndex = Campaign.envIndexOfLevel(focusLevel);

    this.canvas = document.getElementById('worldMapCanvas');
    this.g = this.canvas ? this.canvas.getContext('2d') : null;
    this._layout();
    this._configButtons();
    if(typeof UI!=='undefined') UI._show('worldMapScreen', true);
    this._wire();
    this._start();
  },

  hide(){ this._stop(); if(typeof UI!=='undefined') UI._show('worldMapScreen', false); },

  // Continue into the next real level.
  advance(){
    const id = this._nextId;
    this.hide();
    if(id && typeof LevelManager!=='undefined' && LevelManager.goTo){
      LevelManager.goTo(id);
      Game.state = SCENES.PLAYING;
      if(typeof updateHUD==='function') updateHUD();   // hotbar shows once PLAYING
      if(typeof startMusic==='function') startMusic();
    }
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

  _drawPips(g, env, cx, cy){
    const lv=env.levels, n=lv.length, gap=11, startX=cx-((n-1)*gap)/2;
    lv.forEach((l,i)=>{
      const x=startX+i*gap, done=Progress.isDone(l.id), real=!!l.real;
      if(l.kind==='boss'){
        g.beginPath(); g.moveTo(x,cy-4); g.lineTo(x+4,cy); g.lineTo(x,cy+4); g.lineTo(x-4,cy); g.closePath();
        g.fillStyle = done ? '#E6B24A' : (real ? '#C8B48A' : '#DDD2BE'); g.fill();
        g.lineWidth=1; g.strokeStyle='#8A7A5A'; g.stroke();
      } else {
        g.beginPath(); g.arc(x,cy,3.4,0,Math.PI*2);
        g.fillStyle = done ? '#E6B24A' : (real ? '#FFF7E6' : '#E6DCC8');
        g.fill(); g.lineWidth=1.2; g.strokeStyle = real ? '#8A7A5A' : '#C6BAA2'; g.stroke();
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

  // Tapping a node tells you what levels that biome holds.
  _announce(env){
    if(typeof showToast!=='function') return;
    const cleared=Progress.countDone(env.levels.map(l=>l.id));
    const real=env.levels.some(l=>l.real);
    const tail = real ? `${cleared}/${env.levels.length} cleared` : 'coming soon';
    showToast(`${env.icon} ${env.name} — 👑 ${env.boss} · ${tail}`, 2600);
  },

  _onClick(ev){
    if(!this.canvas) return;
    const r=this.canvas.getBoundingClientRect();
    // Map CSS click coords into logical (WM_W×WM_H) space, where the nodes live.
    const sx=WM_W/r.width, sy=WM_H/r.height;
    const mx=(ev.clientX-r.left)*sx, my=(ev.clientY-r.top)*sy;
    const hit=this._nodes.find(n=>Math.hypot(n.x-mx,n.y-my)<26);
    if(hit) this._announce(hit.env);
  },

  _wire(){
    if(this._wired) return; this._wired=true;
    const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); };
    on('wmContinue', ()=>this.advance());
    on('wmMenu',     ()=>{ this.hide(); if(typeof UI!=='undefined') UI.quitToMenu(); });
    if(this.canvas) this.canvas.addEventListener('click', e=>this._onClick(e));
  },
};
