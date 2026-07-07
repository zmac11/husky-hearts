// ====================== HEALTH ======================
// Per-player hit points. `p.hp` / `p.maxHp` are seeded from the breed (data/breeds.js)
// in makePlayer(). The convention across the game is 1 heart icon = 2 hp, so the HUD
// heart bar (UI.renderHearts) derives its heart count from maxHp/2 and each heart's
// state (full / shrunk / empty-black-dot) from the remaining hp in that pair.
//
// This is the seam for anything that hurts or heals a dog: enemies call Health.damage,
// consumables (biscuit) call Health.heal. `hurtTimer` drives a brief red flash on the
// sprite so a hit reads clearly.

const Health = {
  HEART_HP: 2,   // hp represented by one full heart icon

  // Whole + partial heart count for a max hp total (used to lay out the bar).
  heartsFor(maxHp){ return Math.ceil((maxHp||0) / this.HEART_HP); },

  damage(p, n){
    if(!p || p.hp<=0) return;
    p.hp = Math.max(0, p.hp - n);
    p.hurtTimer = 260;                 // ms of red flash
    if(typeof updateHUD==='function') updateHUD();
    if(p.hp<=0) this.onDown(p);
  },

  heal(p, n){
    if(!p) return 0;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if(typeof updateHUD==='function') updateHUD();
    return p.hp - before;              // amount actually restored
  },

  isDown(p){ return p && p.hp<=0; },

  // Fainting: for now, revive in place at half health so a solo run can continue.
  // (A proper down/respawn flow can hang off this later.)
  onDown(p){
    if(typeof showToast==='function') showToast(`💫 P${p.id} fainted... and bounces back!`, 2000);
    p.hp = Math.max(2, Math.round(p.maxHp/2));
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#FF8FA3', 16);
    if(typeof updateHUD==='function') updateHUD();
  },

  // Decay the per-frame hurt flash.
  tick(p, dt){ if(p && p.hurtTimer>0) p.hurtTimer=Math.max(0, p.hurtTimer-dt); },
};
