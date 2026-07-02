// ====================== DOG SPRITE ======================
function drawDog(p,t){
  const x=Math.round(p.x), y=Math.round(p.y);
  const C=p.color;
  const D=shade(C,-30);
  const L=shade(C,40);
  const W='#F5EEE0';
  const K='#1A1A1A';

  ctx.save();

  const bounce=p.moving?Math.sin(t/90)*2.5:Math.sin(t/400);
  const by=y+bounce;
  const breed=p.breed||'husky';

  if(!p.swimming){
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+16,14,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;
  }

  if(p.swimming){
    // clip to upper portion only — waterline sits at by+2
    ctx.save();
    ctx.beginPath();
    ctx.rect(x-32, by-42, 64, 44);
    ctx.clip();
  }

  if(breed==='dinno') _drawDinno(x,by,t,C,D,L,W,K,p);
  else if(breed==='lolla') _drawLolla(x,by,t,C,D,L,W,K,p);
  else if(breed==='corgi') _drawCorgi(x,by,t,C,D,L,W,K,p);
  else if(breed==='shiba') _drawShiba(x,by,t,C,D,L,W,K,p);
  else if(breed==='poodle') _drawPoodle(x,by,t,C,D,L,W,K,p);
  else if(breed==='dalmatian') _drawDalmatian(x,by,t,C,D,L,W,K,p);
  else _drawHusky(x,by,t,C,D,L,W,K,p);

  // Active-ability overlay drawn on the dog (e.g. Lolla's ball in mouth)
  Abilities.drawOnDog(p,x,by);

  if(p.swimming){
    ctx.restore(); // remove clip
    // water surface at waterline
    const wl=Math.round(by)+2;
    const wswing=Math.sin(t/600)*3;
    // water fill over lower body
    ctx.globalAlpha=0.72;
    ctx.beginPath(); ctx.ellipse(x+wswing*0.3,wl,16,6,0,0,Math.PI*2);
    const wg=ctx.createRadialGradient(x-4,wl-2,1,x,wl,16);
    wg.addColorStop(0,'#9CE4FF'); wg.addColorStop(1,'#3AAACC');
    ctx.fillStyle=wg; ctx.fill();
    ctx.globalAlpha=1;
    // animated expanding ripples
    for(let i=0;i<3;i++){
      const phase=((t/1000+i/3)%1);
      const rs=1+phase*1.6;
      ctx.globalAlpha=0.38*(1-phase);
      ctx.beginPath(); ctx.ellipse(x+wswing*0.3,wl,16*rs,6*rs,0,0,Math.PI*2);
      ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1.5; ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  ctx.fillStyle='rgba(255,248,239,0.88)'; roundRect(x-11,by-34,22,11,3,true,false);
  ctx.fillStyle='#4A3F35'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
  ctx.fillText(`P${p.id}`,x,by-25);
  ctx.restore();
}

function _drawHusky(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-10,by-2,20,14,C); px(x-6,by+4,12,8,L);
    px(x-7,by-16,14,16,C); px(x-5,by-13,10,10,L);
    px(x-10,by-22,7,10,D); px(x-8,by-20,4,7,L);
    px(x+3,by-22,7,10,D); px(x+5,by-20,4,7,L);
    px(x-4,by-8,8,5,W); px(x-3,by-6,6,3,C); px(x-2,by-5,4,2,'#AA2244');
    px(x-2,by-9,5,4,K); px(x-1,by-8,2,2,'#555');
    px(x-5,by-13,4,2,K); px(x+1,by-13,4,2,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,D); px(x+10,by-6+tw,4,10,C);
    px(x-8,by+10,6,8,D); px(x+2,by+10,6,8,D);
    return;
  }
  px(x-10,by,20,14,C); px(x-7,by+4,14,8,L); px(x-10,by+2,4,10,D);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,D); px(x-6,by+18+la,4,4,shade(D,-10));
  px(x+2,by+11+la2,5,9,D); px(x+3,by+18+la2,4,4,shade(D,-10));
  px(x-7,by+19+la,5,3,'#9A7060'); px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,D); px(x-15,by+tw,4,8,C); px(x-15,by-2+tw,3,6,W); }
  else { px(x+9,by+2+tw*0.5,5,12,D); px(x+11,by+tw,4,8,C); px(x+12,by-2+tw,3,6,W); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,C);
    if(facing){ px(x-5,by-12,10,6,W); px(x-7,by-14,5,8,D); px(x+2,by-14,5,8,D); }
    px(x-9,by-22,7,10,D); px(x-7,by-20,4,7,L);
    px(x+2,by-22,7,10,D); px(x+4,by-20,4,7,L);
    px(x-6,by-19,3,5,'#FFBBAA'); px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K); px(x-4,by-11,2,2,'#4A3A2A'); px(x-3,by-10,1,1,'#FFFFFF');
      px(x+1,by-11,4,4,K); px(x+2,by-11,2,2,'#4A3A2A'); px(x+3,by-10,1,1,'#FFFFFF');
      px(x-4,by-6,8,5,W); px(x-2,by-4,5,3,L);
      px(x-2,by-7,5,4,K); px(x-1,by-6,2,2,'#444'); px(x,by-5,2,1,'#CC6688');
    } else { px(x-7,by-14,14,12,D); px(x-5,by-16,10,6,C); }
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,C); px(x-2,by-12,8,7,W); px(x+2,by-14,10,8,D);
    px(x+5,by-22,7,10,D); px(x+7,by-20,4,7,L); px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K); px(x+7,by-11,2,2,'#4A3A2A'); px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,W); px(x+14,by-7,4,4,K); px(x+15,by-6,2,2,'#444');
  } else {
    px(x-12,by-14,14,13,C); px(x-6,by-12,8,7,W); px(x-12,by-14,10,8,D);
    px(x-12,by-22,7,10,D); px(x-11,by-20,4,7,L); px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K); px(x-10,by-11,2,2,'#4A3A2A'); px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,W); px(x-20,by-7,4,4,K); px(x-19,by-6,2,2,'#444');
  }
}

