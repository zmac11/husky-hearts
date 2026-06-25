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

function buildWorld(){
  worldObjects.length=0; colliders.length=0;

  // ---- FENCE border ----
  addCollider(0,0,WORLD_W,14);
  addCollider(0,WORLD_H-14,WORLD_W,14);
  addCollider(0,0,14,WORLD_H);
  addCollider(WORLD_W-14,0,14,WORLD_H);

  // ---- OAK TREES ----
  // Trunk base: x-5,y+2 w10 h28, roots spread to x±9,y+26
  // Collider covers lower trunk + root spread, not the canopy
  const taken=[];
  for(let i=0;i<22;i++){
    const p=rand2(40,40,WORLD_W-40,WORLD_H-40,100,taken);
    taken.push(p);
    worldObjects.push({kind:'oak',x:p.x,y:p.y, variant:Math.floor(Math.random()*3)});
    addCollider(p.x-9, p.y+14, 18, 18); // trunk base + roots
  }

  // ---- PINE TREES ----
  // Trunk: x-3,y+2 w6 h22
  for(let i=0;i<12;i++){
    const p=rand2(40,40,WORLD_W-40,WORLD_H-40,80,taken);
    taken.push(p);
    worldObjects.push({kind:'pine',x:p.x,y:p.y});
    addCollider(p.x-4, p.y+14, 8, 12); // just the trunk base
  }

  // ---- ROCKS ----
  // Big rock: x-14,y-11 to x+14,y+14  → body sits y-4 to y+14
  // Small rock: x-9,y-5 to x+9,y+10   → no collider (walkable decoration)
  for(let i=0;i<18;i++){
    const p=rand2(60,60,WORLD_W-60,WORLD_H-60,60,taken);
    taken.push(p);
    const big=Math.random()<0.35;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-13, p.y-2, 26, 16); // wide base of big rock only
    // small rocks: no collider
  }

  // ---- ROCK CLUSTERS ----
  // Spread: offsets [-18,4],[-6,-2],[6,2],[14,-4],[-2,10]
  // Combined footprint roughly x-27 to x+23, y-6 to y+18
  for(let i=0;i<6;i++){
    const p=rand2(80,80,WORLD_W-80,WORLD_H-80,120,taken);
    taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-26, p.y-4, 50, 18); // covers all rock bases in cluster
  }

  // ---- PONDS ----
  // Ellipse: center x,y semi-axes w/2,h/2. Use tighter fit so shore is blocked
  for(let i=0;i<5;i++){
    const p=rand2(100,100,WORLD_W-100,WORLD_H-100,180,taken);
    taken.push(p);
    const w=rand(60,110),h=rand(40,70);
    worldObjects.push({kind:'pond',x:p.x,y:p.y,w,h,seed:Math.random()*100});
    // AABB inscribed tightly in the ellipse
    addCollider(p.x-w*0.48, p.y-h*0.48, w*0.96, h*0.96);
  }

  // ---- TALL GRASS patches (no collider) ----
  for(let i=0;i<30;i++){
    const p=rand2(30,30,WORLD_W-30,WORLD_H-30,40,taken.filter((_,i)=>i%3===0));
    worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:Math.random()*100});
  }

  // ---- BUSHES ----
  // Variant 0: x-14,y+6 to x+14,y+18 (widest at base)
  // Variant 1: x-14,y+4 to x+14,y+16
  for(let i=0;i<24;i++){
    const p=rand2(50,50,WORLD_W-50,WORLD_H-50,70,taken);
    taken.push(p);
    const variant=Math.floor(Math.random()*2);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant});
    addCollider(p.x-13, p.y+2, 26, 16); // lower body only, matches visual base
  }

  // ---- FLOWERS (no collider) ----
  const flowerHues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF'];
  for(let i=0;i<100;i++){
    worldObjects.push({kind:'flower',x:rand(30,WORLD_W-30),y:rand(30,WORLD_H-30),
      hue:flowerHues[Math.floor(Math.random()*flowerHues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.3)});
  }

  // ---- WILLOW TREES ----
  // Trunk: x-6,y+2 to x+6,y+34, roots x-12,y+28 to x+12,y+34
  for(let i=0;i<6;i++){
    const p=rand2(80,80,WORLD_W-80,WORLD_H-80,100,taken);
    taken.push(p);
    worldObjects.push({kind:'willow',x:p.x,y:p.y});
    addCollider(p.x-9, p.y+16, 18, 18); // trunk base + roots
  }

  // ---- MUSHROOMS — no colliders (small, walkable) ----
  for(let i=0;i<14;i++){
    const p=rand2(40,40,WORLD_W-40,WORLD_H-40,30,taken.filter((_,i)=>i%4===0));
    worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:Math.random()<0.3});
  }

  // ---- MUSHROOM RINGS — no colliders ----
  for(let i=0;i<4;i++){
    const p=rand2(80,80,WORLD_W-80,WORLD_H-80,90,taken);
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

  // Sort by y for painter's algorithm
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}
buildWorld();

// ---------- COLLECTIBLES ----------
function makeCollectibles(){
  const types=['bone','heart','ball','flower'];
  return Array.from({length:24},(_,i)=>({
    x:rand(80,WORLD_W-80), y:rand(80,WORLD_H-80),
    type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2)
  }));
}
let collectibles=makeCollectibles();

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

// ---------- PLAYERS ----------
// breed/markings fields ready for selection screen
function makePlayer(id,color,x,y,breed='husky',markings='classic'){
  return {id,color,x,y,w:24,h:24,dir:'down',moving:false,animFrame:0,animTimer:0,
    treats:0,speed:2.6,howling:false,howlTimer:0,breed,markings};
}
let p1=makePlayer(1,'#6FA8C9',200,200);
let p2=makePlayer(2,'#E0855B',260,200);

let sparkles=[];
function spawnSparkles(x,y,color,count=14){
  for(let i=0;i<count;i++) sparkles.push({x,y,vx:rand(-1.8,1.8),vy:rand(-2.8,-0.8),life:rand(30,55),maxLife:50,color:color||(Math.random()<.5?'#FFD93D':'#FF8FA3'),size:rand(2,4)});
}

