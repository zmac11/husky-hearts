// ====================== MAIN LOOP ======================
let lastTime=performance.now();
function loop(now){
  const dt=now-lastTime;lastTime=now;
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  // Update only while actively playing; keep drawing the frozen world behind any
  // open panel (pause / inventory / dialog) so the overlay sits over the last frame.
  const playing=Game.state===SCENES.PLAYING;
  // Keep drawing the frozen world behind any overlay that sits over live gameplay
  // (pause / inventory / dialog / game over / the brief win freeze).
  const s=Game.state;
  const showWorld=playing||s===SCENES.PAUSED||s===SCENES.INVENTORY||s===SCENES.DIALOG||s===SCENES.GAMEOVER||s===SCENES.WIN;
  if(playing){
    const c1=Input.CONTROLS.p1, c2=Input.CONTROLS.p2;
    updateCollectibles(now);
    Entities.updateAll(now,dt);
    // A fainted dog is frozen (a grave marks the spot) until the level ends.
    if(!p1.dead){updatePlayer(p1,c1,now,dt);tryCollect(p1);tryDeliver(p1,c1);tryInteract(p1,c1);}
    if(twoPlayer&&!p2.dead){updatePlayer(p2,c2,now,dt);tryCollect(p2);tryDeliver(p2,c2);tryInteract(p2,c2);}
    if(twoPlayer&&!p1.dead&&!p2.dead)checkGroupHowl();
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
    // Dogs + registry entities (enemies/NPCs/graves) share one painter's-algorithm pass
    // by y. Fainted dogs aren't drawn — their grave (a spawned entity) stands in for them.
    const actors=activePlayers.filter(p=>!p.dead).map(p=>({y:p.y, d:()=>drawDog(p,now)}));
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

