// ====================== TERRAIN: AMBER ORCHARD (Biome 5) ======================
// The harvest biome: a decoration AUGMENT for the Pumpkin Patch (over meadow terrain), a
// walled Haybale Maze, and a Cider Mill hub town — plus the autumn world-object visuals they
// place (pumpkin/haybale/cornstalk/mill/barn/leafpile). Named TERRAIN/AUGMENTS hooks called
// by levels/from-config.js; the amber/dusk palette comes from each level's `theme`.

// ---------------- 5·1 augment: Pumpkin Patch (autumn decor over the meadow) ----------------
AUGMENTS.pumpkinpatch = function(){
  const W=WORLD_W, H=WORLD_H;
  const dry=(x,y,m)=> (typeof isWater!=='function') || !isWater(x,y,m);
  // pumpkins in the field (small colliders)
  for(let i=0;i<16;i++){ let x,y; for(let a=0;a<20;a++){ x=rand(60,W-60); y=rand(60,H-60); if(dry(x,y,26)) break; }
    if(!dry(x,y,26)) continue; const big=rnd()<0.4; worldObjects.push({kind:'pumpkin',x,y,big,seed:rnd()*100}); if(big) addCollider(x-10,y+2,20,10); }
  // hay bales dotted about (solid)
  for(let i=0;i<7;i++){ let x,y; for(let a=0;a<20;a++){ x=rand(70,W-70); y=rand(70,H-70); if(dry(x,y,36)) break; }
    if(!dry(x,y,36)) continue; worldObjects.push({kind:'haybale',x,y}); addCollider(x-22,y-2,44,18); }
  // cornstalk rows (thin colliders)
  for(let i=0;i<18;i++){ let x,y; for(let a=0;a<16;a++){ x=rand(60,W-60); y=rand(60,H-60); if(dry(x,y,20)) break; }
    if(!dry(x,y,20)) continue; worldObjects.push({kind:'cornstalk',x,y,seed:rnd()*100}); }
  // fallen-leaf piles (no collider)
  for(let i=0;i<40;i++){ const x=rand(30,W-30), y=rand(30,H-30); if(dry(x,y,4)) worldObjects.push({kind:'leafpile',x,y,seed:Math.floor(rnd()*9999)}); }
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
};

