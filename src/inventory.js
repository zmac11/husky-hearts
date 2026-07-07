// ====================== INVENTORY ======================
// A per-player bag stored as a FIXED, positional array of slots on p.inventory. Each
// slot is null or { id, qty }. Positions are stable, which is what lets the UI drag,
// reorder, and pin items to specific cells. The first HOTBAR slots are the numeric
// quick-slots (keys 1..N) and are mirrored by the always-on hotbar.
//
// Capacity is fixed (CAP), so a full bag refuses new pickups. `treats` (world.js) stays
// the delivery currency; the inventory is the general item store. The classic
// add/remove/count/has API is preserved so shop, wearables, and pickup code keep working;
// slot-aware ops (at/removeAt/moveSlot) back the drag-and-drop layer.

const Inventory = {
  CAP: 24,          // total slots (6 columns × 4 rows)
  HOTBAR: 6,        // first row = numeric quick-slots
  MAX_STACK: 99,

  create(){ return new Array(this.CAP).fill(null); },

  // Guarantee p.inventory is a CAP-length slot array (also migrates legacy {id:qty} maps
  // and older-length arrays from saves), and return it.
  cells(p){
    let inv = p.inventory;
    if(!Array.isArray(inv)){
      const arr = this.create();
      if(inv && typeof inv === 'object'){ // migrate legacy { id: qty }
        let i=0; for(const id in inv){ if(i>=arr.length) break; arr[i++] = { id, qty: inv[id] }; }
      }
      inv = p.inventory = arr;
    } else if(inv.length !== this.CAP){
      while(inv.length < this.CAP) inv.push(null);
      inv.length = this.CAP;
    }
    return inv;
  },

  at(p, idx){ return this.cells(p)[idx] || null; },
  emptyIndex(p){ return this.cells(p).findIndex(c => !c); },
  isFull(p){ return this.emptyIndex(p) < 0; },

  // How many more of `id` will fit (partial stacks of that id + empty slots).
  roomFor(p, id){
    let room = 0;
    for(const c of this.cells(p)){
      if(!c) room += this.MAX_STACK;
      else if(c.id === id) room += (this.MAX_STACK - c.qty);
    }
    return room;
  },

  // Add n of id: top up matching stacks first, then fill empty slots. Returns the
  // amount actually added (may be < n if the bag fills up).
  add(p, id, n=1){
    const cells = this.cells(p); let left = n;
    for(const c of cells){ if(left<=0) break; if(c && c.id===id && c.qty<this.MAX_STACK){ const a=Math.min(this.MAX_STACK-c.qty,left); c.qty+=a; left-=a; } }
    for(let i=0;i<cells.length && left>0;i++){ if(!cells[i]){ const a=Math.min(this.MAX_STACK,left); cells[i]={id,qty:a}; left-=a; } }
    return n - left;
  },

  count(p, id){ return this.cells(p).reduce((s,c)=> s + (c && c.id===id ? c.qty : 0), 0); },
  has(p, id, n=1){ return this.count(p, id) >= n; },

  // Remove n of id, taking from the back so front/hotbar stacks are preserved.
  remove(p, id, n=1){
    const cells = this.cells(p); let left = n;
    for(let i=cells.length-1;i>=0 && left>0;i--){ const c=cells[i]; if(c && c.id===id){ const t=Math.min(c.qty,left); c.qty-=t; left-=t; if(c.qty<=0) cells[i]=null; } }
    return left < n;   // true if anything was removed
  },

  // Remove up to n from a specific slot; returns { id, qty } taken (or null).
  removeAt(p, idx, n=1){
    const cells=this.cells(p), c=cells[idx];
    if(!c) return null;
    const t=Math.min(c.qty, n), id=c.id;
    c.qty-=t; if(c.qty<=0) cells[idx]=null;
    return { id, qty:t };
  },
  setAt(p, idx, cell){ this.cells(p)[idx] = cell; },

  // Move / swap / merge slot `from` → `to` (drag reorder).
  moveSlot(p, from, to){
    if(from===to) return;
    const cells=this.cells(p), a=cells[from], b=cells[to];
    if(!a) return;
    if(b && a.id===b.id){ const mv=Math.min(this.MAX_STACK-b.qty, a.qty); b.qty+=mv; a.qty-=mv; if(a.qty<=0) cells[from]=null; }
    else { cells[to]=a; cells[from]=b; }
  },

  // Non-empty slots as [{idx,id,qty,def}] (compat helper for aggregate callers).
  list(p){
    const out=[]; this.cells(p).forEach((c,idx)=>{ if(c) out.push({ idx, id:c.id, qty:c.qty, def:Items.get(c.id) }); });
    return out;
  },
  total(p){ return this.cells(p).reduce((s,c)=> s + (c?c.qty:0), 0); },
};
