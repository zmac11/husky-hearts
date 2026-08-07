// ====================== ENTITY: SNAPPING CRAB (Seashell Cove) ======================
// A slow shore chaser — the cove's melee nuisance. It sidles after the nearest dog (crabs
// scuttle sideways), snaps with a pincer on contact, and pops like any enemy when its hp
// runs out, sometimes leaving a 🐚 shell (the biome's secondary currency). No status attack;
// it's a gentle, readable threat that teaches you to keep moving on the sand.

function _crabNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('crab', {
  radius: 26,

  init(e){
    e.hp     = (typeof e.hp==='number') ? e.hp : 5;
    e.speed  = e.speed || 0.7;
    e.chaseR = e.chaseR || 150;
    e.dmg    = e.dmg || 2;
    e.dir    = 1;
    e.cool   = 0; e.wanderT=0; e.wanderAng=0; e.bob=0; e.snap=0;
  },

  update(e, t, dt){
    const swim=(typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming))?0.6:1;
    e.swimming=swim<1;
    const p=_crabNearest(e);
    const dist=p ? Math.hypot(p.x-e.x, p.y-e.y) : Infinity;
    if(e.fearedT>0 && p){
      const a=Math.atan2(e.y-p.y, e.x-p.x);
      e.x+=Math.cos(a)*e.speed*1.4*swim*dtScale; e.y+=Math.sin(a)*e.speed*1.4*swim*dtScale; e.dir=Math.cos(a)>=0?1:-1;
    } else if(p && dist<e.chaseR*Entities.noiseFactor(p)){
      if(!e._chasing){ e._chasing=true; e.alertT=700; }
      const a=Math.atan2(p.y-e.y, p.x-e.x);
      e.x+=Math.cos(a)*e.speed*1.2*swim*dtScale; e.y+=Math.sin(a)*e.speed*1.2*swim*dtScale; e.dir=Math.cos(a)>=0?1:-1;
      if(dist<24 && e.cool<=0){ _crabSnap(e,p); e.cool=1000; e.snap=260; }
    } else {
      e._chasing=false; e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=rand(0,Math.PI*2); e.wanderT=rand(700,1700); }
      e.x+=Math.cos(e.wanderAng)*e.speed*swim*dtScale; e.y+=Math.sin(e.wanderAng)*e.speed*swim*dtScale; e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0,e.fearedT-dt);
    if(e.snap>0) e.snap=Math.max(0,e.snap-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/260)*1), D=e.dir;
    const open=e.snap>0 ? 4 : (2+Math.sin(t/300)*1);
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+9,14,4,0,0,Math.PI*2); ctx.fillStyle='#1A2A24'; ctx.fill(); ctx.globalAlpha=1;
    // legs (splayed)
    ctx.strokeStyle='#C0432E'; ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x-8,y+2); ctx.lineTo(x-14,y+5+i*3); ctx.stroke();
                            ctx.beginPath(); ctx.moveTo(x+8,y+2); ctx.lineTo(x+14,y+5+i*3); ctx.stroke(); }
    // shell body
    px(x-10,y-4,20,10,'#E0562F'); px(x-8,y-6,16,5,'#EC6A42'); px(x-7,y-5,14,2,'#F4906E');
    // eye stalks
    px(x-5,y-10,2,4,'#C0432E'); px(x+3,y-10,2,4,'#C0432E');
    px(x-6,y-12,3,3,'#20140F'); px(x+3,y-12,3,3,'#20140F');
    px(x-5,y-11,1,1,'#FFF'); px(x+4,y-11,1,1,'#FFF');
    // pincers (front, toward facing)
    const px0=x+D*11;
    px(px0-2,y-2,5,3,'#E0562F'); px(px0+D*3,y-4-open,4,3,'#EC6A42'); px(px0+D*3,y+open-1,4,3,'#EC6A42');
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-12,y-12,24,22,'#FF6B4B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _crabSnap(e, p){
  spawnSparkles(p.x, p.y-8, '#E0562F', 10);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||2);
  const a=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(a)*14,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*14,26,WORLD_H-20);
  showToast('🦀 A crab pinched you!', 1300);
  if(typeof sfxHowl==='function') sfxHowl();
}
