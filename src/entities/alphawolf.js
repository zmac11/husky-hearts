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
    e.scale   = e.scale || BOSS_SCALE;   // body + every attack/telegraph scale by this
    e.dir     = -1;
    e.state   = 'chase';      // 'chase' | 'windup' | 'lunge' | 'howl'
    e.actT    = 0;            // remaining ms in the current scripted state
    e.lungeCd = 2400; e.summonCd = 3000; e.pounceCd = 3000;   // first howl/pounce come soon
    e.lvx=0; e.lvy=0; e.touchCd=0; e.bob=0; e.summoned=0;
    e.flurry=0;              // remaining chained lunges in an enraged flurry
    e.ptx=0; e.pty=0;        // marked pounce landing spot
  },

  update(e, t, dt){
    const p=_awNearest(e);
    if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp;
    const phase = frac<=0.40 ? 3 : (frac<=0.80 ? 2 : 1);   // P2 (howl) opens at 80% so it's seen; P3 (enrage) at 40%
    const enraged = phase===3;
    const spd = e.speed * (enraged ? 1.35 : 1);
    const S = e.scale || 1;   // scales lunge reach, bite range and the summon spread

    e.lungeCd=Math.max(0,e.lungeCd-dt); e.summonCd=Math.max(0,e.summonCd-dt); e.pounceCd=Math.max(0,e.pounceCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0)   e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0)  e.alertT=Math.max(0,e.alertT-dt);

    // ---- scripted states ----
    if(e.state==='windup'){                      // crouch, then explode into a lunge
      e.actT-=dt;
      if(e.actT<=0){ e.state='lunge'; e.actT=360; const a=Math.atan2(p.y-e.y,p.x-e.x); const L=(enraged?9:7.5)*S; e.lvx=Math.cos(a)*L; e.lvy=Math.sin(a)*L; if(typeof sfxHowl==='function') sfxHowl(); }
      e.bob=t; return;
    }
    if(e.state==='lunge'){
      e.x=clamp(e.x+e.lvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.lvy*dtScale, 26, WORLD_H-20);
      e.dir=e.lvx>=0?1:-1;
      if(dist<30*S && e.touchCd<=0){ _awBite(e,p); e.touchCd=700; }
      e.actT-=dt;
      if(e.actT<=0){
        if(e.flurry>0){ e.flurry--; e.state='windup'; e.actT=200; e.alertT=300; }   // feral flurry: chain another lunge
        else { e.state='chase'; e.lungeCd=enraged?1600:2600; }
      }
      e.bob=t; return;
    }
    if(e.state==='pouncewind'){                  // deep crouch — coils to leap onto the marked spot
      e.actT-=dt;
      if(e.actT<=0){
        e.state='pounce'; e.actT= enraged?300:360;
        const a=Math.atan2(e.pty-e.y, e.ptx-e.x); const L=(enraged?12:10)*S;
        e.lvx=Math.cos(a)*L; e.lvy=Math.sin(a)*L; e.dir=e.lvx>=0?1:-1;
        if(typeof sfxDash==='function') sfxDash();
      }
      e.bob=t; return;
    }
    if(e.state==='pounce'){                       // airborne leap; lands on the danger zone
      e.x=clamp(e.x+e.lvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.lvy*dtScale, 26, WORLD_H-20);
      if(dist<32*S && e.touchCd<=0){ _awBite(e,p); e.touchCd=700; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='chase'; e.pounceCd=enraged?4200:6000; if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y+8,'#C9C9E0',12); }
      e.bob=t; return;
    }
    if(e.state==='howl'){
      // interruptible: a solid hit during the wind-up cancels it and staggers the wolf
      if(e.hurtT>0){ e.state='chase'; e.summonCd=3000; e.actT=0; if(typeof showToast==='function') showToast('💫 You interrupted the howl!',1600); e.bob=t; return; }
      e.actT-=dt;
      if(e.actT<=0){
        e.state='chase'; e.summonCd = enraged?6000:8000;
        const n = enraged?2:1;
        for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2); Entities.spawn('wolf',{ x:clamp(e.x+Math.cos(a)*60*S,30,WORLD_W-30), y:clamp(e.y+Math.sin(a)*60*S,40,WORLD_H-40), speed:1.15 }); }
        e.summoned+=n;
        // BUFF THE PACK: every wolf (freshly summoned + already prowling) gets a lasting speed
        // bump (capped) and a rally flash — so a howl left uninterrupted makes the whole pack worse.
        let buffed=0;
        (typeof entities!=='undefined'?entities:[]).forEach(w=>{ if(w.kind==='wolf'){ w.speed=Math.min((w.speed||1.15)*1.18, 1.9); if(typeof spawnSparkles==='function') spawnSparkles(w.x,w.y-8,'#FF9A5A',6); buffed++; } });
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-10,'#C9C9E0',18);
        if(typeof sfxSummon==='function') sfxSummon();
        if(typeof showToast==='function') showToast(buffed>1?'🐺 The Alpha rallies the pack!':'🐺 The Alpha calls the pack!',1700);
      }
      e.bob=t; return;
    }

    // ---- decide the next move (chase) ----
    if(phase>=2 && e.summonCd<=0 && dist<440 && e.summoned<(enraged?6:4)){
      e.state='howl'; e.actT= enraged?800:1000; e.alertT=700;   // long, interruptible wind-up
      if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-16,'#B9B9D8',6);
      e.bob=t; return;
    }
    // pounce: leap onto a telegraphed landing zone — punishes kiting at mid-to-long range
    if(e.pounceCd<=0 && dist>110 && dist<470){
      e.state='pouncewind'; e.actT= enraged?520:680; e.alertT=650;
      e.ptx=p.x; e.pty=p.y;   // mark where it will crash down
      const warn=(enraged?520:680)+(enraged?300:360);   // strike as the wolf lands
      Entities.spawn('groundzone', { x:e.ptx, y:e.pty, r:66*S, warnMs:warn, dmg:e.dmg+1, color:'#D65A4C', scale:S });
      if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y+6,'#D65A4C',6);
      e.bob=t; return;
    }
    if(e.lungeCd<=0 && dist<300){
      e.state='windup'; e.actT= enraged?420:560; e.alertT=500;  // brief crouch tell
      e.flurry = enraged?2:0;   // enraged: this lunge becomes a 3-hit feral flurry
      e.bob=t; return;
    }
    // otherwise pad toward the dog
    const a=Math.atan2(p.y-e.y, p.x-e.x);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 20, WORLD_W-20);
    e.y=clamp(e.y+Math.sin(a)*spd*dtScale, 26, WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<26*S && e.touchCd<=0){ _awBite(e,p); e.touchCd=900; }
    e.bob=t;
  },

  draw(e, t){
    const S=e.scale||1, D=e.dir;
    const crouch=(e.state==='windup'||e.state==='pouncewind'), howl=(e.state==='howl'), airborne=(e.state==='pounce');
    const y0=Math.round(e.y);
    const x=Math.round(e.x), y=y0 + (crouch?2 : airborne?-12 : Math.round(Math.sin(t/300)*1));
    const frac=e.hp/(e.maxHp||e.hp), enraged=frac<=0.34;
    // Scale AND flip horizontally by facing, so the whole (asymmetric) wolf mirrors cleanly
    // and the detailed head can be drawn once, always "facing right" (+x = forward).
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(D<0?-S:S, S); ctx.translate(-e.x, -e.y);

    // ---- palette ----
    const cShadow='#2B2E37', cDark='#3B3F49', cBase='#4E525E', cMid='#5D616D',
          cLight='#787D8C', cBelly='#8C90A0', cFang='#F5F5ED', cMouth='#4C1618',
          cTongue='#BE484C', cNose='#111318', cClaw='#E8E8DE';
    const eye    = enraged ? '#FF3A2A' : '#FFC63A';
    const eyeHot = enraged ? '#FFB07A' : '#FFEAA0';
    const bodyY  = y-(crouch?2:6);
    const tw     = Math.sin(t/150)*4;   // tail sway

    // ground shadow (stays grounded; shrinks while airborne on a pounce)
    ctx.globalAlpha=airborne?0.15:0.28; ctx.beginPath(); ctx.ellipse(x,y0+15,airborne?15:23,airborne?5:7,0,0,Math.PI*2); ctx.fillStyle='#0C1414'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell: pulsing red crouch aura
    if(crouch){ ctx.save(); ctx.globalAlpha=0.30+0.22*Math.sin(t/60); ctx.fillStyle='#E0503C'; ctx.beginPath(); ctx.ellipse(x,y+7,30,13,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // enrage aura: a smouldering red haze around the body
    if(enraged){ ctx.save(); ctx.globalAlpha=0.15+0.10*Math.sin(t/150); ctx.fillStyle='#FF3A2A'; ctx.beginPath(); ctx.ellipse(x,bodyY+1,30,20,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // ---- bushy tail (trails low behind, sways) ----
    px(x-22, bodyY+2+tw*0.5, 8,8, cDark);
    px(x-26, bodyY-2+tw*0.8, 7,7, cBase);
    px(x-29, bodyY-6+tw,     6,6, cMid);
    px(x-30, bodyY-10+tw,    4,5, cLight);   // pale tip

    // ---- rear haunch (hips, set low) + leg ----
    px(x-16, bodyY-1, 15,16, cBase);
    px(x-17, bodyY+4, 8,11,  cDark);
    px(x-12, bodyY+12, 7,8,  cDark);  px(x-12, bodyY+19, 7,2, cClaw);

    // ---- torso + raised shoulder hump (hunched predator posture) ----
    px(x-11, bodyY-3, 22,18, cBase);   // torso slab
    px(x-2,  bodyY-9, 15,13, cBase);   // shoulder hump, higher at the front
    px(x,    bodyY-10, 11,4, cMid);    // hump highlight
    px(x-6,  bodyY+6, 20,7, cBelly);   // pale chest/belly
    px(x-11, bodyY+10, 24,4, cDark);   // underside shadow

    // ---- raised hackles: a crest of fur rising toward the neck (aggression) ----
    const hk=[[x-8,bodyY-2,8],[x-3,bodyY-5,12],[x+2,bodyY-9,15],[x+7,bodyY-10,16],[x+11,bodyY-9,13]];
    ctx.fillStyle=cShadow;
    hk.forEach(s=>{ ctx.beginPath(); ctx.moveTo(s[0]-3,s[1]); ctx.lineTo(s[0],s[1]-s[2]); ctx.lineTo(s[0]+3,s[1]); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle=cMid;
    hk.forEach(s=>{ ctx.beginPath(); ctx.moveTo(s[0]-1,s[1]); ctx.lineTo(s[0]+1,s[1]-s[2]+3); ctx.lineTo(s[0]+3,s[1]); ctx.closePath(); ctx.fill(); });

    // ---- front legs + claws ----
    px(x+2, bodyY+12, 6,8, cShadow); px(x+2, bodyY+19, 6,2, cClaw);   // far leg (behind)
    px(x+9, bodyY+12, 7,9, cDark);   px(x+9, bodyY+20, 7,2, cClaw);   // near leg

    // ---- thick neck / shaggy ruff ----
    px(x+9, bodyY-9, 12,20, cBase);
    ctx.fillStyle=cDark;
    ctx.beginPath(); ctx.moveTo(x+8,bodyY-9); ctx.lineTo(x+4,bodyY-13); ctx.lineTo(x+12,bodyY-9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+9,bodyY+9); ctx.lineTo(x+5,bodyY+13); ctx.lineTo(x+14,bodyY+10); ctx.closePath(); ctx.fill();

    // ---- head (big, drawn facing +x) ----
    const hx=x+12, hy=bodyY-7;
    px(hx-8, hy-8, 20,18, cBase);      // big skull + jaw mass
    px(hx-6, hy-10, 13,5, cMid);       // forehead highlight
    // tall pointed ears, swept back, dark inner
    ctx.fillStyle=cDark;
    ctx.beginPath(); ctx.moveTo(hx-7,hy-6); ctx.lineTo(hx-5,hy-18); ctx.lineTo(hx,hy-6);   ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+4,hy-7); ctx.lineTo(hx+7,hy-19); ctx.lineTo(hx+12,hy-7); ctx.closePath(); ctx.fill();
    ctx.fillStyle=cShadow;
    ctx.beginPath(); ctx.moveTo(hx-5,hy-7); ctx.lineTo(hx-4,hy-13); ctx.lineTo(hx-1,hy-7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+6,hy-8); ctx.lineTo(hx+7,hy-14); ctx.lineTo(hx+9,hy-8); ctx.closePath(); ctx.fill();
    // heavy furrowed brow, angled down toward the snout
    ctx.fillStyle=cShadow;
    ctx.beginPath(); ctx.moveTo(hx-6,hy-1); ctx.lineTo(hx+11,hy-5); ctx.lineTo(hx+11,hy-1); ctx.lineTo(hx-6,hy+3); ctx.closePath(); ctx.fill();
    // glowing, narrowed slit eyes under the brow
    px(hx-4,hy+1,5,3,'#141519'); px(hx+4,hy+1,6,3,'#141519');
    ctx.fillStyle=eye;
    ctx.beginPath(); ctx.moveTo(hx-4,hy+3); ctx.lineTo(hx+1,hy);   ctx.lineTo(hx+1,hy+3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+4,hy+3); ctx.lineTo(hx+9,hy);   ctx.lineTo(hx+9,hy+3); ctx.closePath(); ctx.fill();
    ctx.fillStyle=eyeHot; px(hx-1,hy+1,2,1,eyeHot); px(hx+6,hy+1,2,1,eyeHot);
    // battle scar down over the eye
    px(hx+3,hy-7,1,8,cLight);

    // ---- snarling OPEN maw + big fangs (drawn forward of the skull) ----
    const mx=hx+9;
    px(mx-2,hy,   12,5, cBase);        // upper snout
    px(mx+6,hy-1, 6,5,  cMid);         // snout bridge lit
    px(mx+10,hy,  3,4,  cNose);        // black nose
    px(mx-1,hy-2, 8,1,  cShadow);      // snarl wrinkles
    px(mx-2,hy+5, 14,6, cMouth);       // bold dark maw
    px(mx+1,hy+8, 8,3,  cTongue);      // tongue
    // big upper fangs (triangles pointing DOWN)
    ctx.fillStyle=cFang;
    [[mx,5],[mx+5,7],[mx+10,5]].forEach(f=>{ ctx.beginPath(); ctx.moveTo(f[0],hy+5); ctx.lineTo(f[0]+2,hy+5+f[1]); ctx.lineTo(f[0]+4,hy+5); ctx.closePath(); ctx.fill(); });
    // lower jaw + fangs (triangles pointing UP)
    px(mx-2,hy+11, 14,3, cDark);
    [[mx+2,4],[mx+8,4]].forEach(f=>{ ctx.beginPath(); ctx.moveTo(f[0],hy+11); ctx.lineTo(f[0]+2,hy+11-f[1]); ctx.lineTo(f[0]+4,hy+11); ctx.closePath(); ctx.fill(); });

    // ---- howl tell: rings blooming from the maw ----
    if(howl){
      ctx.save(); ctx.globalAlpha=0.5*(0.5+0.5*Math.sin(t/120)); ctx.strokeStyle='#CFCFE6'; ctx.lineWidth=2;
      for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(mx+7, hy+3, 6+i*7+(t/40%10), -Math.PI*0.65, Math.PI*0.25); ctx.stroke(); }
      ctx.restore();
    }
    // hurt flash
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-28,bodyY-20,64,42,'#FF5B5B'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);   // drawn unscaled/un-flipped so the "!" stays a normal pop
  },
});

function _awBite(e, p){
  spawnSparkles(p.x, p.y-8, '#E05555', 12);
  if(typeof Health!=='undefined') Health.damage(p, (e.dmg||3));
  // Enraged phase: the Alpha's fangs leave a bleed — a light damage-over-time (Status system).
  if(typeof Status!=='undefined' && e.maxHp && (e.hp/e.maxHp)<=0.34) Status.apply(p, 'bleeding', 2600);
  const ang=Math.atan2(p.y-e.y, p.x-e.x), K=18*(e.scale||1);
  p.x=clamp(p.x+Math.cos(ang)*K, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*K, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
