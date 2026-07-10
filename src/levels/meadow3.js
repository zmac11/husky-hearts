// ====================== LEVEL: OLD ORCHARD PATH (Sunny Meadows 3) ======================
// The last friendly step before the mountains. Still cozy, but it eases the player toward
// the tougher biome ahead: reinforces the shop + wearables (both merchants are here), a
// single SLOW badger reminds them enemies exist and hearts matter, and the meadow's ponds
// + bridges give a low-stakes place to practise crossing water. Reuses the meadow terrain
// generator (buildWorld) and plants extra oak "orchard" clusters over it.

// Keep augment-planted oaks out of the water (buildWorld's own placement already does this
// for its objects; ours needs the same guard).
function _orchardClearOfWater(x, y, m){
  if(typeof inRiver==='function' && inRiver(x, y, m)) return false;
  return !worldObjects.some(o => o.kind==='pond' &&
    ((x-o.x)/(o.w/2+m))**2 + ((y-o.y)/(o.h/2+m))**2 < 1);
}

Levels.register({
  id: 'meadow-3',
  name: 'Old Orchard Path',
  seed: 20241,
  size: { w: 1760, h: 1200 },
  spawn: { x: 200, y: 200 },
  next: 'rocky',                      // the trail out of the meadows climbs into the mountains

  // Warmer, late-summer palette.
  theme: {
    grass:'#9CCB6E', grassDark:'#8ABF5C', grassLight:'#B0D982',
    dirt:'rgba(196,150,96,0.18)',
    fenceA:'#7E5632', fenceB:'#946439', rail:'#BE8C48',
    minimapGrass:'#4E9838', minimapWater:'#4AACDC',
  },

  generate(){
    buildWorld();
    // Orchard clusters — extra oaks (with a toadstool or two at the base) dotted around.
    for(let i=0;i<10;i++){
      let x, y, ok=false;
      for(let a=0;a<30 && !ok; a++){
        x=rand(90,WORLD_W-90); y=rand(90,WORLD_H-90);
        ok=_orchardClearOfWater(x,y,40);
      }
      worldObjects.push({kind:'oak', x, y, variant:Math.floor(Math.random()*3)});
      addCollider(x-7, y+19, 14, 13);
      if(Math.random()<0.7) worldObjects.push({kind:'mushroom', x:x+rand(-22,22), y:y+rand(20,34), big:Math.random()<0.3});
    }
    worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));

    collectibles = makeCollectibles();

    // Four friends needing three treats each — a small step up from the field.
    friends = [
      {name:'Prickle the Hedgehog', x:WORLD_W*0.22, y:WORLD_H*0.28, need:3,given:0,cheered:false,kind:'hedgehog', msg:"Oh! You startled me... got a treat?"},
      {name:'Shelly the Tortoise',  x:WORLD_W*0.80, y:WORLD_H*0.30, need:3,given:0,cheered:false,kind:'tortoise', msg:"Slow day in the orchard, isn't it?"},
      {name:'Clover Bunny',         x:WORLD_W*0.28, y:WORLD_H*0.78, need:3,given:0,cheered:false,kind:'bunny',    msg:"These apples aren't ripe yet..."},
      {name:'Robin the Bird',       x:WORLD_W*0.76, y:WORLD_H*0.76, need:3,given:0,cheered:false,kind:'bird',     msg:"Chirp! My nest could use some cheer."},
    ];

    Entities.clear();
    // Both merchants — reinforce buying treats/consumables and trying on wearables.
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.28,
      name: 'Marla the Merchant',
      greeting: "Stock up before the trail, pup — biscuits keep your hearts full!",
      wares: [ {id:'biscuit', cost:3}, {id:'trailmix', cost:4}, {id:'ribbon', cost:5} ],
    });
    Entities.spawn('npc', {
      x: WORLD_W*0.62, y: WORLD_H*0.5,
      name: 'Fenwick the Tailor',
      look: 'tailor',
      greeting: "Heading for the mountains? Let's find you something warm to wear!",
      wares: [
        {id:'ballcap', cost:6}, {id:'scarf', cost:6}, {id:'shades', cost:7},
        {id:'raincoat',cost:9}, {id:'cape',  cost:10},
      ],
    });
    // One slow, easy badger — a gentle reminder that enemies (and hearts) exist.
    Entities.spawn('enemy', { x: WORLD_W*0.5, y: WORLD_H*0.6, speed:0.8, chaseR:90 });
    // A friendly squirrel keeps the orchard cheerful.
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.4, y:WORLD_H*0.4 });
  },

  quest: {
    id: 'cheer-all-meadow3',
    label: 'Cheer up every friend in the orchard',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});
