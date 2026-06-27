// ====================== MAIN LOOP ======================
let lastTime=performance.now();
function loop(now){
  const dt=now-lastTime;lastTime=now;
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  if(gameStarted){
    const c1={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',action:'Space'};
    const c2={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',action:'Enter'};
    updatePlayer(p1,c1,now,dt);tryCollect(p1);tryDeliver(p1,c1);
    if(twoPlayer){updatePlayer(p2,c2,now,dt);tryCollect(p2);tryDeliver(p2,c2);checkGroupHowl();}
    updateSparkles();updateCamera();
    ctx.save();ctx.translate(-cam.x,-cam.y);
    drawWorld(now);
    drawLollaCannon(now);
    drawLollaBall(now);
    collectibles.forEach(item=>drawCollectible(item,now));
    friends.forEach(f=>drawFriend(f,now));
    [...(twoPlayer?[p1,p2]:[p1])].sort((a,b)=>a.y-b.y).forEach(p=>drawDog(p,now));
    drawSparkles();
    ctx.restore();
    drawMinimap();
  }
  requestAnimationFrame(loop);
}

// Pre-build ground canvas, then start loop
buildGroundCanvas();
requestAnimationFrame(loop);

