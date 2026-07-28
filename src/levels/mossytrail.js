// ====================== TERRAIN: MOSSY TRAIL ======================
// The way into the Whispering Woods (Whispering Woods 1): a dense, hushed forest where the
// canopy swallows the light (the level is flagged `dark`, so darkness.js dims all but your
// pool of light). A winding stone trail threads through crowded oaks, pines and willows, with
// mushrooms and toadstool rings tucked in the gloom. Lantern posts (spawned from the level
// config) light the trail; treasure and lurkers hide off it in the dark.
//
// Reuses the meadow forest kinds (oak/pine/willow/mushroom/log/stump/bush/tallgrass/stonepath),
// so no new rendering — the mood comes from the dark theme + the darkness overlay.

function buildMossyTrail(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H; river=null;

  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];
  const pt=(minD)=>rand2(40,40,W-40,H-40,minD,taken);

  // ---- the winding trail (lantern posts get placed along it in the config) ----
  worldObjects.push({kind:'stonepath',x1:W*0.10,y1:H*0.5, x2:W*0.90,y2:H*0.5, seed:11});
  worldObjects.push({kind:'stonepath',x1:W*0.5, y1:H*0.12,x2:W*0.5, y2:H*0.88,seed:22});
  worldObjects.push({kind:'stonepath',x1:W*0.5, y1:H*0.5, x2:W*0.82,y2:H*0.8, seed:33});

  // ---- dense oaks (the crowded canopy) ----
  for(let i=0;i<32;i++){ const p=pt(88); taken.push(p); worldObjects.push({kind:'oak',x:p.x,y:p.y,variant:Math.floor(rnd()*3)}); addCollider(p.x-7,p.y+19,14,13); }
  // ---- pines ----
  for(let i=0;i<16;i++){ const p=pt(74); taken.push(p); worldObjects.push({kind:'pine',x:p.x,y:p.y}); addCollider(p.x-4,p.y+15,8,10); }
  // ---- willows (drooping, eerie) ----
  for(let i=0;i<8;i++){ const p=pt(100); taken.push(p); worldObjects.push({kind:'willow',x:p.x,y:p.y}); addCollider(p.x-8,p.y+19,16,15); }

  // ---- forest floor: mushrooms + fairy rings, logs, stumps, bushes, moss tufts ----
  for(let i=0;i<22;i++){ const p=pt(34); worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:rnd()<0.35}); }
  for(let i=0;i<6;i++){ const p=pt(90); taken.push(p); worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:rnd()*100}); }
  for(let i=0;i<6;i++){ const p=pt(90); taken.push(p); worldObjects.push({kind:'log',x:p.x,y:p.y,seed:rnd()*100}); addCollider(p.x-16,p.y-1,32,9); }
  for(let i=0;i<5;i++){ const p=pt(80); taken.push(p); worldObjects.push({kind:'stump',x:p.x,y:p.y,seed:rnd()*100}); addCollider(p.x-8,p.y-1,16,10); }
  for(let i=0;i<18;i++){ const p=pt(64); taken.push(p); worldObjects.push({kind:'bush',x:p.x,y:p.y,variant:Math.floor(rnd()*2)}); addCollider(p.x-12,p.y+3,24,13); }
  for(let i=0;i<26;i++){ const p=pt(40); worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:rnd()*100}); }

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.mossytrail = buildMossyTrail;
