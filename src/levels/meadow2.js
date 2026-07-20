// ====================== LEVEL: WILDFLOWER FIELD (Sunny Meadows 2) ======================
// The second step of the friendly Sunny Meadows biome — a bright, safe flower field with
// NO enemies. Its teaching job is the gentle stuff: keep practising collect→deliver, and
// meet the FRIENDLY WILDLIFE for the first time (ducks on the ponds, squirrels in the
// grass) so the player learns the positive "greet" interaction before it matters in the
// mountains. Reuses the meadow terrain generator (buildWorld) and carpets it in flowers.

Levels.register({
  id: 'meadow-2',
  name: 'Wildflower Field',
  seed: 13579,
  size: { w: 1600, h: 1120 },        // cozy and easy to explore
  spawn: { x: 200, y: 200 },
  next: 'meadow-3',

  // Bright spring palette.
  theme: {
    grass:'#A6DE86', grassDark:'#96D573', grassLight:'#BCEA98',
    dirt:'rgba(210,160,120,0.14)',
    fenceA:'#9A7048', fenceB:'#B0824E', rail:'#D4A45E',
    minimapGrass:'#5AAA46', minimapWater:'#4AACDC',
  },

  generate(){
    buildWorld();
    // Carpet the field in extra wildflowers — this is the wildflower field, after all.
    const hues=['#FF8FA3','#FFD93D','#C9A6FF','#FFB199','#FF6B81','#A8E6CF','#FF9EC0','#B6E36A','#FFE066'];
    for(let i=0;i<130;i++){
      let fx,fy;
      for(let a=0;a<20;a++){ fx=rand(30,WORLD_W-30); fy=rand(30,WORLD_H-30); if(!isWater(fx,fy,4)) break; }
      if(isWater(fx,fy,4)) continue;   // keep wildflowers on dry land
      worldObjects.push({kind:'flower', x:fx, y:fy,
        hue:hues[Math.floor(Math.random()*hues.length)], sway:rand(0,Math.PI*2), size:rand(0.7,1.4)});
    }
    worldObjects.sort((a,b)=>(a.y||a.y1||0)-(b.y||b.y1||0));

    collectibles = makeCollectibles();

    // Just three friends, each needing only a couple of treats — an easy, encouraging clear.
    friends = [
      {name:'Sunny the Cat',  x:WORLD_W*0.24, y:WORLD_H*0.30, need:2,given:0,cheered:false,kind:'cat',   msg:"Ooh, are those treats for me?"},
      {name:'Hoppy Bunny',    x:WORLD_W*0.78, y:WORLD_H*0.34, need:2,given:0,cheered:false,kind:'bunny', msg:"I'd love a snack, thank you!"},
      {name:'Chirpy Bird',    x:WORLD_W*0.5,  y:WORLD_H*0.74, need:3,given:0,cheered:false,kind:'bird',  msg:"Tweet! Any treats to share?"},
    ];

    Entities.clear();
    // A friendly merchant to reinforce the shop.
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.30,
      name: 'Marla the Merchant',
      greeting: "Lovely day for a stroll! Fresh biscuits and ribbons here.",
      wares: [ {id:'biscuit', cost:3}, {id:'ribbon', cost:5} ],
    });

    // A quest-giver (yellow "!"): bring her some bones and she rewards you with treats.
    // This is the first of a growing set of quest types — see src/quests.js.
    Entities.spawn('npc', {
      x: WORLD_W*0.30, y: WORLD_H*0.40,
      name: 'Nella the Nurse',
      look: 'tailor',
      greeting: "Hello, dear pup!",
      quest: {
        id: 'nella-bones', type: 'give', give: { item:'bone', count:3 },
        offer:    "Oh, hello dear! My little pups are so hungry — could you fetch me 3 🦴 bones?",
        ready:    "Three whole bones? You're a darling — may I take them?",
        progress: "Still hunting for bones? I need 3 in all. Thank you, pup!",
        done:     "Bless you! The pups are chewing away happily now. 💛",
        reward:   { treats: 6 },
      },
    });

    // Friendly wildlife — walk up and press the action key to greet them. No enemies here.
    const ponds = worldObjects.filter(o=>o.kind==='pond');
    if(ponds[0]) Entities.spawn('critter', { species:'duck', x:ponds[0].x, y:ponds[0].y });
    if(ponds[1]) Entities.spawn('critter', { species:'duck', x:ponds[1].x, y:ponds[1].y });
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.68, y:WORLD_H*0.62 });
    Entities.spawn('critter', { species:'squirrel', x:WORLD_W*0.30, y:WORLD_H*0.58 });

    Chests.spawnForLevel('meadow-2');   // buried treasure — first iron chest
  },

  quest: {
    id: 'cheer-all-meadow2',
    label: 'Cheer up every friend in the field',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});
