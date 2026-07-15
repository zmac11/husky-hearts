// ====================== CANVAS INIT ======================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Device pixels per logical (VIEW_W×VIEW_H) unit. Set by resizeCanvas() (fullscreen.js)
// from the display size × devicePixelRatio; the main loop applies it as the base
// transform so the world renders at native resolution (crisp on high-DPI screens).
let renderScale = 1;
