// ====================== WORLD DRAWING ======================
function drawGround(){
  // multi-tone grass base
  ctx.fillStyle='#9ED87A'; ctx.fillRect(0,0,WORLD_W,WORLD_H);
  // subtle noise patches
  const rng=mulberry32(42);
  for(let i=0;i<600;i++){
    const gx=Math.floor(rng()*WORLD_W),gy=Math.floor(rng()*WORLD_H);
    const s=Math.floor(rng()*20)+8;
    ctx.fillStyle=rng()<0.5?'#8DCF6A':'#AEDE8A';
    ctx.fillRect(gx,gy,s,Math.floor(s*0.5));
  }
  // path dirt
  ctx.fillStyle='rgba(200,170,120,0.18)';
  ctx.fillRect(0,WORLD_H/2-22,WORLD_W,44);
  ctx.fillRect(WORLD_W/2-22,0,44,WORLD_H);
}

// mulberry32 (deterministic RNG) now lives in core/rng.js.

// PRE-DRAWN ground (offscreen canvas so we don't recalculate every frame)
let groundCanvas=null;
function buildGroundCanvas(){
  groundCanvas=document.createElement('canvas');
  groundCanvas.width=WORLD_W; groundCanvas.height=WORLD_H;
  const gc=groundCanvas.getContext('2d');
  gc.imageSmoothingEnabled=false;
  // Palette comes from the current level's theme (falls back to the meadow colours).
  const th=(typeof LevelManager!=='undefined'&&LevelManager.theme)||{};
  const grass=th.grass||'#9ED87A', grassDark=th.grassDark||'#8DCF6A',
        grassLight=th.grassLight||'#AADE88', dirt=th.dirt||'rgba(190,155,100,0.15)',
        fenceA=th.fenceA||'#8B6340', fenceB=th.fenceB||'#A07040', rail=th.rail||'#C4904A';
  // grass base
  gc.fillStyle=grass; gc.fillRect(0,0,WORLD_W,WORLD_H);
  const rng=mulberry32(42);
  for(let i=0;i<800;i++){
    const gx=Math.floor(rng()*WORLD_W),gy=Math.floor(rng()*WORLD_H);
    const s=Math.floor(rng()*24)+6;
    gc.fillStyle=rng()<0.5?grassDark:grassLight;
    gc.fillRect(gx,gy,s,Math.floor(s*0.45));
  }
  // subtle dirt cross-paths
  gc.fillStyle=dirt;
  gc.fillRect(0,WORLD_H/2-24,WORLD_W,48);
  gc.fillRect(WORLD_W/2-24,0,48,WORLD_H);
  // fence border
  for(let x=0;x<WORLD_W;x+=24){
    gc.fillStyle=x%48===0?fenceA:fenceB;
    gc.fillRect(x,0,12,14); gc.fillRect(x,WORLD_H-14,12,14);
  }
  for(let y=0;y<WORLD_H;y+=24){
    gc.fillStyle=y%48===0?fenceA:fenceB;
    gc.fillRect(0,y,14,12); gc.fillRect(WORLD_W-14,y,14,12);
  }
  // fence rails
  gc.fillStyle=rail;
  gc.fillRect(0,4,WORLD_W,4); gc.fillRect(0,WORLD_H-8,WORLD_W,4);
  gc.fillRect(4,0,4,WORLD_H); gc.fillRect(WORLD_W-8,0,4,WORLD_H);
}

