// ====================== RELICS (Golden Dunes active-item slot) ======================
// A new equipment slot for ACTIVE artifacts — distinct from the stat-only wearables. You
// equip one relic (items with type:'relic') into the `relic` slot and trigger it with the
// Use-Relic key (default F), on a short cooldown. Three ship:
//   • sandstepper — a dash-dodge: a quick lunge in your facing direction + brief i-frames.
//   • miragedecoy — plants a shimmering decoy that nearby enemies chase for a few seconds
//     (bait the Sand Serpent to surface).
//   • sunlantern  — a burst of light that briefly clears the sandstorm/dark and mends a little.
// Cooldowns are transient (reset on level entry, like ability cooldowns).

const Relics = {
  DEFS: {
    sandstepper: { name:'Sand-Stepper Charm', icon:'💨', cdMs:2600 },
    miragedecoy: { name:'Mirage Decoy',       icon:'🏺', cdMs:9000 },
    sunlantern:  { name:'Sun Lantern',        icon:'🏮', cdMs:11000 },
    hearthstone: { name:'Hearth Stone',       icon:'🔥', cdMs:9000 },
  },
  lanternT: 0,   // >0 while a Sun Lantern is lit (weather/darkness read this to ease off)

  equipped(p){ return p && p.equipment && p.equipment.relic; },
  reset(p){ if(p){ p.relicCd=0; } this.lanternT=0; },

  ready(p){ return this.equipped(p) && (p.relicCd||0)<=0; },
  frac(p){ const id=this.equipped(p); if(!id) return 1; const d=this.DEFS[id]; if(!d) return 1; return 1-Math.max(0,Math.min(1,(p.relicCd||0)/d.cdMs)); },

  tick(p, dt){
    if(p && p.relicCd>0){ p.relicCd=Math.max(0, p.relicCd-dt); if(typeof UI!=='undefined'&&UI.updateRelic) UI.updateRelic(); }
    if(this.lanternT>0) this.lanternT=Math.max(0, this.lanternT-dt);
  },

  use(p){
    if(!p || p.dead) return;
    const id=this.equipped(p);
    if(!id){ if(typeof showToast==='function') showToast('🏺 No relic equipped — find one in the dunes! (equip in Inventory)', 1900); return; }
    const d=this.DEFS[id]; if(!d) return;
    if((p.relicCd||0)>0){ return; }
    p.relicCd=d.cdMs;
    if(id==='sandstepper') this._dash(p);
    else if(id==='miragedecoy') this._decoy(p);
    else if(id==='sunlantern') this._lantern(p);
    else if(id==='hearthstone') this._hearth(p);
    if(typeof updateHUD==='function') updateHUD();
  },

  _dash(p){
    const v={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] }[p.dir] || [0,1];
    const SP=7.5;
    p.dashVX=v[0]*SP; p.dashVY=v[1]*SP; p.dashT=220;
    p.invulnT=Math.max(p.invulnT||0, 360);
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y, '#E8C87A', 14);
    if(typeof sfxDash==='function') sfxDash();
    if(typeof showToast==='function') showToast('💨 Sand-step!', 900);
  },
  _decoy(p){
    if(typeof Entities!=='undefined') Entities.spawn('decoy', { x:p.x, y:p.y, life:5000 });
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#C9A6FF', 16);
    if(typeof showToast==='function') showToast('🏺 A mirage decoy shimmers into being!', 1600);
  },
  _lantern(p){
    this.lanternT=6000;
    if(typeof Health!=='undefined') Health.heal(p, 3);
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#FFD87A', 22);
    if(typeof showToast==='function') showToast('🏮 The Sun Lantern blazes — the haze thins.', 1800);
  },
  _hearth(p){
    if(typeof Warmth!=='undefined') Warmth.stoke(p, 70);
    if(typeof Status!=='undefined') Status.apply(p, 'toasty', 8000);
    if(typeof Health!=='undefined') Health.heal(p, 3);
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#FF9A3A', 22);
    if(typeof showToast==='function') showToast('🔥 The Hearth Stone flares — warmth floods back!', 1800);
  },
};

// The mirage decoy: a shimmering false-dog that enemies chase instead of you. Enemies read
// `Entities.decoyTarget()` when picking a target (see below). Fades after `life` ms.
Entities.register('decoy', {
  init(e){ e.life=e.life||5000; e.bob=0; },
  update(e, t, dt){ e.life-=dt; if(e.life<=0) Entities.remove(e); e.bob=t; },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/220)*2);
    ctx.save(); ctx.globalAlpha=0.4+0.25*Math.sin(t/160);
    // a wavery mirage silhouette of a dog
    ctx.fillStyle='#C9A6FF'; px(x-8,y-6,16,12,'#C9A6FF'); px(x+4,y-12,8,8,'#C9A6FF'); px(x-10,y+4,4,6,'#C9A6FF'); px(x+6,y+4,4,6,'#C9A6FF');
    ctx.globalAlpha=0.3; ctx.strokeStyle='#E8D6FF'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(x,y,14,16,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  },
});

// Nearest active decoy (enemies aim here instead of the dog while one exists).
Entities.decoyTarget = function(){
  const es=(typeof entities!=='undefined'&&entities)?entities:[];
  for(const e of es){ if(e.kind==='decoy' && e.life>0) return e; }
  return null;
};