// ---------------- 5·2 Haybale Maze ----------------
function buildHaybaleMaze(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W, H=WORLD_H;
  addCollider(0,0,W,14); addCollider(0,H-14,W,14); addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  // A serpentine "comb" of hay-bale walls: vertical runs with a gap at alternating ends,
  // forcing a winding path from the entrance (bottom-left) to the gate (top).
  function hayRunV(x, y0, y1){ for(let y=y0; y<y1; y+=40){ worldObjects.push({kind:'haybale',x,y}); addCollider(x-22,y-14,44,28); } }
  function hayRunH(x0, x1, y){ for(let x=x0; x<x1; x+=44){ worldObjects.push({kind:'haybale',x,y}); addCollider(x-22,y-14,44,28); } }
  const cols=5, gap=200;
  for(let i=1;i<=cols;i++){
    const x=W*(i/(cols+1));
    const gapTop = i%2===0;
    if(gapTop){ hayRunV(x, 40+gap, H-60); }         // gap at the TOP
    else      { hayRunV(x, 40,      H-60-gap); }     // gap at the BOTTOM
  }
  // a couple of horizontal accents to thicken the maze
  hayRunH(W*0.30, W*0.55, H*0.34);
  hayRunH(W*0.45, W*0.70, H*0.66);

  // decorate: pumpkins, cornstalks, leaf piles, a couple of lanterns for the night stealth
  for(let i=0;i<12;i++){ const x=rand(60,W-60), y=rand(60,H-60); worldObjects.push({kind:'pumpkin',x,y,big:false,seed:rnd()*100}); }
  for(let i=0;i<20;i++){ const x=rand(50,W-50), y=rand(50,H-50); worldObjects.push({kind:'cornstalk',x,y,seed:rnd()*100}); }
  for(let i=0;i<50;i++){ worldObjects.push({kind:'leafpile',x:rand(30,W-30),y:rand(30,H-30),seed:Math.floor(rnd()*9999)}); }
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

// ---------------- 5·3 Cider Mill (hub town) ----------------
function buildCiderMill(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W, H=WORLD_H;
  addCollider(0,0,W,14); addCollider(0,H-14,W,14); addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  // main street
  worldObjects.push({kind:'stonepath',x1:W*0.12,y1:H*0.55,x2:W*0.88,y2:H*0.5,seed:61});
  worldObjects.push({kind:'stonepath',x1:W*0.5, y1:H*0.16,x2:W*0.5, y2:H*0.9, seed:62});
  // the mill (big) + a couple of barns/shops
  worldObjects.push({kind:'mill', x:W*0.5,  y:H*0.24, seed:1}); addCollider(W*0.5-34, H*0.24-6, 68, 34);
  worldObjects.push({kind:'barn', x:W*0.22, y:H*0.66, hue:'#B5533A', seed:2}); addCollider(W*0.22-28, H*0.66-4, 56, 28);
  worldObjects.push({kind:'barn', x:W*0.80, y:H*0.68, hue:'#C79A54', seed:3}); addCollider(W*0.80-28, H*0.68-4, 56, 28);
  // a warm hearth (haven) + festival decor
  worldObjects.push({kind:'campfire', x:W*0.5, y:H*0.62});
  for(let i=0;i<9;i++){ const x=rand(70,W-70), y=rand(80,H-70); worldObjects.push({kind:'haybale',x,y}); addCollider(x-22,y-2,44,18); }
  for(let i=0;i<14;i++){ const x=rand(60,W-60), y=rand(80,H-60); worldObjects.push({kind:'pumpkin',x,y,big:rnd()<0.4,seed:rnd()*100}); }
  for(let i=0;i<16;i++){ worldObjects.push({kind:'cornstalk',x:rand(50,W-50),y:rand(70,H-50),seed:rnd()*100}); }
  for(let i=0;i<40;i++){ worldObjects.push({kind:'leafpile',x:rand(30,W-30),y:rand(30,H-30),seed:Math.floor(rnd()*9999)}); }
  // ---- REPUTATION TOWN GROWTH ----
  // As you earn the town's trust (p1.reputation, saved), the mill dresses up for a festival:
  // string bunting, extra jack-o'-lanterns, and a second warm hearth. Read on (re)build so it
  // reflects the current run's standing.
  const rep=(typeof p1!=='undefined' && p1) ? (p1.reputation||0) : 0;
  if(rep>=3){
    worldObjects.push({kind:'bunting', x1:W*0.12, y1:H*0.4, x2:W*0.42, y2:H*0.34, seed:1});
    worldObjects.push({kind:'bunting', x1:W*0.58, y1:H*0.34, x2:W*0.88, y2:H*0.4, seed:2});
    for(let i=0;i<6;i++){ const x=rand(60,W-60), y=rand(80,H-60); worldObjects.push({kind:'pumpkin',x,y,big:true,seed:rnd()*100}); }
  }
  if(rep>=6){
    worldObjects.push({kind:'bunting', x1:W*0.3, y1:H*0.72, x2:W*0.7, y2:H*0.72, seed:3});
    worldObjects.push({kind:'campfire', x:W*0.3, y:H*0.4});
    for(let i=0;i<6;i++){ worldObjects.push({kind:'cornstalk',x:rand(50,W-50),y:rand(70,H-50),seed:rnd()*100}); }
  }
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.haybalemaze = buildHaybaleMaze;
TERRAIN.cidermill   = buildCiderMill;

// ============================ ORCHARD VISUALS ============================
function drawPumpkin(x,y,big,seed){
  const s=big?1.3:1;
  ctx.save();
  ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+8*s,10*s,4,0,0,Math.PI*2); ctx.fillStyle='#2A1A0E'; ctx.fill(); ctx.globalAlpha=1;
  // ribbed body
  ctx.fillStyle='#E67E22'; ctx.beginPath(); ctx.ellipse(x,y,10*s,8*s,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#D06A16'; ctx.beginPath(); ctx.ellipse(x-4*s,y,3*s,8*s,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+4*s,y,3*s,8*s,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#F0923A'; ctx.beginPath(); ctx.ellipse(x,y,3*s,8*s,0,0,Math.PI*2); ctx.fill();
  // stem
  px(x-1,y-10*s,3,4*s,'#5A7A3A');
  ctx.restore();
}

function drawHaybale(x,y){
  ctx.save();
  ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+15,24,6,0,0,Math.PI*2); ctx.fillStyle='#2A2410'; ctx.fill(); ctx.globalAlpha=1;
  // rounded golden bale
  ctx.fillStyle='#D8B24A'; roundRect(x-22,y-14,44,28,8,true,false);
  ctx.fillStyle='#E6C566'; roundRect(x-22,y-14,44,7,6,true,false);
  // binding + straw texture
  ctx.strokeStyle='#B5923A'; ctx.lineWidth=1;
  for(let i=-16;i<=16;i+=6){ ctx.beginPath(); ctx.moveTo(x+i,y-12); ctx.lineTo(x+i,y+12); ctx.stroke(); }
  ctx.strokeStyle='#8A6E28'; ctx.lineWidth=2; ctx.strokeRect(x-9,y-14,6,28); ctx.strokeRect(x+3,y-14,6,28);
  ctx.restore();
}

function drawCornstalk(x,y,seed,t){
  const sway=Math.sin((t||0)/800+(seed||0))*2;
  ctx.save();
  ctx.strokeStyle='#8A9A3A'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,y+12); ctx.quadraticCurveTo(x+sway,y-6,x+sway,y-20); ctx.stroke();
  // leaves
  ctx.strokeStyle='#A8B84A'; ctx.lineWidth=2;
  for(let i=0;i<3;i++){ const ly=y+6-i*8, dir=i%2?1:-1;
    ctx.beginPath(); ctx.moveTo(x+sway*(i/3),ly); ctx.quadraticCurveTo(x+dir*8,ly-4,x+dir*13,ly+2); ctx.stroke(); }
  // an ear of corn
  px(x+sway+2,y-8,4,7,'#E0B23A');
  ctx.restore();
}

