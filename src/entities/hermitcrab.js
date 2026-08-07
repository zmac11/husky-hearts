// ====================== ENTITY: THE GIANT HERMIT CRAB (Seashell Cove boss) ======================
// You fight the CLOCK as much as the crab. It reads the tide (tide.js):
//   • HIGH tide — it withdraws into its armored shell: INVULNERABLE, and it only SHOULDER-
//     CHARGES in telegraphed lines. Bait a charge into the arena rocks / walls and it cracks
//     its own shell (a stagger window where the armor drops even at high tide — the
//     environmental punish, echoing the Badger Baron's pits).
//   • LOW tide — the shell is exposed and VULNERABLE. It menaces you with a telegraphed
//     CLAW-SWEEP (a groundzone arc) while you get your hits in.
// Below a third health it PANICS, churning the tide faster (Tide._speed) so the safe windows
// flip quicker. Cozy failure → normal Game Over → Play Again. It's the last real level of the
// cove, so downing it drops the biome-finale golden chest via checkWin.

function _hcNearest(e){
  let best=null, bd=Infinity;
  for(const p of Game.players){ if(!p || p.dead) continue; const d=Math.hypot(p.x-e.x, p.y-e.y); if(d<bd){ bd=d; best=p; } }
  return best;
}
// True if a point is blocked by a solid collider or hard against the arena wall — the crab
// "crashes" here mid-charge and cracks its shell.
function _hcHitsRock(x,y){
  if(x<40 || x>WORLD_W-40 || y<48 || y>WORLD_H-40) return true;
  for(const c of colliders){
    if(x>c.x-6 && x<c.x+c.w+6 && y>c.y-6 && y<c.y+c.h+6){
      // ignore the thin world-border strips (handled by the edge test above) — only chunky rocks
      if(c.w<WORLD_W-40 && c.h<WORLD_H-40) return true;
    }
  }
  return false;
}

