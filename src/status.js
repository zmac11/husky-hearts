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
  },

  _map(p){ return p.status || (p.status = {}); },
  has(p, name){ return !!(p && p.status && p.status[name] > 0); },

  // Inflict (or refresh) a status for at least `ms`. Never shortens an existing longer timer.
  apply(p, name, ms){
    if(!p || !this.DEFS[name] || !(ms>0)) return;
    const m=this._map(p);
    const fresh = !(m[name]>0);
    m[name]=Math.max(m[name]||0, ms);
    if(fresh){
      p['_'+name+'T']=0;   // reset the per-status chip accumulator
      const d=this.DEFS[name];
      if(name==='poisoned' && typeof showToast==='function') showToast('🤢 Poisoned! Find an antidote or wait it out.', 1900);
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
