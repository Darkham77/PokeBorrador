
import { useUIStore } from '@/stores/ui'

/**
 * Triggers the flicker and exclamation animation for a rival encounter.
 */
export function triggerRivalSequence(onComplete) {
  const flicker = document.createElement('div');
  flicker.className = 'rival-flicker';
  document.body.appendChild(flicker);

  const excl = document.createElement('div');
  excl.className = 'rival-exclamation';
  excl.textContent = '!';
  document.body.appendChild(excl);

  setTimeout(() => {
    flicker.remove();
    excl.remove();
    if (onComplete) onComplete();
  }, 1200);
}

/**
 * Shows the fishing intro modal and then starts the minigame.
 */
export function showFishingIntro(pokemon, rarity, onStart) {
  const introOv = document.createElement('div');
  introOv.id = 'fishing-intro-overlay';
  introOv.style.cssText = `position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.85);
display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;`;
  
  introOv.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
      border:2px solid var(--blue);text-align:center;position:relative;box-shadow:0 0 30px rgba(10, 132, 255, 0.4);">
      <div style="font-size:80px;margin-bottom:20px;animation:bounce 1.5s infinite;">🎣</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--blue);margin-bottom:16px;">¡ALGO PICÓ!</div>
      <div style="font-size:14px;color:#eee;margin:16px 0;line-height:1.6;">¡Un Pokémon ha mordido el anzuelo!</div>
      <button id="fishing-start-btn" style="font-family:'Press Start 2P',monospace;font-size:10px;padding:16px 32px;border:none;border-radius:14px;
        cursor:pointer;background:linear-gradient(135deg,var(--blue),#2563eb);color:#fff;
        box-shadow:0 4px 16px rgba(59,130,246,0.5);margin-top:12px;width:100%;">
        🎣 ¡MINIJUEGO DE PESCA!
      </button>
    </div>`;
  document.body.appendChild(introOv);

  document.getElementById('fishing-start-btn').onclick = () => {
    introOv.remove();
    if (onStart) onStart();
  };
}

/**
 * Starts the rhythm-based fishing minigame via Vue UI.
 */
export function startFishingMinigame(enemy, rarity, onWin, onFail) {
  const ui = useUIStore()
  
  ui.fishingPokemon = enemy
  ui.fishingRarity = rarity
  ui.fishingCallbacks.onWin = () => {
    ui.isFishingGameOpen = false
    if (onWin) onWin()
  }
  ui.fishingCallbacks.onFail = () => {
    ui.isFishingGameOpen = false
    if (onFail) onFail()
  }
  
  ui.isFishingGameOpen = true
}
