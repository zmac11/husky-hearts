// ====================== AUGMENT: ORCHARD ======================
// Decoration layered on the meadow terrain for the Old Orchard Path (see the "meadow-3"
// entry in src/config/levels.json). Dots the field with extra oak clusters — each an oak
// (with a trunk collider) and often a toadstool at its base — kept out of the water.
// Runs after the terrain builder, inside the seeded generation window.

// Keep augment-planted oaks out of the water (buildWorld's own placement already does this
// for its objects; ours needs the same guard).
function _orchardClearOfWater(x, y, m){
  if(typeof inRiver==='function' && inRiver(x, y, m)) return false;
  return !worldObjects.some(o => o.kind==='pond' &&
    ((x-o.x)/(o.w/2+m))**2 + ((y-o.y)/(o.h/2+m))**2 < 1);
}

AUGMENTS.orchard = function(){
  for(let i=0;i<10;i++){
    let x, y, ok=false;
    for(let a=0;a<30 && !ok; a++){
      x=rand(90,WORLD_W-90); y=rand(90,WORLD_H-90);
      ok=_orchardClearOfWater(x,y,40);
    }
    worldObjects.push({kind:'oak', x, y, variant:Math.floor(rnd()*3)});
    addCollider(x-7, y+19, 14, 13);
    if(rnd()<0.7) worldObjects.push({kind:'mushroom', x:x+rand(-22,22), y:y+rand(20,34), big:rnd()<0.3});
  }
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
};
