// ====================== CANVAS / FULLSCREEN ======================
let pseudoFS=false;
function resizeCanvas(){
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  const isFS=isNativeFS||pseudoFS;
  const sw=window.innerWidth,sh=window.innerHeight;
  const scale=isFS?Math.min(sw/VIEW_W,sh/VIEW_H):Math.min((sw-32)/VIEW_W,1);
  canvas.style.width=Math.round(VIEW_W*scale)+'px';
  canvas.style.height=Math.round(VIEW_H*scale)+'px';
}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);

const fsBtn=document.getElementById('fsBtn');
const wrap=document.getElementById('wrap');
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function enterPseudoFS(){
  pseudoFS=true;
  wrap.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#FFE9D6 0%,#FFD6B8 60%,#8FD4A8 100%);padding:0;gap:0;overflow:hidden;';
  document.getElementById('gameFrame').style.cssText='padding:0;border:none;border-radius:0;box-shadow:none;background:transparent;';
  window.scrollTo(0,1);fsBtn.textContent='✕ Exit';resizeCanvas();
}
function exitPseudoFS(){
  pseudoFS=false;wrap.style.cssText='';
  document.getElementById('gameFrame').style.cssText='';
  fsBtn.textContent='⛶ Fullscreen';resizeCanvas();
}
function toggleFullscreen(){
  if(isIOS){pseudoFS?exitPseudoFS():enterPseudoFS();return;}
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  if(!isNativeFS){
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen;
    if(req)req.call(el).catch(()=>enterPseudoFS());
  } else {
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(exit)exit.call(document).catch(()=>{});
  }
}
fsBtn.addEventListener('click',toggleFullscreen);
function onFSChange(){
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  fsBtn.textContent=isNativeFS?'✕ Exit':'⛶ Fullscreen';resizeCanvas();
}
document.addEventListener('fullscreenchange',onFSChange);
document.addEventListener('webkitfullscreenchange',onFSChange);

