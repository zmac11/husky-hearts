// ====================== ENTITY: ROCKFALL (falling-rock hazard) ======================
// A boulder that tumbles down a lane on Cliffside Climb. It telegraphs first (a shaking
// crack + dust at the top of its lane), then rolls straight down; touching it costs a heart
// and knocks the dog back. At the bottom it settles and resets on a timer, so each lane is a
// rhythm to read and dodge — training the reflexes the Alpha Wolf's telegraphed lunges test.
//
// Pure hazard: no interaction, just update + draw. Placed per-lane from a level's `rockfalls`
// config. Reuses drawBoulder, so no new rendering.

Entities.register('rockfall', {
  radius: 0,

  init(e){
    e.top    = (typeof e.top==='number')    ? e.top    : 250;
    e.bottom = (typeof e.bottom==='number') ? e.bottom : (WORLD_H-40);
    e.speed  = e.speed  || 3.2;             // roll speed (× dtScale)
    e.period = e.period || 2600;            // idle gap between rolls (ms)
    e.warn   = e.warn   || 750;             // telegraph time before a roll (ms)
    e.dmg    = e.dmg    || 3;               // a bit more than a heart
    e.state  = 'idle';                      // 'idle' | 'warn' | 'rolling'
    e.y      = e.top;
    e.cd     = (e.startDelay!=null) ? e.startDelay : (e._i ? 0 : 400);
    e.warnT  = 0;
    e.hitCd  = 0;
    e._dustT = 0;
  },

  update(e, t, dt){
    if(e.hitCd>0) e.hitCd=Math.max(0, e.hitCd-dt);

    if(e.state==='idle'){
      e.cd-=dt;
      if(e.cd<=0){ e.state='warn'; e.warnT=e.warn; }
      return;
    }
    if(e.state==='warn'){
      e.warnT-=dt;
      e._dustT-=dt;
      if(e._dustT<=0){ e._dustT=110; if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.top+4, '#B7ADA0', 3); }
      if(e.warnT<=0){ e.state='rolling'; e.y=e.top; if(typeof sfxHowl==='function') sfxHowl(); }
      return;
    }
    // rolling
    e.y += e.speed*dtScale;
    e._dustT-=dt;
    if(e._dustT<=0){ e._dustT=90; if(typeof spawnSparkles==='function') spawnSparkles(e.x+rand(-6,6), e.y+8, '#C8BEB0', 2); }
    // hit the dog?
    const p=p1;
    if(p && !p.dead && e.hitCd<=0 && !(p.invulnT>0) && Math.hypot(p.x-e.x, p.y-e.y)<20){
      e.hitCd=700;
      if(typeof Health!=='undefined') Health.damage(p, e.dmg);
      const ang=Math.atan2(p.y-e.y, p.x-e.x);
      p.x=clamp(p.x+Math.cos(ang)*18, 20, WORLD_W-20);
      p.y=clamp(p.y+Math.sin(ang)*18, 26, WORLD_H-20);
      if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#E0A0A0', 10);
      if(typeof showToast==='function') showToast('🪨 A falling rock! Watch the lanes.', 1400);
    }
    if(e.y>=e.bottom){ e.state='idle'; e.cd=e.period; e.y=e.top; }
  },

  draw(e, t){
    const x=Math.round(e.x);
    if(e.state==='rolling'){
      if(typeof drawBoulder==='function') drawBoulder(x, Math.round(e.y), true);
      else px(x-10, Math.round(e.y)-8, 20, 16, '#8A8177');
      return;
    }
    if(e.state==='warn'){
      // telegraph: a shaking crack + a faint danger streak down the lane
      const y=Math.round(e.top);
      const sh=Math.sin(t/40)*1.2;
      ctx.save();
      ctx.globalAlpha=0.35+0.25*Math.sin(t/120);
      ctx.strokeStyle='#C0463C'; ctx.lineWidth=2; ctx.setLineDash([5,7]);
      ctx.beginPath(); ctx.moveTo(x, y+6); ctx.lineTo(x, Math.min(e.bottom, y+90)); ctx.stroke();
      ctx.setLineDash([]);
      // cracked scree at the lip
      ctx.globalAlpha=1;
      px(x-7+sh, y-2, 14, 4, '#6E655B'); px(x-3+sh, y-5, 6, 3, '#857B70');
      ctx.fillStyle='#3A342E'; ctx.beginPath(); ctx.moveTo(x-4+sh,y); ctx.lineTo(x+1+sh,y-4); ctx.lineTo(x+3+sh,y+1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // idle: nothing drawn (the lane looks clear until it warns)
  },
});
