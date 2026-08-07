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
    e.chargeCd=2600; e.sweepCd=3200; e.sprayCd=5000; e.staggerT=0; e.touchCd=0;
    e.cvx=0; e.cvy=0; e.bob=0; e._p2=false;
  },

  update(e, t, dt){
    const p=_hcNearest(e); if(!p){ e.bob=t; return; }
    const dist=Math.hypot(p.x-e.x, p.y-e.y);
    const frac=e.hp/e.maxHp, panic=frac<=0.34, phase2=frac<=0.66;
    const covered=(typeof Tide!=='undefined') ? Tide.covered() : false;
    const S=e.scale||1;

    // Phase 2 (≤66%): froths up a ranged bubble-spray volley — the crab is no longer only melee.
    if(phase2 && !e._p2){ e._p2=true; if(typeof showToast==='function') showToast('🫧 The Hermit Crab froths over — bubble volleys incoming!', 2400); }
    // Panic churns the tide (safe windows flip faster).
    if(typeof Tide!=='undefined') Tide._speed = panic ? 2.4 : 1;
    e.sprayCd=Math.max(0,e.sprayCd-dt);

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
    if(e.state==='spraywind'){
      // rear back frothing, then lob a fan of bubble bursts around the dog
      e.actT-=dt;
      if(e.actT<=0){
        e.state='track'; e.sprayCd= panic?3200:5000;
        const a0=Math.atan2(p.y-e.y,p.x-e.x), n=panic?5:3;
        const reach=Math.max(70, Math.min(dist,520));
        for(let i=0;i<n;i++){ const off=i-(n-1)/2; const a=a0+off*0.28;
          const gx=clamp(e.x+Math.cos(a)*(reach+off*8),40,WORLD_W-40), gy=clamp(e.y+Math.sin(a)*(reach+off*8),48,WORLD_H-40);
          Entities.spawn('groundzone',{ x:gx, y:gy, r:32*S, warnMs:panic?400:540, dmg:e.dmg, color:'#5FC4DA', scale:S }); }
        if(typeof spawnSparkles==='function') spawnSparkles(e.x+e.dir*18,e.y-8,'#8FE0F0',14);
        if(typeof sfxHowl==='function') sfxHowl();
      }
      e.bob=t; return;
    }

    // ---- decide the next move (track) ----
    // Phase 2+: a ranged bubble volley interleaves (works in either tide mode, so high tide
    // is no longer a total lull).
    if(phase2 && e.sprayCd<=0 && dist>70 && dist<560){
      e.state='spraywind'; e.actT= panic?300:440; e.alertT=600; e.bob=t; return;
    }
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
    const crouch=(e.state==='chargewind'||e.state==='sweepwind'||e.state==='spraywind');
    const y=y0+(crouch?2:Math.round(Math.sin(t/300)*1));
    const exposed=!e.armored;
    ctx.save(); ctx.translate(e.x,e.y); ctx.scale(D<0?-S:S,S); ctx.translate(-e.x,-e.y);

    // ---- palette ----
    const shShadow='#6E4020', shDark='#8A5A34', shBase='#B57A48', shMid='#CE9862',
          shLite='#E4B47E', shHi='#F4D6A6', shPink='#EAB0A6', apDark='#3A1E12';
    const cShadow='#8A2A16', cDark='#B03A22', cBase='#E0562F', cMid='#EC6A42',
          cLite='#F4906E', cHi='#FBC0A2', joint='#C0432E';
    const eyeK='#160C08', eyeHot='#FFE0B0', barn='#EAD9BE';

    // ground shadow
    ctx.globalAlpha=0.28; ctx.beginPath(); ctx.ellipse(x,y0+17,32,9,0,0,Math.PI*2); ctx.fillStyle='#08110F'; ctx.fill(); ctx.globalAlpha=1;
    // wind-up tell
    if(crouch){ ctx.save(); ctx.globalAlpha=0.30+0.20*Math.sin(t/60); ctx.fillStyle=e.state==='chargewind'?'#D65A3C':(e.state==='spraywind'?'#5FC4DA':'#E0A040'); ctx.beginPath(); ctx.ellipse(x,y+9,36,15,0,0,Math.PI*2); ctx.fill(); ctx.restore();
      // frothing bubbles rising while charging the spray
      if(e.state==='spraywind'){ ctx.save(); ctx.globalAlpha=0.7; ctx.fillStyle='#DFF6FA'; for(let i=0;i<4;i++){ const bx=x+e.dir*(12+i*4), by=y-4-((t/40+i*8)%20); ctx.beginPath(); ctx.arc(bx,by,1.5+i*0.5,0,Math.PI*2); ctx.fill(); } ctx.restore(); }
    }

    // ============ the borrowed spiral conch shell (its "home") ============
    // big body-whorl (rounded), tinted a touch darker while sealed shut
    const tint = exposed ? 0 : -1;
    ctx.fillStyle=shBase; ctx.beginPath(); ctx.ellipse(x-9, y-1, 20, 18, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=shDark; ctx.beginPath(); ctx.ellipse(x-9, y+6, 20, 12, 0, 0, Math.PI*2); ctx.fill();     // underside shadow
    ctx.fillStyle=shMid;  ctx.beginPath(); ctx.ellipse(x-11, y-5, 16, 12, 0, 0, Math.PI*2); ctx.fill();    // lit upper body
    ctx.fillStyle=shLite; ctx.beginPath(); ctx.ellipse(x-13, y-8, 10, 7, 0, 0, Math.PI*2); ctx.fill();     // top highlight
    // the coiling spire, stepping up toward the apex (top-left)
    ctx.fillStyle=shBase; ctx.beginPath(); ctx.ellipse(x-20, y-11, 11, 9, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=shMid;  ctx.beginPath(); ctx.ellipse(x-22, y-14, 8, 6, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=shBase; ctx.beginPath(); ctx.ellipse(x-27, y-16, 6, 5, -0.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=shLite; ctx.beginPath(); ctx.ellipse(x-31, y-18, 4, 3, -0.5, 0, Math.PI*2); ctx.fill();  // apex
    // spiral ridge lines carved around the whorls
    ctx.strokeStyle=shShadow; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x-9, y-1, 15, -0.4, Math.PI*1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(x-11, y-3, 9, -0.4, Math.PI*1.6); ctx.stroke();
    ctx.strokeStyle=shHi; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(x-11, y-4, 12, Math.PI*0.9, Math.PI*1.4); ctx.stroke();                       // glossy wet sheen
    // knobbly spire nodules + barnacles + a fleck of coral
    px(x-20,y-19,3,3,shShadow); px(x-14,y-15,3,3,shShadow); px(x-25,y-20,2,2,shShadow);
    px(x-6,y-13,3,3,barn); px(x-18,y-6,3,3,barn); px(x+2,y+8,3,3,barn);
    px(x-24,y+2,2,4,'#3E8E7A'); px(x-26,y+0,2,3,'#4EA890');   // little seaweed frond
    px(x-2,y+10,4,2,'#E88AA0'); px(x-3,y+11,2,2,'#F0A6B6');   // pink coral nub
    // crack when staggered (the environmental punish window)
    if(e.staggerT>0){ ctx.strokeStyle='#2A1810'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-18,y-11); ctx.lineTo(x-10,y-3); ctx.lineTo(x-15,y+5); ctx.lineTo(x-8,y+9); ctx.stroke();
      ctx.strokeStyle='#F4D6A6'; ctx.lineWidth=0.7; ctx.stroke(); }

    // aperture rim (mouth of the shell, facing +x where the crab emerges)
    ctx.fillStyle=shShadow; ctx.beginPath(); ctx.ellipse(x+8, y+1, 9, 15, 0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=shPink;   ctx.beginPath(); ctx.ellipse(x+8, y+1, 7, 13, 0.1, 0, Math.PI*2); ctx.fill();   // pearly lip
    ctx.fillStyle=apDark;   ctx.beginPath(); ctx.ellipse(x+9, y+1, 5, 11, 0.1, 0, Math.PI*2); ctx.fill();   // dark interior

    if(e.armored){
      // ---- withdrawn: a horny operculum door seals the aperture; one wary eye peeks out ----
      ctx.fillStyle=cDark;  ctx.beginPath(); ctx.ellipse(x+9, y+1, 6, 12, 0.1, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle=joint;  ctx.beginPath(); ctx.ellipse(x+8, y+0, 4, 9, 0.1, 0, Math.PI*2); ctx.fill();
      // concentric growth-rings on the door
      ctx.strokeStyle=cShadow; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(x+9,y+1,4,8,0.1,0,Math.PI*2); ctx.stroke();
      // a single peeking eye + a braced claw tip
      px(x+6,y-3,4,4,eyeK); px(x+7,y-2,1,1,eyeHot);
      px(x+12,y+7,6,4,cBase); px(x+16,y+6,4,3,cMid);          // claw braced across the seam
      // icy defensive glint over the door
      ctx.save(); ctx.globalAlpha=0.35+0.15*Math.sin(t/200); ctx.strokeStyle='#DDE6EC'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x+9,y+1,8,-1.1,1.1); ctx.stroke(); ctx.restore();
    } else {
      // ============ exposed crab body reaching out of the shell ============
      // jointed walking legs fanning from the aperture (drawn first, behind the body)
      ctx.strokeStyle=cDark; ctx.lineWidth=3; ctx.lineCap='round';
      const legT=Math.sin(t/220)*2;
      for(let i=-1;i<=2;i++){ const ay=y+3+i*4;
        ctx.beginPath(); ctx.moveTo(x+9,ay); ctx.lineTo(x+18,ay+3+legT*(i%2?1:-1)); ctx.lineTo(x+24,ay+9); ctx.stroke(); }
      ctx.strokeStyle=cMid; ctx.lineWidth=1.2;
      for(let i=-1;i<=2;i++){ const ay=y+3+i*4; ctx.beginPath(); ctx.moveTo(x+9,ay); ctx.lineTo(x+18,ay+3+legT*(i%2?1:-1)); ctx.stroke(); }

      // fleshy head/carapace poking out of the aperture
      px(x+6,y-7,15,16,cBase); px(x+8,y-9,12,6,cMid); px(x+9,y-8,10,2,cLite);   // domed shell + lit crest
      px(x+7,y+6,14,5,cShadow);                                                  // underside
      // stippled carapace texture
      px(x+11,y-5,2,2,cDark); px(x+15,y-3,2,2,cDark); px(x+13,y+1,2,2,cDark);
      // mandible mouthparts
      px(x+9,y+8,9,3,cShadow); px(x+10,y+9,2,2,'#F4D6A6'); px(x+14,y+9,2,2,'#F4D6A6');
      // eyestalks with glossy black eyes (angry-red rimmed while panicked)
      const eyeRim = ((e.hp/e.maxHp)<=0.34) ? '#FF3A2A' : joint;
      px(x+7,y-15,3,7,eyeRim); px(x+15,y-15,3,7,eyeRim);
      px(x+6,y-19,5,5,eyeK);   px(x+14,y-19,5,5,eyeK);
      px(x+8,y-18,2,2,eyeHot); px(x+16,y-18,2,2,eyeHot);
      // ---- big asymmetric CRUSHER claw (upper) + a smaller pincer (lower) ----
      const open=(e.state==='sweepwind')?6:2;
      // crusher arm
      px(x+19,y-9,7,6,cDark); px(x+20,y-9,6,3,cBase);
      px(x+25,y-13,11,9,cBase); px(x+27,y-14,9,4,cMid); px(x+28,y-13,7,2,cLite);   // meaty claw base
      px(x+34,y-15-open,8,5,cBase); px(x+36,y-15-open,6,3,cMid);                    // upper jaw of the pincer
      px(x+34,y-8+open,8,5,cDark);  px(x+36,y-8+open,6,3,cBase);                    // lower jaw
      px(x+41,y-14-open,3,3,cHi); px(x+41,y-8+open,3,3,cHi);                        // claw-tip highlights
      // smaller nipper claw below
      px(x+18,y+4,6,5,cDark); px(x+23,y+3,6,4,cBase); px(x+27,y+1,4,3,cMid); px(x+27,y+5,4,3,cMid);
    }
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-32,y-22,74,48,'#FF6B4B'); ctx.globalAlpha=1; }
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
