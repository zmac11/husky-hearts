// ====================== CREDITS (Cloud Kingdom finale) ======================
// Beating the Storm Eagle and stepping through the last portal rolls the credits — the
// campaign's payoff. Reuses the existing #winScreen overlay (kept in the main loop's
// showWorld set, drawn over the frozen final frame). The winScreen's Play Again button
// (charselect.js) restarts a fresh run, so we only swap in the finale copy and show it.

function rollCredits(){
  const el=document.getElementById('winScreen'); if(!el){ if(typeof Game!=='undefined') Game.state=SCENES.WORLDMAP; return; }
  const h=el.querySelector('h2'), p=el.querySelector('p');
  if(h) h.innerHTML='🏆 You saved the skies! 🏆';
  if(p) p.innerHTML=
    'From the Sunny Meadows to the Cloud Kingdom, you cheered every lonely friend, weathered tide '+
    'and storm, and toppled the Storm Eagle itself.<br><br>'+
    '🌳 ⛰️ 🌲 🏖️ 🍂 🏜️ ❄️ ☁️<br><br>'+
    '<b>Thank you for playing Husky Hearts! 🐾💛</b>';
  if(typeof Game!=='undefined') Game.campaignComplete=true;
  if(typeof Progress!=='undefined') Progress.markComplete('sky-boss');
  if(typeof Game!=='undefined') Game.state=SCENES.WIN;
  el.style.display='flex';
  if(typeof sfxWin==='function') sfxWin();
}
