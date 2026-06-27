// ====================== LOLLA SPECIAL: TENNIS BALL + CANNON ======================

let lollaBall   = null;
let lollaCannon = null;  // { x, y, angle, firingT, smoke[] }
let _lollaDropHeld = false;

function getLollaPlayer(){
  if(p1 && p1.breed==='lolla') return p1;
  if(typeof twoPlayer!=='undefined' && twoPlayer && p2 && p2.breed==='lolla') return p2;
  return null;
}

function spawnLollaItems(){
  lollaBall=null; lollaCannon=null;
  const lolla=getLollaPlayer();
  if(!lolla) return;

  let bx,by;
  do{ bx=rand(200,WORLD_W-200); by=rand(200,WORLD_H-200); }
  while(Math.hypot(bx-lolla.x,by-lolla.y)<160 || isInPond(bx,by));

  lollaBall={ x:bx, y:by, state:'idle', carrier:null,
              startX:bx, startY:by, landX:bx, landY:by,
              flightProgress:0, flightDuration:1500 };

  let cx,cy;
  do{ cx=rand(250,WORLD_W-250); cy=rand(250,WORLD_H-250); }
  while(Math.hypot(cx-bx,cy-by)<220 || Math.hypot(cx-lolla.x,cy-lolla.y)<180 || isInPond(cx,cy));

  lollaCannon={ x:cx, y:cy, angle:Math.random()*Math.PI*2, firingT:0, smoke:[] };
}

function updateLollaBall(p, controls, dt){
  if(!lollaBall || !lollaCannon) return false;
  const lolla=getLollaPlayer();
  if(!lolla || lolla.id!==p.id) return false;

  const ball=lollaBall;
  const cannon=lollaCannon;
  const dropKey = lolla.id===1 ? 'KeyQ' : 'Period';

  // Advance cannon animation
  if(cannon.firingT>0){
    cannon.firingT=Math.max(0, cannon.firingT-dt);
    cannon.smoke.forEach(s=>{ s.x+=s.vx; s.y+=s.vy; s.vy-=0.04; s.life-=dt; s.r+=0.04; });
    cannon.smoke=cannon.smoke.filter(s=>s.life>0);
  }

  if(ball.state==='idle'){
    if(Math.hypot(p.x-ball.x, p.y-ball.y)<22){
      ball.state='held'; ball.carrier=p.id;
      showToast('🎾 Ball! [Q] near cannon to fire · [Q] elsewhere to drop',2800);
    }
  }

  if(ball.state==='held' && ball.carrier===p.id){
    ball.x=p.x; ball.y=p.y;

    if(keys[dropKey] && !_lollaDropHeld){
      _lollaDropHeld=true;
      const nearCannon=Math.hypot(p.x-cannon.x, p.y-cannon.y)<48;
      if(nearCannon){
        _fireBallCannon();
        showToast('💥 Fired! Go fetch!',1600);
        sfxCollect();
      } else {
        const ox=p.dir==='right'?14:p.dir==='left'?-14:0;
        const oy=p.dir==='down'?12:p.dir==='up'?-12:0;
        ball.x=clamp(p.x+ox,60,WORLD_W-60);
        ball.y=clamp(p.y+oy,60,WORLD_H-60);
        ball.state='idle'; ball.carrier=null;
      }
    }
    if(!keys[dropKey]) _lollaDropHeld=false;
  }

  if(ball.state==='flying'){
    ball.flightProgress+=dt/ball.flightDuration;
    if(ball.flightProgress>=1){
      ball.flightProgress=1;
      ball.x=ball.landX; ball.y=ball.landY;
      ball.state='idle'; ball.carrier=null;
      spawnSparkles(ball.x,ball.y,'#B5E853',8);
      showToast('🎾 Fetch!',1200);
    } else {
      ball.x=ball.startX+(ball.landX-ball.startX)*ball.flightProgress;
      ball.y=ball.startY+(ball.landY-ball.startY)*ball.flightProgress;
    }
  }

  return false;
}

function _fireBallCannon(){
  const ball=lollaBall; const cannon=lollaCannon;

  // New random direction every shot
  cannon.angle=Math.random()*Math.PI*2;

  const dist=300+rand(0,120);
  ball.startX=cannon.x; ball.startY=cannon.y;
  ball.landX=clamp(cannon.x+Math.cos(cannon.angle)*dist, 80, WORLD_W-80);
  ball.landY=clamp(cannon.y+Math.sin(cannon.angle)*dist, 80, WORLD_H-80);
  ball.flightProgress=0; ball.state='flying'; ball.carrier=null;
  ball.x=cannon.x; ball.y=cannon.y;

  // Trigger animation
  cannon.firingT=500; // ms total animation

  // Spawn smoke puffs from barrel tip
  const tipX=cannon.x+Math.cos(cannon.angle)*35;
  const tipY=cannon.y+Math.sin(cannon.angle)*35;
  for(let i=0;i<6;i++){
    cannon.smoke.push({
      x:tipX+rand(-3,3), y:tipY+rand(-3,3),
      vx:Math.cos(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3),
      vy:Math.sin(cannon.angle)*rand(0.4,1.2)+rand(-0.3,0.3)-0.3,
      r:rand(3,6), life:rand(280,500),
      col:Math.random()<0.5?'#CCCCCC':'#AAAAAA'
    });
  }
}

// ---- Drawing ----

