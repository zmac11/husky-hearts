// ====================== TOAST ======================
let toastTimer=null;
function showToast(msg,time=2200){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),time);
}

