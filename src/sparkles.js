// ====================== SPARKLES ======================
function drawSparkles(){
  sparkles.forEach(s=>{
    ctx.save(); ctx.globalAlpha=Math.max(0,s.life/s.maxLife);
    ctx.fillStyle=s.color; ctx.fillRect(Math.round(s.x),Math.round(s.y),s.size,s.size);
    ctx.restore();
  });
}