function drawLollaBall(t){
  if(!lollaBall || lollaBall.state==='held') return;
  const ball=lollaBall;
  const flightH=ball.state==='flying'
    ? Math.sin(ball.flightProgress*Math.PI)*50 : 0;
  const bx=Math.round(ball.x), by=Math.round(ball.y);
  const visualY=by-flightH;

  // shadow shrinks/fades with height
  ctx.globalAlpha=Math.max(0.04, 0.3*(1-flightH/60));
  ctx.beginPath();
  ctx.ellipse(bx, by, Math.max(2,7-flightH*0.06), Math.max(1,3-flightH*0.03), 0,0,Math.PI*2);
  ctx.fillStyle='#1A2A1A'; ctx.fill();
  ctx.globalAlpha=1;

  // tennis ball
  ctx.fillStyle='#B5E853';
  ctx.beginPath(); ctx.arc(bx, visualY, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#CCFF77';
  ctx.beginPath(); ctx.arc(bx-1, visualY-1, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(bx, visualY, 5, 0.35, Math.PI-0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, visualY, 5, Math.PI+0.35, Math.PI*2-0.35); ctx.stroke();

  if(ball.state==='flying'){
    const spin=ball.flightProgress*Math.PI*6;
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(bx, visualY, 5, spin, spin+Math.PI); ctx.stroke();
  }
}

function drawLollaCannon(t){
  if(!lollaCannon) return;
  const cannon=lollaCannon;
  const cx=Math.round(cannon.x), cy=Math.round(cannon.y);

  // Idle bob (stops during firing)
  const bob=cannon.firingT>0 ? 0 : Math.sin(t/700)*1;

  // --- Smoke particles (drawn before cannon body so cannon is on top) ---
  cannon.smoke.forEach(s=>{
    const a=Math.max(0, (s.life/400)*0.55);
    ctx.globalAlpha=a;
    ctx.fillStyle=s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;

  ctx.save();
  ctx.translate(cx, cy+bob);

  // shadow
  ctx.globalAlpha=0.18;
  ctx.beginPath(); ctx.ellipse(2,8,18,7,0,0,Math.PI*2);
  ctx.fillStyle='#1A2A1A'; ctx.fill();
  ctx.globalAlpha=1;

  // base platform
  ctx.fillStyle='#6B4C2A'; ctx.fillRect(-16,2,32,8);
  ctx.fillStyle='#7A5830'; ctx.fillRect(-14,0,28,6);
  [-10,10].forEach(wx=>{
    ctx.fillStyle='#4A3018'; ctx.beginPath(); ctx.arc(wx,6,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#7A5830'; ctx.beginPath(); ctx.arc(wx,6,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#AA8850'; ctx.beginPath(); ctx.arc(wx,6,1,0,Math.PI*2); ctx.fill();
  });

  // barrel with recoil
  ctx.rotate(cannon.angle);
  // firingT: 500→400 = recoil back, 400→300 = return, 300→0 = settled
  let recoil=0;
  if(cannon.firingT>400){
    recoil=((500-cannon.firingT)/100)*8; // 0→8 px back
  } else if(cannon.firingT>300){
    recoil=((cannon.firingT-300)/100)*8; // 8→0 px back
  }

  ctx.fillStyle='#4A4A4A';
  ctx.beginPath(); ctx.roundRect(4-recoil,-5,28,10,3); ctx.fill();
  ctx.fillStyle='#666';
  ctx.fillRect(6-recoil,-3,24,6);
  ctx.fillStyle='#FFD700';
  ctx.fillRect(14-recoil,-3,4,6);
  ctx.fillStyle='#2A2A2A'; ctx.fillRect(30-recoil,-6,5,12);
  ctx.fillStyle='#555';   ctx.fillRect(31-recoil,-5,3,10);

  // muzzle flash when just fired (firingT 500→400)
  if(cannon.firingT>400){
    const flashA=(cannon.firingT-400)/100;
    ctx.globalAlpha=flashA*0.9;
    const tipX=35-recoil;
    // outer glow
    ctx.fillStyle='#FFAA00';
    ctx.beginPath(); ctx.arc(tipX,0,10,0,Math.PI*2); ctx.fill();
    // inner bright core
    ctx.fillStyle='#FFFFFF';
    ctx.beginPath(); ctx.arc(tipX,0,5,0,Math.PI*2); ctx.fill();
    // star rays
    ctx.strokeStyle='#FFDD00'; ctx.lineWidth=2;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      ctx.beginPath();
      ctx.moveTo(tipX+Math.cos(a)*5, Math.sin(a)*5);
      ctx.lineTo(tipX+Math.cos(a)*13, Math.sin(a)*13);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  ctx.restore();

  // label (unaffected by rotation)
  ctx.fillStyle='rgba(255,248,220,0.88)';
  roundRect(cx-30,cy+bob-32,60,13,3,true,false);
  ctx.fillStyle='#4A3F35';
  ctx.font='bold 7px monospace'; ctx.textAlign='center';
  ctx.fillText('BALL CANNON',cx,cy+bob-22);
}

function drawBallInMouth(x, by, dir){
  let bx, bly;
  if(dir==='right')     { bx=x+18; bly=by-8; }
  else if(dir==='left') { bx=x-18; bly=by-8; }
  else if(dir==='down') { bx=x+1;  bly=by-4; }
  else return;

  ctx.fillStyle='#B5E853';
  ctx.beginPath(); ctx.arc(bx,bly,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#CCFF77';
  ctx.beginPath(); ctx.arc(bx-1,bly-1,2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(bx,bly,4,0.35,Math.PI-0.35); ctx.stroke();
}
