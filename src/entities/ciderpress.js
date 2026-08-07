// ====================== ENTITY: CIDER PRESS (Amber Orchard — Cider Mill) ======================
// A working apple press for the `timed` production minigame. Press the action key to crank it
// and squeeze a barrel; it briefly JAMS (a short cooldown) then you press again. Total presses
// across the mill's presses fund the town and clear the level. Cozy — there's no fail state,
// just keep the mill running. `presses` rides through save/level-state.

Entities.register('ciderpress', {
  radius: 32,
  init(e){ e.presses=e.presses||0; e.jam=0; e.crank=0; e.bob=0; },
  update(e, t, dt){ if(e.jam>0) e.jam=Math.max(0,e.jam-dt); },
  onInteract(e, p){
    if(e.jam>0){ showToast('🍎 The press is resetting…', 900); return; }
    e.presses=(e.presses||0)+1; e.jam=700; e.crank=1;
    if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-6, '#C6772E', 12);
    if(typeof sfxDeliver==='function') sfxDeliver();
    showToast('🍶 Cha-chunk! A barrel of cider pressed.', 1100);
    if(typeof Progression!=='undefined') Progression.award(p, 2, 'quest');
    if(typeof updateHUD==='function') updateHUD();
    if(typeof checkWin==='function') checkWin();
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    const press=(e.jam>0) ? (1-e.jam/700) : 0;   // 0..1 downstroke while jammed/resetting
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+14,18,5,0,0,Math.PI*2); ctx.fillStyle='#2A1E12'; ctx.fill(); ctx.globalAlpha=1;
    // frame posts
    px(x-16,y-24,4,38,'#6A4A2A'); px(x+12,y-24,4,38,'#6A4A2A'); px(x-16,y-24,32,4,'#7A5A34');
    // screw + pressing plate (dips down while jammed)
    const plateY=y-16+press*8;
    px(x-2,y-22,4,10-press*0,'#9A8258');
    px(x-12,plateY,24,5,'#8A6A3A'); px(x-12,plateY,24,2,'#A07C46');
    // barrel of apples/cider below
    px(x-11,y-2,22,14,'#B5762E'); px(x-11,y+2,22,2,'#8A5A22'); px(x-11,y+8,22,2,'#8A5A22');
    px(x-6,y+1,12,5,'#E39A44');   // frothy cider
    // prompt within reach
    if(p1 && !p1.dead && Math.hypot(p1.x-e.x,p1.y-e.y)<42){
      const rdy=e.jam<=0, pulse=1+Math.sin(t/240)*0.12;
      ctx.save(); ctx.translate(x,y-30); ctx.scale(pulse,pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText(rdy?'!':'…',0,0); ctx.fillStyle=rdy?'#C6772E':'#9A9A9A'; ctx.fillText(rdy?'!':'…',0,0);
      ctx.restore();
    }
  },
});