function drawOak(x,y,variant,t){
  const sway=Math.sin(t/800+x*0.01)*1.2;
  // trunk — multi-tone bark
  px(x-5,y+2,10,28,'#6B4226');
  px(x-3,y+4,4,22,'#7A4E2D');
  px(x+2,y+6,2,18,'#5A3018');
  // roots
  px(x-9,y+26,5,6,'#6B4226'); px(x+5,y+26,4,6,'#6B4226');
  // canopy layers (3 tiers, slight sway)
  const cx=x+sway;
  // back shadow layer
  ctx.globalAlpha=0.18; px(cx-2,y-30,40,38,'#1A4A10'); ctx.globalAlpha=1;
  // tier 3 (back)
  px(cx-18,y-22,36,22,variant===0?'#3A7A2A':variant===1?'#2A6A3A':'#4A7A1A');
  px(cx-14,y-28,28,10,variant===0?'#4A8A3A':variant===1?'#3A7A4A':'#5A8A2A');
  // tier 2
  px(cx-15,y-36,30,18,variant===0?'#4A8A3A':variant===1?'#3A7A4A':'#5A8A2A');
  px(cx-10,y-40,20,10,variant===0?'#5A9A4A':variant===1?'#4A8A5A':'#6A9A3A');
  // tier 1 (top, lightest)
  px(cx-10,y-50,20,16,variant===0?'#5A9A4A':variant===1?'#4A8A5A':'#6A9A3A');
  px(cx-6,y-56,12,8,variant===0?'#6AAA5A':variant===1?'#5A9A6A':'#7AAA4A');
  // highlight pixels
  px(cx-8,y-52,4,4,'#8AC86A'); px(cx+4,y-40,3,3,'#7AB85A');
}

function drawPine(x,y,t){
  const sway=Math.sin(t/900+x*0.013)*0.8;
  const cx=x+sway;
  // trunk
  px(x-3,y+2,6,22,'#5A3A1A'); px(x-1,y+4,3,16,'#6B4226');
  // 4 tiers top to bottom
  [[0,-52,10,12,'#1A5A2A'],[-2,-40,14,16,'#1E6830'],[-4,-24,18,18,'#226E34'],[-6,-8,22,16,'#287838']].forEach(([ox,oy,w,h,c])=>{
    px(cx+ox,y+oy,w,h,c);
    px(cx+ox+2,y+oy+2,4,4,shade(c,20)); // highlight
  });
}

function drawRock(x,y,big,t){
  if(big){
    // large rock with detail
    px(x-14,y+2,28,12,'#7A7A7A');
    px(x-12,y-4,24,10,'#8A8A8A');
    px(x-8,y-9,16,8,'#969696');
    px(x-4,y-11,8,5,'#A2A2A2');
    // shadow
    ctx.globalAlpha=0.2; px(x-12,y+10,24,6,'#2A2A2A'); ctx.globalAlpha=1;
    // highlight
    px(x-8,y-6,5,3,'#C0C0C0'); px(x-2,y-9,3,2,'#D0D0D0');
    // moss patches
    px(x+4,y,4,3,'#6A9A4A'); px(x-10,y+4,3,3,'#5A8A3A');
  } else {
    px(x-9,y+2,18,8,'#888');
    px(x-7,y-2,14,7,'#999');
    px(x-4,y-5,8,5,'#A5A5A5');
    ctx.globalAlpha=0.15; px(x-8,y+8,16,4,'#222'); ctx.globalAlpha=1;
    px(x-4,y-2,3,2,'#C0C0C0');
  }
}

function drawRockCluster(x,y,seed,t){
  const r=mulberry32(Math.floor(seed));
  const offsets=[[-18,4],[-6,-2],[6,2],[14,-4],[-2,10]];
  offsets.forEach(([ox,oy])=>{
    const s=r()<0.5;
    drawRock(x+ox,y+oy,s,t);
  });
}

function pondBlobPoints(blobSeed){
  const rng=mulberry32(Math.floor(blobSeed));
  const n=10, pts=[];
  for(let i=0;i<n;i++) pts.push({ang:(i/n)*Math.PI*2, rMul:0.84+rng()*0.32});
  return pts;
}

function tracePondPath(x,y,w,h,pts,scale){
  const n=pts.length;
  const pt=i=>{
    const p=pts[(i+n)%n];
    return [x+Math.cos(p.ang)*(w/2)*p.rMul*scale, y+Math.sin(p.ang)*(h/2)*p.rMul*scale];
  };
  ctx.beginPath();
  for(let i=0;i<=n;i++){
    const [cx,cy]=pt(i), [px0,py0]=pt(i-1);
    const mx=(cx+px0)/2, my=(cy+py0)/2;
    if(i===0) ctx.moveTo(mx,my); else ctx.quadraticCurveTo(px0,py0,mx,my);
  }
  ctx.closePath();
}

