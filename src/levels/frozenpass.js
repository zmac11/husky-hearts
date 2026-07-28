// ====================== TERRAIN: FROZEN PASS ======================
// The snowy pass climbing out of the Rocky Mountains valley (Rocky Mountains 2). A colder,
// tighter route than the open valley — a run of skyline peaks, evergreens, boulders and
// snowdrifts threaded by a couple of stone paths (the "pass"), with clearer lanes to move
// through. No water here; it's all snow and stone.
//
// Like buildRockyWorld it's a named TERRAIN hook that levels/from-config.js calls by name.
// It draws only existing world-draw kinds (snowypine/boulder/rockcluster/deadtree/rock/
// snowpatch/crystal/mountain/stonepath), so it needs no new rendering code.

function buildFrozenPass(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H;
  river=null;

  // border
  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];
  const pt=(ax,ay,bx,by,minD)=>rand2(ax,ay,bx,by,minD,taken);

  // ---- skyline peaks (drawn behind everything; solid across the base) ----
  const M=5;
  for(let i=0;i<M;i++){
    const mx=W*(0.08+(i/(M-1))*0.84)+rand(-20,20);
    const baseY=rand(196,214), mh=rand(150,186), mw=rand(340,470);
    worldObjects.push({kind:'mountain',x:mx,y:baseY,w:mw,h:mh,seed:Math.floor(rnd()*9999)});
    addCollider(mx-mw*0.4, baseY-4, mw*0.8, 16);
  }

  // ---- the pass: stone paths threading down/across the map ----
  worldObjects.push({kind:'stonepath',x1:W*0.5, y1:H*0.12, x2:W*0.5,  y2:H*0.9,  seed:71});
  worldObjects.push({kind:'stonepath',x1:W*0.2, y1:H*0.36, x2:W*0.8,  y2:H*0.56, seed:72});
  worldObjects.push({kind:'stonepath',x1:W*0.5, y1:H*0.5,  x2:W*0.16, y2:H*0.78, seed:73});

  // ---- evergreens (snow-dusted spruce) ----
  for(let i=0;i<26;i++){
    const p=pt(50,236,W-50,H-50,82); taken.push(p);
    worldObjects.push({kind:'snowypine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+14,8,9);
  }

  // ---- boulders (big ones block) ----
  for(let i=0;i<16;i++){
    const p=pt(60,236,W-60,H-60,112); taken.push(p);
    const big=rnd()<0.55;
    worldObjects.push({kind:'boulder',x:p.x,y:p.y,big});
    addCollider(p.x-(big?16:11), p.y+(big?1:0), big?32:22, big?14:11);
  }

  // ---- rock clusters ----
  for(let i=0;i<7;i++){
    const p=pt(80,236,W-80,H-80,120); taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:rnd()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // ---- weathered deadfall ----
  for(let i=0;i<6;i++){
    const p=pt(60,236,W-60,H-60,110); taken.push(p);
    worldObjects.push({kind:'deadtree',x:p.x,y:p.y});
    addCollider(p.x-6,p.y+18,12,11);
  }

  // ---- loose rocks (big ones block) ----
  for(let i=0;i<16;i++){
    const p=pt(60,236,W-60,H-60,60); taken.push(p);
    const big=rnd()<0.2;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // ---- snowdrifts + ice crystals (no colliders — pure decoration) ----
  for(let i=0;i<30;i++) worldObjects.push({kind:'snowpatch',x:rand(30,W-30),y:rand(228,H-30),seed:rnd()*100});
  for(let i=0;i<8;i++){ const p=pt(70,236,W-70,H-70,90); worldObjects.push({kind:'crystal',x:p.x,y:p.y,seed:rnd()*100}); }

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.frozenpass = buildFrozenPass;
