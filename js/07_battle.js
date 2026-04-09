// ===== BATTLE =====

// ── Restaurar batalla activa tras F5 ──────────────────────────────────────
function restoreActiveBattle() {
  const ab = state.activeBattle;
  if (!ab) return;

  // Verificar expiración (1 minuto = 60000ms)
  const now = Date.now();
  const battleTime = ab.timestamp || 0;
  if (battleTime > 0 && (now - battleTime) > 60000) {
    console.log('[RESTORE] La batalla guardada ha expirado (> 1 min).');
    state.activeBattle = null;
    scheduleSave();
    return;
  }

  // ── Caso PvP: Permitir reconexión si es reciente (< 60s) ──────────────────
  if (ab.isPvP) {
    const ov = document.createElement('div');
    ov.id = 'restore-battle-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
    
    // Si la batalla es demasiado vieja (> 1 min), ya se considera derrota definitiva
    const isTooOld = (now - (ab.timestamp || 0)) > 60000;
    
    if (isTooOld) {
      ov.innerHTML = `
        <div style="background:rgba(15,23,42,0.95); border-radius:24px; padding:32px; max-width:380px; width:100%; border:2px solid var(--red); text-align:center; box-shadow:0 0 50px rgba(239,68,68,0.4); backdrop-filter:blur(10px); color:white;">
          <div style="font-size:52px; margin-bottom:12px; filter:drop-shadow(0 0 10px rgba(239,68,68,0.5));">⚠️</div>
          <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--red); margin-bottom:16px; line-height:1.5;">BATALLA PvP EXPIRADA</div>
          <div style="font-size:13px; color:#cbd5e1; margin:12px 0; line-height:1.7;">
            La batalla contra <strong>${ab.enemyUsername || 'el rival'}</strong> ha expirado o fue abandonada.<br>
            <span style="color:var(--red); font-weight:bold;">Se registró como derrota.</span>
          </div>
          <button id="restore-pvp-close-btn" class="action-btn" style="width:100%; border-radius:12px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; font-family:'Press Start 2P',monospace; font-size:9px; padding:15px; margin-top:20px; cursor:pointer;">CONTINUAR</button>
        </div>`;
    } else {
      ov.innerHTML = `
        <div style="background:rgba(15,23,42,0.95); border-radius:30px; padding:40px 32px; max-width:420px; width:100%; border:2px solid #C77DFF; text-align:center; box-shadow:0 0 60px rgba(199,125,255,0.4); backdrop-filter:blur(15px); color:white; animation: scaleIn 0.3s ease-out;">
          <div style="font-size:60px; margin-bottom:20px; animation: pulse 2s infinite;">⚡</div>
          <div style="font-family:'Press Start 2P',monospace; font-size:12px; color:#C77DFF; margin-bottom:16px; letter-spacing:1px;">¡COMBATE DETECTADO!</div>
          <div style="font-size:14px; color:#e2e8f0; margin:16px 0; line-height:1.8;">
            Parece que te desconectaste de un combate contra <strong style="color:var(--purple);">${ab.enemyUsername || 'tu rival'}</strong>.<br>
            ¡Tienes <span style="color:var(--yellow); font-weight:800; font-family:'Press Start 2P',monospace; font-size:10px;">60</span> segundos para volver antes de perder por abandono!
          </div>
          <div style="display:grid; grid-template-columns: 1fr; gap:14px; margin-top:30px;">
            <button id="restore-pvp-reconnect-btn" class="action-btn" style="width:100%; padding:18px; background:linear-gradient(135deg, #C77DFF, #9b4dca); border:none; border-radius:16px; color:white; font-family:'Press Start 2P',monospace; font-size:10px; cursor:pointer; font-weight:900; box-shadow:0 10px 20px rgba(199,125,255,0.3); transition: transform 0.2s;">
              ▶ RECONECTAR AHORA
            </button>
            <button id="restore-pvp-forfeit-btn" class="action-btn" style="width:100%; padding:15px; background:transparent; border:1px solid rgba(255,59,59,0.3); border-radius:16px; color:var(--red); font-family:'Press Start 2P',monospace; font-size:8px; cursor:pointer;">
              ✕ ABANDONAR (DERROTA)
            </button>
          </div>
        </div>`;
    }

    document.body.appendChild(ov);

    const closeHandler = () => {
      ov.remove();
      if (!state.stats) state.stats = {};
      state.stats.pvpBattles = (state.stats.pvpBattles || 0) + 1;
      state.activeBattle = null;
      saveGame(false);
    };

    if (isTooOld) {
      document.getElementById('restore-pvp-close-btn').onclick = closeHandler;
    } else {
      document.getElementById('restore-pvp-reconnect-btn').onclick = () => {
        ov.remove();
        if (typeof attemptPvpReconnection === 'function') {
          attemptPvpReconnection(ab);
        } else {
          notify('Error: Sistema PvP no disponible', '❌');
          closeHandler();
        }
      };
      document.getElementById('restore-pvp-forfeit-btn').onclick = closeHandler;
    }
    return;
  }

  // Verificar que el jugador tenga Pokémon vivos
  const player = state.team.find(p => p.hp > 0 && !p.onMission);
  if (!player) {
    // Sin Pokémon vivos: limpiar batalla guardada y no restaurar
    console.warn('[RESTORE] No hay Pokémon vivos para restaurar la batalla.');
    state.activeBattle = null;
    scheduleSave();
    return;
  }

  // Verificar que el equipo enemigo tenga al menos un Pokémon vivo
  const enemyTeam = ab.enemyTeam || [];
  const firstAliveEnemy = enemyTeam.find(p => p.hp > 0);
  if (!firstAliveEnemy) {
    // Todos los enemigos ya estaban derrotados: limpiar y no restaurar
    console.warn('[RESTORE] Todos los enemigos ya estaban derrotados.');
    state.activeBattle = null;
    scheduleSave();
    return;
  }

  // Mostrar overlay de aviso antes de restaurar
  const ov = document.createElement('div');
  ov.id = 'restore-battle-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';

  const isGymBattle = ab.isGym;
  const icon = isGymBattle ? '🏅' : '⚔️';
  const title = isGymBattle ? 'BATALLA DE GIMNASIO' : 'BATALLA CONTRA ENTRENADOR';
  const desc = isGymBattle
    ? `¡Estabas en una batalla contra el Líder de Gimnasio! No podés escapar recargando la página.`
    : `¡Estabas en una batalla contra <strong>${ab.trainerName || 'un entrenador'}</strong>! No podés escapar recargando la página.`;

  // Calcular Pokémon vivos del equipo enemigo para mostrar en el overlay
  const aliveEnemies = enemyTeam.filter(p => p.hp > 0).length;
  const totalEnemies = enemyTeam.length;

  ov.innerHTML = `
        <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
          border:2px solid var(--red);text-align:center;box-shadow:0 0 40px rgba(239,68,68,0.3);">
          <div style="font-size:52px;margin-bottom:12px;">${icon}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--red);margin-bottom:12px;">${title}</div>
          <div style="font-size:13px;color:#eee;margin:12px 0;line-height:1.7;">${desc}</div>
          <div style="font-size:11px;color:var(--yellow);margin-bottom:6px;">
            📊 Estado: ${aliveEnemies}/${totalEnemies} Pokémon rivales vivos
          </div>
          <div style="font-size:11px;color:var(--gray);margin-bottom:20px;">La batalla fue guardada automáticamente. ¡Debés terminarla!</div>
          <button id="restore-battle-btn"
            style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 28px;border:none;border-radius:14px;
              cursor:pointer;background:linear-gradient(135deg,var(--red),#dc2626);color:#fff;
              box-shadow:0 4px 16px rgba(239,68,68,0.5);width:100%;">
            ⚡ CONTINUAR BATALLA
          </button>
        </div>`;
  document.body.appendChild(ov);

  document.getElementById('restore-battle-btn').onclick = () => {
    ov.remove();
    // Restaurar la batalla con el primer Pokémon vivo del equipo enemigo
    firstAliveEnemy._revealed = true;
    startBattle(
      firstAliveEnemy,
      ab.isGym,
      ab.gymId,
      ab.locationId,
      ab.isTrainer,
      enemyTeam,
      ab.trainerName
    );
    // Mostrar mensaje de restauración en el log de batalla
    setTimeout(() => {
      addLog('⚠️ <span style="color:var(--yellow);">Batalla restaurada tras recarga de página.</span>', 'log-info');
    }, 200);
  };
}

function startBattle(enemy, isGym, gymId, locationId, isTrainer, enemyTeam, trainerName) {
  if (enemy) enemy._revealed = true;
  _battleLock = false;
  const player = state.team.find(p => p.hp > 0 && !p.onMission);
  // Reset battle-only status flags
  player.confused = 0; player.flinched = false;
  enemy.confused = 0; enemy.flinched = false;
  // Remember last wild location for the "Continue Exploring?" prompt
  if (!isGym && locationId && !isTrainer) state.lastWildLocId = locationId;
  if (isTrainer) state.trainerChance = 5; // Reset pity on trainer encounter start

  state.battle = {
    enemy, player, isGym, gymId, isTrainer, enemyTeam, trainerName,
    playerTeamIndex: state.team.indexOf(player),
    locationId: locationId || (isGym ? 'gym' : 'plains'),
    turn: 'player', over: false,
    recharging: false, // for Hiperrayo etc
    playerStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    participants: [player.uid], // Track which pokemon saw this enemy
    learnQueue: [], // Accumulate moves to learn at end of battle
  };
  state.battle.player.choiceMove = null;

  // Guardar inmediatamente si es batalla obligatoria (entrenador o gimnasio)
  // Esto asegura que el estado se persista antes de que el jugador pueda hacer F5
  if ((isTrainer || isGym) && typeof saveGame === 'function') {
    saveGame(false);
  }

  // Robo Rápido del Equipo Rocket al inicio de batalla vs entrenador
  if (isTrainer && !isGym && typeof tryRocketSteal === 'function') {
    tryRocketSteal();
  }

  showScreen('battle-screen');
  updateBattleUI();
  renderMoveButtons();
  applyMoveButtonsGridLayout();

  let startMsg = `¡Un ${enemy.name} salvaje apareció!`;
  if (isGym) startMsg = `¡Un ${enemy.name} salvaje apareció! ¡Es un combate de Gimnasio!`;
  if (isTrainer) {
    const criminality = (state.playerClass === 'rocket' && state.classData?.criminality >= 100);
    if (criminality && !isGym) {
      startMsg = `¡${trainerName || 'El entrenador'} te desafía! <br><span style="color:#ef4444;font-weight:bold;">"Tu cabeza vale mucho. ¡Ya no robarás más Pokémon!"</span>`;
    } else {
      startMsg = `¡${trainerName || 'El entrenador'} te desafía!`;
    }
  }

  setLog(startMsg);
  setBtns(true);

  // ── Register enemy as Seen in Pokédex ────────────────────────────────────
  state.seenPokedex = state.seenPokedex || [];
  if (enemy && enemy.id && !state.seenPokedex.includes(enemy.id)) {
    state.seenPokedex.push(enemy.id);
  }
  // For trainer battles, also register rest of the enemy team as seen
  if (isTrainer && enemyTeam) {
    enemyTeam.forEach(p => {
      if (p && p.id && !state.seenPokedex.includes(p.id)) state.seenPokedex.push(p.id);
    });
  }

  // ── Entry Abilities ──────────────────────────────────────────────────────
  handleEntryAbilities(player, enemy, state.battle.playerStages, state.battle.enemyStages, addLog);

  // ── Predict Nature (Criador) ────────────────────────────────────────────
  if (state.playerClass === 'criador' && enemy.nature && !isGym && !isTrainer && !state.battle.isPvP) {
    const nat = enemy.nature;
    addLog(`¡Tu instinto de Criador predice que ${enemy.name} es de naturaleza <strong>${nat}</strong>!`, 'log-info');
  }

  // Draw background after screen is visible
  setTimeout(() => drawBattleBackground(state.battle.locationId), 50);
}

function handleEntryAbilities(p1, p2, p1Stages, p2Stages, addLogFn) {
  if (!p1 || !p2) return;

  // Intimidación (Intimidate)
  if (p1.ability === 'Intimidación') {
    p2Stages.atk = Math.max(-6, (p2Stages.atk || 0) - 1);
    addLogFn(`¡La Intimidación de ${p1.name} bajó el ataque de ${p2.name}!`, 'log-info');
  }
  if (p2.ability === 'Intimidación') {
    p1Stages.atk = Math.max(-6, (p1Stages.atk || 0) - 1);
    addLogFn(`¡La Intimidación de ${p2.name} bajó el ataque de ${p1.name}!`, 'log-info');
  }

  // Trace (Rastro)
  if (p1.ability === 'Rastro' && p2.ability) {
    p1.ability = p2.ability;
    addLogFn(`¡${p1.name} copió la habilidad ${p2.ability} de ${p2.name} con Rastro!`, 'log-info');
  }
  if (p2.ability === 'Rastro' && p1.ability) {
    p2.ability = p1.ability;
    addLogFn(`¡${p2.name} copió la habilidad ${p1.ability} de ${p1.name} con Rastro!`, 'log-info');
  }
}

function setBattleSprite(side, pokemonId, useBack) {
  const img = document.getElementById(side + '-sprite-img');
  // Clear any previous animations (like anim-faint) that keep the sprite hidden
  if (img) img.classList.remove('anim-faint', 'anim-damage', 'anim-shake');

  const pData = POKEMON_DB[pokemonId];
  // Side is 'player' or 'enemy'. Pokemon object is in state.battle[side]
  const p = state.battle[side];
  const url = useBack ? getBackSpriteUrl(pokemonId, p?.isShiny) : getSpriteUrl(pokemonId, p?.isShiny);
  if (img) {
    loadSprite(img, null, url);
    // Apply Aura if present
    img.classList.remove('aura-white', 'aura-black');
    if (p && p.aura) {
      img.classList.add('aura-' + p.aura);
    }
  }

  // Trigger sparkles for shiny
  if (p && p.isShiny) {
    triggerShinySparkles(side);
  }
}

function triggerShinySparkles(side) {
  const container = document.querySelector(`.battle-pokemon-container.${side}`);
  if (!container) return;

  // ✨ 8-bit shiny sound
  if (window.SFX && typeof window.SFX.shiny === 'function') {
    try { window.SFX.shiny(); } catch(e) {}
  }

  const sparklesWrap = document.createElement('div');
  sparklesWrap.className = 'shiny-sparkles';
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.textContent = '✨';
    const angle = (i / 8) * Math.PI * 2;
    const dist = 40 + Math.random() * 40;
    s.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    s.style.animationDelay = (Math.random() * 0.3) + 's';
    sparklesWrap.appendChild(s);
  }
  container.appendChild(sparklesWrap);
  setTimeout(() => sparklesWrap.remove(), 1500);
}

function updateBattleUI() {
  const b = state.battle;
  if (!b) return;

  const _pSt = statusIcon(b.player?.status);
  const _eSt = statusIcon(b.enemy?.status);
  let enemyNameText = b.enemy.name + (b.enemy.isShiny ? ' ✨' : '') + (_eSt ? ' ' + _eSt : '');
  const enemyNameEl = document.getElementById('enemy-name');
  const enemyGuardianEl = document.getElementById('enemy-guardian-tag');
  if (enemyGuardianEl) {
    if (b.enemy.isGuardian) {
      enemyGuardianEl.innerHTML = `<span class="guardian-battle-badge" style="margin:0;">GUARDIÁN</span>`;
      enemyGuardianEl.style.display = 'block';
    } else {
      enemyGuardianEl.style.display = 'none';
      enemyGuardianEl.innerHTML = '';
    }
  }
  enemyNameEl.textContent = enemyNameText;

  const natureEl = document.getElementById('enemy-nature-display');
  if (natureEl) {
    const isWild = !b.isTrainer && !b.isGym && !b.isPvP;
    if (state.playerClass === 'criador' && b.enemy.nature && isWild) {
      natureEl.innerHTML = buildNatureTooltip(b.enemy.nature);
      natureEl.style.display = 'block';
    } else {
      natureEl.style.display = 'none';
    }
  }
  const enemyGenderEl = document.getElementById('enemy-gender');
  if (enemyGenderEl) {
    const data = genderBadgeData(b.enemy.gender);
    enemyGenderEl.textContent = data.text;
    enemyGenderEl.classList.remove('gender-male', 'gender-female', 'gender-none');
    enemyGenderEl.classList.add(data.cls);
    enemyGenderEl.style.opacity = data.cls === 'gender-none' ? '0.6' : '1';
  }
  const caughtIcon = document.getElementById('enemy-caught-icon');
  if (caughtIcon) {
    // Check the enemy's form and all its pre-evolutions against the pokédex.
    // Forward evolutions (forms you haven't obtained yet) are NOT included.
    const pokedex = state.pokedex || [];
    let familyCaught = pokedex.includes(b.enemy.id);
    if (!familyCaught && typeof EVOLUTION_TABLE !== 'undefined') {
      // Build a reverse map (evolved form → pre-evolution)
      const PRE_EVO = {};
      for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
        PRE_EVO[data.to] = from;
      }
      // Walk backwards to the base form, collecting all ancestor IDs
      const family = new Set([b.enemy.id]);
      let cur = b.enemy.id;
      while (PRE_EVO[cur]) { cur = PRE_EVO[cur]; family.add(cur); }
      familyCaught = [...family].some(id => pokedex.includes(id));
    }
    caughtIcon.style.display = familyCaught ? 'inline-block' : 'none';
  }
  document.getElementById('enemy-level').textContent = `Nv. ${b.enemy.level}`;
  setBattleSprite('enemy', b.enemy.id, false);
  document.getElementById('enemy-hp-text').textContent = `HP: ${b.enemy.hp}/${b.enemy.maxHp}`;
  const ivTotalEl = document.getElementById('enemy-iv-total');
  if (ivTotalEl) {
    const isCazabichos = state.playerClass === 'cazabichos' && !b.isTrainer && !b.isGym && !b.isPvP;
    const isScannerActive = state.playerClass === 'entrenador' && (state.ivScannerSecs || 0) > 0 && !b.isPvP && !b.isTrainer && !b.isGym;
    
    if (isScannerActive && b.enemy.ivs) {
      const total = Object.values(b.enemy.ivs).reduce((s, v) => s + (v || 0), 0);
      ivTotalEl.textContent = `RADAR IV: ${total}/186`;
      ivTotalEl.style.display = 'block';
      ivTotalEl.style.color = 'var(--yellow)';
    } else if (isCazabichos) {
      const streak = (state.classData && state.classData.captureStreak) || 0;
      const mult = Math.min(1.0 + 0.15 * streak, 3.0).toFixed(1);
      ivTotalEl.textContent = `RACHA: x${streak} (Shiny x${mult})`;
      ivTotalEl.style.display = 'block';
      ivTotalEl.style.color = 'var(--green)';
    } else {
      ivTotalEl.style.display = 'none';
    }
  }
  const enemyPct = b.enemy.hp / b.enemy.maxHp;
  document.getElementById('enemy-hp-bar').style.width = (enemyPct * 100) + '%';
  document.getElementById('enemy-hp-bar').className = `hp-bar ${getHpClass(enemyPct)}`;

  const playerName = b.player.name + (b.player.isShiny ? ' ✨' : '') + (_pSt ? ' ' + _pSt : '');
  const playerNameEl = document.getElementById('player-name');
  if (playerNameEl) playerNameEl.textContent = playerName;
  const playerGenderEl = document.getElementById('player-gender');
  if (playerGenderEl) {
    const data = genderBadgeData(b.player.gender);
    playerGenderEl.textContent = data.text;
    playerGenderEl.classList.remove('gender-male', 'gender-female', 'gender-none');
    playerGenderEl.classList.add(data.cls);
    playerGenderEl.style.opacity = data.cls === 'gender-none' ? '0.6' : '1';
  }
  document.getElementById('player-battle-level').textContent = `Nv. ${b.player.level}`;
  setBattleSprite('player', b.player.id, true);
  document.getElementById('player-hp-text').textContent = `HP: ${b.player.hp}/${b.player.maxHp}`;
  const playerPct = b.player.hp / b.player.maxHp;
  document.getElementById('player-hp-bar').style.width = (playerPct * 100) + '%';
  document.getElementById('player-hp-bar').className = `hp-bar ${getHpClass(playerPct)}`;


  const expBar = document.getElementById('player-exp-bar');
  if (expBar) {
    const isMax = (b.player?.level || 0) >= 100;
    if (isMax) {
      expBar.style.width = '100%';
      expBar.style.background = 'linear-gradient(90deg,#FFD700,#FFF176)';
      expBar.style.boxShadow = '0 0 6px rgba(255,215,0,0.6)';
    } else {
      const exp = b.player?.exp || 0;
      const need = b.player?.expNeeded || 0;
      const expPct = need > 0 ? Math.max(0, Math.min(1, exp / need)) : 0;
      expBar.style.width = (expPct * 100) + '%';
      expBar.style.background = '';
      expBar.style.boxShadow = '';
    }
  }
  // Render Enemy Team Status (for Trainers/Gyms/PvP)
  const teamStatus = document.getElementById('enemy-team-status');
  if (teamStatus) {
    if (b.isGym || b.isTrainer || b.isPvP) {
      const team = b.enemyTeam || [];
      let iconsHtml = '';
      for (let i = 0; i < 6; i++) {
        if (i < team.length) {
          const p = team[i];
          if (p.hp <= 0) {
            // Fainted Pokemon Sprite
            iconsHtml += `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(p.id)}.png" 
                  style="width:20px;height:20px;image-rendering:pixelated;filter:grayscale(1) opacity(0.5);margin:0 -2px;">`;
          } else if (p._revealed) {
            // Revealed Pokemon Sprite
            iconsHtml += `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getSpriteId(p.id)}.png" 
                  style="width:20px;height:20px;image-rendering:pixelated;margin:0 -2px;">`;
          } else {
            // Unrevealed Pokeball Sprite
            iconsHtml += `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" 
                  style="width:16px;height:16px;image-rendering:pixelated;margin:2px 0;">`;
          }
        } else {
          // Empty Slot
          iconsHtml += '<div style="opacity:0.2;border:1px solid #fff;border-radius:50%;width:12px;height:12px;display:inline-block;margin:4px 2px;"></div>';
        }
      }
      teamStatus.innerHTML = iconsHtml;
      teamStatus.style.display = 'flex';
      teamStatus.style.alignItems = 'center';
      teamStatus.style.gap = '2px';
    } else {
      teamStatus.innerHTML = '';
      teamStatus.style.display = 'none';
    }
  }

  // Hide capture button if trainer/gym/pvp
  const btnCatchContainer = document.getElementById('btn-catch-container');
  const actionRow = document.getElementById('battle-action-row');
  const isNoCatch = (b.isGym || b.isTrainer || b.isPvP);
  
  if (btnCatchContainer) {
    btnCatchContainer.style.display = isNoCatch ? 'none' : 'flex';
  }
  if (actionRow) {
    if (isNoCatch) {
      actionRow.classList.add('no-catch');
    } else {
      actionRow.classList.remove('no-catch');
    }
  }
}

