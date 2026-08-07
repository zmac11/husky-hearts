// ====================== ENTITY: RUIN SENTINEL (Golden Dunes — Ancient Ruins) ======================
// A rooted stone guardian that wakes when you draw near and lobs sand-bolts across the room —
// the ruins' ranged threat (same shape as the Fungus Hollow toadstool, re-skinned). It can't
// move; break line of sight behind ruin walls, weave the bolts, or pop it (it has hp). A
// Mirage Decoy pulls its fire.

Entities.register('sentinel', {
  radius: 26,
  init(e){ e.hp=(typeof e.hp==='number')?e.hp:5; e.range=e.range||300; e.cd=rand(800,2000); e.bolts=[]; e.dir=1; e.bob=0; },
  update(e, t, dt){
    const decoy=(typeof Entities!=='undefined'&&Entities.decoyTarget)?Entities.decoyTarget():null;
    const tgt=decoy || p1;
    e.cd-=dt;
    if(tgt && !tgt.dead && e.cd<=0 && Math.hypot(tgt.x-e.x, tgt.y-e.y)<e.range){
      e.cd=rand(1800,2800);
      e.bolts.push({ x0:e.x, y0:e.y-14, tx:tgt.x, ty:tgt.y, prog:0, dur:640 });
      e.dir = tgt.x>=e.x?1:-1;
      if(typeof sfxHowl==='function') sfxHowl();
    }
    for(let i=e.bolts.length-1;i>=0;i--){
      const b=e.bolts[i]; b.prog+=dt/b.dur;
      const bx=b.x0+(b.tx-b.x0)*b.prog, by=b.y0+(b.ty-b.y0)*b.prog;
      if(p1 && !p1.dead && !p1.diving && Math.hypot(p1.x-bx,p1.y-by)<14){ if(typeof Health!=='undefined') Health.damage(p1, 2); spawnSparkles(p1.x,p1.y-6,'#E8C87A',8); e.bolts.splice(i,1); continue; }
      if(b.prog>=1){ spawnSparkles(b.tx,b.ty,'#D8B878',6); e.bolts.splice(i,1); }
    }
    if(e.hurtT>0) e.hurtT=Math.max(0,e.hurtT-dt);
    e.bob=t;
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y), D=e.dir, awake=e.bolts.length>0 || (p1&&Math.hypot(p1.x-e.x,p1.y-e.y)<e.range);
    ctx.globalAlpha=0.24; ctx.beginPath(); ctx.ellipse(x,y+14,15,5,0,0,Math.PI*2); ctx.fillStyle='#2A2214'; ctx.fill(); ctx.globalAlpha=1;
    // carved sandstone plinth + idol
    px(x-12,y+4,24,12,'#C7A876'); px(x-12,y+4,24,3,'#D8BC8A');
    px(x-9,y-16,18,22,'#BFA06E'); px(x-9,y-16,18,4,'#D2B584');
    // glyph carvings
    ctx.strokeStyle='#8A6E42'; ctx.lineWidth=1; ctx.strokeRect(x-6,y-12,12,14);
    px(x-3,y-9,6,1,'#8A6E42'); px(x-3,y-4,6,1,'#8A6E42');
    // glowing eye (awake = hostile)
    const eye=awake?'#FF9A2E':'#7A6E4A';
    px(x+D*2-3,y-13,6,3,eye); px(x+D*2-1,y-12,2,1,'#FFE0A0');
    if(e.hurtT>0){ ctx.globalAlpha=Math.min(0.5,e.hurtT/440); px(x-12,y-18,24,34,'#FF9A5A'); ctx.globalAlpha=1; }
    // sand-bolts in flight
    e.bolts.forEach(b=>{ const bx=b.x0+(b.tx-b.x0)*b.prog, by=b.y0+(b.ty-b.y0)*b.prog - Math.sin(b.prog*Math.PI)*20;
      ctx.save(); ctx.fillStyle='#E8C87A'; ctx.beginPath(); ctx.arc(Math.round(bx),Math.round(by),3.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.4; ctx.fillStyle='#F4E0B0'; ctx.beginPath(); ctx.arc(Math.round(bx)-1,Math.round(by)-1,1.6,0,Math.PI*2); ctx.fill(); ctx.restore(); });
  },
});
