// ====================== LEVEL 2: ROCKY MOUNTAINS ======================
// The trail out of the Sunny Meadow climbs into cold, stony highlands. Snow-capped
// peaks line the skyline, a glacial stream cuts across the map, and a pack of wolves
// prowls the slopes — so this level bites back harder than the meadow. You reach it by
// clearing level 1 (meadow.next → 'rocky'); it's the final level (next: null).
//
// Like meadow.js this is a thin declaration: a bigger `size`, a cold `theme`, a
// `generate()` that lays down mountain-flavoured world objects / animals / actors, and
// a `quest`. New visuals (mountains, boulders, snowy pines, dead trees, crystals, snow,
// campfires) live in world-draw.js; new animals in friends.js; the wolf in entities/.

// ---- world generation (mountain terrain + a glacial stream) ----
function buildRockyWorld(){
  worldObjects.length=0; colliders.length=0;

  // Cold, winding stream across the lower-middle of the map (create first so placement
  // can steer clear of it). Narrower and colder than the meadow river.
  river={
    pos:WORLD_H*0.6,
    amplitude:42, wavelength:680,
    amplitude2:16, wavelength2:230, phase2:2.1,
    baseWidth:58, widthAmp:18, widthWavelength:500, widthPhase:1.1,
  };
  river.pebbles=makeRiverPebbles();

  // Placement helper: random point that avoids the stream and existing items.
  function pt(ax,ay,bx,by,minD,list,margin){
    for(let a=0;a<50;a++){ const p=rand2(ax,ay,bx,by,minD,list); if(!inRiver(p.x,p.y,margin)) return p; }
    return rand2(ax,ay,bx,by,minD,list);
  }

  // stone-wall border
  addCollider(0,0,WORLD_W,14);
  addCollider(0,WORLD_H-14,WORLD_W,14);
  addCollider(0,0,14,WORLD_H);
  addCollider(WORLD_W-14,0,14,WORLD_H);

  const taken=[];

  // Backdrop peaks along the top edge (low y → painter's algorithm draws them behind
  // everything). A small collider at each base keeps dogs from walking "into" a peak.
  const M=6;
  for(let i=0;i<M;i++){
    const mx=WORLD_W*(0.08 + (i/(M-1))*0.84) + rand(-36,36);
    const my=rand(120,185);
    const w=rand(230,360), h=rand(150,240);
    worldObjects.push({kind:'mountain',x:mx,y:my,w,h,seed:Math.floor(Math.random()*9999)});
    addCollider(mx-16,my-8,32,14);
  }

  // Boulders — the level's main obstacles.
  for(let i=0;i<16;i++){
    const p=pt(60,240,WORLD_W-60,WORLD_H-60,120,taken,50); taken.push(p);
    const big=Math.random()<0.6;
    worldObjects.push({kind:'boulder',x:p.x,y:p.y,big});
    addCollider(p.x-(big?16:11), p.y-2, big?32:22, big?16:12);
  }

  // Rock clusters (generic grey renderer fits the theme perfectly).
  for(let i=0;i<8;i++){
    const p=pt(80,240,WORLD_W-80,WORLD_H-80,120,taken,45); taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-26,p.y-4,50,18);
  }

  // Snow-dusted pines.
  for(let i=0;i<18;i++){
    const p=pt(50,240,WORLD_W-50,WORLD_H-50,90,taken,42); taken.push(p);
    worldObjects.push({kind:'snowypine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+12,8,12);
  }

  // Bare, weathered dead trees.
  for(let i=0;i<9;i++){
    const p=pt(60,240,WORLD_W-60,WORLD_H-60,110,taken,42); taken.push(p);
    worldObjects.push({kind:'deadtree',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+14,8,12);
  }

  // Loose rocks (mostly walkable; big ones block).
  for(let i=0;i<20;i++){
    const p=pt(60,240,WORLD_W-60,WORLD_H-60,60,taken,35); taken.push(p);
    const big=Math.random()<0.25;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-13,p.y-2,26,16);
  }

  // Glowing crystal clusters (decorative, walkable).
  for(let i=0;i<12;i++){
    const p=pt(60,240,WORLD_W-60,WORLD_H-60,80,taken,30); taken.push(p);
    worldObjects.push({kind:'crystal',x:p.x,y:p.y,seed:Math.random()*100});
  }

  // Snow drifts on the ground (no collider).
  for(let i=0;i<26;i++){
    worldObjects.push({kind:'snowpatch',x:rand(30,WORLD_W-30),y:rand(220,WORLD_H-30),seed:Math.random()*100});
  }

  // Hardy shrubs.
  for(let i=0;i<12;i++){
    const p=pt(60,240,WORLD_W-60,WORLD_H-60,80,taken,40); taken.push(p);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant:Math.floor(Math.random()*2)});
    addCollider(p.x-13,p.y+2,26,16);
  }

  // Alpine flowers (cool palette) + dry grass tufts (no colliders).
  const hues=['#BFD7FF','#D9C7FF','#FF9EC0','#FFE08A','#B6F0E0'];
  for(let i=0;i<60;i++){
    worldObjects.push({kind:'flower',x:rand(30,WORLD_W-30),y:rand(220,WORLD_H-30),
      hue:hues[Math.floor(Math.random()*hues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.2)});
  }
  for(let i=0;i<16;i++){
    worldObjects.push({kind:'tallgrass',x:rand(40,WORLD_W-40),y:rand(220,WORLD_H-40),
      blades:Math.floor(rand(4,8)),seed:Math.random()*100});
  }

  // Cozy campfires — warm landmarks on the cold peaks.
  worldObjects.push({kind:'campfire',x:WORLD_W*0.5, y:WORLD_H*0.30});
  worldObjects.push({kind:'campfire',x:WORLD_W*0.19,y:WORLD_H*0.82});

  // A couple of stone trails.
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.12,y1:WORLD_H*0.36,x2:WORLD_W*0.88,y2:WORLD_H*0.42,seed:71});
  worldObjects.push({kind:'stonepath',x1:WORLD_W*0.5, y1:WORLD_H*0.22,x2:WORLD_W*0.5, y2:WORLD_H*0.9, seed:72});

  // Stone crossings over the stream (drawn in main.js so swimmers pass underneath).
  [0.28,0.6,0.85].forEach((fx,i)=>{
    const bx=WORLD_W*fx;
    const span=riverWidthAt(bx)/2+16;
    worldObjects.push({kind:'riverbridge',x:bx,y:riverY(bx),horizontal:false,seed:30+i,span});
  });

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

