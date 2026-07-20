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
  const breed=p.breed||'dinno';
  const small=breed==='tapka';   // tiny breeds get a smaller shadow + lower name tag

  if(!p.swimming){
    ctx.globalAlpha=0.2; ctx.beginPath(); ctx.ellipse(x,y+16,small?10:14,small?4:5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;
  }

  if(p.swimming){
    // clip to upper portion only — waterline sits at by+2
    ctx.save();
    ctx.beginPath();
    ctx.rect(x-32, by-42, 64, 44);
    ctx.clip();
  }

  // Worn back-layer items (capes) sit behind the breed sprite.
  const _wa = (typeof Wearables!=='undefined' && p.equipment) ? Wearables.anchor(x, by, p.dir, p.equipment, t, breed) : null;
  if(_wa) Wearables.drawBack(ctx, _wa);

  if(breed==='lolla') _drawLolla(x,by,t,C,D,L,W,K,p);
  else if(breed==='tapka') _drawTapka(x,by,t,C,D,L,W,K,p);
  else _drawDinno(x,by,t,C,D,L,W,K,p);

  // Worn front-layer items (hat, scarf, coat, shades) sit on top of the breed sprite.
  if(_wa) Wearables.drawFront(ctx, _wa);

  // Howling: sound-wave arcs rippling up from the muzzle (the pose points skyward).
  if(p.howling){
    const prog=1-(p.howlTimer/400);
    ctx.save();
    ctx.lineWidth=1.5; ctx.strokeStyle='#FFF3D8'; ctx.lineCap='round';
    for(let i=0;i<3;i++){
      const ph=(prog*1.4+i/3)%1;
      ctx.globalAlpha=0.85*(1-ph);
      ctx.beginPath(); ctx.arc(x, by-(small?20:26), 5+ph*13, -Math.PI*0.78, -Math.PI*0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Piercing Scream (Lolla): pink sound-wave arcs bursting sideways from the muzzle.
  if(p.screamT>0){
    ctx.save();
    ctx.lineWidth=2; ctx.strokeStyle='#FF9ED2'; ctx.lineCap='round';
    const dirA = p.dir==='left' ? Math.PI : 0;   // arcs face the way she's looking
    for(let i=0;i<3;i++){
      const ph=((t/300)+i/3)%1;
      ctx.globalAlpha=0.8*(1-ph);
      ctx.beginPath(); ctx.arc(x, by-8, 6+ph*16, dirA-Math.PI*0.35, dirA+Math.PI*0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Active-ability overlay drawn on the dog (e.g. Lolla's ball in mouth)
  Abilities.drawOnDog(p,x,by);

  // Brief red flash when the dog takes damage (Health.damage sets hurtTimer).
  if(p.hurtTimer>0){
    ctx.globalAlpha=Math.min(0.5, p.hurtTimer/520);
    px(x-13,by-26,26,42,'#FF3B3B');
    ctx.globalAlpha=1;
  }

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

  ctx.fillStyle='rgba(255,248,239,0.88)'; roundRect(x-11,by-(small?32:34),22,11,3,true,false);
  ctx.fillStyle='#4A3F35'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
  ctx.fillText(`P${p.id}`,x,by-(small?23:25));
  ctx.restore();
}

function _drawDinno(x,by,t,C,D,L,W,K,p){
  // Red/copper husky with distinctive white face mask — fixed real-dog colors.
  // Storm Fang (p.wolfT>0) swaps the coat to storm-grey with glowing eyes + sparks.
  const storm=p.wolfT>0;
  const RC=storm?'#5A6470':'#C07040', RD=storm?'#3A424E':shade('#C07040',-30),
        RL=storm?'#7A879A':shade('#C07040',40), RW=storm?'#C8D4E4':'#F0EAD8';
  if(storm) K='#7FD4FF';               // eyes (and nose) glow electric blue
  if(storm){
    // crackling spark flecks around the body
    for(let i=0;i<4;i++){
      const a=t/150+i*1.7;
      const sx=x+Math.cos(a)*(11+(i%2)*4), sy=by-8+Math.sin(a*1.4)*11;
      if(Math.floor(t/110+i)%3===0){ ctx.fillStyle=i%2?'#7FD4FF':'#FFFFFF'; ctx.fillRect(Math.round(sx),Math.round(sy),2,2); }
    }
  }
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

// Expanding "sound rings" on the ground for the whole howl-echo window (p.noiseT,
// set to HOWL_NOISE_MS at howl start) — visualises exactly how long enemies hear the
// dog from 1.5× as far. Ring reach scales with the dog's current loudness, so Lolla's
// howl visibly rings wider than Ťapka's. Drawn under everything (see main.js).
function drawHowlRings(p,t){
  if(!p || p.dead || !(p.noiseT>0)) return;
  const prog=1-(p.noiseT/HOWL_NOISE_MS);   // 0→1 over the echo window
  const loud=(typeof Entities!=='undefined'&&Entities.noiseFactor)?Entities.noiseFactor(p):1;
  const maxR=60*loud;
  ctx.save();
  ctx.lineWidth=2;
  for(let i=0;i<3;i++){
    const ph=(prog*1.6+i/3)%1;
    ctx.globalAlpha=0.38*(1-ph)*(p.noiseT<200?p.noiseT/200:1);   // fade the tail end
    ctx.beginPath(); ctx.ellipse(p.x, p.y+10, 8+ph*maxR, (8+ph*maxR)*0.45, 0, 0, Math.PI*2);
    ctx.strokeStyle='#C9A6FF'; ctx.stroke();
  }
  ctx.restore();
}

function _drawTapka(x,by,t,C,D,L,W,K,p){
  // Prague Ratter: tiny fawn dog, oversized upright ears, big dark eyes and a
  // greying muzzle — fixed real-dog colors, ignores player color. Drawn smaller
  // than every other breed (she's a featherweight).
  // Inner Monster (p.monsterT>0) swaps to a dark reddish feral coat with red glowing eyes.
  const monster=p.monsterT>0;
  const TC=monster?'#7A4A42':'#B5854F', TD=monster?'#4E2E2A':shade('#B5854F',-32), TL=shade('#B5854F',38);
  const TG=monster?'#A98A82':'#D9CFC0';   // greying muzzle / light chest
  const PK=monster?'#A83A2E':'#D8A090';   // ear inner
  if(monster){
    K='#FF2015';                          // eyes + nose glow red
    for(let i=0;i<4;i++){                 // red spark flecks around the body
      const a=t/140+i*1.6;
      const sx=x+Math.cos(a)*(9+(i%2)*4), sy=by-6+Math.sin(a*1.4)*10;
      if(Math.floor(t/100+i)%3===0){ ctx.fillStyle=i%2?'#FF5030':'#FFC0B0'; ctx.fillRect(Math.round(sx),Math.round(sy),2,2); }
    }
  }
  if(p.howling){
    // tiny sit-back howl, muzzle to the sky
    px(x-7,by+1,14,10,TC); px(x-4,by+4,8,6,TG);
    px(x-5,by-11,10,13,TC);
    px(x-9,by-20,6,11,TD); px(x-8,by-18,4,7,PK);
    px(x+3,by-20,6,11,TD); px(x+4,by-18,4,7,PK);
    px(x-3,by-5,6,4,TG); px(x-2,by-8,4,3,K);
    const tw=Math.sin(t/70)*4;
    px(x+6,by-1+tw,4,8,TD); px(x+7,by-4+tw,3,6,TC);
    px(x-6,by+9,3,6,TD); px(x+3,by+9,3,6,TD);
    return;
  }
  // body — small and slim
  px(x-7,by+2,14,9,TC); px(x-4,by+5,8,5,TG);
  const la=p.moving?Math.sin(t/110)*3:0,la2=p.moving?Math.sin(t/110+Math.PI)*3:0;
  px(x-5,by+10+la,3,6,TD); px(x+2,by+10+la2,3,6,TD);   // thin little legs
  px(x-5,by+15+la,3,2,'#9A7060'); px(x+2,by+15+la2,3,2,'#9A7060');
  // thin whippy tail
  const tw=Math.sin(t/140)*3;
  if(p.dir==='right'){ px(x-10,by+2,4,7,TD); px(x-12,by-2+tw,3,6,TC); }
  else { px(x+6,by+2,4,7,TD); px(x+9,by-2+tw,3,6,TC); }
  if(p.dir==='down'||p.dir==='up'){
    const facing=p.dir==='down';
    px(x-6,by-10,12,12,TC);                              // small head
    // oversized upright ears, set wide
    px(x-9,by-21,6,12,TD); px(x-8,by-19,4,8,PK);
    px(x+3,by-21,6,12,TD); px(x+4,by-19,4,8,PK);
    if(facing){
      px(x-4,by-4,8,5,TG);                               // greying muzzle
      px(x-4,by-8,3,3,K); px(x-3,by-8,1,1,'#fff');       // big dark eyes
      px(x+1,by-8,3,3,K); px(x+2,by-8,1,1,'#fff');
      px(x-1,by-4,3,3,K);                                // dark button nose
    } else { px(x-5,by-10,10,10,TD); }
  } else if(p.dir==='right'){
    px(x-2,by-10,11,11,TC);
    px(x-1,by-20,5,11,TD);                               // back ear
    px(x+3,by-21,6,12,TD); px(x+4,by-19,4,8,PK);         // front ear
    px(x+3,by-8,3,3,K); px(x+4,by-8,1,1,'#fff');
    px(x+5,by-5,6,4,TG); px(x+9,by-5,3,3,K);
  } else {
    px(x-9,by-10,11,11,TC);
    px(x-4,by-20,5,11,TD);
    px(x-9,by-21,6,12,TD); px(x-8,by-19,4,8,PK);
    px(x-6,by-8,3,3,K); px(x-5,by-8,1,1,'#fff');
    px(x-11,by-5,6,4,TG); px(x-12,by-5,3,3,K);
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