function drawPond(x,y,w,h,seed,t,blobSeed){
  const pts=pondBlobPoints(blobSeed!==undefined?blobSeed:seed);
  // shadow
  ctx.globalAlpha=0.2;
  ctx.save(); ctx.translate(3,5); tracePondPath(x,y,w,h,pts,1.04); ctx.restore();
  ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;
  // water base
  tracePondPath(x,y,w,h,pts,1);
  const grad=ctx.createRadialGradient(x-w*0.15,y-h*0.15,2,x,y,Math.max(w,h)/2);
  grad.addColorStop(0,'#7DD4F0'); grad.addColorStop(0.6,'#4AACDC'); grad.addColorStop(1,'#2A7AAA');
  ctx.fillStyle=grad; ctx.fill();
  // shore edge
  ctx.strokeStyle='#3A9ABB'; ctx.lineWidth=2; ctx.stroke();
  // animated ripples
  const rphase=t/1200+seed;
  for(let i=0;i<3;i++){
    const rscale=0.28+i*0.18+Math.sin(rphase+i)*0.06;
    ctx.globalAlpha=0.25-i*0.07;
    ctx.beginPath(); ctx.ellipse(x+Math.sin(rphase+i)*w*0.04,y,w/2*rscale,h/2*rscale,0,0,Math.PI*2);
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.globalAlpha=1;
  // lily pads
  [[-.2,-.1],[.15,.2],[-.05,.3]].forEach(([fx,fy])=>{
    ctx.beginPath(); ctx.arc(x+w*fx,y+h*fy,5,0.3,Math.PI*2-0.3); ctx.fillStyle='#4A9A3A'; ctx.fill();
    ctx.fillStyle='#FF8FA3'; ctx.fillRect(x+w*fx-1,y+h*fy-6,3,4);
  });
  ctx.globalAlpha=1;
}

function drawTallGrass(x,y,blades,seed,t){
  const rng=mulberry32(Math.floor(seed*100));
  for(let i=0;i<blades;i++){
    const bx=x+(rng()-.5)*28, by=y+(rng()-.5)*16;
    const h=rand(12,22), sway=Math.sin(t/500+bx*0.08+seed)*2.5;
    const green=rng()<0.5?'#4A9A2A':'#5DAA3A';
    px(bx+sway,by-h,2,h,green);
    px(bx+sway+1,by-h,1,h*0.6,shade(green,20));
    // tip
    px(bx+sway+(sway>0?1:0),by-h-3,2,4,'#8ACA5A');
  }
}

function drawBush(x,y,variant){
  if(variant===0){
    px(x-14,y+6,28,12,'#3A7A2A');
    px(x-12,y,24,10,'#4A8A3A');
    px(x-8,y-4,16,8,'#5A9A4A');
    px(x-4,y-6,8,5,'#6AAA5A');
    // berries
    px(x-6,y+2,3,3,'#FF4466'); px(x+4,y,3,3,'#FF4466'); px(x,y+4,3,3,'#CC2244');
    // highlight
    px(x-4,y-2,4,3,'#7ABB6A');
  } else {
    px(x-12,y+6,24,10,'#2A6A3A');
    px(x-10,y+2,20,8,'#3A7A4A');
    px(x-14,y+4,6,8,'#4A8A5A');
    px(x+8,y+4,6,8,'#4A8A5A');
    px(x-6,y-2,12,6,'#5A9A5A');
    px(x-2,y-5,4,4,'#6AAA6A');
    px(x+2,y-1,4,3,'#8ABB8A'); // highlight
  }
}

function drawFlower(x,y,hue,sway,size,t){
  const sw=Math.sin(t/500+sway)*1.8*size;
  const h=8*size;
  px(x+sw,y,2*size,h,'#5A9A3A');
  // petals — 4 pixels around center
  const ps=Math.floor(4*size);
  px(x-ps+sw,y-ps,ps,ps,hue); px(x+1+sw,y-ps,ps,ps,hue);
  px(x-ps+sw,y+1,ps,ps,hue); px(x+1+sw,y+1,ps,ps,hue);
  // center
  px(x-1+sw,y-1,3,3,'#FFE566');
}

function drawWillow(x,y,t){
  const sway=Math.sin(t/1100+x*0.009)*1.5;
  // trunk — wide gnarled base
  px(x-6,y+2,12,32,'#5A3A1A');
  px(x-4,y+4,5,26,'#6B4226');
  px(x+2,y+8,3,20,'#4A2A12');
  // roots
  px(x-12,y+28,8,6,'#5A3A1A'); px(x+5,y+30,7,5,'#5A3A1A');
  // canopy base
  px(x-22,y-18,44,28,'#2E6E26');
  px(x-18,y-26,36,14,'#388A2E');
  px(x-12,y-32,24,10,'#449A38');
  // drooping fronds — cascade downward
  const frondColor='#4AAA3A';
  const frondLight='#6AC85A';
  for(let i=0;i<8;i++){
    const fx=x-20+i*6+sway*(1+i*0.2);
    const flen=18+Math.sin(i*1.3)*8;
    px(fx, y-4, 2, flen, frondColor);
    px(fx+1, y-2, 1, flen*0.7, frondLight);
    // tip curl
    px(fx+(sway>0?1:-1),y-4+flen,2,4,'#8ACA5A');
  }
  // highlight on canopy
  px(x-10,y-28,8,5,'#6AC85A'); px(x+4,y-24,5,4,'#5ABB4A');
}

function drawMushroom(x,y,big){
  if(big){
    // stem
    px(x-4,y,8,12,'#F0E8D0'); px(x-3,y+2,6,8,'#FFFAE8');
    // cap
    px(x-10,y-8,20,12,'#CC2222');
    px(x-8,y-12,16,8,'#DD3333');
    px(x-5,y-15,10,6,'#EE4444');
    // spots
    px(x-6,y-10,4,4,'#FFFFFF'); px(x+2,y-10,3,3,'#FFFFFF');
    px(x-2,y-7,3,3,'#FFFFFF');
    // highlight
    px(x-6,y-13,3,2,'#FF8888');
  } else {
    px(x-2,y,5,7,'#F0E8D0');
    px(x-6,y-4,12,7,'#AA1111');
    px(x-4,y-7,8,5,'#CC2222');
    px(x-3,y-5,2,3,'#FFFFFF'); px(x+1,y-5,2,2,'#FFFFFF');
  }
}

function drawMushroomRing(x,y,seed){
  const rng=mulberry32(Math.floor(seed*77));
  const offsets=[[-14,-4],[-8,8],[0,-10],[8,6],[14,-2],[4,12],[-6,-8]];
  offsets.forEach(([ox,oy])=>{
    if(rng()<0.7) drawMushroom(x+ox,y+oy,rng()<0.3);
  });
}

function drawStonePath(x1,y1,x2,y2,seed){
  // draw a row of stone tiles between two points
  const rng=mulberry32(Math.floor(seed*31));
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),steps=Math.ceil(len/28);
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const sx=x1+dx*t+( rng()-.5)*6;
    const sy=y1+dy*t+(rng()-.5)*6;
    const w=Math.floor(rng()*8)+14, h=Math.floor(rng()*5)+8;
    const g=Math.floor(rng()*30)+140;
    const col=`#${g.toString(16).padStart(2,'0').repeat(3)}`;
    px(sx-w/2,sy-h/2,w,h,col);
    px(sx-w/2+2,sy-h/2+2,Math.floor(w*0.4),Math.floor(h*0.4),`#${Math.min(255,g+20).toString(16).padStart(2,'0').repeat(3)}`);
    // crack detail
    ctx.globalAlpha=0.25;
    px(sx,sy-h/4,1,h/2,'#666'); ctx.globalAlpha=1;
  }
}

