// ====================== ENTITY: SPIRIT WOLF (Dinno's summon) ======================
// A translucent storm-wolf conjured by Spirit of the Storm (abilities/spiritWolf.js).
// It hunts the nearest damageable enemy with lightning-crackling bites; with nothing
// to hunt it trots at its summoner's side. Despawns in a poof when lifeT runs out.
// Plain-data state ({lifeT, dmg, chain, biteCd}) so it rides through save/load.

Entities.register('spiritwolf', {
  radius: 0,   // not interactable

  init(e){
    e.lifeT  = (typeof e.lifeT==='number') ? e.lifeT : 12000;
    e.dmg    = e.dmg || 2;
    e.chain  = !!e.chain;            // L3: bites arc to a second enemy
    e.speed  = e.speed || 1.5;
    e.biteCd = e.biteCd || 0;
    e.dir    = 1;
    e.arcT   = 0;                    // brief lightning-arc visual after a chain bite
  },

  _prey(e){
    let best=null, bestD=Infinity;
    for(const o of entities){
      if(o===e || typeof o.hp!=='number' || (o.kind!=='enemy' && o.kind!=='wolf')) continue;
      const d=Math.hypot(o.x-e.x, o.y-e.y);
      if(d<bestD){ best=o; bestD=d; }
    }
    return best;
  },

  update(e, t, dt){
    e.lifeT-=dt;
    if(e.lifeT<=0){
      if(typeof spawnSparkles==='function') spawnSparkles(e.x, e.y-8, '#7FD4FF', 18);
      Entities.remove(e);
      return;
    }
    if(e.biteCd>0) e.biteCd=Math.max(0, e.biteCd-dt);
    if(e.arcT>0){ e.arcT=Math.max(0, e.arcT-dt); }

    const prey=this._prey(e);
    if(prey){
      const dist=Math.hypot(prey.x-e.x, prey.y-e.y);
      const ang=Math.atan2(prey.y-e.y, prey.x-e.x);
      if(dist>18){
        e.x+=Math.cos(ang)*e.speed*dtScale;
        e.y+=Math.sin(ang)*e.speed*dtScale;
      }
      e.dir=Math.cos(ang)>=0?1:-1;
      if(dist<20 && e.biteCd<=0){
        e.biteCd=700;
        Entities.hurt(prey, e.dmg, e.x, e.y, 10);
        if(typeof spawnSparkles==='function') spawnSparkles(prey.x, prey.y-8, '#7FD4FF', 8);
        // L3: the bite arcs lightning to a second enemy nearby (half damage)
        if(e.chain){
          let second=null, bd=100;
          for(const o of entities){
            if(o===prey || o===e || typeof o.hp!=='number' || (o.kind!=='enemy' && o.kind!=='wolf')) continue;
            const d=Math.hypot(o.x-prey.x, o.y-prey.y);
            if(d<bd){ second=o; bd=d; }
          }
          if(second){
            e.arcT=200; e.arcFrom={x:prey.x,y:prey.y-8}; e.arcTo={x:second.x,y:second.y-8};
            Entities.hurt(second, Math.max(1,Math.ceil(e.dmg/2)), prey.x, prey.y, 8);
            spawnSparkles(second.x, second.y-8, '#7FD4FF', 6);
          }
        }
      }
    } else {
      // heel: trot back to the summoner's side
      const dog=p1;
      if(dog && !dog.dead){
        const dist=Math.hypot(dog.x-e.x, dog.y-e.y);
        if(dist>56){
          const ang=Math.atan2(dog.y-e.y, dog.x-e.x);
          e.x+=Math.cos(ang)*e.speed*dtScale;
          e.y+=Math.sin(ang)*e.speed*dtScale;
          e.dir=Math.cos(ang)>=0?1:-1;
        }
      }
    }
    e.x=clamp(e.x, 20, WORLD_W-20);
    e.y=clamp(e.y, 26, WORLD_H-20);
  },

  draw(e, t){
    const x=Math.round(e.x), y=Math.round(e.y+Math.sin(t/240)*1.5);
    const D=e.dir;
    const body='#6E7C92', belly='#96A6BC', dark='#4A5568';
    const fading=e.lifeT<1500 ? Math.max(0.15, e.lifeT/1500) : 1;   // fade out at the end

    ctx.save();
    ctx.globalAlpha=0.65*fading;

    // spectral glow under it instead of a shadow
    const gg=ctx.createRadialGradient(x,y+9,1,x,y+9,16);
    gg.addColorStop(0,'rgba(127,212,255,0.5)'); gg.addColorStop(1,'rgba(127,212,255,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.ellipse(x,y+9,16,6,0,0,Math.PI*2); ctx.fill();

    // wolf silhouette (compact version of the mountain wolf)
    px(x-D*13-2,y-6,7,6,dark); px(x-D*15-2,y-8,5,5,body);   // bushy tail
    px(x-12,y-5,24,13,body);
    px(x-9,y+1,18,6,belly);
    px(x-9,y+7,4,6,dark); px(x-2,y+7,4,6,dark); px(x+6,y+7,4,6,dark);
    px(x+D*7-7,y-11,14,12,body);
    px(x+D*7-6,y-15,4,5,dark); px(x+D*7+2,y-15,4,5,dark);
    px(x+D*10-3,y-4,7,5,belly);
    // glowing storm eyes
    px(x+D*7-4,y-7,2,2,'#7FD4FF'); px(x+D*7+2,y-7,2,2,'#7FD4FF');

    // crackling spark flecks
    for(let i=0;i<3;i++){
      const a=t/160+i*2.1;
      const sx=x+Math.cos(a)*(10+i*3), sy=y-6+Math.sin(a*1.3)*8;
      if(Math.floor(t/120+i)%3===0){ ctx.fillStyle=i%2?'#7FD4FF':'#FFFFFF'; ctx.fillRect(Math.round(sx),Math.round(sy),2,2); }
    }

    // chain-lightning arc visual after an L3 bite
    if(e.arcT>0 && e.arcFrom && e.arcTo){
      ctx.globalAlpha=(e.arcT/200)*fading;
      ctx.strokeStyle='#AEE8FF'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(e.arcFrom.x, e.arcFrom.y);
      const mx=(e.arcFrom.x+e.arcTo.x)/2+rand(-6,6), my=(e.arcFrom.y+e.arcTo.y)/2+rand(-6,6);
      ctx.lineTo(mx,my); ctx.lineTo(e.arcTo.x, e.arcTo.y); ctx.stroke();
    }

    ctx.restore();
  },
});