// Treats are scarcer per-square-metre than the meadow (bigger map, same-ish count), so
// you have to roam to gather enough — part of what makes this level harder.
function makeRockyCollectibles(){
  const types=['bone','heart','ball','flower'];
  const items=[];
  for(let i=0;i<30;i++){
    items.push({ x:rand(80,WORLD_W-80), y:rand(240,WORLD_H-80),
      type:types[i%types.length], taken:false, bob:rand(0,Math.PI*2) });
  }
  // fish darting in the stream
  for(let i=0;i<6;i++){
    const baseX=rand(160,WORLD_W-160);
    items.push({ type:'fish', taken:false, bob:rand(0,Math.PI*2), dir:1,
      baseX, range:rand(50,120), speed:rand(0.35,0.8)*(Math.random()<0.5?1:-1), phase:rand(0,Math.PI*2),
      x:baseX, y:riverY(baseX) });
  }
  return items;
}

// Six lonely mountain animals (one more than the meadow), each needing more treats, and
// several stranded across the stream so you have to use the crossings.
function makeRockyFriends(){
  const W=WORLD_W, H=WORLD_H;
  return [
    {name:'Rusty the Fox',    x:W*0.17, y:H*0.28, need:4,given:0,cheered:false,kind:'fox',     msg:"The cold nights are so lonely up here..."},
    {name:'Old Billy Goat',   x:W*0.84, y:H*0.26, need:4,given:0,cheered:false,kind:'goat',    msg:"My herd wandered off over the ridge."},
    {name:'Hoot the Owl',     x:W*0.52, y:H*0.16, need:4,given:0,cheered:false,kind:'owl',      msg:"Whoo will keep me company tonight?"},
    {name:'Pip the Marmot',   x:W*0.15, y:H*0.82, need:5,given:0,cheered:false,kind:'marmot',   msg:"I burrowed too far from my friends..."},
    {name:'Bramble the Cub',  x:W*0.85, y:H*0.80, need:5,given:0,cheered:false,kind:'bearcub',  msg:"I can't find my way back to the den."},
    {name:'Ridge the Raven',  x:W*0.52, y:H*0.78, need:4,given:0,cheered:false,kind:'bird',     msg:"The peaks are quiet and grey today."},
  ];
}

Levels.register({
  id: 'rocky',
  name: 'Rocky Mountains',
  seed: 24680,
  size: { w: 2400, h: 1600 },      // a bigger world = more ground to cover
  spawn: { x: 170, y: 250 },       // start on the lower-left plateau, below the peaks
  next: null,                      // final level

  // Cold, stony palette (grass tones → gravel/scree; fence → stone wall).
  theme: {
    grass:'#8C877C', grassDark:'#7A756A', grassLight:'#9C978C',
    dirt:'rgba(120,104,84,0.20)',
    fenceA:'#5E574E', fenceB:'#6E6658', rail:'#93887A',
    minimapGrass:'#6E665A', minimapWater:'#5AA6C8',
    snow:'#EAF2F6',
  },

  generate(){
    buildRockyWorld();
    collectibles = makeRockyCollectibles();
    friends = makeRockyFriends();

    Entities.clear();
    // Rusk the Ranger — a mountain guide/merchant near the summit campfire, stocking
    // cold-weather gear and a hearty snack.
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.24,
      name: 'Rusk the Ranger',
      look: 'ranger',
      greeting: "Brr! Cold up here, pup. Gear up before the wolves catch your scent.",
      wares: [
        {id:'beanie',   cost:6}, {id:'snowgoggles', cost:8},
        {id:'trailmix', cost:4}, {id:'biscuit',     cost:3},
        {id:'cape',     cost:10},
      ],
    });
    // A prowling wolf pack — the teeth of the level.
    Entities.spawn('wolf', { x: WORLD_W*0.40, y: WORLD_H*0.52, speed:1.15 });
    Entities.spawn('wolf', { x: WORLD_W*0.68, y: WORLD_H*0.66, speed:1.2  });
    Entities.spawn('wolf', { x: WORLD_W*0.30, y: WORLD_H*0.74, speed:1.1, chaseR:220 });
    // A grumpy badger still lurks too.
    Entities.spawn('enemy', { x: WORLD_W*0.78, y: WORLD_H*0.44, speed:1.0 });
  },

  quest: {
    id: 'cheer-all-rocky',
    label: 'Cheer up every mountain friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});
