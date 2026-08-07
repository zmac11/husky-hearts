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
    const y=y0+(crouch?2:Math.round(Math.sin(t/300)*1));
    const enraged=(e.hp/e.maxHp)<=0.34;
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y0+18,26,7,0,0,Math.PI*2); ctx.fillStyle='#1E1A10'; ctx.fill(); ctx.globalAlpha=1;
    if(crouch){ ctx.save(); ctx.globalAlpha=0.28+0.2*Math.sin(t/60); ctx.fillStyle=e.state==='firewind'?'#F0742E':'#E0C060'; ctx.beginPath(); ctx.ellipse(x,y+8,34,14,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    // tattered cape / body
    px(x-16,y-6,32,24,'#7A5A2E'); px(x-16,y-6,32,5,'#8E6C38');
    px(x-14,y+14,8,8,'#6A4A24'); px(x+6,y+16,8,6,'#6A4A24');   // ragged hem
    // cross-arms of straw
    px(x-24,y-8,48,4,'#8A6A3A'); px(x-24,y-6,6,6,'#E0C87A'); px(x+18,y-6,6,6,'#E0C87A');
    // burlap head
    px(x-9,y-26,18,18,'#D8B978'); px(x-9,y-26,18,5,'#E6C98A');
    // crooked crown of corn husks
    ctx.fillStyle='#E0A83A';
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x+i*5-2,y-26); ctx.lineTo(x+i*5,y-38); ctx.lineTo(x+i*5+2,y-26); ctx.closePath(); ctx.fill(); }
    // glowing jack-o'-lantern face
    const eye=enraged?'#FF3A1E':'#FF9A2E';
    ctx.fillStyle=eye;
    ctx.beginPath(); ctx.moveTo(x-6,y-20); ctx.lineTo(x-2,y-18); ctx.lineTo(x-6,y-15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+6,y-20); ctx.lineTo(x+2,y-18); ctx.lineTo(x+6,y-15); ctx.closePath(); ctx.fill();
    px(x-5,y-12,10,3,eye);   // jagged grin
    px(x-3,y-11,2,2,'#3A2A1A'); px(x+2,y-11,2,2,'#3A2A1A');
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-26,y-30,52,50,'#FF9A5A'); ctx.globalAlpha=1; }
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
