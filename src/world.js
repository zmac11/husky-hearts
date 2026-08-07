// ====================== WORLD ======================
// World dimensions are `let` so a level can resize the world on load (LevelManager);
// the viewport is fixed. All references read these dynamically.
let WORLD_W=1920, WORLD_H=1280;
const VIEW_W=640, VIEW_H=416;
const cam={x:0,y:0};
function updateCamera(){
  // Follow the dog (a fainted dog keeps the framing on its death frame).
  cam.x=Math.max(0,Math.min(WORLD_W-VIEW_W,p1.x-VIEW_W/2));
  cam.y=Math.max(0,Math.min(WORLD_H-VIEW_H,p1.y-VIEW_H/2));
}

// Scene flow now lives in Game.state (see core/state.js); cheeredCount remains the
// canonical global that Game delegates to.
let cheeredCount=0;
const CHEER_TOTAL=5;

// Raw key state (`keys`) and listeners moved to core/input.js.

// ---------- HELPERS ----------
// `rnd()` is the game's random source: inside a level-generation window (RNG.beginGen,
// see core/rng.js + core/run.js) it draws from the run's seeded stream, everywhere else
// it's plain Math.random(). LEVEL GENERATORS MUST USE rnd()/rand(), NEVER Math.random() —
// revisiting a level regenerates its terrain from the seed (level-state.js), so anything
// unseeded would move under the entities restored on top of it.
function rnd(){ return RNG.rnd(); }
function rand(a,b){ return a+rnd()*(b-a); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

// ---------- COLLIDERS ----------
// Each entry: {x,y,w,h}  — axis-aligned bounding box in world space
const colliders=[];

function addCollider(x,y,w,h){ colliders.push({x,y,w,h}); }

function resolveCollisions(p){
  const PR=10, PT=16; // player collision half-width, and top offset from center
  const pl=p.x-PR, pr=p.x+PR, pt=p.y-PT, pb=p.y+6;
  for(const c of colliders){
    if(pr<c.x||pl>c.x+c.w||pb<c.y||pt>c.y+c.h) continue;
    // overlap — push out on smallest axis
    const ox=Math.min(pr-c.x, c.x+c.w-pl);
    const oy=Math.min(pb-c.y, c.y+c.h-pt);
    if(ox<oy){ p.x+=pr-c.x<=c.x+c.w-pl ? -ox : ox; }
    else      { p.y+=pb-c.y<=c.y+c.h-pt ? -oy : oy; }
  }
  p.x=clamp(p.x,20,WORLD_W-20);
  p.y=clamp(p.y,26,WORLD_H-20);
}

// ---------- WORLD OBJECTS (generated once) ----------
function rand2(ax,ay,bx,by,minDist,existing,tries=40){
  // random point avoiding existing items by minDist
  for(let t=0;t<tries;t++){
    const x=rand(ax,bx),y=rand(ay,by);
    if(existing.every(e=>Math.hypot(e.x-x,e.y-y)>minDist)) return {x,y};
  }
  return {x:rand(ax,bx),y:rand(ay,by)};
}

const worldObjects=[]; // typed world objects with draw info
let river=null; // { pos, width, amplitude, wavelength }

function buildWorld(){
  worldObjects.length=0; colliders.length=0;

  // ---- RIVER (create first so placements can avoid it) ----
  river={
    pos:WORLD_H*0.38,
    amplitude:34, wavelength:560,                 // broad meander
    amplitude2:13, wavelength2:190, phase2:1.7,    // smaller wobble layered on top, less mechanical
    baseWidth:74, widthAmp:22, widthWavelength:430, widthPhase:0.6, // river breathes wider/narrower along its length
  };
  river.pebbles=makeRiverPebbles();

  // ---- Water exclusion helper (hoisted — usable by pond placement below too) ----
  function inWater(x,y,margin){
    if(inRiver(x,y,margin)) return true;
    return worldObjects.some(o=>o.kind==='pond'&&
      ((x-o.x)/(o.w/2+margin))**2+((y-o.y)/(o.h/2+margin))**2<1);
  }
  function safePt(ax,ay,bx,by,minDist,list,margin){
    for(let a=0;a<60;a++){
      const p=rand2(ax,ay,bx,by,minDist,list);
      if(!inWater(p.x,p.y,margin)) return p;
    }
    return rand2(ax,ay,bx,by,minDist,list); // fallback
  }

  // ---- PONDS (also before other objects) — varied sizes & shapes, kept clear of the river ----
  const taken=[];
  const pondShapes=[
    ()=>({w:rand(90,130),  h:rand(80,120)}),   // small & round
    ()=>({w:rand(170,240), h:rand(110,160)}),  // medium oval
    ()=>({w:rand(240,330), h:rand(150,210)}),  // large oval
    ()=>({w:rand(110,150), h:rand(210,280)}),  // tall & narrow
    ()=>({w:rand(260,350), h:rand(90,130)}),   // long & wide
  ];
  for(let i=0;i<5;i++){
    const {w,h}=pondShapes[i%pondShapes.length]();
    // Keep clear of other ponds AND of the river along the pond's whole width (so a wide
    // pond can't overlap the river where its meander bulges toward the bank).
    let p, ok=false;
    for(let a=0;a<90 && !ok; a++){
      p=rand2(140,140,WORLD_W-140,WORLD_H-140,260,taken);
      ok = !inWater(p.x,p.y,Math.max(w,h)/2+24) && ellipseClearOfRiver(p.x,p.y,w,h,22);
    }
    taken.push(p);
    worldObjects.push({kind:'pond',x:p.x,y:p.y,w,h,seed:rnd()*100,blobSeed:Math.floor(rnd()*9999)});
  }

  // ---- FENCE border ----
  addCollider(0,0,WORLD_W,14);
  addCollider(0,WORLD_H-14,WORLD_W,14);
  addCollider(0,0,14,WORLD_H);
  addCollider(WORLD_W-14,0,14,WORLD_H);

  // ---- OAK TREES ---- (collider fitted to the trunk + roots at the base, not the canopy)
  for(let i=0;i<22;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,100,taken,55);
    taken.push(p);
    worldObjects.push({kind:'oak',x:p.x,y:p.y,variant:Math.floor(rnd()*3)});
    addCollider(p.x-7,p.y+19,14,13);
  }

  // ---- PINE TREES ----
  for(let i=0;i<12;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,80,taken,45);
    taken.push(p);
    worldObjects.push({kind:'pine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+15,8,10);
  }

  // ---- ROCKS ---- (only big rocks block; collider hugs the rock's ground footprint)
  for(let i=0;i<18;i++){
    const p=safePt(60,60,WORLD_W-60,WORLD_H-60,60,taken,40);
    taken.push(p);
    const big=rnd()<0.35;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // ---- ROCK CLUSTERS ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,120,taken,45);
    taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:rnd()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // ---- TALL GRASS patches (no collider) ----
  for(let i=0;i<30;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(30,30,WORLD_W-30,WORLD_H-30,40,taken.filter((_,j)=>j%3===0));
      if(!inWater(p.x,p.y,30)) break;
    }
    worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:rnd()*100});
  }

  // ---- BUSHES ----
  for(let i=0;i<24;i++){
    const p=safePt(50,50,WORLD_W-50,WORLD_H-50,70,taken,40);
    taken.push(p);
    const variant=Math.floor(rnd()*2);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant});
    addCollider(p.x-12,p.y+3,24,13);
  }

  // ---- FLOWERS (no collider, kept on dry land) ----
  const flowerHues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF'];
  for(let i=0;i<100;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,WORLD_W-30); fy=rand(30,WORLD_H-30); if(!inWater(fx,fy,4)) break; }
    if(inWater(fx,fy,4)) continue;   // no dry spot found this try — skip rather than float on water
    worldObjects.push({kind:'flower',x:fx,y:fy,
      hue:flowerHues[Math.floor(rnd()*flowerHues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.3)});
  }

  // ---- WILLOW TREES ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,100,taken,50);
    taken.push(p);
    worldObjects.push({kind:'willow',x:p.x,y:p.y});
    addCollider(p.x-8,p.y+19,16,15);
  }

  // ---- MUSHROOMS ----
  for(let i=0;i<14;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(40,40,WORLD_W-40,WORLD_H-40,30,taken.filter((_,j)=>j%4===0));
      if(!inWater(p.x,p.y,25)) break;
    }
    worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:rnd()<0.3});
  }

  // ---- MUSHROOM RINGS ----
  for(let i=0;i<4;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,90,taken,45);
    taken.push(p);
    worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:rnd()*100});
  }

  // ---- CATTAILS / REEDS along the pond shores (no collider) ----
  worldObjects.filter(o=>o.kind==='pond').forEach(pond=>{
    const n=Math.floor(rand(3,6));
    for(let k=0;k<n;k++){
      const ang=rand(0,Math.PI*2);
      worldObjects.push({kind:'cattail', seed:rnd()*100,
        x:pond.x+Math.cos(ang)*(pond.w/2+rand(2,10)),
        y:pond.y+Math.sin(ang)*(pond.h/2+rand(2,10))});
    }
  });

  // ---- FALLEN LOGS (solid) ----
  for(let i=0;i<5;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,90,taken,40);
    taken.push(p);
    worldObjects.push({kind:'log',x:p.x,y:p.y,seed:rnd()*100});
    addCollider(p.x-16,p.y-1,32,9);
  }

  // ---- TREE STUMPS (solid) ----
  for(let i=0;i<5;i++){
    const p=safePt(70,70,WORLD_W-70,WORLD_H-70,80,taken,35);
    taken.push(p);
    worldObjects.push({kind:'stump',x:p.x,y:p.y,seed:rnd()*100});
    addCollider(p.x-8,p.y-1,16,10);
  }

  // ---- BUTTERFLIES (animated ambient life, no collider) ----
  const bflyHues=['#FFFFFF','#FFD93D','#FF9E6E','#8FD4E8','#C9A6FF','#FF8FB0'];
  for(let i=0;i<14;i++){
    worldObjects.push({kind:'butterfly', x:rand(60,WORLD_W-60), y:rand(60,WORLD_H-60),
      hue:bflyHues[Math.floor(rnd()*bflyHues.length)], seed:rnd()*1000});
  }

  // ---- STONE PATHS ----
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.15,y1:WORLD_H*0.5,x2:WORLD_W*0.85,y2:WORLD_H*0.5,seed:11});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.5,y1:WORLD_H*0.12,x2:WORLD_W*0.5,y2:WORLD_H*0.88,seed:22});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.15,y1:WORLD_H*0.15,x2:WORLD_W*0.22,y2:WORLD_H*0.22,seed:33});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.8,y1:WORLD_H*0.18,x2:WORLD_W*0.88,y2:WORLD_H*0.25,seed:44});

  // ---- BRIDGES over ponds ----
  worldObjects.filter(o=>o.kind==='pond').slice(0,3).forEach((pond,i)=>{
    worldObjects.push({kind:'bridge',x:pond.x,y:pond.y,horizontal:i%2===0,seed:i});
  });

  // ---- RIVER BRIDGES (3 stone crossings, sized to fully span the river at their spot —
  //      drawn separately in main.js so swimmers can pass underneath) ----
  [0.22,0.5,0.78].forEach((fx,i)=>{
    const bx=WORLD_W*fx;
    const span=riverWidthAt(bx)/2+16; // half-length along the crossing, with margin onto both banks
    worldObjects.push({kind:'riverbridge',x:bx,y:riverY(bx),horizontal:false,seed:10+i,span});
  });

  // Sort by y for painter's algorithm
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}
// The world is now built via LevelManager.load() (called from main.js at startup and
// on each game start), not once at module load.

