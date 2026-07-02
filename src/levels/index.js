// ====================== LEVELS REGISTRY ======================
// Levels register themselves here (see levels/meadow.js). Adding a new level =
// a new file that declares its size/theme/quest/generate and calls Levels.register().

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
