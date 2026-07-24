// ====================== ENTITY: ENEMY (grumpy badger) ======================
// A simple wander-then-chase critter. Proof that the entity registry supports
// active adversaries; tune/extend by adding fields to the spawned instance.

function _nearestPlayer(e){
  let best=null, bestD=Infinity;
  for(const p of Game.players){ if(p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bestD){ bestD=d; best=p; } }
  return best;
}

Entities.register('enemy', {
  radius: 30,

  init(e){
    e.speed   = e.speed || 0.9;
    e.chaseR  = e.chaseR || 120;   // start chasing within this range
    e.hp      = (typeof e.hp==='number') ? e.hp : 4;   // 2 cannon-ball hits
    e.dir     = 1;
    e.wanderT = 0;
    e.wanderAng = 0;
    e.cool    = 0;                  // touch cooldown (ms)
    e.bob     = 0;
  },

  update(e, t, dt){
    // Slow to a swim in water, just like the dogs.
    const swim = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming)) ? 0.5 : 1;
    e.swimming = swim<1;
    const target=_nearestPlayer(e);
    const dist=target ? Math.hypot(target.x-e.x, target.y-e.y) : Infinity;

    // Feared (Storm Fang aura): run AWAY from the dog and don't attack.
    if(e.fearedT>0 && target){
      const ang=Math.atan2(e.y-target.y, e.x-target.x);
      e.x+=Math.cos(ang)*e.speed*1.5*swim*dtScale;
      e.y+=Math.sin(ang)*e.speed*1.5*swim*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
      e._chasing=false;
    }
    // Detection range scales with how loud the target dog is (breed noise + howling).
    else if(target && dist<e.chaseR*Entities.noiseFactor(target)){
      if(!e._chasing){ e._chasing=true; e.alertT=700; if(typeof Tips!=='undefined') Tips.show('enemy'); }   // just heard the dog → "!"
      // chase
      const ang=Math.atan2(target.y-e.y, target.x-e.x);
      e.x+=Math.cos(ang)*e.speed*1.4*swim*dtScale;
      e.y+=Math.sin(ang)*e.speed*1.4*swim*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<20 && e.cool<=0){ _enemyTouch(e, target); e.cool=900; }
    } else {
      e._chasing=false;
      // wander
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(600,1600); }
      e.x+=Math.cos(e.wanderAng)*e.speed*swim*dtScale;
      e.y+=Math.sin(e.wanderAng)*e.speed*swim*dtScale;
      e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }

    e.x=clamp(e.x, 20, WORLD_W-20);
    e.y=clamp(e.y, 26, WORLD_H-20);
    if(e.cool>0) e.cool=Math.max(0, e.cool-dt);
    if(e.alertT>0) e.alertT=Math.max(0, e.alertT-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0, e.hurtT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0, e.fearedT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/300)*1);
    const D=e.dir; // 1 right, -1 left
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+10,13,4,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;
    // body (dark grey badger)
    px(x-11,y-4,22,13,'#5A5650');
    px(x-8,y+2,16,7,'#8A8680');   // lighter belly
    // legs
    px(x-8,y+8,4,5,'#3A3630'); px(x+4,y+8,4,5,'#3A3630');
    // head
    px(x+D*6-6,y-10,12,11,'#4A4640');
    // white face stripe (badger)
    px(x+D*6-1,y-10,2,10,'#F0ECE4');
    // ears
    px(x+D*6-6,y-13,3,4,'#3A3630'); px(x+D*6+3,y-13,3,4,'#3A3630');
    // eyes (angry)
    px(x+D*6-4,y-6,2,2,'#FF3030'); px(x+D*6+2,y-6,2,2,'#FF3030');
    // grumpy brow
    px(x+D*6-5,y-7,10,1,'#1A1616');
    // red flash while hurt (mirrors the dog's hurt flash)
    if(e.hurtT>0){
      ctx.globalAlpha=Math.min(0.5, e.hurtT/440);
      px(x-12,y-14,24,28,'#FF3B3B');
      ctx.globalAlpha=1;
    }
    // startled "!" when it just heard a dog
    Entities.drawAlert(e);
  },
});

function _enemyTouch(e, p){
  spawnSparkles(p.x, p.y-8, '#E05555', 10);
  // A nip costs the dog health (1 heart). Health.damage handles HUD + faint.
  if(typeof Health!=='undefined') Health.damage(p, 2);
  showToast('😾 The grumpy badger nipped you! (-1 ❤️)', 1500);
  // knock the dog back a little
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*14, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*14, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
