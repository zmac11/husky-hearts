// ====================== AUGMENT: WILDFLOWERS ======================
// Decoration layered on the meadow terrain for the Wildflower Field (see the "meadow-2"
// entry in src/config/levels.json). Carpets the field in extra wildflowers on dry land.
// Runs after the terrain builder, inside the seeded generation window, so it uses rnd()/
// rand() like the rest of world generation.

AUGMENTS.wildflowers = function(){
  const hues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF','#FF9EC0','#B6E36A','#FFE066'];
  for(let i=0;i<130;i++){
    let fx,fy;
    for(let a=0;a<20;a++){ fx=rand(30,WORLD_W-30); fy=rand(30,WORLD_H-30); if(!isWater(fx,fy,4)) break; }
    if(isWater(fx,fy,4)) continue;   // keep wildflowers on dry land
    worldObjects.push({kind:'flower', x:fx, y:fy,
      hue:hues[Math.floor(rnd()*hues.length)], sway:rand(0,Math.PI*2), size:rand(0.7,1.4)});
  }
  worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));
};
