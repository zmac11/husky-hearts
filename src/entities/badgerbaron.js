// ====================== ENTITY: THE BADGER BARON (Sunny Meadows boss) ======================
// The FIRST boss — and the one fight you win with your wits, not your teeth. Your abilities
// don't awaken until AFTER this den (world-map.js), so the Baron simply can't be damaged
// head-on. He's all brawn, no brains: he winds up and CHARGES in a straight line, and the
// meadow den is dotted with leaf-covered PIT TRAPS (entities/pittrap.js). Line a covered pit
// up between you and him, bait the charge, and he crashes straight in — losing a third of his
// bluster each time. Three sprung pits and the Baron throws in the towel.
//
// He can still hurt YOU (a shoulder-barge on contact / mid-charge), so losing is the normal
// cozy Game Over -> Play Again. Reuses the boss framework: boss:true (HP bar + defeat banner
// + knockback-resist), a maxHp of 3 that the pits chip down, and config loot/XP
// (LOOT_DATA.enemies.badgerbaron). Because a trap-fall — not a hit — finishes him, the final
// tumble runs the standard defeat via Entities.hurt and then calls checkWin() itself, the way
// firepit/mooncap/shrinelantern complete their own objectives.

function _bbNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

// The first ARMED pit whose mouth the charging Baron has barreled into (null if none).
// The bigger the Baron (scale), the wider his body, so he tumbles in from a touch farther.
function _bbArmedPit(e, scale){
  const es=(typeof entities!=='undefined' && entities) ? entities : [];
  for(const pit of es){
    if(pit.kind!=='pittrap' || pit.state!=='armed') continue;
    if(Math.hypot(pit.x-e.x, pit.y-e.y) < (pit.radius||30)*(scale||1)) return pit;
  }
  return null;
}

