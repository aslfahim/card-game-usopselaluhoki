// Mycelium War — input: mouse clicks on cards/plots/buttons and keyboard play.
// Keys: 1–7 select a hand card, Enter/Space ends the turn, Esc cancels selection,
// R restarts, M toggles sound. All handlers are wired once, against callbacks
// the main module supplies, so this file never touches game state directly.

export function wireInput(callbacks) {
  const $ = (id) => document.getElementById(id);

  $('end-turn').addEventListener('click', () => callbacks.endTurn());
  $('restart').addEventListener('click', () => callbacks.restart());
  $('start-btn').addEventListener('click', () => callbacks.start());
  $('again-btn').addEventListener('click', () => callbacks.restart());
  $('sound-btn').addEventListener('click', () => {
    const on = callbacks.toggleSound();
    $('sound-btn').textContent = on ? '♪ Sound: on' : '♪ Sound: off';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const titleVisible = !$('title-screen').classList.contains('hidden');
      const endVisible = !$('end-screen').classList.contains('hidden');
      if (titleVisible) { callbacks.start(); return; }
      if (endVisible) { callbacks.restart(); return; }
      e.preventDefault();
      callbacks.endTurn();
      return;
    }
    if (e.key === 'Escape') { callbacks.cancelSelection(); return; }
    if (e.key === 'r' || e.key === 'R') { callbacks.restart(); return; }
    if (e.key === 'm' || e.key === 'M') {
      const on = callbacks.toggleSound();
      $('sound-btn').textContent = on ? '♪ Sound: on' : '♪ Sound: off';
      return;
    }
    const n = Number.parseInt(e.key, 10);
    if (n >= 1 && n <= 7) callbacks.selectByIndex(n - 1);
  });
}
