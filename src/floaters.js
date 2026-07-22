// ====================== FLOATING NUMBERS ======================
// Combat/progress feedback that rises off an actor and fades: damage you deal, damage
// you take, healing, XP picked up, and the level-up burst. Purely cosmetic and never
// saved (like sparkles.js / xporbs.js) — drawn in world space from the main loop, so a
// number sticks to the spot it was earned as the camera moves.
//
// Colour carries the meaning at a glance:
//   hit   — gold, damage YOUR dog dealt to an enemy
//   hurt  — red,  damage an enemy dealt to your dog
//   heal  — green, hearts restored
//   xp    — mint, experience picked up
//   level — big gold "LEVEL n" with expanding rings

const FLOATER_KINDS = {
  hit:   { color:'#FFD34D', outline:'#5A3E12', size:11, rise:0.55, life:900 },
  hurt:  { color:'#FF6B6B', outline:'#5A1414', size:12, rise:0.62, life:1000 },
  heal:  { color:'#7FE0A0', outline:'#12441F', size:11, rise:0.5,  life:900 },
  xp:    { color:'#A8F5C0', outline:'#12441F', size:9,  rise:0.42, life:800 },
  level: { color:'#FFE066', outline:'#5A3E12', size:15, rise:0.28, life:1800 },
};

let floaters = [];

// `kind` picks the palette; opts.dx nudges the start sideways so stacked hits don't overlap.
function spawnFloater(x, y, text, kind, opts){
  const k = FLOATER_KINDS[kind] || FLOATER_KINDS.hit;
  const o = opts || {};
  floaters.push({
    x: x + (typeof o.dx==='number' ? o.dx : rand(-5,5)), y,
    vx: (typeof o.vx==='number' ? o.vx : rand(-0.12,0.12)),
    text: String(text), kind: kind in FLOATER_KINDS ? kind : 'hit',
    life: o.life || k.life, max: o.life || k.life,
    rings: o.rings ? { t:0, of:o.rings } : null,   // of = the player the rings orbit
  });
}

// Level-up: a big label plus rings blooming out of the dog.
function spawnLevelUpFx(p, level){
  if(!p) return;
  spawnFloater(p.x, p.y-30, `⭐ LEVEL ${level}`, 'level', { dx:0, vx:0, rings:p });
  if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-16, '#FFE066', 26);
}

function updateFloaters(){
  if(!floaters.length) return;
  for(const f of floaters){
    const k=FLOATER_KINDS[f.kind];
    f.life -= dtScale*16;
    f.y -= k.rise*dtScale;
    f.x += f.vx*dtScale;
    if(f.rings){ f.rings.t += dtScale*16; f.x=f.rings.of.x; }   // the label tracks the dog
  }
  floaters = floaters.filter(f=>f.life>0);
}

function drawFloaters(t){
  if(!floaters.length) return;
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const f of floaters){
    const k=FLOATER_KINDS[f.kind];
    const age=f.max-f.life;
    const fade=Math.min(1, f.life/260);                 // fade out at the end
    const pop=Math.min(1, age/110);                     // pop in at the start
    const x=Math.round(f.x), y=Math.round(f.y);

    // level-up rings bloom out of the dog underneath the label
    if(f.rings){
      const p=f.rings.of;
      for(let i=0;i<3;i++){
        const ph=((f.rings.t/700)+i/3)%1;
        ctx.globalAlpha=0.55*(1-ph)*fade;
        ctx.strokeStyle=i%2?'#FFE066':'#FFF6D0'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.ellipse(Math.round(p.x), Math.round(p.y+4), 10+ph*38, 4+ph*15, 0, 0, Math.PI*2); ctx.stroke();
      }
    }

    ctx.globalAlpha=fade;
    const size=Math.round(k.size*(0.6+0.4*pop));
    ctx.font=`bold ${size}px monospace`;
    ctx.lineWidth=3; ctx.strokeStyle=k.outline; ctx.strokeText(f.text, x, y);
    ctx.fillStyle=k.color; ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha=1;
  ctx.restore();
}

// Cleared per level, alongside sparkles and XP orbs.
function resetFloaters(){ floaters = []; }
