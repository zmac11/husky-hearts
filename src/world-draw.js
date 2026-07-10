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

// ---- meadow ambient life & props (Sunny Meadows biome) ----
function drawCattail(x,y,seed,t){
  const r=mulberry32(Math.floor(seed*61)+1);
  const n=3+Math.floor(r()*3);
  for(let i=0;i<n;i++){
    const bx=x+(r()-0.5)*11, by=y+(r()-0.5)*4;
    const h=16+r()*10, sway=Math.sin(t/600+bx*0.1+seed)*2;
    px(bx-3+sway*0.6, by-h*0.7, 2, 8, '#4E8A3A');       // leaf blade
    px(bx+sway,   by-h, 2, h, '#4E8A3A');                // stalk
    px(bx+sway+1, by-h, 1, Math.floor(h*0.6), '#5FA048');
    px(bx-1+sway, by-h+3, 4, 8, '#7A4A26');              // brown cattail head
    px(bx+sway,   by-h+4, 2, 6, '#93602F');
  }
}

function drawLog(x,y,seed){
  const r=mulberry32(Math.floor(seed*47)+1);
  ctx.globalAlpha=0.2; px(x-16,y+6,32,4,'#2A2018'); ctx.globalAlpha=1;
  px(x-16,y-4,32,10,'#6B4A2E');                          // bark body
  px(x-16,y-4,32,3,'#7C5636');                           // top-lit
  px(x-16,y+4,32,2,'#4E3420');                           // underside shade
  ctx.globalAlpha=0.3; for(let i=-12;i<12;i+=6) px(x+i,y-2,1,7,'#3E2A18'); ctx.globalAlpha=1;
  px(x-18,y-4,3,10,'#8A6242');                           // shaded cut end
  px(x+15,y-4,3,10,'#C79B6A');                           // lit cut end + rings
  px(x+16,y-2,1,6,'#8A6242'); px(x+16,y-1,1,4,'#A87C4E');
  if(r()<0.8){ px(x-6,y-5,6,2,'#6A9A4A'); px(x+2,y-5,4,2,'#5A8A3A'); } // moss
}

function drawStump(x,y){
  ctx.globalAlpha=0.2; px(x-8,y+5,16,4,'#2A2018'); ctx.globalAlpha=1;
  px(x-8,y-2,16,9,'#6B4A2E'); px(x-8,y+5,16,2,'#4E3420');
  px(x-8,y-2,3,9,'#7C5636'); px(x+5,y-2,3,9,'#523620');
  ctx.globalAlpha=0.3; px(x-3,y-1,1,7,'#3E2A18'); px(x+1,y-1,1,7,'#3E2A18'); ctx.globalAlpha=1;
  px(x-8,y-5,16,4,'#A87C4E'); px(x-6,y-4,12,2,'#C79B6A');    // top cut
  ctx.strokeStyle='#8A6242'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(x,y-3,4,1.6,0,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x,y-3,2,0.9,0,0,Math.PI*2); ctx.stroke();
  px(x+4,y-6,1,3,'#5FA048'); px(x-5,y-6,1,3,'#5FA048');      // grass sprouts
}

function drawButterfly(x,y,hue,seed,t){
  // loops gently around its home point; wings pulse with the beat
  const ph=seed;
  const fx=x+Math.sin(t/900+ph)*18+Math.cos(t/430+ph)*6;
  const fy=y+Math.cos(t/760+ph)*12+Math.sin(t/380+ph)*5;
  const ww=2+Math.abs(Math.sin(t/70+ph))*3, dark=shade(hue,-45);
  ctx.globalAlpha=0.12; ctx.beginPath(); ctx.ellipse(x,y+2,4,1.5,0,0,Math.PI*2); ctx.fillStyle='#2A3A2A'; ctx.fill(); ctx.globalAlpha=1;
  const bx=Math.round(fx), by=Math.round(fy);
  px(bx,by-3,1,6,dark);                                  // body
  ctx.fillStyle=hue;                                     // wings
  ctx.fillRect(Math.round(bx-1-ww),by-3,Math.round(ww),3);
  ctx.fillRect(bx+1,by-3,Math.round(ww),3);
  ctx.fillRect(Math.round(bx-1-ww*0.8),by,Math.round(ww*0.8),3);
  ctx.fillRect(bx+1,by,Math.round(ww*0.8),3);
  ctx.fillStyle=dark;
  ctx.fillRect(Math.round(bx-1-ww),by-3,1,6); ctx.fillRect(Math.round(bx+ww),by-3,1,6);
  px(bx-1,by-4,1,1,dark); px(bx+1,by-4,1,1,dark);        // antennae
}

