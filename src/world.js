// ====================== WORLD ======================
const WORLD_W=1920, WORLD_H=1280, VIEW_W=640, VIEW_H=416;
const cam={x:0,y:0};
function updateCamera(){
  let tx=p1.x,ty=p1.y;
  if(twoPlayer){tx=(p1.x+p2.x)/2;ty=(p1.y+p2.y)/2;}
  cam.x=Math.max(0,Math.min(WORLD_W-VIEW_W,tx-VIEW_W/2));
  cam.y=Math.max(0,Math.min(WORLD_H-VIEW_H,ty-VIEW_H/2));
}

let twoPlayer=false,gameStarted=false,cheeredCount=0;
const CHEER_TOTAL=5;

// ---------- INPUT ----------
const keys={};
window.addEventListener('keydown',e=>{ keys[e.code]=true; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code))e.preventDefault(); });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });

// ---------- HELPERS ----------
function rand(a,b){ return a+Math.random()*(b-a); }
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
  river={ pos:WORLD_H*0.38, width:72, amplitude:28, wavelength:520 };

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
    const margin=Math.max(w,h)/2+50; // keep ponds well clear of the river & each other
    const p=safePt(140,140,WORLD_W-140,WORLD_H-140,260,taken,margin);
    taken.push(p);
    worldObjects.push({kind:'pond',x:p.x,y:p.y,w,h,seed:Math.random()*100,blobSeed:Math.floor(Math.random()*9999)});
  }

  // ---- FENCE border ----
  addCollider(0,0,WORLD_W,14);
  addCollider(0,WORLD_H-14,WORLD_W,14);
  addCollider(0,0,14,WORLD_H);
  addCollider(WORLD_W-14,0,14,WORLD_H);

  // ---- OAK TREES ----
  for(let i=0;i<22;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,100,taken,55);
    taken.push(p);
    worldObjects.push({kind:'oak',x:p.x,y:p.y,variant:Math.floor(Math.random()*3)});
    addCollider(p.x-9,p.y+14,18,18);
  }

  // ---- PINE TREES ----
  for(let i=0;i<12;i++){
    const p=safePt(40,40,WORLD_W-40,WORLD_H-40,80,taken,45);
    taken.push(p);
    worldObjects.push({kind:'pine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+14,8,12);
  }

  // ---- ROCKS ----
  for(let i=0;i<18;i++){
    const p=safePt(60,60,WORLD_W-60,WORLD_H-60,60,taken,40);
    taken.push(p);
    const big=Math.random()<0.35;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-13,p.y-2,26,16);
  }

  // ---- ROCK CLUSTERS ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,120,taken,45);
    taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-26,p.y-4,50,18);
  }

  // ---- TALL GRASS patches (no collider) ----
  for(let i=0;i<30;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(30,30,WORLD_W-30,WORLD_H-30,40,taken.filter((_,j)=>j%3===0));
      if(!inWater(p.x,p.y,30)) break;
    }
    worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:Math.random()*100});
  }

  // ---- BUSHES ----
  for(let i=0;i<24;i++){
    const p=safePt(50,50,WORLD_W-50,WORLD_H-50,70,taken,40);
    taken.push(p);
    const variant=Math.floor(Math.random()*2);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant});
    addCollider(p.x-13,p.y+2,26,16);
  }

  // ---- FLOWERS (no collider) ----
  const flowerHues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF'];
  for(let i=0;i<100;i++){
    worldObjects.push({kind:'flower',x:rand(30,WORLD_W-30),y:rand(30,WORLD_H-30),
      hue:flowerHues[Math.floor(Math.random()*flowerHues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.3)});
  }

  // ---- WILLOW TREES ----
  for(let i=0;i<6;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,100,taken,50);
    taken.push(p);
    worldObjects.push({kind:'willow',x:p.x,y:p.y});
    addCollider(p.x-9,p.y+16,18,18);
  }

  // ---- MUSHROOMS ----
  for(let i=0;i<14;i++){
    let p;
    for(let a=0;a<40;a++){
      p=rand2(40,40,WORLD_W-40,WORLD_H-40,30,taken.filter((_,j)=>j%4===0));
      if(!inWater(p.x,p.y,25)) break;
    }
    worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:Math.random()<0.3});
  }

  // ---- MUSHROOM RINGS ----
  for(let i=0;i<4;i++){
    const p=safePt(80,80,WORLD_W-80,WORLD_H-80,90,taken,45);
    taken.push(p);
    worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:Math.random()*100});
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

  // ---- RIVER BRIDGES (3 stone crossings — drawn separately so swimmers can pass underneath) ----
  [0.25,0.5,0.75].forEach((fx,i)=>{
    const bx=WORLD_W*fx;
    worldObjects.push({kind:'riverbridge',x:bx,y:riverY(bx),horizontal:false,seed:10+i});
  });

  // Sort by y for painter's algorithm
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}
buildWorld();

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
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(Math.random()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX)
    });
  }
  return items;
}
let collectibles=makeCollectibles();

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
let friends=makeFriends();

// ---------- RIVER / POND helpers ----------
function riverY(x){
  if(!river) return 0;
  return river.pos + river.amplitude*Math.sin(x/river.wavelength*Math.PI*2);
}

function inRiver(x,y,margin=0){
  if(!river) return false;
  return Math.abs(y-riverY(x)) < river.width/2+margin;
}

function isOnSpecificBridge(o,px,py){
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

function isInPond(px,py,wasSwimming){
  const inEllipse=worldObjects.some(o=>o.kind==='pond'&&
    ((px-o.x)/(o.w/2))**2+((py-o.y)/(o.h/2))**2<0.92);
  const inWater=inEllipse || inRiver(px,py);
  if(!inWater) return false;
  if(isOnWalkableBridge(px,py)) return false; // pond bridge deck — never swimming
  if(onRiverBridge(px,py) && !wasSwimming) return false; // stepping onto bridge from dry land
  return true; // open water, or already swimming and passing underneath a river bridge
}

function makePlayer(id,color,x,y,breed='husky',markings='classic'){
  return {id,color,x,y,w:24,h:24,dir:'down',moving:false,animFrame:0,animTimer:0,
    treats:0,speed:2.6,howling:false,howlTimer:0,breed,markings,swimming:false};
}
let p1=makePlayer(1,'#6FA8C9',200,200);
let p2=makePlayer(2,'#E0855B',260,200);

let sparkles=[];
function spawnSparkles(x,y,color,count=14){
  for(let i=0;i<count;i++) sparkles.push({x,y,vx:rand(-1.8,1.8),vy:rand(-2.8,-0.8),life:rand(30,55),maxLife:50,color:color||(Math.random()<.5?'#FFD93D':'#FF8FA3'),size:rand(2,4)});
}

