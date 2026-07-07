// ====================== AUDIO ENGINE ======================
let audioCtx=null, bgGain=null, bgNodes=[], musicStarted=false;
function getAudio(){
  if(!audioCtx){
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    bgGain=audioCtx.createGain(); bgGain.gain.value=0.38;
    bgGain.connect(audioCtx.destination);
  }
  return audioCtx;
}
function osc(ac,type,freq,gainVal,dest,startT,dur,fadeOut=true){
  const o=ac.createOscillator(),g=ac.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,startT);
  g.gain.setValueAtTime(gainVal,startT);
  if(fadeOut) g.gain.linearRampToValueAtTime(0,startT+dur);
  o.connect(g); g.connect(dest); o.start(startT); o.stop(startT+dur+0.02);
}
function noteHz(n){ return 440*Math.pow(2,(n-69)/12); }
const N={
  C3:48,D3:50,E3:52,F3:53,G3:55,A3:57,Bb3:58,B3:59,
  C4:60,D4:62,E4:64,F4:65,G4:67,A4:69,Bb4:70,B4:71,
  C5:72,D5:74,Eb5:75,E5:76,F5:77,G5:79,A5:81,Bb5:82,B5:83,C6:84
};

// ---------- SOUNDTRACKS ----------
// Each voice is a list of [note, beats]; note===0 is a rest. The melody's total
// length defines the loop; harmony/bass may be shorter (they simply rest out the tail).
const SOUNDTRACKS={
  meadow:{
    name:'Cozy Meadow', beat:0.32,
    melody:[[N.E5,1],[N.G5,1],[N.A5,2],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.E5,1],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.C5,1],[N.E5,1],[N.G5,2],[N.A5,1],[N.G5,1],[N.A5,1],[N.G5,1],[N.E5,1],[N.D5,1],[N.C5,1],[N.D5,2],[N.C5,4]],
    harmony:[[N.C4,4],[N.A4,4],[N.G4,4],[N.C4,4],[N.A4,4],[N.C5,4],[N.G4,4],[N.C4,4]],
    bass:[[N.C3,2],[N.C3,2],[N.G3,2],[N.C3,2],[N.C3,2],[N.G3,2],[N.C3,2],[N.G3,2]],
  },
  dogs:{
    name:'Who Let the Dogs Out', beat:0.30,
    // Call: "Who let the dogs out?"  Response: staccato "woof woof woof woof"
    melody:[
      [N.C5,1],[N.C5,0.5],[N.C5,0.5],[N.A4,1],[N.C5,1],      // who let the dogs out
      [N.C5,0.5],[N.C5,0.5],[N.C5,0.5],[N.C5,0.5],[0,1],      // woof woof woof woof
      [N.C5,1],[N.C5,0.5],[N.C5,0.5],[N.A4,1],[N.C5,1],      // who let the dogs out
      [N.A4,0.5],[N.A4,0.5],[N.G4,0.5],[N.A4,0.5],[N.C5,1],   // who who who who — out!
    ],
    harmony:[[N.E4,2],[N.F4,2],[N.C4,3],[N.E4,2],[N.F4,2],[N.C4,3]],
    bass:[[N.A3,1],[0,1],[N.A3,1],[N.F3,1],[N.C3,2],[N.G3,1],[N.A3,1],[0,1],[N.A3,1],[N.F3,1],[N.C3,2],[N.G3,1]],
  },
  sunset:{
    name:'Sleepy Sunset', beat:0.44,
    melody:[[N.G4,2],[N.C5,2],[N.E5,2],[N.D5,2],[N.C5,2],[N.A4,2],[N.G4,3],[0,1]],
    harmony:[[N.C4,4],[N.F4,4],[N.A4,4],[N.G4,4]],
    bass:[[N.C3,4],[N.F3,4],[N.A3,4],[N.G3,4]],
  },
  zoomies:{
    name:'Puppy Zoomies', beat:0.19,
    melody:[
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,1],[N.G5,1],[N.E5,1],[N.G5,1],[N.E5,1],
      [N.D5,1],[N.F5,1],[N.A5,1],[N.F5,1],[N.E5,1],[N.C5,1],[N.C5,1],[0,1],
    ],
    harmony:[[N.C4,2],[N.G4,2],[N.F4,2],[N.G4,2],[N.C4,2],[N.G4,2],[N.F4,2],[N.G4,2]],
    bass:[[N.C3,1],[N.C3,1],[N.G3,1],[N.G3,1],[N.F3,1],[N.F3,1],[N.G3,1],[N.G3,1],[N.C3,1],[N.C3,1],[N.G3,1],[N.G3,1],[N.F3,1],[N.F3,1],[N.G3,1],[N.G3,1]],
  },
};
const SOUNDTRACK_KEYS=Object.keys(SOUNDTRACKS);
let currentTrack='meadow';

