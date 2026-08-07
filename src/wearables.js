// ====================== WEARABLES ======================
// Equippable cosmetics. Each wearable item (data/items.js, type:'wearable') has a
// `slot` (head/face/neck/body/back) and a `render` key into this module's draw table.
// A player wears at most one item per slot, stored in `p.equipment = { slot: itemId }`.
//
// Equipping moves an item bag → slot (any item already in that slot returns to the bag);
// unequipping moves it back. The render half draws the worn items ON the dog: drawBack()
// runs behind the breed sprite (capes), drawFront() runs on top (hats, scarves, coats).
// Both take a plain graphics context + an `anchor` describing where the dog's head/body
// sit, so the SAME code paints the live world dog (dog-sprite.js) and the inventory
// paper-doll preview (ui.js).

// Local pixel helper (mirrors the global px(), but on an explicit context so it works
// for the off-screen paper-doll canvas too).
function _wpx(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }

const Wearables = {
  SLOTS: ['head','face','neck','body','back','feet','relic'],
  SLOT_LABEL: { head:'Head', face:'Face', neck:'Neck', body:'Body', back:'Back', feet:'Feet', relic:'Relic' },

  slotOf(id){ const d=Items.get(id); return d && d.slot; },
  // Wearables and relics both live in equipment slots (relics are the active-item kind).
  _equippable(def, slot){ return !!(def && (def.type==='wearable'||def.type==='relic') && def.slot===slot); },
  isWearable(id){ const d=Items.get(id); return !!(d && d.type==='wearable'); },
  equipped(p, slot){ return (p.equipment && p.equipment[slot]) || null; },

  // Re-derive stats after any equip/unequip so gear bonuses (Items `mods`) take effect.
  restat(p){ if(typeof Skills!=='undefined') Skills.apply(p); },

  // Equip a bag item into its slot; whatever was in that slot returns to the bag.
  equip(p, id){
    const slot=this.slotOf(id);
    if(!slot || !Inventory.has(p, id)) return false;
    const eq = p.equipment || (p.equipment = {});
    const prev = eq[slot];
    Inventory.remove(p, id, 1);
    if(prev) Inventory.add(p, prev, 1);
    eq[slot]=id;
    this.restat(p);
    if(typeof Tips!=='undefined') Tips.show('wearable');
    return true;
  },

  unequip(p, slot){
    const eq=p.equipment; if(!eq || !eq[slot]) return false;
    if(Inventory.roomFor(p, eq[slot]) < 1) return false;   // nowhere to put it — bag full
    Inventory.add(p, eq[slot], 1);
    delete eq[slot];
    this.restat(p);
    return true;
  },

  // ---- slot-aware variants for drag & drop ----
  // Equip the item in bag slot `idx` into wearable slot `wslot`; the previously-worn
  // item drops back into the freed bag slot (or the bag). Returns true on success.
  equipFromSlot(p, idx, wslot){
    const cell=Inventory.at(p, idx); if(!cell) return false;
    const def=Items.get(cell.id);
    if(!this._equippable(def, wslot)) return false;
    const eq = p.equipment || (p.equipment={});
    const prev = eq[wslot];
    Inventory.removeAt(p, idx, 1);
    eq[wslot]=cell.id;
    if(prev){
      if(!Inventory.at(p, idx)) Inventory.setAt(p, idx, { id:prev, qty:1 });
      else Inventory.add(p, prev, 1);
    }
    this.restat(p);
    return true;
  },

  // Unequip wearable slot `wslot` into bag slot `idx`. If that bag slot holds a matching
  // wearable it swaps; otherwise falls back to any free bag space.
  unequipToSlot(p, wslot, idx){
    const eq=p.equipment; const id=eq && eq[wslot]; if(!id) return false;
    const target=Inventory.at(p, idx);
    if(!target){ Inventory.setAt(p, idx, { id, qty:1 }); delete eq[wslot]; this.restat(p); return true; }
    if(target.id===id && target.qty<Inventory.MAX_STACK){ target.qty++; delete eq[wslot]; this.restat(p); return true; }
    const tdef=Items.get(target.id);
    if(this._equippable(tdef, wslot)){   // swap the two wearables/relics
      Inventory.removeAt(p, idx, 1);
      Inventory.setAt(p, idx, { id, qty:1 });
      eq[wslot]=target.id;
      this.restat(p);
      return true;
    }
    return this.unequip(p, wslot);                            // occupied → send to bag (calls restat)
  },

  // ---- rendering ----
  // Build the anchor used by both the world dog and the paper-doll. `x` is the dog's
  // horizontal centre; `foot` is its baseline (`by` in drawDog). Head/face/neck/body
  // offsets are tuned per silhouette: the standard frame fits Dinno/Lolla; tiny breeds
  // (Ťapka) have a lower head, eyes at foot-8 and a shorter body, so clothing shifts
  // down and the render table shrinks pieces via `a.small`.
  anchor(x, foot, dir, equipment, t, breed){
    const small = breed==='tapka';
    return small
      ? { x, headY:foot-14, faceY:foot-8,  neckY:foot,   bodyY:foot+3, dir, t, equipment, small:true }
      : { x, headY:foot-18, faceY:foot-11, neckY:foot-2, bodyY:foot+1, dir, t, equipment, small:false };
  },

  // Layering is direction-aware: back-slot items (capes) hang on the dog's BACK, so
  // facing down/left/right they sit behind the sprite — but facing up (away from the
  // camera) the back is what you see, so they draw OVER the sprite instead. This lives
  // in the shared pass, so it applies to every wearable and every breed automatically.
  drawBack(g, a){
    const eq=a.equipment; if(!eq) return;
    if(eq.back && a.dir!=='up') this._paint(g, eq.back, a);
  },
  drawFront(g, a){
    const eq=a.equipment; if(!eq) return;
    if(eq.back && a.dir==='up') this._paint(g, eq.back, a);   // cape covers the back you're looking at
    ['body','neck','head','face'].forEach(slot=>{ if(eq[slot]) this._paint(g, eq[slot], a); });
  },
  _paint(g, id, a){
    const def=Items.get(id); if(!def) return;
    const fn=this._render[def.render];
    if(fn) fn(g, a, id);
  },

  // dir → horizontal nudge for head-mounted items
  _hdx(dir){ return dir==='right'?3 : dir==='left'?-3 : 0; },

  _render:{
    tophat(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-9, y+3, 18, 2, '#15130F');   // brim
      _wpx(g, x-6, y-6, 12, 9, '#26231C');   // crown
      _wpx(g, x-6, y-6, 12, 2, '#34302A');   // top highlight
      _wpx(g, x-6, y+1, 12, 2, '#8B2033');   // red band
    },
    ballcap(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-6, y-2, 12, 6, '#C0392B');   // dome
      _wpx(g, x-6, y-4, 12, 3, '#D9503E');   // crown top
      _wpx(g, x-2, y-5, 5, 2, '#D9503E');
      // brim points the way the dog faces (facing up it's hidden behind the head)
      if(a.dir==='right')      _wpx(g, x+5, y+3, 8, 2, '#9E2A1E');
      else if(a.dir==='left')  _wpx(g, x-13, y+3, 8, 2, '#9E2A1E');
      else if(a.dir==='down')  _wpx(g, x-4, y+4, 8, 2, '#9E2A1E');
    },
    ribbon(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY+2;
      _wpx(g, x-5, y, 3, 4, '#FF6FA5');      // left loop
      _wpx(g, x+2, y, 3, 4, '#FF6FA5');      // right loop
      _wpx(g, x-1, y, 2, 4, '#E24C86');      // knot
      _wpx(g, x-6, y-1, 2, 2, '#FF97C0'); _wpx(g, x+4, y-1, 2, 2, '#FF97C0');
    },
    shades(g,a){
      if(a.dir==='up') return;               // eyes hidden facing away
      const y=a.faceY;
      if(a.small){                           // narrow face → smaller lenses over the eyes
        if(a.dir==='right'){ _wpx(g, a.x+2, y, 5, 3, '#111'); _wpx(g, a.x+6, y+1, 1, 1, '#111'); }
        else if(a.dir==='left'){ _wpx(g, a.x-7, y, 5, 3, '#111'); _wpx(g, a.x-7, y+1, 1, 1, '#111'); }
        else { _wpx(g, a.x-5, y, 4, 3, '#111'); _wpx(g, a.x+1, y, 4, 3, '#111'); _wpx(g, a.x-1, y+1, 2, 1, '#111'); }
        return;
      }
      if(a.dir==='right'){ _wpx(g, a.x+3, y, 6, 3, '#111'); _wpx(g, a.x+8, y+1, 1, 1, '#111'); }
      else if(a.dir==='left'){ _wpx(g, a.x-9, y, 6, 3, '#111'); _wpx(g, a.x-9, y+1, 1, 1, '#111'); }
      else { _wpx(g, a.x-6, y, 5, 3, '#111'); _wpx(g, a.x+1, y, 5, 3, '#111'); _wpx(g, a.x-1, y+1, 2, 1, '#111'); }
    },
    scarf(g,a){
      const y=a.neckY, w=a.small?12:16, hw=w/2;
      _wpx(g, a.x-hw, y, w, 4, '#2E7D5B');   // wrap
      _wpx(g, a.x-hw, y+1, w, 1, '#F0E6C8'); // knit stripe
      const dx = a.dir==='left'? -(hw+1) : hw-3;  // dangling tail
      _wpx(g, a.x+dx, y+2, 3, a.small?5:7, '#2E7D5B');
      _wpx(g, a.x+dx, y+4, 3, 1, '#F0E6C8');
    },
    raincoat(g,a){
      const y=a.bodyY, w=a.small?14:20, h=a.small?8:11, hw=w/2;
      _wpx(g, a.x-hw, y, w, h, '#F2C94C');   // coat body
      _wpx(g, a.x-hw, y, w, 2, '#E0B23C');   // collar shade
      _wpx(g, a.x-1, y+2, 2, 2, '#8A6D1A');  // buttons
      _wpx(g, a.x-1, y+(a.small?5:6), 2, 2, '#8A6D1A');
      _wpx(g, a.x-hw, y+h-2, w, 2, '#D9A82E');// hem
    },
    cape(g,a){
      // Direction-aware so the cape is actually visible: facing down/up it drapes
      // WIDER than the body (edges + hem peek out); facing left/right it trails
      // behind the dog and flutters as they run.
      const y=a.bodyY, t=a.t||0;
      const C='#B03040', Cd='#8C2434', Cl='#D04A5A';
      if(a.dir==='down'||a.dir==='up'){
        const w=a.small?18:24, h=a.small?11:14, hw=w/2;
        _wpx(g, a.x-hw, y-2, w, h, C);
        _wpx(g, a.x-hw, y-2, w, 3, Cl);                 // shoulder collar
        _wpx(g, a.x-hw, y-2+h-3, 4, 3, Cd);             // ragged hem
        _wpx(g, a.x-2, y-2+h-3, 4, 3, Cd);
        _wpx(g, a.x+hw-3, y-2+h-3, 3, 3, Cd);
      } else {
        const trailLeft=a.dir==='right';                // trails opposite the facing
        const bw=a.small?7:10;                          // clears the body silhouette
        const len=a.small?7:9, h=a.small?9:12;
        const flut=Math.sin(t/170)*1.5;                 // gentle run flutter
        const x0=trailLeft ? a.x-bw-len : a.x+bw;
        _wpx(g, x0, y-2+flut*0.5, len, h, C);           // trailing cloth
        _wpx(g, trailLeft?x0:x0+len-3, y-2+flut, 3, h, Cd); // fluttering outer edge
        _wpx(g, a.x-bw, y-3, bw*2, 3, C);               // draped over the shoulders
        _wpx(g, trailLeft?a.x-bw-3:a.x+bw-1, y-3, 4, 3, Cl); // clasp at the shoulder
      }
    },
    crown(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-6, y-1, 12, 4, '#E8B824');   // gold band
      _wpx(g, x-6, y-5, 2, 4, '#E8B824');    // three points
      _wpx(g, x-1, y-6, 2, 5, '#E8B824');
      _wpx(g, x+4, y-5, 2, 4, '#E8B824');
      _wpx(g, x-6, y-1, 12, 1, '#F8D858');   // band highlight
      _wpx(g, x-3, y, 2, 2, '#C23A4A');      // ruby
      _wpx(g, x+2, y, 2, 2, '#2E6ED0');      // sapphire
    },
    beanie(g,a){
      const x=a.x+Wearables._hdx(a.dir), y=a.headY;
      _wpx(g, x-7, y-1, 14, 4, '#8A3B3B');   // knit band
      _wpx(g, x-6, y-5, 12, 5, '#B24A4A');   // dome
      _wpx(g, x-6, y-5, 12, 2, '#C86060');   // highlight
      _wpx(g, x-2, y-8, 4, 4, '#E8E0D0');    // pom-pom
    },
    snowgoggles(g,a){
      if(a.dir==='up') return;               // eyes hidden facing away
      const y=a.faceY;
      const lens='#3AA0C8', frame='#2A2E36', strap='#C0463C';
      if(a.small){                           // narrow face → slimmer goggles
        if(a.dir==='right'){ _wpx(g, a.x+1, y-1, 6, 4, frame); _wpx(g, a.x+2, y, 4, 2, lens); }
        else if(a.dir==='left'){ _wpx(g, a.x-7, y-1, 6, 4, frame); _wpx(g, a.x-6, y, 4, 2, lens); }
        else {
          _wpx(g, a.x-6, y-1, 12, 4, frame);
          _wpx(g, a.x-5, y, 4, 2, lens); _wpx(g, a.x+1, y, 4, 2, lens);
        }
        _wpx(g, a.x-7, y, 2, 2, strap); _wpx(g, a.x+5, y, 2, 2, strap);
        return;
      }
      if(a.dir==='right'){ _wpx(g, a.x+3, y-1, 7, 4, frame); _wpx(g, a.x+4, y, 5, 2, lens); }
      else if(a.dir==='left'){ _wpx(g, a.x-10, y-1, 7, 4, frame); _wpx(g, a.x-9, y, 5, 2, lens); }
      else {
        _wpx(g, a.x-7, y-1, 14, 4, frame);
        _wpx(g, a.x-6, y, 5, 2, lens); _wpx(g, a.x+1, y, 5, 2, lens);
      }
      _wpx(g, a.x-8, y, 2, 2, strap); _wpx(g, a.x+6, y, 2, 2, strap); // strap peeking out
    },
  },
};

