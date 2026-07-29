// ====================== ENTITY: SPORE CLOUD (poison zone) ======================
// A drifting puff of toxic spores in Fungus Hollow. Standing in one keeps you `poisoned`
// (status.js). Some are permanent fixtures on the map (choke points to time or detour); the
// ones a toadstool spitter lobs are temporary and fade after a while. Purely a hazard —
// update + draw, no interaction.

Entities.register('sporecloud', {
  radius: 0,
  init(e){
    e.r    = e.r || 34;
    e.life = (typeof e.life==='number') ? e.life : -1;   // -1 = permanent fixture
    e._t   = 0;
    e._puffs = Array.from({length:5}, ()=>({ a:rand(0,Math.PI*2), rr:rand(0.3,0.95), s:rand(0.7,1.3) }));
  },
  update(e, t, dt){
    e._t=t;
    if(e.life>0){ e.life-=dt; if(e.life<=0){ Entities.remove(e); return; } }
    const p=p1;
    if(p && !p.dead && Math.hypot(p.x-e.x, p.y-e.y) < e.r && typeof Status!=='undefined'){
      Status.apply(p, 'poisoned', 2400);   // refreshed while you linger inside
    }
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    const fade = e.life<0 ? 1 : Math.min(1, e.life/600);   // temporary clouds fade out
    ctx.save();
    e._puffs.forEach((pf,i)=>{
      const wob=Math.sin(t/600 + pf.a*3)*3;
      const px_=x+Math.cos(pf.a+t/2400)*e.r*0.5*pf.rr;
      const py_=y+Math.sin(pf.a+t/2400)*e.r*0.32*pf.rr + wob;
      const rr=e.r*0.5*pf.s;
      ctx.globalAlpha=0.16*fade;
      const g=ctx.createRadialGradient(px_,py_,1, px_,py_, rr);
      g.addColorStop(0,'#B6E86A'); g.addColorStop(1,'rgba(120,180,70,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px_,py_,rr,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  },
});
