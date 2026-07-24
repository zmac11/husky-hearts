// ====================== ABILITY REGISTRY ======================
// Active abilities are plugins keyed by id. A breed opts in via its `abilities`
// slots (see data/breeds.js): slot 0 fires on the "Ability 1" key (default Q),
// slot 1 on "Ability 2" (default E). Each ability def may implement any of:
//
//   spawn()                 — create world state at game/level start (all abilities polled)
//   reset()                 — clear world state on reset
//   update(p, dt, trigger)  — per-player, per-frame logic (only for the owning player);
//                             `trigger` is the input action that fires this slot
//                             ('ability1' | 'ability2') — check it via Input.held(trigger)
//   drawWorld(t)            — world-space visuals, drawn once per frame
//   drawOnDog(p, x, by)     — overlay drawn on top of a specific dog sprite
//
// This replaces the bespoke Lolla globals: the ball-cannon is now just the first
// registered ability (abilities/ballCannon.js).

const Abilities = {
  _defs: {},

  register(id, def){ this._defs[id] = def; return def; },
  get(id){ return id ? (this._defs[id] || null) : null; },
  // Does this player carry the given ability in either slot?
  playerHas(p, id){ return !!(p && p.abilities && p.abilities.indexOf(id)!==-1); },

  // Poll every registered ability; each guards internally on whether its owner exists.
  spawnAll(){ for(const id in this._defs){ const d=this._defs[id]; if(d.spawn) d.spawn(); } },
  reset(){ for(const id in this._defs){ const d=this._defs[id]; if(d.reset) d.reset(); } },

  // ---- shared cooldowns ----
  // Per-player, per-ability cooldowns live in p.abilityCd (plain ms map, initialised
  // by makePlayer; deliberately NOT saved — cooldowns reset on load). Ticked here so
  // every ability def gets them for free.
  cdLeft(p, id){ return (p && p.abilityCd && p.abilityCd[id]) || 0; },
  // Called the moment an ability fires (each ability starts its cooldown here) — a handy
  // single spot to teach the ability system the first time any ability is used.
  startCd(p, id, ms){ (p.abilityCd || (p.abilityCd={}))[id]=ms; if(typeof Tips!=='undefined') Tips.show('ability'); },

  update(p, dt){
    if(p.abilityCd) for(const id in p.abilityCd){ if(p.abilityCd[id]>0) p.abilityCd[id]=Math.max(0, p.abilityCd[id]-dt); }
    (p.abilities||[]).forEach((id,slot)=>{
      const d=this.get(id); if(d && d.update) d.update(p, dt, 'ability'+(slot+1));
    });
  },
  drawWorld(t){ for(const id in this._defs){ const d=this._defs[id]; if(d.drawWorld) d.drawWorld(t); } },
  drawOnDog(p, x, by){
    (p.abilities||[]).forEach(id=>{
      const d=this.get(id); if(d && d.drawOnDog) d.drawOnDog(p, x, by);
    });
  },
};
