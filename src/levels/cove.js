// ====================== TERRAIN: SEASHELL COVE (Biome 4) ======================
// Three sunlit shore terrains — Tide Pools, Palm Boardwalk, Coral Sands — plus the pixel-art
// draw functions for the new beach world-object kinds they place. Like the other level files
// these are named TERRAIN hooks that levels/from-config.js calls by name; the ground palette
// (sand golds) comes from each level's `theme` in levels.json, so buildGroundCanvas already
// paints a beach beneath us.
//
// New water kinds and their walkability live in world.js (isInPond/isWater/overDeepWater):
//   tidepool  — holds water only while the tide is IN (drains to walkable sand at low tide)
//   deepwater — a permanent dive basin (Coral Sands)
// New decoration kinds (palm/driftwood/coral/seashell/boardwalk) render below and dispatch
// from world-draw.js's drawWorld switch.

// ---- shared helpers ----
function _coveBorder(){
  const W=WORLD_W,H=WORLD_H;
  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);
}
// scatter shells + starfish + dune tufts on the open sand (no colliders)
function _beachScatter(taken){
  const W=WORLD_W,H=WORLD_H;
  for(let i=0;i<26;i++){
    let x,y;
    for(let a=0;a<20;a++){ x=rand(40,W-40); y=rand(40,H-40); if(!isWater(x,y,6)) break; }
    if(isWater(x,y,6)) continue;
    worldObjects.push({kind:'seashell',x,y,seed:Math.floor(rnd()*9999)});
  }
  for(let i=0;i<22;i++){
    let x,y;
    for(let a=0;a<20;a++){ x=rand(40,W-40); y=rand(40,H-40); if(!isWater(x,y,10)) break; }
    if(isWater(x,y,10)) continue;
    worldObjects.push({kind:'tallgrass',x,y,blades:Math.floor(rand(4,8)),seed:rnd()*100});
  }
}