function _drawShiba(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-9,by-1,18,12,C); px(x-5,by+3,10,7,W);
    px(x-6,by-15,12,15,C);
    px(x-8,by-22,5,10,D); px(x-6,by-20,3,7,W);
    px(x+3,by-22,5,10,D); px(x+4,by-20,3,7,W);
    px(x-3,by-7,7,5,W); px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/70)*5;
    px(x+8,by-4+tw,5,5,D); px(x+9,by-8+tw,4,4,C); px(x+8,by-11+tw,5,4,C);
    return;
  }
  px(x-9,by,18,12,C); px(x-5,by+3,10,7,W);
  const la=p.moving?Math.sin(t/120)*4:0,la2=p.moving?Math.sin(t/120+Math.PI)*4:0;
  px(x-6,by+11+la,4,8,D); px(x+2,by+11+la2,4,8,D);
  px(x-6,by+18+la,4,3,'#9A7060'); px(x+2,by+18+la2,4,3,'#9A7060');
  const tw=Math.sin(t/150)*3;
  if(p.dir==='right'){ px(x-13,by-1,5,8,D); px(x-14,by-5+tw,4,6,C); px(x-14,by-8+tw,5,4,C); px(x-11,by-7+tw,4,3,C); }
  else { px(x+8,by-1,5,8,D); px(x+10,by-5+tw,4,6,C); px(x+9,by-8+tw,5,4,C); px(x+7,by-7+tw,4,3,C); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-7,by-14,14,13,C);
    if(facing){ px(x-4,by-11,8,6,W); }
    px(x-8,by-23,5,11,D); px(x-6,by-21,3,8,W);
    px(x+3,by-23,5,11,D); px(x+4,by-21,3,8,W);
    if(facing){
      px(x-4,by-10,3,3,K); px(x-3,by-10,1,1,'#fff');
      px(x+1,by-10,3,3,K); px(x+2,by-10,1,1,'#fff');
      px(x-3,by-6,7,4,W); px(x-2,by-8,4,3,K);
    } else { px(x-6,by-14,14,11,D); }
  } else if(p.dir==='right'){
    px(x-1,by-14,13,12,C); px(x-1,by-11,7,7,W);
    px(x+4,by-23,5,11,D); px(x+5,by-21,3,8,W);
    px(x+5,by-10,3,3,K); px(x+6,by-10,1,1,'#fff');
    px(x+7,by-7,8,4,W); px(x+13,by-7,3,3,K);
  } else {
    px(x-12,by-14,13,12,C); px(x-6,by-11,7,7,W);
    px(x-9,by-23,5,11,D); px(x-8,by-21,3,8,W);
    px(x-9,by-10,3,3,K); px(x-8,by-10,1,1,'#fff');
    px(x-19,by-7,8,4,W); px(x-19,by-7,3,3,K);
  }
}

