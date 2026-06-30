// ====================== COLLECTIBLES ======================
function drawCollectible(item,t){
  if(item.taken) return;
  const bob  = Math.sin(t/320 + item.bob) * 4;
  const pulse= 1 + Math.sin(t/260 + item.bob) * 0.1; // gentle scale throb
  const x = item.x, y = item.y + bob;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);

  // ---- dark badge background so it pops against any ground ----
  ctx.fillStyle = 'rgba(20,15,10,0.55)';
  roundRect(-13,-13,26,26,6,true,false);

  // ---- bright outer glow ring ----
  const glowColors = {bone:'#FFF0A0', heart:'#FF4466', ball:'#FFD93D', flower:'#D0A0FF', fish:'#4AC8FF'};
  ctx.strokeStyle = glowColors[item.type] || '#FFD93D';
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.55 + Math.sin(t/260+item.bob)*0.25;
  roundRect(-13,-13,26,26,6,false,true);
  ctx.globalAlpha = 1;

  // ---- icon ----
  if(item.type==='bone'){
    // bright cream, thick, unmistakable cross-bone shape
    ctx.fillStyle='#FFF8E8';
    // shaft
    ctx.fillRect(-8,-3,16,6);
    // four knobs
    [[-10,-7],[-10,1],[4,-7],[4,1]].forEach(([kx,ky])=>{
      ctx.fillRect(kx,ky,7,7);
    });
    // shine
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-7,-2,5,2);
  } else if(item.type==='heart'){
    ctx.fillStyle='#FF3355';
    // chunky heart — two squares + diamond
    ctx.fillRect(-8,-8,7,7); ctx.fillRect(1,-8,7,7);
    ctx.fillRect(-9,-2,18,5);
    ctx.fillRect(-7,3,14,4);
    ctx.fillRect(-4,7,8,3);
    ctx.fillRect(-1,10,3,2);
    // highlight
    ctx.fillStyle='#FF99AA';
    ctx.fillRect(-6,-7,3,3); ctx.fillRect(3,-7,3,3);
  } else if(item.type==='ball'){
    // bright yellow ball with pink stripe
    ctx.fillStyle='#FFE020';
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FF7090';
    ctx.fillRect(-9,-2,18,4);
    // white shine
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-5,-6,4,3);
  } else if(item.type==='flower'){
    // bright purple petals + gold center, very distinct
    ctx.fillStyle='#CC88FF';
    [[-6,-6],[0,-8],[6,-6],[8,0],[6,6],[0,8],[-6,6],[-8,0]].forEach(([px2,py])=>{
      ctx.fillRect(px2-2,py-2,5,5);
    });
    ctx.fillStyle='#FFE020';
    ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFFFFF';
    ctx.fillRect(-1,-2,2,2);
  } else if(item.type==='fish'){
    ctx.save();
    ctx.scale(item.dir||1,1);
    // body
    ctx.fillStyle='#FF9E4A';
    ctx.beginPath(); ctx.ellipse(0,0,8,5,0,0,Math.PI*2); ctx.fill();
    // belly
    ctx.fillStyle='#FFD79A';
    ctx.beginPath(); ctx.ellipse(0,2,6,2.5,0,0,Math.PI*2); ctx.fill();
    // tail
    ctx.fillStyle='#FF7A2E';
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-14,-5); ctx.lineTo(-14,5); ctx.closePath(); ctx.fill();
    // eye
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(4,-1,1.3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