// ---------- COLLECTIBLES ----------
function makeCollectibles(){
  const types=['bone','heart','ball','flower'];
  const items=Array.from({length:24},(_,i)=>({
    x:rand(80,WORLD_W-80), y:rand(80,WORLD_H-80),
    type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2)
  }));
  // fish swimming back and forth along the river
  for(let i=0;i<6;i++){
    const baseX=rand(120,WORLD_W-120);
    items.push({
      type:'fish', taken:false, bob:rand(0,Math.PI*2), dir:1,
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(rnd()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX)
    });
  }
  return items;
}
let collectibles=[]; // populated by LevelManager.load() → level.generate()

function updateCollectibles(t){
  collectibles.forEach(item=>{
    if(item.taken||item.type!=='fish') return;
    const ang=t/1000*item.speed+item.phase;
    item.x=clamp(item.baseX+Math.sin(ang)*item.range,30,WORLD_W-30);
    item.y=riverY(item.x)+Math.sin(t/260+item.phase)*6;
    item.dir=Math.cos(ang)>=0?1:-1;
  });
}

// ---------- NPC FRIENDS ----------
function makeFriends(){
  return [
    {name:'Cat in the tree', x:280,  y:200,  need:3,given:0,cheered:false,kind:'cat',      msg:"I'm stuck here and lonely... got any treats?"},
    {name:'Lonely Bunny',    x:1580, y:240,  need:3,given:0,cheered:false,kind:'bunny',    msg:"I lost my family's flower patch..."},
    {name:'Sad Bird',        x:300,  y:980,  need:3,given:0,cheered:false,kind:'bird',     msg:"My nest fell apart! Bring me treats?"},
    {name:'Shy Hedgehog',    x:1600, y:1020, need:3,given:0,cheered:false,kind:'hedgehog', msg:"I'm too shy to come out... bring me treats?"},
    {name:'Old Tortoise',    x:960,  y:640,  need:4,given:0,cheered:false,kind:'tortoise', msg:"It's been so quiet around here lately."},
  ];
}
let friends=[]; // populated by LevelManager.load() → level.generate()