function _drawCorgi(x,by,t,C,D,L,W,K,p){
  if(p.howling){
    px(x-11,by,22,11,C); px(x-7,by+3,14,7,W);
    px(x-7,by-14,14,15,C);
    px(x-9,by-23,7,11,D); px(x-7,by-21,4,8,'#FFBBAA');
    px(x+2,by-23,7,11,D); px(x+3,by-21,4,8,'#FFBBAA');
    px(x-3,by-6,7,5,W); px(x-2,by-8,4,3,K);
    const tw=Math.sin(t/80)*3;
    px(x+10,by+1+tw,5,6,W); px(x+11,by-1+tw,4,4,C);
    return;
  }
  px(x-11,by+1,22,10,C); px(x-7,by+4,14,6,W);
  const la=p.moving?Math.sin(t/140)*3:0,la2=p.moving?Math.sin(t/140+Math.PI)*3:0;
  px(x-7,by+11+la,5,6,D); px(x+2,by+11+la2,5,6,D);
  px(x-7,by+16+la,5,3,'#9A7060'); px(x+2,by+16+la2,5,3,'#9A7060');
  const tw=Math.sin(t/200)*2;
  if(p.dir==='right'){ px(x-15,by+1+tw,6,8,W); px(x-15,by-1+tw,5,6,L); }
  else { px(x+9,by+1+tw,6,8,W); px(x+10,by-1+tw,5,6,L); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-13,16,13,C);
    if(facing){ px(x-5,by-10,10,7,W); }
    px(x-9,by-24,7,13,D); px(x-7,by-22,4,10,'#FFBBAA');
    px(x+2,by-24,7,13,D); px(x+3,by-22,4,10,'#FFBBAA');
    if(facing){
      px(x-5,by-9,4,4,K); px(x-4,by-9,2,2,'#fff');
      px(x+1,by-9,4,4,K); px(x+2,by-9,2,2,'#fff');
      px(x-4,by-4,9,5,W); px(x-1,by-6,4,3,K);
    } else { px(x-7,by-13,15,11,D); }
  } else if(p.dir==='right'){
    px(x-1,by-13,13,12,C); px(x-1,by-10,9,7,W);
    px(x+3,by-24,7,13,D); px(x+4,by-22,4,10,'#FFBBAA');
    px(x+6,by-9,4,4,K); px(x+7,by-9,2,2,'#fff');
    px(x+7,by-5,9,5,W); px(x+14,by-5,4,3,K);
  } else {
    px(x-12,by-13,13,12,C); px(x-8,by-10,9,7,W);
    px(x-10,by-24,7,13,D); px(x-8,by-22,4,10,'#FFBBAA');
    px(x-10,by-9,4,4,K); px(x-9,by-9,2,2,'#fff');
    px(x-20,by-5,9,5,W); px(x-20,by-5,4,3,K);
  }
}

function _drawPoodle(x,by,t,C,D,L,W,K,p){
  const arc=(ax,ay,r,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(ax,ay,r,0,Math.PI*2);ctx.fill();};
  if(p.howling){
    arc(x,by+4,9,C);arc(x-5,by+7,5,C);arc(x+5,by+7,5,C);
    arc(x,by-13,7,C);arc(x-5,by-16,5,C);arc(x+5,by-16,5,C);
    arc(x-8,by-14,4,D);arc(x+8,by-14,4,D);
    px(x-2,by-8,5,3,K);px(x-1,by-10,3,3,K);
    const tw=Math.sin(t/70)*5;
    arc(x+10,by-2+tw,3,D);arc(x+12,by-4+tw,4,C);
    return;
  }
  arc(x,by+3,9,C);arc(x-5,by+6,5,C);arc(x+5,by+6,5,C);
  const la=p.moving?Math.sin(t/130)*4:0,la2=p.moving?Math.sin(t/130+Math.PI)*4:0;
  px(x-6,by+12+la,3,8,D);px(x+3,by+12+la2,3,8,D);
  arc(x-4,by+20+la,4,C);arc(x+5,by+20+la2,4,C);
  const tw=Math.sin(t/150)*4;
  if(p.dir==='right'){ arc(x-10,by-1+tw*0.5,3,D);arc(x-12,by-3+tw,4,C); }
  else { arc(x+10,by-1+tw*0.5,3,D);arc(x+12,by-3+tw,4,C); }
  arc(x,by-14,7,C);arc(x-5,by-17,5,C);arc(x+5,by-17,5,C);
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    arc(x-8,by-15,4,D);arc(x+8,by-15,4,D);
    if(facing){
      px(x-4,by-11,3,3,K);px(x-3,by-11,1,1,'#fff');
      px(x+1,by-11,3,3,K);px(x+2,by-11,1,1,'#fff');
      px(x-2,by-8,5,3,W);px(x-1,by-10,3,3,K);
    }
  } else if(p.dir==='right'){
    arc(x+8,by-15,4,D);
    px(x+5,by-11,3,3,K);px(x+6,by-11,1,1,'#fff');
    px(x+7,by-8,5,3,W);px(x+10,by-8,3,3,K);
  } else {
    arc(x-8,by-15,4,D);
    px(x-8,by-11,3,3,K);px(x-7,by-11,1,1,'#fff');
    px(x-12,by-8,5,3,W);px(x-12,by-8,3,3,K);
  }
}

