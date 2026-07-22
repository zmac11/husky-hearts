// ====================== PROGRESSION (data) ======================
// The dog's RPG progression: XP → dog level → mastery points, plus skill points from
// clearing levels. Two upgrade tracks feed off these:
//   • skillPoints  → character stats  (skill tree, K, anytime)   — +2 per level cleared
//   • masteryPoints → abilities       (mastery tree, between levels) — +1 per dog level
// XP itself comes from defeating enemies (as pickup orbs — see xporbs.js), opening
// chests, completing quests, cheering friends and clearing levels.
//
// All progression fields live on the player (makePlayer) and persist in the save.

const Progression = {
  // XP needed to go from (level) to (level+1). Gently rising curve.
  xpToNext(level){ return 40 + 25*(Math.max(1,level)-1); },

  // XP handed out by source. Tuned in src/config/loot.json (LOOT_DATA) so combat rewards
  // sit next to the loot tables. Enemy XP is delivered via orbs (entities/registry.js).
  get ENEMY_XP(){ const m={}; const es=(typeof LOOT_DATA!=='undefined' && LOOT_DATA.enemies)||{}; for(const k in es) m[k]=es[k].xp; return m; },
  get CHEST_XP(){ return (typeof LOOT_DATA!=='undefined' && LOOT_DATA.chestXp) || {}; },
  get QUEST_XP(){ return (typeof LOOT_DATA!=='undefined' && LOOT_DATA.xp && LOOT_DATA.xp.quest) || 20; },
  get CHEER_XP(){ return (typeof LOOT_DATA!=='undefined' && LOOT_DATA.xp && LOOT_DATA.xp.cheer) || 12; },
  get LEVEL_XP(){ return (typeof LOOT_DATA!=='undefined' && LOOT_DATA.xp && LOOT_DATA.xp.level) || 40; },

  // Grant XP and roll any dog level-ups. Each level grants +1 mastery point.
  award(p, amount, reason){
    if(!p || !(amount>0)) return;
    p.xp = (p.xp||0) + amount;
    // Mint "+n XP" rises off the dog for every scrap of experience earned (floaters.js).
    if(typeof spawnFloater==='function') spawnFloater(p.x, p.y-32, `+${amount} XP`, 'xp');
    let leveled=0;
    while(p.xp >= this.xpToNext(p.dogLevel||1)){
      p.xp -= this.xpToNext(p.dogLevel||1);
      p.dogLevel = (p.dogLevel||1) + 1;
      p.masteryPoints = (p.masteryPoints||0) + 1;
      leveled++;
    }
    if(leveled>0){
      if(typeof spawnLevelUpFx==='function') spawnLevelUpFx(p, p.dogLevel);
      else if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-16, '#7FE0A0', 24);
      if(typeof sfxLevelUp==='function') sfxLevelUp();
      showToast(`⭐ Level ${p.dogLevel}! +${leveled} mastery point${leveled>1?'s':''}`, 2200);
    }
    if(typeof updateHUD==='function') updateHUD();
  },

  // Called once per cleared level (checkWin): grant skill points for the stat tree.
  onLevelCleared(p){
    if(!p) return;
    p.skillPoints = (p.skillPoints||0) + 2;
    this.award(p, this.LEVEL_XP, 'level');
    if(typeof updateHUD==='function') updateHUD();
  },
};