function setLog(msg, cls = 'log-info') {
  document.getElementById('battle-log').innerHTML = `<div class="log-entry ${cls}">${msg}</div>`;
}

function addLog(msg, cls = '') {
  const log = document.getElementById('battle-log');
  log.innerHTML += `<div class="log-entry ${cls}">${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

// Shows "Continue" and "Return to city" buttons after battle and expands log
function showBattleEndUI(callback, locId) {
  const log = document.getElementById('battle-log');
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  if (!isDesktop) {
    log.style.height = 'auto';
    log.style.maxHeight = '260px';
  } else {
    // On desktop, keep log constrained to its grid area
    log.style.height = '100%';
    log.style.maxHeight = 'none';
  }
  log.style.transition = 'max-height 0.35s ease';
  log.scrollTop = log.scrollHeight;

  const actionRow = document.querySelector('.action-row');
  if (actionRow) actionRow.style.display = 'none';

  const mb = document.getElementById('move-buttons');

  const resetLog = () => {
    log.style.height = '';
    log.style.maxHeight = '';
    log.style.transition = '';
    mb.innerHTML = '';
    if (actionRow) actionRow.style.display = '';
  };

  if (locId) {
    mb.style.display = 'flex';
    mb.style.flexDirection = 'column';
    mb.innerHTML = `
          <button id="battle-continue-btn" class="battle-continue-btn-full" style="padding:14px;margin-top:4px;background:linear-gradient(135deg,#6BCB77 0%,#3b82f6 100%);border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:12px;font-weight:bold;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 16px rgba(107,203,119,0.3);">▶ CONTINUAR</button>
          <button id="battle-city-btn" class="battle-continue-btn-full" style="padding:11px;margin-top:8px;background:rgba(255,59,59,0.18);border:1px solid rgba(255,59,59,0.4);border-radius:14px;color:#f87171;font-family:inherit;font-size:11px;font-weight:bold;cursor:pointer;letter-spacing:1px;">🏙️ VOLVER A LA CIUDAD</button>
        `;
    document.getElementById('battle-continue-btn').onclick = () => {
      resetLog();
      callback(false); // callback(toCity=false)
    };
    document.getElementById('battle-city-btn').onclick = () => {
      resetLog();
      callback(true); // callback(toCity=true)
    };
  } else {
    mb.style.display = 'flex';
    mb.style.flexDirection = 'column';
    mb.innerHTML = '<button id="battle-continue-btn" class="battle-continue-btn-full" style="padding:14px;margin-top:4px;background:linear-gradient(135deg,#6BCB77 0%,#3b82f6 100%);border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:12px;font-weight:bold;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 16px rgba(107,203,119,0.3);">▶ CONTINUAR</button>';
    document.getElementById('battle-continue-btn').onclick = () => {
      resetLog();
      callback(false);
    };
  }
}

function setBtns(enabled) {
  ['btn-catch', 'btn-switch', 'btn-bag', 'btn-run'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function applyMoveButtonsGridLayout() {
  const mb = document.getElementById('move-buttons');
  if (!mb) return;
  mb.style.display = 'grid';
  mb.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
  mb.style.gap = '8px';
  mb.style.flexDirection = '';
}

function renderMoveButtons() {
  const b = state.battle;
  const container = document.getElementById('move-buttons');
  const TYPE_COLORS = {
    normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
    electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
    ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
    rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
  };
  const CAT_ICON = { physical: '⚔️', special: '✨', status: '🔮' };
  if (!b.player || !b.player.moves) return;

  container.innerHTML = b.player.moves.map((m, i) => {
    if (!m) return '';
    const moveName = m.name || 'Desconocido';
    const md = MOVE_DATA[moveName] || { power: m.power || 0, type: 'normal', cat: 'physical' };
    const col = TYPE_COLORS[md.type] || '#aaa';
    
    let disabled = m.pp <= 0 || !m.name;
    if (b.player.heldItem === 'Cinta Elegida' && b.player.choiceMove && b.player.choiceMove !== moveName) {
      disabled = true;
    }

    const escapedName = moveName.replace(/'/g, "\\'");

    return `<button class="move-btn" ${disabled ? 'disabled' : ''}
      style="--move-color: ${col};"
      onclick="if(!window._touchTriggered) useMove(${i});"
      onmousedown="showMoveTooltip(event, '${escapedName}')"
      onmouseup="hideMoveTooltip()"
      onmouseleave="hideMoveTooltip()"
      ontouchstart="window._touchTriggered=true; this._tm=setTimeout(()=> { showMoveTooltip(event, '${escapedName}'); this._shown=true; }, 400);"
      ontouchend="clearTimeout(this._tm); if(this._shown){ hideMoveTooltip(); this._shown=false; } else { useMove(${i}); } setTimeout(()=>window._touchTriggered=false, 500);"
      oncontextmenu="event.preventDefault(); return false;">
      <span class="move-name">${moveName}</span>
      <div class="move-pp">
        <span class="type-badge type-${(md.type || 'normal').toLowerCase()}" style="font-size:8px; padding:2px 6px; border-radius:6px;">${md.type || '???'}</span>
        <span>${CAT_ICON[md.cat] || ''} PP:${m.pp || 0}/${m.maxPP || 0}</span>
      </div>
    </button>`;
  }).join('');
}

function showMoves() {
  renderMoveButtons();
  applyMoveButtonsGridLayout();
}

// ── Official damage formula (Gen 4+) ──────────────────────
function calcDamage(attacker, defender, move, atkStages, defStages, b_ctx = state.battle) {
  const md = MOVE_DATA[move.name] || { power: move.power || 40, type: 'normal', cat: 'physical' };
  let power = md.power || 0;
  if (md.effect === 'status_boost' && attacker.status) power *= 2;
  if (power === 0) return 0;

  const isPhysical = md.cat === 'physical';
  const atkStat = isPhysical ? attacker.atk : (attacker.spa || attacker.atk);
  const defStat = isPhysical ? defender.def : (defender.spd || defender.def);
  const atkMult = stageMult(atkStages ?? 0);
  const defMult = stageMult(defStages ?? 0);
  let A = Math.floor(atkStat * atkMult);
  if (isPhysical && attacker.status === 'burn') A = Math.max(1, Math.floor(A * 0.5));
  const D = Math.max(1, Math.floor(defStat * defMult));

  const base = Math.floor(((2 * attacker.level / 5 + 2) * power * A / D) / 50) + 2;

  const _defType2 = defender.type2 || POKE_TYPE2[defender.id];
  const eff = getTypeEffectiveness(md.type, defender.type, defender, attacker) * (_defType2 ? getTypeEffectiveness(md.type, _defType2, defender, attacker) : 1);
  
  let triggeredAbility = null;
  let defensiveAbility = null;

  // Detect Intrépido (Scrappy) activation
  if (attacker?.ability === 'Intrépido' && (md.type === 'normal' || md.type === 'fighting')) {
    const rawEff = (TYPE_CHART[md.type]?.[defender.type] ?? 1) * (_defType2 ? (TYPE_CHART[md.type]?.[_defType2] ?? 1) : 1);
    if (rawEff === 0 && eff > 0) {
      triggeredAbility = 'Intrépido';
    }
  }

  const _atkType2 = attacker.type2 || POKE_TYPE2[attacker.id];
  let stab = (md.type === attacker.type || (_atkType2 && md.type === _atkType2)) ? 1.5 : 1;

  if (attacker.ability === 'Adaptable' && stab > 1) {
    stab = 2;
    triggeredAbility = 'Adaptable';
  }

  const { mult: abilityMult, triggeredAbility: boosterAb } = getAbilityMultiplier(attacker, defender, move);
  if (boosterAb) triggeredAbility = boosterAb;
  let finalAbilityMult = abilityMult;

  // Thick Fat (Sebo)
  if (defender.ability === 'Sebo' && (md.type === 'fire' || md.type === 'ice')) {
    finalAbilityMult *= 0.5;
    defensiveAbility = 'Sebo';
  }

  // Held Items multipliers
  let itemMult = 1;
  if (attacker.heldItem) {
    const h = attacker.heldItem;
    // Type boosters (20%)
    if (h === 'Carbón' && md.type === 'fire') itemMult *= 1.2;
    if (h === 'Imán' && md.type === 'electric') itemMult *= 1.2;
    if (h === 'Agua Mística' && md.type === 'water') itemMult *= 1.2;
    if (h === 'Semilla Milagro' && md.type === 'grass') itemMult *= 1.2;
    if (h === 'Cinturón Negro' && md.type === 'fighting') itemMult *= 1.2;
    if (h === 'Cuchara Torcida' && md.type === 'psychic') itemMult *= 1.2;
    if (h === 'Hechizo' && md.type === 'ghost') itemMult *= 1.2;
    if (h === 'Polvo Plata' && md.type === 'bug') itemMult *= 1.2;
    if (h === 'Flecha Venenosa' && md.type === 'poison') itemMult *= 1.2;
    if (h === 'Bola Luminosa' && attacker.id === 'pikachu') itemMult *= 2.0;
    if (h === 'Hueso Grueso' && (attacker.id === 'cubone' || attacker.id === 'marowak')) itemMult *= 2.0;

    // Choice Band (50% physical)
    if (h === 'Cinta Elegida' && md.cat === 'physical') itemMult *= 1.5;
  }

  // Weather Multiplier
  let weatherMult = 1;
  const b = b_ctx;
  if (b && b.weather && b.weather.turns > 0) {
    if (b.weather.type === 'sun') {
      if (md.type === 'fire') weatherMult = 1.5;
      else if (md.type === 'water') weatherMult = 0.5;
    } else if (b.weather.type === 'rain') {
      if (md.type === 'water') weatherMult = 1.5;
      else if (md.type === 'fire') weatherMult = 0.5;
    }
  }

  // Screens (Reflect / Light Screen)
  let screenMult = 1;
  const targetStages = b ? ((defender === b.player) ? b.playerStages : b.enemyStages) : null;
  if (targetStages) {
    if (isPhysical && targetStages.reflect) screenMult = 0.5;
    else if (!isPhysical && targetStages.lightScreen) screenMult = 0.5;
  }

  const random = 0.85 + Math.random() * 0.15;
  let critRate = (attacker.heldItem === 'Lente Zoom') ? 0.12 : 0.06;
  if (attacker.heldItem === 'Palo' && attacker.id === 'farfetchd') critRate += 0.25;
  if (attacker.focusEnergy) critRate += 0.25; // Foco Energía = +2 critical stages

  let isCrit = Math.random() < critRate;
  if (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla') {
    if (isCrit) defensiveAbility = defender.ability;
    isCrit = false;
  }
  const critMult = isCrit ? 2 : 1;

  const finalDmg = eff > 0 ? Math.max(1, Math.floor(base * stab * finalAbilityMult * eff * random * itemMult * critMult * weatherMult * (isCrit ? 1 : screenMult))) : 0;
  return { dmg: finalDmg, eff, stab, isCrit, triggeredAbility, defensiveAbility };
}

function getTypeEffectiveness(moveType, defType, defender = null, attacker = null) {
  // Scrappy (Intrépido) logic
  if (attacker?.ability === 'Intrépido' && defType === 'ghost' && (moveType === 'normal' || moveType === 'fighting')) {
    return 1;
  }
  const row = TYPE_CHART[moveType] || {};
  return row[defType] ?? 1;
}

function getAbilityMultiplier(attacker, defender, move) {
  const md = MOVE_DATA[move.name] || {};
  let mult = 1;
  let triggeredAbility = null;
  const ab = attacker.ability;

  // Damage boosters at low HP (1/3)
  const isLowHp = attacker.hp <= (attacker.maxHp / 3);
  if (isLowHp) {
    if (ab === 'Mar llamas' && md.type === 'fire') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Torrente' && md.type === 'water') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Espesura' && md.type === 'grass') { mult *= 1.5; triggeredAbility = ab; }
    if (ab === 'Enjambre' && md.type === 'bug') { mult *= 1.5; triggeredAbility = ab; }
  }

  // Agallas (Guts)
  if (ab === 'Agallas' && attacker.status && md.cat === 'physical') {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  // Experto (Technician)
  if (ab === 'Experto' && md.power > 0 && md.power <= 60) {
    mult *= 1.5;
    triggeredAbility = ab;
  }

  // Adaptable handled in calcDamage for cleaner logic but could be set here too
  // Actually, let's keep it in calcDamage as it's a STAB modifier.

  // Poder Solar: Sp. Atk +50% under sun
  if (ab === 'Poder Solar' && md.cat === 'special') {
    const cycle = (typeof getDayCycle === 'function') ? getDayCycle() : 'day';
    if (cycle === 'day' || cycle === 'morning') {
      mult *= 1.5;
      triggeredAbility = ab;
    }
  }
  
  // Rivalidad (Rivalry)
  if (ab === 'Rivalidad' && attacker.gender && defender.gender) {
    if (attacker.gender === defender.gender) {
      mult *= 1.25;
      triggeredAbility = ab;
    } else if (attacker.gender !== 'none' && defender.gender !== 'none') {
      mult *= 0.75;
      triggeredAbility = ab;
    }
  }

  return { mult, triggeredAbility };
}

let _battleLock = false;

// ── Apply a move effect to battle state ───────────────────
function applyMoveEffect(effect, src, tgt, srcStages, tgtStages, addLogFn, b_ctx = state.battle) {
  if (!effect) return;
  const roll = Math.random() * 100;

  let chance = 100;
  let effectBase = effect;

  // Solo separar probabilidad si el efecto termina en _10, _15, _20, _30, _40 (probabilidades típicas de efectos secundarios)
  // Pero NO si es _2 (niveles de stat) o _50 (curación, que debe ser 100% de probabilidad de activarse)
  if (/_(10|15|20|30|40)$/.test(effect) && !effect.startsWith('heal_')) {
    chance = parseInt(effect.match(/\d+$/)?.[0] || '100');
    effectBase = effect.replace(/_\d+$/, '');
  }

  if (roll > chance && chance < 100) return; // didn't proc
  
  // Shield Dust (Polvo escudo): Protects against secondary effects (chance < 100)
  if (tgt.ability === 'Polvo escudo' && chance < 100) {
    if (effectBase !== 'leech_seed' && effectBase !== 'metronome') { // usually effects like burn_10
       addLogFn(`¡El Polvo escudo de ${tgt.name} evitó los efectos secundarios!`, 'log-info');
       return; 
    }
  }
  
  // Clear Body (Cuerpo Puro): Protects against stat drops from opponent
  const isStatDownEnemy = effect.startsWith('stat_down_enemy') || effectBase.startsWith('stat_down_enemy');
  if (tgt.ability === 'Cuerpo Puro' && isStatDownEnemy && src !== tgt) {
    addLogFn(`¡El Cuerpo Puro de ${tgt.name} evitó las reducciones de estadísticas!`, 'log-info');
    return;
  }

  // Intentar primero con el efecto completo, si no coincide, usar el base
  // (Esto permite que case 'heal_50' funcione y también case 'burn')
  let finalEffect = effect;
  // Si el efecto base es diferente y no hay un case para el efecto completo, podríamos usar el base.
  // Pero en JS no podemos "probar" un switch fácilmente.
  // Sin embargo, viendo el código, la mayoría de los cases ya contemplan ambos o usan el base.
  
  // Para asegurar compatibilidad, usaremos una lógica que favorezca el match más específico
  switch (effect) {
    case 'heal_50':
    case 'stat_up_self_atk_2':
    case 'stat_up_self_def_2':
    case 'stat_up_self_spa_2':
    case 'stat_up_self_spe_2':
    case 'stat_up_self_eva_2':
    case 'stat_down_enemy_def_2':
    case 'stat_down_enemy_atk_2':
    case 'stat_down_self_spa_2':
    case 'stat_up_self_atk_def':
    case 'stat_up_self_spa_spd':
    case 'stat_up_self_def_spd':
      finalEffect = effect;
      break;
    default:
      finalEffect = effectBase;
  }

  // Magic Guard (Muro Mágico) prevents indirect damage effects normally, 
  // but it's handled in the tick functions rather than here for better control.

  switch (finalEffect) {
    case 'stat_down_enemy_atk': 
      if (tgt.ability === 'Corte Fuerte') {
        addLogFn(`¡El Corte Fuerte de ${tgt.name} evitó que bajara su ataque!`, 'log-info');
      } else {
        tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1); 
        addLogFn(`¡Bajó el Ataque de ${tgt.name}!`, 'log-info'); 
      }
      break;
    case 'stat_down_enemy_def': tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1); addLogFn(`¡Bajó la Defensa de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_spe': tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1); addLogFn(`¡Bajó la Velocidad de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_spa': tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 1); addLogFn(`¡Bajó el At.Esp de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_spd': tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 1); addLogFn(`¡Bajó la Def.Esp de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_acc': 
      if (tgt.ability === 'Vista lince') {
        addLogFn(`¡La Vista lince de ${tgt.name} evitó que bajara su precisión!`, 'log-info');
      } else {
        tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1); 
        addLogFn(`¡Bajó la Precisión de ${tgt.name}!`, 'log-info'); 
      }
      break;
    case 'stat_up_self_atk': srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1); addLogFn(`¡Subió el Ataque de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_atk_2': srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2); addLogFn(`¡Subió mucho el Ataque de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_def': srcStages.def = Math.min(6, (srcStages.def || 0) + 1); addLogFn(`¡Subió la Defensa de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_def_2': srcStages.def = Math.min(6, (srcStages.def || 0) + 2); addLogFn(`¡Subió mucho la Defensa de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_spa_2': srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2); addLogFn(`¡Subió mucho el At.Esp de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_spe_2': srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2); addLogFn(`¡Subió mucho la Velocidad de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_eva': srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1); addLogFn(`¡Aumentó la evasión de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_eva_2': srcStages.eva = Math.min(6, (srcStages.eva || 0) + 2); addLogFn(`¡Aumentó mucho la evasión de ${src.name}!`, 'log-info'); break;
    case 'stat_down_enemy_def_2': tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 2); addLogFn(`¡Bajó mucho la Defensa de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_atk_2': tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 2); addLogFn(`¡Bajó mucho el Ataque de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_self_spa_2': srcStages.spa = Math.max(-6, (srcStages.spa || 0) - 2); addLogFn(`¡Bajó mucho el At. Esp de ${src.name}!`, 'log-info'); break;
    case 'stat_up_self_atk_def': 
      srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      addLogFn(`¡Subió el Ataque y la Defensa de ${src.name}!`, 'log-info');
      break;
    case 'stat_up_self_spa_spd':
      srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
      srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
      addLogFn(`¡Subió el At. Esp y la Def. Esp de ${src.name}!`, 'log-info');
      break;
    case 'stat_up_self_def_spd':
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
      addLogFn(`¡Subió la Defensa y la Def. Esp de ${src.name}!`, 'log-info');
      break;
    case 'rage':
      src.rageActive = true;
      addLogFn(`¡La Furia de ${src.name} comienza a arder!`, 'log-info');
      break;
    case 'stat_down_enemy_eva': tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1); addLogFn(`¡Bajó la Evasión de ${tgt.name}!`, 'log-info'); break;
    case 'stat_down_enemy_spe_2': tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2); addLogFn(`¡Bajó mucho la Velocidad de ${tgt.name}!`, 'log-info'); break;
    case 'heal_50':
      const healAmt = Math.floor(src.maxHp / 2);
      src.hp = Math.min(src.maxHp, src.hp + healAmt);
      // Sincronizar con el equipo persistente si es el jugador
      if (src === state.battle?.player) {
        const pIdx = state.team.findIndex(p => p.uid === src.uid || p.name === src.name);
        if (pIdx !== -1) state.team[pIdx].hp = src.hp;
      }
      addLogFn(`¡${src.name} recuperó salud! (+${healAmt} HP)`, 'log-info');
      break;
    case 'heal_weather':
      const cycle = (typeof getDayCycle === 'function') ? getDayCycle() : 'day';
      let healPct = 0.5;
      if (cycle === 'day' || cycle === 'morning') healPct = 0.66;
      if (cycle === 'dusk') healPct = 0.33;
      if (cycle === 'night') healPct = 0.25;
      const hwAmt = Math.floor(src.maxHp * healPct);
      src.hp = Math.min(src.maxHp, src.hp + hwAmt);
      // Sincronizar con el equipo persistente si es el jugador
      if (src === state.battle?.player) {
        const pIdx = state.team.findIndex(p => p.uid === src.uid || p.name === src.name);
        if (pIdx !== -1) state.team[pIdx].hp = src.hp;
      }
      addLogFn(`¡${src.name} recuperó salud con el clima! (+${hwAmt} HP)`, 'log-info');
      break;
    case 'burn': case 'burn_10':
      if (!tgt.status) {
        if (tgt.type === 'fire' || tgt.type2 === 'fire') { addLogFn(`¡${tgt.name} es inmune a las quemaduras!`, 'log-info'); break; }
        tgt.status = 'burn'; addLogFn(`¡${tgt.name} fue quemado!`, 'log-info');
      } break;
    case 'paralyze': case 'paralyze_10': case 'paralyze_30':
      if (!tgt.status) {
        if (tgt.ability === 'Flexibilidad') { addLogFn(`¡La Flexibilidad de ${tgt.name} evitó la parálisis!`, 'log-info'); break; }
        tgt.status = 'paralyze'; addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info');
      } break;
    case 'poison': case 'poison_20':
      if (!tgt.status) {
        if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') { addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info'); break; }
        if (tgt.ability === 'Inmunidad') { addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info'); break; }
        tgt.status = 'poison'; addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info');
      } break;
    case 'freeze': case 'freeze_10':
      if (!tgt.status) {
        if (tgt.type === 'ice' || tgt.type2 === 'ice') { addLogFn(`¡${tgt.name} es inmune al congelamiento!`, 'log-info'); break; }
        tgt.status = 'freeze'; addLogFn(`¡${tgt.name} fue congelado!`, 'log-info');
      } break;
    case 'bad_poison':
      if (!tgt.status) {
        if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') { addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info'); break; }
        if (tgt.ability === 'Inmunidad') { addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info'); break; }
        tgt.status = 'poison'; 
        tgt.badPoison = 1; 
        addLogFn(`¡${tgt.name} fue gravemente envenenado!`, 'log-info');
      } break;
    case 'sleep':
      if (!tgt.status) { 
        if (tgt.ability === 'Insomnio' || tgt.ability === 'Espíritu Vital') { addLogFn(`¡${tgt.name} tiene ${tgt.ability} y no puede dormir!`, 'log-info'); break; }
        tgt.status = 'sleep'; tgt.sleepTurns = 1 + Math.floor(Math.random() * 3); addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info'); 
      } break;
    case 'confuse':
      if (!tgt.confused) { 
        if (tgt.ability === 'Ritmo Propio') { addLogFn(`¡El Ritmo Propio de ${tgt.name} evitó la confusión!`, 'log-info'); break; }
        tgt.confused = 2 + Math.floor(Math.random() * 4); addLogFn(`¡${tgt.name} está confundido!`, 'log-info'); 
      } break;
    case 'rest':
      src.hp = src.maxHp; src.status = 'sleep'; src.sleepTurns = 2;
      // Sincronizar con el equipo persistente si es el jugador
      if (src === state.battle?.player) {
        const pIdx = state.team.findIndex(p => p.uid === src.uid || p.name === src.name);
        if (pIdx !== -1) {
          state.team[pIdx].hp = src.hp;
          state.team[pIdx].status = src.status;
          state.team[pIdx].sleepTurns = src.sleepTurns;
        }
      }
      addLogFn(`¡${src.name} se recuperó completamente y se quedó dormido!`, 'log-info'); break;
    case 'tri_attack':
      if (!tgt.status) {
        const rollTA = Math.random();
        const t1 = tgt.type, t2 = tgt.type2;
        const isFire = (t1 === 'fire' || t2 === 'fire');
        const isIce = (t1 === 'ice' || t2 === 'ice');
        
        if (rollTA < 0.33) {
           if (isFire) { addLogFn(`¡${tgt.name} es inmune a las quemaduras!`, 'log-info'); }
           else { tgt.status = 'burn'; addLogFn(`¡${tgt.name} fue quemado!`, 'log-info'); }
        } else if (rollTA < 0.66) {
           tgt.status = 'paralyze'; addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info');
        } else {
           if (isIce) { addLogFn(`¡${tgt.name} es inmune al congelamiento!`, 'log-info'); }
           else { tgt.status = 'freeze'; addLogFn(`¡${tgt.name} fue congelado!`, 'log-info'); }
        }
      }
      break;
    case 'flinch_30': case 'flinch':
      if (tgt.ability === 'Foco Interno') {
        addLogFn(`¡El Foco Interno de ${tgt.name} evitó que retrocediera!`, 'log-info');
      } else {
        tgt.flinched = true; 
      }
      break;
    case 'teleport':
      if (state.battle && !state.battle.isTrainer && !state.battle.isGym) {
        addLogFn(`¡${src.name} se teletransportó lejos de la batalla!`, 'log-info');
        state.battle.over = true;
        // No seteamos state.battle = null inmediatamente para evitar errores en el flujo de turnos
        setTimeout(() => {
          state.battle = null;
          showScreen('game-screen');
          showTab('map');
        }, 1000);
      } else {
        addLogFn('¡Pero falló!', 'log-enemy');
      }
      break;
    case 'leech_seed':
      if (tgt.type === 'grass' || tgt.type2 === 'grass') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info');
      } else if (!tgt.seeded) {
        tgt.seeded = true;
        addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info');
      } else {
        addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info');
      }
      break;
    case 'metronome':
      // This is reached if Metrónomo is executed generically (which we intercept anyway),
      // just in case we let it here, but interception is preferred due to move object mutation.
      break;
    case 'roar': {
      const b = b_ctx;
      if (!b) break;

      // Inmunidad: Succión (Suction Cups) y Anclaje (Ingrain)
      if (tgt.ability === 'Succión' || tgt.ability === 'Ventosa') {
        addLogFn(`¡${src.name} usó Remolino/Rugido!`, 'log-info');
        addLogFn(`¡La ${tgt.ability} de ${tgt.name} impidió ser arrastrado!`, 'log-info');
        break;
      }

      const isPlayerAttacking = (src === b.player);

      if (isPlayerAttacking) {
        // Jugador usa Remolino/Rugido sobre el enemigo
        if (!b.isTrainer && !b.isGym) {
          // Batalla salvaje: el Pokémon huye
          addLogFn(`¡${src.name} usó Remolino!`, 'log-info');
          addLogFn(`¡El ${tgt.name} salvaje huyó asustado!`, 'log-player');
          b.over = true;
          setTimeout(() => {
            state.battle = null;
            showScreen('game-screen');
            showTab('map');
          }, 1500);
        } else {
          // Batalla de entrenador/gimnasio: fuerza cambio aleatorio
          const aliveOthers = (b.enemyTeam || []).filter(p => p !== b.enemy && p.hp > 0);
          if (aliveOthers.length === 0) {
            addLogFn(`¡${src.name} usó Remolino!`, 'log-info');
            addLogFn('¡Pero no surtió efecto!', 'log-enemy');
            break;
          }
          const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          addLogFn(`¡${src.name} usó Remolino!`, 'log-info');
          addLogFn(`¡${tgt.name} fue expulsado del campo! ¡${randomPick.name} entra al combate!`, 'log-player');
          randomPick._revealed = true;
          b.enemy = randomPick;
          b.enemy.confused = 0;
          b.enemy.flinched = false;
          b.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
          b.participants = b.participants || [b.player.uid];
          if (typeof updateBattleUI === 'function') setTimeout(updateBattleUI, 50);
        }
      } else {
        // Enemigo usa Remolino/Rugido sobre el jugador
        const alivePlayerOthers = (state.team || []).filter(p => p !== b.player && p.hp > 0);
        if (alivePlayerOthers.length === 0) {
          addLogFn(`¡${src.name} usó Rugido!`, 'log-info');
          addLogFn('¡Pero no surtió efecto!', 'log-enemy');
          break;
        }
        const randomPlayerPick = alivePlayerOthers[Math.floor(Math.random() * alivePlayerOthers.length)];
        addLogFn(`¡${src.name} usó Rugido!`, 'log-info');
        addLogFn(`¡${tgt.name} fue expulsado del campo! ¡${randomPlayerPick.name} entra al combate!`, 'log-enemy');
        // Sync current player HP back to team
        const tm = state.team.find(p => p.name === b.player.name);
        if (tm) tm.hp = b.player.hp;
        b.player = randomPlayerPick;
        b.player.confused = 0;
        b.player.flinched = false;
        b.playerStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
        b.playerTeamIndex = state.team.indexOf(randomPlayerPick);
        if (typeof updateBattleUI === 'function') setTimeout(updateBattleUI, 50);
        if (typeof renderMoveButtons === 'function') setTimeout(renderMoveButtons, 60);
      }
      break;
    }
    case 'disable': {
      if (tgt.disabledTurns > 0) {
        addLogFn('¡Pero falló!', 'log-enemy');
        break;
      }
      const validMoves = tgt.moves.filter(m => m.pp > 0);
      if (validMoves.length === 0) {
        addLogFn('¡Pero falló!', 'log-enemy');
        break;
      }
      const moveToDisable = validMoves[Math.floor(Math.random() * validMoves.length)].name;
      tgt.disabledMove = moveToDisable;
      tgt.disabledTurns = 4;
      addLogFn(`¡La Anulación deshabilitó ${moveToDisable} de ${tgt.name}!`, 'log-info');
      break;
    }
    case 'encore': {
      if (tgt.encoreTurns > 0) {
        addLogFn('¡Pero falló!', 'log-enemy');
        break;
      }
      const validEncore = tgt.moves.filter(m => m.pp > 0);
      if (validEncore.length === 0) {
        addLogFn('¡Pero falló!', 'log-enemy');
        break;
      }
      const enMove = validEncore[Math.floor(Math.random() * validEncore.length)].name;
      tgt.encoreMove = enMove;
      tgt.encoreTurns = 4; // 1 duration tick immediately happens sometimes, 3-4 is fine
      addLogFn(`¡${tgt.name} fue obligado a repetir ${enMove}!`, 'log-info');
      break;
    }
    case 'focus_energy':
      addLogFn(`¡${src.name} se está concentrando!`, 'log-info');
      addLogFn('¡Su tasa de críticos aumentó!', 'log-info');
      // Simple implementation: just a log for now, could add a flag if needed
      src.focusEnergy = true;
      break;
    case 'transform':
      const originalName = src.name;
      if (!src.isTransformed) {
        src.originalForm = JSON.parse(JSON.stringify(src));
        src.isTransformed = true;
      }
      src.id = tgt.id;
      src.name = tgt.name;
      src.type = tgt.type;
      src.type2 = tgt.type2 || (POKE_TYPE2 ? POKE_TYPE2[tgt.id] : null);
      src.atk = tgt.atk;
      src.def = tgt.def;
      src.spa = tgt.spa;
      src.spd = tgt.spd;
      src.spe = tgt.spe;
      // Copy moves with 5 PP
      src.moves = JSON.parse(JSON.stringify(tgt.moves)).map(m => {
        m.pp = 5;
        m.maxPP = 5;
        return m;
      });
      addLogFn(`¡${originalName} se transformó en ${tgt.name}!`, 'log-info');
      if (typeof updateBattleUI === 'function') setTimeout(updateBattleUI, 50);
      break;

    // --- NEW EFFECTS ---
    case 'sun': 
      state.battle.weather = { type: 'sun', turns: 5 }; 
      addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info'); break;
    case 'rain': 
      state.battle.weather = { type: 'rain', turns: 5 }; 
      addLogFn("¡Empezó a llover!", 'log-info'); break;
    case 'sandstorm': 
      state.battle.weather = { type: 'sandstorm', turns: 5 }; 
      addLogFn("¡Se desató una tormenta de arena!", 'log-info'); break;
    case 'hail': 
      state.battle.weather = { type: 'hail', turns: 5 }; 
      addLogFn("¡Empezó a granizar!", 'log-info'); break;

    case 'reflect':
      if (srcStages.reflect) { addLogFn("¡Pero falló!", 'log-info'); break; }
      srcStages.reflect = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info'); break;
    case 'light_screen':
      if (srcStages.lightScreen) { addLogFn("¡Pero falló!", 'log-info'); break; }
      srcStages.lightScreen = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info'); break;
    case 'safeguard':
      if (srcStages.safeguard) { addLogFn("¡Pero falló!", 'log-info'); break; }
      srcStages.safeguard = 5;
      addLogFn(`¡Tu equipo está protegido contra estados por el Velo Sagrado!`, 'log-info'); break;

    case 'protect':
      src.protected = true;
      addLogFn(`¡${src.name} se está protegiendo!`, 'log-info'); break;

    case 'bind':
      if (tgt.bindTurns) { addLogFn("¡Pero falló!", 'log-info'); break; }
      tgt.bindTurns = 2 + Math.floor(Math.random() * 4);
      addLogFn(`¡${tgt.name} ha sido atrapado!`, 'log-info'); break;

    case 'curse':
      if (src.type === 'ghost' || (Array.isArray(src.type) && src.type.includes('ghost'))) {
        if (tgt.cursed) { addLogFn("¡Pero falló!", 'log-info'); break; }
        src.hp = Math.max(0, src.hp - Math.floor(src.maxHp / 2));
        tgt.cursed = true;
        addLogFn(`¡${src.name} sacrificó PS para maldecir a ${tgt.name}!`, 'log-player');
      } else {
        // Non-ghost curse: +Atk, +Def, -Spe
        srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
        srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
        srcStages.spe = Math.max(-6, (srcStages.spe || 0) - 1);
        addLogFn(`¡Subió el Ataque y la Defensa de ${src.name}, pero bajó su Velocidad!`, 'log-info');
      }
      break;
  }
}