function drawStoneBridge(x,y,horizontal,span){
  // solid masonry bridge: deck slab + thick parapets + bank piers, drawn in a
  // "spans left-right" local frame, then rotated for the (always vertical) river crossings.
  // HW (half-length) is sized by the caller to fully cross the river at this spot.
  const HW=span||30, HH=15;
  ctx.save();
  ctx.translate(x,y);
  if(!horizontal) ctx.rotate(Math.PI/2);

  const stone='#9B9B92', stoneLight='#C4C4B8', stoneDark='#7C7C73', stoneDeep='#5A584F';
  const mortar='rgba(56,52,44,0.4)';

  // shadow cast on the water, suggesting the deck is raised above it
  ctx.fillStyle='rgba(18,42,56,0.32)';
  ctx.fillRect(Math.round(-HW+3),Math.round(HH-3),HW*2-6,6);

  // stone abutment piers anchoring the bridge into the banks
  px(-HW-2,-HH+3,8,HH*2-6,stoneDeep);
  px(HW-6, -HH+3,8,HH*2-6,stoneDeep);
  px(-HW-1,-HH+4,3,HH*2-8,stoneDark);
  px(HW-5, -HH+4,3,HH*2-8,stoneDark);

  // deck slab — solid stone with a gentle sunlit camber
  px(-HW,-7,HW*2,14,stone);
  px(-HW,-7,HW*2,3,stoneLight);
  px(-HW,4, HW*2,3,stoneDeep);
  for(let i=-HW+10;i<HW-6;i+=10){ ctx.fillStyle=mortar; ctx.fillRect(Math.round(i),-7,1,14); }

  // thick parapet walls along both edges, with coping stones on top
  [-HH+1, HH-7].forEach(py=>{
    px(-HW,py,HW*2,6,stoneDark);
    px(-HW,py-1,HW*2,2,stoneLight);
    px(-HW,py+5,HW*2,1,stoneDeep);
    for(let i=-HW+8;i<HW-6;i+=11){ ctx.fillStyle=mortar; ctx.fillRect(Math.round(i),py,1,6); }
  });

  ctx.restore();
}

