// ====================== CHARACTER SELECTION ======================

// Breed metadata now comes from the shared registry (data/breeds.js) so charselect
// and gameplay share one source. Shape: {id,name,desc,emoji,stats,passive,abilities,color}.
// Only Dinno and Lolla are playable; both draw their real coat colours in-sprite,
// so there is no colour picker — each breed carries a fixed accent colour.
const BREEDS = Breeds.list();

// Current selection (default). Single player for now — a future multiplayer mode
// would reintroduce per-player configs here.
const dogConfig = { breed:'dinno' };

// ---- Preview drawing (draws a mini dog for each breed card) ----
function drawBreedPreviewInline(c, breed, x, y, t){
  function f(rx,ry,rw,rh,col){ c.fillStyle=col; c.fillRect(Math.round(x+rx),Math.round(y+ry),rw,rh); }
  const K='#1A1A1A';
  const bob=Math.sin(t/350)*1.5;
  const by=y+bob;

  // ground shadow
  c.globalAlpha=0.18;
  c.beginPath(); c.ellipse(x,by+14,11,4,0,0,Math.PI*2); c.fillStyle='#2A3A2A'; c.fill();
  c.globalAlpha=1;

  if(breed==='dinno'){
    // Red husky with white mask
    const RC='#C07040', RD=shade(RC,-30), RL=shade(RC,40), RW='#F0EAD8';
    f(-9,-2,18,13,RC); f(-6,2,12,7,RW);
    f(-6,10,4,7,RD); f(2,10,4,7,RD);
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,RD); f(10,tw-2,3,7,RC); f(11,tw-4,2,5,RW);
    f(-7,-14,14,13,RC);
    f(-5,-12,9,6,RW); // white face mask
    f(-6,-14,4,7,RD); f(2,-14,4,7,RD);
    f(-8,-20,6,8,RD); f(2,-20,6,8,RD);
    f(-6,-18,3,5,RL); f(3,-18,3,5,RL);
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    f(-4,-6,8,5,RW); f(-2,-8,4,3,K);
  } else if(breed==='tapka'){
    // Ťapka — tiny Prague Ratter: fawn, huge upright ears, greying muzzle
    const TC='#B5854F', TD=shade(TC,-32), TG='#D9CFC0', PK='#D8A090';
    // small slim body
    f(-7,2,14,9,TC); f(-4,5,8,5,TG);
    f(-5,10,3,6,TD); f(2,10,3,6,TD);
    // thin whippy tail
    const tw=Math.sin(t/140)*3;
    f(6,2+tw*0.4,4,7,TD); f(9,tw-1,3,6,TC);
    // small head + oversized ears
    f(-6,-10,12,12,TC);
    f(-9,-21,6,12,TD); f(-8,-19,4,8,PK);
    f(3,-21,6,12,TD); f(4,-19,4,8,PK);
    // big dark eyes + greying muzzle + button nose
    f(-4,-8,3,3,K); f(-3,-8,1,1,'#fff');
    f(1,-8,3,3,K); f(2,-8,1,1,'#fff');
    f(-4,-4,8,5,TG); f(-1,-4,3,3,K);
  } else {
    // Lolla — sheltie / collie: tricolor brown+black+white, long mane
    const BC='#C07838', BD=shade(BC,-35);
    const BLK='#2A2A2A', BWH='#F4EEE2';
    // body
    f(-8,-2,16,12,BC); f(-5,2,10,6,BWH); // white chest
    f(-8,-2,4,6,BLK); // black saddle left
    f(4,-2,4,6,BLK);  // black saddle right
    f(-5,10,4,7,BD); f(1,10,4,7,BD);
    // mane (fluffy chest extension)
    f(-6,0,4,8,BWH); f(2,0,4,8,BWH);
    // tail
    const tw=Math.sin(t/180)*3;
    f(7,-1+tw*0.4,5,11,BLK); f(9,tw-2,3,8,BC);
    // head — elongated/pointy
    f(-6,-16,13,14,BC);
    f(-4,-14,8,6,BWH); // white blaze
    f(-8,-22,5,8,BLK); f(3,-22,5,8,BLK); // ears
    f(-7,-20,3,6,BC); f(4,-20,3,6,BC);   // ear inner
    // mane around neck
    f(-8,-6,4,8,BWH); f(4,-6,4,8,BWH);
    // eyes
    f(-3,-10,3,3,K); f(2,-10,3,3,K);
    f(-2,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    // pointy muzzle
    f(-2,-7,5,5,BWH); f(-1,-9,3,3,K);
  }
}