// ---------- RIVER / POND helpers ----------
function riverY(x){
  if(!river) return 0;
  return river.pos
    + river.amplitude*Math.sin(x/river.wavelength*Math.PI*2)
    + river.amplitude2*Math.sin(x/river.wavelength2*Math.PI*2+river.phase2);
}

function riverWidthAt(x){
  if(!river) return 0;
  const w=river.baseWidth
    + river.widthAmp*Math.sin(x/river.widthWavelength*Math.PI*2+river.widthPhase)
    + river.widthAmp*0.4*Math.sin(x/(river.widthWavelength*0.37)*Math.PI*2);
  return Math.max(40,w);
}

function makeRiverPebbles(){
  const list=[];
  for(let x=40;x<WORLD_W-40;){
    const w=riverWidthAt(x), cy=riverY(x);
    const side=rnd()<0.5?-1:1;
    list.push({x, y:cy+side*(w/2+rand(2,9)), big:rnd()<0.3});
    x+=rand(26,46);
  }
  return list;
}

function inRiver(x,y,margin=0){
  if(!river) return false;
  return Math.abs(y-riverY(x)) < riverWidthAt(x)/2+margin;
}

// True if an elliptical water body (centre cx,cy, size w×h) stays `margin` clear of the
// river across its whole horizontal span. Checking only the centre misses the case where
// the meandering river bulges toward a wide pond's edge, so we sample across the width.
function ellipseClearOfRiver(cx,cy,w,h,margin=20){
  if(!river) return true;
  const steps=8;
  for(let i=0;i<=steps;i++){
    const sx=cx-w/2 + w*(i/steps);
    if(Math.abs(cy-riverY(sx)) < riverWidthAt(sx)/2 + h/2 + margin) return false;
  }
  return true;
}

