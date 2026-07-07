// ====================== ENTITY: NPC (interactable critter) ======================
// A stationary character you can walk up to and interact with (action key). Phase 3
// shows a toast; once the dialog/shop UI exists (Phase 5) onInteract routes there.
// This is the seam for talking NPCs, shopkeepers, and quest-givers.

Entities.register('npc', {
  radius: 42,

  init(e){
    e.name     = e.name     || 'Wanderer';
    e.greeting = e.greeting || 'Hello there, friend!';
    e.bob      = 0;
  },

  update(e, t, dt){ e.bob = t; },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/500)*1.5);
    // shadow
    ctx.globalAlpha=0.22; ctx.beginPath(); ctx.ellipse(x,y+14,14,5,0,0,Math.PI*2); ctx.fillStyle='#1A3A1A'; ctx.fill(); ctx.globalAlpha=1;
    // Per-look palette so each NPC reads as a distinct shop: default merchant
    // (warm brown + green scarf), the tailor (plum coat + purple beret), and the
    // rocky-mountain ranger (slate-blue parka + red scarf + fur hat).
    const tailor = e.look==='tailor';
    const ranger = e.look==='ranger';
    const bodyC = tailor ? '#7E5AA6' : ranger ? '#4E6E86' : '#B07A44';
    const earC  = tailor ? '#654888' : ranger ? '#3A5468' : '#9A6636';
    const scarfC= tailor ? '#E0A93C' : ranger ? '#C0463C' : '#3E9A5A';
    px(x-10,y-2,20,16,bodyC);
    px(x-6,y+4,12,9,'#E8C48A');    // apron/belly
    px(x-9,y-16,18,15,bodyC);      // head
    px(x-10,y-22,6,8,earC); px(x+4,y-22,6,8,earC); // ears
    px(x-8,y-20,3,5,'#C89060'); px(x+5,y-20,3,5,'#C89060');
    px(x-5,y-10,3,3,'#2A2A2A'); px(x+2,y-10,3,3,'#2A2A2A'); // eyes
    px(x-4,y-10,1,1,'#fff'); px(x+3,y-10,1,1,'#fff');
    px(x-3,y-5,6,3,'#E8C48A'); px(x-1,y-6,3,3,'#2A2A2A'); // muzzle+nose
    px(x-10,y-1,20,3,scarfC); // scarf
    if(tailor){
      px(x-8,y-24,16,4,'#5B3F7E');   // beret
      px(x-9,y-21,18,2,'#4A3168');
      px(x+7,y-24,2,3,'#F0D890');     // beret nub
      px(x-13,y+2,4,6,'#E8C48A');     // arm holding a spool of thread
      px(x-15,y+3,4,4,'#E0A93C'); px(x-14,y+4,2,2,'#B07A44');
    }
    if(ranger){
      px(x-9,y-24,18,5,'#6B4A2E');    // fur trapper hat band
      px(x-8,y-27,16,4,'#8A5E38');
      px(x-10,y-23,3,4,'#B8895A'); px(x+7,y-23,3,4,'#B8895A'); // ear flaps
      px(x-2,y-27,4,2,'#C0463C');     // hat pom
      px(x-13,y+1,4,7,bodyC);         // arm holding a lantern
      px(x-16,y+3,5,6,'#3A3A44'); px(x-15,y+4,3,4,'#FFD36A'); // lantern glow
      px(x-6,y+6,12,2,'#3A5468');     // parka belt
    }

    // floating "!" prompt bubble
    const by=y-30+Math.sin(t/220)*3;
    ctx.fillStyle='#FFF8EF'; ctx.strokeStyle='#4A3F35'; ctx.lineWidth=1.5;
    roundRect(x-8,by-9,16,16,4,true,true);
    ctx.fillStyle='#4A3F35'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
    ctx.fillText('!', x, by+3);
  },

  onInteract(e, p){
    // Phase 5 upgrades this to a real dialog/shop panel.
    if(typeof UI !== 'undefined' && UI.openDialog){ UI.openDialog(e, p); return; }
    showToast(`${e.name}: "${e.greeting}"`, 2400);
  },
});