Entities.register('badgerbaron', {
  radius: 40,

  init(e){
    e.name='The Badger Baron'; e.boss=true; e.noKnockback=true;
    e.maxHp = e.maxHp || 3;     // = number of pit traps in the arena; each fall costs 1
    e.hp    = (typeof e.hp==='number' && e.hp<=e.maxHp) ? e.hp : e.maxHp;
    e.speed = e.speed || 0.85;
    e.dmg   = e.dmg   || 3;
    e.scale = e.scale || BOSS_SCALE;   // body + charge reach + tumble range scale by this
    e.dir=-1; e.state='chase'; e.actT=0;
    e.chargeCd=2400; e.touchCd=0;
    e.cvx=0; e.cvy=0; e.bob=0; e.daze=0;
  },

  update(e, t, dt){
    const p=_bbNearest(e);
    if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const rage=(e.maxHp-e.hp);          // 0,1,2 — angrier as pits chip him down
    const spd = e.speed * (1 + rage*0.18);
    const S = e.scale || 1;   // scales charge reach, barge range and the tumble-in radius

    e.chargeCd=Math.max(0,e.chargeCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0)   e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0)  e.alertT=Math.max(0,e.alertT-dt);

    // ---- scripted states ----
    if(e.state==='trapped'){                    // wedged in a pit, struggling free
      e.actT-=dt; e.daze=Math.sin(t/40)*2;
      if(e.actT<=0){ e.state='chase'; e.chargeCd=1200; e.daze=0; e.alertT=500; }
      e.bob=t; return;
    }
    if(e.state==='stomp'){                      // reared after crashing into a wall — dazed beat
      e.actT-=dt; e.daze=Math.sin(t/50)*1.6;
      if(e.actT<=0){ e.state='chase'; e.chargeCd=1600; e.daze=0; }
      e.bob=t; return;
    }
    if(e.state==='chargewind'){                 // paws the ground — the tell to read
      e.actT-=dt;
      if(e.actT<=0){
        // FEINT: once angry, he sometimes fakes the charge — a stutter-hop back, then re-winds —
        // to bait a premature dodge. Teaches the player to read the real tell.
        if(rage>=1 && !e._feinted && Math.random()<0.33){
          e._feinted=true; e.actT=260; e.alertT=300;
          const a0=Math.atan2(p.y-e.y, p.x-e.x);
          e.x=clamp(e.x-Math.cos(a0)*8, 20, WORLD_W-20);
          e.y=clamp(e.y-Math.sin(a0)*8, 26, WORLD_H-20);
          if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+8, '#C4903A', 4);
          e.bob=t; return;
        }
        e._feinted=false;
        e.state='charge'; e.actT= 720 - rage*40;
        const a=Math.atan2(p.y-e.y, p.x-e.x); const L=(7 + rage*1.2)*S;
        e.cvx=Math.cos(a)*L; e.cvy=Math.sin(a)*L; e.dir=e.cvx>=0?1:-1;
        if(typeof sfxHowl==='function') sfxHowl();
      }
      e.bob=t; return;
    }
    if(e.state==='charge'){
      e.x=clamp(e.x+e.cvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.cvy*dtScale, 26, WORLD_H-20);
      const pit=_bbArmedPit(e, S);
      if(pit){ _bbFall(e, pit); e.bob=t; return; }          // crashed into a covered pit
      if(dist<32*S && e.touchCd<=0){ _bbBarge(e,p); e.touchCd=800; }
      const atWall = e.x<=22||e.x>=WORLD_W-22||e.y<=28||e.y>=WORLD_H-22;
      if(atWall){
        // FRUSTRATED STOMP: he brains himself on the wall, rears, and drops a shockwave —
        // step out of the ring. Rewards luring the charge into a wall.
        e.state='stomp'; e.actT=520; e.alertT=500; e.daze=0;
        Entities.spawn('groundzone', { x:e.x, y:e.y+6, r:46*S, warnMs:480, dmg:e.dmg, color:'#C4903A', scale:S });
        if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+8, '#C4903A', 16);
        if(typeof sfxHowl==='function') sfxHowl();
        e.bob=t; return;
      }
      e.actT-=dt; if(e.actT<=0){ e.state='chase'; e.chargeCd= 2200 - rage*300; }
      e.bob=t; return;
    }

    // ---- chase / decide next move ----
    if(e.chargeCd<=0 && dist<380){
      e.state='chargewind'; e.actT= 760 - rage*120; e.alertT=600;   // brief paw-the-ground tell
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+8, '#C4903A', 6);
      e.bob=t; return;
    }
    const a=Math.atan2(p.y-e.y, p.x-e.x);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 20, WORLD_W-20);
    e.y=clamp(e.y+Math.sin(a)*spd*dtScale, 26, WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<26*S && e.touchCd<=0){ _bbBarge(e,p); e.touchCd=1000; }
    e.bob=t;
  },

  draw(e, t){
    const S=e.scale||1, D=e.dir;
    const trapped=(e.state==='trapped'), wind=(e.state==='chargewind'), stomp=(e.state==='stomp');
    const y0=Math.round(e.y);
    const x=Math.round(e.x + ((trapped||stomp)?e.daze:0));
    const y=y0 + (trapped? 9 : (stomp? -2 : Math.round(Math.sin(t/300)*1)));   // sunk in pit / reared on stomp
    // scale AND flip horizontally by facing — draw everything "facing right", the flip mirrors it
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(D<0?-S:S, S); ctx.translate(-e.x, -e.y);

    // ---- palette ----
    const cShadow='#2E2A26', cDark='#403A34', cBase='#5A544C', cMid='#6E675E',
          cBelly='#9A9288', faceDark='#26221E', faceWhite='#F0ECE4', claw='#E7E2D6', nose='#161311',
          toothW='#F4F1E8', mouthR='#571F20', gold='#F2C94C', goldLt='#F8DC74', jewel='#E0503C',
          capeR='#7A4CB4', capeSh='#4E2E82', capeTrim='#F2D250';   // royal purple + gold
    const eye='#FF3A2A', eyeHot='#FFB07A';
    const by=y-(trapped?0:4);

    // ground shadow
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y+13,22,6,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;
    // charge wind-up tell: a red dust streak kicked up under the feet
    if(wind){ ctx.save(); ctx.globalAlpha=0.32+0.2*Math.sin(t/60); px(x-23,y+9,47,4,'#E0503C'); ctx.restore(); }
    // stomp tell: a brown dust puff around the feet
    if(stomp){ ctx.save(); ctx.globalAlpha=0.30+0.18*Math.sin(t/55); ctx.fillStyle='#C4903A'; ctx.beginPath(); ctx.ellipse(x,y+9,27,8,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // ---- rear haunch + stubby tail ----
    px(x-20, by-4, 14,18, cBase);
    px(x-21, by+3, 8,11, cDark);
    px(x-23, by+2, 5,5, cDark);              // stubby badger tail

    // ---- torso ----
    px(x-14, by-6, 30,20, cBase);
    px(x-11, by-8, 24,5, cMid);              // lit upper back
    px(x-9,  by+8, 23,6, cBelly);            // pale belly
    px(x-14, by+12, 30,4, cDark);            // underside shadow
    // ---- legs + big digging claws ----
    px(x-11, by+13, 7,8, cDark);  px(x-11, by+20, 7,2, claw);
    px(x+6,  by+13, 9,9, cDark);                                  // broad front leg
    px(x+6,  by+21, 9,2, claw); px(x+15, by+19, 4,2, claw); px(x+15, by+22, 4,2, claw);   // forward-raking claws

    // ---- royal mantle: purple velvet cape over the shoulders, draping down the near flank ----
    px(x-11, by-11, 22,10, capeR);           // collar across the shoulders/back
    px(x-12, by-2,  12,15, capeR);           // cape hanging down the near flank
    px(x-11, by-11, 22,2,  capeTrim);        // gold collar trim
    px(x-12, by+11, 12,2,  capeTrim);        // gold hem at the bottom of the drape
    px(x-8,  by-1, 2,12, capeSh); px(x-3, by-1, 2,12, capeSh);   // velvet fold shadows
    px(x+10, by-8, 3,4, gold);               // gold clasp at the throat

    // ---- head (facing +x) with the badger face-mask ----
    const hx=x+13, hy=by-6;
    px(hx-8, hy-7, 17,16, cBase);            // head mass
    // rounded ears, dark inner
    px(hx-7, hy-10, 5,5, cDark); px(hx-6, hy-9, 3,3, cMid);
    px(hx+4, hy-10, 5,5, cDark); px(hx+5, hy-9, 3,3, cMid);
    // pale face + the two black badger bands (white centre stripe shows between)
    px(hx-6, hy-5, 16,14, faceWhite);
    px(hx-5, hy-5, 4,13, faceDark);          // left eye-band
    px(hx+6, hy-5, 4,13, faceDark);          // right eye-band
    px(hx-5, hy-3, 15,1, cShadow);           // heavy brow
    // angry red eyes set in the bands
    px(hx-4, hy-1, 3,2, eye); px(hx-4, hy-1, 1,1, eyeHot);
    px(hx+7, hy-1, 3,2, eye); px(hx+7, hy-1, 1,1, eyeHot);
    // snout + black nose
    px(hx+8, hy+2, 6,5, cMid); px(hx+12, hy+3, 3,3, nose);
    // bared-teeth snarl
    px(hx+5, hy+7, 9,3, mouthR);
    px(hx+6, hy+7, 1,2, toothW); px(hx+9, hy+7, 1,2, toothW); px(hx+12, hy+7, 1,2, toothW);

    // ---- gold crown seated between the ears ----
    px(hx-7, hy-10, 15,3, gold); px(hx-7, hy-8, 15,1, '#C9A22E');   // band + underside shade
    px(hx-6, hy-15, 3,6, goldLt); px(hx, hy-16, 3,7, goldLt); px(hx+5, hy-15, 3,6, goldLt);   // points
    px(hx-6, hy-16, 2,2, gold); px(hx-0, hy-17, 2,2, gold); px(hx+6, hy-16, 2,2, gold);        // point tips
    px(hx-1, hy-12, 2,2, jewel);                                     // jewel

    // dazed stars while trapped
    if(trapped){ ctx.save(); ctx.fillStyle='#FFD93D'; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      for(let i=0;i<3;i++){ const a=t/300+i*2.1; ctx.globalAlpha=0.9; ctx.fillText('★', x+Math.cos(a)*13, by-22+Math.sin(a)*4); } ctx.restore(); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-22,by-18,46,38,'#FF5B5B'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);   // drawn unscaled/un-flipped so the "!" stays a normal pop
  },
});

