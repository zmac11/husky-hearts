// ====================== MAIN LOOP ======================
let lastTime=performance.now();
function loop(now){
  const dt=now-lastTime;lastTime=now;
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  // Update only while actively playing; keep drawing the frozen world behind any
  // open panel (pause / inventory / dialog) so the overlay sits over the last frame.
  const playing=Game.state===SCENES.PLAYING;
  const showWorld=playing||Game.state===SCENES.PAUSED||Game.state===SCENES.INVENTORY||Game.state===SCENES.DIALOG;
  if(playing){
    const c1=Input.CONTROLS.p1, c2=Input.CONTROLS.p2;
    updateCollectibles(now);
    Entities.updateAll(now,dt);
    updatePlayer(p1,c1,now,dt);tryCollect(p1);tryDeliver(p1,c1);tryInteract(p1,c1);
    if(twoPlayer){updatePlayer(p2,c2,now,dt);tryCollect(p2);tryDeliver(p2,c2);tryInteract(p2,c2);checkGroupHowl();}
    updateSparkles();updateCamera();
  }
  if(showWorld){
    ctx.save();ctx.translate(-cam.x,-cam.y);
    drawWorld(now);
    // river bridges draw above swimmers passing underneath, but below anyone walking across the deck
    const activePlayers=twoPlayer?[p1,p2]:[p1];
    const riverBridges=worldObjects.filter(o=>o.kind==='riverbridge');
    const deckBridges=riverBridges.filter(o=>activePlayers.some(p=>!p.swimming&&isOnSpecificBridge(o,p.x,p.y)));
    deckBridges.forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    Abilities.drawWorld(now);
    collectibles.forEach(item=>drawCollectible(item,now));
    friends.forEach(f=>drawFriend(f,now));
    // Dogs + registry entities (enemies/NPCs) share one painter's-algorithm pass by y.
    const actors=activePlayers.map(p=>({y:p.y, d:()=>drawDog(p,now)}));
    entities.forEach(e=>{ const def=Entities.def(e.kind); if(def&&def.draw) actors.push({y:e.y, d:()=>def.draw(e,now)}); });
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.d());
    riverBridges.filter(o=>!deckBridges.includes(o)).forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    drawSparkles();
    ctx.restore();
    drawMinimap();
  }
  requestAnimationFrame(loop);
}

// Build the initial level (world objects + entities + themed ground), then start loop.
LevelManager.load(Levels.first().id);
requestAnimationFrame(loop);

