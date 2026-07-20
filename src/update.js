// ====================== UPDATE ======================
// A howl is LOUD: the noise boost (see Entities.noiseFactor) lasts this long from the
// start of the howl — a little past the howl pose itself, like an echo. The expanding
// sound rings (drawHowlRings) visualise exactly this window.
const HOWL_NOISE_MS=1000;

function updatePlayer(p,t,dt){
  let dx=0,dy=0;
  if(Input.held('up'))dy--;  if(Input.held('down'))dy++;
  if(Input.held('left'))dx--; if(Input.held('right'))dx++;
  p.moving=dx!==0||dy!==0;
  // Compose active abilities' speed multipliers (each returns 1 while inactive):
  // Storm Fang, Inner Monster, Scurry's landing burst all contribute here.
  let spdMul=1;
  if(typeof Abilities!=='undefined'){
    (p.abilities||[]).forEach(id=>{ const d=Abilities.get(id); if(d && d.speedMul) spdMul*=d.speedMul(p); });
  }
  if(p.moving){
    const len=Math.hypot(dx,dy); dx/=len; dy/=len;
    const swimMul=(p.stats&&p.stats.swim)||0.5; // per-breed swim passive (data/breeds.js)
    const spd=(p.swimming?p.speed*swimMul:p.speed)*spdMul;
    p.x+=dx*spd*dtScale; p.y+=dy*spd*dtScale;
    if(Math.abs(dx)>Math.abs(dy)) p.dir=dx>0?'right':'left';
    else p.dir=dy>0?'down':'up';
    p.animTimer+=dt;
    if(p.animTimer>160){p.animTimer=0;p.animFrame=1-p.animFrame;}
  }
  // Scurry dash: a scripted lunge independent of input (abilities/scurry.js sets these).
  if(p.dashT>0){
    p.x+=(p.dashVX||0)*dtScale; p.y+=(p.dashVY||0)*dtScale;
    p.dashT=Math.max(0, p.dashT-dt);
    p.moving=true;
  }
  resolveCollisions(p);
  p.swimming=isInPond(p.x,p.y,p.swimming);
  if(typeof Health!=='undefined') Health.tick(p,dt);
  Abilities.update(p,dt);
  if(Input.held('action')&&!p.howling){
    p.howling=true;p.howlTimer=400;p.noiseT=HOWL_NOISE_MS;sfxHowl();
    if(typeof spawnSparkles==='function') spawnSparkles(p.x,p.y-24,'#C9A6FF',6);
  }
  if(p.howling){p.howlTimer-=dt;if(p.howlTimer<=0)p.howling=false;}
  if(p.noiseT>0)p.noiseT=Math.max(0,p.noiseT-dt);
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

function tryDeliver(p){
  if(!Input.held('action'))return;
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
function tryInteract(p){
  const pressed=Input.held('action');
  if(pressed && !p._actionPrev) Entities.interact(p);
  p._actionPrev=pressed;
}

function updateSparkles(){
  sparkles=sparkles.filter(s=>s.life>0);
  sparkles.forEach(s=>{s.x+=s.vx*dtScale;s.y+=s.vy*dtScale;s.vy+=0.06*dtScale;s.life-=dtScale;});
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
  if(entities.some(e=>e.kind==='portal')) return;   // exit already spawned
  sfxWin();
  // The world keeps playing: a biome-themed exit portal appears near the dog, and the
  // player walks into it to reveal the journey map (portal.js runs the old flow).
  // On a biome's final level a golden chest materialises beside it.
  const env=Campaign.envOfLevel(lvl.id);
  const nextLvl=lvl.next && Levels.get(lvl.next);
  const nextEnv=nextLvl ? Campaign.envOfLevel(nextLvl.id) : null;
  // portal spot: a clear patch of dry land near the dog
  const spot={ x:clamp(p1.x+90, 80, WORLD_W-80), y:clamp(p1.y, 80, WORLD_H-80) };
  nudgeOutOfWater(spot, 40);
  Entities.spawn('portal', { x:spot.x, y:spot.y, levelId:lvl.id,
    colA:(env&&env.color)||'#9B7EC8', colB:'#FFD93D', icon:(nextEnv&&nextEnv.icon)||'✨' });
  const finale=Campaign.isFinalRealLevel(lvl.id);
  if(finale){
    const cs={ x:clamp(spot.x-56, 60, WORLD_W-60), y:spot.y+8 };
    nudgeOutOfWater(cs, 20);
    Entities.spawn('chest', { x:cs.x, y:cs.y, rarity:'golden', state:'dug' });
    spawnSparkles(cs.x, cs.y-8, '#FFD93D', 20);
  }
  showToast(finale ? '🌟 Biome cleared! A golden chest appeared — and a portal hums nearby…'
                   : '🌀 Quest complete! A portal opened nearby — step in when you’re ready.', 3200);
}

