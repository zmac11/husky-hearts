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
const N={C4:60,D4:62,E4:64,G4:67,A4:69,C5:72,D5:74,E5:76,G5:79,A5:81,C3:48,G3:55};
const MELODY=[[N.E5,1],[N.G5,1],[N.A5,2],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.E5,1],[N.G5,1],[N.E5,1],[N.C5,2],[N.D5,1],[N.C5,1],[N.E5,1],[N.G5,2],[N.A5,1],[N.G5,1],[N.A5,1],[N.G5,1],[N.E5,1],[N.D5,1],[N.C5,1],[N.D5,2],[N.C5,4]];
const BEAT=0.32, LOOP_LEN=MELODY.reduce((s,[,d])=>s+d,0)*BEAT;
const HARMONY=[[N.C4,4],[N.A4,4],[N.G4,4],[N.C4,4],[N.A4,4],[N.C5,4],[N.G4,4],[N.C4,4]];
const BASS=[N.C3,N.C3,N.G3,N.C3,N.C3,N.G3,N.C3,N.G3];
function scheduleMusicLoop(st){
  const ac=getAudio();
  const mg=ac.createGain(); mg.gain.value=0.55; mg.connect(bgGain);
  const hg=ac.createGain(); hg.gain.value=0.18; hg.connect(bgGain);
  const bg=ac.createGain(); bg.gain.value=0.22; bg.connect(bgGain);
  let t=st;
  MELODY.forEach(([note,beats])=>{ const d=beats*BEAT,hz=noteHz(note); osc(ac,'triangle',hz,0.5,mg,t,d*0.85); osc(ac,'sine',hz*2,0.12,mg,t,d*0.6); t+=d; });
  t=st; HARMONY.forEach(([note,beats])=>{ osc(ac,'sine',noteHz(note),0.6,hg,t,beats*BEAT*0.9); t+=beats*BEAT; });
  t=st; BASS.forEach(n=>{ osc(ac,'sine',noteHz(n),0.9,bg,t,BEAT*1.4); t+=BEAT*2; });
  const ns=st+LOOP_LEN, delay=Math.max(0,(ns-LOOP_LEN*0.15-ac.currentTime)*1000);
  bgNodes.push(setTimeout(()=>scheduleMusicLoop(ns),delay));
}
function startMusic(){ if(musicStarted)return; musicStarted=true; const ac=getAudio(); if(ac.state==='suspended')ac.resume(); scheduleMusicLoop(ac.currentTime+0.1); }
function stopMusic(){ bgNodes.forEach(clearTimeout); bgNodes=[]; musicStarted=false; }
function sfxCollect(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); osc(ac,'sine',noteHz(N.G5),0.35,ac.destination,t,0.08); osc(ac,'sine',noteHz(N.C5+12),0.25,ac.destination,t+0.07,0.1); }
function sfxDeliver(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.3,ac.destination,t+i*0.1,0.18)); }
function sfxCheer(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [N.C5,N.E5,N.G5,N.C5+12].forEach((n,i)=>osc(ac,'triangle',noteHz(n),0.4,ac.destination,t+i*0.12,0.25)); osc(ac,'sine',noteHz(N.G5),0.3,ac.destination,t+0.5,0.4); }
function sfxHowl(){ const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); const o=ac.createOscillator(),g=ac.createGain(); o.type='sine'; o.frequency.setValueAtTime(noteHz(N.A4),t); o.frequency.linearRampToValueAtTime(noteHz(N.A5),t+0.5); g.gain.setValueAtTime(0.2,t); g.gain.linearRampToValueAtTime(0,t+0.55); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+0.6); }
function sfxWin(){ stopMusic(); const ac=getAudio(),t=ac.currentTime; if(ac.state==='suspended')ac.resume(); [[N.C4,0,.25],[N.E4,.2,.25],[N.G4,.4,.25],[N.C5,.6,.5],[N.E5,.9,.5],[N.G5,1.15,.5],[N.C5+12,1.5,.9]].forEach(([n,d,du])=>{ osc(ac,'triangle',noteHz(n),.45,ac.destination,t+d,du); osc(ac,'sine',noteHz(n)*2,.15,ac.destination,t+d,du*.6); }); [0,.15,.3,.45,.65,.85].forEach((d,i)=>osc(ac,'sine',noteHz(N.C5+12+i*2),.12,ac.destination,t+1.8+d,.18)); [N.C4,N.E4,N.G4,N.C5].forEach(n=>osc(ac,'sine',noteHz(n),.3,ac.destination,t+2.5,1.5)); }

