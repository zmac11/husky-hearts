// ====================== ENTITY: FIREPIT (waystation fire) ======================
// A cold, dead campfire you rekindle. Walk up, press the action key, and stay close while a
// progress ring fills (like digging a chest); once lit it blazes, warms you (warmth.js reads
// lit firepits as heat sources), and counts toward the level's `kindle` objective.
//
// Introduced in Frozen Pass (Rocky Mountains 2): relighting the three waystation fires both
// keeps you alive against the cold and clears the level. State is plain data ({lit,relightT})
// so it rides through save/level-state like any entity.

Entities.register('firepit', {
  radius: 30,

  init(e){
    e.lit      = !!e.lit;
    e.relightT = 0;                 // remaining relight ms (0 = idle)
    e._relMax  = 1300;              // time to rekindle
    e._embT    = 0;                 // ember-spark throttle while relighting
  },

  update(e, t, dt){
    if(e.lit || e.relightT<=0) return;
    const p=p1;
    if(!p || p.dead || Math.hypot(p.x-e.x, p.y-e.y)>44){ e.relightT=0; return; }   // walked away → abandon
    e.relightT -= dt;
    e._embT -= dt;
    if(e._embT<=0){ e._embT=130; if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-2, '#FFB24A', 3); }
    if(e.relightT<=0){
      e.relightT=0; e.lit=true;
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#FFD24A', 22);
      if(typeof sfxCheer==='function') sfxCheer();
      if(typeof showToast==='function') showToast('🔥 Waystation fire lit — its warmth spreads.', 1900);
      if(typeof updateHUD==='function') updateHUD();
      if(typeof checkWin==='function') checkWin();   // may complete the `kindle` objective
    }
  },

  onInteract(e, p){
    if(e.lit){ if(typeof showToast==='function') showToast('🔥 This fire is already blazing.', 1200); return; }
    if(e.relightT>0) return;                       // already relighting
    e.relightT=e._relMax;
    if(typeof sfxDig==='function') sfxDig();
    if(typeof showToast==='function') showToast('🪵 Coaxing the embers back to life…', 1000);
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    if(e.lit){ if(typeof drawCampfire==='function') drawCampfire(x, y, t); return; }

    // ---- unlit: a ring of stones around charred, cold logs ----
    ctx.save();
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x, y+6, 14, 5, 0, 0, Math.PI*2); ctx.fillStyle='#16211C'; ctx.fill(); ctx.globalAlpha=1;
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; px(x+Math.cos(a)*10-2, y+Math.sin(a)*5+1, 4, 3, '#8A8E96'); }
    px(x-8, y-1, 16, 3, '#4A3A2E'); px(x-1, y-8, 3, 16, '#3A2E24');   // crossed cold logs
    px(x-4, y+1, 8, 2, '#2A2622');                                     // ash
    ctx.restore();

    // relight progress ring, or a pulsing prompt within reach
    if(e.relightT>0){
      const prog=1-(e.relightT/(e._relMax||1300));
      ctx.save();
      ctx.lineWidth=3; ctx.strokeStyle='rgba(74,63,53,0.35)';
      ctx.beginPath(); ctx.arc(x, y-18, 9, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle='#FFB24A';
      ctx.beginPath(); ctx.arc(x, y-18, 9, -Math.PI/2, -Math.PI/2+prog*Math.PI*2); ctx.stroke();
      ctx.restore();
    } else if(p1 && !p1.dead && Math.hypot(p1.x-e.x, p1.y-e.y)<44){
      const pulse=1+Math.sin(t/240)*0.12;
      ctx.save();
      ctx.translate(x, y-16); ctx.scale(pulse, pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('!', 0, 0);
      ctx.fillStyle='#C08A2A'; ctx.fillText('!', 0, 0);
      ctx.restore();
    }
  },
});
