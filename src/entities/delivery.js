// ====================== DELIVERY (the `deliver` soft-timer quest) ======================
// Palm Boardwalk's headline loop (Biome 4·2). Pick up a fragile item (an 🍦 ice-cream) at
// the source stall, then run it to the highlighted destination stall before it "spoils" — a
// GENTLE countdown. Failure never punishes: the treat just melts and you grab a fresh one.
// Clear the level by completing `need` orders.
//
// Kept as a tiny manager (state + tick + carried-parcel draw) plus a `deliverystall` entity
// (source or destination). The manager is transient like warmth/tide — it doesn't need to be
// saved; re-entering the level restarts the orders cleanly.

const Delivery = {
  on:false, item:'icecream', need:3, spoilMs:14000,
  carrying:false, timer:0, done:0, target:null, _hudT:0,

  setup(q){
    this.on=true;
    this.item=(q&&q.item)||'icecream';
    this.need=(q&&q.need)||3;
    this.spoilMs=(q&&q.spoilMs)||14000;
    this.carrying=false; this.timer=0; this.done=0; this.target=null; this._hudT=0;
  },
  disable(){ this.on=false; this.carrying=false; this.target=null; },

  _stalls(){ const es=(typeof entities!=='undefined'&&entities)?entities:[]; return es.filter(e=>e.kind==='deliverystall'); },
  source(){ return this._stalls().find(s=>s.role==='source')||null; },

  // Pick up a fresh parcel at the source and roll a random destination.
  pickup(){
    if(this.done>=this.need){ showToast('🎉 All orders delivered!',1600); return; }
    const dests=this._stalls().filter(s=>s.role!=='source');
    if(!dests.length) return;
    this.carrying=true; this.timer=this.spoilMs;
    this.target = dests[Math.floor(rand(0,dests.length))] || dests[0];
    const d=(typeof Items!=='undefined')?Items.get(this.item):null;
    showToast(`${d?d.icon:'📦'} Order up! Run it to ${this.target.name||'the stall'} before it spoils!`, 2400);
    if(typeof sfxDeliver==='function') sfxDeliver();
    if(typeof updateHUD==='function') updateHUD();
  },

  tick(dt){
    if(!this.on || !this.carrying) return;
    this.timer-=dt;
    const p=p1;
    if(p && this.target && Math.hypot(p.x-this.target.x, p.y-this.target.y)<46){
      // delivered!
      this.carrying=false; this.done++; const tgt=this.target; this.target=null;
      if(typeof spawnSparkles==='function') spawnSparkles(tgt.x, tgt.y-10, '#FFD93D', 24);
      if(typeof sfxCheer==='function') sfxCheer();
      showToast(`✅ Delivered! (${this.done}/${this.need}) — head back for the next order.`, 2200);
      if(typeof Progression!=='undefined' && p) Progression.award(p, 4, 'quest');
      if(typeof updateHUD==='function') updateHUD();
      if(typeof checkWin==='function') checkWin();
      return;
    }
    if(this.timer<=0){
      this.carrying=false; this.target=null;
      showToast('💧 Oh no — it melted! Grab a fresh one from the stall.', 2200);
      if(typeof updateHUD==='function') updateHUD();
      return;
    }
    this._hudT-=dt;
    if(this._hudT<=0){ this._hudT=400; if(typeof updateHUD==='function') updateHUD(); }
  },

  // Progress line for the quest tracker / level HUD.
  describe(){
    if(this.carrying){ const s=Math.max(0,Math.ceil(this.timer/1000)); return `Delivered ${this.done}/${this.need} · ⏳ ${s}s — to ${this.target?this.target.name:'?'}`; }
    return `Delivered ${this.done}/${this.need} · pick up an order`;
  },
  complete(){ return this.on && this.done>=this.need; },

  // Draw the carried parcel bobbing over the dog (called at the end of drawWorld).
  draw(t){
    if(!this.on || !this.carrying || !p1) return;
    const d=(typeof Items!=='undefined')?Items.get(this.item):null;
    const x=Math.round(p1.x), y=Math.round(p1.y-30+Math.sin(t/220)*2);
    ctx.save();
    ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(d?d.icon:'📦', x, y);
    // spoil urgency ring
    const frac=Math.max(0,Math.min(1,this.timer/this.spoilMs));
    ctx.lineWidth=2; ctx.strokeStyle= frac<0.3 ? '#E05050' : '#FFD24A';
    ctx.beginPath(); ctx.arc(x, y, 11, -Math.PI/2, -Math.PI/2+frac*Math.PI*2); ctx.stroke();
    ctx.restore();
  },
};

// The stall entity: a source (dispenses parcels) or a destination (drop-off). Destinations
// glow while they're the active order's target.
Entities.register('deliverystall', {
  radius: 40,

  init(e){
    e.role = e.role || 'dest';   // 'source' | 'dest'
    e.name = e.name || (e.role==='source' ? 'Order Stall' : 'Stall');
    e.hue  = e.hue || (e.role==='source' ? '#5AC8E0' : '#F0925A');
    e.bob  = 0;
  },

  onInteract(e, p){
    if(e.role==='source'){
      if(Delivery.carrying){ showToast('🏃 You\'re already carrying an order!', 1400); return; }
      Delivery.pickup();
    } else {
      showToast(`🏖️ ${e.name}`, 1200);
    }
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    const isTarget = Delivery.on && Delivery.carrying && Delivery.target===e;
    const canGet   = Delivery.on && !Delivery.carrying && e.role==='source' && Delivery.done<Delivery.need;
    // shadow
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+14,22,6,0,0,Math.PI*2); ctx.fillStyle='#2A2A1A'; ctx.fill(); ctx.globalAlpha=1;
    // posts
    px(x-18,y-6,3,20,'#9C7742'); px(x+15,y-6,3,20,'#9C7742');
    // counter
    px(x-20,y+8,40,6,'#C8A268'); px(x-20,y+8,40,2,'#B78E52');
    // striped awning
    for(let i=0;i<8;i++){ px(x-20+i*5,y-14,5,8, i%2? '#F5F0E6' : e.hue); }
    px(x-22,y-6,44,2,'#8A6A3A');
    // little icon on the counter
    ctx.save(); ctx.font='12px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    const d=(typeof Items!=='undefined')?Items.get(Delivery.item):null;
    ctx.fillText(e.role==='source' ? (d?d.icon:'📦') : '🧺', x, y+2);
    ctx.restore();
    // name plate
    ctx.save(); ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.fillStyle='#5A4632';
    ctx.fillText(e.name, x, y-18); ctx.restore();
    // highlight the active target / an available pickup
    if(isTarget || canGet){
      const pulse=1+Math.sin(t/200)*0.15;
      ctx.save(); ctx.globalAlpha=0.5; ctx.strokeStyle=isTarget?'#FFD24A':'#6FE0C0'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(x,y,24*pulse,0,Math.PI*2); ctx.stroke(); ctx.restore();
      // bouncing arrow for the drop target
      if(isTarget){ ctx.save(); ctx.fillStyle='#FFD24A'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
        ctx.fillText('▼', x, y-26-Math.abs(Math.sin(t/200))*4); ctx.restore(); }
    }
  },
});