function isOnSpecificBridge(o,px,py){
  if(o.kind==='riverbridge'){
    const span=o.span||30, road=9; // span covers the full river crossing; road is the walkway width
    if(o.horizontal) return Math.abs(px-o.x)<span && Math.abs(py-o.y)<road;
    return Math.abs(px-o.x)<road && Math.abs(py-o.y)<span;
  }
  const hw=o.horizontal?28:8, hh=o.horizontal?10:28;
  return Math.abs(px-o.x)<hw && Math.abs(py-o.y)<hh;
}

function isOnWalkableBridge(px,py){ // pond bridges — always a dry deck
  return worldObjects.some(o=>o.kind==='bridge'&&isOnSpecificBridge(o,px,py));
}

function onRiverBridge(px,py){
  return worldObjects.some(o=>o.kind==='riverbridge'&&isOnSpecificBridge(o,px,py));
}

function isOnBridge(px,py){
  return isOnWalkableBridge(px,py) || onRiverBridge(px,py);
}

function _inEllipse(o,px,py,k){ return ((px-o.x)/(o.w/2))**2+((py-o.y)/(o.h/2))**2<(k||0.92); }

function isInPond(px,py,wasSwimming){
  // Ponds (meadow) and lakes (rocky) are both swimmable elliptical water bodies. Seashell
  // Cove adds two more: `deepwater` (dive basins — always submerged) and `tidepool` (only
  // holds water while the tide is IN; drains to walkable sand at low tide — see tide.js).
  const inEllipse=worldObjects.some(o=>{
    if(o.kind==='pond'||o.kind==='lake'||o.kind==='deepwater') return _inEllipse(o,px,py);
    if(o.kind==='tidepool') return (typeof Tide!=='undefined' && Tide.covered()) && _inEllipse(o,px,py);
    return false;
  });
  const inWater=inEllipse || inRiver(px,py);
  if(!inWater) return false;
  if(isOnWalkableBridge(px,py)) return false; // pond bridge deck — never swimming
  if(onRiverBridge(px,py) && !wasSwimming) return false; // stepping onto bridge from dry land
  return true; // open water, or already swimming and passing underneath a river bridge
}