function drawLeafPile(x,y,seed){
  const rng=mulberry32(seed||1);
  const hues=['#D9772E','#C6532E','#E0A83A','#B5762E'];
  for(let i=0;i<4;i++){ const lx=x+(rng()*2-1)*7, ly=y+(rng()*2-1)*4;
    ctx.fillStyle=hues[Math.floor(rng()*hues.length)]; ctx.beginPath(); ctx.ellipse(lx,ly,3,2,rng()*Math.PI,0,Math.PI*2); ctx.fill(); }
}

function drawMill(x,y,seed,t){
  ctx.save();
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+26,40,9,0,0,Math.PI*2); ctx.fillStyle='#2A2010'; ctx.fill(); ctx.globalAlpha=1;
  // stone base + timber mill house
  px(x-32,y+6,64,20,'#9A8060'); px(x-30,y-14,60,22,'#B5866A'); px(x-30,y-14,60,4,'#C99A7A');
  // beams
  ctx.strokeStyle='#6A4A32'; ctx.lineWidth=2;
  ctx.strokeRect(x-30,y-14,60,40); ctx.beginPath(); ctx.moveTo(x-30,y-14); ctx.lineTo(x+30,y+26); ctx.moveTo(x+30,y-14); ctx.lineTo(x-30,y+26); ctx.stroke();
  // pitched roof
  ctx.fillStyle='#7A4A2E'; ctx.beginPath(); ctx.moveTo(x-36,y-14); ctx.lineTo(x,y-34); ctx.lineTo(x+36,y-14); ctx.closePath(); ctx.fill();
  // lit windows
  px(x-16,y-2,10,10,'#FFD87A'); px(x+6,y-2,10,10,'#FFD87A');
  // slowly turning water wheel on the side
  const wx=x-38, wy=y+6, ang=(t||0)/1400;
  ctx.strokeStyle='#5A4028'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(wx,wy,14,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=2; for(let i=0;i<8;i++){ const a=ang+i*Math.PI/4; ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(a)*14,wy+Math.sin(a)*14); ctx.stroke(); }
  ctx.restore();
}

function drawBunting(x1,y1,x2,y2,seed){
  const cols=['#E07A3A','#E0B23A','#B5533A','#7A9A5A','#C6772E'];
  const n=8, sag=18;
  ctx.save();
  // drooping string
  ctx.strokeStyle='#5A4632'; ctx.lineWidth=1.5;
  ctx.beginPath();
  for(let i=0;i<=n;i++){ const tt=i/n; const x=x1+(x2-x1)*tt; const y=y1+(y2-y1)*tt+Math.sin(tt*Math.PI)*sag; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  ctx.stroke();
  // triangular pennants hanging from it
  for(let i=0;i<n;i++){ const tt=(i+0.5)/n; const x=x1+(x2-x1)*tt; const y=y1+(y2-y1)*tt+Math.sin(tt*Math.PI)*sag;
    ctx.fillStyle=cols[(i+(seed||0))%cols.length];
    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.lineTo(x,y+8); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function drawBarn(x,y,hue,seed){
  ctx.save();
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+22,32,8,0,0,Math.PI*2); ctx.fillStyle='#2A2010'; ctx.fill(); ctx.globalAlpha=1;
  px(x-28,y-2,56,24,hue||'#B5533A'); px(x-28,y-2,56,4, shade(hue||'#B5533A',22));
  // roof
  ctx.fillStyle=shade(hue||'#B5533A',-40); ctx.beginPath(); ctx.moveTo(x-32,y-2); ctx.lineTo(x,y-22); ctx.lineTo(x+32,y-2); ctx.closePath(); ctx.fill();
  // big door + hayloft
  px(x-8,y+4,16,18,'#6A4028'); px(x-8,y+4,16,2,'#8A5A38'); px(x-1,y+4,2,18,'#4A2C18');
  px(x-4,y-14,8,7,'#E6C566');   // hayloft straw
  // white trim
  ctx.strokeStyle='#F0E6D2'; ctx.lineWidth=1; ctx.strokeRect(x-28,y-2,56,24);
  ctx.restore();
}
