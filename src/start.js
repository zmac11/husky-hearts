// ====================== START / RESET (overridden by charselect.js) ======================
function resetGame(cfg1, cfg2){
  stopMusic();
  collectibles=makeCollectibles(); friends=makeFriends(); cheeredCount=0;
  const c1=cfg1||dogConfig&&dogConfig.p1||{color:{hex:'#6FA8C9'},breed:'husky'};
  const c2=cfg2||dogConfig&&dogConfig.p2||{color:{hex:'#E0855B'},breed:'shiba'};
  p1=makePlayer(1, c1.color.hex, 200, 200, c1.breed);
  p2=makePlayer(2, c2.color.hex, 260, 200, c2.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
}

