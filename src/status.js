// ====================== STATUS EFFECTS ======================
// Timed conditions on the dog, introduced in Fungus Hollow (Whispering Woods 2). The first is
// `poisoned` — spore clouds and toadstool spitters inflict it, and it chips away a sliver of
// health over its duration until it wears off or you use an 🧪 Antidote. Cozy, not lethal:
// like warmth/chilled, it whittles rather than kills, and a heal always outpaces it.
//
// Kept deliberately small and data-shaped so more conditions (chilled already lives in
// warmth.js; slow/soaked/burning are future biomes) can slot in. State is a per-player map of
// { name: msLeft }; a save doesn't need it (statuses reset on level entry, like cooldowns).

const Status = {
  DEFS: {
    poisoned: { icon:'🤢', chipMs:1000, chip:1, color:'#8FCB5A' },   // 1 hp per second while active
    bleeding: { icon:'🩸', chipMs:600,  chip:1, color:'#D64545' },   // faster chip — Alpha Wolf bites
    stunned:  { icon:'💫', chipMs:0,     chip:0, color:'#E6C84A', noMove:true },   // can't move — Grizzly roar
    slow:     { icon:'🐌', chipMs:0,     chip:0, color:'#8FB4E0', speedMul:0.5 },  // sluggish (reserved)
  },

  _map(p){ return p.status || (p.status = {}); },
  has(p, name){ return !!(p && p.status && p.status[name] > 0); },

  // Movement multiplier from any active `speedMul` status (composed into spdMul in updatePlayer,
  // mirroring Warmth.speedMul). Returns 1 when nothing slows the dog.
  speedMul(p){
    if(!p || !p.status) return 1;
    let m=1;
    for(const name in p.status){ const d=this.DEFS[name]; if(d && d.speedMul && p.status[name]>0) m*=d.speedMul; }
    return m;
  },
  // True while any active status locks movement (e.g. stunned) — updatePlayer freezes input.
  blocksMove(p){
    if(!p || !p.status) return false;
    for(const name in p.status){ const d=this.DEFS[name]; if(d && d.noMove && p.status[name]>0) return true; }
    return false;
  },

  // Inflict (or refresh) a status for at least `ms`. Never shortens an existing longer timer.
  apply(p, name, ms){
    if(!p || !this.DEFS[name] || !(ms>0)) return;
    const m=this._map(p);
    const fresh = !(m[name]>0);
    m[name]=Math.max(m[name]||0, ms);
    if(fresh){
      p['_'+name+'T']=0;   // reset the per-status chip accumulator
      const d=this.DEFS[name];
      if(typeof showToast==='function'){
        if(name==='poisoned') showToast('🤢 Poisoned! Find an antidote or wait it out.', 1900);
        else if(name==='bleeding') showToast('🩸 Bleeding! It stings for a bit.', 1500);
        else if(name==='stunned') showToast('💫 Stunned! Shake it off!', 1300);
      }
      if(typeof spawnFloater==='function') spawnFloater(p.x, p.y-30, d.icon, 'status');
    }
  },
  cure(p, name){ if(p && p.status) p.status[name]=0; },
  clearAll(p){ if(p) p.status = {}; },

  // Called each frame from updatePlayer.
  tick(p, dt){
    if(!p || !p.status) return;
    let changed=false;
    for(const name in p.status){
      let t=p.status[name]; if(!(t>0)) continue;
      const d=this.DEFS[name]; if(!d){ p.status[name]=0; continue; }
      t-=dt; p.status[name]=Math.max(0, t);
      if(d.chip>0){
        const key='_'+name+'T';
        p[key]=(p[key]||0)+dt;
        if(p[key]>=d.chipMs){ p[key]=0; if(typeof Health!=='undefined') Health.damage(p, d.chip); }
      }
      if(p.status[name]<=0) changed=true;
    }
    if(changed && typeof UI!=='undefined' && UI.updateStatus) UI.updateStatus();
  },
};
