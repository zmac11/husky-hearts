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
    e.slamR = e.slamR || 100;       // base radius; scaled by e.scale at use + in draw
    e.scale = e.scale || BOSS_SCALE; // body + every attack/telegraph scale by this
    e.dir=-1; e.state='chase'; e.actT=0;
    e.slamCd=3200; e.chargeCd=5200; e.touchCd=0;
    e.boulderCd=6000; e.roarCd=9000;   // phase-2 ranged throw / phase-3 stun roar
    e.cvx=0; e.cvy=0; e.slamRingT=0; e.bob=0;
    e.boulders=[];                     // in-flight thrown boulders (arc → impact zone)
  },

  update(e, t, dt){
    const p=_grizNearest(e);
    if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp;
    const phase = frac<=0.34 ? 3 : (frac<=0.67 ? 2 : 1);
    const enraged = phase===3;
    const spd = e.speed * (enraged ? 1.45 : 1);
    const S = e.scale || 1;   // scales the slam ring, charge reach and paw range

    e.slamCd=Math.max(0,e.slamCd-dt); e.chargeCd=Math.max(0,e.chargeCd-dt);
    e.boulderCd=Math.max(0,e.boulderCd-dt); e.roarCd=Math.max(0,e.roarCd-dt);
    if(e.touchCd>0)  e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.slamRingT>0)e.slamRingT=Math.max(0,e.slamRingT-dt);
    if(e.hurtT>0)    e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0)   e.alertT=Math.max(0,e.alertT-dt);
    // advance thrown boulders; on landing each erupts into a brief impact zone
    if(e.boulders && e.boulders.length){
      for(let i=e.boulders.length-1;i>=0;i--){
        const b=e.boulders[i]; b.prog+=dt/b.dur;
        if(b.prog>=1){
          Entities.spawn('groundzone', { x:b.tx, y:b.ty, r:56*S, warnMs:150, dmg:e.dmg+1, color:'#8A6A3A', scale:S });
          if(typeof spawnSparkles==='function') spawnSparkles(b.tx, b.ty, '#8A6A3A', 14);
          e.boulders.splice(i,1);
        }
      }
    }

    // ---- scripted states ----
    if(e.state==='slamwind'){                 // reared up
      e.actT-=dt;
      if(e.actT<=0){
        e.state='chase'; e.slamCd = enraged?2200:3600; e.slamRingT=520;
        if(dist < e.slamR*S){ _grizHit(e, p, e.dmg+1); }   // caught in the pound
        // FISSURES (phase ≥2): the quake cracks the ground into telegraphed eruptions to weave through
        if(phase>=2){
          const nF = enraged?3:2;
          for(let i=0;i<nF;i++){
            const a2=rand(0,Math.PI*2), d2=rand(70,180)*S;
            const fx=clamp(e.x+Math.cos(a2)*d2, 40, WORLD_W-40), fy=clamp(e.y+Math.sin(a2)*d2, 40, WORLD_H-40);
            Entities.spawn('groundzone', { x:fx, y:fy, r:50*S, warnMs:660, dmg:e.dmg, color:'#B5813A', scale:S });
          }
        }
        if(enraged && Math.random()<0.5) e.chargeCd=0;      // enraged: chain straight into a charge
        if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+6, '#9A7C50', 16);
        if(typeof sfxHowl==='function') sfxHowl();
      }
      e.bob=t; return;
    }
    if(e.state==='chargewind'){                // pawing the ground
      e.actT-=dt;
      if(e.actT<=0){ e.state='charge'; e.actT= enraged?560:480; const a=Math.atan2(p.y-e.y,p.x-e.x); const L=(enraged?8.5:7)*S; e.cvx=Math.cos(a)*L; e.cvy=Math.sin(a)*L; e.dir=e.cvx>=0?1:-1; if(typeof sfxHowl==='function') sfxHowl(); }
      e.bob=t; return;
    }
    if(e.state==='charge'){
      e.x=clamp(e.x+e.cvx*dtScale, 20, WORLD_W-20);
      e.y=clamp(e.y+e.cvy*dtScale, 26, WORLD_H-20);
      if(dist<34*S && e.touchCd<=0){ _grizHit(e, p, e.dmg+1); e.touchCd=800; }
      e.actT-=dt; if(e.actT<=0){ e.state='chase'; e.chargeCd = enraged?3200:5200; if(enraged && Math.random()<0.5) e.slamCd=0; }
      e.bob=t; return;
    }
    if(e.state==='boulderwind'){                // rears and hoists a boulder overhead
      e.actT-=dt;
      if(e.actT<=0){
        e.state='chase'; e.boulderCd = enraged?4600:6800;
        e.boulders = e.boulders || [];
        e.boulders.push({ x0:e.x, y0:e.y-16*S, tx:p.x, ty:p.y, prog:0, dur:900 });
        if(typeof sfxThunder==='function') sfxThunder();
      }
      e.bob=t; return;
    }
    if(e.state==='roarwind'){                   // inhales — the stun tell (get out of range)
      e.actT-=dt;
      if(e.actT<=0){
        e.state='roar'; e.actT=320;
        if(typeof sfxRoar==='function') sfxRoar();
        if(dist < 300*S){
          if(typeof Status!=='undefined') Status.apply(p, 'stunned', 700);
          const ang=Math.atan2(p.y-e.y,p.x-e.x), K=10*S;
          p.x=clamp(p.x+Math.cos(ang)*K, 20, WORLD_W-20);
          p.y=clamp(p.y+Math.sin(ang)*K, 26, WORLD_H-20);
        }
        if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-12, '#E6C84A', 22);
      }
      e.bob=t; return;
    }
    if(e.state==='roar'){                        // brief roar pose, then it presses the attack
      e.actT-=dt;
      if(e.actT<=0){ e.state='chase'; e.slamCd=Math.min(e.slamCd, 500); }   // follow the stun with a slam
      e.bob=t; return;
    }

    // ---- decide the next move ----
    if(phase>=3 && e.roarCd<=0 && dist<300){
      e.state='roarwind'; e.actT=560; e.alertT=650; e.roarCd = enraged?9000:12000;
      e.bob=t; return;
    }
    if(phase>=2 && e.boulderCd<=0 && dist>200 && dist<560){
      e.state='boulderwind'; e.actT= enraged?560:720; e.alertT=650;
      e.bob=t; return;
    }
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
    if(dist<30*S && e.touchCd<=0){ _grizHit(e, p, e.dmg); e.touchCd=1000; }
    e.bob=t;
  },

  draw(e, t){
    const S=e.scale||1;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(S, S); ctx.translate(-e.x, -e.y);
    const rear=(e.state==='slamwind'||e.state==='boulderwind'||e.state==='roarwind');
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
    if(e.state==='slamwind'){ ctx.save(); ctx.globalAlpha=0.28+0.18*Math.sin(t/70); ctx.fillStyle='#E0A03C'; ctx.beginPath(); ctx.ellipse(x,y+2,30,16,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    if(e.state==='roarwind'||e.state==='roar'){ ctx.save(); ctx.globalAlpha=0.24+0.18*Math.sin(t/60); ctx.fillStyle='#E6C84A'; ctx.beginPath(); ctx.ellipse(x,y+2,32,17,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
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
    // boulder tell: a jagged rock hoisted overhead, ready to hurl
    if(e.state==='boulderwind'){ const ry=by-24-Math.sin(t/80)*2; px(x-8,ry,16,11,'#8A8078'); px(x-8,ry+2,4,7,'#6E655E'); px(x+5,ry+1,5,7,'#A29A90'); px(x-3,ry-2,7,3,'#9A9088'); }
    // roar tell: sound rings blasting from the maw toward the dog
    if(e.state==='roar'){ ctx.save(); ctx.globalAlpha=0.55*(0.5+0.5*Math.sin(t/90)); ctx.strokeStyle='#F0D66A'; ctx.lineWidth=2;
      for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(hx+D*6, by-2, 5+i*6+(t/40%9), -Math.PI*0.55, Math.PI*0.55); ctx.stroke(); } ctx.restore(); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-22,by-16,44,40,'#FF6B6B'); ctx.globalAlpha=1; }
    ctx.restore();
    // thrown boulders arcing through the air — drawn in world space, outside the body transform
    if(e.boulders && e.boulders.length){
      const Sc=e.scale||1;
      e.boulders.forEach(b=>{
        const gx=b.x0+(b.tx-b.x0)*b.prog, gy=b.y0+(b.ty-b.y0)*b.prog, py=gy-Math.sin(b.prog*Math.PI)*42*Sc, r=7*Sc;
        ctx.save(); ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(Math.round(gx), Math.round(gy)+2, r*0.9, r*0.4, 0,0,Math.PI*2); ctx.fillStyle='#0C1410'; ctx.fill(); ctx.restore();
        ctx.fillStyle='#7A716A'; ctx.beginPath(); ctx.arc(Math.round(gx), Math.round(py), r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#5E564F'; ctx.fillRect(Math.round(gx)-r, Math.round(py)-1, r*2, 2);
        ctx.fillStyle='#98908A'; ctx.fillRect(Math.round(gx)-r+1, Math.round(py)-r+1, 3, 3);
      });
    }
    Entities.drawAlert(e);   // drawn unscaled so the "!" stays a normal-size pop
  },
});

function _grizHit(e, p, dmg){
  spawnSparkles(p.x, p.y-8, '#E0A055', 12);
  if(typeof Health!=='undefined') Health.damage(p, dmg);
  const ang=Math.atan2(p.y-e.y, p.x-e.x), K=22*(e.scale||1);
  p.x=clamp(p.x+Math.cos(ang)*K, 20, WORLD_W-20);
  p.y=clamp(p.y+Math.sin(ang)*K, 26, WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
