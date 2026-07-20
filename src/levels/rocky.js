// ====================== LEVEL 2: ROCKY MOUNTAINS ======================
// The trail out of the Sunny Meadow climbs into a lush Canadian-Rockies valley: a
// forested green basin ringed by jagged snow-veined peaks, dotted with vivid turquoise
// glacial lakes, fed by cascading waterfalls, with a river winding through and a pack of
// wolves on the prowl. Reached by clearing level 1 (meadow.next → 'rocky'); final level.
//
// Like meadow.js this is a thin declaration: a bigger `size`, an alpine `theme`, a
// `generate()` that lays down the terrain / animals / actors, and a `quest`. Visuals
// (mountains, lakes, waterfalls, evergreens, boulders, campfires) live in world-draw.js;
// new animals in friends.js; the wolf in entities/.

// ---- world generation (alpine valley: peaks, glacial lakes, waterfalls, a river) ----
function buildRockyWorld(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H;

  // Winding river threading the lower-middle of the valley (create first so placement
  // can steer clear of it).
  river={
    pos:H*0.62,
    amplitude:42, wavelength:680,
    amplitude2:16, wavelength2:230, phase2:2.1,
    baseWidth:58, widthAmp:18, widthWavelength:500, widthPhase:1.1,
  };
  river.pebbles=makeRiverPebbles();

  // ---- Glacial lakes (big turquoise water bodies). Placed before everything else so
  //      other objects steer around them; swimmable (isInPond treats 'lake' like 'pond'). ----
  const lakes=[
    { x:W*0.50, y:H*0.34, w:390, h:250 },   // hero lake below the central peaks
    { x:W*0.22, y:H*0.46, w:300, h:210 },   // west lake
    { x:W*0.79, y:H*0.42, w:280, h:190 },   // east lake
  ];
  // Keep every lake fully clear of the river — nudge it up the valley if it would cross.
  lakes.forEach(l=>{ let guard=0; while(!ellipseClearOfRiver(l.x,l.y,l.w,l.h,26) && guard++<50) l.y-=12; });
  lakes.forEach(l=>worldObjects.push({kind:'lake', x:l.x, y:l.y, w:l.w, h:l.h,
    seed:Math.random()*100, blobSeed:Math.floor(Math.random()*9999)}));
  function inLake(x,y,m){ return lakes.some(l=>((x-l.x)/(l.w/2+m))**2+((y-l.y)/(l.h/2+m))**2<1); }

  // Placement helper: random point avoiding the river, lakes, and existing items.
  function pt(ax,ay,bx,by,minD,list,margin){
    for(let a=0;a<60;a++){
      const p=rand2(ax,ay,bx,by,minD,list);
      if(!inRiver(p.x,p.y,margin) && !inLake(p.x,p.y,margin)) return p;
    }
    return rand2(ax,ay,bx,by,minD,list);
  }

  // log-fence border
  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];

  // ---- Mountain range along the skyline: a run of wide, overlapping peaks whose summits
  //      sit fully inside the world (apex y >= ~8) so they read as a continuous range
  //      rather than triangles cut off by the top edge. Low y → drawn behind everything. ----
  const M=6;
  for(let i=0;i<M;i++){
    const mx=W*(0.06 + (i/(M-1))*0.88) + rand(-24,24);
    const baseY=rand(196,216);
    const mh=rand(150,188);          // apex = baseY - mh stays a little below the top edge
    const mw=rand(360,500);
    worldObjects.push({kind:'mountain',x:mx,y:baseY,w:mw,h:mh,seed:Math.floor(Math.random()*9999)});
    // Solid across most of the base so you can't walk into the massif (matches the rock).
    addCollider(mx-mw*0.4, baseY-4, mw*0.8, 16);
  }

  // ---- Waterfalls tumbling into the lakes they sit above ----
  worldObjects.push({kind:'waterfall', x:lakes[0].x, y:lakes[0].y-lakes[0].h/2+10, h:120});
  worldObjects.push({kind:'waterfall', x:lakes[2].x+10, y:lakes[2].y-lakes[2].h/2+8, h:96});

  // Boulders — the valley's main obstacles.
  for(let i=0;i<15;i++){
    const p=pt(60,240,W-60,H-60,120,taken,50); taken.push(p);
    const big=Math.random()<0.6;
    worldObjects.push({kind:'boulder',x:p.x,y:p.y,big});
    addCollider(p.x-(big?16:11), p.y+(big?1:0), big?32:22, big?14:11);
  }

  // Rock clusters.
  for(let i=0;i<7;i++){
    const p=pt(80,240,W-80,H-80,120,taken,45); taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:Math.random()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // Evergreen forest — lush green spruce/fir (a lot of them: it's a forested valley).
  for(let i=0;i<26;i++){
    const p=pt(50,240,W-50,H-50,80,taken,40); taken.push(p);
    worldObjects.push({kind:'snowypine',x:p.x,y:p.y});
    addCollider(p.x-4,p.y+14,8,9);
  }

  // A few weathered deadfall trees.
  for(let i=0;i<5;i++){
    const p=pt(60,240,W-60,H-60,110,taken,42); taken.push(p);
    worldObjects.push({kind:'deadtree',x:p.x,y:p.y});
    addCollider(p.x-6,p.y+18,12,11);
  }

  // Loose rocks (mostly walkable; big ones block).
  for(let i=0;i<18;i++){
    const p=pt(60,240,W-60,H-60,60,taken,35); taken.push(p);
    const big=Math.random()<0.25;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // Hardy shrubs.
  for(let i=0;i<14;i++){
    const p=pt(60,240,W-60,H-60,80,taken,40); taken.push(p);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant:Math.floor(Math.random()*2)});
    addCollider(p.x-12,p.y+3,24,13);
  }

  // Wildflowers + grass tufts across the green valley floor (no colliders).
  const hues=['#FF9E6E','#FFD36A','#E58AC0','#B6E36A','#7FD4E0','#C79BFF'];
  for(let i=0;i<70;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,W-30); fy=rand(220,H-30); if(!isWater(fx,fy,4)) break; }
    if(isWater(fx,fy,4)) continue;   // alpine flowers stay on dry land
    worldObjects.push({kind:'flower',x:fx,y:fy,
      hue:hues[Math.floor(Math.random()*hues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.2)});
  }
  for(let i=0;i<22;i++){
    let gx,gy;
    for(let a=0;a<20;a++){ gx=rand(40,W-40); gy=rand(220,H-40); if(!isWater(gx,gy,4)) break; }
    if(isWater(gx,gy,4)) continue;
    worldObjects.push({kind:'tallgrass',x:gx,y:gy,blades:Math.floor(rand(4,9)),seed:Math.random()*100});
  }

  // Cozy lakeside campfires — warm landmarks.
  worldObjects.push({kind:'campfire',x:W*0.63, y:H*0.30});
  worldObjects.push({kind:'campfire',x:W*0.15,y:H*0.82});

  // A couple of trails.
  worldObjects.push({kind:'stonepath',x1:W*0.12,y1:H*0.38,x2:W*0.88,y2:H*0.44,seed:71});
  worldObjects.push({kind:'stonepath',x1:W*0.66,y1:H*0.20,x2:W*0.66,y2:H*0.9, seed:72});

  // Stone crossings over the river (drawn in main.js so swimmers pass underneath).
  [0.28,0.6,0.85].forEach((fx,i)=>{
    const bx=W*fx;
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

  // Lush alpine-valley palette (green basin, log-fence border, turquoise water on map).
  theme: {
    grass:'#86A867', grassDark:'#71934F', grassLight:'#9BBC79',
    dirt:'rgba(122,100,64,0.18)',
    fenceA:'#6B4A2E', fenceB:'#7C5636', rail:'#A9793F',
    minimapGrass:'#5E8A46', minimapWater:'#3FC8C0',
  },

  generate(){
    buildRockyWorld();
    collectibles = makeRockyCollectibles();
    friends = makeRockyFriends();

    Entities.clear();
    // Rusk the Ranger — a park-ranger guide/merchant by the lakeside camp, stocking
    // outdoor gear and a hearty snack.
    Entities.spawn('npc', {
      x: WORLD_W*0.60, y: WORLD_H*0.22,
      name: 'Rusk the Ranger',
      look: 'ranger',
      greeting: "Welcome to the valley, pup! Gear up before the wolves catch your scent.",
      wares: [
        {id:'beanie',   cost:6}, {id:'snowgoggles', cost:8},
        {id:'trailmix', cost:4}, {id:'biscuit',     cost:3},
        {id:'cape',     cost:10}, {id:'key',        cost:8},
      ],
    });
    // A prowling wolf pack — the teeth of the level.
    Entities.spawn('wolf', { x: WORLD_W*0.40, y: WORLD_H*0.52, speed:1.15 });
    Entities.spawn('wolf', { x: WORLD_W*0.68, y: WORLD_H*0.66, speed:1.2  });
    Entities.spawn('wolf', { x: WORLD_W*0.30, y: WORLD_H*0.74, speed:1.1, chaseR:220 });
    // A grumpy badger still lurks too.
    Entities.spawn('enemy', { x: WORLD_W*0.78, y: WORLD_H*0.44, speed:1.0 });

    // Friendly Canadian wildlife — peaceful, greet them for a positive reward. Loons
    // ride on the lakes, the beaver keeps to a lakeshore, the moose roams the forest.
    const lk = worldObjects.filter(o=>o.kind==='lake');
    if(lk[0]) Entities.spawn('critter', { species:'loon',   x: lk[0].x-80, y: lk[0].y });
    if(lk[2]) Entities.spawn('critter', { species:'loon',   x: lk[2].x+50, y: lk[2].y });
    if(lk[1]) Entities.spawn('critter', { species:'beaver', x: lk[1].x,    y: lk[1].y + lk[1].h/2 + 16 });
    Entities.spawn('critter', { species:'moose', x: WORLD_W*0.34, y: WORLD_H*0.28 });

    Chests.spawnForLevel('rocky');   // buried treasure in the valley
  },

  quest: {
    id: 'cheer-all-rocky',
    label: 'Cheer up every mountain friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});
