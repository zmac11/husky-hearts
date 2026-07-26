// ====================== ABILITY: BALL CANNON (placeable turret) ======================
// Lolla's signature ability, gated by the 'cannon' skill-tree node (data/skills.js).
// Q places (or moves) the cannon at her feet. Load it by USING a 🎾 ball from the
// hotbar while standing within LOAD_R of it (ui.js useHotbar 'toy' branch calls
// Abilities.tryLoadBall). It auto-fires at the nearest enemy in range: hit enemies
// take damage + a knockback shove (Entities.hurt), and the spent ball drops as a
// collectible at the impact point — ammo is recyclable. Skill levels (L1–L3) raise
// magazine size, fire rate, range, damage, and finally auto-reload from the bag.

(function(){
  let cannon = null;   // { x, y, angle, mag, fireCd, firingT, smoke[], reloadCd }
  let shots  = [];     // flying balls: { x,y, sx,sy, tx,ty, prog, dur, target }

  const LOAD_R  = 48;  // stand this close to load / auto-reload
  const PARAMS  = {    // per mastery level (index = level; 0 = the freshly-unlocked base tier)
    0: { cap:1, range:140, dmg:1, fireMs:1800, autoReload:false },
    1: { cap:1, range:180, dmg:2, fireMs:1400, autoReload:false },
    2: { cap:3, range:180, dmg:2, fireMs:1000, autoReload:false },
    3: { cap:3, range:260, dmg:3, fireMs:1000, autoReload:true  },
  };

  function owner(){
    for(const p of Game.players){ if(Abilities.playerHas(p,'ballCannon')) return p; }
    return null;
  }
  function skillLevel(p){ return (typeof Skills!=='undefined' && p) ? Skills.level(p,'cannon') : 0; }
  function params(p){ return PARAMS[Math.min(3, Math.max(0, skillLevel(p)))]; }
  // Magazine capacity including equipment abilityMods (e.g. Ball Cap +1).
  function capOf(p){ return (typeof Equip!=='undefined') ? Equip.abilityMod(p,'cannon','capacity', params(p).cap) : params(p).cap; }

  function spawn(){ /* nothing pre-placed — Lolla places the cannon herself */ }
  function reset(){ cannon=null; shots=[]; }

  // Q pressed (registry routes the ability trigger here via onTrigger).
  function place(p){
    if(!p.abilitiesUnlocked) return;   // dormant until the first boss (registry hints on press)
    const cd=Abilities.cdLeft(p,'ballCannon');
    if(cd>0){ showToast(`⏳ Cannon recharging (${Math.ceil(cd/1000)}s)`, 1200); return; }
    Abilities.startCd(p,'ballCannon',2000);   // placement feels deliberate, not spammy
    const spot={ x:p.x, y:p.y+6 };
    nudgeOutOfWater(spot, 20);
    if(!cannon) cannon={ x:spot.x, y:spot.y, angle:0, mag:0, fireCd:0, firingT:0, smoke:[], reloadCd:0 };
    else { cannon.x=spot.x; cannon.y=spot.y; }
    spawnSparkles(spot.x, spot.y-6, '#C9A6FF', 10);
    if(typeof sfxCollect==='function') sfxCollect();
    showToast(cannon.mag>0 ? '🎾 Cannon moved (magazine kept)' : '🎾 Cannon placed — load it with balls from your hotbar!', 1800);
  }

  // Called from ui.js useHotbar when a 🎾 ball is used. Returns:
  //   'loaded' — ball went into the magazine (caller consumes it from the bag)
  //   'full'   — near the cannon but the magazine is full (ball kept, toast shown)
  //   false    — no cannon / not near it (caller falls back to play-flavor)
  function tryLoadBall(p){
    if(!cannon || !Abilities.playerHas(p,'ballCannon') || !p.abilitiesUnlocked) return false;
    if(Math.hypot(p.x-cannon.x, p.y-cannon.y)>LOAD_R) return false;
    const cap=capOf(p);
    if(cannon.mag>=cap){ showToast(`🎾 Magazine full (${cannon.mag}/${cap})`, 1200); return 'full'; }
    cannon.mag++;
    if(typeof sfxCollect==='function') sfxCollect();
    showToast(`🎾 Loaded! (${cannon.mag}/${cap})`, 1200);
    return 'loaded';
  }

  function nearestEnemy(range){
    let best=null, bestD=range;
    for(const e of entities){
      if(typeof e.hp!=='number' || (e.kind!=='enemy' && e.kind!=='wolf')) continue;
      const d=Math.hypot(e.x-cannon.x, e.y-cannon.y);
      if(d<bestD){ best=e; bestD=d; }
    }
    return best;
  }

  function update(p, dt, trigger){
    const dog=owner();
    if(!dog || dog.id!==p.id) return;

    // Q → place / move (edge-triggered)
    const held=Input.held(trigger);
    if(held && !update._qHeld) place(p);
    update._qHeld=held;

    if(!cannon) return;
    const cfg=params(p);

    // animation bookkeeping
    if(cannon.firingT>0){
      cannon.firingT=Math.max(0, cannon.firingT-dt);
      cannon.smoke.forEach(s=>{ s.x+=s.vx*dtScale; s.y+=s.vy*dtScale; s.vy-=0.04*dtScale; s.life-=dt; s.r+=0.04*dtScale; });
      cannon.smoke=cannon.smoke.filter(s=>s.life>0);
    }
    if(cannon.fireCd>0) cannon.fireCd=Math.max(0, cannon.fireCd-dt);

    // L3: auto-reload from the bag while Lolla stands close
    const cap=capOf(p);
    if(cfg.autoReload && cannon.mag<cap && Math.hypot(p.x-cannon.x,p.y-cannon.y)<LOAD_R){
      cannon.reloadCd-=dt;
      if(cannon.reloadCd<=0 && Inventory.count(p,'ball')>0){
        Inventory.remove(p,'ball',1); cannon.mag++;
        cannon.reloadCd=1200;
        if(typeof sfxCollect==='function') sfxCollect();
        showToast(`🎾 Auto-loaded (${cannon.mag}/${cap})`, 900);
        if(typeof updateHUD==='function') updateHUD();
      }
    } else cannon.reloadCd=0;

    // auto-fire at the nearest enemy in range
    const target=nearestEnemy(cfg.range);
    if(target) cannon.angle=Math.atan2(target.y-cannon.y, target.x-cannon.x);   // track it
    if(target && cannon.mag>0 && cannon.fireCd<=0) fire(target, cfg);

    // advance flying balls — they HOME onto their target (moving wolves used to
    // outrun shots aimed at their fire-time position, so nothing ever landed)
    shots.forEach(s=>{
      const e=s.target;
      const alive=e && entities.indexOf(e)!==-1;
      if(alive){ s.tx=e.x; s.ty=e.y; }             // keep tracking while it lives
      s.prog+=dt/s.dur;
      if(s.prog>=1){
        s.done=true;
        if(alive){
          Entities.hurt(e, s.dmg, cannon.x, cannon.y, 12);
          spawnSparkles(s.tx, s.ty-6, '#B5E853', 10);
        }
        // the spent ball lands as plain recyclable ammo (no treat, no glow badge)
        const spot={ x:clamp(s.tx+rand(-10,10), 30, WORLD_W-30), y:clamp(s.ty+rand(-6,10), 30, WORLD_H-30) };
        nudgeOutOfWater(spot, 12);
        collectibles.push({ x:spot.x, y:spot.y, type:'ball', taken:false, bob:rand(0,Math.PI*2),
                            dropped:true, plain:true, pickupAt:performance.now()+650 });
      } else {
        s.x=s.sx+(s.tx-s.sx)*s.prog;
        s.y=s.sy+(s.ty-s.sy)*s.prog;
      }
    });
    shots=shots.filter(s=>!s.done);
  }

  function fire(target, cfg){
    cannon.mag--;
    cannon.fireCd=cfg.fireMs;
    cannon.firingT=500;
    shots.push({ sx:cannon.x, sy:cannon.y-6, x:cannon.x, y:cannon.y-6,
                 tx:target.x, ty:target.y, prog:0, dur:280, target, dmg:cfg.dmg });
    if(typeof sfxDeliver==='function') sfxDeliver();
    const tipX=cannon.x+Math.cos(cannon.angle)*35;
    const tipY=cannon.y+Math.sin(cannon.angle)*35;
    for(let i=0;i<6;i++){
      cannon.smoke.push({
        x:tipX+rand(-3,3), y:tipY+rand(-3,3),
        vx:Math.cos(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3),
        vy:Math.sin(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3)-0.3,
        r:rand(3,6), life:rand(280,500),
        col:Math.random()<0.5?'#CCCCCC':'#AAAAAA'
      });
    }
  }

  // ---- Drawing ----

  function drawWorld(t){
    drawCannon(t);
    shots.forEach(s=>{
      const h=Math.sin(s.prog*Math.PI)*18;   // small arc
      const bx=Math.round(s.x), by=Math.round(s.y-h);
      ctx.fillStyle='#B5E853'; ctx.beginPath(); ctx.arc(bx,by,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#CCFF77'; ctx.beginPath(); ctx.arc(bx-1,by-1,2,0,Math.PI*2); ctx.fill();
      const spin=s.prog*Math.PI*6;
      ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(bx,by,4,spin,spin+Math.PI); ctx.stroke();
    });
  }

  function drawCannon(t){
    if(!cannon) return;
    const dog=owner();
    const cfg=dog?params(dog):PARAMS[1];
    const cx=Math.round(cannon.x), cy=Math.round(cannon.y);
    const bob=cannon.firingT>0 ? 0 : Math.sin(t/700)*1;

    // faint range ring while the owner stands near (helps placement)
    if(dog && Math.hypot(dog.x-cannon.x,dog.y-cannon.y)<LOAD_R+30){
      ctx.save();
      ctx.globalAlpha=0.13; ctx.strokeStyle='#4A6A3A'; ctx.lineWidth=2; ctx.setLineDash([6,7]);
      ctx.beginPath(); ctx.ellipse(cx,cy,cfg.range,cfg.range*0.6,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    cannon.smoke.forEach(s=>{
      const a=Math.max(0, (s.life/400)*0.55);
      ctx.globalAlpha=a;
      ctx.fillStyle=s.col;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;

    ctx.save();
    ctx.translate(cx, cy+bob);

    ctx.globalAlpha=0.18;
    ctx.beginPath(); ctx.ellipse(2,8,18,7,0,0,Math.PI*2);
    ctx.fillStyle='#1A2A1A'; ctx.fill();
    ctx.globalAlpha=1;

    // wooden carriage + wheels
    ctx.fillStyle='#6B4C2A'; ctx.fillRect(-16,2,32,8);
    ctx.fillStyle='#7A5830'; ctx.fillRect(-14,0,28,6);
    [-10,10].forEach(wx=>{
      ctx.fillStyle='#4A3018'; ctx.beginPath(); ctx.arc(wx,6,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#7A5830'; ctx.beginPath(); ctx.arc(wx,6,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#AA8850'; ctx.beginPath(); ctx.arc(wx,6,1,0,Math.PI*2); ctx.fill();
    });

    // barrel tracks the current target
    ctx.rotate(cannon.angle);
    let recoil=0;
    if(cannon.firingT>400)      recoil=((500-cannon.firingT)/100)*8;
    else if(cannon.firingT>300) recoil=((cannon.firingT-300)/100)*8;

    ctx.fillStyle='#4A4A4A';
    ctx.beginPath(); ctx.roundRect(4-recoil,-5,28,10,3); ctx.fill();
    ctx.fillStyle='#666';
    ctx.fillRect(6-recoil,-3,24,6);
    ctx.fillStyle='#FFD700';
    ctx.fillRect(14-recoil,-3,4,6);
    ctx.fillStyle='#2A2A2A'; ctx.fillRect(30-recoil,-6,5,12);
    ctx.fillStyle='#555';   ctx.fillRect(31-recoil,-5,3,10);

    if(cannon.firingT>400){
      const flashA=(cannon.firingT-400)/100;
      ctx.globalAlpha=flashA*0.9;
      const tipX=35-recoil;
      ctx.fillStyle='#FFAA00';
      ctx.beginPath(); ctx.arc(tipX,0,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFFFFF';
      ctx.beginPath(); ctx.arc(tipX,0,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#FFDD00'; ctx.lineWidth=2;
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3;
        ctx.beginPath();
        ctx.moveTo(tipX+Math.cos(a)*5, Math.sin(a)*5);
        ctx.lineTo(tipX+Math.cos(a)*13, Math.sin(a)*13);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }

    ctx.restore();

    // magazine pips above the cannon (loaded balls / capacity, incl. gear bonuses)
    const cap=dog?capOf(dog):cfg.cap;
    const pipsW=cap*8-3;
    for(let i=0;i<cap;i++){
      const px0=cx-pipsW/2+i*8, py0=cy+bob-24;
      ctx.beginPath(); ctx.arc(px0+2, py0, 3, 0, Math.PI*2);
      ctx.fillStyle=i<cannon.mag ? '#B5E853' : 'rgba(255,248,239,0.4)';
      ctx.fill();
      ctx.lineWidth=1; ctx.strokeStyle='rgba(74,63,53,0.6)'; ctx.stroke();
    }
    if(cannon.mag===0 && Math.floor(t/600)%2===0){
      ctx.fillStyle='rgba(255,248,239,0.9)';
      ctx.font='bold 8px monospace'; ctx.textAlign='center';
      ctx.fillText('LOAD ME', cx, cy+bob-30);
    }
  }

  Abilities.register('ballCannon', {
    name:'Ball Cannon', icon:'🎾', skillNode:'cannon',
    spawn, reset, update, drawWorld,
    tryLoadBall,                       // ui.js useHotbar hook
    state(){ return cannon; },         // for debugging/tests
  });
})();
