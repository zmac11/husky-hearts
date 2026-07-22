// ====================== XP ORBS ======================
// Minecraft-style experience pickups: defeated enemies burst a few small green orbs
// that pop out, settle, then magnetize toward the dog when it's nearby and grant XP on
// pickup. A lightweight non-saved system (mirrors sparkles.js) — transient combat drops
// don't belong in the save snapshot. Updated + drawn from the main loop's world pass.

let xpOrbs = [];

// Split `amount` XP into a few orbs bursting from (x,y).
function spawnXpOrbs(x, y, amount){
  if(!(amount>0)) return;
  const n = Math.max(1, Math.min(6, Math.round(amount/3)));   // ~3 xp per orb, capped
  const base = Math.floor(amount/n), extra = amount - base*n;
  for(let i=0;i<n;i++){
    const ang = Math.random()*Math.PI*2, spd = rand(1.2, 2.6);
    // Each orb pops out and then hovers around its own resting spot near the drop point,
    // so a burst spreads into a little cloud instead of piling up on one pixel.
    const rest = rand(10, 26), restAng = ang + rand(-0.5, 0.5);
    xpOrbs.push({
      x, y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - 1.2,
      ax: x + Math.cos(restAng)*rest, ay: y + Math.sin(restAng)*rest*0.6,
      xp: base + (i<extra?1:0),
      bob: rand(0,Math.PI*2), life: 12000,   // orbs expire after a while if unreachable
    });
  }
}

function updateXpOrbs(p){
  if(!xpOrbs.length) return;
  const MAG=64, PICK=14;
  for(const o of xpOrbs){
    o.life -= dtScale*16;
    if(o.ax===undefined){ o.ax=o.x; o.ay=o.y; }   // orb from before resting spots existed
    const dx=(p&&!p.dead)?p.x-o.x:0, dy=(p&&!p.dead)?p.y-o.y:0;
    const d=Math.hypot(dx,dy);
    if(p && !p.dead && d<MAG){
      // magnetize: accelerate toward the dog, faster the closer it is
      const pull=0.5+ (1-d/MAG)*1.4;
      o.vx += (dx/(d||1))*pull*dtScale;
      o.vy += (dy/(d||1))*pull*dtScale;
    } else {
      // No gravity: an orb drifts back to its resting spot and hovers there (a gentle
      // spring), so a burst stays where it dropped instead of sinking off downhill.
      o.vx += (o.ax-o.x)*0.012*dtScale;
      o.vy += (o.ay-o.y)*0.012*dtScale;
    }
    o.vx*=Math.pow(0.86,dtScale); o.vy*=Math.pow(0.86,dtScale);
    o.x += o.vx*dtScale; o.y += o.vy*dtScale;
    if(p && !p.dead && d<PICK){
      o.collected=true;
      if(typeof Progression!=='undefined') Progression.award(p, o.xp, 'orb');
      if(typeof sfxXp==='function') sfxXp();
    }
  }
  xpOrbs = xpOrbs.filter(o=>!o.collected && o.life>0);
}

function drawXpOrbs(t){
  if(!xpOrbs.length) return;
  ctx.save();
  for(const o of xpOrbs){
    const x=Math.round(o.x), y=Math.round(o.y + Math.sin(t/220+o.bob)*2);
    const fade=o.life<1200 ? Math.max(0.1,o.life/1200) : 1;
    ctx.globalAlpha=0.35*fade;                        // glow
    ctx.fillStyle='#8FF0A8';
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=fade;
    ctx.fillStyle='#3FBF66';
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#DFFFE8';
    ctx.beginPath(); ctx.arc(x-1,y-1,1,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// Cleared per level so orbs don't linger across a load/level change.
function resetXpOrbs(){ xpOrbs = []; }