function patLen(pat,beat){ return pat.reduce((s,[,b])=>s+b,0)*beat; }
function playVoice(ac,dest,pattern,beat,st,gainVal,type,octave){
  let t=st;
  pattern.forEach(([note,beats])=>{
    const d=beats*beat;
    if(note){
      osc(ac,type,noteHz(note),gainVal,dest,t,d*0.85);
      if(octave) osc(ac,'sine',noteHz(note)*2,gainVal*0.24,dest,t,d*0.6);
    }
    t+=d;
  });
}
function scheduleMusicLoop(st){
  const ac=getAudio();
  const trk=SOUNDTRACKS[currentTrack]||SOUNDTRACKS.meadow;
  const beat=trk.beat;
  const mg=ac.createGain(); mg.gain.value=0.55; mg.connect(bgGain);
  const hg=ac.createGain(); hg.gain.value=0.18; hg.connect(bgGain);
  const bg=ac.createGain(); bg.gain.value=0.22; bg.connect(bgGain);
  playVoice(ac,mg,trk.melody,beat,st,0.5,'triangle',true);
  playVoice(ac,hg,trk.harmony,beat,st,0.6,'sine',false);
  playVoice(ac,bg,trk.bass,beat,st,0.9,'sine',false);
  const loopLen=patLen(trk.melody,beat);
  const ns=st+loopLen, delay=Math.max(0,(ns-loopLen*0.15-ac.currentTime)*1000);
  bgNodes.push(setTimeout(()=>scheduleMusicLoop(ns),delay));
}
function startMusic(){ if(musicStarted)return; musicStarted=true; const ac=getAudio(); if(ac.state==='suspended')ac.resume(); scheduleMusicLoop(ac.currentTime+0.1); }
function stopMusic(){ bgNodes.forEach(clearTimeout); bgNodes=[]; musicStarted=false; }

// Play a short taste of a track (used when picking one in the menu, before the game starts)
let previewNodes=[];
function previewSoundtrack(key){
  const trk=SOUNDTRACKS[key]; if(!trk)return;
  const ac=getAudio(); if(ac.state==='suspended')ac.resume();
  previewNodes.forEach(clearTimeout); previewNodes=[];
  const pg=ac.createGain(); pg.gain.value=0.4; pg.connect(ac.destination);
  let t=ac.currentTime+0.05;
  trk.melody.slice(0,8).forEach(([note,beats])=>{
    const d=beats*trk.beat;
    if(note) osc(ac,'triangle',noteHz(note),0.5,pg,t,d*0.9);
    t+=d;
  });
}
function setSoundtrack(key){
  if(!SOUNDTRACKS[key])return;
  currentTrack=key;
  if(musicStarted){ stopMusic(); startMusic(); } // swap live if a game is in progress
}
function cycleSoundtrack(){
  const i=SOUNDTRACK_KEYS.indexOf(currentTrack);
  const next=SOUNDTRACK_KEYS[(i+1)%SOUNDTRACK_KEYS.length];
  setSoundtrack(next);
  previewSoundtrack(next);
  return next;
}
function currentTrackName(){ return SOUNDTRACKS[currentTrack].name; }

function sfxCollect(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); osc(ac,'sine',noteHz(N.G5),0.35,ac.destination,t,0.08); osc(ac,'sine',noteHz(N.C5+12),0.25,ac.destination,t+0.07,0.1); }
function sfxDeliver(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.3,ac.destination,t+i*0.1,0.18)); }
function sfxCheer(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5,N.C5+12].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.4,ac.destination,t+i*0.12,0.25)); osc(ac,'sine',noteHz(N.G5),0.3,ac.destination,t+0.5,0.4); }
function sfxHowl(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); const o=ac.createOscillator(),g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(noteHz(N.A4),t); o.frequency.linearRampToValueAtTime(noteHz(N.A5),t+0.5); g.gain.setValueAtTime(0.2,t); g.gain.linearRampToValueAtTime(0,t+0.55); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.6); }
// Sad "aww" when a dog faints — a downward trombone-ish slide with a low bell tail.
// Does NOT stop the music (a co-op partner may still be playing).
function sfxDeath(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume();
  const o=ac.createOscillator(), g=ac.createGain();
  o.type='sawtooth';
  o.frequency.setValueAtTime(noteHz(N.E4),t);
  o.frequency.exponentialRampToValueAtTime(noteHz(N.C3),t+0.7);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.26,t+0.05);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.8);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.85);
  osc(ac,'sine',noteHz(N.C3),0.16,ac.destination,t+0.1,0.7);
}
function sfxWin(){ stopMusic(); const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [[N.C4,0,.25],[N.E4,.2,.25],[N.G4,.4,.25],[N.C5,.6,.5],[N.E5,.9,.5],[N.G5,1.15,.5],[N.C5+12,1.5,.9]].forEach(([n,d,du])=>{ osc(ac,'triangle',noteHz(n),.45,ac.destination,t+d,du); osc(ac,'sine',noteHz(n)*2,.15,ac.destination,t+d,du*.6); }); [0,.15,.3,.45,.65,.85].forEach((d,i)=>osc(ac,'sine',noteHz(N.C5+12+i*2),.12,ac.destination,t+1.8+d,.18)); [N.C4,N.E4,N.G4,N.C5].forEach(n=>osc(ac,'sine',noteHz(n),.3,ac.destination,t+2.5,1.5)); }