Entities.register('hermitcrab', {
  radius: 46,

  init(e){
    e.name='The Giant Hermit Crab'; e.boss=true; e.noKnockback=true;
    e.maxHp=e.maxHp||52; e.hp=(typeof e.hp==='number'&&e.hp<=e.maxHp)?e.hp:e.maxHp;
    e.speed=e.speed||0.8; e.dmg=e.dmg||3; e.scale=e.scale||BOSS_SCALE;
    e.dir=-1; e.state='track'; e.actT=0;
    e.chargeCd=2600; e.sweepCd=3200; e.staggerT=0; e.touchCd=0;
    e.cvx=0; e.cvy=0; e.bob=0;
  },

  update(e, t, dt){
    const p=_hcNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, panic=frac<=0.34;
    const covered=(typeof Tide!=='undefined') ? Tide.covered() : false;
    const S=e.scale||1;

    // Panic churns the tide (safe windows flip faster).
    if(typeof Tide!=='undefined') Tide._speed = panic ? 2.4 : 1;

    // Armor: sealed at high tide UNLESS cracked open by a recent crash (stagger window).
    e.staggerT=Math.max(0, e.staggerT-dt);
    e.armored = covered && e.staggerT<=0;
    e.invuln  = e.armored;

    e.chargeCd=Math.max(0,e.chargeCd-dt); e.sweepCd=Math.max(0,e.sweepCd-dt);
    if(e.touchCd>0) e.touchCd=Math.max(0,e.touchCd-dt);
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    if(e.alertT>0) e.alertT=Math.max(0,e.alertT-dt);

    // ---- scripted states ----
    if(e.state==='chargewind'){
      e.actT-=dt;
      if(e.actT<=0){ e.state='charge'; e.actT= panic?720:900;
        const a=Math.atan2(p.y-e.y,p.x-e.x); const L=(panic?8:6.5)*S; e.cvx=Math.cos(a)*L; e.cvy=Math.sin(a)*L; e.dir=e.cvx>=0?1:-1;
        if(typeof sfxDash==='function') sfxDash(); }
      e.bob=t; return;
    }
    if(e.state==='charge'){
      const nx=e.x+e.cvx*dtScale, ny=e.y+e.cvy*dtScale;
      if(_hcHitsRock(nx,ny)){
        // CRASH — crack the shell open (works even at high tide).
        e.state='stagger'; e.actT=0; e.staggerT= panic?1800:2600;
        if(typeof spawnSparkles==='function') spawnSparkles(e.x,e.y-6,'#F0E0C0',24);
        if(typeof spawnFloater==='function') spawnFloater(e.x,e.y-20,'CRACK!','hit');
        if(typeof sfxWin==='function') sfxWin();
        showToast('💥 The crab smashed its shell on the rocks — hit it now!', 2200);
        if(typeof screenShake==='function') screenShake(8);
        e.bob=t; return;
      }
      e.x=clamp(nx,20,WORLD_W-20); e.y=clamp(ny,26,WORLD_H-20);
      if(dist<34*S && e.touchCd<=0){ _hcBash(e,p); e.touchCd=800; }
      e.actT-=dt;
      if(e.actT<=0){ e.state='track'; e.chargeCd= panic?2000:3000; }
      e.bob=t; return;
    }
    if(e.state==='sweepwind'){
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.sweepCd= panic?2600:3800;
        // claw-sweep: a groundzone arc just in front of the crab
        const a=Math.atan2(p.y-e.y,p.x-e.x);
        const gx=e.x+Math.cos(a)*40*S, gy=e.y+Math.sin(a)*40*S;
        Entities.spawn('groundzone',{ x:gx, y:gy, r:58*S, warnMs:panic?260:380, dmg:e.dmg+1, color:'#E0562F', scale:S });
        if(typeof spawnSparkles==='function') spawnSparkles(e.x+e.dir*20,e.y,'#E0562F',10);
      }
      e.bob=t; return;
    }

    // ---- decide the next move (track) ----
    // At high tide (armored) it CHARGES — the only way in is baiting a crash. At low tide
    // (exposed) it SWEEPS while you punish. Panic keeps both up.
    if((covered || panic) && e.chargeCd<=0 && dist>90 && dist<560){
      e.state='chargewind'; e.actT= panic?520:680; e.alertT=650; e.bob=t; return;
    }
    if((!covered || panic) && e.sweepCd<=0 && dist<120*S){
      e.state='sweepwind'; e.actT= panic?360:520; e.alertT=550; e.bob=t; return;
    }
    // amble toward the dog
    const a=Math.atan2(p.y-e.y,p.x-e.x);
    const spd=e.speed*(panic?1.3:1);
    e.x=clamp(e.x+Math.cos(a)*spd*dtScale,20,WORLD_W-20);
    e.y=clamp(e.y+Math.sin(a)*spd*dtScale,26,WORLD_H-20);
    e.dir=Math.cos(a)>=0?1:-1;
    if(dist<30*S && e.touchCd<=0){ _hcBash(e,p); e.touchCd=1000; }
    e.bob=t;
  },

  draw(e, t){
    const S=e.scale||1, D=e.dir;
    const x=Math.round(e.x), y0=Math.round(e.y);
    const crouch=(e.state==='chargewind'||e.state==='sweepwind');
    const y=y0+(crouch?2:Math.round(Math.sin(t/300)*1));
    const exposed=!e.armored;
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);

    // shadow
    ctx.globalAlpha=0.26; ctx.beginPath(); ctx.ellipse(x,y0+16,30,8,0,0,Math.PI*2); ctx.fillStyle='#0C1414'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell
    if(crouch){ ctx.save(); ctx.globalAlpha=0.28+0.2*Math.sin(t/60); ctx.fillStyle=e.state==='chargewind'?'#D65A3C':'#E0A040'; ctx.beginPath(); ctx.ellipse(x,y+8,34,14,0,0,Math.PI*2); ctx.fill(); ctx.restore(); }

    // ---- the borrowed spiral shell (its "home") ----
    const sc = exposed ? '#C98A5A' : '#B57A48';
    px(x-26,y-14,26,26,sc); px(x-24,y-16,22,10,'#DCA774');
    // spiral banding
    ctx.strokeStyle='#8A5A34'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x-13,y-1,11,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x-13,y-1,6,0,Math.PI*2); ctx.stroke();
    // barnacles / spikes
    px(x-22,y-16,3,3,'#EAD3A8'); px(x-8,y-15,3,3,'#EAD3A8'); px(x-24,y-2,3,3,'#EAD3A8');
    // crack when staggered
    if(e.staggerT>0){ ctx.strokeStyle='#3A2A1A'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x-20,y-10); ctx.lineTo(x-13,y-2); ctx.lineTo(x-18,y+6); ctx.stroke(); }

    if(e.armored){
      // withdrawn — just a peeking eye + a sealing pincer across the mouth
      px(x-2,y-2,7,7,'#C0432E'); px(x-1,y-4,3,3,'#20140F');
      ctx.save(); ctx.globalAlpha=0.5; ctx.fillStyle='#DDE6EC'; ctx.fillRect(x-6,y-8,14,3); ctx.restore();
    } else {
      // ---- exposed crab body reaching out of the shell ----
      // legs
      ctx.strokeStyle='#C0432E'; ctx.lineWidth=2.5;
      for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(x+4,y+4); ctx.lineTo(x+16,y+8+i*4); ctx.stroke(); }
      px(x-2,y-6,18,14,'#E0562F'); px(x,y-8,14,6,'#EC6A42'); px(x+1,y-7,12,2,'#F4906E');
      // eye stalks
      px(x+3,y-13,2,5,'#C0432E'); px(x+9,y-13,2,5,'#C0432E');
      px(x+2,y-16,3,3,'#20140F'); px(x+8,y-16,3,3,'#20140F');
      px(x+3,y-15,1,1,'#FFF'); px(x+9,y-15,1,1,'#FFF');
      // big claw
      const open=(e.state==='sweepwind')?5:2;
      px(x+16,y-4,7,5,'#E0562F'); px(x+22,y-6-open,5,4,'#EC6A42'); px(x+22,y+open-2,5,4,'#EC6A42');
    }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-28,y-20,60,42,'#FF6B4B'); ctx.globalAlpha=1; }
    ctx.restore();
    Entities.drawAlert(e);
  },
});

function _hcBash(e, p){
  spawnSparkles(p.x, p.y-8, '#E0562F', 12);
  if(typeof Health!=='undefined') Health.damage(p, e.dmg||3);
  const a=Math.atan2(p.y-e.y,p.x-e.x), K=20*(e.scale||1);
  p.x=clamp(p.x+Math.cos(a)*K,20,WORLD_W-20); p.y=clamp(p.y+Math.sin(a)*K,26,WORLD_H-20);
  if(typeof sfxHowl==='function') sfxHowl();
}
