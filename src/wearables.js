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
  SLOTS: ['head','face','neck','body','back'],
  SLOT_LABEL: { head:'Head', face:'Face', neck:'Neck', body:'Body', back:'Back' },

  slotOf(id){ const d=Items.get(id); return d && d.slot; },
  isWearable(id){ const d=Items.get(id); return !!(d && d.type==='wearable'); },
  equipped(p, slot){ return (p.equipment && p.equipment[slot]) || null; },

  // Equip a bag item into its slot; whatever was in that slot returns to the bag.
  equip(p, id){
    const slot=this.slotOf(id);
    if(!slot || !Inventory.has(p, id)) return false;
    const eq = p.equipment || (p.equipment = {});
    const prev = eq[slot];
    Inventory.remove(p, id, 1);
    if(prev) Inventory.add(p, prev, 1);
    eq[slot]=id;
    return true;
  },

  unequip(p, slot){
    const eq=p.equipment; if(!eq || !eq[slot]) return false;
    if(Inventory.roomFor(p, eq[slot]) < 1) return false;   // nowhere to put it — bag full
    Inventory.add(p, eq[slot], 1);
    delete eq[slot];
    return true;
  },

  // ---- slot-aware variants for drag & drop ----
  // Equip the item in bag slot `idx` into wearable slot `wslot`; the previously-worn
  // item drops back into the freed bag slot (or the bag). Returns true on success.
  equipFromSlot(p, idx, wslot){
    const cell=Inventory.at(p, idx); if(!cell) return false;
    const def=Items.get(cell.id);
    if(!def || def.type!=='wearable' || def.slot!==wslot) return false;
    const eq = p.equipment || (p.equipment={});
    const prev = eq[wslot];
    Inventory.removeAt(p, idx, 1);
    eq[wslot]=cell.id;
    if(prev){
      if(!Inventory.at(p, idx)) Inventory.setAt(p, idx, { id:prev, qty:1 });
      else Inventory.add(p, prev, 1);
    }
    return true;
  },

  // Unequip wearable slot `wslot` into bag slot `idx`. If that bag slot holds a matching
  // wearable it swaps; otherwise falls back to any free bag space.
  unequipToSlot(p, wslot, idx){
    const eq=p.equipment; const id=eq && eq[wslot]; if(!id) return false;
    const target=Inventory.at(p, idx);
    if(!target){ Inventory.setAt(p, idx, { id, qty:1 }); delete eq[wslot]; return true; }
    if(target.id===id && target.qty<Inventory.MAX_STACK){ target.qty++; delete eq[wslot]; return true; }
    const tdef=Items.get(target.id);
    if(tdef && tdef.type==='wearable' && tdef.slot===wslot){   // swap the two wearables
      Inventory.removeAt(p, idx, 1);
      Inventory.setAt(p, idx, { id, qty:1 });
      eq[wslot]=target.id;
      return true;
    }
    return this.unequip(p, wslot);                            // occupied → send to bag
  },

  // ---- rendering ----
  // Build the anchor used by both the world dog and the paper-doll. `x` is the dog's
  // horizontal centre; `foot` is its baseline (`by` in drawDog). Head/face/neck/body
  // offsets are tuned to the shared breed silhouette.
  anchor(x, foot, dir, equipment, t){
    return { x, headY:foot-18, faceY:foot-11, neckY:foot-2, bodyY:foot+1, dir, t, equipment };
  },

  drawBack(g, a){
    const eq=a.equipment; if(!eq) return;
    if(eq.back) this._paint(g, eq.back, a);   // capes sit behind the dog
  },
  drawFront(g, a){
    const eq=a.equipment; if(!eq) return;
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
      // brim points the way the dog faces
      if(a.dir==='right')      _wpx(g, x+5, y+3, 8, 2, '#9E2A1E');
      else if(a.dir==='left')  _wpx(g, x-13, y+3, 8, 2, '#9E2A1E');
      else                     _wpx(g, x-4, y+4, 8, 2, '#9E2A1E');
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
      if(a.dir==='right'){ _wpx(g, a.x+3, y, 6, 3, '#111'); _wpx(g, a.x+8, y+1, 1, 1, '#111'); }
      else if(a.dir==='left'){ _wpx(g, a.x-9, y, 6, 3, '#111'); _wpx(g, a.x-9, y+1, 1, 1, '#111'); }
      else { _wpx(g, a.x-6, y, 5, 3, '#111'); _wpx(g, a.x+1, y, 5, 3, '#111'); _wpx(g, a.x-1, y+1, 2, 1, '#111'); }
    },
    scarf(g,a){
      const y=a.neckY;
      _wpx(g, a.x-8, y, 16, 4, '#2E7D5B');   // wrap
      _wpx(g, a.x-8, y+1, 16, 1, '#F0E6C8'); // knit stripe
      const dx = a.dir==='left'? -9 : 5;     // dangling tail
      _wpx(g, a.x+dx, y+2, 3, 7, '#2E7D5B');
      _wpx(g, a.x+dx, y+5, 3, 1, '#F0E6C8');
    },
    raincoat(g,a){
      const y=a.bodyY;
      _wpx(g, a.x-10, y, 20, 11, '#F2C94C'); // coat body
      _wpx(g, a.x-10, y, 20, 2, '#E0B23C');  // collar shade
      _wpx(g, a.x-1, y+2, 2, 2, '#8A6D1A');  // buttons
      _wpx(g, a.x-1, y+6, 2, 2, '#8A6D1A');
      _wpx(g, a.x-10, y+9, 20, 2, '#D9A82E');// hem
    },
    cape(g,a){
      const y=a.bodyY;
      _wpx(g, a.x-9, y-2, 18, 12, '#B03040'); // cloth
      _wpx(g, a.x-9, y-2, 18, 3, '#D04A5A');  // shoulder collar
      _wpx(g, a.x-9, y+10, 5, 3, '#8C2434');  // ragged hem
      _wpx(g, a.x-1, y+10, 5, 3, '#8C2434');
      _wpx(g, a.x+6, y+10, 3, 3, '#8C2434');
    },
  },
};
