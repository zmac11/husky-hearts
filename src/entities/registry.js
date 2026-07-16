// ====================== ENTITIES ======================
// Level-owned dynamic actors (enemies, NPCs, and future kinds). Each entity is a
// plain data object with a `kind`; its behaviour comes from a def registered here.
// Adding a new kind of thing in the world = register a kind + spawn instances from a
// level's generate(). (Collectibles and friends predate this system and keep their
// own specialised arrays for now; they can fold into this registry later.)
//
// A def may implement:
//   init(e)            — one-time setup when spawned
//   update(e, t, dt)   — per-frame logic
//   draw(e, t)         — world-space render (y-sorted with players in the main loop)
//   onInteract(e, p)   — called when player p interacts (action key) within range
//   radius             — default interaction radius

let entities = [];   // rebuilt per level by generate() via Entities.clear()/spawn()

const Entities = {
  _kinds: {},

  register(kind, def){ this._kinds[kind] = def; return def; },
  def(kind){ return this._kinds[kind] || null; },

  spawn(kind, props){
    const e = Object.assign({ kind }, props);
    const d = this.def(kind);
    if(d && d.init) d.init(e);
    entities.push(e);
    return e;
  },
  clear(){ entities.length = 0; },
  all(){ return entities; },

  updateAll(t, dt){ for(const e of entities){ const d=this.def(e.kind); if(d && d.update) d.update(e, t, dt); } },

  // How "loud" this dog currently is: scales every enemy's own detection range.
  // Base comes from the breed's noise bar (data/breeds.js → stats.noiseMul); howling
  // is extra noise — for HOWL_NOISE_MS after a howl starts (p.noiseT echo window,
  // see update.js) the dog is heard from 1.5× as far, so howls near enemies are risky.
  noiseFactor(p){
    const boosted = p && (p.howling || p.noiseT>0);
    return ((p && p.stats && p.stats.noiseMul) || 1) * (boosted ? 1.5 : 1);
  },

  // "!" pop above an entity that just noticed a dog. Set `e.alertT=700` on the
  // wander→chase transition; call this from the entity's draw() while it counts down.
  drawAlert(e){
    if(!e.alertT || e.alertT<=0) return;
    const age=700-e.alertT;
    const pop=Math.min(1, age/140);              // pop-in scale
    const fade=Math.min(1, e.alertT/180);        // fade-out at the end
    const y=e.y-26-pop*5+Math.sin(age/90)*1.5;   // little startled bounce
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.translate(e.x, y); ctx.scale(pop||0.01, pop||0.01);
    ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('!',0,0);
    ctx.fillStyle='#E03030'; ctx.fillText('!',0,0);
    ctx.restore();
  },

  // Nearest interactable entity to player p within range.
  interactableNear(p){
    let best=null, bestD=Infinity;
    for(const e of entities){
      const d=this.def(e.kind);
      if(!d || !d.onInteract) continue;
      const r=e.radius || d.radius || 36;
      const dist=Math.hypot(p.x-e.x, p.y-e.y);
      if(dist<r && dist<bestD){ best=e; bestD=dist; }
    }
    return best;
  },
  interact(p){
    const e=this.interactableNear(p);
    if(e){ this.def(e.kind).onInteract(e, p); return true; }
    return false;
  },
};
