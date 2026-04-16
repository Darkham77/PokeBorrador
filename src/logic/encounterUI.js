import { POKEMON_DB } from '@/data/pokemonDB';

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
 * Starts the rhythm-based fishing minigame.
 * This is a direct migration of the logic in 06_encounters_v5.js.
 */
export function startFishingMinigame(enemy, rarity, onWin, onFail) {
  const overlay = document.createElement('div');
  overlay.id = 'fishing-game-overlay';
  
  // Difficulty adjustments
  const totalNotes = Math.min(22, 5 + Math.floor(rarity / 7));
  const speedBase = Math.max(380, 1100 - (rarity * 7.5));
  const hitWindow = Math.max(100, 190 - (rarity / 1.3));
  const spawnInterval = speedBase * 0.7; 
  
  overlay.innerHTML = `
    <div class="rhythm-container" id="rhythm-container">
      <div class="fishing-hint-rhythm">
        ¡RITMO DE PESCA! <br> 
        Seguí el orden <span>1, 2, 3...</span><br>
        ¡Mantené el foco!
      </div>
      <div class="rhythm-counter" id="rhythm-counter">NOTAS: 0 / ${totalNotes}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const container = document.getElementById('rhythm-container');
  const counter = document.getElementById('rhythm-counter');
  
  let spawnedNotes = 0;
  let clickedNotes = 0;
  let gameActive = true;

  function spawnNext() {
    if (!gameActive || spawnedNotes >= totalNotes) return;
    
    spawnedNotes++;
    const note = document.createElement('div');
    note.className = 'rhythm-note';
    note.textContent = spawnedNotes;
    
    // Random position avoiding edges
    const x = 15 + Math.random() * 70;
    const y = 20 + Math.random() * 60;
    note.style.left = `${x}%`;
    note.style.top = `${y}%`;
    
    const ring = document.createElement('div');
    ring.className = 'rhythm-ring';
    note.appendChild(ring);
    
    container.appendChild(note);
    
    let clicked = false;
    const startTime = Date.now();
    
    note.onmousedown = (e) => {
      e.stopPropagation();
      if (!gameActive || clicked) return;
      
      const elapsed = Date.now() - startTime;
      const diff = Math.abs(elapsed - speedBase);
      
      if (diff <= hitWindow) {
        clicked = true;
        clickedNotes++;
        counter.textContent = `NOTAS: ${clickedNotes} / ${totalNotes}`;
        note.classList.add('hit');
        setTimeout(() => note.remove(), 200);
        
        if (clickedNotes >= totalNotes) {
          gameActive = false;
          setTimeout(() => {
            overlay.remove();
            if (onWin) onWin();
          }, 500);
        }
      } else {
        fail();
      }
    };
    
    // Fail if not clicked in time
    setTimeout(() => {
      if (gameActive && !clicked) fail();
    }, speedBase + hitWindow);

    // Schedule next
    if (spawnedNotes < totalNotes) {
      setTimeout(spawnNext, spawnInterval);
    }
  }

  function fail() {
    if (!gameActive) return;
    gameActive = false;
    overlay.classList.add('fail');
    setTimeout(() => {
      overlay.remove();
      if (onFail) onFail();
    }, 1000);
  }

  // Start the first note
  setTimeout(spawnNext, 500);
}
