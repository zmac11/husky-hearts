// ====================== TIP ART ======================
// Small pixel-art illustrations for the feature tips (tips.js). Some tips teach the player
// to RECOGNISE something in the world — the loose-dirt dig spot, the different chest
// rarities — and a picture does that far better than words. Each tip can carry an `art`
// key; this module renders the matching strip of labelled mini-canvases into #tipArt.
//
// The sprites are drawn straight onto each canvas's own 2D context (not the shared game
// `ctx`), so they're self-contained and mirror how the same objects look in-world
// (entities/chest.js). Chest colours come from the chest config (Chests.def → loot.json),
// so retinting a chest there updates its tip picture too.

const TipArt = {
  // Local pixel helper — like the global px(), but targets a passed-in context.
  _px(g,x,y,w,h,c){ g.fillStyle=c; g.fillRect(Math.round(x),Math.round(y),w,h); },

  // Soft ground shadow every sprite sits on.
  _shadow(g,cx,cy){ g.save(); g.globalAlpha=0.18; g.fillStyle='#2A3A2A'; g.beginPath(); g.ellipse(cx,cy+11,12,4,0,0,Math.PI*2); g.fill(); g.restore(); },

  // The loose-dirt patch a buried chest is dug from, with the golden "!" dig prompt above
  // it — exactly what the player sees in the world (entities/chest.js buried state).
  drawDirt(g,cx,cy){
    this._shadow(g,cx,cy);
    g.save(); g.fillStyle='#A98456';
    g.beginPath(); g.ellipse(cx,cy+5,13,6,0,0,Math.PI*2); g.fill();
    g.restore();
    this._px(g,cx-7,cy+1,5,3,'#8B6B4A');
    this._px(g,cx+2,cy+4,5,3,'#8B6B4A');
    this._px(g,cx-2,cy+7,3,2,'#7A5C40');
    this._px(g,cx+5,cy,2,2,'#9A784E');
    // static "!" dig prompt (in-game it pulses)
    g.save();
    g.font='bold 12px monospace'; g.textAlign='center'; g.textBaseline='middle';
    g.lineWidth=3; g.strokeStyle='#FFF8EF'; g.strokeText('!',cx,cy-13);
    g.fillStyle='#C08A2A'; g.fillText('!',cx,cy-13);
    g.restore();
  },

  // A closed chest of the given rarity — mirrors the closed-box sprite in chest.js so the
  // picture matches what's dug up. Reads live colours from the chest config.
  drawChest(g,cx,cy,rarity){
    const def=(typeof Chests!=='undefined' && Chests.def) ? Chests.def(rarity)
      : { base:'#8B6340', band:'#6B4A28', lid:'#A07040', glow:null, locked:false };
    const locked=!!def.locked;
    const x=cx, y=cy;
    // glow for precious rarities (silver/golden)
    if(def.glow){
      g.save(); g.globalAlpha=0.55;
      const gr=g.createRadialGradient(x,y-3,2,x,y-3,16);
      gr.addColorStop(0,def.glow); gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr; g.beginPath(); g.arc(x,y-3,16,0,Math.PI*2); g.fill(); g.restore();
    }
    this._shadow(g,cx,cy);
    // closed box with domed lid + band + hasp
    this._px(g,x-10,y-4,20,10,def.base);
    this._px(g,x-10,y-10,20,7,def.lid);
    this._px(g,x-9,y-12,18,3,def.lid);
    this._px(g,x-10,y-4,20,2,def.band);
    this._px(g,x-2,y-5,4,6,def.band);                 // hasp plate
    this._px(g,x-1,y-3,2,3, locked?'#3A3630':def.band); // keyhole / latch
    if(locked){ this._px(g,x-2,y+1,4,4,'#4A4640'); this._px(g,x-1,y+2,2,2,'#2A2620'); }  // padlock
  },

  // Named strips: id → [{label, draw}].
  SETS: {
    treasure(TA){ return [
      { label:'Dig spot', draw:(g,cx,cy)=>TA.drawDirt(g,cx,cy) },
      { label:'Wooden',   draw:(g,cx,cy)=>TA.drawChest(g,cx,cy,'wooden') },
      { label:'Iron',     draw:(g,cx,cy)=>TA.drawChest(g,cx,cy,'iron') },
      { label:'Silver 🔒',draw:(g,cx,cy)=>TA.drawChest(g,cx,cy,'silver') },
      { label:'Golden',   draw:(g,cx,cy)=>TA.drawChest(g,cx,cy,'golden') },
    ]; },
  },

  // Render `setId` into `container`. Returns true if it drew anything (so the caller can
  // show/hide the strip). Each cell is a crisp HiDPI canvas + a small caption.
  render(setId, container){
    const make=this.SETS[setId];
    if(!make || !container){ if(container){ container.innerHTML=''; } return false; }
    const items=make(this);
    container.innerHTML='';
    const dpr=(typeof hiDPI==='function') ? hiDPI() : 1;
    const W=46, H=44;
    items.forEach(item=>{
      const cell=document.createElement('div'); cell.className='tipart-cell';
      const cv=document.createElement('canvas');
      cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
      cv.style.width=W+'px'; cv.style.height=H+'px';
      const g=cv.getContext('2d');
      g.setTransform(dpr,0,0,dpr,0,0); g.imageSmoothingEnabled=false;
      item.draw(g, W/2, H/2+3);
      cell.appendChild(cv);
      const lab=document.createElement('div'); lab.className='tipart-label'; lab.textContent=item.label;
      cell.appendChild(lab);
      container.appendChild(cell);
    });
    return items.length>0;
  },
};
