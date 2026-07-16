// ====================== CANVAS / FULLSCREEN ======================
let pseudoFS=false;
function resizeCanvas(){
  const isNativeFS=!!(document.fullscreenElement||document.webkitFullscreenElement);
  const isFS=isNativeFS||pseudoFS;
  // body.fs hides the page chrome (title/subtitle/controls/footer) so only the HUD
  // and the frame remain — toggle it BEFORE measuring, so the HUD height is final.
  document.body.classList.toggle('fs',isFS);
  const sw=window.innerWidth,sh=window.innerHeight;
  const hud=document.getElementById('hud');
  let scale;
  if(isFS){
    // Scale the HUD up with the screen (capped so it stays a slim bar), then reserve
    // its VISUAL height (getBoundingClientRect sees the zoom) so nothing is cut off.
    const est=Math.min(sw/VIEW_W, sh/VIEW_H);
    const hudZoom=Math.min(Math.max(est*0.75,1),1.6);
    if(hud) hud.style.zoom=hudZoom;
    const reserved=(hud?hud.getBoundingClientRect().height:0)+28;
    scale=Math.min(sw/VIEW_W,(sh-reserved)/VIEW_H);
    // Overlay screens (menu, char select, pause, hotbar, …) zoom to match the canvas,
    // so fullscreen UI fills the screen instead of floating tiny in empty space.
    document.documentElement.style.setProperty('--ui-scale', scale.toFixed(3));
  } else {
    if(hud) hud.style.zoom='';
    document.documentElement.style.setProperty('--ui-scale', 1);
    scale=Math.min((sw-32)/VIEW_W,1);
  }
  const cssW=Math.round(VIEW_W*scale), cssH=Math.round(VIEW_H*scale);
  // CSS box stays the display size (same field of view on every screen); the backing
  // store is bumped to device pixels so drawing is crisp on high-DPI displays.
  const dpr=hiDPI();
  canvas.style.width=cssW+'px';
  canvas.style.height=cssH+'px';
  canvas.width=Math.round(cssW*dpr);
  canvas.height=Math.round(cssH*dpr);
  ctx.imageSmoothingEnabled=false;      // resizing the canvas resets ctx state
  renderScale=canvas.width/VIEW_W;      // device px per logical unit (= cssScale × dpr)
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