// ---- Stat bars panel for the currently selected breed ----
function buildStatsPanel(){
  const b=Breeds.get(dogConfig.breed);
  return `
  <div class="cs-stats">
    <div class="st-passive">${b.emoji} ${b.passive}</div>
    ${Breeds.STATS.map(s=>{
      const v=b.bars[s.key];
      return `<div class="st-row" title="${s.hint}">
        <span class="st-label">${s.icon} ${s.label}</span>
        <span class="st-pips">${[1,2,3,4,5].map(i=>`<span class="st-pip${i<=v?' on':''}"></span>`).join('')}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ---- Build the HTML for the selection screen ----
function buildSelectScreen(){
  return `
<div id="charSelect" class="overlay-screen">
  <div class="cs-title">Choose Your Dog</div>

  <div class="cs-breeds" id="csBreeds">
    ${BREEDS.map(b=>`
      <div class="breed-card ${dogConfig.breed===b.id?'selected':''}" data-breed="${b.id}">
        <canvas class="breed-preview" id="bprev-${b.id}" width="60" height="70"></canvas>
        <div class="breed-name">${b.name}</div>
        <div class="breed-desc">${b.desc}</div>
      </div>
    `).join('')}
  </div>

  ${buildStatsPanel()}

  <div class="cs-seed">
    <label for="csSeed">🌱 Seed</label>
    <input id="csSeed" type="text" maxlength="24" spellcheck="false" autocomplete="off"
           placeholder="leave blank for a surprise" value="${Run.seedText||''}">
    <button id="csSeedRoll" title="Roll a new seed">🎲</button>
  </div>
  <div class="cs-seed-hint">The seed builds every level — same seed, same world.</div>

  <div class="cs-actions">
    <button class="modebtn secondary" id="csBack">← Back</button>
    <button class="modebtn" id="csNext">▶ Play!</button>
  </div>
</div>`;
}

function showCharSelect(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  const frame = document.getElementById('gameFrame');
  let el = document.getElementById('charSelect');
  if(el) el.remove();
  frame.insertAdjacentHTML('beforeend', buildSelectScreen());

  // Wire breed cards
  document.querySelectorAll('.breed-card').forEach(card=>{
    card.addEventListener('click',()=>{
      dogConfig.breed = card.dataset.breed;
      // re-render the cards so the selection highlight moves
      showCharSelect();
    });
  });

  // Seed box. The screen re-renders whenever a breed card is clicked, so what's typed is
  // parked on Run.seedText (the input is repopulated from it above) rather than lost.
  const seedIn=document.getElementById('csSeed');
  if(seedIn) seedIn.addEventListener('input', ()=>{ Run.seedText=seedIn.value; });
  const seedRoll=document.getElementById('csSeedRoll');
  if(seedRoll) seedRoll.addEventListener('click', ()=>{
    Run.newRandom();
    if(seedIn) seedIn.value=Run.seedText;
  });

  // Play button
  document.getElementById('csNext').addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    launchGame();
  });

  // Back to the main menu
  document.getElementById('csBack').addEventListener('click',()=>{
    if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
    document.getElementById('charSelect').remove();
    document.getElementById('startScreen').style.display='flex';
    Game.state=SCENES.MENU;
  });

  // Draw breed previews (animated via RAF)
  renderBreedPreviews();
}

