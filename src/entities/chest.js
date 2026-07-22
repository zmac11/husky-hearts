// ====================== ENTITY: TREASURE CHEST ======================
// Buried → dug → open. While buried it is invisible; a dog inside its scent radius
// gets sniff wisps at the nose (faster = closer), and within reach the loose-dirt
// patch + "!" marker reveal the dig spot. The action key digs (progress ring, dirt
// kicked out, speed × the dog's digMul), then opens the chest — silver consumes a
// 🗝️ Chest Key first. Loot spills onto the grass as ordinary pickups.
//
// All state is plain data ({rarity, state, digT, unlocked, opened}) so chests ride
// through save/load like any entity; init() is idempotent against restored fields.

Entities.register('chest', {
  radius: 30,

  init(e){
    e.rarity   = e.rarity || 'wooden';
    e.state    = e.state  || 'buried';    // 'buried' | 'dug' | 'open'
    e.digT     = (typeof e.digT==='number') ? e.digT : 0;   // remaining dig ms (0 = idle)
    e.unlocked = !!e.unlocked;
    e._dirtT   = 0;                        // throttle for dirt particles while digging
  },

  update(e, t, dt){
    if(e.state!=='buried' || e.digT<=0) return;
    const p=p1;
    // walking away abandons the dig
    if(!p || p.dead || Math.hypot(p.x-e.x, p.y-e.y)>46){ e.digT=0; return; }
    const digMul=(p.stats && p.stats.digMul) || 1;
    e.digT -= dt*digMul;
    // dirt kicked out behind the digging dog
    e._dirtT-=dt;
    if(e._dirtT<=0){ e._dirtT=140; if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y+4, '#8B6B4A', 4); }
    if(e.digT<=0){
      e.digT=0; e.state='dug';
      const def=Chests.def(e.rarity);
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#FFD93D', 16);
      if(typeof sfxDeliver==='function') sfxDeliver();
      showToast(`💰 You dug up a ${def.name}!${def.locked&&!e.unlocked?' It’s locked…':''}`, 2000);
    }
  },

  onInteract(e, p){
    const def=Chests.def(e.rarity);
    if(e.state==='buried'){
      if(e.digT>0) return;                         // already digging
      e.digT=def.digMs; e._digMax=def.digMs;
      if(typeof sfxDig==='function') sfxDig();
      return;
    }
    if(e.state!=='dug') return;                    // open chests are just decor
    if(def.locked && !e.unlocked){
      if(typeof Inventory!=='undefined' && Inventory.has(p,'key')){
        Inventory.remove(p,'key',1);
        e.unlocked=true;
        if(typeof sfxUnlock==='function') sfxUnlock();
        showToast('🗝️ The key clicks — unlocked!', 1400);
        if(typeof updateHUD==='function') updateHUD();
        // falls through: next action press opens it (one beat of anticipation)
        return;
      }
      showToast('🔒 This chest is locked — you need a 🗝️ Chest Key.', 1800);
      return;
    }
    this._open(e, p);
  },

  _open(e, p){
    const def=Chests.def(e.rarity);
    e.state='open';
    if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-8, '#FFD93D', 26);
    if(typeof sfxCheer==='function') sfxCheer();
    // Spill the loot in a ring of ordinary pickups around the chest.
    const loot=def.loot(p);
    let slot=0, spillCount=0;
    loot.forEach(entry=>{ spillCount += entry.treats ? entry.treats : 1; });
    const drop=(type, qty, isTreat)=>{
      const ang=(slot/Math.max(1,spillCount))*Math.PI*2 + Math.PI/6;
      const r=26+ (slot%2)*12;
      const spot={ x:clamp(e.x+Math.cos(ang)*r, 30, WORLD_W-30),
                   y:clamp(e.y+Math.sin(ang)*r+6, 30, WORLD_H-30) };
      nudgeOutOfWater(spot, 12);
      const idef=Items.get(type);
      collectibles.push({ x:spot.x, y:spot.y, type, qty, taken:false, bob:rand(0,Math.PI*2),
        // items are `dropped` so pickups don't double-award treats; treat spills aren't,
        // so each bone/heart collected counts toward p.treats as usual
        dropped:!isTreat, icon:idef?idef.icon:'❓', pickupAt:performance.now()+700+slot*90 });
      slot++;
    };
    loot.forEach(entry=>{
      if(entry.treats){ for(let i=0;i<entry.treats;i++) drop(Math.random()<0.7?'bone':'heart', 1, true); }
      else drop(entry.item, entry.qty||1, false);
    });
    if(typeof Progression!=='undefined') Progression.award(p, Progression.CHEST_XP[e.rarity]||5, 'chest');
    showToast(`✨ ${def.name} opened!`, 1800);
  },

  draw(e, t){
    const def=Chests.def(e.rarity);
    const x=Math.round(e.x), y=Math.round(e.y);

    if(e.state==='buried'){
      const p=p1; if(!p || p.dead) return;
      const d=Math.hypot(p.x-e.x, p.y-e.y);
      const scentR=(p.stats && p.stats.scentR) || 120;
      if(d>scentR) return;                          // completely hidden

      // sniff wisps at the dog's nose — pulse faster the closer you are
      const closeness=1-d/scentR;                  // 0 far → 1 on top of it
      const period=900-(900-260)*closeness;        // wisp pulse speeds up as you close in
      const ph=(t%period)/period;
      ctx.save();
      ctx.globalAlpha=0.5*(1-ph)*(0.4+0.6*closeness);
      ctx.fillStyle='#F0E6D2';
      const nx=p.x+(p.dir==='right'?12:p.dir==='left'?-12:0);
      const ny=p.y-(p.dir==='up'?18:6)-ph*8;
      ctx.beginPath(); ctx.arc(nx-2, ny, 1.6+ph*1.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(nx+2, ny-3, 1.2+ph*1.2, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      // within reach: loose-dirt patch + pulsing "!" (npc-style prompt)
      if(d<46){
        ctx.save();
        ctx.globalAlpha=0.85;
        ctx.fillStyle='#A98456';
        ctx.beginPath(); ctx.ellipse(x, y+4, 13, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#8B6B4A';
        px(x-6,y+1,4,3,'#8B6B4A'); px(x+2,y+4,5,3,'#8B6B4A'); px(x-2,y+6,3,2,'#7A5C40');
        ctx.restore();
        if(e.digT>0){
          // dig progress ring
          const prog=1-(e.digT/(e._digMax||def.digMs));
          ctx.save();
          ctx.lineWidth=3; ctx.strokeStyle='rgba(74,63,53,0.35)';
          ctx.beginPath(); ctx.arc(x, y-18, 9, 0, Math.PI*2); ctx.stroke();
          ctx.strokeStyle='#FFD93D';
          ctx.beginPath(); ctx.arc(x, y-18, 9, -Math.PI/2, -Math.PI/2+prog*Math.PI*2); ctx.stroke();
          ctx.restore();
        } else {
          const pulse=1+Math.sin(t/240)*0.12;
          ctx.save();
          ctx.translate(x, y-16); ctx.scale(pulse, pulse);
          ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('!',0,0);
          ctx.fillStyle='#C08A2A'; ctx.fillText('!',0,0);
          ctx.restore();
        }
      }
      return;
    }

    // ---- dug / open: the chest itself ----
    // soft glow for precious rarities
    if(def.glow){
      const gr=16+Math.sin(t/300)*2;
      ctx.save(); ctx.globalAlpha=0.5;
      const g=ctx.createRadialGradient(x,y-4,2,x,y-4,gr+8);
      g.addColorStop(0,def.glow); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y-4,gr+8,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // shadow
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+9,13,4,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;

    if(e.state==='open'){
      // open lid behind the box + dark interior
      px(x-10,y-14,20,6,def.lid); px(x-10,y-14,20,2,def.band);
      px(x-9,y-8,18,4,'#241A10');
      px(x-10,y-6,20,12,def.base);
      px(x-10,y-6,20,2,def.band);
      px(x-10,y+4,20,2,def.band);
    } else {
      // closed box with domed lid + band + hasp
      px(x-10,y-4,20,10,def.base);
      px(x-10,y-10,20,7,def.lid);
      px(x-9,y-12,18,3,def.lid);
      px(x-10,y-4,20,2,def.band);
      px(x-2,y-5,4,6,def.band);                    // hasp plate
      const lockCol=(def.locked && !e.unlocked) ? '#3A3630' : def.band;
      px(x-1,y-3,2,3,lockCol);                     // keyhole / latch
      if(def.locked && !e.unlocked){
        // padlock dangle
        px(x-2,y+1,4,4,'#4A4640'); px(x-1,y+2,2,2,'#2A2620');
      }
      // twinkle on precious chests
      if(def.glow && Math.floor(t/400)%3===0){ px(x+5,y-9,2,2,'#FFFFFF'); }
    }
  },
});