function _drawDalmatian(x,by,t,C,D,L,W,K,p){
  const BASE='#F2EEE8',BSH='#D8D4CC';
  if(p.howling){
    px(x-10,by-2,20,14,BASE);px(x-6,by+4,12,8,W);
    px(x-7,by-16,14,16,BASE);
    px(x-10,by-22,7,10,BSH);px(x-8,by-20,4,7,W);
    px(x+3,by-22,7,10,BSH);px(x+5,by-20,4,7,W);
    px(x-4,by-8,8,5,W);px(x-2,by-5,4,2,'#AA2244');px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,BSH);px(x+10,by-6+tw,4,10,BASE);
    _dalSpots(x,by,C,true);return;
  }
  px(x-10,by,20,14,BASE);px(x-7,by+4,14,8,W);px(x-10,by+2,4,10,BSH);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,BSH);px(x-6,by+18+la,4,4,shade(BSH,-10));
  px(x+2,by+11+la2,5,9,BSH);px(x+3,by+18+la2,4,4,shade(BSH,-10));
  px(x-7,by+19+la,5,3,'#9A7060');px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,BSH);px(x-15,by+tw,4,8,BASE);px(x-15,by-2+tw,3,6,W); }
  else { px(x+9,by+2+tw*0.5,5,12,BSH);px(x+11,by+tw,4,8,BASE);px(x+12,by-2+tw,3,6,W); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,BASE);
    if(facing){px(x-5,by-12,10,6,W);}
    px(x-9,by-22,7,10,BSH);px(x-7,by-20,4,7,W);
    px(x+2,by-22,7,10,BSH);px(x+4,by-20,4,7,W);
    px(x-6,by-19,3,5,'#FFBBAA');px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K);px(x-4,by-11,2,2,'#4A3A2A');px(x-3,by-10,1,1,'#FFF');
      px(x+1,by-11,4,4,K);px(x+2,by-11,2,2,'#4A3A2A');px(x+3,by-10,1,1,'#FFF');
      px(x-4,by-6,8,5,W);px(x-2,by-7,5,4,K);
    } else {px(x-7,by-14,14,12,BSH);}
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,BASE);px(x-2,by-12,8,7,W);px(x+2,by-14,10,8,BSH);
    px(x+5,by-22,7,10,BSH);px(x+7,by-20,4,7,W);px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K);px(x+7,by-11,2,2,'#4A3A2A');px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,W);px(x+14,by-7,4,4,K);
  } else {
    px(x-12,by-14,14,13,BASE);px(x-6,by-12,8,7,W);px(x-12,by-14,10,8,BSH);
    px(x-12,by-22,7,10,BSH);px(x-11,by-20,4,7,W);px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K);px(x-10,by-11,2,2,'#4A3A2A');px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,W);px(x-20,by-7,4,4,K);
  }
  _dalSpots(x,by,C,false);
}

