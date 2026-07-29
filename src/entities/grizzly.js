// ====================== ENTITY: OLD GRIZZLY (Whispering Woods boss) ======================
// The second boss — a slow, immense bear that guards the grove. Where the Alpha Wolf darts
// and summons, the Grizzly is all weight: it lumbers after you and unleashes two big,
// telegraphed attacks you read and dodge —
//   • SLAM — it rears up, then ground-pounds; a shockwave ring blooms out, so get clear of it.
//   • CHARGE — it paws the ground, then barrels in a straight line; sidestep and it rumbles past.
// Below a third health it enrages: quicker, and it chains its attacks. It's tankier than the
// wolf but has no summons, so the fight is pure dodging — a test of the reflexes the whole
// biome (and Cliffside's rockfalls) trained.
//
// Reuses the boss framework: boss:true (HP bar + banner + knockback-resist), phased scripted
// states, config loot/XP (LOOT_DATA.enemies.grizzly), and `defeat` to clear. Being the last
// real level of the woods, beating it drops the biome-finale golden chest.

function _grizNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('grizzly', {
  radius: 46,

  init(e){
    e.name='The Old Grizzly'; e.boss=true; e.noKnockback=true;
    e.maxHp = e.maxHp || 44;
    e.hp    = (typeof e.hp==='number' && e.hp<=e.maxHp) ? e.hp : e.maxHp;
    e.speed = e.speed || 0.68;      // slow and heavy
    e.dmg   = e.dmg   || 4;
    e.slamR = e.slamR || 100;
    e.dir=-1; e.state='chase'; e.actT=0;
    e.slamCd=3200; e.chargeCd=5200; e.touchCd=0;
    e.cvx=0; e.cvy=0; e.slamRingT=0; e.bob=0;
  },

  update(e, t, dt){
    const p=_grizNearest(e);
    if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp;
    const phase = frac<=0.34 ? 3 : (frac<=0.67 ? 2 : 1);
    const enraged = phase===3;
    const spd = e.speed * (enraged ? 1.45 : 1);

    e.slamCd=Math.max(0,e.slamCd-dt); e.chargeCd=Math.max(0,e.chargeCd-dt);
    if(e.touchCd>0)  e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.slamRingT>0)e.slamRingT=Math.max(0,e.slamRingT-dt);
    if(e.hurtT>0)    e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0)   e.alertT=Math.max(0,e.alertT-dt);

    // ---- scripted states ----
    if(e.state==='slamwind'){                 // reared up
      e.actT-=dt;
      if(e.actT<=0){
        e.state='chase'; e.slamCd = enraged?2200:3600; e.slamRingT=520;
        if(dist < e.slamR){ _grizHit(e, p, e.dmg+1); }     // caught in the pound
        if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+6, '#9A7C50', 16);
        if(typeof sfxHowl==='function') sfxHowl();
      }
      e.bob=t; return;
    }
    if(e.state==='chargewind'){                // pawing the ground
      e.actT-=dt;
      if(e.actT<=0){ e.state='charge'; e.actT= enraged?560:480; const a=Math.atan2(p.y-e.y,p.x-e.x); const L=enraged?8.5:7; e.cvx=Math.cos(a)*L; e.cvy=Math.sin(a)*L; e.dir=e.cvx>=0?1:-1; if(typeof sfxHowl==='function') sfxHowl(); }
      e.bob=t; return;
    }
    if(e.state==='charge'){
      e.x=clamp(e.x+e.cvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.cvy*dtScale, 26, WORLD_H-20);
      if(dist<34 && e.touchCd<=0){ _grizHit(e, p, e.dmg+1); e.touchCd=800; }
      e.actT-=dt; if(e.actT<=0){ e.state='chase'; e.chargeCd = enraged?3200:5200; }
      e.bob=t; return;
    }

    // ---- decide the next move ----
    if(e.chargeCd<=0 && dist>150 && dist<440){
      e.state='chargewind'; e.actT= enraged?520:680; e.alertT=600;
      e.bob=t; return;
    }
    if(e.slamCd<=0 && dist<130){
      e.state='slamwind'; e.actT= enraged?560:760; e.alertT=600;
      e.bob=t; return;
    }
    // lumber toward the dog
    const a=Math.atan2(p.y-e.y, p.x-e.x);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 20, WORLD_W-20);
    e.y=clamp(e.y+Math.sin(a)*spd*dtScale, 26, WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<30 && e.touchCd<=0){ _grizHit(e, p, e.dmg); e.touchCd=1000; }
    e.bob=t;
  },

  draw(e, t){
    const rear=(e.state==='slamwind');
    const x=Math.round(e.x), y=Math.round(e.y + (rear? -3 : Math.sin(t/340)*1));
    const D=e.dir;
    // slam shockwave ring
    if(e.slamRingT>0){
      const prog=1-e.slamRingT/520;
      ctx.save(); ctx.globalAlpha=0.5*(1-prog); ctx.lineWidth=5; ctx.strokeStyle='#C7A56A';
      ctx.beginPath(); ctx.arc(x, y+8, 10+prog*e.slamR, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
    // shadow
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y+16,22,6,0,0,Math.PI*2); ctx.fillStyle='#0E1A10'; ctx.fill(); ctx.globalAlpha=1;
    // charge tell (dust) / slam tell (rear aura)
    if(e.state==='chargewind'){ ctx.save(); ctx.globalAlpha=0.35+0.2*Math.sin(t/60); ctx.fillStyle='#E0503C'; px(x-D*4-22,y+8,44,4,'#E0503C'); ctx.restore(); }
    if(rear){ ctx.save(); ctx.globalAlpha=0.28+0.18*Math.sin(t/70); ctx.fillStyle='#E0A03C'; ctx.beginPath(); ctx.ellipse(x,y+2,30,16,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // body (big brown bear)
    const by=y-(rear?4:8);
    px(x-20,by-8,40,24,'#6E4A2E'); px(x-15,by+2,30,12,'#835A38');
    px(x-16,by+14,8,8,'#4A3018'); px(x+8,by+14,8,8,'#4A3018');   // legs/paws
    // hump + head
    px(x-8,by-14,16,8,'#5E3E26');
    const hx=x+D*16;
    px(hx-9,by-10,18,15,'#5A3A22');
    px(hx-9,by-15,6,7,'#4A3018'); px(hx+3,by-15,6,7,'#4A3018');   // ears
    px(hx+D*2-4,by-4,3,3,'#2A1A10'); px(hx+D*2+2,by-4,3,3,'#2A1A10'); // eyes
    px(hx+D*6-3,by,5,4,'#3A2414');   // snout
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-22,by-16,44,40,'#FF6B6B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _grizHit(e, p, dmg){
  spawnSparkles(p.x, p.y-8, '#E0A055', 12);
  if(typeof Health!=='undefined') Health.damage(p, dmg);
  const ang=Math.atan2(p.y-e.y, p.x-e.x);
  p.x=clamp(p.x+Math.cos(ang)*22, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*22, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