// Expanding ripple ring drawn under a floating (aquatic) entity like a duck or loon —
// they sit naturally on the surface, so they just need a light wake, not submersion.
function drawWaterRipple(x,y,t){
  ctx.save();
  ctx.strokeStyle='#E8FBFF'; ctx.lineWidth=1;
  const p=(t/600+x*0.01)%1;
  ctx.globalAlpha=(1-p)*0.55; ctx.beginPath(); ctx.ellipse(x,y+7,7+p*7,3+p*3,0,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=0.28;       ctx.beginPath(); ctx.ellipse(x,y+8,11,4,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}

// Full "swimming" treatment for a land creature that's entered the water — same look as
// the dog: the lower body is clipped away below a waterline, and a water disc + expanding
// ripples sit over it. `drawFn` paints the creature's normal sprite at (x,y).
function drawSwimming(x,y,t,drawFn){
  const wl=Math.round(y)+3;                        // waterline across the body
  ctx.save();
  ctx.beginPath(); ctx.rect(x-34, y-46, 68, wl-(y-46)); ctx.clip();   // keep only above the waterline
  drawFn();
  ctx.restore();
  const sw=Math.sin(t/600+x*0.05)*3;
  // water disc over the submerged lower body
  ctx.globalAlpha=0.72;
  ctx.beginPath(); ctx.ellipse(x+sw*0.3, wl, 15, 5.5, 0, 0, Math.PI*2);
  const wg=ctx.createRadialGradient(x-4,wl-2,1,x,wl,15);
  wg.addColorStop(0,'#9CE4FF'); wg.addColorStop(1,'#3AAACC');
  ctx.fillStyle=wg; ctx.fill();
  ctx.globalAlpha=1;
  // animated expanding ripples
  for(let i=0;i<3;i++){
    const phase=((t/1000+i/3)%1), rs=1+phase*1.6;
    ctx.globalAlpha=0.34*(1-phase);
    ctx.beginPath(); ctx.ellipse(x+sw*0.3, wl, 15*rs, 5.5*rs, 0, 0, Math.PI*2);
    ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=1.5; ctx.stroke();
  }
  ctx.globalAlpha=1;
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

// ====================== ROCKY-MOUNTAIN ASSETS ======================
// Renderers for the second level's theme. Registered into the drawWorld() switch and
// spawned by levels/rocky.js. Same pixel-art idiom (px/shade + a little canvas path work).

function drawMountain(x,y,w,h,seed){
  // A majestic Canadian-Rockies massif: a jagged multi-peak ridgeline over a granite
  // body with rock strata, a dark evergreen tree-line skirt at the base, and only thin
  // snow veins in the summit couloirs (no big white cap). `y` is the base; apex at y-h.
  const r=mulberry32(Math.floor((seed||7)+1));
  const half=w/2;
  const rockLit='#9B978C', rock='#84817A', rockDark='#615E58', haze='#B7C1CB';
  const forest='#2C5633', forestLt='#3B6C40', snow='#EEF4F7';

  // base cast shadow to ground the massif
  ctx.globalAlpha=0.16; ctx.beginPath(); ctx.ellipse(x,y+4,half*0.92,10,0,0,Math.PI*2); ctx.fillStyle='#20241E'; ctx.fill(); ctx.globalAlpha=1;

  // atmospheric haze silhouette behind the massif
  ctx.globalAlpha=0.32;
  ctx.beginPath(); ctx.moveTo(x-half*1.04,y);
  ctx.lineTo(x-half*0.42,y-h*0.92); ctx.lineTo(x,y-h*1.03); ctx.lineTo(x+half*0.46,y-h*0.84); ctx.lineTo(x+half*1.04,y);
  ctx.closePath(); ctx.fillStyle=haze; ctx.fill(); ctx.globalAlpha=1;

  // jagged ridgeline: main summit (slightly left) + col + a secondary summit
  const apexX=x-half*0.12;
  const ridge=[
    [x-half, y],
    [x-half*0.62, y-h*0.48-r()*h*0.05],
    [x-half*0.34, y-h*0.34],
    [apexX, y-h],
    [x-half*0.02, y-h*0.70],
    [x+half*0.20, y-h*0.84-r()*h*0.04],
    [x+half*0.50, y-h*0.48],
    [x+half*0.74, y-h*0.26],
    [x+half, y],
  ];
  ctx.beginPath(); ctx.moveTo(ridge[0][0],ridge[0][1]);
  for(let i=1;i<ridge.length;i++) ctx.lineTo(ridge[i][0],ridge[i][1]);
  ctx.closePath();
  const grad=ctx.createLinearGradient(0,y-h,0,y);
  grad.addColorStop(0,rockLit); grad.addColorStop(0.5,rock); grad.addColorStop(1,rockDark);
  ctx.fillStyle=grad; ctx.fill();

  // clip to the body for shading + strata
  ctx.save(); ctx.clip();
  // shadowed right faces (wedge from the main apex down to the right base)
  ctx.beginPath(); ctx.moveTo(apexX,y-h); ctx.lineTo(x+half,y); ctx.lineTo(apexX,y); ctx.closePath();
  ctx.fillStyle='rgba(66,64,58,0.34)'; ctx.fill();
  // horizontal rock strata bands
  ctx.strokeStyle='rgba(58,54,48,0.26)'; ctx.lineWidth=2;
  for(let i=1;i<=5;i++){ const yy=y-(h*i/6); ctx.beginPath(); ctx.moveTo(x-half,yy+9); ctx.lineTo(x+half,yy-7); ctx.stroke(); }
  // scree flecks near the base
  ctx.fillStyle='rgba(48,46,42,0.4)';
  for(let i=0;i<14;i++){ ctx.fillRect(Math.round(x-half+r()*w), Math.round(y-r()*h*0.4), 2, 2); }
  ctx.restore();

  // thin snow veins in the summit gullies (subtle — no full cap)
  ctx.strokeStyle=snow; ctx.lineCap='round'; ctx.globalAlpha=0.9;
  ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(apexX,y-h+2);      ctx.lineTo(apexX-4,y-h*0.56); ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(apexX+3,y-h+4);    ctx.lineTo(apexX+9,y-h*0.6);  ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+half*0.2,y-h*0.84+2); ctx.lineTo(x+half*0.16,y-h*0.56); ctx.stroke();
  ctx.globalAlpha=1;
  ctx.fillStyle=snow; ctx.beginPath(); ctx.arc(apexX,y-h+3,2.6,0,Math.PI*2); ctx.fill();

  // evergreen tree-line skirt along the foot of the mountain
  const baseY=y-1;
  for(let fx=x-half+8; fx<x+half-8; fx+=9){
    const th=8+r()*8, c=r()<0.5?forest:forestLt;
    ctx.beginPath(); ctx.moveTo(fx,baseY); ctx.lineTo(fx+4,baseY-th); ctx.lineTo(fx+8,baseY); ctx.closePath();
    ctx.fillStyle=c; ctx.fill();
  }
}

function drawBoulder(x,y,big){
  // Chunky mountain boulder — bigger and cooler-grey than the meadow rocks.
  if(big){
    ctx.globalAlpha=0.22; px(x-18,y+9,36,7,'#22201C'); ctx.globalAlpha=1;
    px(x-18,y+2,36,14,'#736F68');
    px(x-15,y-6,30,12,'#847F77');
    px(x-10,y-13,20,10,'#948F86');
    px(x-4,y-16,10,6,'#A29C92');
    px(x-11,y-8,7,4,'#B4AEA3');           // highlight
    px(x+6,y-2,5,4,'#5E5A54');            // shade pocket
    px(x-14,y+4,5,3,'#5A8A4A');           // moss
    px(x+9,y+3,4,3,'#6A9A4A');
    px(x-2,y-13,3,3,'#A9C089');           // pale lichen on top
  } else {
    ctx.globalAlpha=0.18; px(x-11,y+7,22,5,'#22201C'); ctx.globalAlpha=1;
    px(x-11,y,22,10,'#7C7770');
    px(x-8,y-5,16,8,'#8C877E');
    px(x-3,y-8,8,5,'#9A948A');
    px(x-6,y-4,4,3,'#B0AAA0');
    px(x-2,y-8,3,2,'#9FB884');           // lichen fleck
  }
}

function drawSnowyPine(x,y,t){
  // Lush Canadian evergreen (spruce/fir) with just a light dusting on the crown.
  const sway=Math.sin(t/1000+x*0.012)*0.7;
  const cx=x+sway;
  // trunk
  px(x-3,y+2,6,20,'#4A3320'); px(x-1,y+4,3,14,'#5A4028');
  // full green tiers with a sunlit highlight
  [[0,-50,10,12,'#1E5A2C'],[-2,-38,14,16,'#22662F'],[-4,-22,18,18,'#2A7238'],[-6,-6,22,16,'#308040']].forEach(([ox,oy,w,h,c])=>{
    px(cx+ox,y+oy,w,h,c);
    px(cx+ox+2,y+oy+2,4,4,shade(c,20));            // sunlit highlight
    px(cx+ox+w-4,y+oy+3,3,Math.max(2,h-6),shade(c,-16)); // shaded side
  });
  // faint snow dusting only on the very crown
  px(cx-1,y-54,4,4,'#E6F1EC');
  px(cx-3,y-49,3,2,'rgba(238,244,247,0.75)');
}

function drawDeadTree(x,y,t){
  const sway=Math.sin(t/1300+x*0.01)*1.2;
  const cx=x+sway;
  // pale weathered trunk
  px(x-4,y+2,8,26,'#6B5C4A'); px(x-2,y+4,3,20,'#7C6C58'); px(x+2,y+6,2,16,'#54473A');
  px(x-8,y+24,5,5,'#5C4E3E'); px(x+4,y+24,5,5,'#5C4E3E'); // roots
  // bare branches
  ctx.strokeStyle='#6B5C4A'; ctx.lineWidth=2.5; ctx.lineCap='round';
  const branch=(bx,by,ex,ey)=>{ ctx.beginPath(); ctx.moveTo(cx+bx,y+by); ctx.lineTo(cx+ex,y+ey); ctx.stroke(); };
  branch(0,-2,-12,-16); branch(-8,-11,-16,-22); branch(0,-6,10,-20); branch(6,-14,15,-24);
  branch(0,-10,-2,-28); branch(-1,-22,-8,-32); branch(1,-22,7,-33);
  ctx.lineWidth=1.5;
  branch(-12,-16,-18,-20); branch(10,-20,16,-18); branch(-2,-28,-6,-36); branch(1,-28,5,-37);
  // a little snow catching on the limbs
  ctx.fillStyle='#E6EEF4'; px(cx-15,y-23,3,2,'#E6EEF4'); px(cx+13,y-25,3,2,'#E6EEF4'); px(cx-1,y-34,3,2,'#E6EEF4');
}

function drawCrystal(x,y,seed,t){
  // A little cluster of glowing gemstones poking out of the rock.
  const r=mulberry32(Math.floor((seed||1)*53));
  const hue=r()<0.5?['#7EC8FF','#4A9AE0','#BFE6FF']:['#C79BFF','#8A5AD0','#E4CCFF'];
  const pulse=0.5+Math.sin(t/380+seed)*0.5;
  // glow
  ctx.save(); ctx.globalAlpha=0.20+pulse*0.22;
  ctx.beginPath(); ctx.arc(x,y-4,13,0,Math.PI*2); ctx.fillStyle=hue[0]; ctx.fill();
  ctx.restore();
  const shard=(ox,oy,w,h)=>{
    ctx.beginPath(); ctx.moveTo(x+ox,y+oy); ctx.lineTo(x+ox-w/2,y+oy+h*0.5); ctx.lineTo(x+ox,y+oy+h); ctx.lineTo(x+ox+w/2,y+oy+h*0.5); ctx.closePath();
    ctx.fillStyle=hue[1]; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+ox,y+oy); ctx.lineTo(x+ox,y+oy+h); ctx.lineTo(x+ox+w/2,y+oy+h*0.5); ctx.closePath();
    ctx.fillStyle=hue[0]; ctx.fill();
    px(x+ox-1,y+oy+2,1,Math.max(2,h-6),hue[2]);   // sparkle streak
  };
  shard(-5,-6,6,14); shard(4,-9,7,17); shard(0,-2,5,11);
  ctx.globalAlpha=0.6+pulse*0.4; px(x+3,y-8,1,1,'#FFFFFF'); px(x-4,y-3,1,1,'#FFFFFF'); ctx.globalAlpha=1;
}

function drawSnowPatch(x,y,seed){
  // Soft irregular snow drift on the ground (no collider).
  const r=mulberry32(Math.floor((seed||1)*97));
  ctx.fillStyle='rgba(238,244,248,0.9)';
  ctx.beginPath();
  const n=8;
  for(let i=0;i<=n;i++){ const a=(i/n)*Math.PI*2, rad=(10+r()*8); const px0=x+Math.cos(a)*rad*1.5, py0=y+Math.sin(a)*rad*0.5; if(i===0)ctx.moveTo(px0,py0); else ctx.lineTo(px0,py0); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(x-3,y-2,8,3,0,0,Math.PI*2); ctx.fill();
}

function drawCampfire(x,y,t){
  // Ring of stones + flickering flames + warm glow — a cozy landmark on the cold peaks.
  const glow=0.4+Math.sin(t/160)*0.12+Math.sin(t/90)*0.06;
  ctx.save(); ctx.globalAlpha=0.22*glow*2; ctx.beginPath(); ctx.arc(x,y-4,26,0,Math.PI*2);
  const g=ctx.createRadialGradient(x,y-4,2,x,y-4,26); g.addColorStop(0,'#FFC65A'); g.addColorStop(1,'rgba(255,150,40,0)');
  ctx.fillStyle=g; ctx.fill(); ctx.restore();
  // stone ring
  [[-12,4],[-6,7],[2,8],[9,5],[12,-1],[-13,-1]].forEach(([ox,oy],i)=>{ px(x+ox-2,y+oy-2,7,5,i%2?'#7C7770':'#8C877E'); px(x+ox-1,y+oy-2,3,2,'#A6A29B'); });
  // logs
  px(x-7,y+2,14,3,'#5A4028'); px(x-2,y-1,12,3,'#4A3320');
  // flames (layered flicker)
  const f=Math.sin(t/70)*2, f2=Math.sin(t/110+1)*2;
  ctx.beginPath(); ctx.moveTo(x-6,y+2); ctx.quadraticCurveTo(x-4+f,y-10,x,y-16-f); ctx.quadraticCurveTo(x+5-f,y-9,x+6,y+2); ctx.closePath(); ctx.fillStyle='#FF7A2E'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-4,y+2); ctx.quadraticCurveTo(x-2+f2,y-7,x,y-12-f2); ctx.quadraticCurveTo(x+3-f2,y-6,x+4,y+2); ctx.closePath(); ctx.fillStyle='#FFB43C'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-2,y+1); ctx.quadraticCurveTo(x,y-4,x,y-8-f); ctx.quadraticCurveTo(x+2,y-4,x+2,y+1); ctx.closePath(); ctx.fillStyle='#FFE79A'; ctx.fill();
  // sparks
  px(x-1,Math.round(y-18-f*2),1,1,'#FFD36A'); px(x+3,Math.round(y-14+f2),1,1,'#FFE79A');
}

