// ====================== TIDE (Seashell Cove environment cycle) ======================
// The headline system of Biome 4: a slow, level-wide clock that makes the shore breathe.
// Over a ~90s cycle the sea rolls IN (high tide) and drains back OUT (low tide). Water
// bodies tagged `tidepool` in the terrain are deep water while the tide is in — a wall to
// walkers, a lane to swimmers — and drain to crossable wet sand at low tide, exposing the
// shells and buried treasure beneath.
//
// It's a PURE FUNCTION OF A CLOCK, so it's save-safe exactly like warmth/cooldowns: nothing
// tide-related is serialised. On entering a tidal level the clock resets to high tide (a
// clean, readable intro), then just runs. A small HUD gauge (ui.js updateTide) reads it.
//
// A level opts in with `tide:true` in its config (copied onto the level by from-config, and
// surfaced as LevelManager.current.tide). Elsewhere the system is dormant.

const Tide = {
  PERIOD: 90000,     // full high→low→high cycle, ms
  COVER: 0.5,        // tidal pools hold water while level() < COVER (else drained to sand)

  _t: 0,             // ms into the current cycle (transient; reset on level entry)
  _speed: 1,         // clock multiplier — the Hermit Crab churns this up when it panics

  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.tide); },
  reset(){ this._t = 0; this._speed = 1; },

  // 0 = fully HIGH (sea all the way in), 1 = fully LOW (drained to sand). Smooth cosine so
  // the shore eases in and out rather than snapping.
  level(){ return 0.5 - 0.5*Math.cos((this._t/this.PERIOD)*Math.PI*2); },

  // Is tidal water present right now? (Deep-water/`deepwater` bodies ignore this — they're
  // always submerged; only `tidepool` bodies drain.)
  covered(){ return this.level() < this.COVER; },
  isLow(){ return this.level() >= 0.72; },     // safely drained — good for a treasure dig
  isHigh(){ return this.level() <= 0.28; },    // safely flooded — divers' window

  // Advance the clock and refresh the HUD gauge. Called each frame from updatePlayer.
  tick(dt){
    if(!this.active()) return;
    const wasCovered = this._covered;
    this._t = (this._t + dt*this._speed) % this.PERIOD;
    this._covered = this.covered();
    // A gentle heads-up as the shore turns, so the rhythm is learnable.
    if(this._covered!==wasCovered && typeof showToast==='function'){
      showToast(this._covered ? '🌊 The tide rolls in…' : '🏖️ The tide drains out — the sands are open.', 1800);
    }
    if(typeof UI!=='undefined' && UI.updateTide) UI.updateTide();
  },

  // Gauge fill 0..1 for the HUD (1 = high water).
  frac(){ return 1 - this.level(); },
  icon(){ return this.covered() ? '🌊' : '🏖️'; },
  label(){ return this.isHigh() ? 'High tide' : this.isLow() ? 'Low tide' : (this._t < this.PERIOD/2 ? 'Tide rising' : 'Tide falling'); },
};
