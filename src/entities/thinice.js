// ====================== ENTITY: THIN ICE (Frostfang Tundra — Glacier Cave) ======================
// A fragile ice floor that CRACKS if you linger. Step on and a crack timer starts; keep moving
// and it re-freezes, but dawdle and it shatters — a cold plunge that chips a little health and
// bumps you back to solid ground (cozy — never a death). Plain data ({crack}) so it saves.

Entities.register('thinice', {
  init(e){ e.w=e.w||60; e.h=e.h||44; e.crack=0; e.broken=0; e.safeX=e.x; e.safeY=e.y+ (e.h/2+30); e.bob=0; },
  update(e, t, dt){
    const p=p1; if(!p||p.dead){ e.bob=t; return; }
    const on = Math.abs(p.x-e.x)<e.w/2 && Math.abs(p.y-e.y)<e.h/2;
    if(e.broken>0){ e.broken-=dt; if(e.broken<=0){ e.crack=0; } e.bob=t; return; }
    if(on){
      e.crack += dt;
      if(e.crack>=1600){
        // shatter — a cold plunge
        e.broken=2600; e.crack=0;
        if(typeof Health!=='undefined') Health.damage(p, 2);
        if(typeof Status!=='undefined') Status.apply(p, 'frostbitten', 2400);
        if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y, '#CFE6F5', 20);
        if(typeof showToast==='function') showToast('🧊 The thin ice cracked — cold plunge! Keep moving next time.', 2200);
        // shove the dog back toward safe ground
        const a=Math.atan2(e.safeY-p.y, e.safeX-p.x); p.x=clamp(p.x+Math.cos(a)*40,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*40,26,WORLD_H-20);
      }
    } else { e.crack=Math.max(0, e.crack-dt*1.5); }   // re-freezes when you step off
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), w=e.w, h=e.h;
    ctx.save();
    if(e.broken>0){
      // open water where it shattered
      ctx.fillStyle='#2A5A72'; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.5; ctx.fillStyle='#3A7090'; ctx.beginPath(); ctx.ellipse(x,y,w/2*0.7,h/2*0.7,0,0,Math.PI*2); ctx.fill();
      ctx.restore(); return;
    }
    // pale, glassy ice
    ctx.fillStyle='#CFE6F2'; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.6; ctx.fillStyle='#E6F4FB'; ctx.beginPath(); ctx.ellipse(x-4,y-3,w/2*0.5,h/2*0.4,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    // growing cracks as it stresses
    const c=Math.min(1, e.crack/1600);
    if(c>0.05){ ctx.strokeStyle='#6E92A6'; ctx.lineWidth=1+c;
      for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(a)*w/2*c, y+Math.sin(a)*h/2*c); ctx.stroke(); } }
    ctx.restore();
  },
});