let previewRAF = null;
function renderBreedPreviews(){
  if(previewRAF) cancelAnimationFrame(previewRAF);
  function frame(t){
    const dpr=hiDPI();
    BREEDS.forEach(b=>{
      const el = document.getElementById(`bprev-${b.id}`);
      if(!el) return;
      const g = el.getContext('2d');
      // Size the backing store to 60×70 device pixels; keep the CSS box at 60×70 and
      // scale the context so the dog (drawn at logical centre 30,42) stays crisp on HiDPI.
      const bw=Math.round(60*dpr), bh=Math.round(70*dpr);
      if(el.width!==bw){ el.width=bw; el.height=bh; el.style.width='60px'; el.style.height='70px'; }
      g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=false;
      g.clearRect(0,0,60,70);
      drawBreedPreviewInline(g, b.id, 30, 42, t);
    });
    previewRAF = requestAnimationFrame(frame);
  }
  previewRAF = requestAnimationFrame(frame);
}

function launchGame(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  // Lock in the run seed BEFORE the first level is built: typed text wins, blank rolls a
  // fresh random run (core/run.js).
  const typed=document.getElementById('csSeed');
  Run.setFromText(typed ? typed.value : Run.seedText);
  // HUD dot takes the chosen breed's accent colour
  const dot = document.querySelector('#hud .dot');
  if(dot) dot.style.background = Breeds.get(dogConfig.breed).color;

  document.getElementById('startScreen').style.display='none';
  // A brand-new game always starts at the first level (the current level may be a
  // later one if a previous run progressed before quitting).
  resetGame(dogConfig, Levels.first().id);
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  updateHUD();               // now that we're PLAYING, the hotbar shows itself
  startMusic();
  if(isTouchDevice()) showMobileControls(true);
}

// Override resetGame to accept a config. `levelId` picks which level to build; omit it
// to rebuild whatever level is current (used by Play Again after a game over).
function resetGame(cfg, levelId){
  stopMusic();
  // A brand-new game (levelId given = starting at level 1) wipes campaign progress and
  // everything remembered about previously-visited levels.
  if(levelId && typeof Progress!=='undefined' && Levels.first() && levelId===Levels.first().id){
    Progress.reset();
    if(typeof LevelState!=='undefined') LevelState.clear();
  }
  if(levelId) LevelManager.load(levelId);   // regenerate a specific level
  else LevelManager.reload();               // rebuild the current level
  Abilities.reset();
  const c = cfg || dogConfig;
  const spawn = (LevelManager.current && LevelManager.current.spawn) || { x:200, y:200 };
  p1=makePlayer(1, Breeds.get(c.breed).color, spawn.x, spawn.y, c.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
  document.getElementById('gameOverScreen').style.display='none';
  if(typeof WorldMap!=='undefined') WorldMap.hide();
}

// Play Again after a game over: rebuild the level the run ended on (keeping the same
// dog) and drop straight back into play — no trip through the menu / char-select.
function replayRun(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  resetGame(dogConfig);   // no levelId → current level
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  updateHUD();               // now that we're PLAYING, the hotbar shows itself
  startMusic();
  if(isTouchDevice()) showMobileControls(true);
}

// Wire main menu buttons → char select flow
document.getElementById('btn1p').addEventListener('click',()=>{
  Game.state=SCENES.CHARSELECT;
  document.getElementById('startScreen').style.display='none';
  showCharSelect();
});
document.getElementById('btnReplay').addEventListener('click',()=>{
  stopMusic();
  document.getElementById('winScreen').style.display='none';
  document.getElementById('startScreen').style.display='flex';
  Game.state=SCENES.MENU;
});

// Soundtrack picker — cycles through tracks and previews the choice
const soundtrackBtn=document.getElementById('btnSoundtrack');
if(soundtrackBtn){
  const refreshSoundtrackBtn=()=>{ soundtrackBtn.textContent='🎵 Music: '+currentTrackName(); };
  refreshSoundtrackBtn();
  soundtrackBtn.addEventListener('click',()=>{
    cycleSoundtrack();
    refreshSoundtrackBtn();
  });
}
