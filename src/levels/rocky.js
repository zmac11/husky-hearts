// ====================== TERRAIN: ROCKY MOUNTAINS ======================
// A lush Canadian-Rockies valley: a forested green basin ringed by jagged snow-veined
// peaks, dotted with turquoise glacial lakes, fed by waterfalls, with a river winding
// through. Built by buildRockyWorld() (procedural, so it stays code); the level that uses
// it names terrain "rocky" in src/config/levels.json. Visuals (mountains, lakes,
// waterfalls, evergreens, boulders, campfires) live in world-draw.js.

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
    seed:rnd()*100, blobSeed:Math.floor(rnd()*9999)}));
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
    worldObjects.push({kind:'mountain',x:mx,y:baseY,w:mw,h:mh,seed:Math.floor(rnd()*9999)});
    // Solid across most of the base so you can't walk into the massif (matches the rock).
    addCollider(mx-mw*0.4, baseY-4, mw*0.8, 16);
  }

  // ---- Waterfalls tumbling into the lakes they sit above ----
  worldObjects.push({kind:'waterfall', x:lakes[0].x, y:lakes[0].y-lakes[0].h/2+10, h:120});
  worldObjects.push({kind:'waterfall', x:lakes[2].x+10, y:lakes[2].y-lakes[2].h/2+8, h:96});

  // Boulders — the valley's main obstacles.
  for(let i=0;i<15;i++){
    const p=pt(60,240,W-60,H-60,120,taken,50); taken.push(p);
    const big=rnd()<0.6;
    worldObjects.push({kind:'boulder',x:p.x,y:p.y,big});
    addCollider(p.x-(big?16:11), p.y+(big?1:0), big?32:22, big?14:11);
  }

  // Rock clusters.
  for(let i=0;i<7;i++){
    const p=pt(80,240,W-80,H-80,120,taken,45); taken.push(p);
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:rnd()*100});
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
    const big=rnd()<0.25;
    worldObjects.push({kind:'rock',x:p.x,y:p.y,big});
    if(big) addCollider(p.x-12,p.y+2,24,12);
  }

  // Hardy shrubs.
  for(let i=0;i<14;i++){
    const p=pt(60,240,W-60,H-60,80,taken,40); taken.push(p);
    worldObjects.push({kind:'bush',x:p.x,y:p.y,variant:Math.floor(rnd()*2)});
    addCollider(p.x-12,p.y+3,24,13);
  }

  // Wildflowers + grass tufts across the green valley floor (no colliders).
  const hues=['#FF9E6E','#FFD36A','#E58AC0','#B6E36A','#7FD4E0','#C79BFF'];
  for(let i=0;i<70;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,W-30); fy=rand(220,H-30); if(!isWater(fx,fy,4)) break; }
    if(isWater(fx,fy,4)) continue;   // alpine flowers stay on dry land
    worldObjects.push({kind:'flower',x:fx,y:fy,
      hue:hues[Math.floor(rnd()*hues.length)],sway:rand(0,Math.PI*2),size:rand(0.7,1.2)});
  }
  for(let i=0;i<22;i++){
    let gx,gy;
    for(let a=0;a<20;a++){ gx=rand(40,W-40); gy=rand(220,H-40); if(!isWater(gx,gy,4)) break; }
    if(isWater(gx,gy,4)) continue;
    worldObjects.push({kind:'tallgrass',x:gx,y:gy,blades:Math.floor(rand(4,9)),seed:rnd()*100});
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

TERRAIN.rocky = buildRockyWorld;
