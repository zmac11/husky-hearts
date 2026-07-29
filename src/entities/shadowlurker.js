// ====================== ENTITY: SHADOW-LURKER ======================
// A wispy thing of the dark (Whispering Woods 1). It only hunts where it's shadowed: if the
// dog is in deep shadow and within range it prowls in and nips; the moment the dog steps into
// a pool of lantern/torch light it recoils and slinks away. It teaches the whole light
// mechanic hands-on — light is safety here (even as, later, light also makes you easier for
// wolves to spot). Reuses the wander→chase shape of the badger, gated on Darkness.lightAt.

function _lurkerTouch(e, p){
  spawnSparkles(p.x, p.y-8, '#7A5AA0', 10);
  if(typeof Health!=='undefined') Health.damage(p, 2);
  if(typeof showToast==='function') showToast('👤 A shadow-lurker nipped you — stay in the light!', 1600);
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*13, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*13, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}

Entities.register('shadowlurker', {
  radius: 30,

  init(e){
    e.speed  = e.speed  || 1.0;
    e.chaseR = e.chaseR || 150;
    e.hp     = (typeof e.hp==='number') ? e.hp : 3;
    e.dir    = 1; e.wanderT = 0; e.wanderAng = 0; e.cool = 0; e.bob = 0;
  },

  update(e, t, dt){
    const target = (typeof _nearestPlayer==='function') ? _nearestPlayer(e) : null;
    const dist   = target ? Math.hypot(target.x-e.x, target.y-e.y) : Infinity;
    // Ambient (lantern) light at the dog — its own glow doesn't keep lurkers away.
    const dogLit = (target && typeof Darkness!=='undefined' && Darkness.active()) ? Darkness.ambientAt(target.x, target.y) : 0;
    const inShadow = dogLit < 0.4;

    if(e.fearedT>0 && target){                          // Storm Fang aura — flee, no bite
      const ang=Math.atan2(e.y-target.y, e.x-target.x);
      e.x+=Math.cos(ang)*e.speed*1.5*dtScale; e.y+=Math.sin(ang)*e.speed*1.5*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1; e._chasing=false;
    } else if(target && inShadow && dist < e.chaseR*Entities.noiseFactor(target)){
      if(!e._chasing){ e._chasing=true; e.alertT=700; if(typeof Tips!=='undefined') Tips.show('enemy'); }
      const ang=Math.atan2(target.y-e.y, target.x-e.x);
      e.x+=Math.cos(ang)*e.speed*1.35*dtScale; e.y+=Math.sin(ang)*e.speed*1.35*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<20 && e.cool<=0){ _lurkerTouch(e, target); e.cool=1000; }
    } else if(target && !inShadow && dist<170){         // dog is in the light — recoil away
      e._chasing=false;
      const ang=Math.atan2(e.y-target.y, e.x-target.x);
      e.x+=Math.cos(ang)*e.speed*1.25*dtScale; e.y+=Math.sin(ang)*e.speed*1.25*dtScale;
      e.dir=Math.cos(ang)>=0?1:-1;
    } else {                                            // idle drift
      e._chasing=false;
      e.wanderT-=dt;
      if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(700,1700); }
      e.x+=Math.cos(e.wanderAng)*e.speed*0.7*dtScale; e.y+=Math.sin(e.wanderAng)*e.speed*0.7*dtScale;
      e.dir=Math.cos(e.wanderAng)>=0?1:-1;
    }

    e.x=clamp(e.x, 20, WORLD_W-20); e.y=clamp(e.y, 26, WORLD_H-20);
    if(e.cool>0)   e.cool=Math.max(0, e.cool-dt);
    if(e.alertT>0) e.alertT=Math.max(0, e.alertT-dt);
    if(e.hurtT>0)  e.hurtT=Math.max(0, e.hurtT-dt);
    if(e.fearedT>0)e.fearedT=Math.max(0, e.fearedT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/300)*1.5);
    // It fades where it's lit — barely there in a lantern's glow, solid in the dark.
    const litHere=(typeof Darkness!=='undefined' && Darkness.active()) ? Darkness.lightAt(e.x,e.y) : 0;
    const solidity=1-Math.min(0.85, litHere*1.1);
    ctx.save();
    ctx.globalAlpha=0.22*solidity; ctx.beginPath(); ctx.ellipse(x,y+9,12,4,0,0,Math.PI*2); ctx.fillStyle='#0A0814'; ctx.fill();
    ctx.globalAlpha=Math.max(0.15, solidity);
    // wispy dark body with a ragged lower edge
    px(x-9,y-10,18,16,'#241C36');
    px(x-11,y-4,4,8,'#1B1528'); px(x+7,y-4,4,8,'#1B1528');
    px(x-8,y+5,4,4,'#1B1528'); px(x-1,y+6,4,4,'#1B1528'); px(x+5,y+5,4,4,'#1B1528'); // tatters
    // glowing eyes
    const D=e.dir;
    px(x+D*2-4,y-5,3,3,'#B98BFF'); px(x+D*2+2,y-5,3,3,'#B98BFF');
    px(x+D*2-3,y-4,1,1,'#F0E6FF'); px(x+D*2+3,y-4,1,1,'#F0E6FF');
    // hurt flash
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-10,y-12,20,20,'#FF6BA0'); }
    ctx.restore();
    Entities.drawAlert(e);
  },
});
