// ====================== QUESTS ======================
// Lightweight, data-driven quest system for NPCs. An NPC becomes a quest-giver simply by
// carrying a `quest` object (see the shape below); the NPC draw shows a yellow "!" when a
// quest is available or ready to hand in, and the dialog panel (ui.js) walks the player
// through offer → progress → turn-in. Quest state lives on the NPC entity, so it rides
// along in save/load like any other entity data.
//
// Adding a NEW quest TYPE = add an entry to `Quests.TYPES` implementing target/summary/have/
// remaining/canComplete/take (+ actionText/turnInLabel for wording). Two ship today: `give`
// (bring N of an item from the bag) and `greet` (say hello to N critters — reads world state,
// consumes nothing). Further types (cheer-N / defeat-N / talk-to) slot in the same way without
// touching the NPC entity or the dialog code.
//
// Quest object shape (on npc.quest):
//   { id, type:'give', give:{ item:'bone', count:3 },
//     offer, ready, progress, done,          // optional dialog strings (defaults generated)
//     reward:{ treats:6 }  |  { item:'ribbon', count:1 },   // optional
//     state }                                // 'available' → 'active' → 'done' (managed here)

const Quests = {
  TYPES: {
    // Bring N of an item from your bag and hand it over.
    give: {
      actionText: 'bring',
      target(q){ return q.give.count; },
      summary(q){ const d=Items.get(q.give.item); return `${q.give.count} ${d?d.icon+' '+d.name:q.give.item}`; },
      have(q,p){ return Inventory.count(p, q.give.item); },
      remaining(q,p){ return Math.max(0, q.give.count - Inventory.count(p, q.give.item)); },
      canComplete(q,p){ return Inventory.count(p, q.give.item) >= q.give.count; },
      take(q,p){ Inventory.remove(p, q.give.item, q.give.count); },
      turnInLabel(q){ return `Give ${Quests.summary(q)}`; },
    },

    // Say hello to N friendly critters (optionally of specific species). Progress is world
    // state — critters carry `e.greeted` (entities/critter.js) — not anything in the bag,
    // so `take` is a no-op and progress rides along in level-state/save automatically.
    greet: {
      actionText: 'greet',
      target(q){ return (q.greet && q.greet.count) || 0; },
      _greeted(q){
        const es=(typeof Entities!=='undefined' && Entities.all) ? Entities.all() : [];
        return es.filter(e=> e && e.kind==='critter' && e.greeted &&
          (!q.greet.species || q.greet.species.indexOf(e.species)!==-1)).length;
      },
      summary(q){
        const sp=q.greet.species, one = sp && sp.length===1;
        const icon = one && typeof CRITTERS!=='undefined' && CRITTERS[sp[0]] ? CRITTERS[sp[0]].icon+' ' : '';
        const noun = (one ? sp[0] : 'critter') + (q.greet.count!==1 ? 's' : '');
        return `${q.greet.count} ${icon}${noun}`;
      },
      have(q,p){ return this._greeted(q); },
      remaining(q,p){ return Math.max(0, q.greet.count - this._greeted(q)); },
      canComplete(q,p){ return this._greeted(q) >= q.greet.count; },
      take(q,p){ /* greeting isn't consumed — nothing to remove */ },
      turnInLabel(q){ return "That's everyone! 🐾"; },
    },
  },

  _t(q){ return this.TYPES[(q && q.type)] || this.TYPES.give; },
  stateOf(q){ return (q && q.state) || 'available'; },
  summary(q){ return this._t(q).summary(q); },
  canComplete(q,p){ return this.stateOf(q)==='active' && !!p && this._t(q).canComplete(q,p); },

  // What mark floats over the NPC's head: 'available' / 'ready' (yellow !), 'active' (grey ?),
  // or null (nothing — quest done). "ready" means some active player can hand it in now.
  indicator(e){
    const q=e && e.quest; if(!q) return null;
    const st=this.stateOf(q);
    if(st==='available') return 'available';
    if(st==='done') return null;
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    return players.some(p=>this._t(q).canComplete(q,p)) ? 'ready' : 'active';
  },

  accept(q){
    if(this.stateOf(q)!=='available') return;
    q.state='active';
    if(typeof showToast==='function') showToast(`📜 New task: ${this._t(q).actionText||'get'} ${this.summary(q)}`, 2600);
  },

  progressText(q,p){
    const rem=this._t(q).remaining(q,p);
    if(q.progress) return q.progress.replace('{remaining}', rem);
    return `You still need ${rem} more — ${this._t(q).actionText||'get'} ${this.summary(q)}.`;
  },

  // Turn-in button label for the ready dialog — type-specific ("Give 3 bones" vs a greet's
  // "That's everyone!"). Falls back to a generic label for any future type without one.
  turnInLabel(q){ const t=this._t(q); return t.turnInLabel ? t.turnInLabel(q) : `Turn in ${this.summary(q)}`; },

  // Short reward description (e.g. "+6 🦴 treats") for a quest's reward, or '' if none.
  rewardText(q){
    const r=q&&q.reward; if(!r) return '';
    if(r.treats) return `+${r.treats} 🦴 treats`;
    if(r.rep) return `+${r.rep} ⭐ reputation`;
    if(r.item){ const n=r.count||1, d=Items.get(r.item); return `+${n} ${d?d.icon+' '+d.name:r.item}`; }
    return '';
  },

  // Best progress across all active players (for the HUD tracker / journal): {have, need}.
  // Multiple dogs can carry the goal items, so we show whoever is furthest along.
  bestProgress(q){
    const t=this._t(q);
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    let have=0;
    for(const p of players) have=Math.max(have, t.have(q,p));
    const need=t.target ? t.target(q) : ((q.give && q.give.count) || 0);
    return { have:Math.min(have,need), need };
  },

  // True when some active player can hand the quest in right now.
  readyToTurnIn(q){
    if(this.stateOf(q)!=='active') return false;
    const players=(typeof Game!=='undefined' && Game.players) ? Game.players : [];
    return players.some(p=>this._t(q).canComplete(q,p));
  },

  // Every NPC-borne quest in the current level, tagged with its giver's name. NPC quest
  // state lives on the entity (rebuilt per level), so this reflects the level you're in.
  entries(){
    const list=[];
    const es=(typeof Entities!=='undefined' && Entities.all) ? Entities.all() : [];
    for(const e of es){ if(e && e.quest) list.push({ giver:e.name||'A friend', q:e.quest }); }
    return list;
  },
  entriesInState(state){ return this.entries().filter(x=>this.stateOf(x.q)===state); },

  // Hand in the quest: consume the requirement, grant any reward, mark done. Returns a short
  // reward description (e.g. "+6 treats") for the thank-you line, or '' if none.
  complete(q,p){
    const t=this._t(q);
    if(this.stateOf(q)!=='active' || !t.canComplete(q,p)) return '';
    t.take(q,p);
    q.state='done';
    let rewardStr='';
    const r=q.reward;
    if(r && r.treats){
      // Smart dogs squeeze a little extra out of every job (smarts bar → questBonus).
      const bonus=(p.stats && p.stats.questBonus) || 0;
      const treats=Math.round(r.treats * (1 + bonus));
      p.treats=(p.treats||0)+treats; rewardStr=`+${treats} treats`;
    }
    else if(r && r.rep){ p.reputation=(p.reputation||0)+r.rep; rewardStr=`+${r.rep} ⭐ reputation`; }
    else if(r && r.item){ const n=r.count||1; Inventory.add(p, r.item, n); const d=Items.get(r.item); rewardStr=`+${n} ${d?d.icon+' '+d.name:r.item}`; }
    if(typeof Progression!=='undefined') Progression.award(p, Progression.QUEST_XP, 'quest');
    if(typeof spawnSparkles==='function') spawnSparkles(p.x, p.y-8, '#FFD93D', 18);
    if(typeof showToast==='function') showToast(`✅ Task complete!${rewardStr?' '+rewardStr:''}`, 2600);
    return rewardStr;
  },
};
