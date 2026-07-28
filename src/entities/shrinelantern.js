// ====================== ENTITY: SHRINE LANTERN ======================
// One of the three ancient lanterns of the Moonlit Rite (Firefly Grove). Relit like a
// firepit — press the action key and stay close while a ring fills — but tinted moon-silver.
// Once lit it also becomes a light source (darkness.js reads its `lightR`), so relighting the
// shrine literally lights the grove, and completing all three clears the `ritual` objective
// (which awakens the Ultimate). If the patrol catches you, it re-darkens the nearest one.

Entities.register('shrinelantern', {
  radius: 30,

  init(e){
    e.lit      = !!e.lit;
    e.relightT = 0;
    e._relMax  = 1500;
    e._embT    = 0;
    e.lightR   = e.lit ? 96 : 0;    // darkness.js counts this as a world light when > 0
  },

  update(e, t, dt){
    if(e.lit || e.relightT<=0) return;
    const p=p1;
    if(!p || p.dead || Math.hypot(p.x-e.x, p.y-e.y)>44){ e.relightT=0; return; }
    e.relightT -= dt;
    e._embT -= dt;
    if(e._embT<=0){ e._embT=130; if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-4, '#CBB6FF', 3); }
    if(e.relightT<=0){
      e.relightT=0; e.lit=true; e.lightR=96;
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-8, '#E6DCFF', 24);
      if(typeof sfxCheer==='function') sfxCheer();
      if(typeof showToast==='function') showToast('🔮 A shrine lantern flares to moonlight.', 1900);
      if(typeof updateHUD==='function') updateHUD();
      if(typeof checkWin==='function') checkWin();   // completes the ritual when all three are lit
    }
  },

  // The patrol re-darkens a lantern when it catches you (a setback, not a failure).
  douse(e){ if(e.lit){ e.lit=false; e.lightR=0; if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#3A3358', 12); } },

  onInteract(e, p){
    if(e.lit){ if(typeof showToast==='function') showToast('🔮 This lantern already glows.', 1200); return; }
    if(e.relightT>0) return;
    e.relightT=e._relMax;
    if(typeof sfxDig==='function') sfxDig();
    if(typeof showToast==='function') showToast('🔮 Kindling the moonlight…', 1000);
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // stone plinth
    px(x-6,y+4,12,6,'#6A6478'); px(x-8,y+9,16,3,'#544E64');
    // lantern housing
    px(x-5,y-14,10,16,'#4A4460');
    px(x-3,y-12,6,12, e.lit ? '#DCD2FF' : '#241F36');
    if(e.lit){
      const fl=0.7+Math.sin(t/200+x)*0.18;
      ctx.save();
      ctx.globalAlpha=0.5*fl;
      const g=ctx.createRadialGradient(x,y-8,1, x,y-8, 26);
      g.addColorStop(0,'#E4DAFF'); g.addColorStop(1,'rgba(206,190,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y-8,26,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else if(e.relightT>0){
      const prog=1-(e.relightT/(e._relMax||1500));
      ctx.save(); ctx.lineWidth=3; ctx.strokeStyle='rgba(74,63,53,0.35)';
      ctx.beginPath(); ctx.arc(x,y-22,9,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle='#CBB6FF';
      ctx.beginPath(); ctx.arc(x,y-22,9,-Math.PI/2,-Math.PI/2+prog*Math.PI*2); ctx.stroke(); ctx.restore();
    } else if(p1 && !p1.dead && Math.hypot(p1.x-e.x,p1.y-e.y)<44){
      const pulse=1+Math.sin(t/240)*0.12;
      ctx.save(); ctx.translate(x,y-20); ctx.scale(pulse,pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('!',0,0);
      ctx.fillStyle='#8A6ABF'; ctx.fillText('!',0,0); ctx.restore();
    }
  },
});
