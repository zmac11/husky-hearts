// ====================== ENTITY: CRITTER (friendly wildlife) ======================
// Peaceful Canadian wildlife that roams the valley and NEVER attacks. Walk up and press
// the action key to greet them: sparkles, a happy sound, and a cheerful message. The
// first greeting makes friends and gifts a few treats; after that they just say hello.
// Distinct from `friends` (the sad animals you must cheer to win) — critters are a
// purely positive bonus. Add a species by giving it an entry in CRITTERS + a draw branch.

const CRITTERS = {
  moose:  { name:'Moose',  icon:'🫎', gift:3, roam:74, speed:0.35,
            greet:'The gentle moose lowers its great antlers to say hello!',
            lines:['The moose snuffles your ear and huffs happily.',
                   'The moose ambles alongside you for a while.'] },
  beaver: { name:'Beaver', icon:'🦫', gift:2, roam:56, speed:0.4,
            greet:'The busy beaver waves a friendly flat-tailed hello!',
            lines:['The beaver proudly shows off its big front teeth.',
                   'The beaver nudges a little twig over to you.'] },
  loon:   { name:'Loon',   icon:'🐦', gift:2, roam:48, speed:0.28, aquatic:true,
            greet:'The loon lifts its head and sings a beautiful call!',
            lines:['The loon warbles a cheerful, echoing tune.',
                   'The loon drifts calmly at your side.'] },
  duck:   { name:'Duck',   icon:'🦆', gift:2, roam:40, speed:0.3, aquatic:true,
            greet:'The duck paddles right over with a happy quack!',
            lines:['The duck bobs its head and quacks softly.',
                   'The duck preens its glossy feathers, content.'] },
  squirrel:{name:'Squirrel',icon:'🐿️', gift:2, roam:66, speed:0.5,
            greet:'The squirrel scampers up and offers you an acorn!',
            lines:['The squirrel flicks its big bushy tail at you.',
                   'The squirrel chatters brightly from a low branch.'] },
};

