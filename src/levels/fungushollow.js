// ====================== TERRAIN: FUNGUS HOLLOW ======================
// A damp, glowing hollow deep in the Whispering Woods (Whispering Woods 2). Its trick is
// LAYOUT: rock-cluster walls carve the space into branching routes and a guarded inner
// chamber (the Mooncap sits there in the level config), so it's the first level you navigate
// rather than cross. Giant mushrooms, toadstool rings and mossy logs fill it in; toadstool
// spitters and spore clouds (from the config) supply the poison.
//
// A central rock ring walls off the inner chamber, leaving two gaps; scattered rock-cluster
// clumps make the outer hollow a maze. Existing world-draw kinds only.

function buildFungusHollow(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H; river=null;

  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];
  const pt=(minD)=>rand2(40,40,W-40,H-40,minD,taken);

  // ---- inner chamber wall: a rough rock ring around the centre with two entrance gaps ----
  const cx=W*0.72, cy=H*0.5, R=185;
  const gapA=Math.PI*0.15, gapB=Math.PI*1.15, gapW=0.42;   // two gaps in the ring
  for(let a=0; a<Math.PI*2; a+=0.32){
    if(Math.abs(((a-gapA+Math.PI)%(Math.PI*2))-Math.PI)<gapW) continue;
    if(Math.abs(((a-gapB+Math.PI)%(Math.PI*2))-Math.PI)<gapW) continue;
    const x=cx+Math.cos(a)*R, y=cy+Math.sin(a)*R;
    worldObjects.push({kind:'rockcluster',x,y,seed:rnd()*100});
    addCollider(x-24,y-2,48,16);
  }

  // ---- maze clumps through the outer hollow ----
  for(let i=0;i<9;i++){
    const p=rand2(60,60,W*0.6,H-60,150,taken); taken.push(p);
    if(Math.hypot(p.x-cx,p.y-cy)<R+40) continue;   // keep the chamber approach clear-ish
    worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:rnd()*100});
    addCollider(p.x-24,p.y-2,48,16);
  }

  // ---- giant mushrooms, fairy rings + damp forest floor ----
  for(let i=0;i<34;i++){ const p=pt(40); worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:rnd()<0.55}); }
  for(let i=0;i<8;i++){ const p=pt(80); taken.push(p); worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:rnd()*100}); }
  for(let i=0;i<14;i++){ const p=pt(70); taken.push(p); worldObjects.push({kind:'willow',x:p.x,y:p.y}); addCollider(p.x-8,p.y+19,16,15); }
  for(let i=0;i<8;i++){ const p=pt(90); taken.push(p); worldObjects.push({kind:'log',x:p.x,y:p.y,seed:rnd()*100}); addCollider(p.x-16,p.y-1,32,9); }
  for(let i=0;i<6;i++){ const p=pt(80); taken.push(p); worldObjects.push({kind:'stump',x:p.x,y:p.y,seed:rnd()*100}); addCollider(p.x-8,p.y-1,16,10); }
  for(let i=0;i<20;i++){ const p=pt(46); worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:rnd()*100}); }

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.fungushollow = buildFungusHollow;
