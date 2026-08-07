// ====================== WARMTH (cold survival) ======================
// The first environmental-survival meter, introduced in Frozen Pass (Rocky Mountains 2).
// In a level flagged `cold`, the dog's warmth slowly drains away from heat; standing near a
// lit fire (entities/firepit.js) refills it. Hit zero and you're `chilled` — slowed, and
// losing a sliver of health until you reach a fire. It's cozy, not cruel: warmth never
// kills on its own, it just herds you fire to fire.
//
// Designed to be reusable — the Frostfang Tundra biome turns the same meter up (blizzards,
// scarcer fires). A level opts in with `cold:true` in its config; everywhere else warmth is
// full and the gauge hides itself. Warmth is transient (like ability cooldowns): it resets
// to full on entering a level, and isn't part of the save.

const Warmth = {
  MAX: 100,
  DRAIN_PER_SEC: 6,      // away from any fire, in a cold level
  REFILL_PER_SEC: 40,    // basking next to a lit fire (fast — fires feel like relief)
  HEAT_R: 95,            // within this of a lit firepit = warming
  CHILL_CHIP_MS: 1500,   // once frozen, lose 1 hp this often
  CHILL_SPEED: 0.6,      // movement multiplier while frozen

  // Is the current level a cold one? (LevelManager copies `cold` off the level config.)
  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.cold); },

  reset(p){ if(p){ p.warmth = this.MAX; p.chilled = false; p._chillT = 0; } },

  // Burn a bundle of firewood (from the hotbar) — an instant warmth top-up (Frostfang Tundra).
  stoke(p, amount){ if(!p) return; p.warmth = Math.min(this.MAX, (p.warmth==null?this.MAX:p.warmth) + (amount||55)); if(typeof UI!=='undefined'&&UI.updateWarmth) UI.updateWarmth(); },

  // A warm coat (items.json `mods.cold`) slows the warmth drain — the endgame gear reward.
  _coatMul(p){
    if(!p || !p.equipment || typeof Items==='undefined') return 1;
    let cut=0;
    for(const slot in p.equipment){ const d=Items.get(p.equipment[slot]); const c=d&&d.mods&&d.mods.cold; if(c) cut+=c; }
    return Math.max(0.3, 1-cut);
  },

  // Any lit firepit close enough to warm the dog?
  _nearFire(p){
    const es = (typeof entities!=='undefined' && entities) ? entities : [];
    return es.some(e => e.kind==='firepit' && e.lit && Math.hypot(p.x-e.x, p.y-e.y) < this.HEAT_R);
  },

  // Called each frame from updatePlayer while playing.
  tick(p, dt){
    if(!p) return;
    if(!this.active()){                          // warm level → keep full, gauge hidden
      if(p.warmth!==this.MAX || p.chilled){ p.warmth=this.MAX; p.chilled=false; p._chillT=0; if(typeof UI!=='undefined' && UI.updateWarmth) UI.updateWarmth(); }
      return;
    }
    if(typeof p.warmth!=='number') p.warmth = this.MAX;
    const s = dt/1000;
    const toasty = (typeof Status!=='undefined') && Status.has(p,'toasty');   // a warm meal wards off the chill
    const blizz = (typeof Blizzard!=='undefined' && Blizzard.raging()) ? 1.7 : 1;   // a blizzard bites harder
    if(this._nearFire(p) || toasty) p.warmth = Math.min(this.MAX, p.warmth + this.REFILL_PER_SEC*s);
    else                            p.warmth = Math.max(0,       p.warmth - this.DRAIN_PER_SEC*blizz*this._coatMul(p)*s);

    const wasChilled = p.chilled;
    p.chilled = p.warmth <= 0;
    if(p.chilled){
      p._chillT = (p._chillT||0) + dt;
      if(p._chillT >= this.CHILL_CHIP_MS){ p._chillT = 0; if(typeof Health!=='undefined') Health.damage(p, 1); }
    } else p._chillT = 0;
    if(!wasChilled && p.chilled && typeof showToast==='function') showToast('🥶 You\'re freezing — get to a fire!', 2200);

    if(typeof UI!=='undefined' && UI.updateWarmth) UI.updateWarmth();
  },

  // Movement penalty while frozen (composed into updatePlayer's speed, like ability speedMuls).
  speedMul(p){ return (p && p.chilled) ? this.CHILL_SPEED : 1; },

  // Gauge fill 0..1 for the HUD.
  frac(p){ return p ? Math.max(0, Math.min(1, (p.warmth==null?this.MAX:p.warmth)/this.MAX)) : 1; },
};