// ---------------- 4·1 Tide Pools ----------------
function buildTidePools(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _coveBorder();
  const taken=[];

  // The broad tidal channel down the middle — deep water at high tide, wet sand at low.
  worldObjects.push({kind:'tidepool', x:W*0.5, y:H*0.52, w:W*0.34, h:H*0.30, seed:rnd()*100});
  // Scattered rock-pool ponds across the flats (also tidal, so they wink open and shut).
  const pools=[[0.20,0.28,150,110],[0.80,0.30,170,120],[0.24,0.80,150,110],[0.78,0.78,160,120],[0.5,0.16,150,96]];
  pools.forEach(pp=>{ worldObjects.push({kind:'tidepool',x:W*pp[0],y:H*pp[1],w:pp[2],h:pp[3],seed:rnd()*100}); taken.push({x:W*pp[0],y:H*pp[1]}); });

  // Palms + driftwood + rocks around the shore (solid).
  for(let i=0;i<10;i++){ let x,y; for(let a=0;a<30;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,50)&&taken.every(t=>Math.hypot(t.x-x,t.y-y)>120)) break; }
    if(isWater(x,y,50)) continue; taken.push({x,y}); worldObjects.push({kind:'palm',x,y,seed:rnd()*100}); addCollider(x-4,y+16,8,8); }
  for(let i=0;i<6;i++){ let x,y; for(let a=0;a<30;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,40)) break; }
    if(isWater(x,y,40)) continue; worldObjects.push({kind:'driftwood',x,y,seed:rnd()*100}); addCollider(x-14,y-2,28,9); }
  for(let i=0;i<12;i++){ let x,y; for(let a=0;a<24;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,24)) break; }
    if(isWater(x,y,24)) continue; const big=rnd()<0.3; worldObjects.push({kind:'rock',x,y,big}); if(big) addCollider(x-12,y+2,24,12); }

  _beachScatter(taken);
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 4·2 Palm Boardwalk ----------------
function buildBoardwalk(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _coveBorder();
  const taken=[];

  // A long plank boardwalk spine down the middle (purely visual deck — the whole level is
  // walkable sand), with a couple of small shallow tide pools flanking it for flavour.
  worldObjects.push({kind:'boardwalk',x:W*0.5,y:H*0.5,w:44,len:H*0.78,horizontal:false,seed:7});
  worldObjects.push({kind:'boardwalk',x:W*0.5,y:H*0.5,w:44,len:W*0.6,horizontal:true,seed:8});
  const pools=[[0.18,0.26,150,100],[0.82,0.28,150,100],[0.2,0.78,150,100],[0.8,0.76,150,100]];
  pools.forEach(pp=>{ worldObjects.push({kind:'tidepool',x:W*pp[0],y:H*pp[1],w:pp[2],h:pp[3],seed:rnd()*100}); taken.push({x:W*pp[0],y:H*pp[1]}); });

  // Palms + bunting-y decoration + driftwood along the stalls.
  for(let i=0;i<12;i++){ let x,y; for(let a=0;a<30;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,40)&&taken.every(t=>Math.hypot(t.x-x,t.y-y)>110)) break; }
    if(isWater(x,y,40)) continue; taken.push({x,y}); worldObjects.push({kind:'palm',x,y,seed:rnd()*100}); addCollider(x-4,y+16,8,8); }
  for(let i=0;i<7;i++){ let x,y; for(let a=0;a<24;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,30)) break; }
    if(isWater(x,y,30)) continue; worldObjects.push({kind:'driftwood',x,y,seed:rnd()*100}); addCollider(x-14,y-2,28,9); }

  _beachScatter(taken);
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 4·3 Coral Sands (dive lagoon) ----------------
function buildCoralSands(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _coveBorder();
  const taken=[];

  // Deep-water dive basins (pearls live on their seabeds), ringed by tidal sandbars.
  const deeps=[[0.30,0.40,W*0.26,H*0.26],[0.72,0.60,W*0.26,H*0.24],[0.5,0.5,W*0.18,H*0.16]];
  deeps.forEach(d=>{ worldObjects.push({kind:'deepwater',x:W*d[0],y:H*d[1],w:d[2],h:d[3],seed:rnd()*100}); taken.push({x:W*d[0],y:H*d[1]}); });
  const bars=[[0.5,0.2,240,120],[0.18,0.72,200,120],[0.84,0.28,200,120]];
  bars.forEach(b=>{ worldObjects.push({kind:'tidepool',x:W*b[0],y:H*b[1],w:b[2],h:b[3],seed:rnd()*100}); });

  // Coral clumps (decorative) dotted at the water edges, palms on the shore.
  for(let i=0;i<14;i++){ let x,y; for(let a=0;a<24;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,10)) break; }
    if(isWater(x,y,10)) continue; worldObjects.push({kind:'coral',x,y,seed:Math.floor(rnd()*9999)}); }
  for(let i=0;i<9;i++){ let x,y; for(let a=0;a<30;a++){ x=rand(60,W-60); y=rand(60,H-60); if(!isWater(x,y,40)&&taken.every(t=>Math.hypot(t.x-x,t.y-y)>130)) break; }
    if(isWater(x,y,40)) continue; taken.push({x,y}); worldObjects.push({kind:'palm',x,y,seed:rnd()*100}); addCollider(x-4,y+16,8,8); }

  _beachScatter(taken);
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

TERRAIN.tidepools  = buildTidePools;
TERRAIN.boardwalk  = buildBoardwalk;
TERRAIN.coralsands = buildCoralSands;

// ============================ COVE VISUALS ============================
// (drawn from world-draw.js's drawWorld switch — these are plain global draw fns like the
// rest of world-draw.js, using px()/ctx from the shared modules.)

