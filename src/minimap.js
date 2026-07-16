// ====================== MINIMAP ======================
function drawMinimap(){
  const MW=120,MH=80,MX=VIEW_W-MW-8,MY=8;
  ctx.save();
  ctx.globalAlpha=0.88;
  ctx.fillStyle='#1A3A1A'; roundRect(MX,MY,MW,MH,6,true,false);
  ctx.strokeStyle='#8ACA5A'; ctx.lineWidth=1.5; roundRect(MX,MY,MW,MH,6,false,true);
  ctx.globalAlpha=1;
  const th=(typeof LevelManager!=='undefined'&&LevelManager.theme)||{};
  const mmGrass=th.minimapGrass||'#4A9A3A', mmWater=th.minimapWater||'#4AACDC';
  // grass
  ctx.fillStyle=mmGrass; ctx.fillRect(MX+1,MY+1,MW-2,MH-2);
  // river
  if(river){
    const sx=MW/WORLD_W,sy=MH/WORLD_H,steps=60;
    ctx.fillStyle=mmWater;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){const x=i*(WORLD_W/steps);if(i===0)ctx.moveTo(MX+x*sx,MY+(riverY(x)-riverWidthAt(x)/2)*sy);else ctx.lineTo(MX+x*sx,MY+(riverY(x)-riverWidthAt(x)/2)*sy);}
    for(let i=steps;i>=0;i--){const x=i*(WORLD_W/steps);ctx.lineTo(MX+x*sx,MY+(riverY(x)+riverWidthAt(x)/2)*sy);}
    ctx.closePath();ctx.fill();
  }
  // ponds + lakes
  worldObjects.filter(o=>o.kind==='pond'||o.kind==='lake').forEach(o=>{
    ctx.fillStyle=mmWater;
    ctx.beginPath(); ctx.ellipse(MX+o.x*(MW/WORLD_W),MY+o.y*(MH/WORLD_H),(o.w/2)*(MW/WORLD_W),(o.h/2)*(MH/WORLD_H),0,0,Math.PI*2); ctx.fill();
  });
  const sx=MW/WORLD_W,sy=MH/WORLD_H;
  // collectibles
  collectibles.forEach(c=>{ if(c.taken)return; ctx.fillStyle=c.type==='fish'?'#4AC8FF':'#FFD93D'; ctx.fillRect(MX+c.x*sx-1,MY+c.y*sy-1,3,3); });
  // friends
  friends.forEach(f=>{ ctx.fillStyle=f.cheered?'#FFD93D':'#FFAAAA'; ctx.fillRect(MX+f.x*sx-3,MY+f.y*sy-3,6,6); });
  // registry entities (hostiles red, friendly wildlife green, graves grey, NPCs yellow)
  const hostile={enemy:1,wolf:1};
  entities.forEach(e=>{
    if(e.kind==='grave'){ ctx.fillStyle='#9A9A92'; ctx.fillRect(MX+e.x*sx-1,MY+e.y*sy-2,3,4); return; }
    if(e.kind==='critter'){ ctx.fillStyle='#7FE0A0'; ctx.fillRect(MX+e.x*sx-2,MY+e.y*sy-2,4,4); return; }
    ctx.fillStyle=hostile[e.kind]?'#E05555':'#FFE08A'; ctx.fillRect(MX+e.x*sx-2,MY+e.y*sy-2,4,4);
  });
  // viewport
  ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
  ctx.strokeRect(MX+cam.x*sx,MY+cam.y*sy,VIEW_W*sx,VIEW_H*sy);
  // player
  ctx.fillStyle=p1.color; ctx.fillRect(MX+p1.x*sx-3,MY+p1.y*sy-3,7,7);
  ctx.restore();
}