function drawLake(x,y,w,h,seed,t,blobSeed){
  // A big glacial lake — vivid turquoise fading to deep teal, ringed by a pebbly shore,
  // with drifting light bands and sun glints. Uses the pond blob path for a natural edge.
  const pts=pondBlobPoints(blobSeed!==undefined?blobSeed:seed);
  const r=mulberry32(Math.floor((seed||1)*131)+7);
  // pebbly gravel shore halo
  tracePondPath(x,y,w,h,pts,1.14); ctx.fillStyle='rgba(158,146,122,0.55)'; ctx.fill();
  tracePondPath(x,y,w,h,pts,1.07); ctx.fillStyle='rgba(198,188,166,0.5)'; ctx.fill();
  // depth shadow offset
  ctx.globalAlpha=0.18; ctx.save(); ctx.translate(3,5); tracePondPath(x,y,w,h,pts,1.02); ctx.restore();
  ctx.fillStyle='#15343C'; ctx.fill(); ctx.globalAlpha=1;
  // glacial water body
  tracePondPath(x,y,w,h,pts,1);
  const grad=ctx.createRadialGradient(x-w*0.12,y-h*0.16,4,x,y,Math.max(w,h)/2);
  grad.addColorStop(0,'#9CF0E4'); grad.addColorStop(0.42,'#40CAC4'); grad.addColorStop(0.78,'#1F97AA'); grad.addColorStop(1,'#15708A');
  ctx.fillStyle=grad; ctx.fill();
  // shoreline stroke
  ctx.strokeStyle='#2FB6B0'; ctx.lineWidth=2; ctx.stroke();
  // drifting ripple bands
  const rphase=t/1400+seed;
  for(let i=0;i<4;i++){
    const rs=0.22+i*0.16+Math.sin(rphase+i)*0.05;
    ctx.globalAlpha=0.22-i*0.045;
    ctx.beginPath(); ctx.ellipse(x+Math.sin(rphase+i)*w*0.03,y,w/2*rs,h/2*rs,0,0,Math.PI*2);
    ctx.strokeStyle='#CFF7F0'; ctx.lineWidth=1; ctx.stroke();
  }
  ctx.globalAlpha=1;
  // sparkling sun glints
  const gp=t/500;
  for(let i=0;i<6;i++){
    const gx=x+(r()-0.5)*w*0.62, gy=y+(r()-0.5)*h*0.5, s=Math.sin(gp+i*1.7);
    if(s>0.55){ ctx.globalAlpha=(s-0.55)*1.6; ctx.fillStyle='#F0FFFB'; ctx.fillRect(Math.round(gx),Math.round(gy),2,2); }
  }
  ctx.globalAlpha=1;
}

