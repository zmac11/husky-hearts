// ====================== PUZZLE KIT (Golden Dunes — Ancient Ruins) ======================
// The first puzzle-dungeon toys, driving the `solve` objective (from-config.js):
//   • pressureplate — LATCHES on when the dog steps on it (so one dog can light them all in
//     sequence). Lighting every plate solves the room.
//   • glyphdoor — a carved door that grinds OPEN once every plate is lit (visual payoff).
//   • trappedtile — a rune tile that telegraphs, then erupts; stand clear when it flashes.
// State ({on}, timers) is plain data so it rides through save/level-state.

Entities.register('pressureplate', {
  radius: 24,
  init(e){ e.on=!!e.on; e.bob=0; },
  update(e, t, dt){
    if(e.on){ e.bob=t; return; }
    const p=p1;
    if(p && !p.dead && Math.hypot(p.x-e.x, p.y-e.y)<22){
      e.on=true;
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-4, '#7FD8C4', 16);
      if(typeof sfxDeliver==='function') sfxDeliver();
      if(typeof showToast==='function') showToast('🔷 A glyph lights up with a hum.', 1300);
      if(typeof updateHUD==='function') updateHUD();
      if(typeof checkWin==='function') checkWin();
    }
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // sunken stone plate
    ctx.fillStyle=e.on?'#6FB8A6':'#9A8258'; ctx.beginPath(); ctx.ellipse(x,y,20,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=e.on?'#A6E6D6':'#B5986A'; ctx.beginPath(); ctx.ellipse(x,y,14,8,0,0,Math.PI*2); ctx.fill();
    // glyph
    ctx.strokeStyle=e.on?'#0E5E4E':'#6A5230'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-6,y); ctx.lineTo(x,y-5); ctx.lineTo(x+6,y); ctx.lineTo(x,y+5); ctx.closePath(); ctx.stroke();
    if(e.on){ ctx.save(); ctx.globalAlpha=0.4+0.2*Math.sin(t/200); ctx.strokeStyle='#BFF6E8'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y,22,13,0,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
  },
});

// True once every pressure plate in the level is lit.
function _allPlatesLit(){
  const es=(typeof entities!=='undefined'&&entities)?entities:[];
  const all=es.filter(e=>e.kind==='pressureplate');
  return all.length>0 && all.every(e=>e.on);
}

Entities.register('glyphdoor', {
  init(e){ e.span=e.span||60; e.horizontal=!!e.horizontal; e.open=0; e.bob=0; },
  update(e, t, dt){
    const want=_allPlatesLit()?1:0;
    e.open += (want-e.open)*Math.min(1, dt/500);   // ease open/closed
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), span=e.span, o=e.open;
    ctx.save();
    // frame
    ctx.fillStyle='#8A6E42';
    if(e.horizontal){ ctx.fillRect(x-span, y-8, span*2, 16); } else { ctx.fillRect(x-8, y-span, 16, span*2); }
    // two grinding stone leaves that part as it opens
    ctx.fillStyle='#B79A66';
    const gap=o*span*0.9;
    if(e.horizontal){
      ctx.fillRect(x-span, y-6, span-gap, 12);
      ctx.fillRect(x+gap, y-6, span-gap, 12);
    } else {
      ctx.fillRect(x-6, y-span, 12, span-gap);
      ctx.fillRect(x-6, y+gap, 12, span-gap);
    }
    // glyph seam glow when opening
    if(o>0.02){ ctx.globalAlpha=0.5*o; ctx.fillStyle='#BFF6E8';
      if(e.horizontal) ctx.fillRect(x-gap, y-6, gap*2, 12); else ctx.fillRect(x-6, y-gap, 12, gap*2); }
    ctx.restore();
  },
});

Entities.register('trappedtile', {
  init(e){ e.period=e.period||2600; e.dmg=e.dmg||2; e.phase=rand(0,e.period); e.state='idle'; },
  update(e, t, dt){
    e.phase+=dt;
    if(e.state==='idle' && e.phase>=e.period){ e.state='warn'; e.phase=0; }
    else if(e.state==='warn' && e.phase>=520){ e.state='strike'; e.phase=0;
      const p=p1; if(p && !p.dead && Math.abs(p.x-e.x)<20 && Math.abs(p.y-e.y)<20){ if(typeof Health!=='undefined') Health.damage(p,e.dmg); spawnSparkles(p.x,p.y-6,'#E0602E',10); } }
    else if(e.state==='strike' && e.phase>=260){ e.state='idle'; e.phase=rand(0,e.period*0.3); }
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // rune tile
    ctx.fillStyle='#9A8258'; ctx.fillRect(x-18,y-12,36,24);
    ctx.strokeStyle='#6A5230'; ctx.lineWidth=1; ctx.strokeRect(x-18,y-12,36,24);
    ctx.strokeStyle='#7A5E36'; ctx.beginPath(); ctx.moveTo(x-8,y-6); ctx.lineTo(x+8,y+6); ctx.moveTo(x+8,y-6); ctx.lineTo(x-8,y+6); ctx.stroke();
    if(e.state==='warn'){ ctx.save(); ctx.globalAlpha=0.3+0.4*Math.sin(t/50); ctx.fillStyle='#E0602E'; ctx.fillRect(x-18,y-12,36,24); ctx.restore(); }
    else if(e.state==='strike'){ ctx.save(); ctx.globalAlpha=0.8;
      // spikes / flame burst
      ctx.fillStyle='#F0742E'; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x+i*7-3,y+8); ctx.lineTo(x+i*7,y-12); ctx.lineTo(x+i*7+3,y+8); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
  },
});
