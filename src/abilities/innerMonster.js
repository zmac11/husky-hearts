// ====================== ABILITY: INNER MONSTER (Ťapka, Q) ======================
// Ťapka lets the beast out (p.monsterT ms): red glowing eyes + darker coat (palette
// swap in dog-sprite.js), faster, and she gains MELEE contact damage — the first
// player→enemy damage in the game. A per-player bite cooldown lets her chomp the
// nearest foe she's touching; every bite HEALS her (lifesteal), the payoff for the
// frailest dog. Cooldown-based; gated by the 'monster' skill node.

(function(){
  const PARAMS={
    0:{ dur:5000,  speedMul:1.15, dmg:1, heal:1, cdMs:34000 },
    1:{ dur:6000,  speedMul:1.25, dmg:2, heal:1, cdMs:30000 },
    2:{ dur:8000,  speedMul:1.25, dmg:3, heal:2, cdMs:30000 },
    3:{ dur:10000, speedMul:1.35, dmg:3, heal:2, cdMs:26000 },
  };
  const BITE_R=24, BITE_CD=500;

  function owner(){ for(const p of Game.players){ if(Abilities.playerHas(p,'innerMonster')) return p; } return null; }
  function lvl(p){ return (typeof Skills!=='undefined') ? Skills.level(p,'monster') : 0; }
  function params(p){ return PARAMS[Math.min(3, Math.max(0, lvl(p)))]; }
  function speedMul(p){ return (p && p.monsterT>0) ? params(p).speedMul : 1; }

  function spawn(){}
  function reset(){ if(p1){ p1.monsterT=0; p1.meleeCd=0; } }

  function activate(p){
    if(!p.abilitiesUnlocked) return;   // dormant until the first boss (registry hints on press)
    const cd=Abilities.cdLeft(p,'innerMonster');
    if(cd>0){ showToast(`⏳ Inner Monster recharging (${Math.ceil(cd/1000)}s)`, 1400); return; }
    const cfg=params(p);
    p.monsterT=cfg.dur; p.meleeCd=0;
    Abilities.startCd(p,'innerMonster',cfg.cdMs);
    if(typeof sfxRoar==='function') sfxRoar();
    spawnSparkles(p.x, p.y-10, '#FF3020', 18);
    showToast('👹 Ťapka unleashes her inner monster!', 1800);
  }

  function nearestFoe(p, range){
    let best=null, bestD=range;
    for(const e of entities){
      if(typeof e.hp!=='number' || (e.kind!=='enemy' && e.kind!=='wolf')) continue;
      const d=Math.hypot(e.x-p.x, e.y-p.y);
      if(d<bestD){ best=e; bestD=d; }
    }
    return best;
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;

    const held=Input.held(trigger);
    if(held && !update._qHeld) activate(p);
    update._qHeld=held;

    if(p.meleeCd>0) p.meleeCd=Math.max(0, p.meleeCd-dt);
    if(!(p.monsterT>0)) return;
    p.monsterT=Math.max(0, p.monsterT-dt);
    if(p.monsterT===0){ showToast('😌 The monster settles…', 1400); return; }

    // melee bite: chomp the nearest touching foe on the bite cooldown (safe — this
    // runs from Abilities.update, outside the Entities.updateAll loop)
    if(p.meleeCd<=0){
      const e=nearestFoe(p, BITE_R);
      if(e){
        const cfg=params(p);
        p.meleeCd=BITE_CD;
        // equipment can add bite damage (e.g. Royal Crown +1)
        const dmg=(typeof Equip!=='undefined') ? Equip.abilityMod(p,'monster','dmg', cfg.dmg) : cfg.dmg;
        Entities.hurt(e, dmg, p.x, p.y, 12);
        spawnSparkles(e.x, e.y-6, '#FF6040', 8);
        if(typeof Health!=='undefined'){ const got=Health.heal(p, cfg.heal); if(got>0) spawnSparkles(p.x, p.y-10, '#FF9E9E', 5); }
      }
    }
  }

  Abilities.register('innerMonster', { name:'Inner Monster', icon:'👹', skillNode:'monster', spawn, reset, update, speedMul });
})();
