// ====================== CHARACTER SELECTION ======================

// Breed metadata now comes from the shared registry (data/breeds.js) so charselect
// and gameplay share one source. Shape: {id,name,desc,emoji,stats,passive,abilityId}.
const BREEDS = Breeds.list();

const COLORS = [
  { id:'blue',    hex:'#6FA8C9', label:'Ice Blue'   },
  { id:'copper',  hex:'#C07840', label:'Copper'     },
  { id:'lavender',hex:'#9B7EC8', label:'Lavender'   },
  { id:'mint',    hex:'#4FAD8A', label:'Mint'       },
  { id:'rose',    hex:'#D4607A', label:'Rose'       },
  { id:'sand',    hex:'#C8A855', label:'Sand'       },
  { id:'slate',   hex:'#607890', label:'Slate'      },
  { id:'peach',   hex:'#D48060', label:'Peach'      },
];

// Current selections (defaults)
const dogConfig = {
  p1: { breed:'dinno',    color: COLORS[1] },  // copper — matches Dinno's real coat
  p2: { breed:'lolla',    color: COLORS[0] },  // ice blue for Lolla
};

// Which player we're currently configuring (null = showing mode select)
let selectingPlayer = null;
let pendingMode = null; // 'solo' | '2p'

// ---- Preview canvas (draws a mini dog for each breed card) ----
function drawBreedPreview(canvasEl, breed, colorHex, t){
  const c = canvasEl.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0,0,canvasEl.width,canvasEl.height);
  const cx=canvasEl.width/2, cy=canvasEl.height/2+6;
  // draw a small static dog using the main renderer
  const fakePlayer={x:cx,y:cy,color:colorHex,breed,dir:'down',moving:false,howling:false,animFrame:0,animTimer:0};
  // We redirect ctx temporarily to c
  const savedCtx=ctx;
  // We can't swap ctx (it's const), so we draw a simpler inline preview
  drawBreedPreviewInline(c, breed, colorHex, cx, cy, t||0);
}

