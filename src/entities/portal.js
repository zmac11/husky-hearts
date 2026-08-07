// ====================== ENTITY: EXIT PORTAL ======================
// Spawns when a level's quest completes (update.js checkWin): instead of the world
// map opening automatically, the dog walks into this swirling gate to move on. It is
// tinted with the CURRENT biome's colours and floats the NEXT biome's icon above it,
// so every environment gets its own themed doorway. On biome finales a golden chest
// spawns beside it (see checkWin).

Entities.register('portal', {
  radius: 0,   // not action-key interactable — walking in triggers it

  init(e){
    e.colA = e.colA || '#9B7EC8';    // swirl primary (biome colour)
    e.colB = e.colB || '#FFD93D';    // swirl accent
    e.icon = e.icon || '✨';         // destination biome icon floating above
    e.used = !!e.used;
  },

  update(e, t, dt){
    if(e.used) return;
    const p=p1;
    if(!p || p.dead) return;
    if(Math.hypot(p.x-e.x, p.y-e.y)<26){
      e.used=true;
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-10, e.colB, 24);
      // The campaign finale: stepping through the last portal rolls the credits instead of
      // opening the journey map.
      if(LevelManager.current && LevelManager.current.credits && typeof rollCredits==='function'){ rollCredits(); return; }
      // Freeze the world and reveal the journey map (the flow checkWin used to run).
      Game.state=SCENES.WORLDMAP;
      const id=e.levelId;
      setTimeout(()=>{ if(typeof WorldMap!=='undefined') WorldMap.showAfter(id); }, 500);
    }
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    ctx.save();
    // ground glow
    ctx.globalAlpha=0.35+Math.sin(t/350)*0.1;
    const gg=ctx.createRadialGradient(x,y+6,2,x,y+6,26);
    gg.addColorStop(0,e.colB); gg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.ellipse(x,y+6,26,10,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;

    // standing oval gate: swirling arcs alternating biome colours
    for(let i=0;i<3;i++){
      const ph=(t/900+i/3)%1;
      ctx.globalAlpha=0.75*(1-Math.abs(ph-0.5));
      ctx.strokeStyle=i%2?e.colB:e.colA;
      ctx.lineWidth=3-i*0.6;
      ctx.beginPath();
      ctx.ellipse(x, y-14, 12+ph*5, 20+ph*4, Math.sin(t/700+i)*0.15, 0, Math.PI*2);
      ctx.stroke();
    }
    // inner shimmer
    ctx.globalAlpha=0.55+Math.sin(t/220)*0.2;
    const ig=ctx.createRadialGradient(x,y-14,1,x,y-14,14);
    ig.addColorStop(0,'#FFFFFF'); ig.addColorStop(0.5,e.colA); ig.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=ig; ctx.beginPath(); ctx.ellipse(x,y-14,11,18,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;

    // orbiting sparkle dots
    for(let i=0;i<4;i++){
      const a=t/500+i*Math.PI/2;
      ctx.globalAlpha=0.8;
      ctx.fillStyle=i%2?e.colB:'#FFFFFF';
      ctx.fillRect(Math.round(x+Math.cos(a)*15)-1, Math.round(y-14+Math.sin(a)*22)-1, 2, 2);
    }
    ctx.globalAlpha=1;

    // destination biome icon bobbing above the gate
    ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(e.icon, x, y-44+Math.sin(t/400)*2);
    ctx.restore();
  },
});
