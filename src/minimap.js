// ====================== MINIMAP ======================
function drawMinimap(){
  const MW=120,MH=80,MX=VIEW_W-MW-8,MY=8;
  ctx.save();
  ctx.globalAlpha=0.88;
  ctx.fillStyle='#1A3A1A'; roundRect(MX,MY,MW,MH,6,true,false);
  ctx.strokeStyle='#8ACA5A'; ctx.lineWidth=1.5; roundRect(MX,MY,MW,MH,6,false,true);
  ctx.globalAlpha=1;
  // grass
  ctx.fillStyle='#4A9A3A'; ctx.fillRect(MX+1,MY+1,MW-2,MH-2);
  // ponds
  worldObjects.filter(o=>o.kind==='pond').forEach(o=>{
    ctx.fillStyle='#4AACDC';
    ctx.beginPath(); ctx.ellipse(MX+o.x*(MW/WORLD_W),MY+o.y*(MH/WORLD_H),(o.w/2)*(MW/WORLD_W),(o.h/2)*(MH/WORLD_H),0,0,Math.PI*2); ctx.fill();
  });
  const sx=MW/WORLD_W,sy=MH/WORLD_H;
  // collectibles
  collectibles.forEach(c=>{ if(c.taken)return; ctx.fillStyle='#FFD93D'; ctx.fillRect(MX+c.x*sx-1,MY+c.y*sy-1,3,3); });
  // friends
  friends.forEach(f=>{ ctx.fillStyle=f.cheered?'#FFD93D':'#FFAAAA'; ctx.fillRect(MX+f.x*sx-3,MY+f.y*sy-3,6,6); });
  // viewport
  ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
  ctx.strokeRect(MX+cam.x*sx,MY+cam.y*sy,VIEW_W*sx,VIEW_H*sy);
  // players
  ctx.fillStyle=p1.color; ctx.fillRect(MX+p1.x*sx-3,MY+p1.y*sy-3,7,7);
  if(twoPlayer){ ctx.fillStyle=p2.color; ctx.fillRect(MX+p2.x*sx-3,MY+p2.y*sy-3,7,7); }
  ctx.restore();
}