function drawBreedPreviewInline(c, breed, colorHex, x, y, t){
  function f(rx,ry,rw,rh,col){ c.fillStyle=col; c.fillRect(Math.round(x+rx),Math.round(y+ry),rw,rh); }
  const C=colorHex;
  const D=shade(C,-30), L=shade(C,40), W='#F5EEE0', K='#1A1A1A';
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
  } else if(breed==='lolla'){
    // Sheltie / collie: tricolor brown+black+white, long mane
    const BC='#C07838', BD=shade(BC,-35), BL='#D8A060';
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
  } else if(breed==='husky'){
    // body
    f(-9,-2,18,13,C); f(-6,2,12,7,L);
    // legs
    f(-6,10,4,7,D); f(2,10,4,7,D);
    // tail
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,D); f(10,tw-2,3,7,C); f(11,tw-4,2,5,W);
    // head
    f(-7,-14,14,13,C); f(-4,-12,9,5,W); f(-6,-14,4,7,D); f(2,-14,4,7,D);
    // ears
    f(-8,-20,6,8,D); f(2,-20,6,8,D);
    f(-6,-18,3,5,L); f(3,-18,3,5,L);
    // eyes
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    // muzzle
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
  } else if(breed==='shiba'){
    // compact sturdy body
    f(-8,-2,16,12,C); f(-5,2,10,7,W);
    f(-5,10,4,7,D); f(1,10,4,7,D);
    // curled tail (curl shape with multiple rects)
    const tw=Math.sin(t/180)*2;
    f(7,-2,5,8,D); f(9,-6+tw,4,6,C); f(10,-9+tw,3,4,C); f(8,-9+tw,4,3,C);
    // head — squarish, bold
    f(-7,-15,14,13,C); f(-4,-12,8,6,W);
    // ears — pointed, upright
    f(-7,-24,5,11,D); f(-5,-22,3,8,L);
    f(2,-24,5,11,D); f(3,-22,3,8,L);
    // eyes — almond shaped
    f(-4,-10,4,3,K); f(1,-10,4,3,K);
    f(-3,-10,1,1,'#fff'); f(2,-10,1,1,'#fff');
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
  } else if(breed==='corgi'){
    // WIDE low body
    f(-11,-1,22,10,C); f(-8,3,16,6,W);
    // SHORT stumpy legs
    f(-7,9,5,5,D); f(2,9,5,5,D);
    // fluffy butt / tail stub
    f(9,0,6,8,W); f(10,-1,5,6,L);
    // big square head
    f(-8,-14,16,14,C); f(-5,-10,10,7,W);
    // large upright ears
    f(-9,-24,7,12,D); f(-7,-22,4,9,L); f(-6,-21,2,6,'#FFBBAA');
    f(2,-24,7,12,D); f(3,-22,4,9,L); f(4,-21,2,6,'#FFBBAA');
    // wide eyes
    f(-5,-9,4,4,K); f(1,-9,4,4,K);
    f(-4,-9,2,2,'#fff'); f(2,-9,2,2,'#fff');
    f(-3,-5,7,4,W); f(-1,-7,4,3,K);
  } else if(breed==='poodle'){
    // pom-pom body (round fluffy patches)
    c.fillStyle=C;
    c.beginPath(); c.arc(x,by+2,9,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x-5,by+5,5,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by+5,5,0,Math.PI*2); c.fill();
    // legs (thin with pom ankles)
    f(-6,11,3,7,D); f(3,11,3,7,D);
    c.fillStyle=C; c.beginPath(); c.arc(x-4,by+19,4,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by+19,4,0,Math.PI*2); c.fill();
    // tail pom
    const tw=Math.sin(t/150)*4;
    c.fillStyle=D; c.beginPath(); c.arc(x+10,by-2+tw*0.5,3,0,Math.PI*2); c.fill();
    c.fillStyle=C; c.beginPath(); c.arc(x+12,by-4+tw,4,0,Math.PI*2); c.fill();
    // head pom
    c.fillStyle=C; c.beginPath(); c.arc(x,by-15,7,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x-5,by-18,5,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+5,by-18,5,0,Math.PI*2); c.fill();
    // ear poms
    c.fillStyle=D; c.beginPath(); c.arc(x-8,by-16,4,0,Math.PI*2); c.fill();
    c.beginPath(); c.arc(x+8,by-16,4,0,Math.PI*2); c.fill();
    // face
    f(-3,-10,3,3,K); f(1,-10,3,3,K);
    f(-2,-10,1,1,'#fff'); f(2,-10,1,1,'#fff');
    f(-2,-7,5,3,W); f(-1,-9,3,3,K);
  } else if(breed==='dalmatian'){
    // white base coat with spots
    f(-9,-2,18,13,'#F5F0E8'); f(-6,2,12,7,W);
    f(-6,10,4,7,'#D8D4CC'); f(2,10,4,7,'#D8D4CC');
    const tw=Math.sin(t/160)*4;
    f(8,0+tw*0.4,4,10,'#D8D4CC'); f(10,tw-2,3,7,'#F5F0E8');
    f(-7,-14,14,13,'#F5F0E8'); f(-4,-12,8,4,'#F5F0E8');
    f(-8,-20,6,8,'#D8D4CC'); f(2,-20,6,8,'#D8D4CC');
    f(-6,-18,3,4,W); f(3,-18,3,4,W);
    f(-4,-10,3,3,K); f(2,-10,3,3,K);
    f(-3,-10,1,1,'#fff'); f(3,-10,1,1,'#fff');
    f(-3,-6,7,4,W); f(-2,-8,4,3,K);
    // spots using main color
    const spots=[[-4,1,4,4],[ 3,3,3,4],[-7,4,3,3],[5,0,3,3],[-1,6,4,3],
                 [-5,-13,3,3],[3,-12,4,3],[-6,-5,3,3],[2,-5,3,3]];
    c.fillStyle=C;
    spots.forEach(([rx,ry,rw,rh])=>{ c.fillRect(Math.round(x+rx),Math.round(by+ry),rw,rh); });
  }
}