// Pure "is this point in water" test (river OR any pond/lake), ignoring bridges. Used for
// placement: keep land plants, NPCs and quest animals out of the water.
function isWater(x,y,margin=0){
  if(inRiver(x,y,margin)) return true;
  // For placement, tidal pools and dive basins always count as water (keep plants/NPCs off
  // them) regardless of the current tide phase.
  return worldObjects.some(o=>(o.kind==='pond'||o.kind==='lake'||o.kind==='deepwater'||o.kind==='tidepool')&&
    ((x-o.x)/(o.w/2+margin))**2+((y-o.y)/(o.h/2+margin))**2<1);
}

// True when a point sits over a dive basin (`deepwater`) — used for the diving mechanic
// (submerge to gather pearls / duck surface jellyfish) in Coral Sands.
function overDeepWater(x,y){
  return worldObjects.some(o=>o.kind==='deepwater' && _inEllipse(o,x,y));
}

// True when a point sits over a slippery ice sheet (`icepatch`) — the dog slides with
// momentum here (Frostfang Tundra). Uses each patch's w/h ellipse.
function onSlipperyIce(x,y){
  return worldObjects.some(o=>o.kind==='icepatch' && _inEllipse(o,x,y,1));
}

// Move an object (with .x/.y) to the nearest dry land if it spawned in water. Keeps
// merchants and quest animals off the water; searches outward in rings for a dry spot.
function nudgeOutOfWater(obj, margin=10){
  if(!obj || !isWater(obj.x,obj.y,margin)) return;
  for(let r=24; r<=560; r+=24){
    for(let a=0;a<16;a++){
      const ang=a/16*Math.PI*2;
      const nx=clamp(obj.x+Math.cos(ang)*r, 30, WORLD_W-30);
      const ny=clamp(obj.y+Math.sin(ang)*r, 30, WORLD_H-30);
      if(!isWater(nx,ny,margin)){ obj.x=nx; obj.y=ny; return; }
    }
  }
}

function makePlayer(id,color,x,y,breed='dinno',markings='classic'){
  const def=Breeds.get(breed); // per-breed stats + active ability (data/breeds.js)
  const maxHp=def.hp||20;      // 1 heart = 2 hp; different starting total per breed
  const p={id,color,x,y,w:24,h:24,dir:'down',moving:false,animFrame:0,animTimer:0,
    treats:0,shells:0,reputation:0,inventory:Inventory.create(),equipment:{},hp:maxHp,maxHp,hurtTimer:0,dead:false,
    speed:def.stats.speed,stats:def.stats,abilities:(def.abilities||[]).slice(),
    skills:{},skillPoints:0,   // character stat-tree levels + points (data/skills.js)
    mastery:{},masteryPoints:0,// ability mastery-tree levels + points (data/progression.js)
    abilitiesUnlocked:false,   // abilities stay dormant until the first boss is passed (world-map.js)
    ultimateUnlocked:false,    // the R Ultimate awakens at the Moonlit Rite (Firefly Grove)
    xp:0,dogLevel:1,           // RPG progression (data/progression.js)
    abilityCd:{},              // per-ability cooldowns in ms (abilities/registry.js)
    howling:false,howlTimer:0,noiseT:0,breed,markings,swimming:false,
    warmth:100,heat:100,relicCd:0};   // env-meter + relic-cooldown transient state
  if(typeof Skills!=='undefined') Skills.apply(p);   // derive stats fresh (never share def.stats)
  return p;
}
let p1=makePlayer(1,'#C07840',200,200);

let sparkles=[];
function spawnSparkles(x,y,color,count=14){
  for(let i=0;i<count;i++) sparkles.push({x,y,vx:rand(-1.8,1.8),vy:rand(-2.8,-0.8),life:rand(30,55),maxLife:50,color:color||(Math.random()<.5?'#FFD93D':'#FF8FA3'),size:rand(2,4)});
}

