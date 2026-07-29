// ====================== DARKNESS & LIGHT ======================
// The Whispering Woods lighting layer, introduced on Mossy Trail (Whispering Woods 1). In a
// level flagged `dark`, the canopy swallows the light: a dark overlay covers the view, with
// soft holes punched around the dog and every light source (lantern posts; a wider hole if
// the dog wears a 🔦 Torch). You see only your pool of light — treasure and lurkers hide in
// the shadows off the trail.
//
// Light also drives STEALTH: standing in a bright pool makes you easier to detect, deep
// shadow makes you sneakier (Entities.noiseFactor reads Darkness.lightAt). Shadow-lurkers
// (entities/shadowlurker.js) only prowl where it's dark. A level opts in with `dark:true`.
//
// Rendered on a small offscreen canvas (fill dark → erase light circles with destination-out
// → composite over the world), so it needs no per-object draw changes.

const Darkness = {
  PLAYER_R: 90,     // the dog's own glow radius
  TORCH_BONUS: 58,  // extra radius while wearing a Torch
  LANTERN_R: 82,    // a lantern post's pool
  DIM: 'rgba(8,13,24,0.86)',

  _cv: null, _g: null,

  active(){ return !!(typeof LevelManager!=='undefined' && LevelManager.current && LevelManager.current.dark); },

  _hasTorch(p){ return !!(p && p.equipment && Object.keys(p.equipment).some(s=>p.equipment[s]==='torch')); },

  // Standing light sources in the world — any entity carrying a positive `lightR` (lantern
  // posts, lit shrine lanterns, …). NOT the dog's own glow.
  _worldLights(){
    const L=[];
    const es=(typeof entities!=='undefined' && entities) ? entities : [];
    es.forEach(e=>{ if(e && e.lightR>0 && e.lit!==false) L.push({ x:e.x, y:e.y-8, r:e.lightR }); });
    return L;
  },
  // Everything that lights the scene = world lights + the dog's own glow (used for rendering).
  _lights(){
    const L=this._worldLights();
    if(typeof p1!=='undefined' && p1 && !p1.dead) L.push({ x:p1.x, y:p1.y-6, r:this.PLAYER_R + (this._hasTorch(p1)?this.TORCH_BONUS:0) });
    return L;
  },

  _brightest(lights, x, y){ let best=0; lights.forEach(L=>{ const d=Math.hypot(x-L.x, y-L.y); if(d<L.r) best=Math.max(best, 1-d/L.r); }); return best; },

  // How lit a point looks (dog glow included): 0 dark .. 1 bright. For rendering/visibility.
  lightAt(x,y){ return this.active() ? this._brightest(this._lights(), x, y) : 1; },

  // AMBIENT light from the world only (no self-glow): this is what betrays you for stealth —
  // standing in a lantern pool makes you visible; your own glow doesn't give you away.
  ambientAt(x,y){ return this.active() ? this._brightest(this._worldLights(), x, y) : 1; },

  _ensure(){
    if(!this._cv){ this._cv = (typeof document!=='undefined') ? document.createElement('canvas') : null; }
    if(this._cv){
      if(this._cv.width!==VIEW_W)  this._cv.width  = VIEW_W;
      if(this._cv.height!==VIEW_H) this._cv.height = VIEW_H;
      this._g = this._cv.getContext('2d');
    }
  },

  // Composite the darkness over the (already-drawn) world. Call in screen space — after the
  // camera translate is restored, before the minimap. `cam` is the world camera.
  render(mainCtx, cam){
    if(!this.active()) return;
    this._ensure(); const g=this._g; if(!g) return;
    g.setTransform(1,0,0,1,0,0);
    g.globalCompositeOperation='source-over';
    g.clearRect(0,0,VIEW_W,VIEW_H);
    g.fillStyle=this.DIM; g.fillRect(0,0,VIEW_W,VIEW_H);
    // erase light holes
    g.globalCompositeOperation='destination-out';
    this._lights().forEach(L=>{
      const sx=L.x-cam.x, sy=L.y-cam.y;
      if(sx<-L.r || sx>VIEW_W+L.r || sy<-L.r || sy>VIEW_H+L.r) return;
      const rad=g.createRadialGradient(sx,sy,L.r*0.15, sx,sy,L.r);
      rad.addColorStop(0,'rgba(0,0,0,1)'); rad.addColorStop(0.55,'rgba(0,0,0,0.8)'); rad.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rad; g.fillRect(sx-L.r, sy-L.r, L.r*2, L.r*2);
    });
    g.globalCompositeOperation='source-over';
    mainCtx.drawImage(this._cv, 0, 0, VIEW_W, VIEW_H);
  },
};