// ---- Build the HTML for the selection screen ----
function buildSelectScreen(playerNum){
  const cfg = dogConfig[`p${playerNum}`];
  return `
<div id="charSelect" class="overlay-screen">
  <div class="cs-title">
    <span class="cs-player-badge p${playerNum}-badge">P${playerNum}</span>
    Choose Your Dog
  </div>

  <div class="cs-section-label">Breed</div>
  <div class="cs-breeds" id="csBreeds">
    ${BREEDS.map(b=>`
      <div class="breed-card ${cfg.breed===b.id?'selected':''}" data-breed="${b.id}">
        <canvas class="breed-preview" id="bprev-${b.id}" width="60" height="70"></canvas>
        <div class="breed-name">${b.name}</div>
        <div class="breed-desc">${b.desc}</div>
      </div>
    `).join('')}
  </div>

  ${cfg.breed==='dinno'||cfg.breed==='lolla' ? `
  <div class="cs-section-label">Colour</div>
  <div style="text-align:center;font-size:12px;color:#888;padding:8px 0;">
    ${cfg.breed==='dinno'?'Dinno':'Lolla'} keeps their real colours!
  </div>` : `
  <div class="cs-section-label">Colour</div>
  <div class="cs-colors" id="csColors">
    ${COLORS.map(col=>`
      <div class="color-swatch ${cfg.color.id===col.id?'selected':''}"
           data-colorid="${col.id}"
           style="background:${col.hex}"
           title="${col.label}">
        ${cfg.color.id===col.id?'<span class="swatch-check">✓</span>':''}
      </div>
    `).join('')}
  </div>`}

  <div class="cs-actions">
    ${playerNum===2 && pendingMode==='2p'
      ? `<button class="modebtn secondary" id="csBack">← Back</button>` : ''}
    <button class="modebtn" id="csNext">
      ${pendingMode==='2p' && playerNum===1 ? 'Next: P2 →' : '▶ Play!'}
    </button>
  </div>
</div>`;
}

function showCharSelect(playerNum){
  selectingPlayer = playerNum;
  const frame = document.getElementById('gameFrame');
  let el = document.getElementById('charSelect');
  if(el) el.remove();
  frame.insertAdjacentHTML('beforeend', buildSelectScreen(playerNum));

  // Wire breed cards
  document.querySelectorAll('.breed-card').forEach(card=>{
    card.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].breed = card.dataset.breed;
      // re-render just the cards + previews
      refreshSelectScreen(playerNum);
    });
  });

  // Wire color swatches
  document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].color = COLORS.find(c=>c.id===sw.dataset.colorid);
      refreshSelectScreen(playerNum);
    });
  });

  // Next button
  document.getElementById('csNext').addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    if(pendingMode==='2p' && playerNum===1){
      showCharSelect(2);
    } else {
      launchGame();
    }
  });

  // Back button (P2 screen → back to P1)
  const backBtn = document.getElementById('csBack');
  if(backBtn) backBtn.addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    showCharSelect(1);
  });

  // Draw breed previews (animated via RAF)
  renderBreedPreviews(playerNum);
}

let previewRAF = null;
function renderBreedPreviews(playerNum){
  if(previewRAF) cancelAnimationFrame(previewRAF);
  const cfg = dogConfig[`p${playerNum}`];
  function frame(t){
    BREEDS.forEach(b=>{
      const el = document.getElementById(`bprev-${b.id}`);
      if(!el) return;
      drawBreedPreviewInline(el.getContext('2d'), b.id, cfg.color.hex, 30, 42, t);
    });
    previewRAF = requestAnimationFrame(frame);
  }
  previewRAF = requestAnimationFrame(frame);
}