Entities.register('critter', {
  radius: 40,

  init(e){
    e.species = e.species || 'moose';
    const d = CRITTERS[e.species] || {};
    e.speed = e.speed || d.speed || 0.35;
    e.roam  = e.roam  || d.roam  || 60;
    e.homeX = (typeof e.homeX==='number') ? e.homeX : e.x;
    e.homeY = (typeof e.homeY==='number') ? e.homeY : e.y;
    e.aquatic = !!d.aquatic;    // ducks/loons float on the surface; land critters submerge
    e.dir = 1; e.wanderT = 0; e.wanderAng = 0; e.cool = 0; e.greeted = !!e.greeted; e.bob = 0;
  },

  // Gentle wander around home — never chases, never leaves its patch.
  update(e, t, dt){
    // Land critters slow to a swim in water; water birds (aquatic) glide freely. Either
    // way, being on water flags a ripple in the draw pass.
    const d=CRITTERS[e.species]||{};
    const inW = (typeof isInPond==='function' && isInPond(e.x,e.y,e.swimming));
    const swim = (inW && !d.aquatic) ? 0.5 : 1;
    e.swimming = inW;
    e.wanderT -= dt;
    if(e.wanderT<=0){ e.wanderAng=Math.random()*Math.PI*2; e.wanderT=rand(1200,2800); }
    const nx=e.x+Math.cos(e.wanderAng)*e.speed*swim*dtScale, ny=e.y+Math.sin(e.wanderAng)*e.speed*swim*dtScale;
    if(Math.hypot(nx-e.homeX, ny-e.homeY) < e.roam){ e.x=nx; e.y=ny; e.dir=Math.cos(e.wanderAng)>=0?1:-1; }
    else { e.wanderT=0; }                       // turned back at the edge of its range
    e.x=clamp(e.x,20,WORLD_W-20); e.y=clamp(e.y,26,WORLD_H-20);
    if(e.cool>0) e.cool=Math.max(0,e.cool-dt);
    e.bob=t;
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/600+e.homeX)*1.2), D=e.dir;
    // ground shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+14,16,5,0,0,Math.PI*2); ctx.fillStyle='#1A2A1A'; ctx.fill(); ctx.globalAlpha=1;

    if(e.species==='moose'){
      const B='#6E4A2E', BD='#553920', BL='#8A5E3A', M='#3A2A1C', bell='#4A3320';
      // legs
      px(x-9,y+3,3,13,M); px(x-3,y+5,3,11,M); px(x+3,y+3,3,13,M); px(x+8,y+5,3,11,M);
      // body + shoulder hump
      px(x-12,y-8,24,15,B); px(x-9,y-3,18,8,BL); px(x-12,y-12,9,6,B);
      // head (offset toward facing dir) + snout + dewlap
      const hx=x+D*11;
      px(hx-5,y-19,10,11,B); px(hx+D*4,y-15,6,5,BD); px(hx-2,y-8,5,8,bell);
      px(hx-5,y-21,3,4,BD); px(hx+4,y-21,3,4,BD);          // ears
      px(hx+(D>0?2:-2),y-15,2,2,'#141414');                // eye
      // broad palmate antlers
      px(hx-11,y-25,8,4,BL); px(hx-13,y-28,6,4,BL); px(hx-14,y-24,3,3,BL);
      px(hx+4,y-25,8,4,BL);  px(hx+8,y-28,6,4,BL);  px(hx+12,y-24,3,3,BL);
    } else if(e.species==='beaver'){
      const B='#6B4A30', BD='#523620', BL='#8A6242', T='#3E2A18', teeth='#F4EAD0';
      // flat paddle tail behind
      px(x-D*11-2,y+3,9,7,T); px(x-D*13,y+4,4,5,'#2E2012');
      // body
      px(x-8,y-4,16,13,B); px(x-5,y+2,10,6,BL);
      // head + ears + eyes + nose + buck teeth
      const hx=x+D*6;
      px(hx-5,y-12,11,10,B);
      px(hx-4,y-14,3,3,BD); px(hx+3,y-14,3,3,BD);
      px(hx-2,y-8,2,2,'#141414'); px(hx+2,y-8,2,2,'#141414');
      px(hx-1,y-4,3,2,'#3A2A1A'); px(hx-1,y-2,3,2,teeth);
      // paws
      px(x-6,y+8,3,3,BD); px(x+3,y+8,3,3,BD);
    } else if(e.species==='loon'){
      const blk='#22262C', wht='#EDEDE6', red='#C43A3A';
      // floating body (black back, pale side) with checkered specks
      px(x-10,y-4,20,10,blk); px(x-8,y+0,16,6,wht);
      px(x-6,y-3,2,2,wht); px(x-1,y-3,2,2,wht); px(x+4,y-3,2,2,wht);
      // upright neck + head + beak + red eye + white collar
      const hx=x+D*9;
      px(hx-3,y-13,6,10,blk); px(hx+D*1,y-15,5,5,blk);
      px(hx+D*5,y-13,4,2,'#2A2E34');
      px(hx+(D>0?1:-1),y-12,1,1,red);
      px(hx-3,y-6,6,2,wht);
    } else if(e.species==='duck'){
      const body='#8A6A46', head='#2E6B44', wing='#6E5236', bill='#E8A23C', wht='#EDE6D6';
      // rounded floating body + pale underside + wing + tail tuft
      px(x-9,y-3,18,10,body); px(x-7,y+1,14,6,wht); px(x-2,y-2,8,6,wing); px(x-11,y-4,4,4,body);
      // neck + glossy green head + white ring + bill + eye
      const hx=x+D*8;
      px(hx-3,y-11,6,9,head); px(hx+D*2,y-12,5,5,head); px(hx-3,y-6,6,2,wht);
      px(hx+D*5,y-10,4,3,bill);
      px(hx+(D>0?1:-1),y-10,1,1,'#141414');
    } else if(e.species==='squirrel'){
      const B='#A85A2E', BD='#8A4520', BL='#C87A44', wht='#F0DDC0', acorn='#7A5230';
      // big bushy curled tail behind
      px(x-D*8-2,y-11,6,16,BD); px(x-D*10,y-13,5,10,B); px(x-D*9,y-4,4,8,BL);
      // upright body + pale belly
      px(x-6,y-6,12,14,B); px(x-4,y+0,8,9,wht);
      // head + ears + eye + nose
      const hx=x+D*3;
      px(hx-5,y-14,10,9,B);
      px(hx-5,y-17,3,4,BD); px(hx+3,y-17,3,4,BD);
      px(hx+(D>0?2:-2),y-11,2,2,'#141414'); px(hx+(D>0?4:-4),y-9,2,2,'#3A2A1A');
      // little paws holding an acorn
      px(x-2,y-2,4,5,BL); px(x-1,y+1,3,3,acorn);
    }

    // floating mood: a heart once befriended, a chat bubble before
    const by=y-28+Math.sin(t/240+e.homeY)*3;
    ctx.font='13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(e.greeted?'💛':'💬', x, by);
  },

  onInteract(e, p){
    if(e.cool>0) return;
    e.cool=800;
    const d=CRITTERS[e.species]||{};
    spawnSparkles(e.x, e.y-8, e.greeted?'#FF8FA3':'#FFD93D', 18);
    if(typeof sfxCheer==='function') sfxCheer();
    if(!e.greeted){
      e.greeted=true;
      const gift=d.gift||2; p.treats+=gift;
      if(typeof updateHUD==='function') updateHUD();
      showToast(`${d.icon||'🐾'} ${d.greet||'A friendly critter says hi!'} (+${gift} treats)`, 2600);
    } else {
      const lines=d.lines||['So happy to see you!'];
      showToast(`${d.icon||'🐾'} ${lines[Math.floor(Math.random()*lines.length)]}`, 2000);
    }
  },
});
