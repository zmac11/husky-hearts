// ====================== ABILITY: STORM FANG (Dinno, Q) ======================
// Dinno lets out his inner wolf: for the storm's duration his coat turns storm-grey
// with glowing eyes (p.wolfT drives the palette swap in dog-sprite.js), the sky
// darkens with rain and ambient flashes, he runs faster, and lightning bolts strike
// nearby enemies. L2 adds a fear aura (enemies flee); L3 chains bolts to a second
// enemy. Cooldown-based (abilities/registry.js cd helpers). Gated by the 'stormfang'
// skill node.

(function(){
  const PARAMS={
    0:{ dur:6000,  boltMs:4200, dmg:2, speedMul:1.10, fear:0,   chain:false, cdMs:52000 },
    1:{ dur:8000,  boltMs:3500, dmg:4, speedMul:1.15, fear:0,   chain:false, cdMs:45000 },
    2:{ dur:10000, boltMs:2500, dmg:4, speedMul:1.15, fear:160, chain:false, cdMs:45000 },
    3:{ dur:12000, boltMs:2000, dmg:5, speedMul:1.25, fear:160, chain:true,  cdMs:40000 },
  };
  const BOLT_RANGE=220;

  // storm visual state (module-private; resets with the level)
  let boltCd=0, bolts=[], rain=null, flashT=0, nextFlash=0;

  function owner(){
    for(const p of Game.players){ if(Abilities.playerHas(p,'stormFang')) return p; }
    return null;
  }
  function lvl(p){ return (typeof Skills!=='undefined') ? Skills.level(p,'stormfang') : 0; }
  function params(p){ return PARAMS[Math.min(3, Math.max(0, lvl(p)))]; }
  // Exposed so update.js can apply the speed buff.
  function speedMul(p){ return (p && p.wolfT>0) ? params(p).speedMul : 1; }

  function spawn(){}
  function reset(){ boltCd=0; bolts=[]; rain=null; flashT=0; nextFlash=0; if(p1) p1.wolfT=0; }

  function activate(p){
    if(!p.abilitiesUnlocked) return;   // dormant until the first boss (registry hints on press)
    const cd=Abilities.cdLeft(p,'stormFang');
    if(cd>0){ showToast(`⏳ Storm Fang recharging (${Math.ceil(cd/1000)}s)`, 1400); return; }
    const cfg=params(p);
    p.wolfT=cfg.dur;
    // equipment can shorten the cooldown (e.g. Royal Crown −5s)
    const cdMs=(typeof Equip!=='undefined') ? Math.max(1000, Equip.abilityMod(p,'stormfang','cdMs', cfg.cdMs)) : cfg.cdMs;
    Abilities.startCd(p,'stormFang',cdMs);
    boltCd=600;                    // first bolt lands quickly — feels immediate
    flashT=260; nextFlash=rand(1200,2600);
    if(typeof sfxThunder==='function') sfxThunder();
    spawnSparkles(p.x, p.y-14, '#7FD4FF', 20);
    showToast('⚡ Dinno unleashes his inner wolf!', 1800);
  }

  function nearestFoe(x, y, range, except){
    let best=null, bestD=range;
    for(const e of entities){
      if(e===except || typeof e.hp!=='number' || (e.kind!=='enemy' && e.kind!=='wolf')) continue;
      const d=Math.hypot(e.x-x, e.y-y);
      if(d<bestD){ best=e; bestD=d; }
    }
    return best;
  }

  function strike(p, cfg){
    const e=nearestFoe(p.x, p.y, BOLT_RANGE, null);
    if(!e) return;
    _bolt(e.x, e.y);
    Entities.hurt(e, cfg.dmg, p.x, p.y, 14);
    if(cfg.chain){
      const e2=nearestFoe(e.x, e.y, 120, e);
      if(e2){ _bolt(e2.x, e2.y); Entities.hurt(e2, Math.ceil(cfg.dmg/2), e.x, e.y, 10); }
    }
    flashT=Math.max(flashT, 200);
    if(typeof sfxThunder==='function') sfxThunder();
  }

  function _bolt(tx, ty){
    // jagged polyline from the sky down to the target
    const pts=[]; const topY=cam.y-20;
    let x=tx+rand(-30,30);
    const steps=6;
    for(let i=0;i<=steps;i++){
      const yy=topY+(ty-topY)*(i/steps);
      pts.push({ x:(i===steps)?tx:x+rand(-14,14), y:yy });
      x=pts[pts.length-1].x;
    }
    bolts.push({ pts, life:260 });
    spawnSparkles(tx, ty-6, '#AEE8FF', 12);
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;

    // Q → activate (edge-triggered)
    const held=Input.held(trigger);
    if(held && !update._qHeld) activate(p);
    update._qHeld=held;

    bolts.forEach(b=>b.life-=dt);
    bolts=bolts.filter(b=>b.life>0);
    if(flashT>0) flashT=Math.max(0,flashT-dt);

    if(!(p.wolfT>0)) return;
    p.wolfT=Math.max(0, p.wolfT-dt);
    if(p.wolfT===0){ showToast('🌤️ The storm passes…', 1400); return; }

    const cfg=params(p);
    // periodic lightning
    boltCd-=dt;
    if(boltCd<=0){ strike(p, cfg); boltCd=cfg.boltMs; }
    // ambient sky flashes
    nextFlash-=dt;
    if(nextFlash<=0){ flashT=Math.max(flashT,140); nextFlash=rand(1400,3000); }
    // fear aura
    if(cfg.fear>0){
      for(const e of entities){
        if(typeof e.hp!=='number' || (e.kind!=='enemy' && e.kind!=='wolf')) continue;
        if(Math.hypot(e.x-p.x, e.y-p.y)<cfg.fear) e.fearedT=600;
      }
    }
  }

  function drawWorld(t){
    const dog=owner();
    const storming=dog && dog.wolfT>0;

    if(storming){
      // lazily (re)build rain for the viewport
      if(!rain) rain=Array.from({length:70},()=>({ x:Math.random()*VIEW_W, y:Math.random()*VIEW_H, s:6+Math.random()*7 }));
      // dark storm tint over the visible viewport (drawn in world space at the camera)
      const fadeIn=Math.min(1,(params(dog).dur-dog.wolfT)/400), fadeOut=Math.min(1,dog.wolfT/600);
      const a=0.26*Math.min(fadeIn,fadeOut);
      ctx.fillStyle=`rgba(18,24,48,${a})`;
      ctx.fillRect(cam.x, cam.y, VIEW_W, VIEW_H);
      // rain streaks
      ctx.strokeStyle='rgba(174,216,255,0.35)'; ctx.lineWidth=1;
      rain.forEach(r=>{
        r.x-=r.s*0.35*dtScale; r.y+=r.s*dtScale;
        if(r.y>VIEW_H){ r.y=-10; r.x=Math.random()*(VIEW_W+60); }
        const sx=cam.x+((r.x%VIEW_W)+VIEW_W)%VIEW_W, sy=cam.y+r.y;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx-3,sy+r.s); ctx.stroke();
      });
    } else rain=null;

    // lightning bolts
    bolts.forEach(b=>{
      const a=b.life/260;
      ctx.save();
      ctx.globalAlpha=a;
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=3; ctx.lineJoin='round';
      ctx.beginPath(); b.pts.forEach((pt,i)=> i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)); ctx.stroke();
      ctx.strokeStyle='#7FD4FF'; ctx.lineWidth=1.5;
      ctx.beginPath(); b.pts.forEach((pt,i)=> i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)); ctx.stroke();
      ctx.restore();
    });

    // white flash (bolt impact / ambient sheet lightning)
    if(flashT>0){
      ctx.fillStyle=`rgba(240,248,255,${0.35*(flashT/260)})`;
      ctx.fillRect(cam.x, cam.y, VIEW_W, VIEW_H);
    }
  }

  Abilities.register('stormFang', {
    name:'Storm Fang', icon:'⚡', skillNode:'stormfang',
    spawn, reset, update, drawWorld, speedMul,
  });
})();
