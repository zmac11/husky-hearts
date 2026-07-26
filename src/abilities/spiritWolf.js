// ====================== ABILITY: SPIRIT OF THE STORM (Dinno, E) ======================
// Summons a spectral storm-wolf companion (entities/spiritwolf.js) that hunts enemies
// on its own for a while, then dissipates. One spirit at a time; cooldown-based and
// gated by the 'spiritwolf' skill node.

(function(){
  const PARAMS={
    0:{ dur:9000,  dmg:1, chain:false, cdMs:48000 },
    1:{ dur:12000, dmg:2, chain:false, cdMs:40000 },
    2:{ dur:16000, dmg:3, chain:false, cdMs:40000 },
    3:{ dur:16000, dmg:3, chain:true,  cdMs:32000 },
  };

  function owner(){
    for(const p of Game.players){ if(Abilities.playerHas(p,'spiritWolf')) return p; }
    return null;
  }
  function lvl(p){ return (typeof Skills!=='undefined') ? Skills.level(p,'spiritwolf') : 0; }

  function spawn(){}
  function reset(){}   // the spirit is an entity — Entities.clear() handles level changes

  function activate(p){
    if(!p.abilitiesUnlocked) return;   // dormant until the first boss (registry hints on press)
    const cd=Abilities.cdLeft(p,'spiritWolf');
    if(cd>0){ showToast(`⏳ Spirit of the Storm recharging (${Math.ceil(cd/1000)}s)`, 1400); return; }
    const cfg=PARAMS[Math.min(3, Math.max(0, lvl(p)))];
    // one spirit at a time — re-summoning replaces the old one
    const old=entities.find(e=>e.kind==='spiritwolf');
    if(old) Entities.remove(old);
    const spot={ x:p.x+(p.dir==='left'?-30:30), y:p.y+6 };
    nudgeOutOfWater(spot, 16);
    Entities.spawn('spiritwolf', { x:spot.x, y:spot.y, lifeT:cfg.dur, dmg:cfg.dmg, chain:cfg.chain });
    Abilities.startCd(p,'spiritWolf',cfg.cdMs);
    if(typeof sfxSummon==='function') sfxSummon();
    spawnSparkles(spot.x, spot.y-10, '#7FD4FF', 22);
    showToast('🐺 A spirit wolf answers the call!', 1800);
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;
    const held=Input.held(trigger);
    if(held && !update._eHeld) activate(p);
    update._eHeld=held;
  }

  Abilities.register('spiritWolf', {
    name:'Spirit of the Storm', icon:'🐺', skillNode:'spiritwolf',
    spawn, reset, update,
  });
})();
