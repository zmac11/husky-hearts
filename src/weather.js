// ====================== WEATHER: SANDSTORM (Golden Dunes) ======================
// A periodic visibility-cutting sandstorm — the desert's answer to the woods' darkness. On a
// cycle the wind rises, a stinging sand haze washes the screen (drifting streaks + a sandy
// vignette), and the survival meter (survival.js) drains faster. It's a PURE FUNCTION OF A
// CLOCK, so it's save-safe like the tide: nothing weather-related is serialised.
//
// A level opts in with `sandstorm:true`. render() draws in SCREEN space (over the world,
// under the minimap), called from main.js next to Darkness.render.

const Sandstorm = {
  PERIOD: 26000,    // full calm→storm→calm cycle
  _t: 0,

  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.sandstorm); },
  reset(){ this._t = 0; },

  // 0 (clear) .. 1 (full whiteout). Calm most of the cycle, a storm bulge in the middle.
  intensity(){
    const ph=this._t/this.PERIOD;                 // 0..1
    // a smooth bump centred at 0.5, ~40% of the cycle wide
    const d=Math.abs(ph-0.5);
    const raw=Math.max(0, 1 - d/0.24);
    let k=Math.min(1, raw*raw*1.1);
    if(typeof Relics!=='undefined' && Relics.lanternT>0) k*=0.35;   // a lit Sun Lantern thins the haze
    return k;
  },
  raging(){ return this.intensity() > 0.45; },

  tick(dt){
    if(!this.active()) return;
    const was=this.raging();
    this._t=(this._t+dt)%this.PERIOD;
    const now=this.raging();
    if(now!==was && typeof showToast==='function') showToast(now ? '🌪️ A sandstorm rolls in — visibility drops!' : '🌤️ The sandstorm passes.', 1900);
  },

  render(ctx, cam){
    if(!this.active()) return;
    const k=this.intensity(); if(k<=0.01) return;
    const W=VIEW_W, H=VIEW_H;
    ctx.save();
    // sandy wash (lighter → reads as a whiteout, not just more sand)
    ctx.globalAlpha=0.5*k; ctx.fillStyle='#F2DCA0'; ctx.fillRect(0,0,W,H);
    // vignette (edges thicken to a near-whiteout)
    const g=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.72);
    g.addColorStop(0,'rgba(242,220,160,0)'); g.addColorStop(1,'rgba(214,182,112,'+(0.72*k)+')');
    ctx.globalAlpha=1; ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // drifting sand streaks
    ctx.globalAlpha=0.5*k; ctx.strokeStyle='#F2DCA0'; ctx.lineWidth=1.5;
    const drift=(this._t/12)%W;
    for(let i=0;i<26;i++){
      const y=(i*37 + (this._t/40)) % H;
      const x=((i*53 - drift) % (W+80)) - 40;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+26,y+4); ctx.stroke();
    }
    ctx.restore();
  },
};

// ---- BLIZZARD (Frostfang Tundra) — the sandstorm's icy sibling: a white whiteout that
// drains warmth faster and cuts visibility on a cycle. Opts in with `blizzard:true`. ----
const Blizzard = {
  PERIOD: 24000,
  _t: 0,
  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.blizzard); },
  reset(){ this._t=0; },
  intensity(){ const ph=this._t/this.PERIOD; const d=Math.abs(ph-0.5); const raw=Math.max(0,1-d/0.26); return Math.min(1, raw*raw*1.15); },
  raging(){ return this.intensity()>0.42; },
  tick(dt){
    if(!this.active()) return;
    const was=this.raging(); this._t=(this._t+dt)%this.PERIOD; const now=this.raging();
    if(now!==was && typeof showToast==='function') showToast(now ? '❄️ A blizzard howls in — stay near fire!' : '🌤️ The blizzard eases.', 1900);
  },
  render(ctx, cam){
    if(!this.active()) return;
    const k=this.intensity(); if(k<=0.01) return;
    const W=VIEW_W, H=VIEW_H;
    ctx.save();
    ctx.globalAlpha=0.55*k; ctx.fillStyle='#EAF2F8'; ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.72);
    g.addColorStop(0,'rgba(234,242,248,0)'); g.addColorStop(1,'rgba(200,220,236,'+(0.7*k)+')');
    ctx.globalAlpha=1; ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // driving snow
    ctx.globalAlpha=0.75*k; ctx.fillStyle='#FFFFFF';
    for(let i=0;i<46;i++){ const x=((i*61 - this._t/6) % (W+40)) - 20; const y=(i*29 + this._t/24) % H; ctx.fillRect(x,y,2,2); ctx.fillRect(x+12,(y+40)%H,1.5,1.5); }
    ctx.restore();
  },
};
