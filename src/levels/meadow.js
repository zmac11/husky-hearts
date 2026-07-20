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
  spawn: { x: 200, y: 200 },   // where the dogs start on this level
  next: 'meadow-2',            // on through the Sunny Meadows learning biome

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

    // The very first level is pure basics — just wander, collect treats, and cheer up
    // friends. No merchants and no enemies yet; those are introduced in later levels
    // (shops in Wildflower Field, a first gentle enemy in Old Orchard Path).
    Entities.clear();
    Chests.spawnForLevel('meadow');   // a couple of buried wooden chests to sniff out
  },

  // Completion condition (the "quest"). checkWin() consults this.
  quest: {
    id: 'cheer-all',
    label: 'Cheer up every lonely friend',
    describe(){ return `Cheered ${Game.cheeredCount}/${friends.length} friends`; },
    isComplete(){ return friends.length>0 && Game.cheeredCount >= friends.length; },
  },
});
