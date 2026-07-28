// ====================== ENTITY: TOADSTOOL SPITTER ======================
// A rooted, hostile mushroom in Fungus Hollow — the first RANGED enemy. It can't move, but
// every few seconds it lobs a glob of spores in a high arc toward the dog; where the glob
// lands it bursts into a lingering spore cloud (entities/sporecloud.js) that poisons. Keep
// moving, break line of sight behind the giant caps, or blast it with an ability (it has hp,
// so Entities.hurt fells it like any enemy). Guards the Mooncap chamber in packs.

Entities.register('toadstool', {
  radius: 26,

  init(e){
    e.hp    = (typeof e.hp==='number') ? e.hp : 3;
    e.range = e.range || 230;
    e.cd    = rand(700, 2000);
    e.globs = [];
    e.dir   = 1;
    e.bob   = 0;
  },

  update(e, t, dt){
    const p=p1;
    e.cd-=dt;
    if(p && !p.dead && e.cd<=0 && Math.hypot(p.x-e.x, p.y-e.y) < e.range){
      e.cd=rand(2400, 3400);
      const tx=clamp(p.x+rand(-20,20), 24, WORLD_W-24), ty=clamp(p.y+rand(-16,16), 30, WORLD_H-24);
      e.globs.push({ x0:e.x, y0:e.y-10, tx, ty, prog:0, dur:720 });
      e.dir = tx>=e.x ? 1 : -1;
      if(typeof sfxHowl==='function') sfxHowl();
    }
    for(let i=e.globs.length-1;i>=0;i--){
      const g=e.globs[i]; g.prog += dt/g.dur;
      if(g.prog>=1){
        Entities.spawn('sporecloud', { x:g.tx, y:g.ty, r:30, life:5000 });
        if(typeof spawnSparkles==='function') spawnSparkles(g.tx, g.ty, '#9FD65A', 8);
        e.globs.splice(i,1);
      }
    }
    if(e.hurtT>0) e.hurtT=Math.max(0, e.hurtT-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/420)*1);
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+11,13,4,0,0,Math.PI*2); ctx.fillStyle='#0E1A10'; ctx.fill(); ctx.globalAlpha=1;
    // stalk
    px(x-4,y-2,8,12,'#E7E0CE'); px(x-4,y-2,2,12,'#CFC7B2');
    // angry red cap with pale spots
    px(x-11,y-12,22,8,'#B23A34'); px(x-9,y-15,18,5,'#C6463E');
    px(x-8,y-11,3,3,'#F0E6D0'); px(x+1,y-13,3,3,'#F0E6D0'); px(x+6,y-10,2,2,'#F0E6D0');
    // scowl on the stalk
    px(x+e.dir*2-4,y+1,3,2,'#2A2A2A'); px(x+e.dir*2+1,y+1,3,2,'#2A2A2A');
    px(x-3,y+5,6,1,'#3A2E2E');
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-12,y-16,24,26,'#FF6B6B'); ctx.globalAlpha=1; }
    // in-flight spore globs, arcing
    e.globs.forEach(g=>{
      const gx=g.x0+(g.tx-g.x0)*g.prog, gy=g.y0+(g.ty-g.y0)*g.prog - Math.sin(g.prog*Math.PI)*26;
      ctx.save(); ctx.globalAlpha=0.9;
      ctx.fillStyle='#9FD65A'; ctx.beginPath(); ctx.arc(Math.round(gx),Math.round(gy),3.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.4; ctx.fillStyle='#C6EE86'; ctx.beginPath(); ctx.arc(Math.round(gx)-1,Math.round(gy)-1,1.6,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    Entities.drawAlert(e);
  },
});
