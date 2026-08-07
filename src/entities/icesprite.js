// ====================== ENTITY: ICE SPRITE (Frostfang Tundra) ======================
// A drifting frost wisp that lobs ice shards from range; a hit chills you (`frostbitten`).
// It floats slowly and keeps its distance — weave the shards or pop it (it has hp). The
// ranged threat of the tundra, alongside the frost-wolf elites.

Entities.register('icesprite', {
  radius: 22,
  init(e){ e.hp=(typeof e.hp==='number')?e.hp:4; e.range=e.range||280; e.cd=rand(700,1800); e.shards=[]; e.ang=rand(0,Math.PI*2); e.turnT=0; e.homeX=e.x; e.homeY=e.y; e.bob=rand(0,6); e.dir=1; },
  update(e, t, dt){
    // slow hover, tethered near home, edging away from a close dog
    e.turnT-=dt; if(e.turnT<=0){ e.ang+=rand(-0.8,0.8); e.turnT=rand(600,1300); }
    const p=p1; let ax=Math.cos(e.ang), ay=Math.sin(e.ang);
    if(p && !p.dead){ const d=Math.hypot(p.x-e.x,p.y-e.y); if(d<120){ ax=(e.x-p.x)/d; ay=(e.y-p.y)/d; } }
    if(Math.hypot(e.x-e.homeX,e.y-e.homeY)>260){ ax=(e.homeX-e.x); ay=(e.homeY-e.y); const m=Math.hypot(ax,ay)||1; ax/=m; ay/=m; }
    e.x=clamp(e.x+ax*0.6*dtScale,24,WORLD_W-24); e.y=clamp(e.y+ay*0.6*dtScale,30,WORLD_H-24);
    e.dir=ax>=0?1:-1;
    e.cd-=dt;
    if(p && !p.dead && e.cd<=0 && Math.hypot(p.x-e.x,p.y-e.y)<e.range){ e.cd=rand(1700,2600); e.shards.push({x0:e.x,y0:e.y,tx:p.x,ty:p.y,prog:0,dur:620}); }
    for(let i=e.shards.length-1;i>=0;i--){ const s=e.shards[i]; s.prog+=dt/s.dur;
      const sx=s.x0+(s.tx-s.x0)*s.prog, sy=s.y0+(s.ty-s.y0)*s.prog;
      if(p && !p.dead && !p.diving && Math.hypot(p.x-sx,p.y-sy)<14){ if(typeof Health!=='undefined') Health.damage(p,2); if(typeof Status!=='undefined') Status.apply(p,'frostbitten',2600); spawnSparkles(p.x,p.y-6,'#BFE4F5',8); e.shards.splice(i,1); continue; }
      if(s.prog>=1){ spawnSparkles(s.tx,s.ty,'#DFF2FF',6); e.shards.splice(i,1); } }
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt); e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/400+e.bob)*2);
    ctx.save(); ctx.globalAlpha=0.7;
    // glowing frost wisp
    ctx.fillStyle='#BFE4F5'; ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.9; ctx.fillStyle='#EAF6FF'; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    // little ice-crystal core (6-point)
    ctx.strokeStyle='#7FC8F0'; ctx.lineWidth=1.5;
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+t/900; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*7); ctx.stroke(); }
    px(x-2,y-2,2,2,'#3AD0FF');
    ctx.restore();
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-9,y-9,18,18,'#FFB0B0'); ctx.globalAlpha=1; }
    e.shards.forEach(s=>{ const sx=s.x0+(s.tx-s.x0)*s.prog, sy=s.y0+(s.ty-s.y0)*s.prog;
      ctx.save(); ctx.fillStyle='#DFF2FF'; ctx.strokeStyle='#7FC8F0'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(sx, sy-4); ctx.lineTo(sx+3, sy); ctx.lineTo(sx, sy+4); ctx.lineTo(sx-3, sy); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
  },
});
