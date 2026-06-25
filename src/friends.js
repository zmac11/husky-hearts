// ====================== FRIENDS ======================
function drawFriend(f,t){
  const bob=f.cheered?Math.sin(t/180)*5:Math.sin(t/600)*1;
  const x=f.x, y=f.y+bob;
  ctx.save();
  // ground shadow
  ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+20,16,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;

  const cc=f.cheered; // cheered color flag
  if(f.kind==='cat'){
    // body
    px(x-10,y-2,20,18,cc?'#F2A65A':'#9A96C8');
    px(x-6,y+4,12,10,'#FFF0E0');
    // head
    px(x-9,y-16,18,16,cc?'#F2A65A':'#9A96C8');
    // ears
    px(x-10,y-24,7,10,cc?'#E8944A':'#8A88BC'); px(x-8,y-22,4,7,'#FFB4B4');
    px(x+3,y-24,7,10,cc?'#E8944A':'#8A88BC'); px(x+5,y-22,4,7,'#FFB4B4');
    // face
    px(x-6,y-12,4,4,cc?'#FF8C00':'#5050A0'); px(x+2,y-12,4,4,cc?'#FF8C00':'#5050A0');
    px(x-1,y-12,3,3,'#2A2A2A'); px(x+3,y-12,3,3,'#2A2A2A'); // pupils
    px(x-3,y-6,6,3,'#F0C0C0'); // muzzle
    px(x,y-5,2,2,'#CC6688'); // nose
    // tail
    const tw=Math.sin(t/200+f.x)*4;
    px(x+10,y+tw,6,14,cc?'#E8944A':'#8A88BC'); px(x+12,y-4+tw,4,10,cc?'#F2A65A':'#9A96C8');
    // stripes
    if(!cc){ px(x-8,y-14,16,2,'rgba(0,0,60,0.15)'); px(x-8,y-9,16,2,'rgba(0,0,60,0.12)'); }
  } else if(f.kind==='bunny'){
    px(x-8,y,16,16,cc?'#FFD0DE':'#DDD8CC');
    px(x-5,y+6,10,8,cc?'#FFE8F0':'#F0EDE8');
    px(x-9,y-12,18,14,cc?'#FFD0DE':'#DDD8CC');
    // long ears
    px(x-7,y-30,5,20,cc?'#FFD0DE':'#DDD8CC'); px(x-6,y-28,3,16,'#FFB4C0');
    px(x+2,y-30,5,20,cc?'#FFD0DE':'#DDD8CC'); px(x+3,y-28,3,16,'#FFB4C0');
    // face
    px(x-4,y-8,3,3,cc?'#FF6B81':'#5A5A8A'); px(x+1,y-8,3,3,cc?'#FF6B81':'#5A5A8A');
    px(x-2,y-4,5,3,'#F0E0E0'); px(x-1,y-4,2,2,'#FF88AA'); // nose
    // tail
    px(x-4,y+14,8,8,cc?'#FFF0F4':'#F0ECE8');
  } else if(f.kind==='bird'){
    // body
    px(x-10,y-4,20,14,cc?'#7EC8A3':'#A8B8C0');
    px(x-6,y+2,12,8,cc?'#9ADAB8':'#C4D0D8');
    // head
    px(x-7,y-14,14,12,cc?'#7EC8A3':'#A8B8C0');
    // wing detail
    px(x-10,y-2,6,8,cc?'#5AA885':'#8898A0'); px(x+4,y-2,6,8,cc?'#5AA885':'#8898A0');
    // beak
    px(x+6,y-9,8,5,'#FFAA44'); px(x+8,y-7,4,3,'#FF8822');
    // eye
    px(x-2,y-10,4,4,'#2A2A2A'); px(x-1,y-10,2,2,'#FFFFFF'); px(x,y-9,1,1,'#2A2A2A');
    // tail feathers
    px(x-10,y+8,6,10,cc?'#5AA885':'#8898A0'); px(x-7,y+10,4,8,cc?'#7EC8A3':'#A8B8C0');
    // crest
    px(x-3,y-18,3,6,cc?'#5AA885':'#8898A0'); px(x,y-20,3,4,cc?'#7EC8A3':'#A8B8C0');
  } else if(f.kind==='hedgehog'){
    // body
    px(x-12,y-2,24,14,cc?'#F0A855':'#8C7C68');
    px(x-8,y+4,16,8,'#F0DCC0');
    // head
    px(x-8,y-12,14,12,cc?'#E89840':'#7A6C5A');
    px(x-5,y-6,8,6,'#F0DCC0'); // muzzle
    // spines (drawn as short lines)
    const sc=cc?'#C87820':'#5A5050';
    [[-10,-6],[-8,-10],[-4,-13],[0,-14],[4,-13],[8,-10],[10,-6],[-10,0],[-11,4]].forEach(([ox,oy])=>{
      const ang=Math.atan2(oy,-12);
      px(x+ox,y+oy,2,6,sc);
      px(x+ox+(oy<-10?1:0),y+oy-2,2,4,shade(sc,20));
    });
    // face
    px(x-4,y-8,3,3,'#2A1A1A'); px(x+2,y-8,3,3,'#2A1A1A');
    px(x-1,y-5,2,2,'#331A1A'); // nose
    // feet
    px(x-6,y+12,5,5,'#C8A070'); px(x+1,y+12,5,5,'#C8A070');
  } else if(f.kind==='tortoise'){
    // shell — hexagon-ish with panels
    px(x-16,y-4,32,18,cc?'#8AC878':'#7A9A68');
    px(x-12,y-10,24,10,cc?'#9AD888':'#8AAA78');
    px(x-8,y-13,16,6,cc?'#AAEA98':'#9ABB88');
    // shell panels
    [[x-8,y-8],[x,y-8],[x-12,y-2],[x-4,y-2],[x+4,y-2]].forEach(([px2,py])=>{ px(px2,py,6,6,'rgba(0,0,0,0.1)'); });
    px(x-10,y-4,20,12,cc?'#A0DC8C':'#90B47C'); // highlight band
    // head
    px(x+14,y-4,10,8,cc?'#8AC878':'#8A9A70');
    px(x+16,y-6,6,5,cc?'#A0DC8C':'#9AAA80');
    px(x+20,y-4,2,2,'#2A2A2A'); // eye
    // legs
    [[x-14,y+10],[x-6,y+12],[x+2,y+12],[x+8,y+10]].forEach(([lx,ly])=>px(lx,ly,6,8,cc?'#8AC878':'#7A8A68'));
    // tail
    px(x-18,y+2,6,6,cc?'#8AC878':'#7A9A68');
  }

  ctx.restore();

  // speech bubble / progress
  if(!f.cheered){
    ctx.save();
    ctx.fillStyle='#FFF8EF'; ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1.5;
    roundRect(x-18,y-46,36,18,5,true,true);
    ctx.fillStyle='#4A3F35'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(`${f.given}/${f.need} 🦴`,x,y-33);
    // indicator arrow down
    ctx.fillStyle='#FFF8EF'; ctx.beginPath(); ctx.moveTo(x-5,y-28); ctx.lineTo(x+5,y-28); ctx.lineTo(x,y-22); ctx.fill();
    ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  } else {
    ctx.save(); ctx.font='16px serif'; ctx.textAlign='center';
    ctx.fillText('💛',x,y-36+Math.sin(t/200)*4);
    ctx.fillText('✨',x-14,y-28+Math.sin(t/250+1)*3);
    ctx.fillText('✨',x+14,y-28+Math.sin(t/300+2)*3);
    ctx.restore();
  }
}



