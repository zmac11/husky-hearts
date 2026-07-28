// ====================== ENTITY: MOONCAP (quest pickup) ======================
// The rare, moon-pale mushroom Bramble needs (Fungus Hollow's `fetch-from` objective). It
// glows softly in the guarded inner chamber; walk into it to pluck it, which drops the
// 🍄 Mooncap into your bag and completes the fetch. Plain proximity pickup, like a collectible.

Entities.register('mooncap', {
  radius: 0,
  init(e){ e.bob=rand(0, Math.PI*2); e.taken=false; e._full=0; },

  update(e, t, dt){
    if(e.taken) return;
    const p=p1; if(!p || p.dead) return;
    if(Math.hypot(p.x-e.x, p.y-e.y) < 24){
      if(typeof Inventory!=='undefined' && Inventory.roomFor(p,'mooncap') < 1){
        if(!e._full || t-e._full>2200){ e._full=t; if(typeof showToast==='function') showToast('🎒 Bag full — make room for the Mooncap!',1700); }
        return;
      }
      e.taken=true;
      Inventory.add(p, 'mooncap', 1);
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#C9B6FF', 24);
      if(typeof sfxCheer==='function') sfxCheer();
      if(typeof showToast==='function') showToast('🍄 You plucked the rare Mooncap!', 2400);
      if(typeof updateHUD==='function') updateHUD();
      Entities.remove(e);
      if(typeof checkWin==='function') checkWin();   // completes the fetch-from objective
    }
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/500+e.bob)*1.5);
    // pale moon glow
    ctx.save();
    ctx.globalAlpha=0.4+Math.sin(t/300)*0.12;
    const g=ctx.createRadialGradient(x,y-6,1, x,y-6, 20);
    g.addColorStop(0,'#D8CBFF'); g.addColorStop(1,'rgba(200,182,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y-6,20,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // stalk + domed pale cap with faint spots
    px(x-2,y-3,4,8,'#EDE9F6');
    px(x-7,y-11,14,6,'#C9BEEA'); px(x-5,y-14,10,4,'#DAD1F2');
    px(x-4,y-10,2,2,'#F4F0FF'); px(x+2,y-12,2,2,'#F4F0FF');
  },
});