function checkAbilityImmunity(attacker, defender, move, addLogFn, b_ctx = state.battle) {
  const ab = defender.ability;
  const md = MOVE_DATA[move.name] || {};

  if (ab === 'Pararrayos' && md.type === 'electric') {
    addLogFn(`¡El Pararrayos de ${defender.name} absorbió el ataque!`, 'log-info');
    const b = b_ctx;
    const stages = (b && b.enemy === defender) ? b.enemyStages : (b ? b.playerStages : null);
    if (stages) {
      stages.spa = Math.min(6, (stages.spa || 0) + 1);
      addLogFn(`¡Subió el At. Esp de ${defender.name}!`, 'log-info');
    }
    return true;
  }
  
  if (ab === 'Absorbe Agua' && md.type === 'water') {
    addLogFn(`¡El Absorbe Agua de ${defender.name} absorbió el ataque!`, 'log-info');
    const heal = Math.floor(defender.maxHp / 4);
    defender.hp = Math.min(defender.maxHp, defender.hp + heal);
    addLogFn(`¡${defender.name} recuperó HP!`, 'log-info');
    return true;
  }

  if (ab === 'Absorbe Voltio' && md.type === 'electric') {
    addLogFn(`¡El Absorbe Voltio de ${defender.name} absorbió el ataque!`, 'log-info');
    const heal = Math.floor(defender.maxHp / 4);
    defender.hp = Math.min(defender.maxHp, defender.hp + heal);
    addLogFn(`¡${defender.name} recuperó HP!`, 'log-info');
    return true;
  }

  if (ab === 'Absorbe Fuego' && md.type === 'fire') {
    addLogFn(`¡El Absorbe Fuego de ${defender.name} absorbió el ataque!`, 'log-info');
    return true;
  }

  if (ab === 'Insonorizar' && md.sound) {
    addLogFn(`¡El Insonorizar de ${defender.name} bloqueó el ataque de sonido!`, 'log-info');
    return true;
  }

  if (ab === 'Levitación' && md.type === 'ground' && md.cat !== 'status') {
    addLogFn(`¡${defender.name} levita y evita el ataque!`, 'log-info');
    return true;
  }
  
  if (ab === 'Humedad' && (move.name === 'Autodestrucción' || move.name === 'Explosión')) {
    addLogFn(`¡La Humedad de ${defender.name} impide la explosión!`, 'log-info');
    return true;
  }

  return false;
}

// ── Status effect tick (end of turn) ─────────────────────
function tickStatus(pokemon, addLogFn, role) {
  if (pokemon.disabledTurns > 0) {
    pokemon.disabledTurns--;
    if (pokemon.disabledTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya puede usar ${pokemon.disabledMove || 'su movimiento'} de nuevo!`, 'log-info');
      pokemon.disabledMove = null;
    }
  }
  if (pokemon.encoreTurns > 0) {
    pokemon.encoreTurns--;
    if (pokemon.encoreTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya no está bajo el efecto de Otra Vez!`, 'log-info');
      pokemon.encoreMove = null;
    }
  }

  if (!pokemon.status) return false; // false = no damage
  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';
  switch (pokemon.status) {
    case 'burn':
      pokemon.hp = Math.max(0, pokemon.hp - Math.max(1, Math.floor(pokemon.maxHp / 8)));
      addLogFn(`¡${pokemon.name} sufre quemaduras! (-${Math.max(1, Math.floor(pokemon.maxHp / 8))} HP)`, logCls);
      return true;
    case 'poison':
      let dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      if (pokemon.badPoison) {
        dmg = Math.max(1, Math.floor((pokemon.maxHp * pokemon.badPoison) / 16));
        pokemon.badPoison++;
      }
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre el veneno! (-${dmg} HP)`, logCls);
      return true;
  }
  return false;
}

function tickLeechSeed(pokemon, role, addLogFn, b_ctx = state.battle) {
  if (!pokemon.seeded || pokemon.hp <= 0) return false;
  const b = b_ctx;
  if (!b) return false;

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  addLogFn(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy');

  const opponent = (role === 'player') ? b.enemy : b.player;
  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    addLogFn(`¡${opponent.name} recuperó salud!`, 'log-info');

    // Sync player heal to team
    if (role === 'enemy') { // Opponent is player
      const tm = state.team.find(p => p.name === b.player.name);
      if (tm) tm.hp = b.player.hp;
    }
  }
  return true;
}

// ── Status icon ───────────────────────────────────────────
function statusIcon(s) {
  return { burn: '🔥', poison: '☠️', paralyze: '⚡', sleep: '💤', freeze: '🧊' }[s] || '';
}

function getEffectiveSpeed(pokemon, stages) {
  const baseSpe = pokemon.spe || 40;
  const stage = stages?.spe || 0;
  let spe = Math.max(1, Math.floor(baseSpe * stageMult(stage)));
  
  // Abilities affecting speed
  if (pokemon.ability === 'Fuga' && pokemon.status) {
    spe *= 2;
  }
  
  const cycle = (typeof getDayCycle === 'function') ? getDayCycle() : 'day';
  if (pokemon.ability === 'Clorofila' && (cycle === 'day' || cycle === 'morning')) {
    spe *= 2;
  }
  if (pokemon.ability === 'Nado rápido' && (cycle === 'dusk' || cycle === 'night')) {
    spe *= 2;
  }

  if (pokemon.status === 'paralyze') spe = Math.max(1, Math.floor(spe * 0.5));
  return spe;
}

function getMaxObeyLevel() {
  const badges = (state.defeatedGyms || []).length;
  if (badges >= 8) return 100;
  if (badges >= 7) return 75;
  if (badges >= 6) return 65;
  if (badges >= 5) return 55;
  if (badges >= 4) return 45;
  if (badges >= 3) return 35;
  if (badges >= 2) return 30;
  if (badges >= 1) return 25;
  return 20;
}

function applyAbilityEffects(attacker, defender, move, damageResult, addLogFn) {
  const ab = defender.ability;
  const md = MOVE_DATA[move.name] || {};

  // Robustez (Sturdy)
  if (ab === 'Robustez' && defender.hp <= 0 && damageResult.prevHp === defender.maxHp) {
    defender.hp = 1;
    addLogFn(`¡${defender.name} resistió el golpe gracias a su Robustez!`, 'log-info');
  }

  // Contact abilities (Physical moves)
  if (md.cat === 'physical' && Math.random() < 0.3) {
    if (ab === 'Electricidad estática' && !attacker.status && attacker.type !== 'electric') {
      attacker.status = 'paralyze';
      addLogFn(`¡La Electricidad estática de ${defender.name} paralizó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Punto tóxico' && !attacker.status && attacker.type !== 'poison' && attacker.type !== 'steel') {
      attacker.status = 'poison';
      addLogFn(`¡El Punto tóxico de ${defender.name} envenenó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Cuerpo Llama' && !attacker.status && attacker.type !== 'fire') {
      attacker.status = 'burn';
      addLogFn(`¡El Cuerpo Llama de ${defender.name} quemó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Efecto Espora' && !attacker.status) {
      const roll = Math.random();
      if (roll < 0.33) {
        attacker.status = 'sleep'; attacker.sleepTurns = 1 + Math.floor(Math.random() * 3);
        addLogFn(`¡El Efecto Espora de ${defender.name} durmió a ${attacker.name}!`, 'log-info');
      } else if (roll < 0.66) {
        attacker.status = 'paralyze';
        addLogFn(`¡El Efecto Espora de ${defender.name} paralizó a ${attacker.name}!`, 'log-info');
      } else {
        attacker.status = 'poison';
        addLogFn(`¡El Efecto Espora de ${defender.name} envenenó a ${attacker.name}!`, 'log-info');
      }
    }
  }

  // Stench (Hedor): 10% flinch on attack
  if (attacker.ability === 'Hedor' && Math.random() < 0.1) {
    if (!defender.flinched) {
      defender.flinched = true;
      addLogFn(`¡El Hedor de ${attacker.name} hizo retroceder a ${defender.name}!`, 'log-info');
    }
  }
}

