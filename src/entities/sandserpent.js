// ====================== ENTITY: THE SAND SERPENT (Golden Dunes boss) ======================
// A burrowing arena boss you expose with wits, not brute force. It DIVES under the sand
// (INVULNERABLE), tracking you as a rushing sand-mound, and periodically erupts through
// telegraphed `groundzone` mounds (warn→strike). It surfaces to strike — a VULNERABLE window
// where you punish it. Drop a Mirage Decoy (relic) or lure it over a pressure plate and it
// surfaces THERE, opening a clean punish. Enrages below a third (faster dives, more mounds).
// Cozy failure → Play Again. Last real level of the dunes → golden chest via checkWin.

function _ssNearest(e){
  const decoy=(typeof Entities!=='undefined'&&Entities.decoyTarget)?Entities.decoyTarget():null;
  if(decoy) return decoy;
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('sandserpent', {
  radius: 44,
  init(e){
    e.name='The Sand Serpent'; e.boss=true; e.noKnockback=true;
    e.maxHp=e.maxHp||64; e.hp=(typeof e.hp==='number'&&e.hp<=e.maxHp)?e.hp:e.maxHp;
    e.speed=e.speed||1.6; e.dmg=e.dmg||3; e.scale=e.scale||BOSS_SCALE;
    e.dir=-1; e.state='burrow'; e.actT=3200; e.moundCd=900; e.lineCd=5000; e.touchCd=0; e.bob=0; e._p2=false;
  },
  update(e, t, dt){
    const p=_ssNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, enraged=frac<=0.34, phase2=frac<=0.66, S=e.scale||1;
    if(phase2 && !e._p2){ e._p2=true; if(typeof showToast==='function') showToast('🌪️ The Sand Serpent thrashes — it erupts in LINES now!', 2400); }
    if(e.lineCd>0) e.lineCd=Math.max(0,e.lineCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);

    if(e.state==='burrow'){
      e.invuln=true; e.buried=true;
      // rush toward the target underground
      const a=Math.atan2(p.y-e.y, p.x-e.x); const spd=e.speed*(enraged?1.35:1);
      e.x=clamp(e.x+Math.cos(a)*spd*dtScale, 30, WORLD_W-30);
      e.y=clamp(e.y+Math.sin(a)*spd*dtScale, 40, WORLD_H-30);
      e.dir=Math.cos(a)>=0?1:-1;
      // telegraphed erupting mounds along the way
      e.moundCd-=dt;
      if(e.moundCd<=0){ e.moundCd= enraged?700:1100;
        Entities.spawn('groundzone', { x:clamp(p.x+rand(-30,30),40,WORLD_W-40), y:clamp(p.y+rand(-24,24),48,WORLD_H-40), r:46*S, warnMs:enraged?420:600, dmg:e.dmg, color:'#D8A85A', scale:S });
      }
      // PHASE 2: a LINE-eruption sweep — a row of mounds bursts along the dog's approach axis;
      // sidestep perpendicular. Distinct from the scattered point mounds above.
      if(phase2 && e.lineCd<=0){ e.lineCd= enraged?4200:6200;
        const la=Math.atan2(p.y-e.y, p.x-e.x), step=62*S;
        for(let i=-2;i<=3;i++){ const gx=clamp(p.x+Math.cos(la)*i*step,40,WORLD_W-40), gy=clamp(p.y+Math.sin(la)*i*step,48,WORLD_H-40);
          Entities.spawn('groundzone',{ x:gx, y:gy, r:34*S, warnMs:(enraged?380:540)+(i+2)*90, dmg:e.dmg, color:'#E0B060', scale:S }); }
        if(typeof spawnSparkles==='function') spawnSparkles(p.x,p.y,'#E8C87A',14);
        if(typeof showToast==='function') showToast('🌪️ Line eruption — sidestep it!', 1500);
      }
      e.actT-=dt;
      // surface when the timer runs out, or immediately if it has closed on a decoy/plate lure
      const lured = (p.kind==='decoy') && dist<50;
      if(e.actT<=0 || lured){ e.state='surfacing'; e.actT=520; e.alertT=650; if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y,'#E8C87A',22); }
      e.bob=t; return;
    }
    if(e.state==='surfacing'){
      e.invuln=true; e.actT-=dt;
      if(e.actT<=0){ e.state='surface'; e.actT= enraged?2200:3000; e.buried=false; e.invuln=false;
        // erupt: a burst of damage zones radiating out
        for(let i=0;i<(enraged?6:4);i++){ const a=i/(enraged?6:4)*Math.PI*2; Entities.spawn('groundzone',{ x:clamp(e.x+Math.cos(a)*70,40,WORLD_W-40), y:clamp(e.y+Math.sin(a)*60,48,WORLD_H-40), r:40*S, warnMs:360, dmg:e.dmg, color:'#D8A85A', scale:S }); }
        if(typeof sfxHowl==='function') sfxHowl();
        showToast('🐍 The Sand Serpent surfaces — strike now!', 1800);
      }
      e.bob=t; return;
    }
    if(e.state==='surface'){
      e.invuln=false; e.buried=false;
      // reared up and vulnerable; lunges at a close dog
      if(dist<70*S){ const a=Math.atan2(p.y-e.y,p.x-e.x); e.x=clamp(e.x+Math.cos(a)*0.6*dtScale,30,WORLD_W-30); e.y=clamp(e.y+Math.sin(a)*0.6*dtScale,40,WORLD_H-30); e.dir=Math.cos(a)>=0?1:-1; }
      if(dist<40*S && e.touchCd<=0){ _ssBite(e,p); e.touchCd=900; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='burrow'; e.actT= enraged?2400:3200; e.moundCd=700; if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y+8,'#C9A86A',14); }
      e.bob=t; return;
    }
  },
  draw(e, t){
    const S=e.scale||1, D=e.dir, x=Math.round(e.x), y=Math.round(e.y);
    if(e.buried){
      // ---- a rushing sand mound with a churning crest + a cresting spine ridge ----
      ctx.save();
      // trailing wake humps behind (suggest the long body under the sand)
      ctx.globalAlpha=0.5; ctx.fillStyle='#C6A868';
      for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.ellipse(x-D*i*13*S, y+3, (14-i*2)*S, (7-i)*S, 0, 0, Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1;
      // main mound
      ctx.fillStyle='#B0904A'; ctx.beginPath(); ctx.ellipse(x,y+4,28*S,12*S,0,0,Math.PI*2); ctx.fill();     // shadowed base
      ctx.fillStyle='#D8BC84'; ctx.beginPath(); ctx.ellipse(x,y,27*S,12*S,0,0,Math.PI*2); ctx.fill();        // sand hump
      ctx.fillStyle='#EAD6A0'; ctx.beginPath(); ctx.ellipse(x-2*S,y-3*S,18*S,7*S,0,0,Math.PI*2); ctx.fill(); // sunlit crest
      // dorsal spine ridge breaking the surface
      ctx.fillStyle='#A6864A';
      for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x+(i*7-3)*S, y-2); ctx.lineTo(x+(i*7+D*2)*S, y-(12-Math.abs(i)*2)*S); ctx.lineTo(x+(i*7+3)*S, y-2); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle='#8A6A2E'; for(let i=-2;i<=2;i++){ px(x+(i*7)*S-1, y-6*S, 2, 4*S, '#8A6A2E'); }
      // kicked-up sand particles
      ctx.globalAlpha=0.5; ctx.fillStyle='#F0E0B0';
      for(let i=0;i<6;i++){ const a=i*1.9; px(Math.round(x-D*20*S+Math.cos(a)*10), Math.round(y-4-((t/30+i*7)%14)), 2, 2, '#F0E0B0'); }
      ctx.restore();
      return;
    }
    // ============ reared, exposed serpent ============
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    const enraged=(e.hp/e.maxHp)<=0.34;
    // palette
    const sShadow='#8A6A2E', sDark='#A6864A', sBase='#C69A54', sMid='#D8B468', sLite='#EACC86', belly='#EAD8A0',
          hoodEdge='#8A5E2E', hoodSpot='#6A4A22', fang='#F5F0E0', mouth='#4A2416', tongue='#C0432E';
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y+20,28,8,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    if(enraged){ ctx.save(); ctx.globalAlpha=0.12+0.06*Math.sin(t/140); ctx.fillStyle='#FF7A2E'; ctx.beginPath(); ctx.ellipse(x+4,y-16,20,26,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // ---- thick coiled body rising from the sand ----
    ctx.fillStyle=sDark;
    ctx.beginPath(); ctx.moveTo(x-18,y+18); ctx.quadraticCurveTo(x-24,y-4,x-6,y-14); ctx.quadraticCurveTo(x+12,y-26,x+7,y-38); ctx.lineTo(x+19,y-36); ctx.quadraticCurveTo(x+25,y-14,x+9,y-1); ctx.quadraticCurveTo(x-3,y+9,x+8,y+18); ctx.closePath(); ctx.fill();
    // lit front edge of the coil
    ctx.fillStyle=sBase;
    ctx.beginPath(); ctx.moveTo(x-12,y+16); ctx.quadraticCurveTo(x-18,y-4,x-3,y-13); ctx.quadraticCurveTo(x+12,y-24,x+8,y-36); ctx.lineTo(x+14,y-35); ctx.quadraticCurveTo(x+19,y-16,x+6,y-3); ctx.quadraticCurveTo(x-4,y+7,x+4,y+16); ctx.closePath(); ctx.fill();
    // belly scutes down the throat
    ctx.fillStyle=belly; for(let i=0;i<6;i++){ px(x+2, y+12-i*7, 9-Math.abs(i-3), 3, belly); }
    ctx.fillStyle=sShadow; for(let i=0;i<6;i++){ px(x+2, y+15-i*7, 9-Math.abs(i-3), 1, sShadow); }
    // dorsal diamond scales along the back of the coil
    ctx.fillStyle=sMid;
    for(let i=0;i<5;i++){ const sx=x-14+i*4, sy=y+8-i*6; ctx.beginPath(); ctx.moveTo(sx,sy-3); ctx.lineTo(sx+3,sy); ctx.lineTo(sx,sy+3); ctx.lineTo(sx-3,sy); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle=sLite; px(x-13,y+7,2,2,sLite); px(x-5,y-5,2,2,sLite);

    // ---- flared cobra hood behind the head ----
    const hx=x+13, hy=y-38;
    ctx.fillStyle='#C08A44';
    ctx.beginPath(); ctx.moveTo(hx-2,hy+8); ctx.quadraticCurveTo(hx-20,hy+2,hx-14,hy-8); ctx.quadraticCurveTo(hx-6,hy-14,hx-2,hy-6);
    ctx.lineTo(hx+8,hy-6); ctx.quadraticCurveTo(hx+12,hy-14,hx+20,hy-8); ctx.quadraticCurveTo(hx+26,hy+2,hx+8,hy+8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=hoodEdge; ctx.lineWidth=1.5; ctx.stroke();
    // hood eye-spot markings
    ctx.fillStyle=hoodSpot; ctx.beginPath(); ctx.arc(hx-9,hy-2,3,0,Math.PI*2); ctx.arc(hx+13,hy-2,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#E8CC86'; px(hx-10,hy-3,2,2,'#E8CC86'); px(hx+12,hy-3,2,2,'#E8CC86');

    // ---- broad wedge head ----
    px(hx-9,hy-5,20,14,sBase); px(hx-7,hy-7,16,6,sMid); px(hx-5,hy-8,12,2,sLite);   // skull + lit brow
    // ridged brow horns
    ctx.fillStyle=sShadow; ctx.beginPath(); ctx.moveTo(hx-6,hy-6); ctx.lineTo(hx-9,hy-12); ctx.lineTo(hx-2,hy-7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+6,hy-6); ctx.lineTo(hx+9,hy-12); ctx.lineTo(hx+2,hy-7); ctx.closePath(); ctx.fill();
    // slit reptilian eyes (vertical pupils)
    const eye=enraged?'#FF3A1E':'#FFB03A';
    px(hx-5,hy-2,4,4,eye); px(hx+3,hy-2,4,4,eye);
    px(hx-4,hy-2,1,4,'#1A0E06'); px(hx+4,hy-2,1,4,'#1A0E06');   // slit pupils
    px(hx-5,hy-2,1,1,'#FFF3D0'); px(hx+3,hy-2,1,1,'#FFF3D0');
    // snout + nostrils
    px(hx+7,hy+2,7,5,sMid); px(hx+13,hy+3,2,2,sShadow);
    // open fanged maw
    px(hx-6,hy+7,18,4,mouth); px(hx-4,hy+9,6,2,tongue); px(hx+2,hy+9,3,3,tongue);   // maw + forked tongue
    ctx.fillStyle=fang;
    ctx.beginPath(); ctx.moveTo(hx-4,hy+7); ctx.lineTo(hx-2,hy+13); ctx.lineTo(hx,hy+7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+8,hy+7); ctx.lineTo(hx+10,hy+13); ctx.lineTo(hx+12,hy+7); ctx.closePath(); ctx.fill();

    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-26,y-52,56,72,'#FF9A5A'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);
  },
});

function _ssBite(e, p){
  spawnSparkles(p.x, p.y-8, '#D8A85A', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=18*(e.scale||1);
  p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
