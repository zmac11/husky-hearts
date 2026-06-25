// ====================== MOBILE CONTROLS ======================
const isTouchDevice=()=>'ontouchstart' in window||navigator.maxTouchPoints>0;
const mobileMap={'mb-up':'KeyW','mb-down':'KeyS','mb-left':'KeyA','mb-right':'KeyD','mobileHowlBtn':'Space'};
function bindMobileBtn(id,code){
  const el=document.getElementById(id);if(!el)return;
  const press=e=>{e.preventDefault();keys[code]=true;el.classList.add('pressed');};
  const release=e=>{e.preventDefault();keys[code]=false;el.classList.remove('pressed');};
  el.addEventListener('touchstart',press,{passive:false});
  el.addEventListener('touchend',release,{passive:false});
  el.addEventListener('touchcancel',release,{passive:false});
  el.addEventListener('mousedown',press);el.addEventListener('mouseup',release);el.addEventListener('mouseleave',release);
}
Object.entries(mobileMap).forEach(([id,code])=>bindMobileBtn(id,code));
function showMobileControls(show){
  document.getElementById('mobileControls').style.display=show?'flex':'none';
  document.getElementById('controls').style.display=show?'none':'flex';
}

