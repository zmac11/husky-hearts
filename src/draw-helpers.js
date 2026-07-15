// ====================== DRAW HELPERS ======================
// Device-pixel-ratio for crisp rendering on high-DPI screens, capped at 2× (2× removes
// virtually all blur; 3–4× costs a lot of fill for diminishing returns). Every canvas
// sizes its backing store to logical×hiDPI() and scales its context by the same factor,
// so draw code keeps working in logical coordinates. See fullscreen.js / world-map.js.
function hiDPI(){ return Math.min(window.devicePixelRatio || 1, 2); }

function px(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),w,h); }

function shade(hex,p){
  const n=parseInt(hex.replace('#',''),16);
  const r=clamp((n>>16)+p,0,255),g=clamp(((n>>8)&255)+p,0,255),b=clamp((n&255)+p,0,255);
  return '#'+(r<<16|g<<8|b).toString(16).padStart(6,'0');
}

function roundRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}

