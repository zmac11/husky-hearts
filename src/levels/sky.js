// ====================== TERRAIN: CLOUD KINGDOM (Biome 8) ======================
// The finale's three sky terrains — Sky Steps (an ascent of cloud platforms), Floating Isles
// (a hub archipelago), and Storm Peak (a linear storm climb) — plus the sky visuals. The
// walkable bits are `cloudplatform` islands (sky.js Sky.supported); the sky-coloured ground
// between them is the VOID you soft-reset off of. `sky:true` drives the gliding.

function _skyBorder(){ const W=WORLD_W,H=WORLD_H; addCollider(0,0,W,14); addCollider(0,H-14,W,14); addCollider(0,0,14,H); addCollider(W-14,0,14,H); }
function _cloud(x,y,w,h){ worldObjects.push({kind:'cloudplatform',x,y,w,h,seed:Math.floor(rnd()*9999)}); }

// ---------------- 8·1 Sky Steps ----------------
// Large OVERLAPPING cloud platforms form one continuous, walkable ascent (a gentle S from the
// base to the summit) — you can always climb it on foot; the updrafts are optional shortcuts
// and the void at the map's edges is where a wrong step soft-resets you.
function buildSkySteps(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _skyBorder();
  for(let i=0;i<4;i++) worldObjects.push({kind:'sunbeam',x:W*(0.2+i*0.22),y:30,w:120,seed:Math.floor(rnd()*9999)});
  const steps=[[0.5,0.87,620,420],[0.44,0.69,580,420],[0.56,0.51,580,420],[0.44,0.33,580,420],[0.5,0.14,640,380]];
  steps.forEach(s=>_cloud(W*s[0],H*s[1],s[2],s[3]));
  for(let i=0;i<8;i++) worldObjects.push({kind:'wispcloud',x:rand(60,W-60),y:rand(60,H-60),seed:Math.floor(rnd()*9999)});
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 8·2 Floating Isles ----------------
function buildFloatingIsles(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _skyBorder();
  for(let i=0;i<4;i++) worldObjects.push({kind:'sunbeam',x:W*(0.15+i*0.24),y:30,w:130,seed:Math.floor(rnd()*9999)});
  // A big central hub cloud with four overlapping lobes — one continuous walkable archipelago
  // so every cameo NPC and friend is reachable on foot (a victory-lap hub, not a gauntlet).
  _cloud(W*0.5,H*0.5,780,460);
  const lobes=[[0.24,0.32,480,300],[0.76,0.32,480,300],[0.24,0.68,480,300],[0.76,0.68,480,300]];
  lobes.forEach(s=>_cloud(W*s[0],H*s[1],s[2],s[3]));
  // a couple of floating stone isles for flavour + some wisp clouds
  worldObjects.push({kind:'skyisle',x:W*0.32,y:H*0.5,seed:1});
  worldObjects.push({kind:'skyisle',x:W*0.68,y:H*0.5,seed:2});
  for(let i=0;i<8;i++) worldObjects.push({kind:'wispcloud',x:rand(60,W-60),y:rand(60,H-60),seed:Math.floor(rnd()*9999)});
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 8·3 Storm Peak ----------------
function buildStormPeak(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _skyBorder();
  // a narrow but CONTINUOUS storm-lashed climb (overlapping platforms up the middle)
  const steps=[[0.5,0.9,440,460],[0.46,0.73,400,460],[0.54,0.56,400,460],
               [0.46,0.39,400,460],[0.5,0.22,420,460],[0.5,0.08,420,320]];
  steps.forEach(s=>_cloud(W*s[0],H*s[1],s[2],s[3]));
  // dark storm clouds looming (ambient)
  for(let i=0;i<10;i++) worldObjects.push({kind:'stormcloud',x:rand(60,W-60),y:rand(40,H-60),seed:Math.floor(rnd()*9999)});
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

TERRAIN.skysteps      = buildSkySteps;
TERRAIN.floatingisles = buildFloatingIsles;
TERRAIN.stormpeak     = buildStormPeak;

// ============================ SKY VISUALS ============================
function drawCloudPlatform(x,y,w,h,seed,t){
  const rng=mulberry32(seed||1);
  const bob=Math.sin(t/700+(seed||0))*2;
  ctx.save(); ctx.translate(0,bob);
  // soft under-shadow
  ctx.globalAlpha=0.16; ctx.fillStyle='#8A90B0'; ctx.beginPath(); ctx.ellipse(x,y+h*0.34,w/2*0.9,h/2*0.5,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  // fluffy body — a cluster of puffs
  ctx.fillStyle='#F4F7FC';
  ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
  const puffs=5;
  for(let i=0;i<puffs;i++){ const px2=x-w*0.4+ (w*0.8)*(i/(puffs-1)); const py=y-h*0.18 - rng()*h*0.12; const pr=h*0.32+rng()*h*0.18;
    ctx.beginPath(); ctx.ellipse(px2,py,pr,pr*0.8,0,0,Math.PI*2); ctx.fill(); }
  // flat-ish shaded top you stand on
  ctx.fillStyle='#E4EAF6'; ctx.beginPath(); ctx.ellipse(x,y+h*0.06,w/2*0.86,h/2*0.5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FBFDFF'; ctx.beginPath(); ctx.ellipse(x-w*0.1,y-h*0.06,w/2*0.5,h/2*0.32,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawWispCloud(x,y,seed,t){
  const rng=mulberry32(seed||1); const drift=Math.sin(t/900+(seed||0))*4;
  ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#EAF0FA';
  for(let i=0;i<3;i++){ const px2=x+drift+i*10-10; ctx.beginPath(); ctx.ellipse(px2,y,10+rng()*6,6,0,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

function drawSunbeam(x,y,w,seed){
  ctx.save(); ctx.globalAlpha=0.10;
  const g=ctx.createLinearGradient(x,y,x,y+WORLD_H); g.addColorStop(0,'#FFF3B0'); g.addColorStop(1,'rgba(255,243,176,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x-w*0.3,y); ctx.lineTo(x+w*0.3,y); ctx.lineTo(x+w*0.7,WORLD_H); ctx.lineTo(x-w*0.7,WORLD_H); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawSkyIsle(x,y,seed,t){
  const bob=Math.sin(t/650+(seed||0))*2;
  ctx.save(); ctx.translate(0,bob);
  // floating rock chunk
  ctx.fillStyle='#8A7A6A'; ctx.beginPath(); ctx.moveTo(x-26,y-4); ctx.lineTo(x-16,y+16); ctx.lineTo(x+16,y+16); ctx.lineTo(x+26,y-4); ctx.closePath(); ctx.fill();
  // dangling point
  ctx.beginPath(); ctx.moveTo(x-8,y+16); ctx.lineTo(x,y+30); ctx.lineTo(x+8,y+16); ctx.closePath(); ctx.fill();
  // grassy top
  ctx.fillStyle='#8FD07A'; ctx.beginPath(); ctx.ellipse(x,y-4,26,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#A2DE8C'; ctx.beginPath(); ctx.ellipse(x-6,y-6,14,5,0,0,Math.PI*2); ctx.fill();
  // roots + a tuft
  ctx.strokeStyle='#6E5E4E'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x-4,y+16); ctx.lineTo(x-2,y+24); ctx.moveTo(x+4,y+16); ctx.lineTo(x+3,y+22); ctx.stroke();
  ctx.restore();
}

function drawStormCloud(x,y,seed,t){
  const rng=mulberry32(seed||1); const drift=Math.sin(t/1100+(seed||0))*3;
  ctx.save(); ctx.globalAlpha=0.7; ctx.fillStyle='#6E7290';
  for(let i=0;i<4;i++){ const px2=x+drift+i*12-18; ctx.beginPath(); ctx.ellipse(px2,y,14+rng()*8,9,0,0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle='#585C78'; ctx.beginPath(); ctx.ellipse(x+drift,y+5,26,8,0,0,Math.PI*2); ctx.fill();
  // occasional inner flicker
  if(rng()<0.5){ ctx.globalAlpha=0.3+0.3*Math.sin(t/120+seed); ctx.fillStyle='#E6DFFA'; px(x+drift-2,y,3,6,'#E6DFFA'); }
  ctx.restore();
}
