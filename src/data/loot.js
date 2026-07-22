// ====================== LOOT ROLLER ======================
// One shared roller for every drop table in the game — chest loot and enemy drops both
// go through it. Tables are authored in src/config/loot.json (baked into LOOT_DATA).
//
// Drop-table schema (independent probabilities — each entry rolls on its own, so several
// can drop at once):
//   { treats:[min,max],           // optional guaranteed spill of that many treats
//     drops:[ <entry>, ... ] }
// where each <entry> is one of:
//   { item:'biscuit', qty?:1, chance?:0.4 }        // chance omitted → guaranteed
//   { oneOf:['ribbon','scarf'], qty?:1, chance?:0.15 } // roll chance, then pick one id
//
// Returns the same {treats:n} | {item, qty} shape the chest/enemy code already spills, so
// callers don't change. Runtime loot uses Math.random (seeding is only for terrain).

function rollLoot(table, p){
  const out = [];
  if(!table) return out;
  if(table.treats){
    const a = table.treats[0], b = table.treats[1];
    out.push({ treats: a + Math.floor(Math.random()*(b - a + 1)) });   // inclusive [a,b]
  }
  (table.drops || []).forEach(d => {
    if(typeof d.chance === 'number' && Math.random() >= d.chance) return;   // failed the roll
    const item = d.oneOf ? d.oneOf[Math.floor(Math.random()*d.oneOf.length)] : d.item;
    if(item) out.push({ item, qty: d.qty || 1 });
  });
  return out;
}