// Elliptical water fill helper: soft body + rim highlight.
function _waterEllipse(x,y,w,h,fill,rim){
  ctx.save();
  ctx.fillStyle=fill; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.5; ctx.strokeStyle=rim; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(x,y,w/2-1,h/2-1,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

// Tidal pool: aqua water when the tide is IN; drained wet-sand basin when it's OUT.
function drawTidePool(x,y,w,h,seed,t){
  const covered=(typeof Tide==='undefined') || Tide.covered();
  if(covered){
    _waterEllipse(x,y,w,h,'#57C4DA','#A6E6F0');
    // gentle surface shimmer
    ctx.save(); ctx.globalAlpha=0.35; ctx.strokeStyle='#DFF6FA'; ctx.lineWidth=1.5;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.ellipse(x, y+i*h*0.16, w*0.30, h*0.10, 0, 0, Math.PI); ctx.stroke(); }
    ctx.restore();
  } else {
    // drained: a darker damp-sand hollow with a shallow leftover puddle + ripple lines
    ctx.save();
    ctx.fillStyle='#D8BE86'; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#C6A96E'; ctx.beginPath(); ctx.ellipse(x,y,w/2*0.7,h/2*0.7,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.6; ctx.fillStyle='#7FC7D2'; ctx.beginPath(); ctx.ellipse(x,y+h*0.06,w*0.16,h*0.09,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.4; ctx.strokeStyle='#B79A5E'; ctx.lineWidth=1;
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.ellipse(x,y,w/2*(0.4+i*0.2),h/2*(0.4+i*0.2),0,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  }
}

// Deep dive basin: a rich teal pool, darker at the centre, with drifting light dapples.
function drawDeepWater(x,y,w,h,seed,t){
  const g=ctx.createRadialGradient(x,y,4,x,y,Math.max(w,h)/2);
  g.addColorStop(0,'#0E5E7A'); g.addColorStop(0.6,'#1C7E9C'); g.addColorStop(1,'#3AA6C0');
  ctx.save();
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.5; ctx.strokeStyle='#BEEAF2'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(x,y,w/2-1,h/2-1,0,0,Math.PI*2); ctx.stroke();
  // caustic dapples
  ctx.globalAlpha=0.22; ctx.fillStyle='#DFF6FA';
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+t/1600; const rx=x+Math.cos(a)*w*0.22, ry=y+Math.sin(a*1.3)*h*0.22;
    ctx.beginPath(); ctx.ellipse(rx,ry,6,3,a,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

function drawPalm(x,y,seed,t){
  const sway=Math.sin(t/900+(seed||0))*3;
  ctx.save();
  // shadow
  ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+18,14,5,0,0,Math.PI*2); ctx.fillStyle='#2A2A1A'; ctx.fill(); ctx.globalAlpha=1;
  // curved trunk
  ctx.strokeStyle='#9C7A4A'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,y+18); ctx.quadraticCurveTo(x+sway*0.6,y-6,x+sway,y-24); ctx.stroke();
  ctx.strokeStyle='#B79461'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(x,y+16); ctx.quadraticCurveTo(x+sway*0.6,y-6,x+sway,y-24); ctx.stroke();
  // fronds
  const cx=x+sway, cy=y-26;
  const fronds=[[-1,-0.3],[1,-0.3],[-0.7,-0.9],[0.7,-0.9],[-1.1,0.2],[1.1,0.2]];
  ctx.strokeStyle='#2F9E5C'; ctx.lineWidth=4; ctx.lineCap='round';
  fronds.forEach(f=>{ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx+f[0]*10,cy+f[1]*10-4,cx+f[0]*20,cy+f[1]*14+4); ctx.stroke(); });
  ctx.strokeStyle='#43BE72'; ctx.lineWidth=1.5;
  fronds.forEach(f=>{ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.quadraticCurveTo(cx+f[0]*10,cy+f[1]*10-4,cx+f[0]*20,cy+f[1]*14+4); ctx.stroke(); });
  // coconuts
  px(cx-3,cy+1,3,3,'#6E4A2A'); px(cx+1,cy+1,3,3,'#6E4A2A');
  ctx.restore();
}

function drawDriftwood(x,y,seed){
  ctx.save();
  ctx.globalAlpha=0.18; ctx.beginPath(); ctx.ellipse(x,y+5,16,4,0,0,Math.PI*2); ctx.fillStyle='#2A2A1A'; ctx.fill(); ctx.globalAlpha=1;
  px(x-15,y-4,30,8,'#C9B79A'); px(x-15,y-4,30,2,'#DCCDB4'); px(x-15,y+2,30,2,'#A8926E');
  // knots
  px(x-6,y-2,3,3,'#8A7454'); px(x+6,y-1,3,3,'#8A7454');
  ctx.restore();
}

function drawCoral(x,y,seed){
  const rng=mulberry32(seed||1);
  const hues=['#F08CA6','#F0A85A','#B98CF0','#6EC8C0'];
  ctx.save();
  ctx.globalAlpha=0.16; ctx.beginPath(); ctx.ellipse(x,y+5,10,3,0,0,Math.PI*2); ctx.fillStyle='#2A2A1A'; ctx.fill(); ctx.globalAlpha=1;
  const branches=3+Math.floor(rng()*3);
  for(let i=0;i<branches;i++){
    const col=hues[Math.floor(rng()*hues.length)];
    const bx=x+(rng()*2-1)*6, h=6+rng()*8;
    ctx.strokeStyle=col; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(bx,y+4); ctx.quadraticCurveTo(bx+(rng()*2-1)*4,y-h*0.6,bx+(rng()*2-1)*5,y-h); ctx.stroke();
  }
  ctx.restore();
}

function drawSeashell(x,y,seed){
  const rng=mulberry32(seed||1); const r=rng();
  ctx.save();
  if(r<0.4){ // starfish
    ctx.fillStyle='#F0925A';
    ctx.beginPath();
    for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5; const ox=x+Math.cos(a)*5, oy=y+Math.sin(a)*5;
      const a2=a+Math.PI/5; const ix=x+Math.cos(a2)*2, iy=y+Math.sin(a2)*2;
      if(i===0) ctx.moveTo(ox,oy); else ctx.lineTo(ox,oy); ctx.lineTo(ix,iy); }
    ctx.closePath(); ctx.fill();
    px(x-1,y-1,2,2,'#F6B98A');
  } else if(r<0.7){ // scallop shell
    ctx.fillStyle='#F3D9B0'; ctx.beginPath(); ctx.arc(x,y+2,5,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#D9B584'; ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(x+i*2.2,y-3); ctx.stroke(); }
  } else { // little spiral shell
    ctx.fillStyle='#EBC7D6'; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#C98BA6'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x,y,2.4,0,Math.PI*1.6); ctx.stroke();
  }
  ctx.restore();
}

// Plank boardwalk deck (visual only — the sand under it is walkable). Drawn as a run of
// weathered planks with a shaded edge, oriented along its length.
function drawBoardwalk(o){
  const horiz=o.horizontal, len=o.len||200, w=o.w||44;
  ctx.save();
  const x0 = horiz ? o.x-len/2 : o.x-w/2;
  const y0 = horiz ? o.y-w/2 : o.y-len/2;
  const W = horiz ? len : w, Hh = horiz ? w : len;
  ctx.fillStyle='#C8A268'; ctx.fillRect(x0,y0,W,Hh);
  ctx.fillStyle='#B78E52'; ctx.fillRect(x0,y0,W,2); ctx.fillRect(x0,y0+Hh-2,W,2);
  ctx.strokeStyle='#9C7742'; ctx.lineWidth=1;
  const step=14;
  if(horiz){ for(let x=x0;x<x0+W;x+=step){ ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y0+Hh); ctx.stroke(); } }
  else     { for(let y=y0;y<y0+Hh;y+=step){ ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+W,y); ctx.stroke(); } }
  ctx.restore();
}
