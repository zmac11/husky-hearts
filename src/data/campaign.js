// ====================== CAMPAIGN (data) ======================
// The overall journey shown on the world map (world-map.js). The game is organised into
// ENVIRONMENTS (biomes). The long-term design is that each environment holds 3 normal
// levels + 1 boss "mini-level" (kind:'boss'); clearing the boss unlocks the next biome.
//
// Only levels with `real:true` are actually registered/playable right now (see
// levels/*.js); everything else is a placeholder so the map can preview the road ahead
// as "coming soon". To ship a new level: build it in src/levels/, register it, then flip
// its placeholder entry here to `real:true` and give it the matching id.
//
// For testing, the meadow currently leads straight to the mountains (meadow.next →
// 'rocky'), so the two real levels sit as the first node of the first two environments.

const Campaign = {
  environments: [
    { id:'meadow', name:'Sunny Meadows', icon:'🌳', color:'#9ED87A', boss:'The Badger Baron',
      levels:[
        { id:'meadow',      name:'Sunny Meadow',    kind:'level', real:true },
        { id:'meadow-2',    name:'Wildflower Field', kind:'level', real:true },
        { id:'meadow-3',    name:'Old Orchard Path', kind:'level', real:true },
        { id:'meadow-boss', name:'The Badger Baron',  kind:'boss', real:true },
      ] },
    { id:'mountains', name:'Rocky Mountains', icon:'⛰️', color:'#A6A29B', boss:'The Alpha Wolf',
      levels:[
        { id:'rocky',       name:'Rocky Mountains', kind:'level', real:true },
        { id:'rocky-2',     name:'Frozen Pass',     kind:'level', real:true },
        { id:'rocky-3',     name:'Cliffside Climb',  kind:'level', real:true },
        { id:'rocky-boss',  name:'The Alpha Wolf',   kind:'boss' },
      ] },
    { id:'woods', name:'Whispering Woods', icon:'🌲', color:'#6FA86A', boss:'The Old Grizzly',
      levels:[
        { id:'woods-1', name:'Mossy Trail',   kind:'level', real:true },
        { id:'woods-2', name:'Fungus Hollow', kind:'level', real:true },
        { id:'woods-3', name:'Firefly Grove', kind:'level', real:true },
        { id:'woods-boss', name:'The Old Grizzly', kind:'boss' },
      ] },
    { id:'cove', name:'Seashell Cove', icon:'🏖️', color:'#F0D9A8', boss:'The Giant Hermit Crab',
      levels:[
        { id:'cove-1', name:'Tide Pools',     kind:'level' },
        { id:'cove-2', name:'Palm Boardwalk', kind:'level' },
        { id:'cove-3', name:'Coral Sands',    kind:'level' },
        { id:'cove-boss', name:'The Giant Hermit Crab', kind:'boss' },
      ] },
    { id:'orchard', name:'Amber Orchard', icon:'🍂', color:'#E0A85A', boss:'The Scarecrow King',
      levels:[
        { id:'orchard-1', name:'Pumpkin Patch', kind:'level' },
        { id:'orchard-2', name:'Haybale Maze',  kind:'level' },
        { id:'orchard-3', name:'Cider Mill',    kind:'level' },
        { id:'orchard-boss', name:'The Scarecrow King', kind:'boss' },
      ] },
    { id:'dunes', name:'Golden Dunes', icon:'🏜️', color:'#E8C87A', boss:'The Sand Serpent',
      levels:[
        { id:'dunes-1', name:'Dune Sea',      kind:'level' },
        { id:'dunes-2', name:'Hidden Oasis',  kind:'level' },
        { id:'dunes-3', name:'Ancient Ruins', kind:'level' },
        { id:'dunes-boss', name:'The Sand Serpent', kind:'boss' },
      ] },
    { id:'tundra', name:'Frostfang Tundra', icon:'❄️', color:'#CFE0EC', boss:'The Ice Yeti',
      levels:[
        { id:'tundra-1', name:'Icy Flats',    kind:'level' },
        { id:'tundra-2', name:'Aurora Fields', kind:'level' },
        { id:'tundra-3', name:'Glacier Cave',  kind:'level' },
        { id:'tundra-boss', name:'The Ice Yeti', kind:'boss' },
      ] },
    { id:'sky', name:'Cloud Kingdom', icon:'☁️', color:'#C9BEF0', boss:'The Storm Eagle',
      levels:[
        { id:'sky-1', name:'Sky Steps',      kind:'level' },
        { id:'sky-2', name:'Floating Isles', kind:'level' },
        { id:'sky-3', name:'Storm Peak',     kind:'level' },
        { id:'sky-boss', name:'The Storm Eagle', kind:'boss' },
      ] },
  ],

  // Which environment (index) owns a given level id (0 if not found).
  envIndexOfLevel(levelId){
    for(let i=0;i<this.environments.length;i++){
      if(this.environments[i].levels.some(l=>l.id===levelId)) return i;
    }
    return 0;
  },

  // The environment object that owns a level.
  envOfLevel(levelId){ return this.environments[this.envIndexOfLevel(levelId)]; },

  // Is this the LAST playable (real) level of its biome? Until boss fights exist,
  // clearing it counts as finishing the biome → the exit portal gets a golden chest.
  isFinalRealLevel(levelId){
    const env=this.envOfLevel(levelId);
    const real=env.levels.filter(l=>l.real);
    return real.length>0 && real[real.length-1].id===levelId;
  },

  // Is this level a biome boss? (Passing the first boss awakens the dog's abilities.)
  isBoss(levelId){
    for(const env of this.environments){
      const l=env.levels.find(x=>x.id===levelId);
      if(l) return l.kind==='boss';
    }
    return false;
  },
};

// Campaign progress: which level ids the player has cleared this run. Persisted in the
// save (save.js) and reset when starting a brand-new game (charselect resetGame).
const Progress = {
  completed: {},
  markComplete(id){ if(id) this.completed[id] = true; },
  isDone(id){ return !!this.completed[id]; },
  reset(){ this.completed = {}; },
  countDone(ids){ return ids.filter(id => this.completed[id]).length; },
};
