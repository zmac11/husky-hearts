// ====================== MOBILE CONTROLS ======================
const isTouchDevice=()=>'ontouchstart' in window||navigator.maxTouchPoints>0;
// Buttons press *actions* (not key codes) so they keep working after rebinding.
const mobileMap={'mb-up':'up','mb-down':'down','mb-left':'left','mb-right':'right','mobileHowlBtn':'action'};
function bindMobileBtn(id,action){
  const el=document.getElementById(id);if(!el)return;
  const press=e=>{e.preventDefault();Input.setVirtual(action,true);el.classList.add('pressed');};
  const release=e=>{e.preventDefault();Input.setVirtual(action,false);el.classList.remove('pressed');};
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