function applyAbilityTurnEndEffects(pokemon, role, addLogFn) {
  const b = state.battle;
  if (pokemon.seeded) {
      const seedDmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - seedDmg);
      const other = (pokemon === b.player) ? b.enemy : b.player;
      other.hp = Math.min(other.maxHp, other.hp + seedDmg);
      addLogFn(`¡Las drenadoras de ${pokemon.name} absorbieron salud!`, 'log-info');
    }

    if (pokemon.bindTurns > 0) {
      const bindDmg = Math.max(1, Math.floor(pokemon.maxHp / 16));
      pokemon.hp = Math.max(0, pokemon.hp - bindDmg);
      pokemon.bindTurns--;
      addLogFn(`¡${pokemon.name} sufre daño por la trampa!`, 'log-info');
      if (pokemon.bindTurns === 0) addLogFn(`¡${pokemon.name} se liberó!`, 'log-info');
    }

    if (pokemon.cursed) {
      const curseDmg = Math.max(1, Math.floor(pokemon.maxHp / 4));
      pokemon.hp = Math.max(0, pokemon.hp - curseDmg);
      addLogFn(`¡${pokemon.name} sufre por la maldición!`, 'log-info');
    }

  const ab = pokemon.ability;
  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';

  // Shed Skin (Mudar) / Punto Cura: 30% chance to heal status
  if (ab === 'Mudar' && pokemon.status && Math.random() < 0.3) {
    pokemon.status = null;
    addLogFn(`¡La habilidad ${ab} de ${pokemon.name} curó su estado!`, 'log-info');
  }

  // Solar Power (Poder Solar): lose HP under sun

  // Magic Guard (Muro Mágico) vs recoil (not handled in calcDamage recoil section yet but could be)
  // Actually recoil is in useMove specifically.
}

function playerActsFirst(b, pMove, eMove, enemyWillUseItem = null) {
  // Items have priority over moves (standard priority 6)
  const pPrio = (MOVE_DATA[pMove?.name]?.priority) || 0;
  const ePrio = enemyWillUseItem ? 6 : ((MOVE_DATA[eMove?.name]?.priority) || 0);
  
  if (pPrio !== ePrio) {
    return pPrio > ePrio;
  }
  
  const pSpe = getEffectiveSpeed(b.player, b.playerStages);
  const eSpe = getEffectiveSpeed(b.enemy, b.enemyStages);
  return pSpe > eSpe || (pSpe === eSpe && Math.random() < 0.5);
}



function useMove(moveIndex) {
  const b = state.battle;
  if (!b || b.over) return;
  
  // Turn Start Reset
  b.player.protected = false;
  b.player.lastPhysDmg = 0;
  b.player.lastSpecDmg = 0; // Added for Mirror Coat parity later
  if (_battleLock || b.over || b.turn !== 'player') {
    console.warn("useMove blocked:", { _battleLock, over: b.over, turn: b.turn });
    return;
  }

  let move = b.player.moves[moveIndex];
  if (!move || move.pp <= 0) { setLog('¡Sin PP!'); return; }
  
  if (move.name !== 'Furia') b.player.rageActive = false;

  // Check Otra Vez (Encore) early for UI/logic override
  if (b.player.encoreTurns > 0 && b.player.encoreMove) {
    const forcedMove = b.player.moves.find(m => m.name === b.player.encoreMove);
    if (forcedMove && forcedMove.pp > 0) {
      move = forcedMove;
    } else {
      b.player.encoreTurns = 0;
    }
  }

  // Enemy selects move OR item NOW
  let eMove = null;
  let enemyWillUseItem = null;

  if (!b.enemyRecharging && !b.enemy.flinched && b.enemy.status !== 'sleep' && b.enemy.status !== 'freeze') {
    // Check for Item Usage (Gym Leaders only) - DECIDE NOW to avoid "prediction" bug
    if (b.isGym && !b.enemyUsedItem) {
      const hpPct = b.enemy.hp / b.enemy.maxHp;
      if (hpPct < 0.25) {
        enemyWillUseItem = (b.enemy.level > 40) ? 'Poción Máxima' : 'Hiper Poción';
      } else if (b.enemy.status) {
        enemyWillUseItem = 'Cura Total';
      }
    }

    if (!enemyWillUseItem) {
      const validMoves = b.enemy.moves.filter(m => m.pp > 0);
      if (validMoves.length > 0) {
        eMove = (b.isTrainer || b.isGym) ? getBestEnemyMove(b.enemy, b.player, b.playerStages) : validMoves[Math.floor(Math.random() * validMoves.length)];
      }
    }
  }

  const playerFirst = playerActsFirst(b, move, eMove, enemyWillUseItem);

  const runPlayerAction = (enemyAlreadyActed) => {
    // Check flinch
    if (b.player.flinched) {
      b.player.flinched = false;
      addLog(`¡${b.player.name} no pudo moverse por el impacto!`, 'log-enemy');
      _battleLock = true; setBtns(false);
      setTimeout(() => { _battleLock = false; enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 1000);
      return;
    }
    // Check paralysis skip
    if (b.player.status === 'paralyze' && Math.random() < 0.25) {
      addLog(`¡${b.player.name} está paralizado y no puede moverse!`, 'log-enemy');
      _battleLock = true; setBtns(false);
      setTimeout(() => {
        _battleLock = false;
        enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
      }, 1000);
      return;
    }
    // Check sleep
    if (b.player.status === 'sleep') {
      const currentSleep = b.player.sleepTurns !== undefined ? b.player.sleepTurns : 1;
      if (currentSleep > 0) {
        addLog(`¡${b.player.name} está dormido! 💤`, 'log-enemy');
        const sleepReduction = (b.player.ability === 'Madrugar') ? 2 : 1;
        b.player.sleepTurns = Math.max(0, currentSleep - sleepReduction);
        _battleLock = true; setBtns(false);
        setTimeout(() => {
          _battleLock = false;
          enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
        }, 1000);
        return;
      } else {
        b.player.status = null;
        b.player.sleepTurns = 0;
        addLog(`¡${b.player.name} se despertó!`, 'log-info');
      }
    }
    // Check freeze
    if (b.player.status === 'freeze') {
      if (Math.random() < 0.8) {
        addLog(`¡${b.player.name} está congelado! 🧊`, 'log-enemy');
        _battleLock = true; setBtns(false);
        setTimeout(() => {
          _battleLock = false;
          enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
        }, 1000);
        return;
      } else {
        b.player.status = null;
        addLog(`¡${b.player.name} se descongeló!`, 'log-info');
      }
    }
    // Check recharging
    if (b.recharging) {
      b.recharging = false;
      addLog(`¡${b.player.name} debe recargar!`, 'log-enemy');
      _battleLock = true; setBtns(false);
      setTimeout(() => {
        _battleLock = false;
        enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
      }, 1000);
      return;
    }

    // Check obedience
    const maxLevel = getMaxObeyLevel();
    if (b.player.level > maxLevel) {
      const disobedienceChance = 0.25;
      if (Math.random() < disobedienceChance) {
        const roll = Math.random();
        _battleLock = true; setBtns(false);
        
        if (roll < 0.4) {
          // Loafing around
          addLog(`¡${b.player.name} está haciendo el vago!`, 'log-enemy');
        } else if (roll < 0.6) {
          // Nap
          b.player.status = 'sleep';
          b.player.sleepTurns = 1 + Math.floor(Math.random() * 3);
          addLog(`¡${b.player.name} decidió echarse una siesta!`, 'log-enemy');
        } else if (roll < 0.8) {
          // Hurt self
          const selfDmg = Math.max(1, Math.floor(((2 * b.player.level / 5 + 2) * 40 * b.player.atk / b.player.def) / 50) + 2);
          b.player.hp = Math.max(0, b.player.hp - selfDmg);
          const tm = state.team.find(p => p.name === b.player.name);
          if (tm) tm.hp = b.player.hp;
          addLog(`¡${b.player.name} ignoró tus órdenes y se golpeó a sí mismo! (-${selfDmg} HP)`, 'log-enemy');
          updateBattleUI();
        } else {
          // Random move
          const randomMove = b.player.moves[Math.floor(Math.random() * b.player.moves.length)];
          addLog(`¡${b.player.name} ignoró tus órdenes y usó <strong>${randomMove.name}</strong>!`, 'log-player');
          // We trigger the move manually but it doesn't spend PP of the intended move
          // For simplicity, we just log it and do nothing else this turn, 
          // or we could execute it... but let's keep it simple: it fails or does nothing.
          // Actually, let's make it more fun: it uses the random move.
          // Due to recursion/structure, it's easier to just log it failed.
          // Let's stick to "Doing something else... but it failed!"
          addLog(`¡Pero falló!`, 'log-enemy');
        }

        setTimeout(() => {
          _battleLock = false;
          if (b.player.hp <= 0) { endBattle(false); return; }
          enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
        }, 1100);
        return;
      }
    }
    // Check confusion
    if (b.player.confused > 0) {
      b.player.confused--;
      if (b.player.confused === 0) {
        addLog(`¡${b.player.name} ya no está confundido!`, 'log-info');
      } else {
        addLog(`¡${b.player.name} está confundido!`, 'log-enemy');
        if (Math.random() < 0.5) {
          const selfDmg = Math.max(1, Math.floor(((2 * b.player.level / 5 + 2) * 40 * b.player.atk / b.player.def) / 50) + 2);
          b.player.hp = Math.max(0, b.player.hp - selfDmg);
          const tm = state.team.find(p => p.name === b.player.name);
          if (tm) tm.hp = b.player.hp;
          addLog(`¡${b.player.name} se golpeó a sí mismo! (-${selfDmg} HP)`, 'log-enemy');
          _battleLock = true; setBtns(false);
          updateBattleUI();
          setTimeout(() => {
            _battleLock = false;
            if (b.player.hp <= 0) { endBattle(false); return; }
            enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem });
          }, 1000);
          return;
        }
      }
    }

    // Check Anulación (Disable)
    if (b.player.disabledTurns > 0 && move.name === b.player.disabledMove) {
      addLog(`¡${b.player.name} intentó usar <strong>${move.name}</strong>... pero está anulado!`, 'log-player');
      _battleLock = true; setBtns(false);
      setTimeout(() => { _battleLock = false; enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 1000);
      return;
    }

    let originalMove = move;
    if (move.name === 'Metrónomo') {
      const allMoves = Object.keys(MOVE_DATA).filter(m => m !== 'Metrónomo' && m !== 'Esquema' && m !== 'Bosquejo');
      const randomMoveName = allMoves[Math.floor(Math.random() * allMoves.length)];
      addLog(`${b.player.name} usó <strong>Metrónomo</strong>!`, 'log-player');
      addLog(`¡Metrónomo usó <strong>${randomMoveName}</strong>!`, 'log-info');
      move = { name: randomMoveName, pp: originalMove.pp, maxPP: originalMove.maxPP };
    }

    originalMove.pp--;
    _battleLock = true;
    setBtns(false);

    // Siempre usar MOVE_DATA para obtener el efecto, tipo y CATEGORÍA actualizados, ignorando datos persistidos viejos
    const md = MOVE_DATA[move.name] || { power: move.power || 40, type: 'normal', cat: 'physical', acc: 100 };

    // Accuracy check
    let acc = md.acc || 100;
    if (b.player.ability === 'Ojo Compuesto') acc *= 1.3;
    const evaMult = (b.enemy.ability === 'Velo arena' && (typeof getDayCycle === 'function' && getDayCycle() === 'day')) ? 1.25 : 1;
    const accStage = (b.playerStages.acc || 0) - (b.enemyStages.eva || 0);
    const isAlwaysHit = (md.effect === 'always_hits' || (b.player.ability === 'Indefenso' || b.enemy.ability === 'Indefenso'));
    const accMult = isAlwaysHit ? 1000 : (accStageMult(accStage) / evaMult);
    if (!isAlwaysHit && Math.random() * 100 > acc * accMult) {
      addLog(`${b.player.name} usó <strong>${move.name}</strong>... ¡Falló!`, 'log-player');
      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 900);
      return;
    }

    addLog(`${b.player.name} usó <strong>${move.name}</strong>!`, 'log-player');

    // Protect check
    if (b.enemy.protected) {
      addLog(`¡${b.enemy.name} se protegió!`, 'log-info');
      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 900);
      return;
    }

    // Ability Immunity Check
    if (checkAbilityImmunity(b.player, b.enemy, move, addLog)) {
      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 900);
      return;
    }

    // Dream Eater check: target must be asleep
    if (md.effect === 'dream_eater' && b.enemy.status !== 'sleep') {
      addLog(`¡Pero falló! ${b.enemy.name} no está dormido.`, 'log-info');
      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 900);
      return;
    }

    // Status move — no damage
    if (md.cat === 'status') {
      applyMoveEffect(md.effect, b.player, b.enemy, b.playerStages, b.enemyStages, addLog);
      updateBattleUI();
      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 900);
      return;
    }

    // Damage move
    animateAttack('player', () => {
      // Determine correct stages based on move category (Physical vs Special)
      const atkS = (md.cat === 'special') ? (b.playerStages.spa || 0) : (b.playerStages.atk || 0);
      const defS = (md.cat === 'special') ? (b.enemyStages.spd || 0) : (b.enemyStages.def || 0);
      const { dmg, eff, stab, isCrit, triggeredAbility, defensiveAbility } = calcDamage(b.player, b.enemy, move, atkS, defS);

      // Multi-hit moves
      let finalDmg = dmg;
      if (md.effect === 'magnitude') {
        const magnitudes = [
          { mag: 4, pow: 10, prob: 5 },
          { mag: 5, pow: 30, prob: 10 },
          { mag: 6, pow: 50, prob: 20 },
          { mag: 7, pow: 70, prob: 30 },
          { mag: 8, pow: 90, prob: 20 },
          { mag: 9, pow: 110, prob: 10 },
          { mag: 10, pow: 150, prob: 5 }
        ];
        let rollMag = Math.random() * 100;
        let selected = magnitudes[3]; // default 7
        let sum = 0;
        for (const m of magnitudes) {
          sum += m.prob;
          if (rollMag <= sum) { selected = m; break; }
        }
        addLog(`¡Magnitud ${selected.mag}!`, 'log-info');
        // Recalcular daño con el poder de Magnitud
        const magRes = calcDamage(b.player, b.enemy, { name: move.name, power: selected.pow }, b.playerStages.atk, b.enemyStages.def);
        finalDmg = magRes.dmg;
      }

      if (md.hits) {
        const _MULTIHIT_TABLE = [2, 2, 2, 3, 3, 3, 4, 5];
        let numHits = (md.hits === 2) ? 2 : _MULTIHIT_TABLE[Math.floor(Math.random() * _MULTIHIT_TABLE.length)];
        if (b.player.ability === 'Encadenado') numHits = 5;
        if (numHits > 1) {
          let _total = dmg;
          for (let _h = 1; _h < numHits; _h++) {
            const { dmg: _hd } = calcDamage(b.player, b.enemy, move, b.playerStages.atk, b.enemyStages.def);
            _total += _hd;
          }
          finalDmg = _total;
          addLog(`¡Golpeó ${numHits} veces!`, 'log-player');
          if (b.player.ability === 'Encadenado') addLog(`¡Hizo el máximo de golpes por su Encadenado!`, 'log-info');
        }
      }
      // Seismic Toss / Night Shade
      if (md.levelDmg && eff > 0) finalDmg = b.player.level;
      else if (md.levelDmg && eff === 0) finalDmg = 0;
      
      // OHKO moves (Guillotine, Horn Drill, etc.)
      if (md.ohko) {
        if (b.player.level >= b.enemy.level) {
          finalDmg = b.enemy.hp;
          addLog("¡Es un ataque fulminante!", 'log-info');
        } else {
          addLog("¡Pero no afectó al oponente!", 'log-info');
          finalDmg = 0;
        }
      }
      
      // Super Fang (halfHP)
      if (md.halfHP) {
        finalDmg = Math.max(1, Math.floor(b.enemy.hp / 2));
      }

      // Fixed damage moves (Dragon Rage, Sonic Boom)
      if (md.fixedDmg && eff > 0) {
        finalDmg = md.fixedDmg;
      } else if (md.fixedDmg && eff === 0) {
        finalDmg = 0;
      }

      // Counter: deal 2× last physical damage taken from enemy
      if (md.counter) finalDmg = (b.player.lastPhysDmg || 0) * 2;

      // Focus Sash check (Banda Focus)
      if (b.enemy.heldItem === 'Banda Focus' && b.enemy.hp === b.enemy.maxHp && dmg >= b.enemy.hp) {
        finalDmg = b.enemy.hp - 1;
        addLog(`¡${b.enemy.name} resistió con su Banda Focus!`, 'log-info');
      }

      // Drain moves
      let drainHeal = 0;
      if (md.drain && finalDmg > 0) {
        drainHeal = Math.max(1, Math.floor(finalDmg / 2));
      }

      // Shell Bell (Cascabel Concha)
      if (b.player.heldItem === 'Cascabel Concha' && finalDmg > 0) {
        drainHeal += Math.max(1, Math.floor(finalDmg / 8));
      }

      if (drainHeal) {
        b.player.hp = Math.min(b.player.maxHp, b.player.hp + drainHeal);
        // Sincronizar con el equipo persistente si es el jugador
        const pIdx = state.team.findIndex(p => p.uid === b.player.uid || p.name === b.player.name);
        if (pIdx !== -1) state.team[pIdx].hp = b.player.hp;
      }

      const prevEnemyHp = b.enemy.hp;
      b.enemy.hp = Math.max(0, b.enemy.hp - finalDmg);
      if (b.enemy.rageActive && finalDmg > 0 && b.enemy.hp > 0) {
        addLog(`¡La Furia de ${b.enemy.name} está creciendo!`, 'log-info');
        applyMoveEffect('stat_up_self_atk', b.enemy, b.player, b.enemyStages, b.playerStages, addLog);
      }
      
      // Ability Effects (Reactive/Defensive)
      applyAbilityEffects(b.player, b.enemy, move, { dmg: finalDmg, prevHp: prevEnemyHp }, addLog);

      if (md.cat === 'physical') b.enemy.lastPhysDmg = finalDmg;
      addLog(`¡Causó ${finalDmg} de daño!${isCrit ? ' <strong>¡GOLPE CRÍTICO!</strong>' : ''}${drainHeal ? ` (recuperó ${drainHeal} HP)` : ''}`);

      if (triggeredAbility) addLog(`¡Hizo más daño por ${triggeredAbility}!`, 'log-info');
      if (defensiveAbility) {
        if (defensiveAbility === 'Sebo') addLog(`¡Recibió menos daño por Sebo!`, 'log-info');
        else if (defensiveAbility === 'Caparazón' || defensiveAbility === 'Armadura Batalla') addLog(`¡${b.enemy.name} está protegido por su ${defensiveAbility}!`, 'log-info');
      }

      // Choice Band lock
      if (b.player.heldItem === 'Cinta Elegida') {
        b.player.choiceMove = move.name;
      }

      const effMsg = getTypeEffectivenessMsg(eff);
      if (effMsg) addLog(effMsg, eff === 0 ? 'log-enemy' : (eff >= 2 ? 'log-player' : 'log-info'));
      if (stab > 1) addLog('¡Es un ataque de tipo propio!', 'log-info');

      // Secondary effect
      if (md.effect) applyMoveEffect(md.effect, b.player, b.enemy, b.playerStages, b.enemyStages, addLog);

      // Recharge
      if (md.effect === 'recharge') b.recharging = true;

      // Recoil damage to player
      if (md.recoil) {
        if (b.player.ability === 'Cabeza Roca') {
          addLog(`¡${b.player.name} no recibió daño de retroceso por su Cabeza Roca!`, 'log-info');
        } else if (finalDmg > 0) {
          if (b.player.ability === 'Muro Mágico') {
            addLog(`¡El Muro Mágico de ${b.player.name} evitó el daño de retroceso!`, 'log-info');
          } else {
            const recoilDmg = Math.max(1, Math.floor(finalDmg / md.recoil));
            b.player.hp = Math.max(0, b.player.hp - recoilDmg);
            const tm2 = state.team.find(p => p.name === b.player.name);
            if (tm2) tm2.hp = b.player.hp;
            addLog(`¡${b.player.name} recibió ${recoilDmg} de daño de retroceso!`, 'log-enemy');
          }
        }
      }

      // Self-destruct / Explosion: KO the user
      if (md.selfKO) {
        b.player.hp = 0;
        const _tm = state.team.find(p => p.name === b.player.name);
        if (_tm) _tm.hp = 0;
        addLog(`¡${b.player.name} se autodestruyó!`, 'log-enemy');
      }

      animateDamage('enemy', b.enemy.hp <= 0);
      updateBattleUI();

      if (b.enemy.hp <= 0) {
        setTimeout(() => { endBattle(true); _battleLock = false; }, 900);
        return;
      }

      setTimeout(() => { enemyAlreadyActed ? _endEnemyTurn() : enemyTurn({ chosenMove: eMove, preDecidedItem: enemyWillUseItem }); }, 1000);
    });
  };

  if (playerFirst) {
    runPlayerAction(false);
  } else {
    _battleLock = true; setBtns(false);
    enemyTurn({
      chosenMove: eMove,
      preDecidedItem: enemyWillUseItem,
      endTurn: false, after: () => {
        if (b.over) return;
        if (b.player.hp <= 0) { _endEnemyTurn(); return; }
        runPlayerAction(true);
      }
    });
  }
}

