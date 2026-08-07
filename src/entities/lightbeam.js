// ====================== LIGHT-BEAM PUZZLE (Golden Dunes — Ancient Ruins) ======================
// The classic redirection puzzle: a `beamemitter` casts a ray of sun-glyph light; you rotate
// `mirror`s (action key toggles their ◹◺ diagonal) to bend the beam around the ruin walls onto
// a `beamsensor`. Light the sensor and its glyph latches on — counting toward the `solve`
// objective just like a pressure plate (from-config's solve() checks both kinds).
//
// The emitter re-traces the beam every frame (reflecting at mirrors, stopping at walls) so the
// light updates live as you turn a mirror. Latched state ({on}) rides through save/level-state.

const _BEAM_DIR = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
// Reflect a direction off a mirror. '/' = NE–SW (◹): right↔up, left↔down.
//                                  '\\' = NW–SE (◺): right↔down, left↔up.
function _beamReflect(orient, dx, dy){
  if(orient==='/'){ return [-dy, -dx]; }   // (1,0)->(0,-1); (0,-1)->(1,0); (-1,0)->(0,1); (0,1)->(-1,0)
  return [dy, dx];                          // '\\': (1,0)->(0,1); (0,1)->(1,0); (-1,0)->(0,-1); (0,-1)->(-1,0)
}
function _beamSolid(x, y){
  const cs=(typeof colliders!=='undefined'&&colliders)?colliders:[];
  for(const c of cs){
    // ignore the four thin world-border strips (the edge test in the trace handles them) so a
    // beam can run right to the arena wall without being swallowed by the border collider.
    if(c.w>=WORLD_W-40 || c.h>=WORLD_H-40) continue;
    if(x>c.x && x<c.x+c.w && y>c.y && y<c.y+c.h) return true;
  }
  return false;
}

Entities.register('beamemitter', {
  radius: 26,
  init(e){ e.dir=e.dir||'right'; e.beamPath=[]; e.hit=false; e.bob=0; },
  update(e, t, dt){
    const es=(typeof entities!=='undefined'&&entities)?entities:[];
    const mirrors=es.filter(o=>o.kind==='mirror'), sensors=es.filter(o=>o.kind==='beamsensor');
    let [dx,dy]=_BEAM_DIR[e.dir]||[1,0];
    let x=e.x, y=e.y-4;
    const path=[{x,y}]; const used=new Set(); let steps=0, segs=0, hit=false;
    while(steps++<1600 && segs<16){
      x+=dx*5; y+=dy*5;
      if(x<10||x>WORLD_W-10||y<10||y>WORLD_H-10) break;
      if(_beamSolid(x,y)) break;
      const m=mirrors.find(mm=>!used.has(mm) && Math.hypot(mm.x-x, mm.y-y)<15);
      if(m){ used.add(m); path.push({x:m.x, y:m.y}); [dx,dy]=_beamReflect(m.orient, dx, dy); x=m.x; y=m.y; segs++; continue; }
      const s=sensors.find(ss=>Math.hypot(ss.x-x, ss.y-y)<18);
      if(s){ path.push({x:s.x, y:s.y}); s.on=true; s.beamLit=true; hit=true;
             if(!s._litOnce){ s._litOnce=true; if(typeof spawnSparkles==='function') spawnSparkles(s.x,s.y-4,'#FFE9A0',18); if(typeof sfxDeliver==='function') sfxDeliver(); if(typeof showToast==='function') showToast('🔆 The beam strikes the glyph — it hums to life!',1600); if(typeof checkWin==='function') checkWin(); }
             break; }
    }
    path.push({x,y}); e.beamPath=path; e.hit=hit; e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // the beam itself (drawn under the device, over the floor)
    const p=e.beamPath||[];
    if(p.length>1){
      ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.globalAlpha=0.35; ctx.strokeStyle='#FFF3B0'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y); for(let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y); ctx.stroke();
      ctx.globalAlpha=0.9; ctx.strokeStyle='#FFEA88'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y); for(let i=1;i<p.length;i++) ctx.lineTo(p[i].x,p[i].y); ctx.stroke();
      ctx.restore();
    }
    // emitter device — a sun-glyph obelisk
    ctx.save();
    ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+12,16,5,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    px(x-10,y-16,20,26,'#BFA06E'); px(x-10,y-16,20,4,'#D2B584');
    ctx.strokeStyle='#8A6E42'; ctx.lineWidth=1; ctx.strokeRect(x-10,y-16,20,26);
    // glowing lens on the emitting face
    const v=_BEAM_DIR[e.dir]||[1,0];
    ctx.fillStyle='#FFE9A0'; ctx.beginPath(); ctx.arc(x+v[0]*9, y-3+v[1]*9, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFF8D0'; ctx.beginPath(); ctx.arc(x+v[0]*9, y-3+v[1]*9, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  },
});

Entities.register('mirror', {
  radius: 26,
  init(e){ e.orient=e.orient||'/'; e.bob=0; },
  onInteract(e, p){
    e.orient = (e.orient==='/') ? '\\' : '/';
    if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-4, '#CFE6F5', 10);
    if(typeof sfxDig==='function') sfxDig();
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    ctx.save();
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+10,12,4,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    // stone stand
    px(x-3,y+2,6,8,'#8A7250');
    // the mirror face — a polished diagonal
    const d=(e.orient==='/')?1:-1;   // '/' goes bottom-left→top-right
    ctx.strokeStyle='#7F9AA8'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-11, y+11*d); ctx.lineTo(x+11, y-11*d); ctx.stroke();
    ctx.strokeStyle='#E6F4FB'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(x-11, y+11*d); ctx.lineTo(x+11, y-11*d); ctx.stroke();
    // gilt frame ends
    px(x-13, y+11*d-2, 4,4, '#D2B584'); px(x+9, y-11*d-2, 4,4, '#D2B584');
    ctx.restore();
    // rotate prompt within reach
    if(p1 && !p1.dead && Math.hypot(p1.x-e.x,p1.y-e.y)<40){
      const pulse=1+Math.sin(t/240)*0.12;
      ctx.save(); ctx.translate(x,y-20); ctx.scale(pulse,pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('↻',0,0); ctx.fillStyle='#5FA0C0'; ctx.fillText('↻',0,0);
      ctx.restore();
    }
  },
});

Entities.register('beamsensor', {
  radius: 22,
  init(e){ e.on=!!e.on; e.beamLit=false; e.bob=0; },
  // The emitter clears/sets beamLit each frame; nothing to do here.
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), lit=e.on;
    ctx.save();
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+11,13,4,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    // carved socket
    px(x-11,y-14,22,26,'#BFA06E'); px(x-11,y-14,22,4,'#D2B584');
    ctx.strokeStyle='#8A6E42'; ctx.lineWidth=1; ctx.strokeRect(x-11,y-14,22,26);
    // gem crystal — dark until the beam lights it, then a warm glow
    if(lit){
      ctx.globalAlpha=0.5+0.2*Math.sin(t/200);
      const g=ctx.createRadialGradient(x,y-1,1,x,y-1,16); g.addColorStop(0,'#FFF3B0'); g.addColorStop(1,'rgba(255,233,160,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y-1,16,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    }
    ctx.fillStyle=lit?'#FFE070':'#5A6E62';
    ctx.beginPath(); ctx.moveTo(x,y-9); ctx.lineTo(x+7,y-1); ctx.lineTo(x,y+8); ctx.lineTo(x-7,y-1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=lit?'#FFF8D0':'#7E948A'; px(x-2,y-3,3,3, lit?'#FFF8D0':'#7E948A');
    ctx.restore();
  },
});
