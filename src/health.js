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
    if(!p || p.dead || p.hp<=0) return;
    p.hp = Math.max(0, p.hp - n);
    p.hurtTimer = 260;                 // ms of red flash
    if(typeof updateHUD==='function') updateHUD();
    if(p.hp<=0) this.onDown(p);
  },

  heal(p, n){
    if(!p || p.dead) return 0;         // a fainted dog can't be healed back to life
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if(typeof updateHUD==='function') updateHUD();
    return p.hp - before;              // amount actually restored
  },

  isDown(p){ return p && (p.dead || p.hp<=0); },

  // Fainting: the dog goes down and STAYS down for the rest of the level — a grave marks
  // the spot and a sad sound plays. In co-op the surviving dog plays on; fallen dogs are
  // revived when the next level loads (LevelManager.goTo). Only once EVERY active dog is
  // down does the run end on the Game Over screen (Play Again / Main Menu).
  onDown(p){
    if(!p || p.dead) return;             // already fainted — don't grave twice
    p.dead = true;
    p.moving = false; p.howling = false; p.swimming = false;
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#8899AA', 22);
    if(typeof Entities!=='undefined' && Entities.def && Entities.def('grave')){
      Entities.spawn('grave', { x:p.x, y:p.y, forPlayer:p.id });
    }
    if(typeof sfxDeath==='function') sfxDeath();
    if(typeof showToast==='function'){
      const who = (Game.twoPlayer) ? `P${p.id}'s dog` : 'Your dog';
      showToast(`🪦 ${who} fainted...`, 1800);
    }
    if(typeof updateHUD==='function') updateHUD();

    // Everyone down? Then it's game over.
    const anyAlive = Game.players.some(pp => pp && !pp.dead);
    if(!anyAlive && typeof UI!=='undefined' && UI.gameOver){ UI.gameOver(p); }
  },

  // Decay the per-frame hurt flash.
  tick(p, dt){ if(p && p.hurtTimer>0) p.hurtTimer=Math.max(0, p.hurtTimer-dt); },
};
