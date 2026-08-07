// ====================== SURVIVAL (Golden Dunes heat meter) ======================
// The desert's environmental gauge — the warmth meter (warmth.js) re-themed for HEAT. In a
// level flagged `heat`, the sun bakes the dog and the gauge drains; standing in SHADE (near a
// shade rock or palm), at the OASIS (any water), or drinking a 🧴 canteen refills it. Empty =
// `heatstroke` (slow + a sliver of chip damage) until you find shade. Cozy, not cruel — it
// herds you shade to shade, never kills on its own. A sandstorm (weather.js) drains it faster.
//
// Transient like warmth: resets full on level entry, not part of the save.

const Survival = {
  MAX: 100,
  DRAIN_PER_SEC: 5,
  REFILL_PER_SEC: 45,
  SHADE_R: 70,           // within this of a shade rock / palm = cooling
  STROKE_CHIP_MS: 1600,
  STROKE_SPEED: 0.65,

  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.heat); },
  reset(p){ if(p){ p.heat = this.MAX; p.heatstroke = false; p._strokeT = 0; } },

  _inShade(p){
    const es=(typeof worldObjects!=='undefined' && worldObjects) ? worldObjects : [];
    return es.some(o => (o.kind==='shaderock'||o.kind==='palm'||o.kind==='ruinwall') && Math.hypot(p.x-o.x, p.y-o.y) < this.SHADE_R);
  },
  _atWater(p){ return (typeof isWater==='function') && isWater(p.x, p.y, 40); },

  // Drink a canteen (from the hotbar) — a big instant refill.
  drink(p, amount){ if(!p) return; p.heat = Math.min(this.MAX, (p.heat==null?this.MAX:p.heat) + (amount||60)); if(typeof UI!=='undefined'&&UI.updateSurvival) UI.updateSurvival(); },

  tick(p, dt){
    if(!p) return;
    if(!this.active()){
      if(p.heat!==this.MAX || p.heatstroke){ p.heat=this.MAX; p.heatstroke=false; p._strokeT=0; if(typeof UI!=='undefined'&&UI.updateSurvival) UI.updateSurvival(); }
      return;
    }
    if(typeof p.heat!=='number') p.heat=this.MAX;
    const s=dt/1000;
    const cooling = this._inShade(p) || this._atWater(p);
    const stormMul = (typeof Sandstorm!=='undefined' && Sandstorm.raging()) ? 1.8 : 1;
    if(cooling) p.heat = Math.min(this.MAX, p.heat + this.REFILL_PER_SEC*s);
    else        p.heat = Math.max(0,       p.heat - this.DRAIN_PER_SEC*stormMul*s);

    const was=p.heatstroke;
    p.heatstroke = p.heat<=0;
    if(p.heatstroke){
      p._strokeT=(p._strokeT||0)+dt;
      if(p._strokeT>=this.STROKE_CHIP_MS){ p._strokeT=0; if(typeof Health!=='undefined') Health.damage(p,1); }
    } else p._strokeT=0;
    if(!was && p.heatstroke && typeof showToast==='function') showToast('🥵 Heatstroke — find shade or water!', 2200);
    if(typeof UI!=='undefined'&&UI.updateSurvival) UI.updateSurvival();
  },

  speedMul(p){ return (p && p.heatstroke) ? this.STROKE_SPEED : 1; },
  frac(p){ return p ? Math.max(0, Math.min(1, (p.heat==null?this.MAX:p.heat)/this.MAX)) : 1; },
};