function drawBridge(x,y,horizontal,t,material,span){
  if(material==='stone'){
    drawStoneBridge(x,y,horizontal,span);
    return;
  }
  // wooden bridge over a pond
  const plankCol='#A07040', darkPlank='#8B5E30', rail='#7A4E28';
  if(horizontal){
    // deck planks
    for(let i=0;i<5;i++){
      px(x-27+i*11,y-6,9,12,i%2===0?plankCol:darkPlank);
      px(x-27+i*11+1,y-5,4,2,'#C09050'); // highlight
    }
    // rails top and bottom
    px(x-28,y-8,56,4,rail); px(x-28,y+6,56,4,rail);
    // posts
    [x-26,x-2,x+22].forEach(px2=>{ px(px2,y-10,4,20,rail); });
  } else {
    for(let i=0;i<5;i++){
      px(x-6,y-27+i*11,12,9,i%2===0?plankCol:darkPlank);
      px(x-5,y-27+i*11+1,2,4,'#C09050');
    }
    px(x-8,y-28,4,56,rail); px(x+6,y-28,4,56,rail);
    [y-26,y-2,y+22].forEach(py=>{ px(x-8,py,20,4,rail); });
  }
}


function drawRiver(t){
  if(!river) return;
  const steps=120, dx=WORLD_W/steps;

  // soft sandy/muddy bank halo where the water meets the grass
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const x=i*dx, y=riverY(x)-riverWidthAt(x)/2-9;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for(let i=steps;i>=0;i--){
    const x=i*dx, y=riverY(x)+riverWidthAt(x)/2+9;
    ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle='rgba(196,168,116,0.55)';
  ctx.fill();

  // water body — width breathes wider/narrower along its length
  ctx.beginPath();
  for(let i=0;i<=steps;i++){
    const x=i*dx, y=riverY(x)-riverWidthAt(x)/2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for(let i=steps;i>=0;i--){
    const x=i*dx, y=riverY(x)+riverWidthAt(x)/2;
    ctx.lineTo(x,y);
  }
  ctx.closePath();

  const halfSpan=(river.baseWidth+river.widthAmp*1.4)/2+4;
  const minY=river.pos-river.amplitude-river.amplitude2-halfSpan;
  const maxY=river.pos+river.amplitude+river.amplitude2+halfSpan;
  const grad=ctx.createLinearGradient(0,minY,0,maxY);
  grad.addColorStop(0,   '#82CDEE');
  grad.addColorStop(0.12,'#7DD4F0');
  grad.addColorStop(0.5, '#4AACDC');
  grad.addColorStop(0.88,'#2E80AC');
  grad.addColorStop(1,   '#235F80');
  ctx.fillStyle=grad; ctx.fill();

  // shore lines
  ctx.strokeStyle='#3A9ABB'; ctx.lineWidth=2;
  for(let edge=0;edge<2;edge++){
    const sign=edge===0?-1:1;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const x=i*dx, y=riverY(x)+sign*riverWidthAt(x)/2;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // animated ripple lines, scaled to the local width
  const rphase=t/1800;
  for(let ri=0;ri<3;ri++){
    ctx.globalAlpha=0.18-ri*0.05;
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const x=i*dx, w=riverWidthAt(x);
      const y=riverY(x)+(ri-1)*w*0.27+Math.sin(x/200+rphase+ri)*4;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha=1;

  // pebbles scattered along the banks
  (river.pebbles||[]).forEach(p=>{
    if(p.big){ px(p.x-4,p.y-2,8,5,'#8C8C82'); px(p.x-3,p.y-3,5,3,'#A6A69A'); }
    else     { px(p.x-2,p.y-1,4,3,'#9A9A8E'); }
  });

  // gentle foam flecks sparkling near the edges
  const fphase=t/700;
  for(let i=0;i<=steps;i+=3){
    const x=i*dx, w=riverWidthAt(x), cy=riverY(x);
    const s=Math.sin(x*0.05+fphase);
    if(s>0.6){
      ctx.globalAlpha=(s-0.6)*1.6;
      ctx.fillStyle='#EAFBFF';
      ctx.fillRect(Math.round(x),Math.round(cy-w/2+4),2,2);
      ctx.fillRect(Math.round(x+4),Math.round(cy+w/2-5),2,2);
    }
  }
  ctx.globalAlpha=1;
}

function drawWorld(t){
  // ground (pre-rendered)
  if(groundCanvas) ctx.drawImage(groundCanvas,0,0);
  else { ctx.fillStyle='#9ED87A'; ctx.fillRect(0,0,WORLD_W,WORLD_H); }

  drawRiver(t);

  // draw all world objects in y-sorted order
  worldObjects.forEach(obj=>{
    switch(obj.kind){
      case 'flower':      drawFlower(obj.x,obj.y,obj.hue,obj.sway,obj.size,t); break;
      case 'tallgrass':   drawTallGrass(obj.x,obj.y,obj.blades,obj.seed,t); break;
      case 'pond':        drawPond(obj.x,obj.y,obj.w,obj.h,obj.seed,t,obj.blobSeed); break;
      case 'bush':        drawBush(obj.x,obj.y,obj.variant); break;
      case 'rock':        drawRock(obj.x,obj.y,obj.big,t); break;
      case 'rockcluster': drawRockCluster(obj.x,obj.y,obj.seed,t); break;
      case 'oak':         drawOak(obj.x,obj.y,obj.variant,t); break;
      case 'pine':        drawPine(obj.x,obj.y,t); break;
      case 'willow':      drawWillow(obj.x,obj.y,t); break;
      case 'mushroom':    drawMushroom(obj.x,obj.y,obj.big); break;
      case 'mushroomring':drawMushroomRing(obj.x,obj.y,obj.seed); break;
      case 'stonepath':   drawStonePath(obj.x1,obj.y1,obj.x2,obj.y2,obj.seed); break;
      case 'bridge':      drawBridge(obj.x,obj.y,obj.horizontal,t,'wood'); break;
      // 'riverbridge' intentionally not drawn here — layered in main.js so swimmers can pass underneath
    }
  });
}

