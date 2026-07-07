// ====================== ENTITY: GRAVE ======================
// A little headstone left where a dog fainted. Purely a marker: no update, no
// interaction — it just draws (y-sorted with the living actors in the main loop) and
// rides along in save/load like any other entity. Health.onDown spawns one at the
// death spot; LevelManager clears them when the next level generates.

Entities.register('grave', {
  radius: 0,

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    // ground shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+7,12,4,0,0,Math.PI*2); ctx.fillStyle='#141414'; ctx.fill(); ctx.globalAlpha=1;
    // earth mound
    px(x-11,y+3,22,6,'#6B5A3E'); px(x-11,y+3,22,2,'#7C6A4A');
    // headstone slab (rounded top)
    px(x-7,y-13,14,17,'#9A9A92');
    px(x-5,y-16,10,4,'#9A9A92');
    px(x-3,y-18,6,3,'#9A9A92');
    px(x-7,y-13,14,2,'#B6B6AC');           // top-lit edge
    px(x+5,y-13,2,17,'#7E7E76');           // right shade
    // engraved cross
    px(x-1,y-11,2,9,'#6E6E66'); px(x-4,y-8,8,2,'#6E6E66');
    // a single flower laid at the base
    px(x-9,y+5,2,3,'#5A8A4A');
    px(x-10,y+3,2,2,'#FF9EC0'); px(x-8,y+3,2,2,'#FF9EC0'); px(x-9,y+4,2,2,'#FFE066');
  },
});