function refreshSelectScreen(playerNum){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  const el = document.getElementById('charSelect');
  if(el) el.remove();
  const frame = document.getElementById('gameFrame');
  frame.insertAdjacentHTML('beforeend', buildSelectScreen(playerNum));

  document.querySelectorAll('.breed-card').forEach(card=>{
    card.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].breed = card.dataset.breed;
      refreshSelectScreen(playerNum);
    });
  });
  document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.addEventListener('click',()=>{
      dogConfig[`p${playerNum}`].color = COLORS.find(c=>c.id===sw.dataset.colorid);
      refreshSelectScreen(playerNum);
    });
  });
  document.getElementById('csNext').addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    if(pendingMode==='2p' && playerNum===1) showCharSelect(2);
    else launchGame();
  });
  const backBtn = document.getElementById('csBack');
  if(backBtn) backBtn.addEventListener('click',()=>{
    document.getElementById('charSelect').remove();
    showCharSelect(1);
  });
  renderBreedPreviews(playerNum);
}

function launchGame(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  const cfg1 = dogConfig.p1, cfg2 = dogConfig.p2;
  if(pendingMode==='2p'){
    twoPlayer=true;
    document.getElementById('p2panel').style.display='flex';
    document.getElementById('p2controls').style.display='block';
  } else {
    twoPlayer=false;
    document.getElementById('p2panel').style.display='none';
    document.getElementById('p2controls').style.display='none';
  }
  // Update HUD dot colors safely (some browsers' querySelector returns NodeList that needs guarding)
  const dots = document.querySelectorAll('#hud .dot');
  if(dots[0]) dots[0].style.background = cfg1.color.hex;
  if(dots[1]) dots[1].style.background = cfg2.color.hex;

  document.getElementById('startScreen').style.display='none';
  // A brand-new game always starts at the first level (the current level may be a
  // later one if a previous run progressed before quitting).
  resetGame(cfg1, cfg2, Levels.first().id);
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  startMusic();
  if(!twoPlayer && isTouchDevice()) showMobileControls(true);
}

// Override resetGame to accept configs. `levelId` picks which level to build; omit it
// to rebuild whatever level is current (used by Play Again after a game over).
function resetGame(cfg1, cfg2, levelId){
  stopMusic();
  if(levelId) LevelManager.load(levelId);   // regenerate a specific level
  else LevelManager.reload();               // rebuild the current level
  Abilities.reset();
  const c1 = cfg1 || dogConfig.p1;
  const c2 = cfg2 || dogConfig.p2;
  const spawn = (LevelManager.current && LevelManager.current.spawn) || { x:200, y:200 };
  p1=makePlayer(1, c1.color.hex, spawn.x, spawn.y, c1.breed);
  p2=makePlayer(2, c2.color.hex, spawn.x+60, spawn.y, c2.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
  document.getElementById('gameOverScreen').style.display='none';
  document.getElementById('levelCompleteScreen').style.display='none';
}

// Play Again after a game over: rebuild the level the run ended on (keeping the same
// dogs) and drop straight back into play — no trip through the menu / char-select.
function replayRun(){
  if(previewRAF){ cancelAnimationFrame(previewRAF); previewRAF=null; }
  resetGame(dogConfig.p1, dogConfig.p2);   // no levelId → current level
  Abilities.spawnAll();
  Game.state=SCENES.PLAYING;
  startMusic();
  if(!twoPlayer && isTouchDevice()) showMobileControls(true);
}

// Wire main menu buttons → char select flow
document.getElementById('btn1p').addEventListener('click',()=>{
  pendingMode='solo';
  Game.state=SCENES.CHARSELECT;
  document.getElementById('startScreen').style.display='none';
  showCharSelect(1);
});
document.getElementById('btn2p').addEventListener('click',()=>{
  pendingMode='2p';
  Game.state=SCENES.CHARSELECT;
  document.getElementById('startScreen').style.display='none';
  showCharSelect(1);
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
