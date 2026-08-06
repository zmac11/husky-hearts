// ====================== MAIN LOOP ======================
let lastTime=performance.now();
function loop(now){
  // Clamp dt so a background-tab stall (huge gap) can't teleport actors through
  // colliders; also feeds the frame-rate-independent movement scale (see core/state.js).
  const dt=Math.min(now-lastTime,50);lastTime=now;
  dtScale=dt/FRAME_MS;
  if(typeof DevMode!=='undefined' && DevMode.timeScale) dtScale*=DevMode.timeScale;   // dev slow-mo/fast
  // Base transform: map logical VIEW_W×VIEW_H onto the device-resolution backing store
  // so all downstream draws (which save/translate/scale relative to this) render crisply.
  ctx.setTransform(renderScale,0,0,renderScale,0,0);
  ctx.clearRect(0,0,VIEW_W,VIEW_H);
  // Update only while actively playing; keep drawing the frozen world behind any
  // open panel (pause / inventory / dialog) so the overlay sits over the last frame.
  // A first-time tip modal (tips.js) freezes gameplay so the player can read it, even if
  // it popped mid-combat — but the world keeps DRAWING behind it (frozen on the last frame).
  const tipUp=(typeof Tips!=='undefined' && Tips.active);
  let playing=Game.state===SCENES.PLAYING && !tipUp;
  // Dev pause: freeze the update block; a queued Step advances exactly one frame.
  if(typeof DevMode!=='undefined' && DevMode.paused){ playing = playing && DevMode._step; DevMode._step=false; }
  // Keep drawing the frozen world behind any overlay that sits over live gameplay
  // (pause / inventory / dialog / game over / the brief win freeze / a tip).
  const s=Game.state;
  const showWorld=s===SCENES.PLAYING||s===SCENES.PAUSED||s===SCENES.INVENTORY||s===SCENES.DIALOG||s===SCENES.GAMEOVER||s===SCENES.WIN||s===SCENES.WORLDMAP;
  if(playing){
    updateCollectibles(now);
    Entities.updateAll(now,dt);
    // A fainted dog is frozen (a grave marks the spot) until the level ends.
    if(!p1.dead){updatePlayer(p1,now,dt);tryCollect(p1);tryDeliver(p1);tryInteract(p1);}
    updateSparkles();updateXpOrbs(p1);updateFloaters();updateCamera();
    UI.tickCooldowns();   // hotbar ability cooldown sweep
  }
  if(showWorld){
    ctx.save();ctx.translate(-cam.x,-cam.y);
    drawWorld(now);
    // howl sound-rings sit flat on the ground, under every actor
    if(!p1.dead) drawHowlRings(p1,now);
    // river bridges draw above swimmers passing underneath, but below anyone walking across the deck
    const activePlayers=[p1];
    const riverBridges=worldObjects.filter(o=>o.kind==='riverbridge');
    const deckBridges=riverBridges.filter(o=>activePlayers.some(p=>!p.swimming&&isOnSpecificBridge(o,p.x,p.y)));
    deckBridges.forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    Abilities.drawWorld(now);
    collectibles.forEach(item=>drawCollectible(item,now));
    friends.forEach(f=>drawFriend(f,now));
    // Dogs + registry entities (enemies/NPCs/graves) share one painter's-algorithm pass
    // by y. Fainted dogs aren't drawn — their grave (a spawned entity) stands in for them.
    const actors=activePlayers.filter(p=>!p.dead).map(p=>({y:p.y, d:()=>drawDog(p,now)}));
    entities.forEach(e=>{ const def=Entities.def(e.kind); if(!def||!def.draw) return;
      actors.push({y:e.y, d:()=>{
        if(e.swimming && !e.aquatic) drawSwimming(Math.round(e.x), Math.round(e.y), now, ()=>def.draw(e,now));  // land creature submerged like the dog
        else { if(e.swimming) drawWaterRipple(e.x,e.y,now); def.draw(e,now); }                                 // aquatic bird floats with a light wake
      }}); });
    actors.sort((a,b)=>a.y-b.y).forEach(a=>a.d());
    riverBridges.filter(o=>!deckBridges.includes(o)).forEach(o=>drawBridge(o.x,o.y,o.horizontal,now,'stone',o.span));
    drawSparkles();drawXpOrbs(now);drawFloaters(now);
    ctx.restore();
    // Darkness overlay (Whispering Woods): dims everything but your pool of light. Drawn in
    // screen space over the world, under the minimap HUD.
    if(typeof Darkness!=='undefined') Darkness.render(ctx, cam);
    drawMinimap();
    if(typeof DevMode!=='undefined' && DevMode.debug) DevMode.drawDebug(now);   // hitboxes + FPS/HUD
  }
  requestAnimationFrame(loop);
}

// Build the initial level (world objects + entities + themed ground), then start loop.
LevelManager.load(Levels.first().id);
requestAnimationFrame(loop);

