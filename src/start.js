// ====================== START / RESET (overridden by charselect.js) ======================
function resetGame(cfg){
  stopMusic();
  collectibles=makeCollectibles(); friends=makeFriends(); cheeredCount=0;
  const c=cfg||(typeof dogConfig!=='undefined'&&dogConfig)||{breed:'dinno'};
  p1=makePlayer(1, Breeds.get(c.breed).color, 200, 200, c.breed);
  sparkles=[]; updateHUD();
  document.getElementById('winScreen').style.display='none';
}
