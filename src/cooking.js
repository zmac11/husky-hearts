// ====================== COOKING (Amber Orchard) ======================
// The orchard's headline system: gather ingredients (🎃 pumpkin, 🍎 apple, 🌿 herb) around
// the patch, then cook at a 🍲 cookpot into BUFF FOODS — temporary speed / regen / warmth.
// Recipes are pure DATA (config/recipes.json → RECIPES_DATA), like loot tables.
//
// Interaction is cozy and menu-free: walk up to a cookpot and it cooks the best dish you
// have the ingredients for, consuming them, healing you, and applying the dish's buff
// (Status). `Cooking.cooked` counts toward the `cook` clear objective; the raw-ingredient
// count feeds the `gather` objective. State is transient (buffs reset on level entry).

const Cooking = {
  cooked: 0,      // dishes cooked this level (for the `cook` objective)
  _last: 0,

  reset(){ this.cooked = 0; },

  recipes(){ return (typeof RECIPES_DATA!=='undefined' && RECIPES_DATA) ? RECIPES_DATA : {}; },

  // Every recipe the player currently has all ingredients for.
  cookable(p){
    const out=[];
    const R=this.recipes();
    for(const id in R){
      const r=R[id]; let ok=true;
      for(const it in r.needs){ if(Inventory.count(p, it) < r.needs[it]){ ok=false; break; } }
      if(ok) out.push(id);
    }
    return out;
  },

  // Cook the "best" available dish (most total ingredients — i.e. the richest buff).
  _best(p){
    const ids=this.cookable(p);
    if(!ids.length) return null;
    const R=this.recipes();
    ids.sort((a,b)=>{ const sa=Object.values(R[a].needs).reduce((s,n)=>s+n,0), sb=Object.values(R[b].needs).reduce((s,n)=>s+n,0); return sb-sa; });
    return ids[0];
  },

  // Try to cook at a pot. Returns true if something was cooked.
  cook(p){
    const id=this._best(p);
    if(!id){
      showToast('🍲 You need ingredients to cook — gather 🎃 pumpkins, 🍎 apples, 🌿 herbs!', 2400);
      return false;
    }
    const r=this.recipes()[id];
    for(const it in r.needs) Inventory.remove(p, it, r.needs[it]);
    if(r.heal && typeof Health!=='undefined') Health.heal(p, r.heal);
    if(r.buff && typeof Status!=='undefined') Status.apply(p, r.buff, r.buffMs||18000);
    this.cooked++;
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#F0B24A', 20);
    if(typeof sfxCheer==='function') sfxCheer();
    showToast(`${r.icon} Cooked ${r.name}! ${r.blurb||''}`, 2600);
    if(typeof Progression!=='undefined') Progression.award(p, 4, 'quest');
    if(typeof updateHUD==='function') updateHUD();
    if(typeof checkWin==='function') checkWin();   // may complete the `cook` objective
    return true;
  },
};

// The cookpot interactable — a bubbling pot on a haven. Walk up + action key to cook.
Entities.register('cookpot', {
  radius: 34,
  init(e){ e.bob=0; },
  onInteract(e, p){ Cooking.cook(p); },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+12,18,5,0,0,Math.PI*2); ctx.fillStyle='#2A1E12'; ctx.fill(); ctx.globalAlpha=1;
    // stones + logs under the pot
    for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; px(x+Math.cos(a)*12-2, y+Math.sin(a)*5+6, 4,3, '#8A8E96'); }
    // little fire glow
    ctx.save(); ctx.globalAlpha=0.5+0.2*Math.sin(t/160); ctx.fillStyle='#FF9A3A'; ctx.beginPath(); ctx.ellipse(x,y+6,8,4,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    // cast-iron pot
    px(x-12,y-6,24,12,'#3A3A42'); px(x-12,y-6,24,3,'#4E4E58'); px(x-13,y-7,26,2,'#5A5A64');
    // stew
    px(x-9,y-8,18,3,'#C6772E');
    // rising steam
    ctx.save(); ctx.globalAlpha=0.4; ctx.strokeStyle='#EAD9C0'; ctx.lineWidth=2;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); const sx=x+i*5; ctx.moveTo(sx,y-9);
      ctx.quadraticCurveTo(sx+Math.sin(t/220+i)*4, y-18, sx+Math.sin(t/300+i)*3, y-26); ctx.stroke(); }
    ctx.restore();
    // prompt when in reach
    if(p1 && !p1.dead && Math.hypot(p1.x-e.x,p1.y-e.y)<40){
      const pulse=1+Math.sin(t/240)*0.12;
      ctx.save(); ctx.translate(x,y-20); ctx.scale(pulse,pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('🍲',0,0); ctx.fillText('🍲',0,0);
      ctx.restore();
    }
  },
});