function _drawDinno(x,by,t,C,D,L,W,K,p){
  // Red/copper husky with distinctive white face mask — fixed real-dog colors
  const RC='#C07040', RD=shade(RC,-30), RL=shade(RC,40), RW='#F0EAD8';
  if(p.howling){
    px(x-10,by-2,20,14,RC); px(x-6,by+4,12,8,RW);
    px(x-7,by-16,14,16,RC); px(x-5,by-13,10,10,RW);
    px(x-10,by-22,7,10,RD); px(x-8,by-20,4,7,L);
    px(x+3,by-22,7,10,RD); px(x+5,by-20,4,7,L);
    px(x-4,by-8,8,5,RW); px(x-3,by-6,6,3,RC); px(x-2,by-5,4,2,'#AA2244');
    px(x-2,by-9,5,4,K); px(x-1,by-8,2,2,'#555');
    px(x-5,by-13,4,2,K); px(x+1,by-13,4,2,K);
    const tw=Math.sin(t/80)*6;
    px(x+8,by-8+tw,6,16,RD); px(x+10,by-6+tw,4,10,RC);
    px(x-8,by+10,6,8,RD); px(x+2,by+10,6,8,RD);
    return;
  }
  px(x-10,by,20,14,RC); px(x-7,by+4,14,8,RW); px(x-10,by+2,4,10,RD);
  const la=p.moving?Math.sin(t/130)*5:0,la2=p.moving?Math.sin(t/130+Math.PI)*5:0;
  px(x-7,by+11+la,5,9,RD); px(x-6,by+18+la,4,4,shade(RD,-10));
  px(x+2,by+11+la2,5,9,RD); px(x+3,by+18+la2,4,4,shade(RD,-10));
  px(x-7,by+19+la,5,3,'#9A7060'); px(x+2,by+19+la2,5,3,'#9A7060');
  const tw=Math.sin(t/160)*5;
  if(p.dir==='right'){ px(x-14,by+2+tw*0.5,5,12,RD); px(x-15,by+tw,4,8,RC); px(x-15,by-2+tw,3,6,RW); }
  else { px(x+9,by+2+tw*0.5,5,12,RD); px(x+11,by+tw,4,8,RC); px(x+12,by-2+tw,3,6,RW); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-8,by-14,16,14,RC);
    // white mask patch
    px(x-5,by-12,10,6,RW); px(x-4,by-9,8,4,RW);
    px(x-7,by-14,5,8,RD); px(x+2,by-14,5,8,RD);
    px(x-9,by-22,7,10,RD); px(x-7,by-20,4,7,L);
    px(x+2,by-22,7,10,RD); px(x+4,by-20,4,7,L);
    px(x-6,by-19,3,5,'#FFBBAA'); px(x+3,by-19,3,5,'#FFBBAA');
    if(facing){
      px(x-5,by-11,4,4,K); px(x-4,by-11,2,2,'#4A3A2A'); px(x-3,by-10,1,1,'#FFFFFF');
      px(x+1,by-11,4,4,K); px(x+2,by-11,2,2,'#4A3A2A'); px(x+3,by-10,1,1,'#FFFFFF');
      px(x-4,by-6,8,5,RW); px(x-2,by-4,5,3,L);
      px(x-2,by-7,5,4,K); px(x-1,by-6,2,2,'#444'); px(x,by-5,2,1,'#CC6688');
    } else { px(x-7,by-14,14,12,RD); px(x-5,by-16,10,6,RC); }
  } else if(p.dir==='right'){
    px(x-2,by-14,14,13,RC); px(x-2,by-12,8,7,RW); px(x+2,by-14,10,8,RD);
    px(x+5,by-22,7,10,RD); px(x+7,by-20,4,7,L); px(x+8,by-19,3,5,'#FFBBAA');
    px(x+6,by-11,4,4,K); px(x+7,by-11,2,2,'#4A3A2A'); px(x+8,by-10,1,1,'#FFF');
    px(x+8,by-7,8,5,RW); px(x+14,by-7,4,4,K); px(x+15,by-6,2,2,'#444');
  } else {
    px(x-12,by-14,14,13,RC); px(x-6,by-12,8,7,RW); px(x-12,by-14,10,8,RD);
    px(x-12,by-22,7,10,RD); px(x-11,by-20,4,7,L); px(x-11,by-19,3,5,'#FFBBAA');
    px(x-11,by-11,4,4,K); px(x-10,by-11,2,2,'#4A3A2A'); px(x-9,by-10,1,1,'#FFF');
    px(x-20,by-7,8,5,RW); px(x-20,by-7,4,4,K); px(x-19,by-6,2,2,'#444');
  }
}