function applyHeldItemTurnEndEffects(pokemon, role) {
  if (pokemon.heldItem === 'Restos' && pokemon.hp > 0 && pokemon.hp < pokemon.maxHp) {
    const heal = Math.max(1, Math.floor(pokemon.maxHp / 16));
    pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + heal);
    addLog(`¡${pokemon.name} recuperó HP por sus Restos!`, role === 'player' ? 'log-player' : 'log-enemy');
    const tm = state.team.find(p => p.name === pokemon.name);
    if (tm) tm.hp = pokemon.hp;
    updateBattleUI();
  }
}


// ── AI HEURISTICS ──────────────────────────────────────────────────────────

function scoreEnemyMove(move, attacker, defender, defStages) {
  const md = MOVE_DATA[move.name] || { power: 0, type: 'normal', cat: 'status' };
  let score = md.power || 40;

  // Type effectiveness
  const eff1 = getTypeEffectiveness(md.type, defender.type, defender, attacker);
  const pData = POKEMON_DB[defender.id];
  const eff2 = (pData && pData.type2) ? getTypeEffectiveness(md.type, pData.type2, defender, attacker) : 1;
  const totalEff = eff1 * eff2;
  
  if (totalEff === 0) return 0;
  score *= totalEff;

  // STAB
  const aData = POKEMON_DB[attacker.id];
  if (aData && (md.type === aData.type || md.type === aData.type2)) {
    score *= 1.5;
  }

  // Status moves
  if (md.cat === 'status') {
    score = 30; // Base score for status moves
    
    // Don't repeat status
    const statusEffects = ['sleep', 'paralyze', 'poison', 'toxic', 'burn', 'freeze'];
    if (statusEffects.includes(md.effect) && defender.status) score = 0;
    
    // Stage modifiers
    if (md.effect === 'lower_atk' && (defStages.atk || 0) <= -2) score = 5;
    if (md.effect === 'lower_def' && (defStages.def || 0) <= -2) score = 5;
    if (md.effect === 'lower_spa' && (defStages.spa || 0) <= -2) score = 5;
    if (md.effect === 'lower_spd' && (defStages.spd || 0) <= -2) score = 5;
    if (md.effect === 'lower_spe' && (defStages.spe || 0) <= -2) score = 5;
    
    // If it's a very good status (sleep/paralyze), give it decent priority if not set
    if ((md.effect === 'sleep' || md.effect === 'paralyze') && !defender.status) score = 60;
  }

  // Self-destruct logic (User's request: Koga should stop gifting wins)
  if (md.selfKO) {
    const hpPct = attacker.hp / attacker.maxHp;
    // Only use if very low HP or can definitely KO and it's not the first Pokémon
    const canKO = (score >= defender.hp);
    if (hpPct > 0.25 && !canKO) score *= 0.01; 
    else if (canKO) score *= 1.5;
    else score *= 0.8;
  }

  // Added randomness to avoid being 100% predictable
  return score * (0.8 + Math.random() * 0.4);
}

function getBestEnemyMove(enemy, player, playerStages) {
  const validMoves = enemy.moves.filter(m => m.pp > 0);
  if (validMoves.length === 0) return null;
  
  let bestMove = validMoves[0];
  let maxScore = -1;
  
  validMoves.forEach(m => {
    const s = scoreEnemyMove(m, enemy, player, playerStages);
    if (s > maxScore) {
      maxScore = s;
      bestMove = m;
    }
  });
  
  return bestMove;
}

function isBadMatchup(enemy, player) {
  const pData = POKEMON_DB[player.id];
  if (!pData) return false;

  // Takes 2x or 4x damage from player?
  const eff1 = getTypeEffectiveness(pData.type, enemy.type, enemy, player);
  const eData = POKEMON_DB[enemy.id];
  const eff2 = (eData && eData.type2) ? getTypeEffectiveness(pData.type, eData.type2, enemy, player) : 1;
  
  let playerEff = eff1 * eff2;
  
  if (pData.type2) {
    const eff3 = getTypeEffectiveness(pData.type2, enemy.type, enemy, player);
    const eff4 = (eData && eData.type2) ? getTypeEffectiveness(pData.type2, eData.type2, enemy, player) : 1;
    playerEff = Math.max(playerEff, eff3 * eff4);
  }

  if (playerEff >= 2) return true;
  
  // Can't hurt player?
  const bestEff = Math.max(...enemy.moves.map(m => {
    const md = MOVE_DATA[m.name];
    if (!md) return 0;
    const e1 = getTypeEffectiveness(md.type, player.type, player, enemy);
    const pType2 = pData.type2;
    const e2 = pType2 ? getTypeEffectiveness(md.type, pType2, player, enemy) : 1;
    return e1 * e2;
  }));
  
  if (bestEff <= 0.5) return true;

  return false;
}

