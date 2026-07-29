// ====================== TERRAIN: CLIFFSIDE CLIMB ======================
// The white-knuckle ascent that ends the Rocky Mountains before the Alpha Wolf (Rocky
// Mountains 3). A TALL, narrow map read as a climb: a run of rocky ledge-walls with gaps
// that alternate side to side, so the only way up is to weave back and forth — a switchback.
// Falling rocks roll down the open lanes (entities/rockfall.js) and wolves hold the ledges.
//
// Verticality is a top-down conceit here: the ledge-walls (colliders topped with boulders)
// force the zig-zag, snow thins toward the summit, and the summit peaks sit at the top edge.
// Uses only existing world-draw kinds, so no new rendering.

function buildCliffside(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H; river=null;

  // border
  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  // ---- summit peaks along the very top; the summit ledge is a solid wall you crest ----
  for(let i=0;i<3;i++){
    const mx=W*(0.22+i*0.28)+rand(-16,16);
    worldObjects.push({kind:'mountain',x:mx,y:rand(210,224),w:rand(360,460),h:rand(150,182),seed:Math.floor(rnd()*9999)});
  }

  // ---- switchback ledge-walls: horizontal barriers with an alternating gap ----
  // Each wall spans the width except for a gap (left on even rows, right on odd), so the
  // climb weaves. Walls are decorated with boulders so they read as rocky ledges.
  const rows=5, GAP=150, top=430, step=(H-620)/(rows-1);
  for(let r=0;r<rows;r++){
    const wy=Math.round(top + r*step);
    const gapLeft=(r%2===0);
    const gapX=Math.round(gapLeft ? W*0.20 : W*0.80);
    if(gapLeft) addCollider(gapX+GAP, wy, W-(gapX+GAP)-14, 22);
    else        addCollider(14,       wy, gapX-GAP-14,     22);
    // boulders capping the wall (skip the gap)
    for(let x=44; x<W-44; x+=68){
      if(Math.abs(x-gapX)<GAP) continue;
      worldObjects.push({kind:'boulder',x,y:wy+6,big:rnd()<0.45});
    }
  }

  // ---- scattered snowy cover on the ledges (no colliders — decoration) ----
  const taken=[];
  const pt=(minD)=>rand2(30,250,W-30,H-40,minD,taken);
  for(let i=0;i<14;i++){ const p=pt(90); taken.push(p); worldObjects.push({kind:'snowypine',x:p.x,y:p.y}); addCollider(p.x-4,p.y+14,8,9); }
  for(let i=0;i<10;i++){ const p=pt(70); taken.push(p); worldObjects.push({kind:'rockcluster',x:p.x,y:p.y,seed:rnd()*100}); addCollider(p.x-24,p.y-2,48,16); }
  for(let i=0;i<12;i++){ const p=pt(50); const big=rnd()<0.25; worldObjects.push({kind:'rock',x:p.x,y:p.y,big}); if(big) addCollider(p.x-12,p.y+2,24,12); }
  for(let i=0;i<5;i++){ const p=pt(80); taken.push(p); worldObjects.push({kind:'deadtree',x:p.x,y:p.y}); addCollider(p.x-6,p.y+18,12,11); }
  for(let i=0;i<24;i++) worldObjects.push({kind:'snowpatch',x:rand(30,W-30),y:rand(250,H-30),seed:rnd()*100});
  for(let i=0;i<7;i++){ const p=pt(90); worldObjects.push({kind:'crystal',x:p.x,y:p.y,seed:rnd()*100}); }

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.cliffside = buildCliffside;
