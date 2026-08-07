// ====================== TERRAIN: GOLDEN DUNES (Biome 6) ======================
// Three desert terrains — the open Dune Sea, the Hidden Oasis hub, and the interior Ancient
// Ruins — plus the sandstone/oasis world-object visuals. Named TERRAIN hooks called by
// levels/from-config.js; the sun-bleached palette comes from each level's `theme`. Shade rocks,
// palms and ruin walls double as SHADE for the survival meter (survival.js _inShade); ponds
// are the oasis that refills it.

function _dunesBorder(){ const W=WORLD_W,H=WORLD_H; addCollider(0,0,W,14); addCollider(0,H-14,W,14); addCollider(0,0,14,H); addCollider(W-14,0,14,H); }

// ---------------- 6·1 Dune Sea ----------------
function buildDuneSea(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _dunesBorder();
  const taken=[];
  // central oasis (water = survival refuel) ringed by palms
  const ox=W*0.5, oy=H*0.5;
  worldObjects.push({kind:'pond', x:ox, y:oy, w:280, h:190, seed:rnd()*100, blobSeed:Math.floor(rnd()*9999)});
  taken.push({x:ox,y:oy});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const px2=ox+Math.cos(a)*180, py=oy+Math.sin(a)*130;
    worldObjects.push({kind:'palm',x:px2,y:py,seed:rnd()*100}); addCollider(px2-4,py+16,8,8); taken.push({x:px2,y:py}); }
  // rolling dunes (decorative)
  for(let i=0;i<26;i++){ worldObjects.push({kind:'dune',x:rand(40,W-40),y:rand(40,H-40),seed:Math.floor(rnd()*9999)}); }
  // shade rocks (solid + provide shade) scattered as havens
  for(let i=0;i<9;i++){ let x,y; for(let a=0;a<24;a++){ x=rand(80,W-80); y=rand(80,H-80); if(!isWater(x,y,40)&&taken.every(t=>Math.hypot(t.x-x,t.y-y)>150)) break; }
    if(isWater(x,y,40)) continue; taken.push({x,y}); worldObjects.push({kind:'shaderock',x,y,seed:rnd()*100}); addCollider(x-18,y+2,36,14); }
  // cacti + bones
  for(let i=0;i<14;i++){ let x,y; for(let a=0;a<16;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,20)) break; } if(!isWater(x,y,20)){ worldObjects.push({kind:'cactus',x,y,seed:rnd()*100}); addCollider(x-4,y+8,8,8); } }
  for(let i=0;i<8;i++){ worldObjects.push({kind:'glyphstone',x:rand(60,W-60),y:rand(60,H-60),seed:Math.floor(rnd()*9999)}); }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 6·2 Hidden Oasis (calm hub) ----------------
function buildOasis(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _dunesBorder();
  // a big cool oasis lake
  worldObjects.push({kind:'pond', x:W*0.5, y:H*0.56, w:W*0.42, h:H*0.34, seed:rnd()*100, blobSeed:Math.floor(rnd()*9999)});
  // palms + tents around the water
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; const x=W*0.5+Math.cos(a)*W*0.28, y=H*0.56+Math.sin(a)*H*0.24;
    if(!isWater(x,y,30)){ worldObjects.push({kind:'palm',x,y,seed:rnd()*100}); addCollider(x-4,y+16,8,8); } }
  worldObjects.push({kind:'tent', x:W*0.22, y:H*0.28, hue:'#C46A3A', seed:1}); addCollider(W*0.22-22,H*0.28+2,44,16);
  worldObjects.push({kind:'tent', x:W*0.78, y:H*0.30, hue:'#7A9A5A', seed:2}); addCollider(W*0.78-22,H*0.30+2,44,16);
  worldObjects.push({kind:'well', x:W*0.5, y:H*0.2}); addCollider(W*0.5-12,H*0.2+2,24,12);
  // a couple of shade rocks + cacti
  for(let i=0;i<6;i++){ const x=rand(80,W-80), y=rand(80,H-80); if(!isWater(x,y,40)){ worldObjects.push({kind:'shaderock',x,y,seed:rnd()*100}); addCollider(x-18,y+2,36,14); } }
  for(let i=0;i<8;i++){ const x=rand(60,W-60), y=rand(60,H-60); if(!isWater(x,y,20)){ worldObjects.push({kind:'cactus',x,y,seed:rnd()*100}); addCollider(x-4,y+8,8,8); } }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 6·3 Ancient Ruins (puzzle dungeon) ----------------
