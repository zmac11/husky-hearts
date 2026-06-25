// ====================== UPDATE ======================
function updatePlayer(p,controls,t,dt){
  let dx=0,dy=0;
  if(keys[controls.up])dy--;  if(keys[controls.down])dy++;
  if(keys[controls.left])dx--; if(keys[controls.right])dx++;
  p.moving=dx!==0||dy!==0;
  if(p.moving){
    const len=Math.hypot(dx,dy); dx/=len; dy/=len;
    p.x+=dx*p.speed; p.y+=dy*p.speed;
    if(Math.abs(dx)>Math.abs(dy)) p.dir=dx>0?'right':'left';
    else p.dir=dy>0?'down':'up';
    p.animTimer+=dt;
    if(p.animTimer>160){p.animTimer=0;p.animFrame=1-p.animFrame;}
  }
  resolveCollisions(p);
  if(keys[controls.action]&&!p.howling){p.howling=true;p.howlTimer=400;sfxHowl();}
  if(p.howling){p.howlTimer-=dt;if(p.howlTimer<=0)p.howling=false;}
}

function tryCollect(p){
  collectibles.forEach(item=>{
    if(item.taken)return;
    if(Math.hypot(p.x-item.x,p.y-item.y)<22){
      item.taken=true;p.treats++;spawnSparkles(item.x,item.y,'#FFD93D',10);sfxCollect();updateHUD();
    }
  });
}

function tryDeliver(p,controls){
  if(!keys[controls.action])return;
  friends.forEach(f=>{
    if(f.cheered)return;
    if(Math.hypot(p.x-f.x,p.y-f.y)<44&&p.treats>0){
      const give=Math.min(p.treats,f.need-f.given);
      if(give>0){
        p.treats-=give;f.given+=give;
        spawnSparkles(f.x,f.y-10,'#FF8FA3',8);updateHUD();
        if(f.given>=f.need){
          f.cheered=true;cheeredCount++;
          spawnSparkles(f.x,f.y-10,'#FFD93D',30);sfxCheer();
          showToast(`${f.name} is so happy now! 🎉`);updateHUD();checkWin();
        } else {
          sfxDeliver();showToast(`${f.name}: "${f.msg}"`,1800);
        }
      }
    }
  });
}

function checkGroupHowl(){
  if(!twoPlayer)return;
  if(Math.hypot(p1.x-p2.x,p1.y-p2.y)<55&&p1.howling&&p2.howling){
    if(!checkGroupHowl.last||performance.now()-checkGroupHowl.last>1500){
      checkGroupHowl.last=performance.now();
      for(let i=0;i<4;i++)spawnSparkles(rand(80,WORLD_W-80),rand(80,WORLD_H-80),'#C9A6FF',14);
      showToast('✨ A magical synchronized howl! ✨',2000);
    }
  }
}

function updateSparkles(){
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=0.06;s.life--;});
}

function updateHUD(){
  document.getElementById('p1count').textContent=p1.treats;
  document.getElementById('p2count').textContent=p2.treats;
  document.getElementById('cheerCount').textContent=cheeredCount;
}

function checkWin(){
  if(cheeredCount>=CHEER_TOTAL){sfxWin();setTimeout(()=>{document.getElementById('winScreen').style.display='flex';},700);}
}

