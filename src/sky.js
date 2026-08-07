// ====================== SKY / GLIDING (Cloud Kingdom — Biome 8) ======================
// The capstone traversal, abstracted into the top-down world: the sky is VOID except for
// `cloudplatform` islands. Wander off a platform (and off any updraft/wind column) and you
// FALL — a SOFT RESET back to the last safe cloud, never a death. Updrafts fling you across
// gaps; wind zones shove you sideways. A level opts in with `sky:true`.
//
// Transient like the other meters — the last-safe spot resets on level entry.

const Sky = {
  MARGIN: 26,   // forgiving edge padding around each cloud

  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.sky); },

  // Is (x,y) supported? — over any cloud platform, or inside an updraft/wind column (which
  // hold you aloft as they carry you), or near the level spawn (a safe launch pad).
  supported(x,y){
    const wo=(typeof worldObjects!=='undefined'&&worldObjects)?worldObjects:[];
    for(const o of wo){ if(o.kind==='cloudplatform'){ if(((x-o.x)/(o.w/2+this.MARGIN))**2+((y-o.y)/(o.h/2+this.MARGIN))**2 < 1) return true; } }
    const es=(typeof entities!=='undefined'&&entities)?entities:[];
    for(const e of es){ if((e.kind==='updraft'||e.kind==='windzone') && Math.hypot(x-e.x,y-e.y) < (e.r||60)+8) return true; }
    return false;
  },

  // Called each frame from updatePlayer. Records the last safe cloud and soft-resets on a fall.
  tick(p, dt){
    if(!this.active() || !p || p.dead) return;
    if(typeof p._skysafe!=='object'){ const s=LevelManager.current.spawn||{x:p.x,y:p.y}; p._skysafe={x:s.x,y:s.y}; }
    if(this.supported(p.x, p.y)){ p._skysafe={x:p.x, y:p.y}; p._fellT=0; return; }
    // over the void — soft reset back to the last cloud
    p._fellT=(p._fellT||0)+dt;
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y, '#FFFFFF', 10);
    p.x=p._skysafe.x; p.y=p._skysafe.y; p._svx=0; p._svy=0;
    if(!p._fellAt || performance.now()-p._fellAt>1400){ p._fellAt=performance.now(); if(typeof showToast==='function') showToast('☁️ Whoops — the wind carried you back to solid cloud!', 1400); }
  },
};

// An updraft: a rising column that FLINGS the dog across a gap in its set direction. Standing
// over it launches you (a dash), so you ride it from one platform to the next.
Entities.register('updraft', {
  init(e){ e.r=e.r||46; e.dir=e.dir||'up'; e.cool=0; e.bob=0; },
  update(e, t, dt){
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    const p=p1; if(!p||p.dead){ e.bob=t; return; }
    if(Math.hypot(p.x-e.x,p.y-e.y)<e.r && e.cool<=0){
      const v={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[e.dir]||[0,-1];
      const SP=8; p.dashVX=v[0]*SP; p.dashVY=v[1]*SP; p.dashT=340; p._svx=0; p._svy=0;
      e.cool=700;
      if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y+6, '#DFF2FF', 14);
      if(typeof sfxDash==='function') sfxDash();
    }
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), r=e.r;
    const v={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[e.dir]||[0,-1];
    ctx.save(); ctx.globalAlpha=0.35;
    ctx.fillStyle='#EAF6FF'; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.7,0,0,Math.PI*2); ctx.fill();
    // rising wisps in the flow direction
    ctx.globalAlpha=0.6; ctx.strokeStyle='#BFE4F5'; ctx.lineWidth=2;
    for(let i=0;i<4;i++){ const ph=((t/500+i/4)%1); const ox=x+v[0]*(-r*0.4+ph*r*0.8)+(v[0]?0:(i-1.5)*10); const oy=y+v[1]*(-r*0.4+ph*r*0.8)+(v[1]?0:(i-1.5)*10);
      ctx.globalAlpha=0.6*(1-Math.abs(ph-0.5)*2); ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+v[0]*8, oy+v[1]*8); ctx.stroke(); }
    // arrow hint
    ctx.globalAlpha=0.8; ctx.fillStyle='#7FC8F0'; ctx.font='bold 14px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText({up:'▲',down:'▼',left:'◀',right:'▶'}[e.dir]||'▲', x, y);
    ctx.restore();
  },
});

// A wind zone: a steady sideways gust that pushes the dog while inside (and holds it aloft).
Entities.register('windzone', {
  init(e){ e.r=e.r||70; e.dir=e.dir||'right'; e.force=e.force||1.1; e.bob=0; },
  update(e, t, dt){
    const p=p1; if(!p||p.dead){ e.bob=t; return; }
    if(Math.hypot(p.x-e.x,p.y-e.y)<e.r){
      const v={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[e.dir]||[1,0];
      p.x=clamp(p.x+v[0]*e.force*dtScale, 20, WORLD_W-20);
      p.y=clamp(p.y+v[1]*e.force*dtScale, 26, WORLD_H-20);
    }
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), r=e.r;
    const v={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[e.dir]||[1,0];
    ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle='#DCE8F2'; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.7,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.5; ctx.strokeStyle='#B6CCE0'; ctx.lineWidth=2;
    for(let i=0;i<5;i++){ const ph=((t/420+i/5)%1); const cx=x + v[0]*(-r*0.6+ph*r*1.2) + (v[0]?0:(i-2)*12); const cy=y + v[1]*(-r*0.6+ph*r*1.2) + (v[1]?0:(i-2)*12);
      ctx.globalAlpha=0.5*(1-Math.abs(ph-0.5)*2); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+v[0]*14,cy+v[1]*14); ctx.stroke(); }
    ctx.restore();
  },
});

// The summit / goal pad for the `reach` objective — a shining cloud dais. Stand on it to win.
Entities.register('reachgoal', {
  radius: 30,
  init(e){ e.reached=!!e.reached; e.bob=0; },
  update(e, t, dt){
    if(e.reached){ e.bob=t; return; }
    const p=p1;
    if(p && !p.dead && Math.hypot(p.x-e.x,p.y-e.y)<30){
      e.reached=true;
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#FFD93D', 26);
      if(typeof sfxWin==='function') sfxWin();
      if(typeof showToast==='function') showToast('⭐ You reached the summit!', 1600);
      if(typeof checkWin==='function') checkWin();
    }
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    ctx.save();
    // glowing dais
    ctx.globalAlpha=0.5+0.2*Math.sin(t/300);
    const g=ctx.createRadialGradient(x,y,2,x,y,28); g.addColorStop(0,'#FFF3B0'); g.addColorStop(1,'rgba(255,220,80,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,28,16,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1; ctx.fillStyle=e.reached?'#B6F0C0':'#F6E8B0'; ctx.beginPath(); ctx.ellipse(x,y,16,9,0,0,Math.PI*2); ctx.fill();
    // beacon star
    ctx.fillStyle='#FFD24A'; ctx.font='bold 16px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⭐', x, y-18+Math.sin(t/300)*2);
    ctx.restore();
  },
});
