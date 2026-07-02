// ====================== ABILITY REGISTRY ======================
// Active abilities are plugins keyed by id. A breed opts in via its `abilityId`
// (see data/breeds.js). Each ability def may implement any of:
//
//   spawn()               — create world state at game/level start (all abilities polled)
//   reset()               — clear world state on reset
//   update(p, controls, dt) — per-player, per-frame logic (only for the owning player)
//   drawWorld(t)          — world-space visuals, drawn once per frame
//   drawOnDog(p, x, by)   — overlay drawn on top of a specific dog sprite
//
// This replaces the bespoke Lolla globals: the ball-cannon is now just the first
// registered ability (abilities/ballCannon.js).

const Abilities = {
  _defs: {},

  register(id, def){ this._defs[id] = def; return def; },
  get(id){ return id ? (this._defs[id] || null) : null; },
  forPlayer(p){ return this.get(p && p.abilityId); },

  // Poll every registered ability; each guards internally on whether its owner exists.
  spawnAll(){ for(const id in this._defs){ const d=this._defs[id]; if(d.spawn) d.spawn(); } },
  reset(){ for(const id in this._defs){ const d=this._defs[id]; if(d.reset) d.reset(); } },

  update(p, controls, dt){ const d=this.forPlayer(p); if(d && d.update) d.update(p, controls, dt); },
  drawWorld(t){ for(const id in this._defs){ const d=this._defs[id]; if(d.drawWorld) d.drawWorld(t); } },
  drawOnDog(p, x, by){ const d=this.forPlayer(p); if(d && d.drawOnDog) d.drawOnDog(p, x, by); },
};