// Equipment effects: passive stat mods (summed in Skills.apply) and per-ability mods
// (read by the ability modules). Items declare `mods` / `abilityMods` (data/items.js).
const Equip = {
  // Sum the stat deltas across everything the player has equipped.
  statMods(p){
    const out={ maxHp:0, speed:0, scentR:0, noiseMul:0, priceMul:0, swim:0 };
    if(!p || !p.equipment || typeof Items==='undefined') return out;
    for(const slot in p.equipment){
      const def=Items.get(p.equipment[slot]); const m=def && def.mods; if(!m) continue;
      if(m.maxHp)       out.maxHp    += m.maxHp;
      if(m.speed)       out.speed    += m.speed;
      if(m.scentR)      out.scentR   += m.scentR;
      if(m.noiseMul)    out.noiseMul += m.noiseMul;
      if(m.smartsPrice) out.priceMul += m.smartsPrice;
      if(m.swim)        out.swim     += m.swim;
    }
    return out;
  },
  // Fold equipped abilityMods for one ability node + field into a base value.
  abilityMod(p, node, field, base){
    let v=base;
    if(!p || !p.equipment || typeof Items==='undefined') return v;
    for(const slot in p.equipment){
      const def=Items.get(p.equipment[slot]);
      const am=def && def.abilityMods && def.abilityMods[node];
      if(am && typeof am[field]==='number') v+=am[field];
    }
    return v;
  },
};
