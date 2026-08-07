// ====================== ENTITY: THE STORM EAGLE (Cloud Kingdom — final boss) ======================
// The campaign's climactic, multi-phase finale — it demands everything the journey taught:
//   • AERIAL phase — it wheels above the clouds (INVULNERABLE), DIVES across the arena on a
//     telegraphed line, and rains LIGHTNING (telegraphed `groundzone` strikes) you weave.
//   • GROUNDED phase — it lands, wings spread and VULNERABLE — your window to punish.
//   • STORM CRESCENDO below a third — faster dives, more lightning; your Ultimate, a relic
//     dodge, and endgame gear decide it.
// Beating it and stepping through the last portal rolls the CREDITS (credits.js). Cozy failure
// → Play Again. `next:null` — the end of the campaign.

function _seNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('stormeagle', {
  radius: 46,
  init(e){
    e.name='The Storm Eagle'; e.boss=true; e.noKnockback=true;
    e.maxHp=e.maxHp||90; e.hp=(typeof e.hp==='number'&&e.hp<=e.maxHp)?e.hp:e.maxHp;
    e.speed=e.speed||1.5; e.dmg=e.dmg||3; e.scale=e.scale||BOSS_SCALE;
    e.dir=-1; e.state='aerial'; e.actT=3400; e.diveCd=1600; e.boltCd=1200; e.touchCd=0; e.bob=0;
    e.dvx=0; e.dvy=0;
  },
  update(e, t, dt){
    const p=_seNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, crescendo=frac<=0.34, S=e.scale||1;
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);

    if(e.state==='aerial'){
      e.invuln=true; e.airborne=true;
      // wheel above the dog
      const a=Math.atan2(p.y-e.y,p.x-e.x); const spd=e.speed*(crescendo?1.1:0.8);
      e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 40, WORLD_W-40); e.y=clamp(e.y+Math.sin(a)*spd*0.5*dtScale, 40, WORLD_H-40); e.dir=Math.cos(a)>=0?1:-1;
      e.diveCd=Math.max(0,e.diveCd-dt); e.boltCd=Math.max(0,e.boltCd-dt);
      // rain lightning
      if(e.boltCd<=0){ e.boltCd= crescendo?800:1400;
        Entities.spawn('groundzone',{ x:clamp(p.x+rand(-40,40),40,WORLD_W-40), y:clamp(p.y+rand(-30,30),48,WORLD_H-40), r:40*S, warnMs:crescendo?360:520, dmg:e.dmg, color:'#C9BEF0', scale:S });
      }
      // telegraphed dive across the arena
      if(e.diveCd<=0 && dist>90){ e.state='divewind'; e.actT= crescendo?360:520; e.alertT=650; e.dtx=p.x; e.dty=p.y; e.bob=t; return; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='landing'; e.actT=520; }
      e.bob=t; return;
    }
    if(e.state==='divewind'){
      e.invuln=true; e.actT-=dt;
      if(e.actT<=0){ e.state='dive'; e.actT=460; const a=Math.atan2(e.dty-e.y,e.dtx-e.x); const L=(crescendo?12:10); e.dvx=Math.cos(a)*L; e.dvy=Math.sin(a)*L; e.dir=e.dvx>=0?1:-1; if(typeof sfxDash==='function') sfxDash(); }
      e.bob=t; return;
    }
    if(e.state==='dive'){
      e.invuln=true;
      e.x=clamp(e.x+e.dvx*dtScale,30,WORLD_W-30); e.y=clamp(e.y+e.dvy*dtScale,40,WORLD_H-30);
      if(dist<34*S && e.touchCd<=0){ _seStrike(e,p); e.touchCd=800; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='aerial'; e.diveCd= crescendo?1400:2400; }
      e.bob=t; return;
    }
    if(e.state==='landing'){
      e.invuln=true; e.airborne=true; e.actT-=dt;
      if(e.actT<=0){ e.state='grounded'; e.actT= crescendo?2000:2800; e.airborne=false; e.invuln=false;
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y+10,'#DCE8F2',20); if(typeof screenShake==='function') screenShake(6);
        showToast('🦅 The Storm Eagle lands — strike now!', 1700);
      }
      e.bob=t; return;
    }
    if(e.state==='grounded'){
      e.invuln=false; e.airborne=false;
      if(dist<70*S){ const a=Math.atan2(p.y-e.y,p.x-e.x); e.x=clamp(e.x+Math.cos(a)*0.5*dtScale,30,WORLD_W-30); e.y=clamp(e.y+Math.sin(a)*0.5*dtScale,40,WORLD_H-30); e.dir=Math.cos(a)>=0?1:-1; }
      if(dist<40*S && e.touchCd<=0){ _seStrike(e,p); e.touchCd=1000; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='aerial'; e.actT= crescendo?2600:3600; e.diveCd=1200; e.boltCd=900; if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-10,'#E6DFFA',16); showToast('🦅 It takes to the sky again!',1400); }
      e.bob=t; return;
    }
  },
  draw(e, t){
    const S=e.scale||1, D=e.dir, x=Math.round(e.x);
    const lift=e.airborne? -18 : 0;
    const y=Math.round(e.y+lift+(e.airborne?Math.sin(t/200)*3:0));
    const crescendo=(e.hp/e.maxHp)<=0.34;
    const flap=Math.sin(t/(e.airborne?120:400))* (e.airborne?9:3);
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    // shadow on the clouds below (bigger when airborne)
    ctx.globalAlpha=e.airborne?0.14:0.26; ctx.beginPath(); ctx.ellipse(x,Math.round(e.y)+18,e.airborne?20:30,7,0,0,Math.PI*2); ctx.fillStyle='#3A3A52'; ctx.fill(); ctx.globalAlpha=1;
    if(e.state==='divewind'){ ctx.save(); ctx.globalAlpha=0.3+0.2*Math.sin(t/60); ctx.strokeStyle='#C9BEF0'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.dtx,e.dty); ctx.stroke(); ctx.restore(); }
    // broad storm-grey wings
    const wcol=crescendo?'#6A6E8C':'#7E82A0';
    ctx.fillStyle=wcol;
    ctx.beginPath(); ctx.moveTo(x-6,y-2); ctx.lineTo(x-34,y-10-flap); ctx.lineTo(x-30,y+2-flap*0.4); ctx.lineTo(x-6,y+6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+6,y-2); ctx.lineTo(x+34,y-10-flap); ctx.lineTo(x+30,y+2-flap*0.4); ctx.lineTo(x+6,y+6); ctx.closePath(); ctx.fill();
    // wing tips
    ctx.fillStyle='#5A5E78'; px(x-34,y-11-flap,6,4,'#5A5E78'); px(x+29,y-11-flap,6,4,'#5A5E78');
    // body
    px(x-8,y-6,16,18,'#8E92AE'); px(x-6,y+2,12,10,'#C6CADE');   // pale chest
    // tail
    ctx.fillStyle='#6E7290'; ctx.beginPath(); ctx.moveTo(x-4,y+10); ctx.lineTo(x,y+22); ctx.lineTo(x+4,y+10); ctx.closePath(); ctx.fill();
    // head + golden beak
    px(x+D*4-5,y-16,12,11,'#E8EAF2');
    ctx.fillStyle='#F0B23A'; ctx.beginPath(); ctx.moveTo(x+D*9,y-11); ctx.lineTo(x+D*16,y-9); ctx.lineTo(x+D*9,y-6); ctx.closePath(); ctx.fill();
    const eye=crescendo?'#FF3A2A':'#F0C63A'; px(x+D*4-2,y-13,3,3,eye);
    // storm crackle around it in crescendo
    if(crescendo){ ctx.save(); ctx.globalAlpha=0.4+0.3*Math.sin(t/80); ctx.strokeStyle='#C9BEF0'; ctx.lineWidth=1.5;
      for(let i=0;i<3;i++){ const a=t/200+i*2; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*20,y+Math.sin(a)*16); ctx.lineTo(x+Math.cos(a)*30,y+Math.sin(a)*24); ctx.stroke(); } ctx.restore(); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-34,y-20,68,44,'#FFB0B0'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);
  },
});

function _seStrike(e, p){
  spawnSparkles(p.x, p.y-8, '#C9BEF0', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=20*(e.scale||1);
  p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