function findBestSwitch(enemyTeam, player) {
  const pData = POKEMON_DB[player.id];
  if (!pData) return null;

  let bestIdx = -1;
  let bestScore = -1;

  enemyTeam.forEach((p, idx) => {
    if (p.hp <= 0 || p === state.battle.enemy) return;

    let score = 0;
    const eData = POKEMON_DB[p.id];
    if (!eData) return;

    // Defense score: how much damage we take
    const eff1 = getTypeEffectiveness(pData.type, eData.type, p, player);
    const eff2 = (eData && eData.type2) ? getTypeEffectiveness(pData.type, eData.type2, p, player) : 1;
    let defEff = eff1 * eff2;
    if (pData.type2) {
        const eff3 = getTypeEffectiveness(pData.type2, eData.type, p, player);
        const eff4 = (eData && eData.type2) ? getTypeEffectiveness(pData.type2, eData.type2, p, player) : 1;
        defEff = Math.max(defEff, eff3 * eff4);
    }
    score += (2 - defEff) * 50;

    // Offense score: can we hit them?
    const offenseScore = Math.max(...p.moves.map(m => {
      const md = MOVE_DATA[m.name];
      if (!md) return 0;
      const o1 = getTypeEffectiveness(md.type, pData.type, player, p);
      const o2 = pData.type2 ? getTypeEffectiveness(md.type, pData.type2, player, p) : 1;
      return (o1 * o2) * (md.power || 40);
    }));
    score += offenseScore;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

function enemyTurn(opts = {}) {
  const b = state.battle;
  if (!b || b.over) return;

  // Turn Start Reset
  b.enemy.protected = false;
  b.enemy.lastPhysDmg = 0;
  b.enemy.lastSpecDmg = 0;

  const { endTurn = true, after = null, chosenMove = null, preDecidedItem = null } = opts || {};
  const finish = () => {
    if (after) { after(); return; }
    if (endTurn) _endEnemyTurn();
  };

  // Check enemy recharging (Hiperrayo, etc.)
  if (b.enemyRecharging) {
    b.enemyRecharging = false;
    addLog(`¡${b.enemy.name} debe recargar!`, 'log-enemy');
    finish(); return;
  }

  // --- AI DECISION MAKING ---
  if (b.isTrainer || b.isGym) {
    // 1. Check for Item Usage (Gym Leaders and Police Officers)
    // Use preDecidedItem if available to avoid "prediction" bug
    let itemToUse = preDecidedItem;
    
    const isPolice = (state.playerClass === 'rocket' && state.classData?.criminality >= 100);
    const canUseItem = (b.isGym || isPolice) && !b.enemyUsedItem;

    if (!itemToUse && canUseItem) {
      // Fallback for cases where enemyTurn is called without pre-decision (e.g. after player uses item)
      const hpPct = b.enemy.hp / b.enemy.maxHp;
      if (hpPct < 0.25) {
        itemToUse = 'Hiper Poción';
        if (b.enemy.level > 40) itemToUse = 'Poción Máxima';
      } else if (b.enemy.status) {
        itemToUse = 'Cura Total';
      }
    }

    if (itemToUse && !b.enemyUsedItem) {
      b.enemyUsedItem = true; // Limit to one item per battle for now
      const trainerDisplayName = b.trainerName || (b.isGym ? 'El Líder' : 'El Entrenador');
      addLog(`¡${trainerDisplayName} usó ${itemToUse}!`, 'log-enemy');
      
      if (itemToUse === 'Hiper Poción') b.enemy.hp = Math.min(b.enemy.maxHp, b.enemy.hp + 200);
      else if (itemToUse === 'Poción Máxima') b.enemy.hp = b.enemy.maxHp;
      else if (itemToUse === 'Cura Total') b.enemy.status = null;
      
      updateBattleUI();
      finish(); return;
    }

    // 2. Check for Switching
    if (isBadMatchup(b.enemy, b.player) && (b.enemyTeam && b.enemyTeam.filter(p=>p.hp > 0).length > 1)) {
      // Chance to switch based on trainer type
      const switchChance = b.isGym ? 0.4 : 0.2;
      if (Math.random() < switchChance && (b.enemySwitches || 0) < 3) {
        const bestIdx = findBestSwitch(b.enemyTeam, b.player);
        if (bestIdx !== -1) {
          b.enemySwitches = (b.enemySwitches || 0) + 1;
          const oldPoke = b.enemy;
          const newPoke = b.enemyTeam[bestIdx];
          
          addLog(`¡${b.trainerName || 'El entrenador'} retira a ${oldPoke.name}!`, 'log-enemy');
          setTimeout(() => {
            b.enemyRecharging = false;
            b.enemy = newPoke;
            newPoke._revealed = true;
            addLog(`¡${b.trainerName || 'El entrenador'} envía a ${newPoke.name}!`, 'log-enemy');
            updateBattleUI();
            finish();
          }, 800);
          return;
        }
      }
    }
  }

  const validMoves = b.enemy.moves.filter(m => m.pp > 0);
  if (!validMoves.length) {
    addLog(`¡${b.enemy.name} no tiene más PP! Usa Forcejeo.`, 'log-enemy');
    const dmg = Math.max(1, Math.floor(b.enemy.atk * 0.5));
    b.player.hp = Math.max(0, b.player.hp - dmg);
    b.enemy.hp = Math.max(0, b.enemy.hp - Math.floor(b.enemy.maxHp / 4));
    const tm = state.team.find(p => p.name === b.player.name);
    if (tm) tm.hp = b.player.hp;
    updateBattleUI();
    if (b.player.hp <= 0) { setTimeout(() => { endBattle(false); _battleLock = false; }, 900); return; }
    finish(); return;
  }

  // Check flinch
  if (b.enemy.flinched) {
    b.enemy.flinched = false;
    addLog(`¡${b.enemy.name} no pudo moverse por el impacto!`, 'log-player');
    finish(); return;
  }

  if (b.enemy.status === 'sleep') {
    const currentSleep = b.enemy.sleepTurns !== undefined ? b.enemy.sleepTurns : 1;
    if (currentSleep > 0) {
      addLog(`¡${b.enemy.name} está dormido! 💤`, 'log-enemy');
      const sleepReduction = (b.enemy.ability === 'Madrugar') ? 2 : 1;
      b.enemy.sleepTurns = Math.max(0, currentSleep - sleepReduction);
      finish(); return;
    } else {
      b.enemy.status = null;
      b.enemy.sleepTurns = 0;
      addLog(`¡${b.enemy.name} se despertó!`, 'log-info');
    }
  }
  if (b.enemy.status === 'freeze') {
    if (Math.random() < 0.8) {
      addLog(`¡${b.enemy.name} está congelado! 🧊`, 'log-enemy');
      finish(); return;
    } else {
      b.enemy.status = null;
      addLog(`¡${b.enemy.name} se descongeló!`, 'log-info');
    }
  }
  if (b.enemy.status === 'paralyze' && Math.random() < 0.25) {
    addLog(`¡${b.enemy.name} está paralizado y no puede moverse!`, 'log-enemy');
    finish(); return;
  }
  // Check confusion
  if (b.enemy.confused > 0) {
    b.enemy.confused--;
    if (b.enemy.confused === 0) {
      addLog(`¡${b.enemy.name} ya no está confundido!`, 'log-info');
    } else {
      addLog(`¡${b.enemy.name} está confundido!`, 'log-player');
      if (Math.random() < 0.5) {
        const selfDmg = Math.max(1, Math.floor(((2 * b.enemy.level / 5 + 2) * 40 * b.enemy.atk / b.enemy.def) / 50) + 2);
        b.enemy.hp = Math.max(0, b.enemy.hp - selfDmg);
        addLog(`¡${b.enemy.name} se golpeó a sí mismo! (-${selfDmg} HP)`, 'log-player');
        updateBattleUI();
        if (b.enemy.hp <= 0) { setTimeout(() => { endBattle(true); _battleLock = false; }, 600); return; }
        finish(); return;
      }
    }
  }

  let move = null;
  // Hook de IA Pasiva de Rankeds
  if (b.isPassivePvP && typeof decideAiAction === 'function') {
    const aiTeam = b.enemyTeam;
    const activeIdx = aiTeam.findIndex(p => p === b.enemy);
    const decision = decideAiAction(aiTeam, activeIdx >= 0 ? activeIdx : 0, b.player);
    
    if (decision?.type === 'switch') {
      const newPoke = aiTeam[decision.pokemonIndex];
      addLog(`¡El Equipo Defensor retira a ${b.enemy.name}!`, 'log-enemy');
      setTimeout(() => {
            b.enemyRecharging = false;
            b.enemy = newPoke;
        newPoke._revealed = true;
        addLog(`¡El Equipo Defensor envía a ${newPoke.name}!`, 'log-enemy');
        updateBattleUI();
        finish();
      }, 800);
      return;
    } else if (decision?.type === 'move') {
      move = b.enemy.moves[decision.moveIndex] || validMoves[0];
    }
  }

  // Fallback si no hay IA Pasiva o es batalla normal
  if (!move) {
    move = chosenMove || (b.isTrainer || b.isGym ? getBestEnemyMove(b.enemy, b.player, b.playerStages) : validMoves[Math.floor(Math.random() * validMoves.length)]);
  }
  if (move && move.name !== 'Furia') b.enemy.rageActive = false;
  
  // Encore
  if (b.enemy.encoreTurns > 0 && b.enemy.encoreMove) {
    const forced = b.enemy.moves.find(m => m.name === b.enemy.encoreMove);
    if (forced && forced.pp > 0) {
      move = forced;
    } else {
      b.enemy.encoreTurns = 0;
    }
  }

  // Disable
  if (b.enemy.disabledTurns > 0 && move.name === b.enemy.disabledMove) {
    addLog(`¡${b.enemy.name} intentó usar <strong>${move.name}</strong>... pero está anulado!`, 'log-enemy');
    finish(); return;
  }

  let originalMove = move;
  if (move.name === 'Metrónomo') {
    const allMoves = Object.keys(MOVE_DATA).filter(m => m !== 'Metrónomo' && m !== 'Esquema' && m !== 'Bosquejo');
    const randomMoveName = allMoves[Math.floor(Math.random() * allMoves.length)];
    addLog(`${b.enemy.name} usó <strong>Metrónomo</strong>!`, 'log-enemy');
    addLog(`¡Metrónomo usó <strong>${randomMoveName}</strong>!`, 'log-info');
    move = { name: randomMoveName };
  }
  
  originalMove.pp--;
  const md = MOVE_DATA[move.name] || { power: 40, type: 'normal', cat: 'physical', acc: 100 };

  let acc = md.acc || 100;
  if (b.enemy.ability === 'Ojo Compuesto') acc *= 1.3;
  const evaMult = (b.player.ability === 'Velo arena' && (typeof getDayCycle === 'function' && getDayCycle() === 'day')) ? 1.25 : 1;
  const accStage = (b.enemyStages.acc || 0) - (b.playerStages.eva || 0);
  const isAlwaysHit = (md.effect === 'always_hits' || (b.enemy.ability === 'Indefenso' || b.player.ability === 'Indefenso'));
  const accMult = isAlwaysHit ? 1000 : (accStageMult(accStage) / evaMult);
  if (!isAlwaysHit && Math.random() * 100 > acc * accMult) {
    addLog(`${b.enemy.name} usó <strong>${move.name}</strong>... ¡Falló!`, 'log-enemy');
    finish(); return;
  }

  addLog(`${b.enemy.name} usó <strong>${move.name}</strong>!`, 'log-enemy');

  // Protect check
  if (b.player.protected) {
    addLog(`¡${b.player.name} se protegió!`, 'log-info');
    finish(); return;
  }

  // Ability Immunity Check
  if (checkAbilityImmunity(b.enemy, b.player, move, addLog)) {
    finish(); return;
  }

  // Dream Eater check: target must be asleep
  if (md.effect === 'dream_eater' && b.player.status !== 'sleep') {
    addLog(`¡Pero falló! ${b.player.name} no está dormido.`, 'log-info');
    finish(); return;
  }

  if (md.cat === 'status') {
    applyMoveEffect(md.effect, b.enemy, b.player, b.enemyStages, b.playerStages, addLog);
    const teamIdx = state.team.findIndex(p => p.name === b.player.name);
    if (teamIdx !== -1) { state.team[teamIdx].status = b.player.status; state.team[teamIdx].sleepTurns = b.player.sleepTurns; }
    updateBattleUI();
    finish(); return;
  }

  animateAttack('enemy', () => {
    // Determine correct stages based on move category (Physical vs Special)
    const atkS = (md.cat === 'special') ? (b.enemyStages.spa || 0) : (b.enemyStages.atk || 0);
    const defS = (md.cat === 'special') ? (b.playerStages.spd || 0) : (b.playerStages.def || 0);
    const { dmg, eff, stab, isCrit, triggeredAbility, defensiveAbility } = calcDamage(b.enemy, b.player, move, atkS, defS);
    let finalDmg = dmg;
    
    // Magnitude logic for enemy (Parity with player)
    if (md.effect === 'magnitude') {
      const magnitudes = [
        { mag: 4, pow: 10, prob: 5 }, { mag: 5, pow: 30, prob: 10 }, { mag: 6, pow: 50, prob: 20 },
        { mag: 7, pow: 70, prob: 30 }, { mag: 8, pow: 90, prob: 20 }, { mag: 9, pow: 110, prob: 10 },
        { mag: 10, pow: 150, prob: 5 }
      ];
      let rollMag = Math.random() * 100;
      let selected = magnitudes[3];
      let sum = 0;
      for (const m of magnitudes) { sum += m.prob; if (rollMag <= sum) { selected = m; break; } }
      addLog(`¡Magnitud ${selected.mag}!`, 'log-info');
      const magRes = calcDamage(b.enemy, b.player, { name: move.name, power: selected.pow }, atkS, defS);
      finalDmg = magRes.dmg;
    }
    if (md.hits) {
      const _MULTIHIT_TABLE = [2, 2, 2, 3, 3, 3, 4, 5];
      let numHits = (md.hits === 2) ? 2 : _MULTIHIT_TABLE[Math.floor(Math.random() * _MULTIHIT_TABLE.length)];
      if (b.enemy.ability === 'Encadenado') numHits = 5;
      if (numHits > 1) {
        let _total = dmg;
        for (let _h = 1; _h < numHits; _h++) {
          const { dmg: _hd } = calcDamage(b.enemy, b.player, move, b.enemyStages.atk, b.playerStages.def);
          _total += _hd;
        }
        finalDmg = _total;
        addLog(`¡Golpeó ${numHits} veces!`, 'log-enemy');
        if (b.enemy.ability === 'Encadenado') addLog(`¡Hizo el máximo de golpes por su Encadenado!`, 'log-info');
      }
    }
    // Seismic Toss / Night Shade
    if (md.levelDmg && eff > 0) finalDmg = b.enemy.level;
    else if (md.levelDmg && eff === 0) finalDmg = 0;
    
    // OHKO moves
    if (md.ohko) {
      if (b.enemy.level >= b.player.level) {
        finalDmg = b.player.hp;
        addLog("¡Es un ataque fulminante!", 'log-info');
      } else {
        addLog("¡Pero no afectó al oponente!", 'log-info');
        finalDmg = 0;
      }
    }
    
    // Super Fang (halfHP)
    if (md.halfHP) {
      finalDmg = Math.max(1, Math.floor(b.player.hp / 2));
    }

    // Counter: deal 2× last physical damage taken from player
    if (md.counter) finalDmg = (b.enemy.lastPhysDmg || 0) * 2;

    if (b.player.heldItem === 'Banda Focus' && b.player.hp === b.player.maxHp && dmg >= b.player.hp) {
      finalDmg = b.player.hp - 1;
      addLog(`¡${b.player.name} resistió con su Banda Focus!`, 'log-info');
    }

    let drainHeal = 0;
    if (md.drain && finalDmg > 0) drainHeal = Math.max(1, Math.floor(finalDmg / 2));
    if (b.enemy.heldItem === 'Cascabel Concha' && finalDmg > 0) drainHeal += Math.max(1, Math.floor(finalDmg / 8));
    if (drainHeal) b.enemy.hp = Math.min(b.enemy.maxHp, b.enemy.hp + drainHeal);

    const prevPlayerHp = b.player.hp;
    b.player.hp = Math.max(0, b.player.hp - finalDmg);
    if (b.player.rageActive && finalDmg > 0 && b.player.hp > 0) {
      addLog(`¡La Furia de ${b.player.name} está creciendo!`, 'log-info');
      applyMoveEffect('stat_up_self_atk', b.player, b.enemy, b.playerStages, b.enemyStages, addLog);
    }
    
    // Ability Effects (Reactive/Defensive)
    applyAbilityEffects(b.enemy, b.player, move, { dmg: finalDmg, prevHp: prevPlayerHp }, addLog);

    if (md.cat === 'physical') b.player.lastPhysDmg = finalDmg;
    const teamIdx = state.team.findIndex(p => p.name === b.player.name);
    if (teamIdx !== -1) state.team[teamIdx].hp = b.player.hp;

    addLog(`¡Causó ${finalDmg} de daño!${isCrit ? ' <strong>¡GOLPE CRÍTICO!</strong>' : ''}`);
    
    if (triggeredAbility) addLog(`¡Hizo más daño por ${triggeredAbility}!`, 'log-info');
    if (defensiveAbility) {
      if (defensiveAbility === 'Sebo') addLog(`¡Recibió menos daño por Sebo!`, 'log-info');
      else if (defensiveAbility === 'Caparazón' || defensiveAbility === 'Armadura Batalla') addLog(`¡${b.player.name} está protegido por su ${defensiveAbility}!`, 'log-info');
    }

    const effMsg = getTypeEffectivenessMsg(eff);
    if (effMsg) addLog(effMsg, eff === 0 ? 'log-player' : (eff >= 2 ? 'log-enemy' : 'log-info'));

    if (md.effect) applyMoveEffect(md.effect, b.enemy, b.player, b.enemyStages, b.playerStages, addLog);

    // Recoil damage to enemy
    if (md.recoil) {
      if (b.enemy.ability === 'Cabeza Roca') {
        addLog(`¡${b.enemy.name} no recibió daño de retroceso por su Cabeza Roca!`, 'log-info');
      } else if (finalDmg > 0) {
        const recoilDmg = Math.max(1, Math.floor(finalDmg / md.recoil));
        b.enemy.hp = Math.max(0, b.enemy.hp - recoilDmg);
        addLog(`¡${b.enemy.name} recibió ${recoilDmg} de daño de retroceso!`, 'log-player');
      }
    }

    // Self-destruct / Explosion: KO the enemy user
    if (md.selfKO) {
      b.enemy.hp = 0;
      addLog(`¡${b.enemy.name} se autodestruyó!`, 'log-player');
    }

    // Enemy recharge (Hiperrayo, etc.)
    if (md.effect === 'recharge') b.enemyRecharging = true;

    animateDamage('player', b.player.hp <= 0);
    updateBattleUI();

    if (b.player.hp <= 0) {
      setTimeout(() => { endBattle(false); _battleLock = false; }, 900);
      return;
    }
    if (b.enemy.hp <= 0) {
      setTimeout(() => { endBattle(true); _battleLock = false; }, 900);
      return;
    }

    finish();
  });
}

function _endEnemyTurn() {
  const b = state.battle;
  // End of turn effects (Gen 3+ order)
  if (b && !b.over) {
    const playerFirst = getEffectiveSpeed(b.player, b.playerStages) >= getEffectiveSpeed(b.enemy, b.enemyStages);
    const order = playerFirst ? ['player', 'enemy'] : ['enemy', 'player'];
    const getPoke = role => role === 'player' ? b.player : b.enemy;

    let dirty = false;

    const stopIfFainted = () => {
      if (dirty) updateBattleUI();
      if (b.player.hp <= 0) { setTimeout(() => { endBattle(false); _battleLock = false; }, 600); return true; }
      if (b.enemy.hp <= 0) { setTimeout(() => { endBattle(true); _battleLock = false; }, 600); return true; }
      return false;
    };

    // Held Items (Restos, Baya Aranja, etc.)
    for (const role of order) {
      const p = getPoke(role);
      applyHeldItemTurnEndEffects(p, role);
      
      // Baya Aranja (Heal 10 HP at 50% HP)
      if (p.heldItem === 'Baya Aranja' && p.hp > 0 && p.hp <= (p.maxHp / 2)) {
        const heal = Math.min(10, p.maxHp - p.hp);
        if (heal > 0) {
          p.hp += heal;
          addLog(`¡${p.name} consumió su Baya Aranja y recuperó ${heal} HP!`, role === 'player' ? 'log-player' : 'log-enemy');
          p.heldItem = null; // Consumed
          const tm = state.team.find(t => t.uid === p.uid);
          if (tm) { tm.hp = p.hp; tm.heldItem = null; }
          dirty = true;
        }
      }

      if (stopIfFainted()) return;
    }

    // Abilities at Turn End
    for (const role of order) {
      applyAbilityTurnEndEffects(getPoke(role), role, addLog);
      if (stopIfFainted()) return;
    }

    // Leech Seed
    for (const role of order) {
      const p = getPoke(role);
      if (p.hp <= 0) continue;
      if (tickLeechSeed(p, role, addLog)) {
        dirty = true;
        if (stopIfFainted()) return;
      }
    }

    // Burn / Poison
    for (const role of order) {
      const p = getPoke(role);
      if (p.hp <= 0) continue;
      if (tickStatus(p, addLog, role)) {
        if (role === 'player') {
          const teamIdx = state.team.findIndex(p => p.name === b.player.name);
          if (teamIdx !== -1) state.team[teamIdx].hp = b.player.hp;
        }
        dirty = true;
        if (stopIfFainted()) return;
      }
    }

    if (dirty) updateBattleUI();

    // Weather Tick
    if (b.weather && b.weather.turns > 0) {
      b.weather.turns--;
      if (b.weather.turns === 0) {
        let msg = "¡El clima volvió a la normalidad!";
        if (b.weather.type === 'sandstorm') msg = "¡La tormenta de arena amainó!";
        else if (b.weather.type === 'hail') msg = "¡Dejó de granizar!";
        else if (b.weather.type === 'sun') msg = "¡El sol se ocultó!";
        else if (b.weather.type === 'rain') msg = "¡Dejó de llover!";
        addLog(msg, 'log-info');
        b.weather = null;
      } else {
        // Passive weather damage
        if (b.weather.type === 'sandstorm' || b.weather.type === 'hail') {
          for (const role of ['player', 'enemy']) {
            const p = getPoke(role);
            if (p.hp <= 0) continue;
            // Immunity: Rock/Ground/Steel for Sandstorm, Ice for Hail
            const isImmune = (b.weather.type === 'sandstorm' && ['rock','ground','steel'].some(t => p.type === t || p.type2 === t)) || (b.weather.type === 'hail' && (p.type === 'ice' || p.type2 === t));
            if (!isImmune) {
              const wDmg = Math.max(1, Math.floor(p.maxHp / 16));
              p.hp = Math.max(0, p.hp - wDmg);
              addLog(`¡${p.name} recibe daño por el clima!`, 'log-info');
              if (role === 'player') {
                const teamIdx = state.team.findIndex(p => p.name === b.player.name);
                if (teamIdx !== -1) state.team[teamIdx].hp = b.player.hp;
              }
              dirty = true;
            }
          }
        }
      }
    }

    // Screens Decay
    const decayScreen = (stages, pName) => {
      if (stages.reflect > 0) {
        stages.reflect--;
        if (stages.reflect === 0) addLog(`¡El Reflejo de ${pName} desapareció!`, 'log-info');
      }
      if (stages.lightScreen > 0) {
        stages.lightScreen--;
        if (stages.lightScreen === 0) addLog(`¡La Pantalla de Luz de ${pName} desapareció!`, 'log-info');
      }
      if (stages.safeguard > 0) {
        stages.safeguard--;
        if (stages.safeguard === 0) addLog(`¡El Velo Sagrado de ${pName} desapareció!`, 'log-info');
      }
    };
    decayScreen(b.playerStages, b.player.name);
    decayScreen(b.enemyStages, b.enemy.name);

    // Reset Protect for next turn
    b.player.protected = false;
    b.enemy.protected = false;

    if (dirty) updateBattleUI();
  }
  setTimeout(() => {
    if (!state.battle || state.battle.over) return;
    state.battle.turn = 'player';
    _battleLock = false;
    setBtns(true);
    renderMoveButtons();
    applyMoveButtonsGridLayout();
  }, 600);
}


const GEN1_CATCH_RATES = {
  // Starters & fossils
  "bulbasaur": 45, "ivysaur": 45, "venusaur": 45,
  "charmander": 45, "charmeleon": 45, "charizard": 45,
  "squirtle": 45, "wartortle": 45, "blastoise": 45,
  // Bugs
  "caterpie": 255, "metapod": 120, "butterfree": 45,
  "weedle": 255, "kakuna": 120, "beedrill": 45,
  // Birds
  "pidgey": 255, "pidgeotto": 120, "pidgeot": 45,
  "spearow": 255, "fearow": 90, "doduo": 190, "dodrio": 75,
  "farfetchd": 45,
  // Rodents & common
  "rattata": 255, "raticate": 90,
  "meowth": 190, "persian": 90,
  // Electric
  "pikachu": 190, "raichu": 75, "magnemite": 190, "magneton": 60, "voltorb": 190, "electrode": 60, "electabuzz": 45,
  // Normal
  "jigglypuff": 170, "wigglytuff": 50, "clefairy": 150, "clefable": 25, "chansey": 30,
  "lickitung": 45, "ditto": 35, "snorlax": 25, "kangaskhan": 45, "tauros": 45,
  "farfetch'd": 45, "porygon": 35,
  // Ground/Rock
  "geodude": 255, "graveler": 120, "golem": 45,
  "sandshrew": 255, "sandslash": 90,
  "diglett": 255, "dugtrio": 50,
  "rhyhorn": 120, "rhydon": 60,
  "onix": 45,
  // Water
  "psyduck": 190, "golduck": 75,
  "poliwag": 255, "poliwhirl": 120, "poliwrath": 45,
  "tentacool": 255, "tentacruel": 60,
  "slowpoke": 190, "slowbro": 75,
  "shellder": 190, "cloyster": 60,
  "krabby": 225, "kingler": 60,
  "goldeen": 225, "seaking": 60,
  "staryu": 225, "starmie": 60,
  "seel": 190, "dewgong": 75,
  "horsea": 225, "seadra": 75,
  "magikarp": 255, "gyarados": 45, "lapras": 45,
  "vaporeon": 45, "omanyte": 45, "omastar": 45, "kabuto": 45, "kabutops": 45,
  // Poison
  "ekans": 255, "arbok": 90,
  "zubat": 255, "golbat": 90,
  "nidoran_f": 235, "nidorina": 120, "nidoqueen": 45,
  "nidoran_m": 235, "nidorino": 120, "nidoking": 45,
  "oddish": 255, "gloom": 120, "vileplume": 45,
  "bellsprout": 255, "weepinbell": 120, "victreebel": 45,
  "koffing": 190, "weezing": 60,
  "grimer": 190, "muk": 75,
  "venonat": 190, "venomoth": 75,
  // Grass/Bug/Ground
  "paras": 190, "parasect": 75,
  "exeggcute": 90, "exeggutor": 45,
  "tangela": 45, "bulb": 45,
  // Psychic
  "abra": 200, "kadabra": 100, "alakazam": 50,
  "jynx": 45, "drowzee": 190, "hypno": 75,
  "mr_mime": 45,
  // Fighting
  "mankey": 190, "primeape": 75,
  "machop": 180, "machoke": 90, "machamp": 45,
  "hitmonlee": 45, "hitmonchan": 45,
  // Fire
  "growlithe": 190, "arcanine": 75,
  "vulpix": 190, "ninetales": 75,
  "ponyta": 190, "rapidash": 60,
  "magmar": 45,
  // Ghost
  "gastly": 190, "haunter": 90, "gengar": 45,
  // Ice
  "articuno": 3,
  // Steel/Normal Birds
  "aerodactyl": 45,
  // Dragon
  "dratini": 45, "dragonair": 35, "dragonite": 9,
  // Eeveelutions & Eevee
  "eevee": 45, "vaporeon": 45, "jolteon": 45, "flareon": 45,
  // Legendaries
  "zapdos": 3, "moltres": 3, "mewtwo": 3, "mew": 3,
  // Safari
  "scyther": 45, "pinsir": 45, "cubone": 190, "marowak": 75,
};

function tryCatch() {
  const b = state.battle;
  if (!b || b.over || b.isGym || b.isTrainer || b.isPvP || b.enemy.hp <= 0) {
    if (b && (b.isGym || b.isTrainer || b.isPvP)) notify('¡No podés capturar al Pokémon de otro entrenador!', '❌');
    else if (b && b.enemy && b.enemy.hp <= 0) notify('¡No puedes capturar a un Pokémon debilitado!', '❌');
    return;
  }

  if (state.team.length >= 6 && state.box && state.box.length >= 200) {
    notify('¡Libera la caja primero!', '📦');
    return;
  }

  const availableBalls = SHOP_ITEMS.filter(item => item.cat === 'pokeballs' && (state.inventory[item.name] || 0) > 0);
  if (availableBalls.length === 0) {
    notify('¡No tenés Pokéballs en tu mochila!', '😱');
    return;
  }

  const ov = document.createElement('div');
  ov.id = 'catch-menu-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.innerHTML = `<div style="background:var(--card);border-radius:20px;padding:20px;width:100%;max-width:340px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--red);margin-bottom:14px;text-align:center;">🔴 ELEGÍ UNA POKÉBALL</div>
        <div style="max-height:60vh;overflow-y:auto;padding-right:5px;" class="custom-scrollbar">
          ${availableBalls.map(ball => {
    const qty = state.inventory[ball.name];
    return `<div onclick="executeCatch('${ball.name}')"
              style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:8px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);"
              onmouseover="this.style.borderColor='rgba(230,48,48,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">
              <img src="${ball.sprite}" style="width:32px;height:32px;image-rendering:pixelated;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
              <span style="display:none;font-size:24px;">${ball.icon}</span>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:12px;">${ball.name}</div>
                <div style="font-size:10px;color:var(--gray);">Cantidad: ${qty}</div>
              </div>
            </div>`;
  }).join('')}
        </div>
        <button onclick="document.getElementById('catch-menu-overlay').remove()"
          style="width:100%;padding:10px;margin-top:10px;border:none;border-radius:10px;cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);font-size:12px;">Cancelar</button>
      </div>`;

  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function executeCatch(ballName) {
  document.getElementById('catch-menu-overlay')?.remove();
  const b = state.battle;
  if (b.over || b.enemy.hp <= 0) return;
  if ((state.inventory[ballName] || 0) <= 0) return;

  // Efecto visual de lanzamiento
  const btnCatch = document.getElementById('btn-catch');
  if (btnCatch) {
    btnCatch.style.animation = 'shake 0.5s ease infinite';
    setTimeout(() => { btnCatch.style.animation = ''; }, 1000);
  }

  state.inventory[ballName]--;
  state.balls = Math.max(0, state.balls - 1);
  updateHud();
  setBtns(false);

  const baseRate = GEN1_CATCH_RATES[b.enemy.id] || 100;
  let ballMult = 1;

  if (ballName === 'Master Ball') { ballMult = 255; }
  else if (ballName === 'Ultra Ball') { ballMult = 2; }
  else if (ballName === 'Súper Ball' || ballName === 'Ball Especial') { ballMult = 1.5; }
  else if (ballName === 'Red Ball') {
    ballMult = (b.enemy.type === 'water' || b.enemy.type === 'bug') ? 3.5 : 1;
  }
  else if (ballName === 'Ocaso Ball') {
    const cycle = (typeof getDayCycle === 'function') ? getDayCycle() : 'day';
    const locId = b.locationId;
    const isCave = ['cave', 'mt_moon', 'rock_tunnel', 'cerulean_cave', 'victory_road', 'diglett_cave'].includes(locId);
    ballMult = (cycle === 'night' || isCave) ? 3 : 1;
  }
  else if (ballName === 'Turno Ball') {
    ballMult = Math.min(4, 1 + (b.turn || 1) * 0.3);
  }

  const selectedItem = SHOP_ITEMS.find(i => i.name === ballName);
  state.activeBallSrc = selectedItem ? selectedItem.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

  const statusBonus = (b.enemy.status === 'sleep' || b.enemy.status === 'freeze') ? 2 : (b.enemy.status ? 1.5 : 1);

  // Official Formula Factors + configurable multiplier
  let a = (((3 * b.enemy.maxHp - 2 * b.enemy.hp) * baseRate * ballMult * (window.GAME_RATIOS ? GAME_RATIOS.battle.catchFormulaParams.catchBaseMultiplier : 1.0)) / (3 * b.enemy.maxHp)) * statusBonus;

  // Dificultad especial para Guardianes: 4 veces más difíciles de capturar
  if (b.enemy.isGuardian) {
    a /= 4;
  }

  // Modificadores de clase sobre la captura
  if (state.playerClass === 'cazabichos') {
    // Sinergia Bicho: +5% por Pokémon tipo Bicho en el equipo (máx +30%)
    const bugCount = (state.team || []).filter(p => {
      const pId = p.id || p.pokemonId;
      const data = (typeof POKEMON_DB !== 'undefined') ? POKEMON_DB[pId] : null;
      const isBug = (data && (data.type === 'bug' || data.type2 === 'bug')) || p.type === 'bug' || p.type2 === 'bug';
      return isBug;
    }).length;
    const bugBonus = Math.min(bugCount * 0.05, 0.30);
    if (bugBonus > 0) a *= (1 + bugBonus);
  } else if (state.playerClass === 'entrenador') {
    // Penalización: -10% catchRate en Pokémon con IV total > 120 (Ética Profesional)
    const enemyIvTotal = Object.values(b.enemy.ivs || {}).reduce((s, v) => s + (v || 0), 0);
    if (enemyIvTotal > 120) {
      a *= 0.90;
    }
  }

  let shakes = 0;
  if (a >= 255 || ballName === 'Master Ball') {
    shakes = 4; // Catch
  } else {
    const b_factor = Math.floor(65535 / Math.pow(255 / a, 0.25));
    for (let i = 0; i < 4; i++) {
      if (Math.floor(Math.random() * 65536) < b_factor) {
        shakes++;
      } else {
        break;
      }
    }
  }

  showCatchAnim(shakes === 4, b.enemy, shakes);
}

function showCatchAnim(success, enemy, shakes) {
  const overlay = document.createElement('div');
  overlay.className = 'catch-animation';
  const ballSrc = state.activeBallSrc || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

  overlay.innerHTML = `
    <div style="position:relative;margin-bottom:16px;">
      <img class="pokeball-anim throwing" src="${ballSrc}" 
           onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'"
           alt="Pokéball" style="image-rendering:pixelated;">
    </div>
    <div class="shake-count"></div>
    <div class="catch-text"></div>
  `;
  document.body.appendChild(overlay);

  const ballEl = overlay.querySelector('.pokeball-anim');
  const shakeEl = overlay.querySelector('.shake-count');
  const textEl = overlay.querySelector('.catch-text');

  // Phase 1: throw animation (0.8s)
  // Phase 2: shake 1-3 times
  // Phase 3: result

  const totalShakes = shakes >= 4 ? 3 : shakes; // UI shakes are 0-3
  let shakesDone = 0;

  function doShake() {
    ballEl.classList.remove('throwing'); // ensure throw animation doesn't restart
    if (shakesDone >= totalShakes) {
      // Result
      if (success) {
        ballEl.classList.remove('shaking');
        ballEl.classList.add('caught');
        textEl.textContent = '¡Atrapado!';
        textEl.style.color = 'gold';
        shakeEl.textContent = '★ ★ ★';
        shakeEl.style.color = 'gold';
      } else {
        ballEl.classList.remove('shaking');
        ballEl.classList.add('escaped');
        textEl.textContent = '¡Se escapó!';
        textEl.style.color = '#ff4444';
        shakeEl.textContent = '';
      }
      setTimeout(() => {
        overlay.remove();
        if (success) {
          catchSuccess(enemy);
        } else {
          setLog(`¡${enemy.name} se escapó de la Pokéball!`, 'log-enemy');
          // Hook de clase: rompe la racha del Cazabichos
          if (typeof onCaptureFail === 'function') onCaptureFail();
          setBtns(true);
          enemyTurn();
        }
      }, 1200);
      return;
    }
    shakesDone++;
    shakeEl.textContent = '...';
    ballEl.classList.remove('shaking');
    void ballEl.offsetWidth; // reflow to restart animation
    ballEl.classList.add('shaking');
    ballEl.addEventListener('animationend', () => {
      ballEl.classList.remove('shaking');
      setTimeout(doShake, 400);
    }, { once: true });
  }

  // Wait for throw to land, then shake
  setTimeout(doShake, 900);
}

async function catchSuccess(enemy) {
  if (currentUser) reduceHatchTimer(currentUser.id, 'capture');
  const b = state.battle;
  b.over = true;

  const baseEnemy = enemy.isTransformed && enemy.originalForm ? enemy.originalForm : enemy;
  const caught = JSON.parse(JSON.stringify(baseEnemy));
  // Ensure current health is preserved or slightly adjusted, capped by true maxHp
  caught.hp = Math.min(caught.maxHp, Math.max(1, enemy.hp));

  // DOMINANCIA: Interceptar captura de Guardián
  if (enemy.isGuardian && typeof claimGuardianCapture === 'function') {
    const claimed = await claimGuardianCapture(b.locationId, caught);
    if (!claimed) {
      setLog(`¡Oh no! El Guardián ya fue capturado por otro entrenador antes de que la Pokéball pudiera transferirlo.`, 'log-enemy');
      const captureLoc = b.locationId;
      setTimeout(() => { if (typeof showScreen==='function') showScreen('game-screen'); }, 3000);
      return;
    }
  }
  if (!state.box) state.box = [];
  if (state.team.length < 6) {
    state.team.push(caught);
  } else if (state.box.length < 200) {
    // Pokémon en caja siempre entran con HP y status restaurados
    caught.hp = caught.maxHp;
    caught.status = null;
    caught.sleepTurns = 0;
    state.box.push(caught);
    addLog(`${baseEnemy.name} fue enviado a la Caja (equipo lleno).`, 'log-info');
  } else {
    addLog('¡La Caja está llena! Soltá Pokémon para poder capturar más.', 'log-enemy');
  }

  // Red Maestra (Cazabichos)
  const isBugType = (baseEnemy.type === 'bug' || (baseEnemy.type2 || POKE_TYPE2[baseEnemy.id]) === 'bug');
  if (state.playerClass === 'cazabichos' && isBugType && Math.random() < 0.20) {
    const secondCaught = JSON.parse(JSON.stringify(caught));
    secondCaught.uid = 'extra_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Verificar espacio en la caja (máx 200)
    if (state.box.length < 200) {
      state.box.push(secondCaught);
      addLog(`¡La <strong>Red Maestra</strong> atrapó a un segundo ${baseEnemy.name}! (2x1)`, 'log-catch');
    } else {
      addLog(`¡La Red Maestra intentó atrapar otro ${baseEnemy.name}, pero la Caja está llena!`, 'log-enemy');
    }
  }

  // Add to pokedex (caught) – also ensures it's removed from seenPokedex/only-seen list
  state.pokedex = state.pokedex || [];
  if (baseEnemy && baseEnemy.id && !state.pokedex.includes(baseEnemy.id)) {
    state.pokedex.push(baseEnemy.id);
  }
  // Ensure it's in seenPokedex too (it should already be there)
  state.seenPokedex = state.seenPokedex || [];
  if (baseEnemy && baseEnemy.id && !state.seenPokedex.includes(baseEnemy.id)) {
    state.seenPokedex.push(baseEnemy.id);
  }

  setLog(`¡${baseEnemy.name} fue capturado!`, 'log-catch');

  // Hook de clase: racha de capturas (Cazabichos) + classXP
  if (typeof onCaptureSuccess === 'function') onCaptureSuccess();

  // Hook de eventos de competencia (atrapa el Pokémon del evento)
  if (typeof checkCompetitionsAndPrompt === 'function') {
    checkCompetitionsAndPrompt(caught);
  }

  if (caught.heldItem) {
    addLog(`¡Parece que ${caught.name} llevaba un <strong>${caught.heldItem}</strong> equipado!`, 'log-info');
  }

  // EXP gain on capture: awarded to all participants
  awardBattleExperience(true);

  scheduleSave(); updateProfilePanel();
  notify(`¡${enemy.name} se unió a tu equipo!`, '🎉');
  setBtns(false);

  const _captureLocId = state.lastWildLocId || b.locationId || null;
  processLearnMoveQueue(b.learnQueue || [], () => {
    showBattleEndUI((toCity) => {
      // Evolution check on capture too
      const potentialEvos = state.team.filter(p => 
        (p.uid === b.player.uid || (b.participants && b.participants.includes(p.uid)) || p.heldItem === 'Compartir EXP') && p.hp > 0
      );
      let evoIdx = 0;
      const checkNextEvo = () => {
        if (evoIdx >= potentialEvos.length) {
          showScreen('game-screen');
          showTab('map');
          if (!toCity && _captureLocId) {
            setTimeout(() => goLocation(_captureLocId), 50);
          }
          return;
        }
        const p = potentialEvos[evoIdx++];
        checkLevelUpEvolution(p, checkNextEvo);
      };
      
      checkNextEvo();
    }, _captureLocId);
  });
}

function awardBattleExperience(isCapture = false) {
  let b = state.battle;
  if (!b || !b.enemy || b.isPvP) return;

  let expMultiplier = isCapture ? 4 : ((b.isTrainer || b.isGym) ? 8 : 4);
  
  // Bonus BOSS: x3 EXP extra por derrotar a un defensor de jugador
  if (b.isDefenderBattle) {
    expMultiplier *= 3;
    addLog('<span style="color:var(--red);font-weight:bold;">¡RECOMPENSA DE BOSS: x3 EXP!</span>', 'log-info');
  }
  
  // Multiplicador de Dominancia (Guerra)
  if (typeof getDominanceExpMultiplier === 'function' && b.locationId) {
    const domMult = getDominanceExpMultiplier(b.locationId);
    if (domMult > 1) {
      expMultiplier *= domMult;
      addLog(`<span style="color:var(--yellow);font-size:9px;">[DOMINANCIA: x${domMult}]</span>`, 'log-info');
    }
  }

  const baseExp = Math.floor(b.enemy.level * expMultiplier);

  // winners = current active + those who participated + exp share holders
  // Pokémon nivel 100 se excluyen: no reciben EXP y no reducen la porción de los demás
  const winners = state.team.filter(p =>
    (p === b.player || (p.uid && p.uid === b.player?.uid) || (b.participants && b.participants.includes(p.uid)) || p.heldItem === 'Compartir EXP') && p.hp > 0 && p.level < 100
  );

  winners.forEach(p => {
    let pExp = baseExp;
    // Shared experience if not the finishing pokemon?
    // In standard games, participants get half if there's more than one. 
    // Here we'll stick to a simple: Participants get full, Exp Share gets half if not participant.
    if (p !== b.player && p.uid !== b.player?.uid && !(b.participants && b.participants.includes(p.uid))) {
      pExp = Math.floor(baseExp * 0.5); // Only if it's JUST exp share
    }
    
    // If it participated but was switched, it also gets full share (standard pokemon logic)
    // Actually, in many games exp is split. For simplicity in this fan game, we'll keep it generous.

    if ((state.luckyEggSecs || 0) > 0 || p.heldItem === 'Huevo Suerte') pExp = Math.floor(pExp * 1.5);

    // Bonus de Eventos (Doble EXP, etc)
    if (typeof getEventBonus === 'function') {
      const eventMult = getEventBonus('exp');
      if (eventMult !== 1) {
        pExp = Math.floor(pExp * eventMult);
        addLog(`<span style="color:#f59e0b;font-size:9px;">[BONO EVENTO: x${eventMult}]</span>`, 'log-info');
      }
    }

    // Modificador de clase
    if (typeof getClassModifier === 'function') {
      const isTrainerBattle = !!(b.isTrainer || b.isGym);
      const expClassMult = getClassModifier('expMult', { isTrainer: isTrainerBattle });
      if (expClassMult !== 1.0) {
        pExp = Math.floor(pExp * expClassMult);
        const bonusTxt = expClassMult > 1.0 ? 'BONO' : 'PENALIZACIÓN';
        const bonusColor = expClassMult > 1.0 ? '#3b82f6' : '#ef4444';
        const clsName = state.playerClass === 'entrenador' ? 'Entrenador' : (state.playerClass === 'criador' ? 'Criador' : 'Cazabichos');
        addLog(`<span style="color:${bonusColor};font-size:9px;">[${bonusTxt} ${clsName.toUpperCase()}: x${expClassMult}]</span>`, 'log-info');
      }
    }
    
    addLog(`${p.name} ganó <span style="color:#6BCB77;font-weight:bold;">${pExp} EXP</span>.`, 'log-player');

    // Nivel 100: no recibir EXP (ya filtrado en winners, pero doble check por seguridad)
    if (p.level >= 100) return;

    p.exp = (p.exp || 0) + pExp;
    let needed = p.expNeeded;
    while (p.exp >= needed && p.level < 100) {
      p.exp -= needed;
      const pending = levelUpPokemon(p);
      addLog(`¡${p.name} subió al <span style="color:#3b82f6;font-weight:bold;">nivel ${p.level}</span>!`, 'log-info');
      if (pending) pending.forEach(mv => b.learnQueue.push({ pokemon: p, move: mv }));
      needed = p.expNeeded;
    }
  });

  // Trainer EXP
  const trainerExpGain = b.isGym ? (b.enemy.level * 2) : Math.max(1, Math.floor(b.enemy.level / 2));
  addTrainerExp(trainerExpGain);
  if (typeof saveGame === 'function') saveGame(false);
}

function showExploreAgainPrompt(locId) {
  // Remove any existing prompt
  document.getElementById('explore-again-overlay')?.remove();
  const loc = FIRE_RED_MAPS.find(l => l.id === locId);
  if (!loc) return;

  const ov = document.createElement('div');
  ov.id = 'explore-again-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;pointer-events:none;';
  ov.innerHTML = `
        <div style="background:var(--card);border:2px solid rgba(255,255,255,0.08);border-radius:20px;padding:24px 28px;text-align:center;pointer-events:all;box-shadow:0 8px 40px rgba(0,0,0,0.6);animation:fadeIn .3s ease;max-width:320px;width:90%;">
          <div style="font-size:28px;margin-bottom:8px;">🗺️</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--text);margin-bottom:6px;">¿SEGUÍS EXPLORANDO?</div>
          <div style="font-size:11px;color:var(--gray);margin-bottom:20px;">${loc.icon} ${loc.name}</div>
          <button id="explore-yes-btn"
            style="display:block;width:100%;padding:16px;margin-bottom:10px;border:none;border-radius:14px;cursor:pointer;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:16px;font-weight:800;letter-spacing:1px;box-shadow:0 4px 16px rgba(34,197,94,0.4);transition:transform .15s,box-shadow .15s;"
            onmouseover="this.style.transform='scale(1.04)';this.style.boxShadow='0 6px 22px rgba(34,197,94,0.55)'"
            onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 16px rgba(34,197,94,0.4)'">
            ¡SÍ! 🌿
          </button>
          <button id="explore-no-btn"
            style="display:inline-block;padding:6px 16px;border:none;border-radius:8px;cursor:pointer;background:rgba(220,38,38,0.18);color:#f87171;font-size:10px;transition:background .15s;"
            onmouseover="this.style.background='rgba(220,38,38,0.32)'"
            onmouseout="this.style.background='rgba(220,38,38,0.18)'">
            Cancelar
          </button>
        </div>`;

  document.body.appendChild(ov);

  document.getElementById('explore-yes-btn').addEventListener('click', () => {
    ov.remove();
    goLocation(locId);
  });
  document.getElementById('explore-no-btn').addEventListener('click', () => {
    ov.remove();
  });
}

function endBattle(won) {
  const b = state.battle;
  if (!b || b._ending) return; // Prevent multiple calls from overlapping timeouts
  b._ending = true;
  b.over = true;

  if (b.isPassivePvP && b.passiveOpponentId && typeof reportPassiveBattleResult === 'function') {
    const result = won ? 'win' : 'loss'; // draw is technically not supported here natively, but win/loss works
    reportPassiveBattleResult(b.passiveOpponentId, result);
  }

  // Cura Natural (Natural Cure) - Heal status when battle ends
  if (state.team) {
    state.team.forEach(p => {
      if (p.ability === 'Cura Natural' && p.status) {
        p.status = null;
      }
    });
  }

  // Cleanup move tooltips to prevent them from sticking on screen
  const tooltip = document.getElementById('move-tooltip');
  if (tooltip) tooltip.style.display = 'none';

  // If the player's active Pokémon was transformed (e.g. Ditto), restore its original form
  if (b.player && b.player.isTransformed && b.player.originalForm) {
    const prevHp = b.player.hp;
    const savedItem = b.player.heldItem;
    const origRef = state.team.find(p => p.uid === b.player.originalForm.uid);
    if (origRef) {
      Object.assign(origRef, b.player.originalForm);
      origRef.hp = Math.min(origRef.maxHp, Math.max(0, prevHp));
      if (savedItem !== undefined) origRef.heldItem = savedItem;
      b.player = origRef;
    }
  }


  if (won) {
    // EXP moved down next to setLog to avoid being overwritten

    // Multi-Pokémon Trainer/Gym Logic: If the opponent still has pokemon, don't end yet.
    if ((b.isTrainer || b.isGym) && b.enemyTeam) {
      const nextIdx = b.enemyTeam.findIndex(p => p.hp > 0);
      if (nextIdx !== -1) {
        const nextP = b.enemyTeam[nextIdx];
        setLog(`¡${b.enemy.name} fue derrotado! ${b.isGym ? 'El Líder' : 'El entrenador'} envía a ${nextP.name}...`, 'log-player');
        awardBattleExperience();
        setTimeout(() => {
          nextP._revealed = true;
          b.enemyRecharging = false;
          b.enemy = nextP;
          b.enemy.confused = 0; b.enemy.flinched = false;
          b.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
          
          // RESET participants for the new enemy
          b.participants = [b.player.uid];
          
          b.over = false;
          b._ending = false; // RESET the ending flag for the next pokemon
          b.turn = 'player';
          _battleLock = false;
          updateBattleUI();
          setLog(`¡${nextP.name} entró al combate!`);
          setBtns(true);
          renderMoveButtons();
        }, 2000);
        return;
      }
    }

    setLog(`¡${b.enemy.name} fue derrotado!`, 'log-player');
    if (!b.isPvP) awardBattleExperience();

    // No material rewards or territory points in PVP
    if (b.isPvP) return;

    // Lógica de LOOT de Fósiles (5% chance en batallas de defensor)
    if (b.isDefenderBattle) {
      if (Math.random() < 0.05) {
        const fossils = ['Fósil Hélix', 'Fósil Domo', 'Ámbar Viejo'];
        const found = fossils[Math.floor(Math.random() * fossils.length)];
        state.inventory[found] = (state.inventory[found] || 0) + 1;
        addLog(`<span style="color:gold;font-weight:bold;">¡Increíble! Encontraste un ${found} entre los restos de la batalla.</span>`, 'log-catch');
        notify(`¡Encontraste ${found}!`, '🐚');
      }
    }

    // DOMINANCIA: Sumar Puntos de Territorio
    if (typeof addWarPoints === 'function') {
      const wMapId = b.locationId || window.currentEncounterMapId;
      if (wMapId && !b.isDefenderBattle) { // El atacante no gana puntos en zonas ya perdidas/defendidas
        if (b.enemy.isGuardian && typeof recordGuardianDefeat === 'function') {
          recordGuardianDefeat(wMapId, b.enemy.guardianPts || 150);
        } else {
          const wType = (b.isGym) ? 'trainer_win' : (b.isTrainer ? 'trainer_win' : 'wild_win');
          addWarPoints(wMapId, wType, true); // fire and forget
        }
      }
    }


    if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= 15) {
      if (state.classData?.officialRouteId && (state.classData.officialRouteExp || 0) > Date.now()) {
        const curLocId = b.locationId || state.lastWildLocId;
        if (curLocId === state.classData.officialRouteId) {
          if (typeof addReputationPoints === 'function') {
            addReputationPoints(1);
            addLog('⭐ ¡+1 REP por combatir en Ruta Oficial!', 'log-info');
          }
        }
      }
    }
    // Recompensa de Poké-Dólares (₽)
    // Wild: 4 * level (halved = 2 * level). Trainers: 20 * level.
    let moneyWon = (b.isTrainer || b.isGym) ? (b.enemy.level * 20) : Math.floor(b.enemy.level * 2);

    // Bono de Extorsión (Equipo Rocket x1.5 ₽ en batallas NPC genéricas en su Ruta Oficial, Nivel 15+)
    if (state.playerClass === 'rocket' && (state.classLevel || 1) >= 15 && b.isTrainer && !b.isGym && !b.isRival) {
      const curLocId = b.locationId || state.lastWildLocId;
      if (state.classData?.extortedRouteId && curLocId === state.classData.extortedRouteId) {
        moneyWon = Math.floor(moneyWon * 1.5);
        addLog('🚀 ¡Bono de Extorsión: x1.5 ₽ en Ruta Oficial!', 'log-info');
      }
    }

    if ((state.amuletCoinSecs || 0) > 0 || b.player.heldItem === 'Moneda Amuleto') moneyWon *= 2; // Moneda Amuleto
    
    // Multiplicador de Evento (Dinero)
    if (typeof getEventBonus === 'function') {
      moneyWon = Math.floor(moneyWon * getEventBonus('money'));
    }

    state.money += moneyWon;
    addLog(`¡Ganaste <span style="color:#22c55e;font-weight:bold;">₽${moneyWon.toLocaleString()}</span>!`, 'log-info');

    if (b.isTrainer || b.isGym) {
      let coins = Math.floor(b.enemy.level * 2);
      // Modificador de BC por clase
      if (typeof getClassModifier === 'function') {
        const bcMult = getClassModifier('bcMult', { isGym: !!b.isGym });
        coins = Math.floor(coins * bcMult);
      }
      
      // Multiplicador de Evento (Battle Coins)
      if (typeof getEventBonus === 'function') {
        coins = Math.floor(coins * getEventBonus('bc'));
      }
      
      const isGymRematch = b.isGym && state.defeatedGyms && state.defeatedGyms.includes(b.gymId);
      if (!isGymRematch) {
        state.battleCoins = (state.battleCoins || 0) + coins;
        addLog(`¡Obtuviste <span style="color:var(--yellow);font-weight:bold;"><i class="fas fa-coins coin-icon"></i> ${coins} Battle Coins</span>!`, 'log-catch');
      }
      // Reputación del Entrenador (por ganar gimnasios)
      if (b.isGym && typeof addReputationPoints === 'function') addReputationPoints(10);
      // ClassXP por victorias
      if (typeof addClassXP === 'function') addClassXP(b.isGym ? 30 : 10);

      if (!state.stats) state.stats = {};
      if (b.isTrainer) state.stats.trainersDefeated = (state.stats.trainersDefeated || 0) + 1;

      // Reset criminality if defeated the Police Officer
      if (b.trainerName === 'Oficial de Policía' && state.playerClass === 'rocket') {
        if (state.classData) {
          state.classData.criminality = 0;
          addLog('¡Tu criminalidad ha sido reseteada tras derrotar a la ley!', 'log-info');
          
          // Robo al Oficial (5% de chance, requiere Nivel 20 de clase)
          if ((state.classLevel || 1) >= 20 && Math.random() < 0.05) {
            const targetTeam = b.enemyTeam && b.enemyTeam.length > 0 ? b.enemyTeam : [b.enemy];
            const randIdx = Math.floor(Math.random() * targetTeam.length);
            const stolen = targetTeam[randIdx];
            
            const stolenCopy = JSON.parse(JSON.stringify(stolen));
            stolenCopy.uid = 'stolen_' + Date.now() + '_' + Math.floor(Math.random()*1000);
            stolenCopy.hp = stolenCopy.maxHp;
            stolenCopy.status = null;
            stolenCopy.sleepTurns = 0;
            
            state.box = state.box || [];
            if (state.box.length < 200) {
              state.box.push(stolenCopy);
              setTimeout(() => notify(`¡Le robaste un Pokémon al oficial!`, '🚔'), 500);
              addLog(`¡Increíble! Le has robado el <strong>${stolenCopy.name}</strong> al Oficial de Policía y fue enviado curado a tu PC.`, 'log-catch');
            } else {
              addLog(`¡Intentaste robarle el ${stolenCopy.name} al Oficial, pero tu PC está llena!`, 'log-enemy');
            }
          }

          if (typeof updateProfilePanel === 'function') updateProfilePanel();
        }
      }

      // Egg system (only for random trainers, not gyms)
      if (b.isTrainer && !b.isRival && Math.random() < 0.05) {
        const eggPool = ['pichu', 'magby', 'elekid', 'cleffa', 'igglybuff', 'togepi', 'eevee'];
        const pId = eggPool[Math.floor(Math.random() * eggPool.length)];
        addEgg(pId, 'encounter');
      }

      // RIVAL REWARDS
      if (b.isRival) {
        const randRec = Math.random() * 100;
        let rewardedItem = null;
        if (randRec < 20) rewardedItem = 'Master Ball';
        else if (randRec < 40) rewardedItem = 'Ticket Shiny';
        else if (randRec < 60) rewardedItem = 'Ticket Safari';
        else if (randRec < 80) rewardedItem = 'Ticket Cueva Celeste';
        else if (randRec < 95) rewardedItem = 'Ticket Articuno';
        else rewardedItem = 'Ticket Mewtwo';

        if (rewardedItem) {
          state.inventory[rewardedItem] = (state.inventory[rewardedItem] || 0) + 1;
          addLog(`¡El Rival dejó caer un <span style="color:var(--yellow);font-weight:bold;">${rewardedItem}</span>!`, 'log-catch');
          notify(`¡Recibiste ${rewardedItem}! 🎁`, '🎁');
        }
      }
    }

    // Trainer level EXP (removed duplicate call)

    if (b.isGym) {
      const gym = GYMS.find(g => g.id === b.gymId);
      if (gym) {
        const today = (function() {
          const d = getGMT3Date();
          return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        })();
        
        state.lastGymWins = state.lastGymWins || {};
        state.lastGymWins[b.gymId] = today;

        const diffUsed = b.difficulty || 'easy';
        // current progress: 1=easy beaten, 2=normal beaten, 3=hard beaten
        const progress = state.gymProgress?.[b.gymId] || (state.defeatedGyms.includes(b.gymId) ? 1 : 0);
        const diffValue = { easy: 1, normal: 2, hard: 3 }[diffUsed];

        if (diffValue > progress) {
          state.gymProgress = state.gymProgress || {};
          state.gymProgress[b.gymId] = diffValue;
        }

        if (!state.defeatedGyms.includes(b.gymId)) {
          state.defeatedGyms.push(b.gymId);
          state.badges++;
          updateHud();
          
          // Victory dialogue
          if (gym.victoryQuote) {
            addLog(`${gym.leader}: "${gym.victoryQuote}"`, 'log-player');
          }

          addLog(`¡Obtuviste la ${gym.badgeName || gym.badge} de ${gym.leader}!`, 'log-catch');
          notify(`¡${gym.badgeName || gym.badge} obtenida! 🏆`, '🏆');

          // TM Reward
          if (gym.rewardTM) {
            state.inventory[gym.rewardTM] = (state.inventory[gym.rewardTM] || 0) + 1;
            addLog(`${gym.leader} te entregó la ${gym.rewardTM}.`, 'log-catch');
            notify(`¡Recibiste ${gym.rewardTM}! 📀`, '📀');
          }
        } else {
          // Rematch extra reward
          const extraCoins = Math.floor(diffValue * 105); // 150 * 0.7 = 105 (30% reduction)
          state.battleCoins = (state.battleCoins || 0) + extraCoins;
          addLog(`¡Rematch ganado! Obtuviste <span style="color:var(--yellow);font-weight:bold;">${extraCoins} Battle Coins</span>.`, 'log-catch');

          // Chance to get another TM on rematch (Normal/Hard)
          let tmChance = 0;
          const ratios = window.GAME_RATIOS?.gym;
          if (ratios) {
            if (diffUsed === 'normal') tmChance = ratios.rematchTMRateNormal;
            else if (diffUsed === 'hard') tmChance = ratios.rematchTMRateHard;
          }

          if (tmChance > 0 && Math.random() < tmChance) {
            if (gym.rewardTM) {
              state.inventory[gym.rewardTM] = (state.inventory[gym.rewardTM] || 0) + 1;
              addLog(`${gym.leader} te entregó otra ${gym.rewardTM} por tu excelente combate.`, 'log-catch');
              notify(`¡Recibiste otra ${gym.rewardTM}! 📀`, '📀');
            }
          }
        }
      }
    }

    // Track stats
    if (!state.stats) state.stats = {};
    state.stats.battles = (state.stats.battles || 0) + 1;
    state.stats.wins = (state.stats.wins || 0) + 1;
    // Limpiar batalla activa guardada (la batalla terminó correctamente)
    state.activeBattle = null;
    if (typeof saveGame === 'function') saveGame(false);
    else scheduleSave();
    updateProfilePanel();
    setBtns(false);
    // Show all rewards in expanded log, then wait for player to press Continue
    // For gyms: use gym's locationId. For trainers: use locationId (not lastWildLocId which is from wild encounters). For wild: use lastWildLocId then locationId.
    const _locId = b.isGym
      ? (b.locationId || null)
      : b.isTrainer
        ? (b.locationId || null)
        : (state.lastWildLocId || b.locationId || null);
    // Show learn-move menus (if any) BEFORE the battle end UI
    processLearnMoveQueue(b.learnQueue || [], () => {
      showBattleEndUI((toCity) => {
        // Evolution check: Check all team members that could have leveled up, not just active one
        // For simplicity, we'll check everyone who participated or has Exp Share
        const potentialEvos = state.team.filter(p => 
          (p.uid === b.player.uid || (b.participants && b.participants.includes(p.uid)) || p.heldItem === 'Compartir EXP') && p.hp > 0
        );
        
        const _goToMap = () => {
          state.battle = null;
          showScreen('game-screen');
          showTab('map');
          if (!toCity && _locId) {
            setTimeout(() => goLocation(_locId), 50);
          }
        };

        let evoIdx = 0;
        const checkNextEvo = () => {
          if (evoIdx >= potentialEvos.length) {
            _goToMap();
            return;
          }
          const p = potentialEvos[evoIdx++];
          checkLevelUpEvolution(p, checkNextEvo);
        };
        
        checkNextEvo();
      }, _locId);
    });
  } else {
    setLog(`¡${b.player.name} fue derrotado!`, 'log-enemy');
    
    // Si el jugador pierde contra un DEFENSOR, este gana una victoria para sus monedas
    if (b.isDefenderBattle && b.defenderRecordId) {
      if (typeof incrementDefenderWins === 'function') incrementDefenderWins(b.defenderRecordId);
    }

    // Check if any other Pokémon alive
    const aliveTeam = state.team.filter(p => p.name !== b.player.name && p.hp > 0);
    if (aliveTeam.length > 0) {
      // Forced switch — must choose another
      addLog('¡Elegí otro Pokémon para continuar!', 'log-info');
      _battleLock = false;
      setBtns(false);
      document.getElementById('move-buttons').style.display = 'none';
      showBattleSwitch(true); // forced = true
    } else {
      // All fainted — true defeat
      
      // Penalización por Criminalidad Máxima (Equipo Rocket)
      if (state.playerClass === 'rocket' && state.classData?.criminality >= 100) {
        const strongest = [...state.team].sort((a, b) => b.level - a.level)[0];
        const penalty = (strongest?.level || 1) * 100;
        state.money = Math.max(0, (state.money || 0) - penalty);
        state.classData.criminality = 0; // Reset criminality
        setTimeout(() => {
          notify(`¡Fuiste capturado! Perdiste ₽${penalty.toLocaleString()} por tu recompensa.`, '🚔');
          if (typeof updateCriminalityBar === 'function') updateCriminalityBar();
        }, 1000);
      }

      state.team.forEach(p => { p.hp = Math.max(p.hp, Math.floor(p.maxHp * 0.3)); });
      notify('¡Todo tu equipo fue derrotado!', '❤️‍🩹');
      if (!state.stats) state.stats = {};
      state.stats.battles = (state.stats.battles || 0) + 1;
      // Limpiar batalla activa guardada (derrota total)
      state.activeBattle = null;
      if (typeof saveGame === 'function') saveGame(false);
      else scheduleSave();
      updateProfilePanel();
      setBtns(false);
      showBattleEndUI(() => { showScreen('game-screen'); showTab('map'); });
    }
  }
}

function runFromBattle() {
  const b = state.battle;
  if (!b) return;

  if (b.player.ability === 'Escape') {
    addLog(`¡${b.player.name} escapó gracias a su habilidad Escape!`, 'log-info');
    b.over = true;
    setTimeout(() => {
      state.battle = null;
      showScreen('game-screen');
      showTab('map');
    }, 800);
    return;
  }

  if (!state.battle) return;
  if (state.battle?.isGym) {
    setLog('¡No podés huir de un combate contra un Líder de Gimnasio!', 'log-enemy');
    notify('¡No podés huir de un combate de Gimnasio!', '🚫');
    return;
  }
  if (state.battle?.isTrainer) {
    if (state.battle.isRival) {
      setLog('¡No podés huir de tu Rival!', 'log-enemy');
      notify('¡No podés huir de tu Rival!', '🚫');
      return;
    }
    setLog('¡No podés huir de un combate contra un Entrenador!', 'log-enemy');
    notify('¡No podés huir de un combate contra un Entrenador!', '🚫');
    return;
  }
  state.battle.over = true;
  state.battle = null;
  setLog('¡Huiste del combate!', 'log-info');
  // Romper racha del Cazabichos al huir
  if (typeof onCaptureFail === 'function') onCaptureFail();
  setTimeout(() => {
    showScreen('game-screen');
    showTab('map');
    if (typeof saveGame === 'function') saveGame(false);
  }, 1000);
}

function addEgg(pokemonId, origin = 'encounter', extraData = {}) {
  if (!state.eggs) state.eggs = [];

  // Limit check: 1 per origin
  const current = state.eggs.filter(e => (e.origin || 'encounter') === origin);
  if (current.length >= 1) {
    if (origin === 'breeding') notify('Ya tenés un huevo de crianza. ¡Eclosionalo primero!', '🥚');
    return false;
  }

  // 3x steps: 150-300
  const steps = 150 + Math.floor(Math.random() * 150);
  const egg = {
    id: Date.now() + Math.random(),
    pokemonId: pokemonId,
    steps: steps,
    totalSteps: steps,
    name: origin === 'breeding' ? 'Huevo de Crianza' : 'Huevo de Encuentro',
    origin: origin,
    ...extraData,
    ready: false // Asegurar que no nazca ya listo por error
  };
  state.eggs.push(egg);

  if (origin === 'encounter') {
    notify('¡Obtuviste un Huevo Pokémon! Revisá tu Perfil 👤', '🥚');
    addLog('¡<span style="color:var(--yellow);font-weight:bold;">Recibiste un Huevo Pokémon!</span> Se abrirá explorando.', 'log-catch');
  }

  updateProfilePanel(); updateHud();
  if (typeof saveGame === 'function') saveGame(false);
  else scheduleSave();
  return true;
}


// ── Move Tooltip Functions ──────────────────────────
let _tooltipTimer = null;

function showMoveTooltip(e, moveName) {
  const md = MOVE_DATA[moveName];
  if (!md) return;

  let tooltip = document.getElementById('move-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'move-tooltip';
    tooltip.className = 'move-tooltip';
    document.body.appendChild(tooltip);
  }

  const TYPE_COLORS = {
    normal: '#aaa', fire: '#FF6B35', water: '#3B8BFF', grass: '#6BCB77',
    electric: '#FFD93D', ice: '#7DF9FF', fighting: '#FF3B3B', poison: '#C77DFF',
    ground: '#c8a060', flying: '#89CFF0', psychic: '#FF6EFF', bug: '#8BC34A',
    rock: '#c8a060', ghost: '#7B2FBE', dragon: '#5C16C5', dark: '#555', steel: '#9E9E9E'
  };
  const col = TYPE_COLORS[md.type] || '#aaa';
  const catIcon = { physical: '⚔️ Físico', special: '✨ Especial', status: '🔮 Estado' }[md.cat] || '';

  tooltip.style.setProperty('--move-color', col);
  tooltip.innerHTML = `
    <div class="move-tooltip-header">
      <span class="move-tooltip-name">${moveName}</span>
      <span class="move-tooltip-type">${md.type.toUpperCase()}</span>
    </div>
    <div class="move-tooltip-stats">
      <div class="move-tooltip-stat">
        <span class="move-tooltip-stat-label">Potencia</span>
        <span class="move-tooltip-stat-value">${md.power || '—'}</span>
      </div>
      <div class="move-tooltip-stat">
        <span class="move-tooltip-stat-label">Precisión</span>
        <span class="move-tooltip-stat-value">${md.acc || '—'}%</span>
      </div>
      <div class="move-tooltip-stat">
        <span class="move-tooltip-stat-label">Categoría</span>
        <span class="move-tooltip-stat-value">${catIcon}</span>
      </div>
      <div class="move-tooltip-stat">
        <span class="move-tooltip-stat-label">PP</span>
        <span class="move-tooltip-stat-value">${md.pp}</span>
      </div>
    </div>
    <div class="move-tooltip-desc">
      ${getMoveDescription(moveName, md)}
    </div>
  `;

  // Position
  const rect = e.target.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - 110; // 110 is half of width 220
  const y = rect.top - tooltip.offsetHeight - 10;
  
  tooltip.style.left = Math.max(10, Math.min(window.innerWidth - 230, x)) + 'px';
  tooltip.style.top = Math.max(10, y) + 'px';
  tooltip.style.display = 'block';

  // No auto-hide timer anymore, it stays as long as the button is held
  if (_tooltipTimer) clearTimeout(_tooltipTimer);
}

function hideMoveTooltip() {
  const tooltip = document.getElementById('move-tooltip');
  if (tooltip) tooltip.style.display = 'none';
  if (_tooltipTimer) clearTimeout(_tooltipTimer);
}

function startDefenderBattle(defenderData) {
  // Construir el Pokémon enemigo desde la data guardada
  const enemy = defenderData.pokemon_data;
  
  // Asegurar que tenga HP máximo al iniciar (clonación para la batalla)
  const enemyFinal = JSON.parse(JSON.stringify(enemy));
  enemyFinal.hp = enemyFinal.maxHp;
  enemyFinal.isBoss = true; // Marca para recompensas (EXP x3, etc)

  const trainerSprite = defenderData.user_sprite || 'https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.png';
  const trainerName = defenderData.user_name || 'Entrenador Anónimo';
  const trainerLevel = defenderData.user_level || (enemy && enemy.trainer_level) || '??';
  
  // Obtener Sprite del Pokémon (Grande para el intro)
  const pokemonSprite = (typeof getSpriteUrl === 'function') 
    ? getSpriteUrl(enemy.id, enemy.isShiny)
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${POKEMON_SPRITE_IDS[enemy.id] || 1}.png`;

  // ── INTRO OVERLAY ESTILO DUELO (Boceto de Usuario) ──────────────────────
  const introOv = document.createElement('div');
  introOv.id = 'boss-intro-overlay';
  introOv.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:10px;animation:fadeIn .4s ease;';
  
  introOv.innerHTML = `
    <div style="background:linear-gradient(135deg, #1e1b4b, #000); border-radius:28px; padding:32px; max-width:450px; width:100%;
      border:3px solid var(--yellow); text-align:center; position:relative; box-shadow: 0 0 60px rgba(234, 179, 8, 0.4);">
      
      <!-- Efecto de brillo de fondo -->
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:300px; height:300px; background:radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%); z-index:1;"></div>

      <div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); background:var(--yellow); color:#000; padding:6px 20px; border-radius:12px; font-family:'Press Start 2P',monospace; font-size:10px; font-weight:bold; z-index:5; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">⚠️ ¡EVENTO BOSS! 🛡️</div>
      
      <!-- CONTENEDOR DE SPRITES SUPERPUESTOS -->
      <div style="position:relative; height:180px; margin: 30px 0 20px 0; z-index:2; display:flex; align-items:center; justify-content:center;">
        
        <!-- Entrenador (Fondo / Derecha) -->
        <img src="${trainerSprite}" alt="${trainerName}"
          style="height:150px; width:auto; image-rendering:pixelated; position:absolute; right:15%; bottom:10%;
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.8)) contrast(1.1); z-index:2; transition:0.5s; opacity:0.8;">
        
        <!-- Pokémon (Primer Plano / Izquierda / Grande) -->
        <img src="${pokemonSprite}" alt="${enemy.name}"
          style="height:190px; width:auto; image-rendering:pixelated; position:absolute; left:10%; bottom:0%;
          filter: drop-shadow(0 8px 15px rgba(234, 179, 8, 0.5)); z-index:3; transform: scale(1.2); animation: slideInLeft 0.6s ease-out;">
      </div>
      
      <div style="position:relative; z-index:10;">
        <div style="font-family:'Press Start 2P',monospace; font-size:11px; color:var(--yellow); margin-bottom:8px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">DEFENSOR DE RUTA</div>
        
        <div style="background:rgba(0,0,0,0.6); padding:12px; border-radius:16px; border:1px solid rgba(234,179,8,0.3); margin-bottom:20px;">
          <div style="font-size:16px; font-weight:bold; color:#fff; margin-bottom:4px;">${trainerName} <span style="color:var(--gray); font-size:12px;">(LV.${trainerLevel})</span></div>
          <div style="font-size:13px; color:var(--yellow); text-transform:uppercase; font-family:'Press Start 2P',monospace;">${enemy.name} <span style="font-size:9px;">LV.${enemy.level}</span></div>
        </div>
        
        <div style="font-size:12px; color:#eee; margin-bottom:25px; line-height:1.6; font-style:italic;">
          "¡Este territorio pertenece a la <strong>${(defenderData.faction || 'Unión').toUpperCase()}</strong>! Si querés pasar, vas a tener que derrotar a mi campeón."
        </div>

        <button id="boss-intro-btn" style="font-family:'Press Start 2P',monospace; font-size:9px; padding:18px 36px; border:none; border-radius:16px;
          cursor:pointer; background:linear-gradient(135deg, var(--yellow), #ca8a04); color:#000; font-weight:bold;
          box-shadow:0 6px 25px rgba(234, 179, 8, 0.5); width:100%; transform:scale(1); transition:0.3s;"
          onmouseover="this.style.transform='scale(1.03) translateY(-2px)'" onmouseout="this.style.transform='scale(1)'">
          ⚔️ ¡ACEPTAR DESAFÍO!
        </button>
      </div>
    </div>
    
    <style>
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-50px) scale(1.2); }
        to { opacity: 1; transform: translateX(0) scale(1.2); }
      }
    </style>
  `;
  
  document.body.appendChild(introOv);

  document.getElementById('boss-intro-btn').onclick = () => {
    introOv.remove();
    
    // Iniciar batalla tipo Entrenador
    startBattle(
      enemyFinal,            // enemy
      false,                 // isGym
      null,                  // gymId
      defenderData.map_id,   // locationId
      true,                  // isTrainer
      [enemyFinal],          // enemyTeam
      trainerName            // trainerName
    );
    
    // Marcas de estado para la lógica de recompensas
    if (state.battle) {
      state.battle.isDefenderBattle = true;
      state.battle.defenderUserId = defenderData.user_id;
      state.battle.defenderRecordId = defenderData.id;
    }

    // Etiqueta visual de BOSS
    setTimeout(() => {
      const parent = document.getElementById('enemy-name');
      if (parent) {
        const label = document.createElement('div');
        label.style.cssText = 'position:absolute; top:-20px; left:0; width:100%; text-align:center; color:var(--yellow); font-family:"Press Start 2P"; font-size:8px; text-shadow:0 0 5px #000; pointer-events:none;';
        label.textContent = '🛡️ BOSS / DEFENSOR';
        parent.appendChild(label);
      }
    }, 100);
  };
}

// ── Modo de Batalla Pasiva (IA vs Jugador) ────────────────────────────
function startPassiveBattleMode(playerTeam, aiTeam, opponentName, opponentId) {
  const enemy = aiTeam[0];
  startBattle(
    enemy,          // enemy
    false,          // isGym
    null,           // gymId
    'ranked_arena', // locationId
    true,           // isTrainer
    aiTeam,         // enemyTeam
    opponentName    // trainerName
  );

  // Marcar como Ranked
  if (state.battle) {
    state.battle.isPassivePvP = true;
    state.battle.passiveOpponentId = opponentId;
  }
}
