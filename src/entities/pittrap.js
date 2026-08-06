// ====================== ENTITY: PIT TRAP (Badger Baron arena) ======================
// A leaf-covered pit — the tool you beat the first boss with. Your abilities don't awaken
// until AFTER the Badger Baron (world-map.js), so you can't hurt him; instead you trick him.
// The dog is far too light to spring one of these, but when the Baron BARRELS across a
// covered pit mid-charge, the cover snaps and he crashes in (see entities/badgerbaron.js).
//
// Two states: 'armed' (a covered mound of leaves & twigs, with a hairline crack if you look
// closely) and 'sprung' (an inert open hole once he's fallen in). It has no onInteract, so
// the player just walks over it freely — it only ever springs under the charging Baron.

Entities.register('pittrap', {
  radius: 30,          // how near the charging Baron's center must get to tumble in

  init(e){
    e.state = e.state || 'armed';   // 'armed' (covered) | 'sprung' (open hole)
    e.wob = 0;
  },

  update(e, t, dt){ e.wob = t; },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    if(e.state==='sprung'){
      // open hole: a dark oval mouth with broken cover scattered at the rim
      ctx.globalAlpha=0.92; ctx.beginPath(); ctx.ellipse(x,y+2,27,15,0,0,Math.PI*2); ctx.fillStyle='#241A10'; ctx.fill(); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.ellipse(x,y+4,20,10,0,0,Math.PI*2); ctx.fillStyle='#3A2A18'; ctx.fill();
      px(x-25,y-6,9,3,'#7A5A34'); px(x+16,y-3,9,3,'#6B4A28'); px(x-6,y+12,10,3,'#7A5A34'); // snapped planks
    } else {
      // covered pit: a low mound of leaf litter over crossed twigs, faint crack telegraph
      ctx.globalAlpha=0.30; ctx.beginPath(); ctx.ellipse(x,y+4,26,14,0,0,Math.PI*2); ctx.fillStyle='#4A3A1E'; ctx.fill(); ctx.globalAlpha=1;
      const cols=['#6FA84E','#8ABF5C','#C4903A','#9A6636'];
      for(let i=0;i<9;i++){ const a=i/9*Math.PI*2 + (e.wob||0)/6000; const rx=Math.cos(a)*(10+i%3*5), ry=Math.sin(a)*(6+i%2*3); px(x+rx-2,y+ry-1,4,3,cols[i%cols.length]); }
      px(x-14,y+2,28,2,'#7A5A34'); px(x-2,y-8,3,22,'#6B4A28');   // crossed twigs
      ctx.globalAlpha=0.20; px(x-16,y-2,32,1,'#20140A'); ctx.globalAlpha=1;   // hairline crack
    }
  },
});
