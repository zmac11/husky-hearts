// ====================== ENTITY: LEVER (Amber Orchard — Haybale Maze) ======================
// A wooden gate lever. Walk up, press the action key, and it throws with a clunk — pulling
// every lever clears the `levers` objective and opens the maze gate. Plain data ({on}) so it
// rides through save/level-state. Same "activate all" shape as firepits/shrine lanterns.

Entities.register('lever', {
  radius: 30,
  init(e){ e.on=!!e.on; e.bob=0; },
  onInteract(e, p){
    if(e.on){ showToast('🔧 That lever is already thrown.', 1100); return; }
    e.on=true;
    if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-8, '#E0C060', 16);
    if(typeof sfxDig==='function') sfxDig();
    showToast('🔧 Clunk! A gate grinds open.', 1500);
    if(typeof updateHUD==='function') updateHUD();
    if(typeof checkWin==='function') checkWin();
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+10,10,4,0,0,Math.PI*2); ctx.fillStyle='#1E1A10'; ctx.fill(); ctx.globalAlpha=1;
    // stone base
    px(x-8,y+2,16,8,'#8A8E96'); px(x-8,y+2,16,2,'#A2A6AE');
    // pivot + handle (angled by on/off)
    px(x-2,y-2,4,6,'#5A4632');
    ctx.save(); ctx.translate(x,y); ctx.rotate(e.on ? 0.7 : -0.7);
    px(-2,-18,4,18,'#7A5A38'); ctx.beginPath(); ctx.arc(0,-18,4,0,Math.PI*2); ctx.fillStyle=e.on?'#6FCf6F':'#C0432E'; ctx.fill();
    ctx.restore();
    // prompt within reach
    if(!e.on && p1 && !p1.dead && Math.hypot(p1.x-e.x,p1.y-e.y)<40){
      const pulse=1+Math.sin(t/240)*0.12;
      ctx.save(); ctx.translate(x,y-24); ctx.scale(pulse,pulse);
      ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.lineWidth=3; ctx.strokeStyle='#FFF8EF'; ctx.strokeText('!',0,0); ctx.fillStyle='#C08A2A'; ctx.fillText('!',0,0);
      ctx.restore();
    }
  },
});
