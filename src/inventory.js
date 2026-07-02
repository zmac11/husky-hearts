// ====================== INVENTORY ======================
// A per-player bag of items, stored as { itemId: qty } on player.inventory.
// This is the seam for pickups, quest items, and buying/selling from NPCs.
// `treats` stays as the delivery currency; inventory is the general item store.

const Inventory = {
  create(){ return {}; },

  add(p, id, n=1){
    const inv = p.inventory || (p.inventory = {});
    inv[id] = (inv[id] || 0) + n;
    return inv[id];
  },

  remove(p, id, n=1){
    const inv = p.inventory;
    if(!inv || !inv[id]) return false;
    inv[id] = Math.max(0, inv[id] - n);
    if(inv[id] === 0) delete inv[id];
    return true;
  },

  count(p, id){ return (p.inventory && p.inventory[id]) || 0; },
  has(p, id, n=1){ return this.count(p, id) >= n; },

  // [{id, qty, def}] for UI rendering.
  list(p){
    const inv = p.inventory || {};
    return Object.keys(inv).map(id => ({ id, qty: inv[id], def: Items.get(id) }));
  },
  total(p){
    const inv = p.inventory || {};
    return Object.keys(inv).reduce((sum, id) => sum + inv[id], 0);
  },
};
