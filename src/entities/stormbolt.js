// ====================== ENTITY: STORM BOLT (Cloud Kingdom — Storm Peak) ======================
// A recurring lightning strike that hammers a fixed spot on the ascent: it telegraphs with a
// gathering glow, then a bolt cracks down for damage. Read the warning and be elsewhere.
// (The Storm Eagle rains its own lightning via groundzones; this is the ambient storm hazard.)

Entities.register('stormbolt', {
  init(e){ e.period=e.period||2600; e.dmg=e.dmg||3; e.r=e.r||30; e.phase=rand(0,e.period); e.state='idle'; e.flash=0; },
  update(e, t, dt){
    e.phase+=dt;
    if(e.state==='idle' && e.phase>=e.period){ e.state='warn'; e.phase=0; }
    else if(e.state==='warn' && e.phase>=620){ e.state='strike'; e.phase=0; e.flash=200;
      const p=p1; if(p && !p.dead && Math.hypot(p.x-e.x,p.y-e.y)<e.r){ if(typeof Health!=='undefined') Health.damage(p,e.dmg); spawnSparkles(p.x,p.y-6,'#FFF3A0',12); }
      if(typeof screenShake==='function') screenShake(4);
    }
    else if(e.state==='strike'){ e.flash-=dt; if(e.flash<=0){ e.state='idle'; e.phase=rand(0,e.period*0.3); } }
  },
  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y);
    if(e.state==='warn'){
      const k=Math.min(1, e.phase/620);
      ctx.save(); ctx.globalAlpha=0.25+0.35*k; ctx.strokeStyle='#C9BEF0'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(x,y,e.r*(1.2-0.4*k),e.r*0.7*(1.2-0.4*k),0,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#E6DFFA'; ctx.globalAlpha=0.2+0.3*k; ctx.beginPath(); ctx.ellipse(x,y,e.r,e.r*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else if(e.state==='strike' && e.flash>0){
      ctx.save(); ctx.globalAlpha=Math.min(1,e.flash/160);
      // jagged bolt from the sky
      ctx.strokeStyle='#FFF3A0'; ctx.lineWidth=3; ctx.beginPath();
      let bx=x, by=y-160; ctx.moveTo(bx,by);
      for(let s=0;s<6;s++){ bx=x+rand(-8,8); by+= (160/6); ctx.lineTo(bx,by); }
      ctx.lineTo(x,y); ctx.stroke();
      ctx.strokeStyle='#FFFFFF'; ctx.lineWidth=1.5; ctx.stroke();
      // impact flash
      ctx.globalAlpha=0.5*Math.min(1,e.flash/160); ctx.fillStyle='#FFF8D0'; ctx.beginPath(); ctx.ellipse(x,y,e.r,e.r*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
});
