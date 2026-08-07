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
    e.dir=-1; e.state='burrow'; e.actT=3200; e.moundCd=900; e.touchCd=0; e.bob=0;
  },
  update(e, t, dt){
    const p=_ssNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, enraged=frac<=0.34, S=e.scale||1;
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
      // a rushing sand mound + a cresting fin
      ctx.save(); ctx.globalAlpha=0.9; ctx.fillStyle='#D8BC84';
      ctx.beginPath(); ctx.ellipse(x,y,26*S,12*S,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#C6A868'; ctx.beginPath(); ctx.ellipse(x,y+3,20*S,8*S,0,0,Math.PI*2); ctx.fill();
      // fin
      ctx.fillStyle='#A6864A'; ctx.beginPath(); ctx.moveTo(x-6*S,y-2); ctx.lineTo(x+D*4*S,y-16*S); ctx.lineTo(x+8*S,y-2); ctx.closePath(); ctx.fill();
      // trailing sand puffs
      ctx.globalAlpha=0.4; for(let i=1;i<=3;i++){ ctx.beginPath(); ctx.arc(x-D*i*10*S, y+4, 4*S, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      return;
    }
    // reared, exposed serpent
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    const enraged=(e.hp/e.maxHp)<=0.34;
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y+20,26,7,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    // coiled body rising
    ctx.fillStyle='#C69A54';
    ctx.beginPath(); ctx.moveTo(x-16,y+18); ctx.quadraticCurveTo(x-22,y-2,x-6,y-12); ctx.quadraticCurveTo(x+10,y-22,x+6,y-34); ctx.lineTo(x+16,y-32); ctx.quadraticCurveTo(x+22,y-14,x+8,y-2); ctx.quadraticCurveTo(x-2,y+8,x+6,y+18); ctx.closePath(); ctx.fill();
    // belly scales
    ctx.fillStyle='#E0C078'; for(let i=0;i<5;i++){ px(x-2+i*0, y+10-i*8, 8, 3, '#E0C078'); }
    // head
    const hx=x+12, hy=y-34;
    px(hx-8,hy-4,18,12,'#B5893E'); px(hx-6,hy-6,14,5,'#C69A54');
    // jaw
    px(hx-8,hy+6,16,4,'#8A6A2E');
    // eyes
    const eye=enraged?'#FF3A1E':'#FFB03A'; px(hx-4,hy-1,3,3,eye); px(hx+5,hy-1,3,3,eye);
    // fangs
    ctx.fillStyle='#F5F0E0'; ctx.beginPath(); ctx.moveTo(hx-4,hy+6); ctx.lineTo(hx-2,hy+11); ctx.lineTo(hx,hy+6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+4,hy+6); ctx.lineTo(hx+6,hy+11); ctx.lineTo(hx+8,hy+6); ctx.closePath(); ctx.fill();
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-24,y-40,52,60,'#FF9A5A'); ctx.globalAlpha=1; }
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
