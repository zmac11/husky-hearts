// ====================== ENTITY: CROW (Amber Orchard) ======================
// A thieving orchard pest. It circles, then swoops at the dog; on contact it SNATCHES one
// gathered ingredient (🎃/🍎/🌿) from the bag and flaps off cackling — annoying, not deadly.
// Keep moving or pop it with an ability (it has hp). If your bag has no ingredients it just
// bumps you for a sliver of damage.

function _crowNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}

Entities.register('crow', {
  radius: 22,
  init(e){
    e.hp=(typeof e.hp==='number')?e.hp:3;
    e.speed=e.speed||1.2; e.chaseR=e.chaseR||200; e.dir=1;
    e.state='circle'; e.ang=rand(0,Math.PI*2); e.cool=0; e.bob=0; e.flap=0;
    e.homeX=e.x; e.homeY=e.y;
  },
  update(e, t, dt){
    const p=_crowNearest(e);
    const dist=p?Math.hypot(p.x-e.x,p.y-e.y):Infinity;
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(e.fearedT>0){ e.fearedT=Math.max(0,e.fearedT-dt);
      if(p){ const a=Math.atan2(e.y-p.y,e.x-p.x); e.x+=Math.cos(a)*e.speed*1.6*dtScale; e.y+=Math.sin(a)*e.speed*1.6*dtScale; e.dir=Math.cos(a)>=0?1:-1; }
    } else if(p && dist<e.chaseR*Entities.noiseFactor(p) && e.cool<=0){
      // swoop toward the dog
      if(!e._chasing){ e._chasing=true; e.alertT=600; }
      const a=Math.atan2(p.y-e.y,p.x-e.x);
      e.x+=Math.cos(a)*e.speed*1.5*dtScale; e.y+=Math.sin(a)*e.speed*1.5*dtScale; e.dir=Math.cos(a)>=0?1:-1;
      if(dist<22){ _crowSteal(e,p); e.cool=2600; }
    } else {
      // lazy circling near home
      e._chasing=false; e.ang+=0.02*dtScale;
      const cx=e.homeX+Math.cos(e.ang)*60, cy=e.homeY+Math.sin(e.ang)*40;
      e.x+=(cx-e.x)*0.04*dtScale; e.y+=(cy-e.y)*0.04*dtScale; e.dir=Math.cos(e.ang)>=0?1:-1;
    }
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    e.flap+=dt; e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/200)*2), D=e.dir;
    const wing=Math.sin(t/90)*5;
    ctx.globalAlpha=0.16; ctx.beginPath(); ctx.ellipse(x,y+16,10,3,0,0,Math.PI*2); ctx.fillStyle='#1A1A1A'; ctx.fill(); ctx.globalAlpha=1;
    // body
    px(x-6,y-4,12,10,'#20202A'); px(x-4,y-2,8,6,'#33333F');
    // head + beak
    px(x+D*5-3,y-9,7,7,'#20202A');
    ctx.fillStyle='#E0A030'; ctx.beginPath(); ctx.moveTo(x+D*9,y-6); ctx.lineTo(x+D*15,y-5); ctx.lineTo(x+D*9,y-3); ctx.closePath(); ctx.fill();
    // eye
    px(x+D*6-1,y-7,2,2,'#FFC63A');
    // flapping wings
    ctx.fillStyle='#15151C';
    ctx.beginPath(); ctx.moveTo(x-2,y-2); ctx.lineTo(x-14,y-4-wing); ctx.lineTo(x-4,y+3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+2,y-2); ctx.lineTo(x+14,y-4-wing); ctx.lineTo(x+4,y+3); ctx.closePath(); ctx.fill();
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-10,y-12,20,20,'#FF6B6B'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _crowSteal(e, p){
  const cell=(typeof Inventory!=='undefined') ? Inventory.cells(p).find(c=>c && Items.get(c.id) && Items.get(c.id).type==='ingredient') : null;
  if(cell){
    Inventory.remove(p, cell.id, 1);
    const d=Items.get(cell.id);
    showToast(`🐦 A crow snatched your ${d?d.name:'ingredient'}!`, 1600);
    if(typeof updateHUD==='function') updateHUD();
  } else {
    if(typeof Health!=='undefined') Health.damage(p, 1);
    showToast('🐦 A crow pecked you!', 1300);
  }
  spawnSparkles(p.x, p.y-8, '#33333F', 8);
  const a=Math.atan2(e.y-p.y, e.x-p.x); e.x=clamp(e.x+Math.cos(a)*40,20,WORLD_W-20); e.y=clamp(e.y+Math.sin(a)*40,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
