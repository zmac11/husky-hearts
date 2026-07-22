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

  // XP handed out by source (tune here). Enemy XP is delivered via orbs, not directly.
  ENEMY_XP: { enemy:8, wolf:16 },
  CHEST_XP: { wooden:5, iron:10, silver:18, golden:35 },
  QUEST_XP: 20,
  CHEER_XP: 12,
  LEVEL_XP: 40,

  // Grant XP and roll any dog level-ups. Each level grants +1 mastery point.
  award(p, amount, reason){
    if(!p || !(amount>0)) return;
    p.xp = (p.xp||0) + amount;
    let leveled=0;
    while(p.xp >= this.xpToNext(p.dogLevel||1)){
      p.xp -= this.xpToNext(p.dogLevel||1);
      p.dogLevel = (p.dogLevel||1) + 1;
      p.masteryPoints = (p.masteryPoints||0) + 1;
      leveled++;
    }
    if(leveled>0){
      if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-16, '#7FE0A0', 24);
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
