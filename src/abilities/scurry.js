// ====================== ABILITY: SCURRY (Ťapka, E) ======================
// A quick evasive dash in Ťapka's facing direction with a burst of invulnerability —
// pure escape utility, no damage. Sets p.dashT + p.dashVX/VY (applied in updatePlayer
// so collisions still resolve) and p.invulnT (Health.damage no-ops while >0). L3 leaves
// a short speed burst on landing. Cooldown-based; gated by the 'scurry' skill node.

(function(){
  const DASH_MS=180;
  const PARAMS={
    1:{ dist:90,  invulnExtra:120, burstMs:0,    cdMs:9000 },
    2:{ dist:120, invulnExtra:150, burstMs:0,    cdMs:7000 },
    3:{ dist:120, invulnExtra:150, burstMs:1000, cdMs:5000 },
  };
  const DIRV={ up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

  function owner(){ for(const p of Game.players){ if(Abilities.playerHas(p,'scurry')) return p; } return null; }
  function lvl(p){ return (typeof Skills!=='undefined') ? Skills.level(p,'scurry') : 0; }
  function params(p){ return PARAMS[Math.min(3, Math.max(1, lvl(p)))]; }
  // L3 leaves a brief speed burst after the dash (p.scurryBurstT).
  function speedMul(p){ return (p && p.scurryBurstT>0) ? 1.3 : 1; }

  function spawn(){}
  function reset(){ if(p1){ p1.dashT=0; p1.dashVX=0; p1.dashVY=0; p1.scurryBurstT=0; } }

  function activate(p){
    const L=lvl(p);
    if(L<1){ showToast(`🌳 Learn Scurry in the Skill Tree [${Input.keyName(Input.bindings.skills[0]||Input.bindings.skills[1])}]`, 2200); return; }
    const cd=Abilities.cdLeft(p,'scurry');
    if(cd>0){ showToast(`⏳ Scurry recharging (${Math.ceil(cd/1000)}s)`, 1200); return; }
    const cfg=params(p);
    const [ux,uy]=DIRV[p.dir]||DIRV.down;
    const perFrame=cfg.dist / (DASH_MS/FRAME_MS);   // px per 60fps-frame over the dash
    p.dashT=DASH_MS; p.dashVX=ux*perFrame; p.dashVY=uy*perFrame;
    p.invulnT=DASH_MS + cfg.invulnExtra;
    if(cfg.burstMs>0) p.scurryBurstT=cfg.burstMs;
    Abilities.startCd(p,'scurry',cfg.cdMs);
    if(typeof sfxDash==='function') sfxDash();
    spawnSparkles(p.x, p.y+4, '#D8CFC0', 8);   // dust puff
    showToast('💨 Scurry!', 900);
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;
    const held=Input.held(trigger);
    if(held && !update._eHeld) activate(p);
    update._eHeld=held;
    if(p.scurryBurstT>0) p.scurryBurstT=Math.max(0, p.scurryBurstT-dt);
  }

  Abilities.register('scurry', { name:'Scurry', icon:'💨', skillNode:'scurry', spawn, reset, update, speedMul });
})();
