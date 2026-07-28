// ====================== ENTITY: ALPHA WOLF (Rocky Mountains boss) ======================
// The first real boss fight — a huge pack leader that tests the combat the biome taught. It
// stalks you, TELEGRAPHS a lunge (a crouch you sidestep), and at half health starts HOWLING
// to summon pack-mates and buff itself — but the howl has a long wind-up you can INTERRUPT by
// hitting it, so an ability landed at the right moment saves you a two-front fight. Below a
// third health it enrages: faster, and it lunges more often.
//
// Losing is cozy: run out of hearts and it's the normal Game Over → Play Again, which rebuilds
// this arena with your dog and gear intact. Beating it (Entities.hurt on 0 hp) drops the
// biome-finale loot and, since it's the last real level of the mountains, a golden chest via
// checkWin. It sets `boss:true` (so it resists knockback and gets the boss defeat banner) and
// `name` for the HP bar + banners.

function _awNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('alphawolf', {
  radius: 42,

  init(e){
    e.name    = e.name || 'The Alpha Wolf';
    e.boss    = true;
    e.noKnockback = true;
    e.maxHp   = e.maxHp || 34;
    e.hp      = (typeof e.hp==='number' && e.hp<=e.maxHp) ? e.hp : e.maxHp;
    e.speed   = e.speed || 1.05;
    e.dmg     = e.dmg   || 3;
    e.dir     = -1;
    e.state   = 'chase';      // 'chase' | 'windup' | 'lunge' | 'howl'
    e.actT    = 0;            // remaining ms in the current scripted state
    e.lungeCd = 2400; e.summonCd = 7000;
    e.lvx=0; e.lvy=0; e.touchCd=0; e.bob=0; e.summoned=0;
  },

  update(e, t, dt){
    const p=_awNearest(e);
    if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp;
    const phase = frac<=0.34 ? 3 : (frac<=0.67 ? 2 : 1);
    const enraged = phase===3;
    const spd = e.speed * (enraged ? 1.35 : 1);

    e.lungeCd=Math.max(0,e.lungeCd-dt); e.summonCd=Math.max(0,e.summonCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0)   e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0)  e.alertT=Math.max(0,e.alertT-dt);

    // ---- scripted states ----
    if(e.state==='windup'){                      // crouch, then explode into a lunge
      e.actT-=dt;
      if(e.actT<=0){ e.state='lunge'; e.actT=360; const a=Math.atan2(p.y-e.y,p.x-e.x); const L=enraged?9:7.5; e.lvx=Math.cos(a)*L; e.lvy=Math.sin(a)*L; if(typeof sfxHowl==='function') sfxHowl(); }
      e.bob=t; return;
    }
    if(e.state==='lunge'){
      e.x=clamp(e.x+e.lvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.lvy*dtScale, 26, WORLD_H-20);
      e.dir=e.lvx>=0?1:-1;
      if(dist<30 && e.touchCd<=0){ _awBite(e,p); e.touchCd=700; }
      e.actT-=dt; if(e.actT<=0){ e.state='chase'; e.lungeCd=enraged?1600:2600; }
      e.bob=t; return;
    }
    if(e.state==='howl'){
      // interruptible: a solid hit during the wind-up cancels it and staggers the wolf
      if(e.hurtT>0){ e.state='chase'; e.summonCd=3000; e.actT=0; if(typeof showToast==='function') showToast('💫 You interrupted the howl!',1600); e.bob=t; return; }
      e.actT-=dt;
      if(e.actT<=0){
        e.state='chase'; e.summonCd = enraged?9000:12000;
        const n = enraged?2:1;
        for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2); Entities.spawn('wolf',{ x:clamp(e.x+Math.cos(a)*60,30,WORLD_W-30), y:clamp(e.y+Math.sin(a)*60,40,WORLD_H-40), speed:1.15 }); }
        e.summoned+=n;
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-10,'#C9C9E0',18);
        if(typeof showToast==='function') showToast('🐺 The Alpha calls the pack!',1700);
      }
      e.bob=t; return;
    }

    // ---- decide the next move (chase) ----
    if(phase>=2 && e.summonCd<=0 && dist<440 && e.summoned<(enraged?6:4)){
      e.state='howl'; e.actT= enraged?800:1000; e.alertT=700;   // long, interruptible wind-up
      if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-16,'#B9B9D8',6);
      e.bob=t; return;
    }
    if(e.lungeCd<=0 && dist<300){
      e.state='windup'; e.actT= enraged?420:560; e.alertT=500;  // brief crouch tell
      e.bob=t; return;
    }
    // otherwise pad toward the dog
    const a=Math.atan2(p.y-e.y, p.x-e.x);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 20, WORLD_W-20);
    e.y=clamp(e.y+Math.sin(a)*spd*dtScale, 26, WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<26 && e.touchCd<=0){ _awBite(e,p); e.touchCd=900; }
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y + (e.state==='windup'?2:Math.sin(t/300)*1));
    const D=e.dir, crouch=(e.state==='windup');
    // shadow (big)
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y+14,20,6,0,0,Math.PI*2); ctx.fillStyle='#0E1A1A'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell: a red crouch aura
    if(crouch){ ctx.save(); ctx.globalAlpha=0.3+0.2*Math.sin(t/60); ctx.fillStyle='#E0503C'; ctx.beginPath(); ctx.ellipse(x,y+6,26,12,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // body (large dark-grey wolf)
    const bodyY=y-(crouch?2:6);
    px(x-18,bodyY-6,36,20,'#5A5E68'); px(x-14,bodyY+2,28,10,'#7A7E88');
    px(x-14,bodyY+12,6,7,'#3A3E46'); px(x+8,bodyY+12,6,7,'#3A3E46');   // legs
    // tail
    const tw=Math.sin(t/160)*4;
    px(x-D*20,bodyY-4+tw*0.4,6,12,'#4A4E56');
    // head toward facing
    const hx=x+D*14;
    px(hx-8,bodyY-14,16,14,'#4E525C');
    px(hx-8,bodyY-18,5,7,'#3A3E46'); px(hx+3,bodyY-18,5,7,'#3A3E46'); // ears
    px(hx+D*2-4,bodyY-8,3,3,'#FFC83A'); px(hx+D*2+2,bodyY-8,3,3,'#FFC83A'); // amber eyes
    px(hx+D*5-2,bodyY-4,4,3,'#2A2E36'); // snout
    // howl tell: head-back + rings
    if(e.state==='howl'){
      ctx.save(); ctx.globalAlpha=0.5*(0.5+0.5*Math.sin(t/120)); ctx.strokeStyle='#C9C9E0'; ctx.lineWidth=2;
      for(let i=1;i<=2;i++){ ctx.beginPath(); ctx.arc(hx, bodyY-14, 10+i*8+(t/40%10), -Math.PI*0.9, -Math.PI*0.1); ctx.stroke(); }
      ctx.restore();
    }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-20,y-22,40,36,'#FF5B5B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _awBite(e, p){
  spawnSparkles(p.x, p.y-8, '#E05555', 12);
  if(typeof Health!=='undefined') Health.damage(p, (e.dmg||3));
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*18, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*18, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
