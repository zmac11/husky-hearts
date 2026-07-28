// ====================== ENTITY: PATROL (grove guardian shadow) ======================
// The looming shadow that circles the Moonlit Rite in Firefly Grove — the Old Grizzly's
// roving presence. It sweeps a fixed beat back and forth, sweeping a SIGHT CONE ahead of it;
// stray into the cone and it spots you: a shove backwards and, worse, it snuffs out the
// nearest lit shrine lantern (a setback, never a death). You don't fight it — you time your
// dashes to the lanterns between its passes. Purely update + draw.

Entities.register('patrol', {
  radius: 0,

  init(e){
    e.speed = e.speed || 0.9;
    e.dir   = e.dir   || 1;
    e.coneR = e.coneR || 165;
    e.coneA = e.coneA || 0.55;     // half-angle of the sight cone
    e.range = e.range || 320;      // sweep distance from its start x
    e.x0    = e.x;
    e.cool  = 0; e.alertT = 0; e.bob = 0;
  },

  update(e, t, dt){
    // sweep back and forth
    e.x += e.dir*e.speed*dtScale;
    if(e.x > e.x0+e.range){ e.x=e.x0+e.range; e.dir=-1; }
    if(e.x < e.x0-e.range){ e.x=e.x0-e.range; e.dir=1; }
    e.x=clamp(e.x, 30, WORLD_W-30);

    const p=p1;
    if(p && !p.dead && e.cool<=0){
      const dx=p.x-e.x, dy=p.y-e.y, dist=Math.hypot(dx,dy);
      const facing = e.dir>=0 ? 0 : Math.PI;
      const diff = Math.abs(((Math.atan2(dy,dx)-facing+Math.PI)%(Math.PI*2))-Math.PI);
      if(dist<e.coneR && diff<e.coneA){
        e.cool=2600; e.alertT=800;
        // shove the dog back out of the cone
        const k=Math.atan2(p.y-e.y, p.x-e.x);
        p.x=clamp(p.x+Math.cos(k)*42, 20, WORLD_W-20);
        p.y=clamp(p.y+Math.sin(k)*42, 26, WORLD_H-20);
        if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#8A6ABF', 12);
        if(typeof showToast==='function') showToast('👁️ The guardian shadow spotted you!', 1900);
        // snuff the nearest lit shrine lantern
        let best=null, bd=Infinity;
        (typeof entities!=='undefined'?entities:[]).forEach(o=>{
          if(o.kind==='shrinelantern' && o.lit){ const d=Math.hypot(o.x-p.x, o.y-p.y); if(d<bd){ bd=d; best=o; } }
        });
        const def=Entities.def('shrinelantern');
        if(best && def && def.douse){ def.douse(best); if(typeof showToast==='function') showToast('🔮 A shrine lantern went dark!', 1700); if(typeof updateHUD==='function') updateHUD(); }
        if(typeof sfxHowl==='function') sfxHowl();
      }
    }
    if(e.cool>0)   e.cool=Math.max(0, e.cool-dt);
    if(e.alertT>0) e.alertT=Math.max(0, e.alertT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/360)*1.5);
    const facing = e.dir>=0 ? 0 : Math.PI;
    // sight cone
    ctx.save();
    ctx.globalAlpha=e.alertT>0 ? 0.22 : 0.12;
    ctx.fillStyle=e.alertT>0 ? '#E0503C' : '#7A6AA6';
    ctx.beginPath(); ctx.moveTo(x,y);
    ctx.arc(x, y, e.coneR, facing-e.coneA, facing+e.coneA); ctx.closePath(); ctx.fill();
    ctx.restore();
    // shadow beast body
    ctx.save();
    ctx.globalAlpha=0.28; ctx.beginPath(); ctx.ellipse(x,y+13,18,5,0,0,Math.PI*2); ctx.fillStyle='#0A0814'; ctx.fill(); ctx.restore();
    px(x-14,y-14,28,20,'#171226');
    px(x-16,y-6,5,10,'#100C1C'); px(x+11,y-6,5,10,'#100C1C');
    // hunched head toward facing
    const hx=x+(e.dir>=0?10:-10);
    px(hx-7,y-20,14,10,'#1E1730');
    px(hx-8,y-24,5,6,'#120E20'); px(hx+3,y-24,5,6,'#120E20');   // ears
    // glowing eyes
    px(hx-4,y-16,3,3,'#E06B6B'); px(hx+1,y-16,3,3,'#E06B6B');
    px(hx-3,y-15,1,1,'#FFD0D0'); px(hx+2,y-15,1,1,'#FFD0D0');
    ctx.restore();
    Entities.drawAlert(e);
  },
});
