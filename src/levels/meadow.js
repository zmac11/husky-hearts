// ====================== LEVEL: SUNNY MEADOW ======================
// Level 1. Wraps the existing world generators (buildWorld / makeCollectibles /
// makeFriends) so the current layout logic is unchanged — the level system just
// gives it a name, size, visual theme, and a completion quest. A second level is
// now a sibling file: declare a different theme/generate/quest and register it.

Levels.register({
  id: 'meadow',
  name: 'Sunny Meadow',
  seed: 12345,                 // reserved for future seeded generation (LevelManager reseeds RNG)
  size: { w: 1920, h: 1280 },

  // Visual palette — moved out of world-draw.js so different levels look different.
  theme: {
    grass:'#9ED87A', grassDark:'#8DCF6A', grassLight:'#AADE88',
    dirt:'rgba(190,155,100,0.15)',
    fenceA:'#8B6340', fenceB:'#A07040', rail:'#C4904A',
    minimapGrass:'#4A9A3A', minimapWater:'#4AACDC',
  },

  // Populate world objects + colliders + entities. Runs after WORLD_W/H are set and
  // RNG is reseeded (see level-manager.js).
  generate(){
    buildWorld();
    collectibles = makeCollectibles();
    friends = makeFriends();

    // Dynamic entities (registry-driven). Placed on open ground near the map centre.
    Entities.clear();
    Entities.spawn('npc', {
      x: WORLD_W*0.5, y: WORLD_H*0.30,
      name: 'Marla the Merchant',
      greeting: "Welcome, pup! Fresh biscuits to keep your tail wagging.",
      wares: [ {id:'biscuit', cost:3}, {id:'ribbon', cost:5} ],
    });
    // Fenwick the Tailor — sells wearables (head/face/neck/body/back) for testing the
    // equip + on-dog-render feature. Warm-toned merchant near the centre-west.
    Entities.spawn('npc', {
      x: WORLD_W*0.36, y: WORLD_H*0.42,
      name: 'Fenwick the Tailor',
      greeting: "Ah, a pup with style! Try something on — it'll look grand on you.",
      look: 'tailor',
      wares: [
        {id:'tophat',  cost:8},  {id:'ballcap', cost:6}, {id:'shades', cost:7},
        {id:'scarf',   cost:6},  {id:'raincoat',cost:9}, {id:'cape',   cost:10},
      ],
    });
    Entities.spawn('enemy', { x: WORLD_W*0.32, y: WORLD_H*0.72, speed: 0.9 });
  },

  // Completion condition (the "quest"). checkWin() consults this.
  quest: {
    id: 'cheer-all',
    label: 'Cheer up every lonely friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${CHEER_TOTAL} friends`; },
    isComplete(){ return Game.cheeredCount >= CHEER_TOTAL; },
  },
});
