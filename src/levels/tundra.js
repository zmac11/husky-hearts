// ====================== TERRAIN: FROSTFANG TUNDRA (Biome 7) ======================
// The endgame's proving ground: the Icy Flats (warmth/fire economy + slippery ice), the
// Aurora Fields (elite hunt under the northern lights), and the interior Glacier Cave
// (dark + thin ice). Reuses the Rocky Mountains snow kinds (snowypine/boulder/mountain/
// crystal/snowpatch/campfire) and adds icepatch/aurora/cabin visuals. All levels run `cold`
// (warmth.js); firepits are the safe havens (relight them for the `kindle` route).

function _tundraBorder(){ const W=WORLD_W,H=WORLD_H; addCollider(0,0,W,14); addCollider(0,H-14,W,14); addCollider(0,0,14,H); addCollider(W-14,0,14,H); }

// ---------------- 7·1 Icy Flats ----------------
function buildIcyFlats(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _tundraBorder();
  const taken=[];
  // skyline peaks
  for(let i=0;i<5;i++){ const mx=W*(0.1+(i/4)*0.8)+rand(-20,20), baseY=rand(196,214), mh=rand(150,186), mw=rand(340,470);
    worldObjects.push({kind:'mountain',x:mx,y:baseY,w:mw,h:mh,seed:Math.floor(rnd()*9999)}); addCollider(mx-mw*0.4,baseY-4,mw*0.8,16); }
  // slippery ice sheets (the movement gimmick)
  const ice=[[0.30,0.42,260,150],[0.70,0.56,300,170],[0.5,0.8,240,130],[0.18,0.7,180,110]];
  ice.forEach(p=>{ worldObjects.push({kind:'icepatch',x:W*p[0],y:H*p[1],w:p[2],h:p[3],seed:Math.floor(rnd()*9999)}); taken.push({x:W*p[0],y:H*p[1]}); });
  // snow-dusted evergreens + boulders
  for(let i=0;i<20;i++){ let x,y; for(let a=0;a<20;a++){ x=rand(50,W-50); y=rand(230,H-50); if(taken.every(t=>Math.hypot(t.x-x,t.y-y)>110)) break; } taken.push({x,y}); worldObjects.push({kind:'snowypine',x,y}); addCollider(x-4,y+14,8,9); }
  for(let i=0;i<12;i++){ const x=rand(60,W-60), y=rand(230,H-60); const big=rnd()<0.5; worldObjects.push({kind:'boulder',x,y,big}); addCollider(x-(big?16:11),y+(big?1:0),big?32:22,big?14:11); }
  // snow + ice crystals decor
  for(let i=0;i<40;i++) worldObjects.push({kind:'snowpatch',x:rand(30,W-30),y:rand(228,H-30),seed:rnd()*100});
  for(let i=0;i<8;i++){ const x=rand(60,W-60), y=rand(230,H-60); worldObjects.push({kind:'crystal',x,y,seed:rnd()*100}); }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 7·2 Aurora Fields ----------------
function buildAuroraFields(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _tundraBorder();
  // aurora ribbons across the sky (drawn behind — low y)
  for(let i=0;i<4;i++){ worldObjects.push({kind:'aurora',x:W*(0.2+i*0.22),y:40+i*14,w:W*0.5,seed:Math.floor(rnd()*9999)}); }
  // a lone hermit cabin (haven + best crafting)
  worldObjects.push({kind:'cabin',x:W*0.5,y:H*0.5,seed:1}); addCollider(W*0.5-30,H*0.5-2,60,28);
  worldObjects.push({kind:'campfire',x:W*0.5,y:H*0.62});
  const taken=[{x:W*0.5,y:H*0.5}];
  // glassy snow field + a few ice sheets
  const ice=[[0.24,0.3,220,130],[0.78,0.7,240,140]];
  ice.forEach(p=>{ worldObjects.push({kind:'icepatch',x:W*p[0],y:H*p[1],w:p[2],h:p[3],seed:Math.floor(rnd()*9999)}); });
  for(let i=0;i<16;i++){ let x,y; for(let a=0;a<16;a++){ x=rand(50,W-50); y=rand(120,H-50); if(taken.every(t=>Math.hypot(t.x-x,t.y-y)>130)) break; } worldObjects.push({kind:'snowypine',x,y}); addCollider(x-4,y+14,8,9); }
  for(let i=0;i<44;i++) worldObjects.push({kind:'snowpatch',x:rand(30,W-30),y:rand(110,H-30),seed:rnd()*100});
  for(let i=0;i<10;i++){ const x=rand(60,W-60), y=rand(120,H-60); worldObjects.push({kind:'crystal',x,y,seed:rnd()*100}); }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

// ---------------- 7·3 Glacier Cave ----------------
function buildGlacierCave(){
  worldObjects.length=0; colliders.length=0; river=null;
  const W=WORLD_W,H=WORLD_H; _tundraBorder();
  // cave walls of ice/rock forming a winding ascent (reuse rockcluster/boulder as walls)
  function wall(x,y){ worldObjects.push({kind:'boulder',x,y,big:true}); addCollider(x-16,y,32,14); }
  // rough serpentine wall runs
  for(let y=H*0.16; y<H*0.55; y+=44) wall(W*0.34, y);
  for(let y=H*0.45; y<H*0.86; y+=44) wall(W*0.66, y);
  for(let x=W*0.34; x<W*0.66; x+=44) wall(x, H*0.55);
  // glowing ice crystals + lanterns pool light in the dark
  for(let i=0;i<12;i++){ const x=rand(60,W-60), y=rand(60,H-60); worldObjects.push({kind:'crystal',x,y,seed:rnd()*100}); }
  for(let i=0;i<26;i++) worldObjects.push({kind:'snowpatch',x:rand(30,W-30),y:rand(40,H-30),seed:rnd()*100});
  for(let i=0;i<10;i++){ const x=rand(60,W-60), y=rand(60,H-60); worldObjects.push({kind:'icepatch',x,y,w:rand(120,200),h:rand(80,120),seed:Math.floor(rnd()*9999)}); }
  worldObjects.sort((a,b)=>(a.y||0)-(b.y||0));
}

TERRAIN.icyflats     = buildIcyFlats;
TERRAIN.aurorafields = buildAuroraFields;
TERRAIN.glaciercave  = buildGlacierCave;

// ============================ TUNDRA VISUALS ============================
function drawIcePatch(x,y,w,h,seed,t){
  const rng=mulberry32(seed||1);
  ctx.save();
  // glassy pale-blue sheet with a bright sheen
  ctx.fillStyle='#CFE6F2'; ctx.beginPath(); ctx.ellipse(x,y,w/2,h/2,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.55; ctx.fillStyle='#E6F4FB'; ctx.beginPath(); ctx.ellipse(x-w*0.12,y-h*0.14,w/2*0.6,h/2*0.5,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.4; ctx.strokeStyle='#AFD0E0'; ctx.lineWidth=1;
  for(let i=0;i<4;i++){ const a=rng()*Math.PI*2; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*w*0.1,y+Math.sin(a)*h*0.1); ctx.lineTo(x+Math.cos(a)*w*0.42,y+Math.sin(a)*h*0.42); ctx.stroke(); }
  // moving glint
  ctx.globalAlpha=0.5; ctx.fillStyle='#FFFFFF'; const gx=x-w*0.3+((t/40)%(w*0.6)); px(gx,y-2,3,2,'#FFFFFF');
  ctx.restore();
}

function drawAurora(x,y,w,seed,t){
  const rng=mulberry32(seed||1);
  ctx.save();
  const cols=['#6FE0B0','#8FD0F0','#C9A6FF'];
  for(let b=0;b<3;b++){
    ctx.globalAlpha=0.10+0.05*Math.sin(t/1400+b);
    ctx.strokeStyle=cols[b%cols.length]; ctx.lineWidth=10-b*2;
    ctx.beginPath();
    for(let i=0;i<=20;i++){ const px2=x-w/2+w*(i/20); const py=y+b*10+Math.sin(i/2+t/900+b+rng()*0.4)*10; if(i===0) ctx.moveTo(px2,py); else ctx.lineTo(px2,py); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCabin(x,y,seed,t){
  ctx.save();
  ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+22,34,8,0,0,Math.PI*2); ctx.fillStyle='#1A2430'; ctx.fill(); ctx.globalAlpha=1;
  // log walls
  px(x-30,y-2,60,24,'#6E4E32'); for(let i=0;i<4;i++) px(x-30,y-2+i*6,60,1,'#5A3E26');
  // snowy pitched roof
  ctx.fillStyle='#E8F2F8'; ctx.beginPath(); ctx.moveTo(x-36,y-2); ctx.lineTo(x,y-24); ctx.lineTo(x+36,y-2); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#CFE0EC'; ctx.beginPath(); ctx.moveTo(x,y-24); ctx.lineTo(x+36,y-2); ctx.lineTo(x+16,y-2); ctx.closePath(); ctx.fill();
  // door + lit window
  px(x-6,y+6,12,16,'#4A3020'); px(x+10,y+2,10,10,'#FFD87A');
  // chimney + smoke
  px(x+18,y-20,6,10,'#5A4636');
  ctx.globalAlpha=0.4; ctx.fillStyle='#CFD8DE'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(x+21+Math.sin(t/300+i)*3, y-24-i*7, 3+i, 0, Math.PI*2); ctx.fill(); }
  ctx.restore();
}
