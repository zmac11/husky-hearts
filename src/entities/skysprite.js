// ====================== ENTITY: SKY SPRITE (Cloud Kingdom) ======================
// A little wind-wisp that flits over the clouds and lobs gusts at you from range — the sky's
// ranged threat. It drifts and keeps its distance; weave the gusts or pop it (it has hp). No
// status, just chip damage and a shove that can nudge you toward the void.

Entities.register('skysprite', {
  radius: 22,
  init(e){ e.hp=(typeof e.hp==='number')?e.hp:4; e.range=e.range||300; e.cd=rand(700,1800); e.gusts=[]; e.ang=rand(0,Math.PI*2); e.turnT=0; e.homeX=e.x; e.homeY=e.y; e.bob=rand(0,6); e.dir=1; },
  update(e, t, dt){
    e.turnT-=dt; if(e.turnT<=0){ e.ang+=rand(-0.8,0.8); e.turnT=rand(600,1300); }
    const p=p1; let ax=Math.cos(e.ang), ay=Math.sin(e.ang);
    if(p && !p.dead){ const d=Math.hypot(p.x-e.x,p.y-e.y); if(d<130){ ax=(e.x-p.x)/d; ay=(e.y-p.y)/d; } }
    if(Math.hypot(e.x-e.homeX,e.y-e.homeY)>260){ ax=(e.homeX-e.x); ay=(e.homeY-e.y); const m=Math.hypot(ax,ay)||1; ax/=m; ay/=m; }
    e.x=clamp(e.x+ax*0.7*dtScale,24,WORLD_W-24); e.y=clamp(e.y+ay*0.7*dtScale,30,WORLD_H-24); e.dir=ax>=0?1:-1;
    e.cd-=dt;
    if(p && !p.dead && e.cd<=0 && Math.hypot(p.x-e.x,p.y-e.y)<e.range){ e.cd=rand(1600,2500); e.gusts.push({x0:e.x,y0:e.y,tx:p.x,ty:p.y,prog:0,dur:600}); }
    for(let i=e.gusts.length-1;i>=0;i--){ const g=e.gusts[i]; g.prog+=dt/g.dur;
      const gx=g.x0+(g.tx-g.x0)*g.prog, gy=g.y0+(g.ty-g.y0)*g.prog;
      if(p && !p.dead && Math.hypot(p.x-gx,p.y-gy)<14){ if(typeof Health!=='undefined') Health.damage(p,2);
        const a=Math.atan2(p.y-e.y,p.x-e.x); p.x=clamp(p.x+Math.cos(a)*18,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*18,26,WORLD_H-20);
        spawnSparkles(p.x,p.y-6,'#DCE8F2',8); e.gusts.splice(i,1); continue; }
      if(g.prog>=1){ e.gusts.splice(i,1); } }
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt); e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/400+e.bob)*2);
    ctx.save(); ctx.globalAlpha=0.7;
    ctx.fillStyle='#EAF2F8'; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.9; ctx.fillStyle='#FFFFFF'; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    // wispy swirl + face
    ctx.globalAlpha=0.5; ctx.strokeStyle='#B6CCE0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y,9, t/300, t/300+Math.PI*1.4); ctx.stroke();
    px(x-3,y-1,2,2,'#6E8AA0'); px(x+2,y-1,2,2,'#6E8AA0');
    ctx.restore();
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-9,y-9,18,18,'#FFB0B0'); ctx.globalAlpha=1; }
    e.gusts.forEach(g=>{ const gx=g.x0+(g.tx-g.x0)*g.prog, gy=g.y0+(g.ty-g.y0)*g.prog;
      ctx.save(); ctx.globalAlpha=0.7; ctx.strokeStyle='#CFE0EC'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(gx,gy,4,0,Math.PI*1.5); ctx.stroke(); ctx.restore(); });
  },
});
