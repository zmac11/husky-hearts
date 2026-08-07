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
    // ---- palette ----
    const fShadow='#BCCEDC', fDark='#D2E2EC', fBase='#E8F2F8', fLite='#F6FBFF', fHi='#FFFFFF',
          iDark='#7FB8D8', iBase='#AFE0F5', iLite='#DFF2FF',
          skin='#C6DAE6', brow='#9FC0D2', mouth='#25404E', fang='#F0F8FF', nose='#8AAABC';
    const eye=enraged?'#3AD0FF':'#2A7EA0', eyeHot=enraged?'#CFF4FF':'#8FD0F0';

    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    // ground shadow
    ctx.globalAlpha=0.30; ctx.beginPath(); ctx.ellipse(x,y0+23,34,9,0,0,Math.PI*2); ctx.fillStyle='#14202C'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell
    if(crouch){ ctx.save(); ctx.globalAlpha=0.30+0.20*Math.sin(t/60); ctx.fillStyle=e.state==='encasewind'?'#8FD0F0':'#BFE4F5'; ctx.beginPath(); ctx.ellipse(x,y+11,38,16,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // enrage: a frigid aura
    if(enraged){ ctx.save(); ctx.globalAlpha=0.12+0.06*Math.sin(t/150); ctx.fillStyle='#5FC0F0'; ctx.beginPath(); ctx.ellipse(x,y-2,34,34,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // helper: a ring of shaggy fur tufts around an ellipse
    const tuft=(cx,cy,rw,rh,col,n)=>{ ctx.fillStyle=col; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const ox=cx+Math.cos(a)*rw, oy=cy+Math.sin(a)*rh; const oa=a+0.25;
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a-0.18)*rw, cy+Math.sin(a-0.18)*rh); ctx.lineTo(cx+Math.cos(oa)*(rw+6), cy+Math.sin(oa)*(rh+6)); ctx.lineTo(cx+Math.cos(a+0.18)*rw, cy+Math.sin(a+0.18)*rh); ctx.closePath(); ctx.fill(); } };

    // ---- legs + big clawed feet ----
    px(x-17,y+13,13,11,fDark); px(x+4,y+13,13,11,fDark);
    px(x-18,y+21,15,4,fBase); px(x+3,y+21,15,4,fBase);            // furry feet tops
    ctx.fillStyle=iBase; for(const fx of [-15,-10,7,12]){ ctx.beginPath(); ctx.moveTo(x+fx,y+24); ctx.lineTo(x+fx+2,y+20); ctx.lineTo(x+fx+4,y+24); ctx.closePath(); ctx.fill(); }   // toe claws

    // ---- far arm (behind body) ----
    px(x+15,y-9,12,24,fDark); tuft(x+21,y+2,8,12,fDark,7);
    px(x+22,y+14,9,7,fBase);                                       // fist
    ctx.fillStyle=iBase; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(x+22+i*3,y+15); ctx.lineTo(x+23+i*3,y+9); ctx.lineTo(x+25+i*3,y+15); ctx.closePath(); ctx.fill(); }   // icy knuckles

    // ---- barrel body: shaggy fur ring, then filled mass ----
    tuft(x,y+2,20,16,fShadow,16);
    tuft(x,y+1,19,15,fDark,16);
    ctx.fillStyle=fBase; ctx.beginPath(); ctx.ellipse(x,y+2,20,17,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=fLite; ctx.beginPath(); ctx.ellipse(x-4,y-4,14,11,0,0,Math.PI*2); ctx.fill();   // lit chest/shoulder
    // pale belly fur + a couple of hanging icicles
    ctx.fillStyle=fHi; ctx.beginPath(); ctx.ellipse(x-1,y+6,10,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=iLite; ctx.beginPath(); ctx.moveTo(x-8,y+14); ctx.lineTo(x-6,y+22); ctx.lineTo(x-4,y+14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+3,y+15); ctx.lineTo(x+5,y+21); ctx.lineTo(x+7,y+15); ctx.closePath(); ctx.fill();
    // hunched shoulder crest (raised fur hump)
    tuft(x-6,y-11,13,7,fDark,10); ctx.fillStyle=fBase; ctx.beginPath(); ctx.ellipse(x-4,y-11,12,7,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=fLite; px(x-10,y-13,10,3,fLite);

    // ---- near arm reaching forward ----
    px(x-27,y-9,13,25,fBase); tuft(x-21,y+2,9,13,fBase,8);
    px(x-30,y+13,11,9,fLite);                                      // big fist
    ctx.fillStyle=iBase; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(x-30+i*3,y+14); ctx.lineTo(x-29+i*3,y+7); ctx.lineTo(x-27+i*3,y+14); ctx.closePath(); ctx.fill(); }   // icy knuckle-spikes
    px(x-16,y-8,6,10,fLite);                                       // lit shoulder joint

    // ---- head set into the shoulders ----
    px(x-12,y-25,24,19,skin); tuft(x,y-24,13,10,fBase,12);         // furry mane behind the face
    px(x-12,y-25,24,19,skin);                                      // face plate over the mane
    px(x-11,y-24,22,4,fLite);                                       // lit crown fur line
    // heavy brow
    px(x-11,y-18,22,3,brow); px(x-10,y-19,20,1,'#B6D2E0');
    // deep-set glowing eyes
    px(x-8,y-17,6,4,'#12303C'); px(x+2,y-17,6,4,'#12303C');
    px(x-7,y-16,3,3,eye); px(x+3,y-16,3,3,eye);
    px(x-7,y-16,1,1,eyeHot); px(x+3,y-16,1,1,eyeHot);
    // broad flat nose
    px(x-3,y-13,6,4,nose); px(x-2,y-12,1,1,'#5E7E90'); px(x+1,y-12,1,1,'#5E7E90');
    // snarling mouth with fangs
    px(x-9,y-9,18,4,mouth);
    ctx.fillStyle=fang;
    ctx.beginPath(); ctx.moveTo(x-7,y-9); ctx.lineTo(x-5,y-4); ctx.lineTo(x-3,y-9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+3,y-9); ctx.lineTo(x+5,y-4); ctx.lineTo(x+7,y-9); ctx.closePath(); ctx.fill();
    px(x-8,y-9,16,1,fang);                                          // upper tooth line
    // cheek fur tufts
    ctx.fillStyle=fLite; px(x-14,y-14,4,6,fLite); px(x+10,y-14,4,6,fLite);

    // ---- jagged ICE CROWN jutting from the head + a shoulder shard ----
    ctx.fillStyle=iBase;
    ctx.beginPath(); ctx.moveTo(x-9,y-24); ctx.lineTo(x-14,y-38); ctx.lineTo(x-3,y-25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x-1,y-26); ctx.lineTo(x,y-42); ctx.lineTo(x+5,y-25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+7,y-24); ctx.lineTo(x+14,y-37); ctx.lineTo(x+2,y-25); ctx.closePath(); ctx.fill();
    ctx.fillStyle=iLite; px(x-11,y-33,2,6,iLite); px(x-1,y-37,2,8,iLite); px(x+8,y-31,2,5,iLite);   // highlights on the shards
    ctx.fillStyle=iBase; ctx.beginPath(); ctx.moveTo(x-16,y-12); ctx.lineTo(x-22,y-22); ctx.lineTo(x-11,y-14); ctx.closePath(); ctx.fill();   // shoulder shard

    // frost breath while winding up an encase
    if(e.state==='encasewind'){ ctx.save(); ctx.globalAlpha=0.5; ctx.fillStyle='#DFF2FF'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(x-D*(16+i*7), y-11, 3+i, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-34,y-42,68,68,'#FFB0B0'); ctx.globalAlpha=1; }
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