// A charging Baron crashes into a covered pit: spring it, chip a third of his bluster. The
// third fall finishes him — run the standard enemy defeat (loot/XP/poof/banner) via
// Entities.hurt, then complete the level like the other objective entities do.
function _bbFall(e, pit){
  pit.state='sprung';
  if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+6, '#8A6A3A', 24);
  if((e.hp-1) <= 0){
    if(typeof Entities!=='undefined') Entities.hurt(e, e.hp, e.x, e.y, 0);   // -> loot/XP/poof + "🏆 …is beaten!"
    if(typeof checkWin==='function') checkWin();                             // spawn the exit portal + finale chest
    return;
  }
  e.hp-=1; e.hurtT=320; e.state='trapped'; e.actT= 1900 - (e.maxHp-e.hp)*220;
  if(typeof spawnFloater==='function') spawnFloater(e.x, e.y-18, 'THUD!', 'hit');
  if(typeof sfxDeliver==='function') sfxDeliver();
  if(typeof updateHUD==='function') updateHUD();
  if(typeof showToast==='function') showToast('💢 The Baron tumbled into a pit! ('+e.hp+' to go)', 1700);
}

// The Baron shoulders the dog aside: a little damage + a shove (cozy — a faint sends you to
// the normal Game Over -> Play Again).
function _bbBarge(e, p){
  if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#E0B050', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg);
  const ang=Math.atan2(p.y-e.y, p.x-e.x), K=20*(e.scale||1);
  p.x=clamp(p.x+Math.cos(ang)*K, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*K, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
