// ===== GAME STATE =====
const TRAINER_TYPES = {
  'caza_bichos': { name: 'Caza Bichos', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/bugcatcher.png', quote: '¡Mis Pokémon bicho son los más fuertes!', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
  'ornitologo': { name: 'Ornitólogo', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/birdkeeper.png', quote: '¡Mis pájaros volarán alto sobre los tuyos!', pool: ['pidgey', 'spearow', 'doduo'] },
  'cientifico': { name: 'Científico', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/scientist.png', quote: '¡La ciencia pokémon es absoluta!', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
  'luchador': { name: 'Luchador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/blackbelt.png', quote: '¡Sentí el poder de mis puños!', pool: ['mankey', 'machop'] },
  'pescador': { name: 'Pescador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/fisherman.png', quote: '¡Pesqué algo más que un zapato!', pool: ['magikarp', 'goldeen', 'poliwag'] },
  'nadador': { name: 'Nadador', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/swimmer.png', quote: '¡El agua está genial hoy!', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
  'domador': { name: 'Domador', sprite: '/assets/sprites/trainers/tamer.png', quote: '¡Mis bestias te devorarán!', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
  'medium': { name: 'Médium', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/psychic.png', quote: '...puedo ver tu derrota...', pool: ['abra', 'drowzee'] },
  'motorista': { name: 'Motorista', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/biker.png', quote: '¡Hacéte a un lado, novato!', pool: ['koffing', 'grimer', 'rattata'] },
  'montanero': { name: 'Montañero', sprite: 'https://play.pokemonshowdown.com/sprites/trainers/hiker.png', quote: '¡Mis Pokémon son duros como rocas!', pool: ['geodude', 'sandshrew', 'rhyhorn'] }
};

function initTrainerPityTimer() {
  setInterval(() => {
    if (!state.trainerChance) state.trainerChance = GAME_RATIOS.encounters.trainerBase;
    if (state.trainerChance < GAME_RATIOS.encounters.trainerMax) {
      state.trainerChance += GAME_RATIOS.encounters.trainerIncrement;
      console.log(`[PITY] Trainer Chance increased to ${state.trainerChance}%`);
    }
    if (state.trainerChance > GAME_RATIOS.encounters.trainerMax) state.trainerChance = GAME_RATIOS.encounters.trainerMax;
  }, 120000); // 2 minutes
}

function generateTrainerBattle(locId) {
  const loc = FIRE_RED_MAPS.find(l => l.id === locId);
  const isMaxCriminality = (state.playerClass === 'rocket' && state.classData?.criminality >= 100);
  
  let t, trainerLv, teamSize;
  const baseLv = loc ? loc.lv[0] : 5;

  if (isMaxCriminality) {
    // Entrenador Especial: Policía / Cazarrecompensas
    const criminality = state.classData?.criminality || 100;
    const excess = Math.max(0, criminality - 100);
    const bonusLv = Math.floor(excess / 50);

    t = {
      name: 'Oficial de Policía',
      sprite: 'https://play.pokemonshowdown.com/sprites/trainers/policeman.png',
      quote: excess > 0 ? `¡Tu criminalidad es de ${criminality}! ¡No escaparás de la justicia!` : '¡Tu cabeza tiene precio! ¡Ya no robarás más Pokémon!'
    };
    
    trainerLv = baseLv + 5 + bonusLv; 
    teamSize = Math.floor(Math.random() * 2) + 3; // 3-4 Pokémon
    
    // Pool de policía: Pokémon de autoridad/orden
    const policePool = ['arcanine', 'pidgeot', 'machamp', 'magneton', 'kadabra'];
    const policeTeam = [];
    for (let i = 0; i < teamSize; i++) {
      const pIdBase = policePool[Math.floor(Math.random() * policePool.length)];
      const pId = (typeof getEvolvedForm === 'function') ? getEvolvedForm(pIdBase, trainerLv) : pIdBase;
      const p = makePokemon(pId, trainerLv);
      policeTeam.push(p);
    }
    
    _startTrainerBattle(policeTeam, t, locId);
  } else {
    const keys = Object.keys(TRAINER_TYPES);
    const typeKey = keys[Math.floor(Math.random() * keys.length)];
    t = TRAINER_TYPES[typeKey];
    trainerLv = baseLv + 2;
    teamSize = Math.floor(Math.random() * 3) + 1;
    
    const enemyTeam = [];
    for (let i = 0; i < teamSize; i++) {
      const pIdBase = t.pool[Math.floor(Math.random() * t.pool.length)];
      const pId = (typeof getEvolvedForm === 'function') ? getEvolvedForm(pIdBase, trainerLv) : pIdBase;
      const p = makePokemon(pId, trainerLv);
      enemyTeam.push(p);
    }
    _startTrainerBattle(enemyTeam, t, locId);
  }
}

function _startTrainerBattle(enemyTeam, t, locId) {

  // Intro Modal
  const introOv = document.createElement('div');
  introOv.id = 'trainer-intro-overlay';
  introOv.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s ease;';
  introOv.innerHTML = `
    <div style="background:var(--card);border-radius:24px;padding:32px;max-width:380px;width:100%;
      border:2px solid var(--blue);text-align:center;position:relative;">
      <img src="${t.sprite}" alt="${t.name}"
        style="height:140px;width:auto;image-rendering:pixelated;margin-bottom:12px;
        filter:drop-shadow(0 4px 16px rgba(10,132,255,0.5));"
        onerror="this.outerHTML='<div style=&quot;font-size:80px;&quot;>👤</div>'">
      <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--blue);margin-bottom:6px;">${t.name}</div>
      <div style="font-size:13px;color:#eee;margin:16px 0;line-height:1.6;font-style:italic;">"${t.quote}"</div>
      <button id="trainer-intro-btn" style="font-family:'Press Start 2P',monospace;font-size:9px;padding:14px 28px;border:none;border-radius:14px;
        cursor:pointer;background:linear-gradient(135deg,var(--blue),#2563eb);color:#fff;
        box-shadow:0 4px 16px rgba(59,130,246,0.5);margin-top:8px;">
        ⚔️ ¡ACEPTAR RETO!
      </button>
    </div>`;
  document.body.appendChild(introOv);

  document.getElementById('trainer-intro-btn').onclick = () => {
    introOv.remove();
    // isTrainer = true, enemyTeam is the full team, pass trainer name
    enemyTeam[0]._revealed = true;
    startBattle(enemyTeam[0], false, null, locId, true, enemyTeam, t.name);
  };
}

function generateRivalBattle(locId) {
  const loc = FIRE_RED_MAPS.find(l => l.id === locId);
  const rivalSprite = 'https://play.pokemonshowdown.com/sprites/trainers/blue.png';
  const rivalName = 'Rival Azul';
  
  // El nivel de los pokemon del Rival: promedio del equipo + 2
  const teamSize = Math.max(3, (state.team && state.team.length) || 1);
  const avgLevel = (state.team && state.team.length > 0) ? (state.team.reduce((sum, p) => sum + p.level, 0) / state.team.length) : 5;
  const rivalLevel = Math.floor(avgLevel) + 2;
  
  // Equipo fuerte y variado (6 Pokémon base, pero usamos el mismo tamaño que el jugador)
  const rivalPoolBase = ['pidgeot', 'alakazam', 'gyarados', 'arcanine', 'exeggutor', 'charizard']; 
  // Mezclar y tomar teamSize
  const shuffledPool = [...rivalPoolBase].sort(() => Math.random() - 0.5).slice(0, teamSize);
  
  const enemyTeam = shuffledPool.map(id => {
    // Obtenemos la evolución adecuada para el nivel (si existe la función)
    const species = (typeof getEvolvedForm === 'function') ? getEvolvedForm(id, rivalLevel) : id;
    return makePokemon(species, rivalLevel);
  });

  // Visual Intro Sequence is handled in encounters.js before calling this.
  // But we still need the Modal Intro for the Rival specifically if we want a quote.
  const introOv = document.createElement('div');
  introOv.id = 'rival-intro-overlay';
  introOv.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .5s ease;';
  introOv.innerHTML = `
    <div style="background:linear-gradient(135deg, #1a1a2e, #16213e);border-radius:24px;padding:32px;max-width:400px;width:100%;
      border:3px solid #ff453a;text-align:center;position:relative;box-shadow: 0 0 40px rgba(255, 69, 58, 0.4);">
      <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#ff453a;color:white;padding:4px 16px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:10px;">¡ENCUENTRO LEGENDARIO!</div>
      <img src="${rivalSprite}" alt="${rivalName}"
        style="height:160px;width:auto;image-rendering:pixelated;margin-bottom:16px;
        filter:drop-shadow(0 4px 20px rgba(255, 69, 58, 0.6));">
      <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:#ff453a;margin-bottom:12px;">${rivalName}</div>
      <div style="font-size:14px;color:#eee;margin:20px 0;line-height:1.6;font-style:italic;background:rgba(0,0,0,0.3);padding:15px;border-radius:12px;">
        "¡Ey, vos! ¡He estado entrenando a mi equipo para que sea invencible! ¡Preparate para perder!"
      </div>
      <button id="rival-intro-btn" style="font-family:'Press Start 2P',monospace;font-size:10px;padding:18px 36px;border:none;border-radius:16px;
        cursor:pointer;background:linear-gradient(135deg,#ff453a, #c0392b);color:#fff;
        box-shadow:0 6px 20px rgba(255, 69, 58, 0.5);margin-top:10px;width:100%;">
        ⚔️ ¡ACEPTAR EL DESAFÍO!
      </button>
    </div>`;
  document.body.appendChild(introOv);

  // ⚔️ 8-bit epic rival encounter sound
  if (window.SFX && typeof window.SFX.rivalEncounter === 'function') {
    try { window.SFX.rivalEncounter(); } catch(e) {}
  }

  document.getElementById('rival-intro-btn').onclick = () => {
    introOv.remove();
    enemyTeam[0]._revealed = true;
    startBattle(enemyTeam[0], false, null, locId, true, enemyTeam, rivalName);
    if (state.battle) state.battle.isRival = true;
  };
}

const INITIAL_STATE = {
  trainer: '',
  badges: 0,
  balls: 10,
  money: 3000,
  battleCoins: 0,
  eggs: [],
  trainerChance: (window.GAME_RATIOS && window.GAME_RATIOS.encounters)? GAME_RATIOS.encounters.trainerBase : 1,
  trainerLevel: 1,
  trainerExp: 0,
  trainerExpNeeded: 100,
  inventory: { 'Poción': 3, 'Pokéball': 10 },
  team: [],
  box: [],
  pokedex: [], // capturados
  seenPokedex: [], // vistos
  defeatedGyms: [],
  gymProgress: {}, // { gymId: 1=easy, 2=normal, 3=hard }
  lastGymWins: {}, // { gymId: 'YYYY-MM-DD' }
  lastGymAttempts: {}, // { gymId: 'YYYY-MM-DD' }
  battle: null,
  starterChosen: false,
  lastRankedSeason: null,
  nick_style: null,
  avatar_style: null,
  stats: {},
  eloRating: 1000,
  pvpStats: { wins: 0, losses: 0, draws: 0 },
  rankedMaxElo: 1000,
  rankedRewardsClaimed: [],
  activeBattle: null,
  daycare_missions: [],
  daycare_mission_refreshes: 3,
  safariTicketSecs: 0,
  ceruleanTicketSecs: 0,
  articunoTicketSecs: 0,
  mewtwoTicketSecs: 0,
  incenseType: null, // 'fire', 'water', 'grass', 'normal', 'ghost', 'psychic'
  incenseSecs: 0,
  boxCount: 4, // Número de cajas compradas (mínimo 4)
  chats: {}, // { friendId: { messages: [], username: '', unreadCount: 0 } }
  playerClass: null,     // 'rocket' | 'cazabichos' | 'entrenador' | 'criador'
  classLevel: 1,
  classXP: 0,
  classData: {
    captureStreak: 0,
    longestStreak: 0,
    reputation: 0,
    blackMarketSales: 0,
    criminality: 0,
    blackMarketDaily: {
      date: '',
      items: [],
      purchased: []
    }
  },
  faction: null,          // 'union' | 'poder' | null
  warCoins: 0,            // monedas de guerra acumuladas
  warCoinsSpent: 0,       // monedas gastadas
  warDailyCap: {},        // tope diario por mapa { "Mon Apr 01 2024": { "route1": 500 } }
  warDailyCoins: {},      // tope diario de monedas { "Mon Apr 01 2024": 50 }
  warMyPtsLocal: {},      // acumulador local de PT aportados { "2024-W15": 42 }
  notificationHistory: [],// ultimas notificaciones visibles en perfil (max 10)
  marketSoldSeenIds: []   // ids de publicaciones de mercado ya notificadas
};

// Legacy initialization guard
if (!window.state || !window._legacyState) {
  var state = JSON.parse(JSON.stringify(INITIAL_STATE));
  window.state = state;
} else {
  // If proxy already exists, populate it from INITIAL_STATE if it's empty
  if (Object.keys(window.state).length === 0) {
    Object.assign(window.state, INITIAL_STATE);
  }
}

function resetGameState() {
  // Clear current state and re-assign from initial
  Object.keys(state).forEach(key => delete state[key]);
  Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)));
  console.log("[DEBUG] Game state reset to defaults");
}

// ===== STARTER =====
function chooseStarter(id) {
  const p = POKEMON_DB[id];
  const starter = makePokemon(id, 5);
  state.team.push(starter);
  // Register starter in Pokédex as caught
  state.pokedex = state.pokedex || [];
  state.seenPokedex = state.seenPokedex || [];
  if (!state.pokedex.includes(id)) state.pokedex.push(id);
  if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id);
  // Hide title, show game
  document.getElementById('title-screen').style.display = 'none';
  document.getElementById('title-screen').classList.remove('active');
  document.getElementById('game-screen').style.display = 'block';
  document.getElementById('game-screen').classList.add('active');

  // Show team tab
  showTab('team');
  updateHud();
  state.starterChosen = true;
  saveGame(false); // guardado inmediato — evento único e irrepetible
  // NATURES and ABILITIES moved to src/data/
  notify(`¡${p.name} es tu compañero! ¡Buena suerte, entrenador!`, '🎉');
}

// makePokemon, recalcPokemonStats, gender helpers, levelUpPokemon moved to src/logic/pokemonFactory.js

// ===== LEARN MOVE MENU =====
// Shows a menu asking the player to replace a move or forget the new one.
// onDone() is called when the player makes a decision.
function showLearnMoveMenu(pokemon, newMove, onDone) {
  const existing = document.getElementById('learn-move-overlay');
  if (existing) existing.remove();

  const typeColors = {
    normal:'#A8A878', fire:'#F08030', water:'#6890F0', grass:'#78C850', electric:'#F8D030',
    ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0', ground:'#E0C068', flying:'#A890F0',
    psychic:'#F85888', bug:'#A8B820', rock:'#B8A038', ghost:'#705898', dragon:'#7038F8',
    dark:'#705848', steel:'#B8B8D0', fairy:'#EE99AC',
  };
  function moveTypeColor(moveName) {
    const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
    return typeColors[md.type] || '#6b7280';
  }
  function movePower(moveName) {
    const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
    return md.power ? md.power : '—';
  }
  function movePP(m) { return m.maxPP || m.pp || '?'; }
  function moveType(moveName) {
    const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
    return md.type ? md.type.charAt(0).toUpperCase() + md.type.slice(1) : '?';
  }

  function moveCard(m, idx, isNew) {
    const col = moveTypeColor(m.name);
    const label = isNew ? '✨ NUEVO' : `Movimiento ${idx + 1}`;
    const border = isNew ? `border:2px solid ${col};box-shadow:0 0 12px ${col}55;` : 'border:1px solid rgba(255,255,255,0.1);';
    const escapedName = m.name.replace(/'/g, "\\'");
    const tE = `onmouseenter="this.style.background='rgba(255,255,255,0.11)'; if(typeof showMoveTooltip==='function') showMoveTooltip(event, '${escapedName}')" onmouseleave="this.style.background='rgba(255,255,255,0.05)'; if(typeof hideMoveTooltip==='function') hideMoveTooltip()" ontouchstart="if(typeof showMoveTooltip==='function') showMoveTooltip(event, '${escapedName}')" ontouchend="if(typeof hideMoveTooltip==='function') hideMoveTooltip()"`;
    return `
      <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);
        border-radius:14px;padding:12px 14px;margin-bottom:8px;${border}cursor:${isNew ? 'help' : 'pointer'};transition:background .15s;"
        ${isNew ? tE : `onclick="learnMoveReplace(${idx})" ${tE}`}>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:4px;">${m.name}</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${col};color:#fff;">${moveType(m.name)}</span>
            <span style="font-size:10px;color:#9ca3af;">POW: ${movePower(m.name)}</span>
            <span style="font-size:10px;color:#9ca3af;">PP: ${movePP(m)}</span>
          </div>
        </div>
        ${isNew ? `<span style="font-size:10px;font-weight:700;color:${col};white-space:nowrap;">NUEVO</span>` :
          `<span style="font-size:11px;padding:6px 12px;border-radius:8px;
            background:rgba(239,68,68,0.18);color:#f87171;font-weight:600;white-space:nowrap;">
            Reemplazar
          </span>`}
      </div>`;
  }

  const ov = document.createElement('div');
  ov.id = 'learn-move-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:990;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease;';

  ov.innerHTML = `
    <div style="background:var(--card);border-radius:22px;padding:22px;width:100%;max-width:420px;
      max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 48px rgba(0,0,0,0.7);">

      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);margin-bottom:8px;">
          📖 NUEVO MOVIMIENTO
        </div>
        <div style="font-size:13px;color:var(--text);line-height:1.5;">
          <strong>${pokemon.name}</strong> quiere aprender
          <span style="color:var(--yellow);font-weight:700;">${newMove.name}</span>,
          ¡pero ya conoce 4 movimientos!
        </div>
        <div style="font-size:11px;color:var(--gray);margin-top:6px;">
          Elegí qué movimiento reemplazar, o presioná "Olvidar" para no aprender ${newMove.name}.
        </div>
      </div>

      <div style="margin-bottom:14px;">
        ${moveCard(newMove, -1, true)}
      </div>

      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:10px;">
        ¿CUÁL MOVIMIENTO OLVIDAR?
      </div>

      ${pokemon.moves.map((m, i) => moveCard(m, i, false)).join('')}

      <button onclick="learnMoveForget()"
        style="margin-top:10px;width:100%;padding:14px;border:none;border-radius:12px;
          cursor:pointer;background:rgba(255,255,255,0.06);color:var(--gray);
          font-size:12px;font-weight:600;transition:background .15s;"
        onmouseover="this.style.background='rgba(255,255,255,0.12)'"
        onmouseout="this.style.background='rgba(255,255,255,0.06)'">
        ❌ Cancelar y no aprender
      </button>
    </div>`;

  document.body.appendChild(ov);

  window.learnMoveReplace = function(slotIndex) {
    if (typeof hideMoveTooltip === 'function') hideMoveTooltip();
    const oldMove = pokemon.moves[slotIndex];
    pokemon.moves[slotIndex] = { name: newMove.name, pp: newMove.pp, maxPP: newMove.maxPP };
    ov.remove();
    delete window.learnMoveReplace;
    delete window.learnMoveForget;
    if (typeof addLog === 'function') addLog(`¡${pokemon.name} olvidó <span style="color:#f87171;">${oldMove.name}</span> y aprendió <span style="color:#22c55e;font-weight:bold;">${newMove.name}</span>!`, 'log-info');
    if (typeof notify === 'function') notify(`¡${pokemon.name} aprendió ${newMove.name}!`, '📖');
    if (typeof renderMoveButtons === 'function' && window.state && state.battle) renderMoveButtons();
    if (typeof scheduleSave === 'function') scheduleSave();
    onDone(true);
  };

  window.learnMoveForget = function() {
    if (typeof hideMoveTooltip === 'function') hideMoveTooltip();
    ov.remove();
    delete window.learnMoveReplace;
    delete window.learnMoveForget;
    if (typeof addLog === 'function') addLog(`¡${pokemon.name} no aprendió ${newMove.name}!`, 'log-info');
    onDone(false);
  };
}

function processLearnMoveQueue(queue, onAllDone) {
  if (!queue.length) { if (onAllDone) onAllDone(); return; }
  const { pokemon, move } = queue.shift();
  showLearnMoveMenu(pokemon, move, () => processLearnMoveQueue(queue, onAllDone));
}

/**
 * Helper global para inyectar Pokémon de forma consistente (Realismo + Persistencia).
 * Usado por Skills y Scripts de prueba.
 */
window.injectPokemonToBox = async function(p, silent = false) {
  if (!p || !p.id) return { success: false, error: 'Pokémon inválido' };
  
  // 1. Asegurar Pokedex
  if (!state.pokedex.includes(p.id)) state.pokedex.push(p.id);
  if (!state.seenPokedex.includes(p.id)) state.seenPokedex.push(p.id);
  
  // 2. Inyectar en Caja
  state.box = state.box || [];
  state.box.push(p);
  
  // 3. Persistencia
  if (typeof saveGame === 'function') {
    await saveGame(false); // Guardado inmediato
  } else if (typeof scheduleSave === 'function') {
    scheduleSave();
  }
  
  // 4. Feedback
  if (!silent) {
    if (typeof notify === 'function') notify(`¡${p.name} añadido a la caja!`, '📥');
    if (typeof updateHud === 'function') updateHud();
  }
  
  return { success: true, pokemon: p };
};
