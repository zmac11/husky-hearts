// ====================== ENTITY: SCARECROW (Amber Orchard) ======================
// A straw figure that's a harmless prop BY DAY and stirs to life in the DARK (Haybale Maze
// runs `dark:true`). While the level is dark it lurches after the nearest dog and swats on
// contact; in the light it stands slumped on its post. Poppable like any enemy (hp), and the
// Scarecrow King summons more of them.

function _scNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}
function _scAwake(){ return (typeof Darkness!=='undefined') && Darkness.active(); }

Entities.register('scarecrow', {
  radius: 26,
  init(e){
    e.hp=(typeof e.hp==='number')?e.hp:4;
    e.speed=e.speed||0.75; e.chaseR=e.chaseR||220; e.dmg=e.dmg||2;
    e.dir=1; e.cool=0; e.bob=0; e.lurch=0;
  },
  update(e, t, dt){
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);
    if(e.fearedT>0) e.fearedT=Math.max(0,e.fearedT-dt);
    if(!_scAwake()){ e._chasing=false; e.bob=t; return; }   // dormant in the light
    const p=_scNearest(e);
    const dist=p?Math.hypot(p.x-e.x,p.y-e.y):Infinity;
    if(e.fearedT>0 && p){ const a=Math.atan2(e.y-p.y,e.x-p.x); e.x+=Math.cos(a)*e.speed*1.3*dtScale; e.y+=Math.sin(a)*e.speed*1.3*dtScale; e.dir=Math.cos(a)>=0?1:-1; }
    else if(p && dist<e.chaseR*Entities.noiseFactor(p)){
      if(!e._chasing){ e._chasing=true; e.alertT=700; }
      const a=Math.atan2(p.y-e.y,p.x-e.x);
      e.x+=Math.cos(a)*e.speed*1.3*dtScale; e.y+=Math.sin(a)*e.speed*1.3*dtScale; e.dir=Math.cos(a)>=0?1:-1;
      e.lurch=Math.sin(t/160)*3;
      if(dist<24 && e.cool<=0){ _scSwat(e,p); e.cool=1100; }
    } else e._chasing=false;
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), D=e.dir, awake=_scAwake();
    const tilt=awake?(e.lurch||0):0;
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+14,12,4,0,0,Math.PI*2); ctx.fillStyle='#1E1A10'; ctx.fill(); ctx.globalAlpha=1;
    // post + cross-arms
    px(x-1,y-6,3,20,'#8A6A3A');
    px(x-14,y-4,28,3,'#8A6A3A');
    // straw body (burlap sack)
    px(x-8,y-14+tilt*0.3,16,16,'#C79A54'); px(x-8,y-14+tilt*0.3,16,4,'#D8AC66');
    // stitched patches
    px(x-5,y-6,4,4,'#A87E3E'); px(x+2,y-9,3,3,'#A87E3E');
    // straw tufts at wrists
    px(x-15,y-5,4,4,'#E0C87A'); px(x+12,y-5,4,4,'#E0C87A');
    // burlap head + pointed hat
    px(x-6,y-24+tilt,12,12,'#D8B978');
    ctx.fillStyle='#5A3A22'; ctx.beginPath(); ctx.moveTo(x-8,y-22+tilt); ctx.lineTo(x,y-34+tilt); ctx.lineTo(x+8,y-22+tilt); ctx.closePath(); ctx.fill();
    // face — friendly stitches by day, glowing eyes by night
    if(awake){ px(x-4,y-20+tilt,3,3,'#FF7A2E'); px(x+2,y-20+tilt,3,3,'#FF7A2E'); px(x-3,y-15+tilt,6,1,'#3A2A1A'); }
    else { px(x-4,y-20,2,2,'#3A2A1A'); px(x+2,y-20,2,2,'#3A2A1A'); px(x-3,y-15,6,1,'#3A2A1A'); }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-10,y-26,20,30,'#FF9A5A'); ctx.globalAlpha=1; }
    Entities.drawAlert(e);
  },
});

function _scSwat(e, p){
  spawnSparkles(p.x, p.y-8, '#C79A54', 10);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||2);
  const a=Math.atan2(p.y-e.y,p.x-e.x); p.x=clamp(p.x+Math.cos(a)*16,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*16,26,WORLD_H-20);
  showToast('🌾 The scarecrow swatted you!', 1300);
  if(typeof sfxHowl==='function') sfxHowl();
}
