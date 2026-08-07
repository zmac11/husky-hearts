// ====================== ENTITY: FROST WOLF (Frostfang Tundra — elite) ======================
// The endgame's first ELITE: a tougher, faster wolf whose bite leaves you `frostbitten`
// (chilled & slow). It drops ❄️ rare materials for endgame gear. Reads like the Rocky wolf but
// turned up — more hp, a status attack, a frosty coat. Pops like any enemy on 0 hp.

function _fwNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('frostwolf', {
  radius: 30,
  init(e){
    e.hp=(typeof e.hp==='number')?e.hp:14; e.speed=e.speed||1.25; e.chaseR=e.chaseR||240; e.dmg=e.dmg||3;
    e.dir=1; e.cool=0; e.wanderT=0; e.wanderAng=0; e.bob=0; e.state='chase'; e.lungeCd=2200;
  },
  update(e, t, dt){
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(e.lungeCd>0) e.lungeCd=Math.max(0,e.lungeCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0,e.fearedT-dt);
    const p=_fwNearest(e); const dist=p?Math.hypot(p.x-e.x,p.y-e.y):Infinity;
    if(e.state==='lunge'){
      e.x=clamp(e.x+e.lvx*dtScale,20,WORLD_W-20); e.y=clamp(e.y+e.lvy*dtScale,26,WORLD_H-20);
      if(p && dist<28 && e.cool<=0){ _fwBite(e,p); e.cool=800; }
      e.actT-=dt; if(e.actT<=0){ e.state='chase'; e.lungeCd=2400; }
      e.bob=t; return;
    }
    if(e.fearedT>0 && p){ const a=Math.atan2(e.y-p.y,e.x-p.x); e.x+=Math.cos(a)*e.speed*1.5*dtScale; e.y+=Math.sin(a)*e.speed*1.5*dtScale; e.dir=Math.cos(a)>=0?1:-1; }
    else if(p && dist<e.chaseR*Entities.noiseFactor(p)){
      if(!e._chasing){ e._chasing=true; e.alertT=700; }
      if(e.lungeCd<=0 && dist<220 && dist>50){ e.state='lunge'; e.actT=340; e.alertT=400; const a=Math.atan2(p.y-e.y,p.x-e.x); const L=6.5; e.lvx=Math.cos(a)*L; e.lvy=Math.sin(a)*L; e.dir=e.lvx>=0?1:-1; if(typeof sfxDash==='function') sfxDash(); e.bob=t; return; }
      const a=Math.atan2(p.y-e.y,p.x-e.x);
      e.x+=Math.cos(a)*e.speed*1.35*dtScale; e.y+=Math.sin(a)*e.speed*1.35*dtScale; e.dir=Math.cos(a)>=0?1:-1;
      if(dist<24 && e.cool<=0){ _fwBite(e,p); e.cool=1000; }
    } else {
      e._chasing=false; e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=rand(0,Math.PI*2); e.wanderT=rand(700,1600); }
      e.x+=Math.cos(e.wanderAng)*e.speed*0.6*dtScale; e.y+=Math.sin(e.wanderAng)*e.speed*0.6*dtScale; e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20); e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/280)*1), D=e.dir;
    const crouch=(e.state==='lunge');
    ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+11,16,5,0,0,Math.PI*2); ctx.fillStyle='#1A2430'; ctx.fill(); ctx.globalAlpha=1;
    // frosty aura
    ctx.save(); ctx.globalAlpha=0.12+0.06*Math.sin(t/300); ctx.fillStyle='#BFE4F5'; ctx.beginPath(); ctx.ellipse(x,y,22,15,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    // pale blue-grey wolf body
    px(x-13,y-5,26,14,'#7E96A8'); px(x-9,y+2,18,7,'#A8C0D0');   // belly
    px(x-11,y+9,5,5,'#5E7686'); px(x+6,y+9,5,5,'#5E7686');       // legs
    // head
    px(x+D*8-6,y-11,13,12,'#8AA2B4');
    px(x+D*8-6,y-14,4,4,'#6E8698'); px(x+D*8+3,y-14,4,4,'#6E8698'); // ears
    // frosty muzzle + icy eyes
    px(x+D*12-2,y-6,6,5,'#C6DEEC');
    px(x+D*8-3,y-6,3,3,'#3AD0FF'); px(x+D*8+3,y-6,3,3,'#3AD0FF');
    // frost tips on the back
    px(x-4,y-8,2,3,'#E6F4FF'); px(x+2,y-9,2,3,'#E6F4FF');
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-14,y-16,28,30,'#FF8B8B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _fwBite(e, p){
  spawnSparkles(p.x, p.y-8, '#9FD0F0', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  if(typeof Status!=='undefined') Status.apply(p, 'frostbitten', 3200);
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=16; p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