function buildRuins(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _dunesBorder();
  // Ruin walls carve a few chambers joined by gaps (doorways). Walls are `ruinwall` (solid +
  // shade). Build a rough grid of rooms.
  function wallH(x0,x1,y){ for(let x=x0;x<x1;x+=40){ worldObjects.push({kind:'ruinwall',x,y,horizontal:true,seed:rnd()*100}); addCollider(x-20,y-12,40,24); } }
  function wallV(y0,y1,x){ for(let y=y0;y<y1;y+=40){ worldObjects.push({kind:'ruinwall',x,y,horizontal:false,seed:rnd()*100}); addCollider(x-12,y-20,24,40); } }
  // outer chamber ring (with a bottom entrance gap and inner doorways)
  wallH(W*0.18, W*0.44, H*0.34); wallH(W*0.56, W*0.82, H*0.34);   // top wall, centre doorway
  wallH(W*0.18, W*0.40, H*0.68); wallH(W*0.60, W*0.82, H*0.68);   // bottom wall, centre doorway
  wallV(H*0.34, H*0.52, W*0.30); wallV(H*0.60, H*0.68, W*0.30);   // left wall, mid doorway
  wallV(H*0.34, H*0.52, W*0.70); wallV(H*0.60, H*0.68, W*0.70);   // right wall, mid doorway
  wallV(H*0.34, H*0.46, W*0.5);                                    // an inner divider
  // rubble + glyph stones + cacti for flavour
  for(let i=0;i<10;i++){ const x=rand(80,W-80), y=rand(80,H-80); worldObjects.push({kind:'glyphstone',x,y,seed:Math.floor(rnd()*9999)}); }
  for(let i=0;i<8;i++){ const x=rand(80,W-80), y=rand(80,H-80); const big=rnd()<0.4; worldObjects.push({kind:'rock',x,y,big}); if(big) addCollider(x-12,y+2,24,12); }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

TERRAIN.dunesea = buildDuneSea;
TERRAIN.oasis   = buildOasis;
TERRAIN.ruins   = buildRuins;

// ============================ DESERT VISUALS ============================
function drawDune(x,y,seed){
  const rng=mulberry32(seed||1); const w=30+rng()*26;
  ctx.save(); ctx.globalAlpha=0.5;
  ctx.fillStyle='#E0C078'; ctx.beginPath(); ctx.ellipse(x,y,w,w*0.32,0,Math.PI,0); ctx.fill();
  ctx.fillStyle='#D2AE60'; ctx.beginPath(); ctx.ellipse(x+w*0.2,y+1,w*0.6,w*0.2,0,Math.PI,0); ctx.fill();
  ctx.restore();
}

function drawShadeRock(x,y,seed){
  ctx.save();
  ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+12,26,7,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
  // a big weathered sandstone boulder (casts shade)
  ctx.fillStyle='#B79A66'; ctx.beginPath(); ctx.moveTo(x-22,y+12); ctx.lineTo(x-16,y-12); ctx.lineTo(x-2,y-18); ctx.lineTo(x+14,y-14); ctx.lineTo(x+22,y+4); ctx.lineTo(x+16,y+12); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#C9AC78'; ctx.beginPath(); ctx.moveTo(x-14,y-10); ctx.lineTo(x-2,y-16); ctx.lineTo(x+8,y-10); ctx.lineTo(x-2,y-4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8A7044'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x-10,y+2); ctx.lineTo(x+6,y-2); ctx.stroke();
  // cool shade pool at the base
  ctx.globalAlpha=0.18; ctx.fillStyle='#4A5A6A'; ctx.beginPath(); ctx.ellipse(x,y+14,24,7,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCactus(x,y,seed){
  ctx.save();
  ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+9,8,3,0,0,Math.PI*2); ctx.fillStyle='#2A2A14'; ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle='#4E8E5E'; roundRect(x-4,y-16,8,26,4,true,false);
  ctx.fillStyle='#5EA06E'; roundRect(x-3,y-16,3,26,2,true,false);
  // arms
  ctx.fillStyle='#4E8E5E'; roundRect(x-12,y-6,8,4,2,true,false); roundRect(x-12,y-12,4,8,2,true,false);
  roundRect(x+4,y-2,8,4,2,true,false); roundRect(x+8,y-8,4,8,2,true,false);
  // little flower
  px(x-1,y-19,3,3,'#F0925A');
  ctx.restore();
}

function drawRuinWall(x,y,horizontal,seed){
  const rng=mulberry32((seed||1)*7);
  ctx.save();
  const w=horizontal?40:24, h=horizontal?24:40;
  ctx.fillStyle='#C7A876'; ctx.fillRect(x-w/2,y-h/2,w,h);
  ctx.fillStyle='#B79A66'; ctx.fillRect(x-w/2,y-h/2,w,3);
  // block seams
  ctx.strokeStyle='#8A6E42'; ctx.lineWidth=1; ctx.strokeRect(x-w/2,y-h/2,w,h);
  if(horizontal){ ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x,y+h/2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x-w/2,y); ctx.lineTo(x+w/2,y); ctx.stroke(); }
  // weathered chips
  if(rng()<0.5) px(x-w/2+2,y+h/2-4,3,3,'#9A8258');
  ctx.restore();
}

function drawGlyphStone(x,y,seed){
  const rng=mulberry32(seed||1);
  ctx.save();
  ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+8,9,3,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle='#BFA06E'; roundRect(x-7,y-12,14,20,2,true,false);
  ctx.fillStyle='#A88A54'; ctx.fillRect(x-7,y-12,14,2);
  ctx.strokeStyle='#7A5E36'; ctx.lineWidth=1;
  for(let i=0;i<3;i++){ const gy=y-8+i*6; ctx.beginPath(); ctx.moveTo(x-4,gy); ctx.lineTo(x+4,gy); ctx.stroke(); if(rng()<0.5){ ctx.beginPath(); ctx.moveTo(x,gy-2); ctx.lineTo(x,gy+2); ctx.stroke(); } }
  ctx.restore();
}

function drawWell(x,y){
  ctx.save();
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+12,18,5,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
  // stone ring + water
  ctx.fillStyle='#9A8258'; ctx.beginPath(); ctx.ellipse(x,y+4,16,9,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3A7E9C'; ctx.beginPath(); ctx.ellipse(x,y+4,10,5,0,0,Math.PI*2); ctx.fill();
  // posts + roof
  px(x-14,y-16,3,20,'#6A4A2A'); px(x+11,y-16,3,20,'#6A4A2A');
  ctx.fillStyle='#7A4A2E'; ctx.beginPath(); ctx.moveTo(x-18,y-14); ctx.lineTo(x,y-24); ctx.lineTo(x+18,y-14); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTent(x,y,hue,seed){
  ctx.save();
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+12,24,6,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
  ctx.fillStyle=hue||'#C46A3A'; ctx.beginPath(); ctx.moveTo(x-22,y+12); ctx.lineTo(x,y-18); ctx.lineTo(x+22,y+12); ctx.closePath(); ctx.fill();
  ctx.fillStyle=shade(hue||'#C46A3A',24); ctx.beginPath(); ctx.moveTo(x,y-18); ctx.lineTo(x+22,y+12); ctx.lineTo(x+8,y+12); ctx.closePath(); ctx.fill();
  // door flap
  ctx.fillStyle='#3A2A1A'; ctx.beginPath(); ctx.moveTo(x-6,y+12); ctx.lineTo(x,y-2); ctx.lineTo(x+6,y+12); ctx.closePath(); ctx.fill();
  // pennant
  px(x-1,y-24,2,7,'#6A4A2A'); ctx.fillStyle='#F0D060'; ctx.beginPath(); ctx.moveTo(x+1,y-24); ctx.lineTo(x+9,y-22); ctx.lineTo(x+1,y-20); ctx.closePath(); ctx.fill();
  ctx.restore();
}
