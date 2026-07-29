// ====================== ABILITY: ULTIMATE — MOONBURST ======================
// The dog's ultimate, fired on the R key. It stays dormant through the whole early game and
// is AWAKENED by the Moonlit Rite in Firefly Grove (checkWin sets p.ultimateUnlocked when a
// level flagged `unlockUltimate` is cleared) — the story counterpart to the abilities the
// first boss unlocked.
//
// For now every breed shares one generic Ultimate: a radiant Moonburst that blasts every
// nearby foe, heals the dog, and grants a blink of invulnerability, on a long cooldown.
// (Per-breed ultimates — Dinno's thunderstorm, Lolla's barrage, Ťapka's frenzy — are a
// planned follow-up; they'll gate on the same `ultimateUnlocked` flag and R dispatch.)

(function(){
  const CD=38000, R=135, DMG=4, HEAL=4;
  const HOSTILE=['enemy','wolf','packleader','shadowlurker','toadstool'];

  function activate(p){
    if(!p || !p.ultimateUnlocked) return;
    const cd=Abilities.cdLeft(p,'ultimate');
    if(cd>0){ if(typeof showToast==='function') showToast(`⏳ Ultimate recharging (${Math.ceil(cd/1000)}s)`,1400); return; }
    Abilities.startCd(p,'ultimate',CD);
    (typeof entities!=='undefined'?entities:[]).slice().forEach(e=>{
      if(typeof e.hp==='number' && HOSTILE.indexOf(e.kind)!==-1 && Math.hypot(e.x-p.x, e.y-p.y)<R){
        Entities.hurt(e, DMG, p.x, p.y, 22);
      }
    });
    if(typeof Health!=='undefined') Health.heal(p, HEAL);
    p.ultBurstT=650;
    p.invulnT=Math.max(p.invulnT||0, 550);
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#C9B6FF', 40);
    if(typeof sfxCheer==='function') sfxCheer();
    if(typeof showToast==='function') showToast('🌟 Moonburst!', 1400);
  }

  function update(p, dt, trigger){
    const held=(typeof Input!=='undefined') && Input.held(trigger);
    if(held && !p._ultHeld) activate(p);
    p._ultHeld=held;
    if(p.ultBurstT>0) p.ultBurstT=Math.max(0, p.ultBurstT-dt);
  }

  function drawWorld(t){
    const p=(typeof p1!=='undefined')?p1:null; if(!p || !(p.ultBurstT>0)) return;
    const prog=1-p.ultBurstT/650;
    ctx.save();
    ctx.globalAlpha=0.55*(1-prog); ctx.lineWidth=5; ctx.strokeStyle='#C9B6FF';
    ctx.beginPath(); ctx.arc(p.x, p.y, 12+prog*R, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha=0.35*(1-prog); ctx.lineWidth=2; ctx.strokeStyle='#F4EEFF';
    ctx.beginPath(); ctx.arc(p.x, p.y, 12+prog*R*0.7, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  Abilities.register('ultimate', { name:'Moonburst', icon:'🌟', ultimate:true, spawn(){}, reset(){}, update, drawWorld });
})();
