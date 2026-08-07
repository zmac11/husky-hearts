// ====================== ENTITY: THE ICE YETI (Frostfang Tundra boss) ======================
// A heavy, arena-shaking brawler where WARMTH MANAGEMENT and your Ultimate decide the fight:
//   • GROUND-POUND — slams the ground, sending out expanding shockwave rings (telegraphed
//     `groundzone`s at growing radii) you dodge between.
//   • ENCASE — if you're close it freezes you in ice (a brief heavy `stunned`) — get clear
//     before it lands, or eat the freeze and shake it off.
//   • BLIZZARD ENRAGE below a third — it whips the storm faster (warmth drains hard), so only
//     fires / a warm meal / your Ultimate keep you going.
// Cozy failure → Play Again. Last real level of the tundra → golden chest via checkWin.

function _yNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('iceyeti', {
  radius: 48,
  init(e){
    e.name='The Ice Yeti'; e.boss=true; e.noKnockback=true;
    e.maxHp=e.maxHp||70; e.hp=(typeof e.hp==='number'&&e.hp<=e.maxHp)?e.hp:e.maxHp;
    e.speed=e.speed||0.85; e.dmg=e.dmg||3; e.scale=e.scale||BOSS_SCALE;
    e.dir=-1; e.state='track'; e.actT=0; e.poundCd=2600; e.encaseCd=5000; e.touchCd=0; e.bob=0;
  },
  update(e, t, dt){
    const p=_yNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, enraged=frac<=0.34, S=e.scale||1;
    // enrage whips the storm faster
    if(enraged && typeof Blizzard!=='undefined' && Blizzard.active()){ Blizzard._t=(Blizzard._t+dt*2)%Blizzard.PERIOD; }
    e.poundCd=Math.max(0,e.poundCd-dt); e.encaseCd=Math.max(0,e.encaseCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);

    if(e.state==='poundwind'){
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.poundCd= enraged?2400:3600;
        // expanding shockwave rings from the yeti
        const rings= enraged?4:3;
        for(let i=1;i<=rings;i++){ Entities.spawn('groundzone',{ x:e.x, y:e.y, r:(30+i*34)*S, warnMs:200+i*180, dmg:e.dmg, color:'#8FD0F0', scale:S }); }
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y+8,'#CFE6F5',20);
        if(typeof screenShake==='function') screenShake(6);
        showToast('❄️ Ground-pound — mind the rings!', 1600);
      }
      e.bob=t; return;
    }
    if(e.state==='encasewind'){
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.encaseCd= enraged?4200:6000;
        if(dist<90*S){ if(typeof Status!=='undefined') Status.apply(p,'stunned', enraged?1400:1100); if(typeof spawnSparkles==='function') spawnSparkles(p.x,p.y-8,'#BFE4F5',22); if(typeof Health!=='undefined') Health.damage(p,1); showToast('🧊 Encased in ice — shake free!',1600); }
        else { showToast('🧊 The Yeti\'s freeze missed — good dodge!',1400); }
      }
      e.bob=t; return;
    }

    // ---- decide ----
    if(e.encaseCd<=0 && dist<110*S){ e.state='encasewind'; e.actT= enraged?600:820; e.alertT=700; e.bob=t; return; }
    if(e.poundCd<=0 && dist<300){ e.state='poundwind'; e.actT= enraged?500:680; e.alertT=650; e.bob=t; return; }
    const a=Math.atan2(p.y-e.y,p.x-e.x); const spd=e.speed*(enraged?1.25:1);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale,20,WORLD_W-20); e.y=clamp(e.y+Math.sin(a)*spd*dtScale,26,WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<36*S && e.touchCd<=0){ _yBash(e,p); e.touchCd=1000; }
    e.bob=t;
  },
  draw(e, t){
    const S=e.scale||1, D=e.dir, x=Math.round(e.x), y0=Math.round(e.y);
    const crouch=(e.state==='poundwind'||e.state==='encasewind');
    const y=y0+(crouch?3:Math.round(Math.sin(t/320)*1));
    const enraged=(e.hp/e.maxHp)<=0.34;
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    ctx.globalAlpha=0.28; ctx.beginPath(); ctx.ellipse(x,y0+22,30,8,0,0,Math.PI*2); ctx.fillStyle='#1A2430'; ctx.fill(); ctx.globalAlpha=1;
    if(crouch){ ctx.save(); ctx.globalAlpha=0.28+0.2*Math.sin(t/60); ctx.fillStyle=e.state==='encasewind'?'#8FD0F0':'#BFE4F5'; ctx.beginPath(); ctx.ellipse(x,y+10,36,15,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // shaggy white body
    px(x-18,y-10,36,28,'#E8F2F8'); px(x-14,y-2,28,16,'#F6FBFF');
    px(x-16,y+16,10,8,'#D2E2EC'); px(x+6,y+16,10,8,'#D2E2EC');   // legs
    px(x-24,y-6,10,18,'#E0EEF6'); px(x+14,y-6,10,18,'#E0EEF6');  // arms
    // icy claws
    px(x-26,y+10,8,3,'#AFE0F5'); px(x+18,y+10,8,3,'#AFE0F5');
    // head + horns of ice
    px(x-11,y-24,22,18,'#EEF7FC');
    ctx.fillStyle='#BFE4F5'; ctx.beginPath(); ctx.moveTo(x-10,y-22); ctx.lineTo(x-16,y-34); ctx.lineTo(x-4,y-24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+10,y-22); ctx.lineTo(x+16,y-34); ctx.lineTo(x+4,y-24); ctx.closePath(); ctx.fill();
    // face
    const eye=enraged?'#3AD0FF':'#2A6E8C'; px(x-6,y-18,4,4,eye); px(x+3,y-18,4,4,eye);
    px(x-7,y-11,15,3,'#2A4A5A');   // grumpy mouth
    // frost breath while winding up an encase
    if(e.state==='encasewind'){ ctx.save(); ctx.globalAlpha=0.5; ctx.fillStyle='#DFF2FF'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(x+D*(16+i*7), y-8, 3+i, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-28,y-34,56,58,'#FFB0B0'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);
  },
});

function _yBash(e, p){
  spawnSparkles(p.x, p.y-8, '#BFE4F5', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=22*(e.scale||1);
  p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
