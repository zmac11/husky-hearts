// ====================== LEVELS REGISTRY ======================
// Levels are authored as data in src/config/levels.json and registered by
// levels/from-config.js. The three registries below are the code hooks that data points
// at by name — terrain generators and decorators (which are procedural, so they stay
// code) and quest types (completion logic). Level files populate these:
//   TERRAIN.meadow  = buildWorld        (levels/meadow.js)
//   AUGMENTS.orchard = function(){...}  (levels/meadow3.js)
//   QUEST_TYPES['cheer-all'] = {...}    (levels/from-config.js)

const TERRAIN     = {};   // id → function() building worldObjects/colliders/river
const AUGMENTS    = {};   // id → function() adding extra decoration after terrain
const QUEST_TYPES = {};   // type → { describe(level), isComplete(level) }

const Levels = {
  _byId: {},
  _order: [],

  register(level){
    if(!this._byId[level.id]) this._order.push(level.id);
    this._byId[level.id] = level;
    return level;
  },
  get(id){ return this._byId[id] || null; },
  first(){ return this._byId[this._order[0]] || null; },
  ids(){ return this._order.slice(); },
};
