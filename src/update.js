// ====================== UPDATE ======================
function updatePlayer(p,controls,t,dt){
  let dx=0,dy=0;
  if(keys[controls.up])dy--;  if(keys[controls.down])dy++;
  if(keys[controls.left])dx--; if(keys[controls.right])dx++;
  p.moving=dx!==0||dy!==0;
  if(p.moving){
    const len=Math.hypot(dx,dy); dx/=len; dy/=len;
    const swimMul=(p.stats&&p.stats.swim)||0.5; // per-breed swim passive (data/breeds.js)
    const spd=p.swimming?p.speed*swimMul:p.speed;
    p.x+=dx*spd; p.y+=dy*spd;
    if(Math.abs(dx)>Math.abs(dy)) p.dir=dx>0?'right':'left';
    else p.dir=dy>0?'down':'up';
    p.animTimer+=dt;
    if(p.animTimer>160){p.animTimer=0;p.animFrame=1-p.animFrame;}
  }
  resolveCollisions(p);
  p.swimming=isInPond(p.x,p.y,p.swimming);
  if(typeof Health!=='undefined') Health.tick(p,dt);
  Abilities.update(p,controls,dt);
  if(keys[controls.action]&&!p.howling){p.howling=true;p.howlTimer=400;sfxHowl();}
  if(p.howling){p.howlTimer-=dt;if(p.howlTimer<=0)p.howling=false;}
}

function tryCollect(p){
  const now=performance.now();
  collectibles.forEach(item=>{
    if(item.taken)return;
    if(item.pickupAt && now<item.pickupAt) return;          // just-dropped: brief no-pickup window
    if(Math.hypot(p.x-item.x,p.y-item.y)<22){
      const qty=item.qty||1;
      if(Inventory.roomFor(p,item.type) < qty){             // full bag → leave it on the ground
        if(!p._invFullAt || now-p._invFullAt>2200){ showToast('🎒 Inventory full — make room to pick this up!',1600); p._invFullAt=now; }
        return;
      }
      item.taken=true;
      if(!item.dropped) p.treats++;                          // re-collecting a dropped item doesn't re-award a treat
      Inventory.add(p,item.type,qty);
      spawnSparkles(item.x,item.y,item.type==='fish'?'#4AC8FF':'#FFD93D',10);sfxCollect();updateHUD();
    }
  });
}

// Drop an item stack onto the ground just in front of the dog (used by the inventory
// drag-out gesture). Spawns a collectible the world can draw and the dog can re-collect.
function dropItemOnGround(p, id, qty){
  const def=Items.get(id); if(!def) return;
  const ang={up:-Math.PI/2,down:Math.PI/2,left:Math.PI,right:0}[p.dir];
  const a=(typeof ang==='number')?ang:Math.PI/2;
  const x=clamp(p.x+Math.cos(a)*26, 30, WORLD_W-30);
  const y=clamp(p.y+Math.sin(a)*26+6, 30, WORLD_H-30);
  collectibles.push({ x, y, type:id, qty:qty||1, taken:false, bob:rand(0,Math.PI*2),
    dropped:true, icon:def.icon, pickupAt:performance.now()+950 });
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

// Interact with the nearest interactable entity (NPC) on an action-key press.
// Edge-triggered per player so a held key fires once.
function tryInteract(p,controls){
  const pressed=!!keys[controls.action];
  if(pressed && !p._actionPrev) Entities.interact(p);
  p._actionPrev=pressed;
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

// updateHUD() now lives in ui.js (UI.updateHUD) — kept as a global for existing callers.

function checkWin(){
  // Already handled this completion (frozen behind the world map / victory overlay).
  if(Game.state===SCENES.WORLDMAP || Game.state===SCENES.WIN) return;
  // Completion is defined by the current level's quest (falls back to the cheer count).
  const lvl=LevelManager.current;
  const q=lvl&&lvl.quest;
  const done=q?q.isComplete():cheeredCount>=CHEER_TOTAL;
  if(!done) return;
  sfxWin();
  // Freeze the world, then reveal the campaign world map so you can see your progress
  // and continue to the next level (WorldMap handles "no more content yet" gracefully).
  Game.state=SCENES.WORLDMAP;
  setTimeout(()=>{ if(typeof WorldMap!=='undefined') WorldMap.showAfter(lvl.id); }, 700);
}

