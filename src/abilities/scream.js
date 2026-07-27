// ====================== ABILITY: PIERCING SCREAM (Lolla, E) ======================
// Lolla screams for a few seconds (p.screamT ms). She keeps moving freely; the scream
// aura follows her. Every pulse it damages + knocks back all foes within radius, and
// at higher levels has a chance to frighten them (e.fearedT — enemies flee). Expanding
// shockwave rings visualise each pulse. Cooldown-based; gated by the 'scream' node.

(function(){
  const PARAMS={
    0:{ dur:2000, pulseMs:600, dmg:1, radius:80,  fear:0,    cdMs:24000 },
    1:{ dur:2500, pulseMs:500, dmg:2, radius:95,  fear:0,    cdMs:20000 },
    2:{ dur:3000, pulseMs:500, dmg:2, radius:115, fear:0.25, cdMs:20000 },
    3:{ dur:3500, pulseMs:500, dmg:3, radius:135, fear:0.45, cdMs:18000 },
  };
  let pulseCd=0, rings=[];

  function owner(){ for(const p of Game.players){ if(Abilities.playerHas(p,'scream')) return p; } return null; }
  function lvl(p){ return (typeof Skills!=='undefined') ? Skills.level(p,'scream') : 0; }
  function params(p){ return PARAMS[Math.min(3, Math.max(0, lvl(p)))]; }

  function spawn(){}
  function reset(){ pulseCd=0; rings=[]; if(p1) p1.screamT=0; }

  function activate(p){
    if(!p.abilitiesUnlocked) return;   // dormant until the first boss (registry hints on press)
    const cd=Abilities.cdLeft(p,'scream');
    if(cd>0){ showToast(`⏳ Scream recharging (${Math.ceil(cd/1000)}s)`, 1400); return; }
    const cfg=params(p);
    p.screamT=cfg.dur;
    Abilities.startCd(p,'scream',cfg.cdMs);
    pulseCd=0;                           // first pulse immediately
    if(typeof sfxScream==='function') sfxScream();
    showToast('🔊 Lolla lets out a piercing scream!', 1600);
  }

  function pulse(p, cfg){
    rings.push({ x:p.x, y:p.y, r:16, max:cfg.radius, life:400 });
    for(const e of entities){
      if(typeof e.hp!=='number' || (e.kind!=='enemy' && e.kind!=='wolf')) continue;
      if(Math.hypot(e.x-p.x, e.y-p.y)<=cfg.radius){
        Entities.hurt(e, cfg.dmg, p.x, p.y, 16);
        if(cfg.fear>0 && Math.random()<cfg.fear) e.fearedT=800;
      }
    }
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;

    const held=Input.held(trigger);
    if(held && !update._eHeld) activate(p);
    update._eHeld=held;

    rings.forEach(r=>{ r.life-=dt; r.r+=(r.max-16)*(dt/400); });
    rings=rings.filter(r=>r.life>0);

    if(!(p.screamT>0)) return;
    p.screamT=Math.max(0, p.screamT-dt);
    const cfg=params(p);
    pulseCd-=dt;
    if(pulseCd<=0){ pulse(p, cfg); pulseCd=cfg.pulseMs; if(typeof sfxScream==='function' && p.screamT>0) sfxScream(); }
  }

  function drawWorld(t){
    if(!rings.length) return;
    rings.forEach(r=>{
      const a=Math.max(0, r.life/400);
      ctx.save();
      ctx.globalAlpha=a*0.7;
      ctx.strokeStyle='#FF9ED2'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r*0.6, 0, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha=a*0.4;
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r*0.7, r.r*0.42, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    });
  }

  Abilities.register('scream', { name:'Piercing Scream', icon:'🔊', skillNode:'scream', spawn, reset, update, drawWorld });
})();