function _drawLolla(x,by,t,C,D,L,W,K,p){
  // Sheltie/collie: tricolor — fixed real-dog colors, ignores player color
  const BC='#C07838', BD=shade(BC,-35), BWH='#F4EEE2', BLK='#2A2820';
  if(p.howling){
    px(x-9,by-1,18,13,BC); px(x-5,by+3,10,7,BWH);
    px(x-4,by-3,8,10,BLK);
    px(x-6,by-15,12,15,BC);
    px(x-8,by-23,5,10,BLK); px(x-6,by-21,3,7,BC);
    px(x+3,by-23,5,10,BLK); px(x+4,by-21,3,7,BC);
    px(x-8,by-5,4,10,BWH); px(x+4,by-5,4,10,BWH);
    px(x-3,by-7,7,5,BWH); px(x-2,by-9,4,3,K);
    const tw=Math.sin(t/70)*5;
    px(x+7,by-3+tw,5,10,BLK); px(x+9,by-7+tw,4,7,BC);
    return;
  }
  // body
  px(x-9,by,18,12,BC); px(x-5,by+3,10,7,BWH);
  px(x-4,by,8,8,BLK);
  // mane / chest fluff
  px(x-8,by-2,4,12,BWH); px(x+4,by-2,4,12,BWH);
  const la=p.moving?Math.sin(t/120)*4:0,la2=p.moving?Math.sin(t/120+Math.PI)*4:0;
  px(x-6,by+11+la,4,8,BD); px(x+2,by+11+la2,4,8,BD);
  px(x-6,by+18+la,4,3,'#9A7060'); px(x+2,by+18+la2,4,3,'#9A7060');
  // tail
  const tw=Math.sin(t/170)*4;
  if(p.dir==='right'){ px(x-13,by-1,5,10,BLK); px(x-14,by-5+tw,4,7,BC); px(x-14,by-8+tw,5,4,BWH); }
  else { px(x+8,by-1,5,10,BLK); px(x+10,by-5+tw,4,7,BC); px(x+9,by-8+tw,5,4,BWH); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-6,by-16,13,15,BC);
    px(x-4,by-16,9,8,BLK);
    if(facing){
      px(x-3,by-12,7,5,BWH);
    }
    px(x-8,by-25,5,11,BLK); px(x-6,by-23,3,8,BC);
    px(x+3,by-25,5,11,BLK); px(x+4,by-23,3,8,BC);
    px(x-8,by-5,4,12,BWH); px(x+4,by-5,4,12,BWH);
    if(facing){
      px(x-4,by-10,3,3,K); px(x-3,by-10,1,1,'#fff');
      px(x+1,by-10,3,3,K); px(x+2,by-10,1,1,'#fff');
      px(x-3,by-7,7,6,BWH); px(x-2,by-9,5,4,K);
      px(x-1,by-4,3,2,'#CC6688');
    } else { px(x-5,by-16,12,12,BLK); }
  } else if(p.dir==='right'){
    px(x-1,by-16,13,14,BC); px(x+1,by-16,9,8,BLK);
    px(x+3,by-12,7,5,BWH);
    px(x+4,by-25,5,11,BLK); px(x+5,by-23,3,8,BC);
    px(x+4,by-5,4,12,BWH);
    px(x+5,by-10,3,3,K); px(x+6,by-10,1,1,'#fff');
    px(x+7,by-7,9,5,BWH); px(x+13,by-7,4,4,K);
  } else {
    px(x-12,by-16,13,14,BC); px(x-10,by-16,9,8,BLK);
    px(x-10,by-12,7,5,BWH);
    px(x-9,by-25,5,11,BLK); px(x-8,by-23,3,8,BC);
    px(x-8,by-5,4,12,BWH);
    px(x-9,by-10,3,3,K); px(x-8,by-10,1,1,'#fff');
    px(x-20,by-7,9,5,BWH); px(x-20,by-7,4,4,K);
  }
}

function _dalSpots(x,by,C,howling){
  const spots=howling
    ?[[-3,0,4,4],[4,2,3,4],[-7,4,3,3],[5,-2,3,3],[-5,-12,3,3],[3,-11,4,3]]
    :[[-4,1,4,4],[3,3,3,4],[-7,4,3,3],[5,0,3,3],[-1,6,4,3],
      [-5,-13,3,3],[3,-12,4,3],[-6,-5,3,3],[2,-5,3,3],[-8,2,3,3]];
  ctx.fillStyle=C;
  spots.forEach(([rx,ry,rw,rh])=>ctx.fillRect(Math.round(x+rx),Math.round(by+ry),rw,rh));
}

