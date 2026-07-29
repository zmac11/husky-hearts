// ====================== ENTITY: LANTERN POST ======================
// A standing lantern that pools warm light along the Whispering Woods trails. Purely a light
// source: darkness.js reads lit lantern posts as holes in the dark, and their pools are the
// safe islands where shadow-lurkers won't follow. No interaction — it just glows.

Entities.register('lanternpost', {
  radius: 0,
  init(e){ e.lit = (e.lit!==false); e._fl = rand(0, Math.PI*2);
    e.lightR = (typeof Darkness!=='undefined') ? Darkness.LANTERN_R : 82; },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // post + crossarm
    px(x-1, y-2, 3, 16, '#4A3A2A');
    px(x-6, y-20, 12, 3, '#3A2E22');
    // the lantern housing hangs from the arm
    const lx=x+4, ly=y-16;
    px(lx-4, ly-3, 8, 10, '#5A4632');
    px(lx-3, ly-2, 6, 8, e.lit ? '#FFE08A' : '#2A2620');
    if(e.lit){
      // warm flicker glow
      const fl=0.7+Math.sin(t/180+e._fl)*0.18;
      ctx.save();
      ctx.globalAlpha=0.5*fl;
      const g=ctx.createRadialGradient(lx,ly+1,1, lx,ly+1, 22);
      g.addColorStop(0,'#FFE7A6'); g.addColorStop(1,'rgba(255,231,166,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(lx,ly+1,22,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=fl;
      px(lx-1, ly+1, 2, 3, '#FFF3C8');
      ctx.restore();
    }
  },
});
