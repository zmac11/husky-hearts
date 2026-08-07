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
    // ---- palette ----
    const fShadow='#4A4E66', fDark=crescendo?'#5A5A78':'#5E6280', fBase=crescendo?'#72768E':'#7E82A0',
          fMid='#9296B2', fLite='#B2B6D0', fEdge='#CBCEE4',
          brBase='#C6CADE', brLite='#E4E6F2', scallop='#A6AAC6',
          hBase='#8E92AE', hLite='#B6BAD4', crest='#63678A',
          beak='#F0B23A', beakLt='#F8CC64', beakTip='#7E5418', cere='#E0A83A',
          talon='#E0A83A', talonD='#A87E28';
    const eye=crescendo?'#FF3A2A':'#F5CE44', eyeHot='#FFF0B0';

    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    // shadow on the clouds below (smaller/fainter while airborne)
    ctx.globalAlpha=e.airborne?0.14:0.28; ctx.beginPath(); ctx.ellipse(x,Math.round(e.y)+18,e.airborne?20:30,7,0,0,Math.PI*2); ctx.fillStyle='#2E2E48'; ctx.fill(); ctx.globalAlpha=1;
    if(e.state==='divewind'){ ctx.save(); ctx.globalAlpha=0.3+0.2*Math.sin(t/60); ctx.strokeStyle='#C9BEF0'; ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(e.x,e.y); ctx.lineTo(e.dtx,e.dty); ctx.stroke(); ctx.restore(); }
    // crescendo storm charge behind the eagle
    if(crescendo){ ctx.save(); ctx.globalAlpha=0.14+0.08*Math.sin(t/120); ctx.fillStyle='#8A7EC8'; ctx.beginPath(); ctx.ellipse(x,y-2,38,30,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // wing geometry: spread & raised when airborne (flap), swept lower & folded when grounded
    const spread = e.airborne ? 40 : 26;
    const rise   = e.airborne ? (14+flap) : 2;
    // ---- a symmetric feathered wing, mirrored for left(-1)/right(+1) ----
    const wing=(s)=>{
      const bx=x+s*7, by=y-3;
      const tipX=x+s*spread, tipY=y-rise;
      // wing membrane (coverts) — a filled sweep from shoulder to tip
      ctx.fillStyle=fDark;
      ctx.beginPath(); ctx.moveTo(bx, by-4); ctx.quadraticCurveTo(x+s*(spread*0.6), by-rise-6, tipX, tipY);
      ctx.lineTo(tipX-s*3, tipY+9); ctx.quadraticCurveTo(x+s*(spread*0.5), by+4, bx, by+7); ctx.closePath(); ctx.fill();
      // primary flight feathers fanning from the tip
      for(let i=0;i<5;i++){ const f=i/4; const px2=x+s*(spread-2-i*3), py=y-rise+ i*2 - 2;
        ctx.fillStyle=(i%2? fBase : fShadow);
        ctx.beginPath(); ctx.moveTo(px2, py); ctx.lineTo(px2+s*10, py+2+i*1.5); ctx.lineTo(px2+s*2, py+7); ctx.closePath(); ctx.fill(); }
      // secondary coverts (rows of shorter feathers) with pale edges
      for(let i=0;i<3;i++){ const cx=x+s*(11+i*6), cy=by-2 - (rise*0.4) + i*3;
        ctx.fillStyle=fMid;  ctx.beginPath(); ctx.ellipse(cx, cy, 5, 3, s*0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle=fEdge; px(Math.round(cx-2), Math.round(cy-2), 3,1, fEdge); }
      // leading-edge highlight
      ctx.strokeStyle=fLite; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(bx, by-3); ctx.quadraticCurveTo(x+s*(spread*0.6), by-rise-5, tipX, tipY); ctx.stroke();
    };
    wing(-1);   // far wing first (behind body)

    // ---- fanned tail below ----
    ctx.fillStyle=fDark;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x-3,y+9); ctx.lineTo(x+i*4, y+24); ctx.lineTo(x+3,y+9); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle=fShadow; for(let i=-2;i<=2;i+=2){ px(x+i*4-1,y+20,2,4,fShadow); }

    // ---- talons (tucked while airborne, gripping/braced when grounded) ----
    if(e.airborne){
      ctx.fillStyle=talon; px(x-5,y+9,4,5,talon); px(x+1,y+9,4,5,talon);
      ctx.fillStyle=talonD; px(x-5,y+13,4,2,talonD); px(x+1,y+13,4,2,talonD);
    } else {
      ctx.strokeStyle=talon; ctx.lineWidth=3; ctx.lineCap='round';
      for(const lx of [-6,5]){ ctx.beginPath(); ctx.moveTo(x+lx,y+8); ctx.lineTo(x+lx,y+18); ctx.stroke();
        ctx.lineWidth=1.5; for(let k=-1;k<=1;k++){ ctx.beginPath(); ctx.moveTo(x+lx,y+18); ctx.lineTo(x+lx+k*4,y+22); ctx.stroke(); } ctx.lineWidth=3; }
    }

    // ---- body: dark back + pale scalloped breast ----
    ctx.fillStyle=fBase; ctx.beginPath(); ctx.ellipse(x,y+1,11,15,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=fShadow; ctx.beginPath(); ctx.ellipse(x+4,y+2,7,13,0,0,Math.PI*2); ctx.fill();   // shaded back flank
    ctx.fillStyle=brBase; ctx.beginPath(); ctx.ellipse(x-2,y+3,8,12,0,0,Math.PI*2); ctx.fill();     // pale breast
    ctx.fillStyle=brLite; ctx.beginPath(); ctx.ellipse(x-4,y,5,7,0,0,Math.PI*2); ctx.fill();
    // scalloped breast feather rows
    ctx.fillStyle=scallop; for(let r=0;r<3;r++){ for(let c=-1;c<=1;c++){ px(x-5+c*4, y-2+r*5, 3,2, scallop); } }

    wing(1);    // near wing over the body

    // ---- head turned forward (+x): crest, skull, brow, eye, hooked beak ----
    const hx=x+3, hy=y-15;
    // swept-back feather crest
    ctx.fillStyle=crest; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(hx-4-i*2,hy-2); ctx.lineTo(hx-10-i*3,hy-6-i); ctx.lineTo(hx-3-i*2,hy+2); ctx.closePath(); ctx.fill(); }
    // skull
    px(hx-6,hy-6,14,13,hBase); px(hx-5,hy-7,11,4,hLite); px(hx-4,hy-8,8,2,fEdge);
    // bony brow ridge (fierce scowl)
    px(hx-5,hy-2,12,2,fShadow);
    // fierce eye
    px(hx+1,hy-2,5,4,'#20223A'); px(hx+2,hy-2,3,3,eye); px(hx+4,hy-2,1,1,'#0C0C16'); px(hx+2,hy-2,1,1,eyeHot);
    // cere + hooked golden beak
    px(hx+6,hy-1,3,4,cere);
    ctx.fillStyle=beak;
    ctx.beginPath(); ctx.moveTo(hx+8,hy-2); ctx.lineTo(hx+18,hy-1); ctx.quadraticCurveTo(hx+20,hy+3, hx+16,hy+5); ctx.lineTo(hx+8,hy+4); ctx.closePath(); ctx.fill();
    ctx.fillStyle=beakLt; ctx.beginPath(); ctx.moveTo(hx+8,hy-1); ctx.lineTo(hx+16,hy-0.5); ctx.lineTo(hx+9,hy+1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=beakTip; ctx.beginPath(); ctx.moveTo(hx+17,hy-0.5); ctx.quadraticCurveTo(hx+20,hy+3, hx+16,hy+5); ctx.lineTo(hx+15,hy+2); ctx.closePath(); ctx.fill();   // dark hooked tip
    px(hx+9,hy+3,6,1,fShadow);   // beak gape line

    // ---- storm crackle arcing off it (always a little, more in crescendo) ----
    ctx.save(); ctx.strokeStyle=crescendo?'#E6DFFA':'#C9BEF0'; ctx.lineWidth=1.5;
    const arcs=crescendo?4:2;
    for(let i=0;i<arcs;i++){ const a=t/200+i*(6.28/arcs); ctx.globalAlpha=(crescendo?0.5:0.3)*(0.5+0.5*Math.sin(t/90+i));
      let bx=x+Math.cos(a)*20, by2=y+Math.sin(a)*17; ctx.beginPath(); ctx.moveTo(bx,by2);
      for(let s2=0;s2<3;s2++){ bx+=Math.cos(a)*5+rand(-3,3); by2+=Math.sin(a)*5+rand(-3,3); ctx.lineTo(bx,by2); } ctx.stroke(); }
    ctx.restore();

    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-40,y-22,80,50,'#FFB0B0'); ctx.globalAlpha=1; }
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
