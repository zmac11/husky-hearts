// ====================== ENTITY: SCARAB (Golden Dunes) ======================
// A fast, weak beetle that skitters at you in numbers. Low hp — one good hit pops it — but
// quick, so a swarm nips if you dawdle. Distracted by a Mirage Decoy relic (it chases the
// decoy instead of you). Only damages an actual dog on contact.

function _desTarget(e){
  const decoy=(typeof Entities!=='undefined' && Entities.decoyTarget) ? Entities.decoyTarget() : null;
  if(decoy) return decoy;
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('scarab', {
  radius: 18,
  init(e){ e.hp=(typeof e.hp==='number')?e.hp:2; e.speed=e.speed||1.5; e.chaseR=e.chaseR||260; e.dmg=e.dmg||1; e.dir=1; e.cool=0; e.bob=rand(0,6); },
  update(e, t, dt){
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0,e.fearedT-dt);
    const tgt=_desTarget(e); if(!tgt){ e.bob=t; return; }
    const isDecoy=(tgt.kind==='decoy');
    const dist=Math.hypot(tgt.x-e.x, tgt.y-e.y);
    if(e.fearedT>0){ const a=Math.atan2(e.y-tgt.y,e.x-tgt.x); e.x+=Math.cos(a)*e.speed*1.4*dtScale; e.y+=Math.sin(a)*e.speed*1.4*dtScale; e.dir=Math.cos(a)>=0?1:-1; }
    else if(isDecoy || dist<e.chaseR*Entities.noiseFactor(tgt)){
      if(!e._chasing){ e._chasing=true; e.alertT=500; }
      const a=Math.atan2(tgt.y-e.y, tgt.x-e.x);
      e.x+=Math.cos(a)*e.speed*1.5*dtScale; e.y+=Math.sin(a)*e.speed*1.5*dtScale; e.dir=Math.cos(a)>=0?1:-1;
      if(!isDecoy && dist<18 && e.cool<=0){ if(typeof Health!=='undefined') Health.damage(tgt,e.dmg); spawnSparkles(tgt.x,tgt.y-6,'#6E7A3A',6); e.cool=900; }
    } else e._chasing=false;
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/120+e.bob)*1), D=e.dir;
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+7,8,3,0,0,Math.PI*2); ctx.fillStyle='#2A2410'; ctx.fill(); ctx.globalAlpha=1;
    // legs
    ctx.strokeStyle='#3A3020'; ctx.lineWidth=1.5;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x-5,y+1); ctx.lineTo(x-9,y+3+i*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x+5,y+1); ctx.lineTo(x+9,y+3+i*2); ctx.stroke(); }
    // iridescent carapace
    px(x-6,y-4,12,9,'#3A6E4A'); px(x-5,y-5,10,4,'#4E8E5E'); px(x-1,y-4,2,9,'#2A4A34');
    px(x+D*5-2,y-6,5,4,'#2A4A34');   // head
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-7,y-7,14,14,'#FF8B6B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});
