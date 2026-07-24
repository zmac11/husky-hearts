// ====================== ENTITY: WOLF (rocky-mountain predator) ======================
// A tougher cousin of the meadow badger: faster, spots you from farther away, lunges
// in bursts, and bites harder. Rocky Mountains spawns a small pack of these, which is
// most of why the second level bites back. Same wander→chase shape as `enemy`, tuned up.

function _wolfNearestPlayer(e){
  let best=null, bestD=Infinity;
  for(const p of Game.players){ if(p.hp<=0) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bestD){ bestD=d; best=p; } }
  return best;
}

Entities.register('wolf', {
  radius: 32,

  init(e){
    e.speed   = e.speed   || 1.15;   // brisk — outpaces a corgi, presses a husky
    e.chaseR  = e.chaseR  || 190;    // keen senses: long detection range
    e.dmg     = e.dmg     || 3;      // bites for more than a heart
    e.hp      = (typeof e.hp==='number') ? e.hp : 6;   // 3 cannon-ball hits
    e.dir     = 1;
    e.wanderT = 0;
    e.wanderAng = 0;
    e.cool    = 0;                   // bite cooldown (ms)
    e.lunge   = 0;                   // brief speed burst timer (ms)
    e.lungeCd = 0;                   // between-lunge cooldown (ms)
    e.bob     = 0;
  },

  update(e, t, dt){
    // Slow to a swim in water, just like the dogs.
    const swim = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming)) ? 0.5 : 1;
    e.swimming = swim<1;
    const target=_wolfNearestPlayer(e);
    const dist=target ? Math.hypot(target.x-e.x, target.y-e.y) : Infinity;

    // Feared (Storm Fang aura): run AWAY from the dog and don't attack.
    if(e.fearedT>0 && target){
      const ang=Math.atan2(e.y-target.y, e.x-target.x);
      e.x+=Math.cos(ang)*e.speed*1.5*swim*dtScale;
      e.y+=Math.sin(ang)*e.speed*1.5*swim*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
      e._chasing=false;
      e.x=clamp(e.x, 20, WORLD_W-20);
      e.y=clamp(e.y, 26, WORLD_H-20);
      if(e.cool>0)    e.cool=Math.max(0, e.cool-dt);
      if(e.fearedT>0) e.fearedT=Math.max(0, e.fearedT-dt);
      if(e.hurtT>0)   e.hurtT=Math.max(0, e.hurtT-dt);
      e.bob=t;
      return;
    }
    // Keen ears: detection range scales with how loud the target dog is.
    const hearR=e.chaseR*Entities.noiseFactor(target);
    if(target && dist<hearR){
      if(!e._chasing){ e._chasing=true; e.alertT=700; if(typeof Tips!=='undefined') Tips.show('enemy'); }   // just heard the dog → "!"
      // periodic lunge: a short burst of extra speed to close the gap
      if(e.lungeCd<=0 && dist>40 && dist<hearR*0.8){ e.lunge=380; e.lungeCd=2200; }
      const burst=e.lunge>0 ? 1.9 : 1.45;
      const ang=Math.atan2(target.y-e.y, target.x-e.x);
      e.x+=Math.cos(ang)*e.speed*burst*swim*dtScale;
      e.y+=Math.sin(ang)*e.speed*burst*swim*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<22 && e.cool<=0){ _wolfBite(e, target); e.cool=850; }
    } else {
      e._chasing=false;
      // loping wander
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(500,1400); }
      e.x+=Math.cos(e.wanderAng)*e.speed*0.8*swim*dtScale;
      e.y+=Math.sin(e.wanderAng)*e.speed*0.8*swim*dtScale;
      e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }

    e.x=clamp(e.x, 20, WORLD_W-20);
    e.y=clamp(e.y, 26, WORLD_H-20);
    if(e.cool>0)    e.cool=Math.max(0, e.cool-dt);
    if(e.lunge>0)   e.lunge=Math.max(0, e.lunge-dt);
    if(e.lungeCd>0) e.lungeCd=Math.max(0, e.lungeCd-dt);
    if(e.alertT>0)  e.alertT=Math.max(0, e.alertT-dt);
    if(e.hurtT>0)   e.hurtT=Math.max(0, e.hurtT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0, e.fearedT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/280)*1);
    const D=e.dir; // 1 right, -1 left
    const body='#6A6E78', belly='#9AA0AA', dark='#44484F', fang='#F4F4F0';
    // shadow
    ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+11,15,4,0,0,Math.PI*2); ctx.fillStyle='#181C22'; ctx.fill(); ctx.globalAlpha=1;
    // bushy tail (trails behind the facing direction)
    px(x-D*13-2,y-6,7,6,dark); px(x-D*15-2,y-8,5,5,body);
    // body — leaner and longer than the badger
    px(x-12,y-5,24,13,body);
    px(x-9,y+1,18,6,belly);
    // legs
    px(x-9,y+7,4,6,dark); px(x-2,y+7,4,6,dark); px(x+6,y+7,4,6,dark);
    // head
    px(x+D*7-7,y-11,14,12,body);
    // pricked ears
    px(x+D*7-6,y-15,4,5,dark); px(x+D*7+2,y-15,4,5,dark);
    // snarling muzzle + fang
    px(x+D*10-3,y-4,7,5,belly);
    px(x+D*12-1,y-1,2,2,fang);
    // glowing eyes + angry brow
    px(x+D*7-4,y-7,2,2,'#FFC400'); px(x+D*7+2,y-7,2,2,'#FFC400');
    px(x+D*7-5,y-8,10,1,'#22252B');
    // red flash while hurt (mirrors the dog's hurt flash)
    if(e.hurtT>0){
      ctx.globalAlpha=Math.min(0.5, e.hurtT/440);
      px(x-13,y-16,26,30,'#FF3B3B');
      ctx.globalAlpha=1;
    }
    // startled "!" when it just heard a dog
    Entities.drawAlert(e);
  },
});

function _wolfBite(e, p){
  spawnSparkles(p.x, p.y-8, '#D64545', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  showToast('🐺 A mountain wolf lunged at you!', 1400);
  // strong knockback
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*18, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*18, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
