// ====================== INPUT ======================
// Owns the raw key state and per-player control maps (previously the `keys` object
// and inline listeners lived in world.js, and the c1/c2 maps were defined inside the
// main loop). Centralising here gives one place to add rebinding, gamepad support,
// and the global ESC → pause hook.

const keys = {};

window.addEventListener('keydown', e=>{
  keys[e.code] = true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code)) e.preventDefault();
  if(e.code === 'Escape'){ e.preventDefault(); Input.onEscape(); }
  if(e.code === 'KeyI'){ if(typeof UI!=='undefined' && UI.toggleInventory) UI.toggleInventory(); }
  if(e.code === 'KeyJ'){ if(typeof UI!=='undefined' && UI.toggleJournal) UI.toggleJournal(); }
  if(e.code === 'Backquote'){ e.preventDefault(); if(typeof DevMode!=='undefined' && DevMode.toggle) DevMode.toggle(); }
  // Number keys 1-9 → use the matching P1 hotbar slot (consumables/toys).
  const m = /^Digit([1-9])$/.exec(e.code);
  if(m){ if(typeof UI!=='undefined' && UI.useHotbar) UI.useHotbar(+m[1]); }
});
window.addEventListener('keyup', e=>{ keys[e.code] = false; });

const Input = {
  keys,

  // Per-player control maps. `ability` is the active-ability trigger (Phase 1);
  // it matches the keys Lolla's ball cannon already used (Q / period).
  CONTROLS: {
    p1: { up:'KeyW',    down:'KeyS',      left:'KeyA',       right:'KeyD',        action:'Space', ability:'KeyQ'   },
    p2: { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft',  right:'ArrowRight',  action:'Enter', ability:'Period' },
  },

  down(code){ return !!keys[code]; },

  // ESC hook. Real pause-menu wiring lands in Phase 5 (UI.togglePause); until then
  // this is a guarded no-op so ESC is harmless.
  onEscape(){ if(typeof UI !== 'undefined' && UI.togglePause) UI.togglePause(); },
};
