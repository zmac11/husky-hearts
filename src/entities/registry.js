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
  remove(e){ const i=entities.indexOf(e); if(i!==-1) entities.splice(i,1); },

  // Damage an entity (turret balls, future traps…): red flash, knockback shove away
  // from (fromX,fromY) — skipped for future bosses via e.noKnockback — and on 0 hp a
  // defeat poof with a small chance of dropped loot. Call OUTSIDE updateAll's loop.
  hurt(e, dmg, fromX, fromY, knock=12){
    if(typeof e.hp!=='number') return false;    // not a damageable entity
    e.hp -= dmg;
    e.hurtT = 220;
    if(!e.noKnockback && typeof fromX==='number'){
      const ang=Math.atan2(e.y-fromY, e.x-fromX);
      e.x=clamp(e.x+Math.cos(ang)*knock, 20, WORLD_W-20);
      e.y=clamp(e.y+Math.sin(ang)*knock, 26, WORLD_H-20);
    }
    if(e.hp<=0){
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#C9C9C9', 20);
      if(Math.random()<0.4){
        collectibles.push({ x:e.x, y:e.y, type:'bone', taken:false, bob:rand(0,Math.PI*2),
                            pickupAt:performance.now()+600 });
      }
      this.remove(e);
      if(typeof sfxDeliver==='function') sfxDeliver();
      showToast('💨 The '+(e.kind==='wolf'?'wolf':'badger')+' ran off!', 1400);
      return true;   // defeated
    }
    return false;
  },

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
