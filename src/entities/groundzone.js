// ====================== ENTITY: GROUND ZONE (telegraphed AoE) ======================
// A stationary "danger circle" that WARNS, then STRIKES once, then fades — the reusable
// building block for the bosses' ranged/area attacks. It's the rockfall telegraph
// (warn → strike → reset) shaped as a fixed circle, and structured like a sporecloud
// (update + draw only, non-interactive, self-removing).
//
// Spawn it where an attack will land: Entities.spawn('groundzone', { x, y, r, warnMs, dmg,
// color, scale }). During `warn` it paints a pulsing danger ring (with a shrinking inner
// ring counting down to impact) so the player can step clear; on impact it damages + shoves
// anyone still inside (respecting i-frames), flashes, and removes itself.
//
// Used by: the Badger Baron's wall-crash stomp, the Alpha Wolf's pounce landing, and the Old
// Grizzly's hurled boulder + erupting fissures.

Entities.register('groundzone', {
  radius: 0,   // not interactable

  init(e){
    e.r      = e.r || 60;
    e.warnMs = (typeof e.warnMs==='number') ? e.warnMs : 650;
    e.dmg    = (typeof e.dmg==='number')    ? e.dmg    : 4;
    e.color  = e.color || '#E0503C';
    e.scale  = e.scale || 1;
    e.state  = 'warn';       // 'warn' | 'fade'
    e.warnT  = e.warnMs;
    e.fadeT  = 0;
    e._sparkT= 0;
  },

  update(e, t, dt){
    if(e.state==='warn'){
      e.warnT-=dt;
      // throttled dust rising off the marked ground
      e._sparkT-=dt;
      if(e._sparkT<=0){ e._sparkT=120; if(typeof spawnSparkles==='function') spawnSparkles(e.x+rand(-e.r,e.r)*0.6, e.y+rand(-e.r,e.r)*0.35, e.color, 2); }
      if(e.warnT<=0){
        // STRIKE — one-shot AoE on everyone still inside the circle
        for(const p of Game.players){
          if(!p || p.dead || p.hp<=0 || p.invulnT>0) continue;
          if(Math.hypot(p.x-e.x, p.y-e.y) < e.r){
            if(typeof Health!=='undefined') Health.damage(p, e.dmg);
            const ang=Math.atan2(p.y-e.y, p.x-e.x), K=18*(e.scale||1);
            p.x=clamp(p.x+Math.cos(ang)*K, 20, WORLD_W-20);
            p.y=clamp(p.y+Math.sin(ang)*K, 26, WORLD_H-20);
          }
        }
        if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y, e.color, 22);
        if(typeof sfxThunder==='function') sfxThunder();
        e.state='fade'; e.fadeT=260;
      }
      return;
    }
    // fade → remove
    e.fadeT-=dt;
    if(e.fadeT<=0) Entities.remove(e);
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), ry=e.r*0.6;
    ctx.save();
    if(e.state==='warn'){
      const prog=1-e.warnT/e.warnMs;                 // 0 → 1 as impact nears
      ctx.globalAlpha=0.12+0.22*prog;                // danger fill deepens
      ctx.fillStyle=e.color;
      ctx.beginPath(); ctx.ellipse(x,y,e.r,ry,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.5+0.4*Math.abs(Math.sin(t/70));
      ctx.lineWidth=3; ctx.strokeStyle=e.color;
      ctx.beginPath(); ctx.ellipse(x,y,e.r,ry,0,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=0.6;                           // shrinking countdown ring
      const k=1-prog*0.85;
      ctx.beginPath(); ctx.ellipse(x,y,e.r*k,ry*k,0,0,Math.PI*2); ctx.stroke();
    } else {
      const f=Math.max(0, e.fadeT/260);              // impact flash bursting out
      ctx.globalAlpha=0.65*f;
      ctx.lineWidth=5; ctx.strokeStyle='#FFE6B0';
      const g=1+(1-f)*0.35;
      ctx.beginPath(); ctx.ellipse(x,y,e.r*g,ry*g,0,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  },
});
