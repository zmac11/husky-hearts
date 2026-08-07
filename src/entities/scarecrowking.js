// ====================== ENTITY: THE SCARECROW KING (Amber Orchard boss) ======================
// A theatrical harvest-night fight that rewards good COOKING. Three tricks:
//   • SUMMON — calls straw minions (spawns `scarecrow`s), like the Alpha Wolf's howl.
//   • FIRE LANES — torches strips of the field: a row of telegraphed `groundzone`s you weave
//     between (echoing the Badger Baron's / Sand Serpent's ground tells).
//   • BUFF-STEAL — on a melee hit it EATS one of your active buff-foods (Status.stripBuff),
//     so cooking spares keeps you ahead.
// Enrages below a third (faster, more fire). Cozy failure → Play Again. Last real level of the
// orchard, so downing it drops the biome-finale golden chest via checkWin.

function _skNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('scarecrowking', {
  radius: 44,
  init(e){
    e.name='The Scarecrow King'; e.boss=true; e.noKnockback=true;
    e.maxHp=e.maxHp||60; e.hp=(typeof e.hp==='number'&&e.hp<=e.maxHp)?e.hp:e.maxHp;
    e.speed=e.speed||0.9; e.dmg=e.dmg||3; e.scale=e.scale||BOSS_SCALE;
    e.dir=-1; e.state='track'; e.actT=0;
    e.summonCd=3600; e.fireCd=4200; e.touchCd=0; e.summoned=0; e.bob=0;
  },
  update(e, t, dt){
    const p=_skNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x,p.y-e.y);
    const frac=e.hp/e.maxHp, enraged=frac<=0.34;
    const S=e.scale||1;
    e.summonCd=Math.max(0,e.summonCd-dt); e.fireCd=Math.max(0,e.fireCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);

    if(e.state==='summonwind'){
      // interruptible like the Alpha's howl
      if(e.hurtT>0){ e.state='track'; e.summonCd=3000; if(typeof showToast==='function') showToast('💫 You cut off the summons!',1500); e.bob=t; return; }
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.summonCd= enraged?5000:7000;
        const n=enraged?3:2;
        for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2); Entities.spawn('scarecrow',{ x:clamp(e.x+Math.cos(a)*70*S,30,WORLD_W-30), y:clamp(e.y+Math.sin(a)*70*S,40,WORLD_H-40), speed:0.8 }); }
        e.summoned+=n;
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-10,'#E0C060',18);
        if(typeof sfxSummon==='function') sfxSummon();
        showToast('🌾 The Scarecrow King calls his straw minions!',1700);
      }
      e.bob=t; return;
    }
    if(e.state==='firewind'){
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.fireCd= enraged?4200:6000;
        // a lane of fire marching across the field toward the dog
        const a=Math.atan2(p.y-e.y,p.x-e.x);
        const n= enraged?5:4;
        for(let i=1;i<=n;i++){
          const gx=clamp(e.x+Math.cos(a)*i*70, 40, WORLD_W-40), gy=clamp(e.y+Math.sin(a)*i*70, 48, WORLD_H-40);
          Entities.spawn('groundzone',{ x:gx, y:gy, r:44*S, warnMs:(enraged?300:460)+i*120, dmg:e.dmg, color:'#F0742E', scale:S });
        }
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y,'#F0742E',14);
        showToast('🔥 Fire sweeps the field — weave through it!',1800);
      }
      e.bob=t; return;
    }

    // ---- decide next move ----
    if(e.summonCd<=0 && dist<520 && e.summoned<(enraged?8:5)){
      e.state='summonwind'; e.actT= enraged?700:900; e.alertT=700; e.bob=t; return;
    }
    if(e.fireCd<=0 && dist<520){
      e.state='firewind'; e.actT= enraged?420:560; e.alertT=600; e.bob=t; return;
    }
    const a=Math.atan2(p.y-e.y,p.x-e.x); const spd=e.speed*(enraged?1.3:1);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale,20,WORLD_W-20); e.y=clamp(e.y+Math.sin(a)*spd*dtScale,26,WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<32*S && e.touchCd<=0){ _skBash(e,p); e.touchCd=1000; }
    e.bob=t;
  },
  draw(e, t){
    const S=e.scale||1, D=e.dir;
    const x=Math.round(e.x), y0=Math.round(e.y);
    const crouch=(e.state==='summonwind'||e.state==='firewind');
    const fire=(e.state==='firewind');
    const y=y0+(crouch?2:Math.round(Math.sin(t/300)*1));
    const enraged=(e.hp/e.maxHp)<=0.34;

    // ---- palette ----
    const poleW='#5A4028', poleL='#6E5236';
    const buShadow='#6A4A24', buDark='#8A6A3A', buBase='#C7A35C', buMid='#D8B978', buLite='#EAD09A',
          patch='#A8824A', stitch='#4A3418';
    const clShadow='#4A3018', clDark='#6A4A24', clBase='#8A6636', clMid='#A07A42';
    const stDark='#C9A24A', stBase='#E4C464', stLite='#F2E290';
    const glow = enraged ? '#FF3A1E' : '#FF9A2E', glowIn = enraged ? '#FFC24A' : '#FFE0A0', ember='#FF6A1E';

    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    // ground shadow
    ctx.globalAlpha=0.28; ctx.beginPath(); ctx.ellipse(x,y0+19,28,8,0,0,Math.PI*2); ctx.fillStyle='#161208'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell (fire = orange flare, summon = golden)
    if(crouch){ ctx.save(); ctx.globalAlpha=0.30+0.20*Math.sin(t/60); ctx.fillStyle=fire?'#F0742E':'#E0C060'; ctx.beginPath(); ctx.ellipse(x,y+9,36,15,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // enrage: a smouldering ember haze
    if(enraged){ ctx.save(); ctx.globalAlpha=0.12+0.08*Math.sin(t/150); ctx.fillStyle='#FF5A1E'; ctx.beginPath(); ctx.ellipse(x,y-4,30,30,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // ---- the cross-pole armature it's mounted on (peeks behind) ----
    px(x-2, y-10, 4, 32, poleW); px(x-1, y-10, 1, 32, poleL);
    px(x-26, y-3, 52, 4, poleW); px(x-26, y-3, 52, 1, poleL);

    // ---- gangly straw-stuffed arms (one raised while casting) ----
    const raise = crouch ? -10 : 0;
    // far arm (behind body)
    ctx.strokeStyle=clDark; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-6,y-2); ctx.lineTo(x-20,y+2); ctx.lineTo(x-27,y-4+raise*0.4); ctx.stroke();
    // straw bursting from the far cuff + twig fingers
    px(x-30,y-8+Math.round(raise*0.4),4,4,stBase);
    ctx.strokeStyle=poleW; ctx.lineWidth=1.5;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x-28,y-4+raise*0.4); ctx.lineTo(x-34,y-7+i*3+raise*0.4); ctx.stroke(); }

    // ---- burlap tunic body (layered) ----
    px(x-15,y-8, 30,26, buDark);
    px(x-13,y-8, 26,7,  buMid);          // lit shoulders
    px(x-14,y-6, 28,4,  buBase);
    px(x-12,y-1, 24,12, buBase);         // mid torso
    px(x-13,y+9, 26,6,  buShadow);       // belly shadow
    // patchwork patches + cross-stitches
    px(x-9,y+1, 7,7, patch); ctx.strokeStyle=stitch; ctx.lineWidth=1; ctx.strokeRect(x-9,y+1,7,7);
    px(x-8,y+2,5,1,stitch); px(x-8,y+5,5,1,stitch);
    px(x+3,y-4, 6,6, patch); ctx.strokeRect(x+3,y-4,6,6);
    px(x+4,y-3,4,1,stitch); px(x+4,y-1,4,1,stitch);
    // rope belt
    px(x-14,y+7, 28,3, '#7A5E30'); px(x-2,y+6, 5,5, '#8A6A3A');
    // tattered hem with straw poking through
    px(x-15,y+15, 6,6, clDark); px(x-6,y+16, 6,5, clDark); px(x+3,y+15, 6,6, clDark); px(x+11,y+16, 5,5, clDark);
    px(x-13,y+18,3,4,stBase); px(x-1,y+18,3,4,stBase); px(x+9,y+18,3,4,stBase);

    // ---- near arm reaching toward the dog (raised while casting) ----
    ctx.strokeStyle=clBase; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x+6,y-3); ctx.lineTo(x+20,y+1+raise); ctx.lineTo(x+28,y-5+raise); ctx.stroke();
    ctx.strokeStyle=clMid; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+6,y-3); ctx.lineTo(x+20,y+1+raise); ctx.stroke();
    // straw cuff + gnarled twig claw
    px(x+25,y-9+raise,5,5,stBase); px(x+26,y-10+raise,3,2,stLite);
    ctx.strokeStyle=poleW; ctx.lineWidth=2; ctx.lineCap='round';
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x+29,y-6+raise); ctx.lineTo(x+36,y-9+i*4+raise); ctx.stroke(); }

    // ---- straw ruff at the collar ----
    ctx.fillStyle=stBase;
    for(let i=-3;i<=3;i++){ ctx.beginPath(); ctx.moveTo(x+i*3-1,y-8); ctx.lineTo(x+i*2,y-15); ctx.lineTo(x+i*3+1,y-8); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle=stLite; px(x-1,y-14,2,4,stLite);

    // ---- big burlap sack head ----
    px(x-11,y-28, 22,20, buBase); px(x-11,y-28,22,6, buMid); px(x-10,y-27,20,2, buLite);   // lit crown
    px(x-11,y-11, 22,4, buShadow);                                                          // jaw shadow
    // stitched sack seams + a cinched, tied top
    ctx.strokeStyle=stitch; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x,y-28); ctx.lineTo(x,y-9); ctx.stroke();          // vertical seam
    for(let i=-3;i<=3;i++){ px(x+i*3, y-28+ (i%2?0:1), 2,1, stitch); }             // cross-stitch band
    px(x-3,y-30,6,3,'#7A5E30'); px(x-2,y-32,4,3,buDark);                            // cinched tie + gathered top
    // burlap weave speckle
    px(x-7,y-22,2,2,buDark); px(x+4,y-24,2,2,buDark); px(x-1,y-14,2,2,buDark);

    // ---- carved, glowing jack-o'-lantern face ----
    ctx.save();
    ctx.globalAlpha=0.5+0.25*Math.sin(t/180);
    const fg=ctx.createRadialGradient(x,y-19,1,x,y-19,14); fg.addColorStop(0,glowIn); fg.addColorStop(1,'rgba(255,140,40,0)');
    ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(x,y-19,14,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.fillStyle=glow;
    ctx.beginPath(); ctx.moveTo(x-7,y-23); ctx.lineTo(x-2,y-20); ctx.lineTo(x-7,y-17); ctx.closePath(); ctx.fill();   // left eye
    ctx.beginPath(); ctx.moveTo(x+7,y-23); ctx.lineTo(x+2,y-20); ctx.lineTo(x+7,y-17); ctx.closePath(); ctx.fill();   // right eye
    px(x-6,y-21,2,2,glowIn); px(x+4,y-21,2,2,glowIn);       // hot pupils
    ctx.beginPath(); ctx.moveTo(x-1,y-19); ctx.lineTo(x+2,y-15); ctx.lineTo(x-2,y-15); ctx.closePath(); ctx.fillStyle=glow; ctx.fill();   // triangular nose
    // jagged toothy grin
    ctx.fillStyle=glow; px(x-7,y-14,14,3,glow);
    ctx.fillStyle=buShadow;
    px(x-5,y-14,2,3,buShadow); px(x-1,y-14,2,3,buShadow); px(x+3,y-14,2,3,buShadow);
    px(x-6,y-11,2,1,glowIn); px(x+4,y-11,2,1,glowIn);

    // ---- crooked crown of dried corn husks + a little gourd ----
    ctx.fillStyle='#E0A83A';
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x+i*5-2,y-28); ctx.lineTo(x+i*5+Math.sin(i)*1,y-40); ctx.lineTo(x+i*5+2,y-28); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#C98A2E'; for(let i=-2;i<=2;i+=2){ px(x+i*5-1,y-38,2,4,'#C98A2E'); }
    px(x-2,y-43,5,5,'#E67E22'); px(x-1,y-44,3,2,'#F0923A'); px(x,y-46,2,3,'#5A7A3A');   // gourd + stem

    // enrage: floating embers
    if(enraged){ ctx.fillStyle=ember; for(let i=0;i<4;i++){ const a=t/300+i*1.6; ctx.globalAlpha=0.6*(0.5+0.5*Math.sin(t/200+i)); px(Math.round(x+Math.cos(a)*22), Math.round(y-8+Math.sin(a*1.3)*18-((t/40+i*20)%40)+20), 2,2, ember); } ctx.globalAlpha=1; }

    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-28,y-44,56,66,'#FF9A5A'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);
  },
});

function _skBash(e, p){
  spawnSparkles(p.x, p.y-8, '#E0C060', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  // eat a buff-food off the dog
  if(typeof Status!=='undefined'){ const eaten=Status.stripBuff(p); if(eaten && typeof showToast==='function') showToast('🎃 The King gobbled your '+eaten+' buff!',1600); }
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=18*(e.scale||1);
  p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
