// ====================== TERRAIN: FIREFLY GROVE ======================
// The luminous clearing that ends the Whispering Woods (Whispering Woods 3) — the calm before
// the Old Grizzly. A serene moonlit glade, open in the middle for the shrine (three shrine
// lanterns + fireflies get placed from the level config), ringed by soft woodland. The Moonlit
// Rite plays out here: relight the three lanterns, dodging the guardian's patrol, to awaken
// the Ultimate. Butterflies stand in for drifting fireflies; existing draw kinds only.

function buildFireflyGrove(){
  worldObjects.length=0; colliders.length=0;
  const W=WORLD_W, H=WORLD_H; river=null;

  addCollider(0,0,W,14); addCollider(0,H-14,W,14);
  addCollider(0,0,14,H); addCollider(W-14,0,14,H);

  const taken=[];
  const cx=W*0.5, cy=H*0.5, clear=300;                 // keep the shrine clearing open
  const pt=(minD)=>{
    for(let a=0;a<40;a++){ const p=rand2(40,40,W-40,H-40,minD,taken); if(Math.hypot(p.x-cx,p.y-cy)>clear) return p; }
    return rand2(40,40,W-40,H-40,minD,taken);
  };

  // ---- soft woodland ring: willows, oaks, pines around the glade ----
  for(let i=0;i<16;i++){ const p=pt(96); taken.push(p); worldObjects.push({kind:'willow',x:p.x,y:p.y}); addCollider(p.x-8,p.y+19,16,15); }
  for(let i=0;i<14;i++){ const p=pt(88); taken.push(p); worldObjects.push({kind:'oak',x:p.x,y:p.y,variant:Math.floor(rnd()*3)}); addCollider(p.x-7,p.y+19,14,13); }
  for(let i=0;i<10;i++){ const p=pt(80); taken.push(p); worldObjects.push({kind:'pine',x:p.x,y:p.y}); addCollider(p.x-4,p.y+15,8,10); }

  // ---- forest floor + a stone approach to the shrine ----
  worldObjects.push({kind:'stonepath',x1:W*0.12,y1:cy,x2:cx-90,y2:cy,seed:41});
  worldObjects.push({kind:'stonepath',x1:cx,y1:H*0.16,x2:cx,y2:cy-90,seed:42});
  for(let i=0;i<10;i++){ const p=pt(70); worldObjects.push({kind:'mushroomring',x:p.x,y:p.y,seed:rnd()*100}); }
  for(let i=0;i<18;i++){ const p=pt(40); worldObjects.push({kind:'mushroom',x:p.x,y:p.y,big:rnd()<0.3}); }
  for(let i=0;i<24;i++){ const p=rand2(30,30,W-30,H-30,34,[]); worldObjects.push({kind:'tallgrass',x:p.x,y:p.y,blades:Math.floor(rand(5,10)),seed:rnd()*100}); }

  // ---- drifting fireflies (butterflies recoloured pale-gold/violet by the theme's mood) ----
  const hues=['#FFF3B0','#E7D6FF','#CDE8B0','#FFE9A0'];
  for(let i=0;i<22;i++){
    worldObjects.push({kind:'butterfly', x:rand(60,W-60), y:rand(60,H-60), hue:hues[Math.floor(rnd()*hues.length)], seed:rnd()*1000});
  }

  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
}

TERRAIN.fireflygrove = buildFireflyGrove;
