// ====================== INPUT ======================
// Owns the raw key state and the rebindable action→key bindings. Each gameplay
// action can have up to two bound keys (defaults: WASD + arrow keys), editable on
// the Options screen (options.js) and persisted to localStorage. Mobile buttons
// press actions directly via setVirtual(), so they keep working after rebinds.

const keys = {};

const Input = {
  keys,
  BINDINGS_KEY: 'husky-hearts-bindings-v1',

  // Gameplay actions shown on the Options screen, in display order.
  ACTIONS: [
    { id:'up',        label:'Move Up' },
    { id:'down',      label:'Move Down' },
    { id:'left',      label:'Move Left' },
    { id:'right',     label:'Move Right' },
    { id:'action',    label:'Howl / Deliver' },
    { id:'ability1',  label:'Ability 1' },
    { id:'ability2',  label:'Ability 2' },
    { id:'inventory', label:'Inventory' },
    { id:'journal',   label:'Quest Journal' },
  ],

  DEFAULTS: {
    up:        ['KeyW','ArrowUp'],
    down:      ['KeyS','ArrowDown'],
    left:      ['KeyA','ArrowLeft'],
    right:     ['KeyD','ArrowRight'],
    action:    ['Space','Enter'],
    ability1:  ['KeyQ', null],
    ability2:  ['KeyE', null],
    inventory: ['KeyI', null],
    journal:   ['KeyJ', null],
  },

  bindings: {},   // action id → [primaryCode|null, altCode|null]
  _virtual: {},   // action id → bool (touch d-pad / howl button)

  load(){
    let saved=null;
    try{ saved=JSON.parse(localStorage.getItem(this.BINDINGS_KEY)); }catch(e){ saved=null; }
    this.bindings={};
    const used=new Set();
    // Saved bindings first — they own their keys.
    this.ACTIONS.forEach(a=>{
      if(saved && Array.isArray(saved[a.id])){
        const s=saved[a.id];
        this.bindings[a.id]=[s[0]||null, s[1]||null];
        this.bindings[a.id].forEach(c=>{ if(c) used.add(c); });
      }
    });
    // Then defaults for new/unsaved actions, skipping keys a saved binding already took.
    this.ACTIONS.forEach(a=>{
      if(this.bindings[a.id]) return;
      const d=this.DEFAULTS[a.id];
      this.bindings[a.id]=[ (d[0]&&!used.has(d[0]))?d[0]:null, (d[1]&&!used.has(d[1]))?d[1]:null ];
      this.bindings[a.id].forEach(c=>{ if(c) used.add(c); });
    });
  },
  save(){ try{ localStorage.setItem(this.BINDINGS_KEY, JSON.stringify(this.bindings)); }catch(e){} },
  resetBindings(){
    this.ACTIONS.forEach(a=>{ const d=this.DEFAULTS[a.id]; this.bindings[a.id]=[d[0]||null, d[1]||null]; });
    this.save();
  },

  // Is this action currently held (any of its keys, or a touch button)?
  held(action){
    if(this._virtual[action]) return true;
    const b=this.bindings[action];
    return !!(b && ((b[0]&&keys[b[0]]) || (b[1]&&keys[b[1]])));
  },
  setVirtual(action,on){ this._virtual[action]=!!on; },

  // Which action (if any) is `code` bound to?
  boundAction(code){
    for(const id in this.bindings){ if(this.bindings[id].indexOf(code)!==-1) return id; }
    return null;
  },

  // Bind `code` to an action slot, stealing it from any other slot it occupied.
  setBinding(actionId, slot, code){
    for(const id in this.bindings){
      const b=this.bindings[id];
      for(let i=0;i<2;i++) if(b[i]===code && !(id===actionId && i===slot)) b[i]=null;
    }
    this.bindings[actionId][slot]=code;
    this.save();
  },
  clearBinding(actionId, slot){ this.bindings[actionId][slot]=null; this.save(); },

  // Human-readable key label for the Options screen / hints.
  keyName(code){
    if(!code) return '—';
    const nice={ Space:'SPACE', Enter:'ENTER', Tab:'TAB', Backspace:'BKSP', CapsLock:'CAPS',
      Period:'.', Comma:',', Slash:'/', Semicolon:';', Quote:"'", Backslash:'\\',
      BracketLeft:'[', BracketRight:']', Minus:'-', Equal:'=', Backquote:'`',
      ShiftLeft:'L-SHIFT', ShiftRight:'R-SHIFT', ControlLeft:'L-CTRL', ControlRight:'R-CTRL',
      AltLeft:'L-ALT', AltRight:'R-ALT', MetaLeft:'CMD', MetaRight:'CMD',
      ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→' };
    if(nice[code]) return nice[code];
    let m;
    if((m=/^Key([A-Z])$/.exec(code))) return m[1];
    if((m=/^Digit(\d)$/.exec(code))) return m[1];
    if((m=/^Numpad(.+)$/.exec(code))) return 'NUM '+m[1];
    return code.toUpperCase();
  },

  down(code){ return !!keys[code]; },

  // ESC hook: Options screen first, then whatever panel UI has open.
  onEscape(){
    if(typeof Options!=='undefined' && Options.isOpen && Options.isOpen()){ Options.close(); return; }
    if(typeof UI !== 'undefined' && UI.togglePause) UI.togglePause();
  },
};
Input.load();

window.addEventListener('keydown', e=>{
  keys[e.code] = true;
  // Don't let bound gameplay keys (or the usual suspects) scroll the page.
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter'].includes(e.code) || Input.boundAction(e.code)) e.preventDefault();
  if(e.code === 'Escape'){ e.preventDefault(); Input.onEscape(); }
  if(Input.bindings.inventory.indexOf(e.code)!==-1){ if(typeof UI!=='undefined' && UI.toggleInventory) UI.toggleInventory(); }
  if(Input.bindings.journal.indexOf(e.code)!==-1){ if(typeof UI!=='undefined' && UI.toggleJournal) UI.toggleJournal(); }
  // Dev mode: backtick, or the "<" key (IntlBackslash = the key next to left Shift on
  // ISO/European keyboards, which types "<" — e.key covers any other layout too).
  if(e.code === 'Backquote' || e.code === 'IntlBackslash' || e.key === '<'){ e.preventDefault(); if(typeof DevMode!=='undefined' && DevMode.toggle) DevMode.toggle(); }
  // Number keys 1-9 → use the matching hotbar slot (consumables/toys).
  const m = /^Digit([1-9])$/.exec(e.code);
  if(m){ if(typeof UI!=='undefined' && UI.useHotbar) UI.useHotbar(+m[1]); }
});
window.addEventListener('keyup', e=>{ keys[e.code] = false; });
