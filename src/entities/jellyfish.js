// ====================== ENTITY: JELLYFISH (Coral Sands) ======================
// A drifting surface hazard in the dive lagoon. It bobs on a slow current and, on contact
// with a dog swimming at the SURFACE, stings — applying `soaked` (waterlogged & slow) rather
// than dealing much damage. Duck under it by DIVING (over a deep basin the dog submerges and
// the jellyfish floats harmlessly overhead). It has hp, so an ability pops it like any enemy.
// Cozy: staying under too long isn't lethal — the sting just slows you briefly.

Entities.register('jellyfish', {
  radius: 24,

  init(e){
    e.hp    = (typeof e.hp==='number') ? e.hp : 3;
    e.speed = e.speed || 0.35;
    e.dmg   = e.dmg || 1;
    e.ang   = rand(0, Math.PI*2);
    e.turnT = 0; e.cool=0; e.bob=0; e.pulse=rand(0,Math.PI*2);
    e.homeX = e.x; e.homeY = e.y;
  },

  update(e, t, dt){
    // gentle wandering drift, loosely tethered to its spawn so it patrols one basin
    e.turnT-=dt;
    if(e.turnT<=0){ e.ang += rand(-0.9,0.9); e.turnT=rand(700,1500); }
    if(Math.hypot(e.x-e.homeX, e.y-e.homeY)>240) e.ang=Math.atan2(e.homeY-e.y, e.homeX-e.x);
    e.x=clamp(e.x+Math.cos(e.ang)*e.speed*dtScale, 24, WORLD_W-24);
    e.y=clamp(e.y+Math.sin(e.ang)*e.speed*dtScale, 30, WORLD_H-24);

    const p=p1;
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(p && !p.dead && !p.diving && e.cool<=0 && Math.hypot(p.x-e.x, p.y-e.y)<26){
      e.cool=1400;
      if(typeof Status!=='undefined') Status.apply(p, 'soaked', 3000);
      if(typeof Health!=='undefined' && e.dmg>0) Health.damage(p, e.dmg);
      spawnSparkles(p.x, p.y-6, '#8FE0F0', 10);
    }
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/500+e.pulse)*2);
    const squish=1+Math.sin(t/420+e.pulse)*0.12;
    ctx.save();
    ctx.globalAlpha=0.75;
    // bell
    ctx.fillStyle='#E39AD6';
    ctx.beginPath(); ctx.ellipse(x, y-3, 10*squish, 8/squish, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle='#F2BCE8'; ctx.beginPath(); ctx.ellipse(x, y-4, 7*squish, 5/squish, 0, Math.PI, 0); ctx.fill();
    // bell rim
    ctx.fillStyle='#D48AC8'; ctx.fillRect(x-10*squish, y-3, 20*squish, 2);
    // tentacles
    ctx.strokeStyle='#E39AD6'; ctx.lineWidth=1.5; ctx.globalAlpha=0.6;
    for(let i=-3;i<=3;i++){ const tx=x+i*2.4; ctx.beginPath(); ctx.moveTo(tx, y-1);
      ctx.quadraticCurveTo(tx+Math.sin(t/300+i)*3, y+6, tx+Math.sin(t/240+i)*4, y+12); ctx.stroke(); }
    ctx.restore();
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-11,y-12,22,24,'#FF9AD8'); ctx.globalAlpha=1; }
  },
});