function drawWaterfall(x,y,t,h){
  // A realistic cascade: a stone cliff notch, a sheet of falling water with a vertical
  // aqua→foam gradient and multiple strands scrolling at different speeds, spilling into a
  // plunge pool with expanding ripple rings, rising mist and flicking spray at (x,y).
  h=h||110; const w=26, L=x-w/2, R=x+w/2;
  const rock='#6E6A62', rockD='#565249', rockL='#847F76';
  // rock cliff flanks
  px(L-12,y-h,12,h+6,rockD); px(L-12,y-h,12,4,rockL); px(L-10,y-h+9,4,h-12,rock);
  px(R,   y-h,12,h+6,rockD); px(R,   y-h,12,4,rockL); px(R+6, y-h+9,4,h-12,rock);
  // dark wet notch behind the water
  px(L,y-h,w,h,'#274C55'); px(L,y-h,w,6,'#1E3A42');

  // falling water sheet (clipped to the chute)
  ctx.save();
  ctx.beginPath(); ctx.rect(L,y-h,w,h); ctx.clip();
  const g=ctx.createLinearGradient(0,y-h,0,y);
  g.addColorStop(0,'#BFEFF6'); g.addColorStop(0.5,'#9FE0EC'); g.addColorStop(0.85,'#E8FBFF'); g.addColorStop(1,'#FFFFFF');
  ctx.fillStyle=g; ctx.fillRect(L+2,y-h+4,w-4,h);
  for(let i=0;i<6;i++){                                  // strands at varied speeds
    const sx=L+3+i*((w-6)/5), spd=0.3+(i%3)*0.12, scroll=(t*spd)%22;
    ctx.strokeStyle=i%2?'rgba(255,255,255,0.9)':'rgba(198,236,244,0.8)'; ctx.lineWidth=2;
    for(let yy=-22;yy<h;yy+=22){ const ya=y-h+((yy+scroll)%(h+22)); ctx.beginPath(); ctx.moveTo(sx,ya); ctx.lineTo(sx,ya+13); ctx.stroke(); }
  }
  ctx.restore();
  // lip where the water rolls over
  px(L-2,y-h-3,w+4,5,'#CFF3F8'); px(L,y-h-1,w,2,'#8FD8E4');

  // plunge pool
  ctx.fillStyle='#7FD0DC'; ctx.beginPath(); ctx.ellipse(x,y,w*0.95,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#B9EEF4'; ctx.beginPath(); ctx.ellipse(x,y-1,w*0.58,5,0,0,Math.PI*2); ctx.fill();
  // expanding ripple rings
  for(let i=0;i<3;i++){
    const p=((t/700)+i/3)%1;
    ctx.globalAlpha=(1-p)*0.5; ctx.strokeStyle='#EAFBFF'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(x,y+2,4+p*w*0.9,1.5+p*4,0,0,Math.PI*2); ctx.stroke();
  }
  // rising mist puffs
  for(let i=0;i<4;i++){
    const mp=((t/900)+i/4)%1, my=y-mp*24, mx=x+Math.sin((t/300)+i*1.7)*8;
    ctx.globalAlpha=(1-mp)*0.4; ctx.fillStyle='#FFFFFF';
    ctx.beginPath(); ctx.arc(mx,my,3+mp*3,0,Math.PI*2); ctx.fill();
  }
  // spray flicking off the base
  for(let i=0;i<6;i++){ const a=(t/200+i*0.17)%1; if(a<0.5){ ctx.globalAlpha=(0.5-a)*1.5; ctx.fillStyle='#FFFFFF'; ctx.fillRect(Math.round(x+(i-3)*6),Math.round(y-a*11),2,2); } }
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
      case 'cattail':     drawCattail(obj.x,obj.y,obj.seed,t); break;
      case 'log':         drawLog(obj.x,obj.y,obj.seed); break;
      case 'stump':       drawStump(obj.x,obj.y); break;
      case 'butterfly':   drawButterfly(obj.x,obj.y,obj.hue,obj.seed,t); break;
      case 'stonepath':   drawStonePath(obj.x1,obj.y1,obj.x2,obj.y2,obj.seed); break;
      case 'bridge':      drawBridge(obj.x,obj.y,obj.horizontal,t,'wood'); break;
      // --- rocky-mountain kinds (levels/rocky.js) ---
      case 'mountain':    drawMountain(obj.x,obj.y,obj.w,obj.h,obj.seed); break;
      case 'lake':        drawLake(obj.x,obj.y,obj.w,obj.h,obj.seed,t,obj.blobSeed); break;
      case 'waterfall':   drawWaterfall(obj.x,obj.y,t,obj.h); break;
      case 'boulder':     drawBoulder(obj.x,obj.y,obj.big); break;
      case 'snowypine':   drawSnowyPine(obj.x,obj.y,t); break;
      case 'deadtree':    drawDeadTree(obj.x,obj.y,t); break;
      case 'crystal':     drawCrystal(obj.x,obj.y,obj.seed,t); break;
      case 'snowpatch':   drawSnowPatch(obj.x,obj.y,obj.seed); break;
      case 'campfire':    drawCampfire(obj.x,obj.y,t); break;
      // 'riverbridge' intentionally not drawn here — layered in main.js so swimmers can pass underneath
    }
  });
}

