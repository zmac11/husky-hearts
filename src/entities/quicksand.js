// ====================== ENTITY: QUICKSAND (Golden Dunes) ======================
// A soft sand pit that bogs you down. Step in and you're slowed (a refreshed `slow` status)
// and gently pulled toward the centre — cozy, never fatal: just walk out. Purely a movement
// hazard, no hp.

Entities.register('quicksand', {
  init(e){ e.r=e.r||60; e.bob=0; },
  update(e, t, dt){
    const p=p1; if(!p||p.dead){ e.bob=t; return; }
    const d=Math.hypot(p.x-e.x, p.y-e.y);
    if(d<e.r){
      if(typeof Status!=='undefined') Status.apply(p,'slow',500);   // refreshed while inside
      // gentle sink toward the middle
      if(d>6){ const a=Math.atan2(e.y-p.y, e.x-p.x); p.x+=Math.cos(a)*0.4*dtScale; p.y+=Math.sin(a)*0.4*dtScale; }
      if(!e._warned || t-e._warned>3000){ e._warned=t; if(typeof showToast==='function') showToast('🏜️ Quicksand — wade out!',1300); }
    }
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), r=e.r;
    ctx.save();
    ctx.fillStyle='#C6A86A'; ctx.beginPath(); ctx.ellipse(x,y,r,r*0.62,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#B5975A'; ctx.beginPath(); ctx.ellipse(x,y,r*0.7,r*0.44,0,0,Math.PI*2); ctx.fill();
    // slow churning rings
    ctx.globalAlpha=0.4; ctx.strokeStyle='#A88A4E'; ctx.lineWidth=1.5;
    for(let i=0;i<3;i++){ const rr=(r*0.3)+((t/900+i/3)%1)*r*0.55; ctx.beginPath(); ctx.ellipse(x,y,rr,rr*0.62,0,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  },
});
