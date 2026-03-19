// ============================================================
// js/16_profession.js — Sistema de Profesiones · Poké Vicio
// ============================================================

// ── DEFINICIÓN DE LAS 6 CLASES ──────────────────────────────
const PROFESSIONS = {
  cazabichos: {
    id:'cazabichos', name:'Caza Bichos', icon:'🐛',
    color:'#1a3d1a', borderColor:'#4ade80',
    description:'Paciente y coleccionista. Le importa la Pokédex, no las medallas.',
    passionName:'Racha de Captura',
    penalty:'La racha se rompe si huís de batalla o usás una piedra evolutiva.',
    loopName:'La Trampa', loopIcon:'🪤'
  },
  pescador: {
    id:'pescador', name:'Pescador', icon:'🎣',
    color:'#0d2d4a', borderColor:'#60a5fa',
    description:'Tranquilo y constante. Premiado por la paciencia.',
    passionName:'Profundidad',
    penalty:'La Profundidad decae si saltás entre zonas más de 3 veces en 5 minutos.',
    loopName:'La Caña Automática', loopIcon:'🎣'
  },
  rocket: {
    id:'rocket', name:'Team Rocket', icon:'🚀',
    color:'#1a0a0a', borderColor:'#ef4444',
    description:'Oportunista económico. Consigue lo que quiere por las malas.',
    passionName:'Infamia',
    penalty:'El Centro Pokémon te cobra ₽150 por curación.',
    loopName:'El Operativo', loopIcon:'📋'
  },
  cientifico: {
    id:'cientifico', name:'Científico', icon:'🔬',
    color:'#051f14', borderColor:'#34d399',
    description:'El optimizador. Vive para los IVs perfectos.',
    passionName:'Datos',
    penalty:'Tus Pokémon ganan 20% menos EXP de entrenadores.',
    loopName:'El Experimento', loopIcon:'🧪'
  },
  guardabosques: {
    id:'guardabosques', name:'Guardabosques', icon:'🌿',
    color:'#0a1f0a', borderColor:'#86efac',
    description:'En armonía con la naturaleza. Fuerte en amistad.',
    passionName:'Vínculo',
    penalty:'Si 3 Pokémon se desmayan en un día, perdés toda la Pasión.',
    loopName:'El Santuario', loopIcon:'🌿'
  },
  medallero: {
    id:'medallero', name:'Cazador de Medallas', icon:'🏆',
    color:'#1f1200', borderColor:'#fbbf24',
    description:'Solo vive para los gimnasios. Ocho medallas, sin excusas.',
    passionName:'Gloria',
    penalty:'No podés capturar en zonas que ya exploraste esta semana.',
    loopName:'El Circuito', loopIcon:'🏆'
  }
};

// ── CURVA DE NIVEL DE CLASE ──────────────────────────────────
const PROFESSION_LEVELS = [
  {level:0,  xpNeeded:0},
  {level:1,  xpNeeded:50},
  {level:2,  xpNeeded:150},
  {level:3,  xpNeeded:350},
  {level:4,  xpNeeded:700},
  {level:5,  xpNeeded:1200},
  {level:6,  xpNeeded:2000},
  {level:7,  xpNeeded:3200},
  {level:8,  xpNeeded:5000},
  {level:9,  xpNeeded:7500},
  {level:10, xpNeeded:11000}
];

function getProfessionLevel() {
  if (!state.profession) return 0;
  const xp = state.professionXP || 0;
  let level = 0;
  for (let i = 1; i < PROFESSION_LEVELS.length; i++) {
    if (xp >= PROFESSION_LEVELS[i].xpNeeded) level = i; else break;
  }
  return level;
}

function getProfessionLevelProgress() {
  const level = getProfessionLevel();
  if (level >= 10) return { level:10, current:0, needed:0, pct:100 };
  const xp = state.professionXP || 0;
  const floor  = PROFESSION_LEVELS[level].xpNeeded;
  const ceil   = PROFESSION_LEVELS[level+1].xpNeeded;
  const current = xp - floor;
  const needed  = ceil - floor;
  return { level, current, needed, pct: Math.floor((current/needed)*100) };
}

// ── PERKS POR CLASE ──────────────────────────────────────────
const PROFESSION_PERKS_LIST = {
  cazabichos: [
    {level:1,  id:'pokeballs_discount', desc:'Pokéballs cuestan 30% menos'},
    {level:2,  id:'capture_bonus',      desc:'+5% tasa de captura base'},
    {level:3,  id:'eye_hunter',         desc:'Ojo de Cazador: ves el rango de IVs del salvaje antes de capturar'},
    {level:5,  id:'bug_net',            desc:'Red de Insecto: Pokémon Bicho con racha ×3 tienen IVs garantizados más altos'},
    {level:7,  id:'shiny_lens',         desc:'Lupa Shiny: con racha ×5, SHINY_RATE ÷5 para tipo Bicho'},
    {level:10, id:'secret_bush',        desc:'Arbusto Secreto: zona exclusiva con Scyther, Pinsir y Heracross'}
  ],
  pescador: [
    {level:1,  id:'early_water',  desc:'Acceso a Pokémon acuáticos raros desde el principio'},
    {level:2,  id:'patience',     desc:'Paciencia: 20% de chance de encontrar un Pokémon de nivel más alto en zonas de agua'},
    {level:3,  id:'bait',         desc:'Carnada: botón para repetir el último Pokémon encontrado (cooldown 10 min)'},
    {level:5,  id:'deep_fishing', desc:'Pesca Profunda: con Pasión alta aparece 1 Pokémon exclusivo por zona'},
    {level:7,  id:'big_net',      desc:'Red Grande: puede capturar hasta 2 Pokémon en un encuentro'},
    {level:10, id:'abyss',        desc:'Fosa Abismal: zona exclusiva con Lapras, Vaporeon y Dratini'}
  ],
  rocket: [
    {level:1,  id:'ball_theft',     desc:'Robo: 15% de chance de no gastar la Pokéball al capturar'},
    {level:2,  id:'bc_boost',       desc:'+50% Battle Coins en batallas contra entrenadores y gimnasios'},
    {level:3,  id:'intimidation',   desc:'Intimidación: entrenadores NPC empiezan con 50% menos HP'},
    {level:5,  id:'black_market',   desc:'Mercado Negro: tienda secreta con ítems raros a mitad de precio'},
    {level:7,  id:'item_theft',     desc:'El Botín: 20% de chance de robarle un ítem al entrenador derrotado'},
    {level:10, id:'pokemon_theft',  desc:'El Plan Perfecto: 1 vez por día podés quedarte con el Pokémon de un entrenador NPC'}
  ],
  cientifico: [
    {level:1,  id:'iv_analysis',    desc:'Análisis Genético: ves los IVs exactos de tus propios Pokémon sin ítems'},
    {level:2,  id:'iv_inheritance', desc:'Los huevos de crianza heredan 4 IVs sin Lazo Destino'},
    {level:3,  id:'nature_reroll',  desc:'Experimento: 1 vez por día podés reintentar la naturaleza de un Pokémon recién capturado'},
    {level:5,  id:'vitamin_boost',  desc:'Fórmula Mejorada: las vitaminas tienen +50% de efecto'},
    {level:7,  id:'self_clone',     desc:'Clon Inestable: podés criar un Pokémon consigo mismo sin Ditto'},
    {level:10, id:'mewtwo_project', desc:'Proyecto Mewtwo: cadena de misiones exclusiva para obtener un Mewtwo con 4 IVs garantizados'}
  ],
  guardabosques: [
    {level:1,  id:'free_heal',      desc:'Centro Pokémon cura todos los estados de forma gratuita'},
    {level:2,  id:'fast_friendship',desc:'Los Pokémon ganan amistad el doble de rápido'},
    {level:3,  id:'forest_call',    desc:'Llamada del Bosque: 1 vez por hora invocás un encuentro con un Pokémon específico de la zona'},
    {level:5,  id:'sanctuary_heal', desc:'Santuario: tu zona marcada recupera 15% HP a tu equipo cada visita'},
    {level:7,  id:'synchro',        desc:'Sincronía: si tu Pokémon activo tiene amistad máxima, +10% tasa de captura'},
    {level:10, id:'guardian_mew',   desc:'Guardián: Mew puede aparecer en tu zona marcada (1/500), solo para vos'}
  ],
  medallero: [
    {level:1,  id:'gym_money',      desc:'Los gimnasios dan el doble de dinero'},
    {level:2,  id:'fast_rematch',   desc:'Revancha: podés retar gimnasios cada 4 horas (otros esperan 24h)'},
    {level:3,  id:'scouting',       desc:'Scouting: ves el equipo completo del líder antes de entrar al gimnasio'},
    {level:5,  id:'win_streak',     desc:'Racha de Medallas: cada gimnasio consecutivo da +10% más BC del siguiente'},
    {level:7,  id:'gym_exp',        desc:'Entrenamiento Intensivo: +25% EXP solo en batallas de gimnasio'},
    {level:10, id:'elite_circuit',  desc:'Liga Élite: versiones potenciadas de los 8 líderes (niv. 60-80) con recompensas únicas'}
  ]
};

function hasPerk(perkId) {
  if (!state.profession) return false;
  const list = PROFESSION_PERKS_LIST[state.profession] || [];
  const perk = list.find(p => p.id === perkId);
  return perk ? getProfessionLevel() >= perk.level : false;
}

// ── PASIÓN Y XP ──────────────────────────────────────────────
function addPassion(amount) {
  if (!state.profession) return;
  state.passionPoints = Math.max(0, Math.min(100, (state.passionPoints||0) + amount));
  if (amount > 0) state.professionXP = (state.professionXP||0) + Math.abs(amount);
  scheduleSave();
}

function resetPassion() {
  if (!state.profession) return;
  state.passionPoints = 0;
  scheduleSave();
}

function getPassionMultiplier() {
  const p = state.passionPoints || 0;
  if (p >= 80) return 1.5;
  if (p >= 50) return 1.25;
  if (p >= 25) return 1.1;
  return 1.0;
}

// ── UTILIDADES ───────────────────────────────────────────────
function formatTimer(ms) {
  if (ms <= 0) return '¡Listo!';
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getProfessionBadge(profId) {
  if (!profId || !PROFESSIONS[profId]) return '';
  const p = PROFESSIONS[profId];
  return `<span style="font-size:9px;background:${p.color};border:1px solid ${p.borderColor};border-radius:6px;padding:2px 6px;color:${p.borderColor};font-family:'Press Start 2P',monospace;white-space:nowrap;">${p.icon} ${p.name}</span>`;
}

// ── AUTO-REFRESH DE TIMERS ───────────────────────────────────
let _profTabInterval = null;

function startProfessionTabRefresh() {
  if (_profTabInterval) clearInterval(_profTabInterval);
  _profTabInterval = setInterval(() => {
    const tab = document.getElementById('tab-profession');
    if (!tab || tab.style.display === 'none') {
      clearInterval(_profTabInterval);
      _profTabInterval = null;
      return;
    }
    document.querySelectorAll('[data-countdown-end]').forEach(el => {
      const end = parseInt(el.dataset.countdownEnd);
      const rem = end - Date.now();
      el.textContent = rem <= 0 ? '¡Listo! ✅' : formatTimer(rem);
      if (rem <= 0 && el.dataset.refreshOnReady === 'true') {
        // Trigger re-render of the loop section
        if (typeof renderProfessionTab === 'function') renderProfessionTab();
        return;
      }
    });
  }, 1000);
}

// ── RESETS DIARIOS ───────────────────────────────────────────
function checkDailyResets() {
  if (!state.professionData) state.professionData = {};
  const today = new Date().toDateString();

  // Reset desmayos del Guardabosques
  if (state.professionData.lastFaintDay !== today) {
    state.professionData.faintsToday = 0;
    state.professionData.lastFaintDay = today;
  }

  // Reset experimentos del Científico
  if (state.professionData.lab && state.professionData.lab.lastDay !== today) {
    state.professionData.lab.experimentsToday = 0;
    state.professionData.lab.lastDay = today;
  }

  // Reset robo de Pokémon del Rocket
  if (state.professionData.lastPokemonTheftDay !== today) {
    state.professionData.pokemonTheftUsed = false;
    state.professionData.lastPokemonTheftDay = today;
  }

  // Decay de Gloria del Medallero (no jugó gimnasio en 24h)
  if (state.profession === 'medallero') {
    const lastGym = state.professionData.lastGymVictory || 0;
    if (Date.now() - lastGym > 24*60*60*1000 && (state.passionPoints||0) > 0) {
      state.passionPoints = Math.max(0, (state.passionPoints||0) - 10);
    }
  }

  // Decay de Profundidad del Pescador (no exploró agua en 24h)
  if (state.profession === 'pescador') {
    const lastWater = state.professionData.lastWaterZone || 0;
    if (Date.now() - lastWater > 24*60*60*1000 && (state.passionPoints||0) > 0) {
      state.passionPoints = Math.max(0, (state.passionPoints||0) - 5);
    }
  }

  scheduleSave();
}

// Llamar cada 10 minutos
setInterval(() => {
  if (typeof checkDailyResets === 'function') checkDailyResets();
  // Decay del Caza Bichos: 45 min sin explorar
  if (state.profession === 'cazabichos') {
    const lastExplore = state.professionData.lastExploreTime || 0;
    if (Date.now() - lastExplore > 45*60*1000 && (state.passionPoints||0) > 0) {
      state.passionPoints = Math.max(0, (state.passionPoints||0) - 5);
      scheduleSave();
    }
  }
}, 10*60*1000);

// ── ELEGIR PROFESIÓN ─────────────────────────────────────────
function chooseProfession(profId) {
  if (!PROFESSIONS[profId]) return;
  const prof = PROFESSIONS[profId];

  if (!state.profession) {
    // Primera vez: gratis
    state.profession = profId;
    state.passionPoints = 0;
    state.professionXP = 0;
    state.professionData = {};
    scheduleSave();
    notify(`¡Elegiste la clase ${prof.name}!`, prof.icon);
    renderProfessionTab();
    return;
  }

  // Cambio: cuesta 500 BC
  if ((state.battleCoins||0) < 500) {
    notify('Necesitás 500 🪙 Battle Coins para cambiar de clase.', '❌');
    return;
  }
  if (!confirm(`¿Cambiar a ${prof.name}? Cuesta 500 BC y resetea tu Pasión. Los perks desbloqueados no se pierden si volvés a esta clase.`)) return;

  state.battleCoins = (state.battleCoins||0) - 500;
  state.profession   = profId;
  state.passionPoints = 0;
  state.professionData = {};
  // professionXP no se resetea — se acumula históricamente
  scheduleSave();
  notify(`¡Cambiaste a ${prof.name}!`, prof.icon);
  renderProfessionTab();
}

// ── RENDER DEL TAB ───────────────────────────────────────────
function renderProfessionTab() {
  const container = document.getElementById('tab-profession');
  if (!container) return;

  if (!state.profession) {
    // ── PANTALLA DE SELECCIÓN ──
    container.innerHTML = `
      <div style="padding:8px 0 20px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:white;margin-bottom:8px;text-align:center;">🎭 ELIGE TU CLASE</div>
        <div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.6);text-align:center;margin-bottom:20px;line-height:1.5;">
          Tu clase define cómo explorás, economizás y criás.<br>El PvP es terreno neutral para todos.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${Object.values(PROFESSIONS).map(p => `
            <div onclick="chooseProfession('${p.id}')" style="
              background:${p.color};
              border:2px solid ${p.borderColor};
              border-radius:14px;padding:14px;cursor:pointer;
              transition:transform 0.15s,box-shadow 0.15s;
              box-shadow:0 0 0 transparent;"
              onmouseover="this.style.transform='scale(1.03)';this.style.boxShadow='0 0 16px ${p.borderColor}44'"
              onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
              <div style="font-size:32px;text-align:center;margin-bottom:8px;">${p.icon}</div>
              <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:${p.borderColor};text-align:center;margin-bottom:8px;">${p.name}</div>
              <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.75);line-height:1.4;margin-bottom:8px;">${p.description}</div>
              <div style="font-family:'Nunito',sans-serif;font-size:10px;color:${p.borderColor};margin-bottom:4px;">✨ ${p.passionName}</div>
              <div style="font-family:'Nunito',sans-serif;font-size:10px;color:rgba(255,100,100,0.8);">⚠️ ${p.penalty}</div>
            </div>
          `).join('')}
        </div>
      </div>`;
    return;
  }

  // ── PANEL DE CLASE ACTIVA ──
  const prof = PROFESSIONS[state.profession];
  const lvl  = getProfessionLevel();
  const prog = getProfessionLevelProgress();
  const passion = state.passionPoints || 0;
  const perks = PROFESSION_PERKS_LIST[state.profession] || [];

  container.innerHTML = `
    <!-- HEADER -->
    <div style="background:${prof.color};border:2px solid ${prof.borderColor};border-radius:16px;padding:16px;margin-bottom:16px;text-align:center;">
      <div style="font-size:44px;margin-bottom:8px;">${prof.icon}</div>
      <div style="font-family:'Press Start 2P',monospace;font-size:13px;color:${prof.borderColor};">${prof.name}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px;">Nivel de clase: ${lvl}/10</div>
    </div>

    <!-- BARRA DE PASIÓN -->
    <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span>✨ ${prof.passionName}</span>
        <span style="font-family:'Press Start 2P',monospace;font-size:9px;color:${prof.borderColor};">${passion}/100</span>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:10px;overflow:hidden;">
        <div style="width:${passion}%;height:100%;background:${prof.borderColor};border-radius:6px;transition:width 0.4s;"></div>
      </div>
      ${passion >= 80 ? `<div style="font-family:'Nunito',sans-serif;font-size:11px;color:${prof.borderColor};margin-top:6px;">⚡ Pasión alta — perks amplificados ×1.5</div>` : ''}
      <div style="font-family:'Nunito',sans-serif;font-size:10px;color:rgba(255,100,100,0.7);margin-top:6px;">⚠️ ${prof.penalty}</div>
    </div>

    <!-- BARRA DE NIVEL -->
    <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:8px;display:flex;justify-content:space-between;">
        <span>📈 Progreso de clase</span>
        <span style="font-family:'Press Start 2P',monospace;font-size:9px;color:#fbbf24;">Nv.${prog.level}${prog.level<10?'→'+(prog.level+1):' MAX'}</span>
      </div>
      ${prog.level < 10 ? `
        <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:8px;overflow:hidden;margin-bottom:6px;">
          <div style="width:${prog.pct}%;height:100%;background:#fbbf24;border-radius:6px;transition:width 0.4s;"></div>
        </div>
        <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.5);">${prog.current} / ${prog.needed} XP</div>
      ` : '<div style="color:#fbbf24;font-family:Nunito,sans-serif;font-size:12px;">✨ Nivel Máximo alcanzado</div>'}
    </div>

    <!-- PERKS -->
    <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px;margin-bottom:12px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:rgba(255,255,255,0.7);margin-bottom:12px;">PERKS DE CLASE</div>
      ${perks.map(pk => {
        const unlocked = lvl >= pk.level;
        return `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;opacity:${unlocked?1:0.45};">
          <span style="font-size:16px;margin-top:2px;">${unlocked?'✅':'🔒'}</span>
          <div>
            <div style="font-family:'Nunito',sans-serif;font-size:12px;color:${unlocked?'white':'rgba(255,255,255,0.5)'};">${pk.desc}</div>
            ${!unlocked?`<div style="font-family:'Press Start 2P',monospace;font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">Nv.${pk.level} requerido</div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- LOOP OFFLINE -->
    <div id="profession-loop-container" style="margin-bottom:16px;">
      <!-- Se llena abajo -->
    </div>

    <!-- BOTÓN CAMBIAR -->
    <div style="text-align:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);">
      <button onclick="_showProfessionChangeMenu()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.4);color:rgba(239,68,68,0.8);font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 16px;border-radius:10px;cursor:pointer;">
        ⚠️ Cambiar de clase (500 BC)
      </button>
    </div>
  `;

  // Renderizar el loop correspondiente en su contenedor
  const loopContainer = document.getElementById('profession-loop-container');
  if (!loopContainer) return;
  switch(state.profession) {
    case 'cazabichos':     renderTrapLoop(loopContainer);      break;
    case 'pescador':       renderRodLoop(loopContainer);       break;
    case 'rocket':         renderRocketLoops(loopContainer);   break;
    case 'cientifico':     renderLabLoop(loopContainer);       break;
    case 'guardabosques':  renderSanctuaryLoop(loopContainer); break;
    case 'medallero':      renderCircuitLoop(loopContainer);   break;
  }
}

function _showProfessionChangeMenu() {
  const others = Object.values(PROFESSIONS).filter(p => p.id !== state.profession);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-y:auto;';
  ov.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:white;margin-bottom:8px;">CAMBIAR DE CLASE</div>
    <div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,100,100,0.8);margin-bottom:20px;text-align:center;">Cuesta 500 BC. Tu Pasión se resetea.<br>Tus perks se guardan si volvés.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:400px;margin-bottom:20px;">
      ${others.map(p => `
        <div onclick="chooseProfession('${p.id}');this.closest('[style*=\\"position:fixed\\"]').remove();" style="background:${p.color};border:2px solid ${p.borderColor};border-radius:12px;padding:12px;cursor:pointer;text-align:center;">
          <div style="font-size:28px;">${p.icon}</div>
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:${p.borderColor};margin-top:6px;">${p.name}</div>
        </div>`).join('')}
    </div>
    <button onclick="this.closest('[style*=\\"position:fixed\\"]').remove()" style="background:rgba(255,255,255,0.1);color:white;border:none;padding:12px 24px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">CANCELAR</button>
  `;
  document.body.appendChild(ov);
}

// ── LOOP: LA TRAMPA (CAZA BICHOS) ────────────────────────────
function _getMaxTraps()    { const lv=getProfessionLevel(); return lv>=10?3:lv>=5?2:1; }
function _getTrapTimerMs() { const lv=getProfessionLevel(); return lv>=10?2*3600000:lv>=5?3*3600000:4*3600000; }

function activateTrap() {
  if (!state.professionData.traps) state.professionData.traps = [];
  const active = state.professionData.traps.filter(t => !t.resolved).length;
  if (active >= _getMaxTraps()) { notify('Todas tus trampas están activas', '🪤'); return; }
  const zoneId = state.lastWildLocId || 'forest';
  state.professionData.traps.push({ activatedAt: Date.now(), zoneId, resolved: false });
  scheduleSave();
  notify('¡Trampa colocada en ' + zoneId + '!', '🪤');
  renderProfessionTab();
}

function inspectTrap(idx) {
  const traps = state.professionData.traps || [];
  const trap = traps[idx];
  if (!trap) return;
  const loc = FIRE_RED_MAPS.find(l => l.id === trap.zoneId) || FIRE_RED_MAPS[0];
  const pool = loc.wild.day || loc.wild.morning || [];
  const pokId = pool[Math.floor(Math.random() * pool.length)] || 'rattata';
  const level = Math.floor(Math.random() * (loc.lv[1] - loc.lv[0] + 1)) + loc.lv[0];
  const pData = POKEMON_DB[pokId];
  const name  = pData ? pData.name : pokId;
  const spriteUrl = `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokId}.gif`;

  // Generar IVs para mostrar si tiene Ojo de Cazador
  const fakeIvs = { hp: Math.floor(Math.random()*32), atk: Math.floor(Math.random()*32), def: Math.floor(Math.random()*32), spa: Math.floor(Math.random()*32), spd: Math.floor(Math.random()*32), spe: Math.floor(Math.random()*32) };
  const avgIv = Object.values(fakeIvs).reduce((a,b)=>a+b,0)/6;
  const ivLabel = avgIv<10?'😐 Débil':avgIv<18?'👍 Promedio':avgIv<25?'⭐ Bueno':'🌟 Élite';

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:#4ade80;margin-bottom:16px;">🪤 ¡TRAMPA ACTIVADA!</div>
    <img src="${spriteUrl}" style="width:96px;height:96px;image-rendering:pixelated;" onerror="this.style.display='none'">
    <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:white;margin:12px 0 4px;">${name}</div>
    <div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:8px;">Nv. ${level}</div>
    ${hasPerk('eye_hunter') ? `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:#4ade80;margin-bottom:16px;">🔍 Ojo de Cazador: ${ivLabel}</div>` : '<div style="margin-bottom:16px;"></div>'}
    <div style="display:flex;gap:12px;">
      <button id="_trapKeep" style="background:#16a34a;color:white;border:none;padding:14px 20px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">QUEDÁRMELO</button>
      <button id="_trapRelease" style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.3);padding:14px 20px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">SOLTAR<br><span style="font-family:Nunito;font-size:10px;color:#4ade80;">+15 Pasión</span></button>
    </div>
  `;
  document.body.appendChild(ov);
  ov.querySelector('#_trapKeep').onclick = () => {
    const p = makePokemon(pokId, level);
    if (p.ivs) p.ivs = fakeIvs; // usar los IVs que se mostraron
    recalcPokemonStats(p);
    if (state.team.length < 6) state.team.push(p);
    else { state.box.push(p); notify(`${name} enviado a la Caja.`, '📦'); }
    state.professionData.traps[idx].resolved = true;
    addPassion(5);
    scheduleSave();
    ov.remove();
    renderProfessionTab();
  };
  ov.querySelector('#_trapRelease').onclick = () => {
    state.professionData.traps[idx].resolved = true;
    addPassion(15);
    scheduleSave();
    ov.remove();
    renderProfessionTab();
    notify('Pokémon liberado. +15 Pasión', '🌿');
  };
}

function renderTrapLoop(container) {
  if (!container) return;
  // Limpiar trampas resueltas hace más de 24h
  state.professionData.traps = (state.professionData.traps||[]).filter(t => !t.resolved || Date.now()-t.activatedAt < 86400000);
  const traps = state.professionData.traps || [];
  const max   = _getMaxTraps();
  const timerMs = _getTrapTimerMs();

  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:14px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#4ade80;margin-bottom:12px;">🪤 MIS TRAMPAS</div>
    <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:14px;">Dejás trampas en la zona actual. Volvé a inspeccionarlas cuando estén listas.</div>`;

  for (let i = 0; i < max; i++) {
    const trap = traps.filter(t=>!t.resolved)[i];
    if (!trap) {
      html += `<div style="border:1px dashed rgba(74,222,128,0.3);border-radius:10px;padding:12px;margin-bottom:10px;text-align:center;">
        <button onclick="activateTrap()" style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.4);padding:10px 16px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">+ Colocar trampa</button>
        <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin-top:6px;">Zona: ${state.lastWildLocId || 'Explorá primero'}</div>
      </div>`;
    } else {
      const endTime = trap.activatedAt + timerMs;
      const ready   = Date.now() >= endTime;
      html += `<div style="border:1px solid ${ready?'#4ade80':'rgba(255,255,255,0.1)'};border-radius:10px;padding:12px;margin-bottom:10px;${ready?'animation:pulseGlow 2s infinite;':''}">
        <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:6px;">📍 ${trap.zoneId}</div>
        ${ready
          ? `<button onclick="inspectTrap(${traps.indexOf(trap)})" style="width:100%;background:rgba(74,222,128,0.2);color:#4ade80;border:1px solid #4ade80;padding:10px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">¡INSPECCIONAR! 🎁</button>`
          : `<div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">⏳ <span data-countdown-end="${endTime}" data-refresh-on-ready="true">${formatTimer(endTime-Date.now())}</span></div>`
        }
      </div>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── LOOP: LA CAÑA AUTOMÁTICA (PESCADOR) ─────────────────────
const _WATER_FALLBACK = ['magikarp','goldeen','poliwag','tentacool','horsea','psyduck','staryu','shellder','seel','krabby'];
const _WATER_ZONES    = ['route24','route25','route12','route13','seafoam_islands','diglett_cave'];

function _getAquaticPool(zoneId) {
  const loc = FIRE_RED_MAPS.find(l => l.id === zoneId);
  if (!loc) return _WATER_FALLBACK;
  const dayPool = loc.wild.day || loc.wild.morning || [];
  const waterTypes = ['water','ice'];
  const filtered = dayPool.filter(id => {
    const p = POKEMON_DB[id];
    return p && (waterTypes.includes(p.type) || waterTypes.includes(p.type2));
  });
  return filtered.length >= 2 ? filtered : _WATER_FALLBACK;
}

function castRod() {
  if (state.professionData.rod) { notify('Ya tenés la caña en el agua.', '🎣'); return; }
  const zoneId = state.lastWildLocId || 'route12';
  state.professionData.rod = { activatedAt: Date.now(), zoneId };
  scheduleSave();
  notify(`¡Caña lanzada en ${zoneId}!`, '🎣');
  renderProfessionTab();
}

function pullRod() {
  const rod = state.professionData.rod;
  if (!rod) return;
  const pool = _getAquaticPool(rod.zoneId);
  const passion = state.passionPoints || 0;
  const loc = FIRE_RED_MAPS.find(l => l.id === rod.zoneId) || FIRE_RED_MAPS[0];
  // Con Pasión > 70 y deep_fishing: elige de los últimos (más raros) del pool
  let pokId;
  if (hasPerk('deep_fishing') && passion > 70 && pool.length > 2) {
    pokId = pool[pool.length - 1 - Math.floor(Math.random()*2)];
  } else {
    pokId = pool[Math.floor(Math.random()*pool.length)];
  }
  const level = Math.floor(Math.random()*(loc.lv[1]-loc.lv[0]+1))+loc.lv[0];
  const pData = POKEMON_DB[pokId];
  const name  = pData ? pData.name : pokId;
  const spriteUrl = `https://img.pokemondb.net/sprites/black-white/anim/normal/${pokId}.gif`;
  state.professionData.lastRodResult = { name, pokId, level };

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:#60a5fa;margin-bottom:16px;">🎣 ¡PIQUE EXITOSO!</div>
    <img src="${spriteUrl}" style="width:96px;height:96px;image-rendering:pixelated;" onerror="this.style.display='none'">
    <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:white;margin:12px 0 4px;">${name}</div>
    <div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:20px;">Nv. ${level}</div>
    <div style="display:flex;gap:12px;">
      <button id="_rodCatch" style="background:#1d4ed8;color:white;border:none;padding:14px 20px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">CAPTURAR<br><span style="font-family:Nunito;font-size:10px;">(gasta 1 Pokéball)</span></button>
      <button id="_rodRelease" style="background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.3);padding:14px 20px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">DEJAR IR<br><span style="font-family:Nunito;font-size:10px;color:#60a5fa;">+5 Pasión</span></button>
    </div>`;
  document.body.appendChild(ov);

  ov.querySelector('#_rodCatch').onclick = () => {
    const ballPriority = ['Pokéball','Súper Ball','Ultra Ball','Master Ball'];
    const ball = ballPriority.find(b => (state.inventory[b]||0) > 0);
    if (!ball) { notify('No tenés Pokéballs', '❌'); return; }
    state.inventory[ball]--;
    if (state.inventory[ball] <= 0) delete state.inventory[ball];
    const p = makePokemon(pokId, level);
    if (state.team.length < 6) state.team.push(p);
    else { state.box.push(p); notify(`${name} enviado a la Caja.`, '📦'); }
    addPassion(10);
    delete state.professionData.rod;
    scheduleSave();
    ov.remove();
    renderProfessionTab();
    notify(`¡Capturaste a ${name}!`, '🎣');
  };
  ov.querySelector('#_rodRelease').onclick = () => {
    addPassion(5);
    delete state.professionData.rod;
    scheduleSave();
    ov.remove();
    renderProfessionTab();
  };
}

function renderRodLoop(container) {
  if (!container) return;
  const rod = state.professionData.rod;
  const last = state.professionData.lastRodResult;
  const ROD_TIMER = 4 * 3600000;

  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(96,165,250,0.2);border-radius:12px;padding:14px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#60a5fa;margin-bottom:12px;">🎣 LA CAÑA AUTOMÁTICA</div>`;

  if (!rod) {
    html += `
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Zona actual: <strong style="color:white;">${state.lastWildLocId||'(explorá primero)'}</strong><br><span style="font-size:11px;opacity:0.6;">La zona donde lanzás determina qué Pokémon pescarás.</span></div>
      <button onclick="castRod()" style="width:100%;background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.4);padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">🎣 LANZAR LA CAÑA</button>
      ${last ? `<div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin-top:10px;">Última pesca: ${last.name} Nv.${last.level}</div>` : ''}`;
  } else {
    const endTime = rod.activatedAt + ROD_TIMER;
    const ready   = Date.now() >= endTime;
    html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:8px;">📍 Caña en: <strong style="color:white;">${rod.zoneId}</strong></div>`;
    if (ready) {
      html += `<div style="text-align:center;padding:10px;"><div style="font-size:24px;margin-bottom:8px;">🐟</div><div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#60a5fa;margin-bottom:12px;">¡ALGO PICÓ!</div>
        <button onclick="pullRod()" style="width:100%;background:rgba(96,165,250,0.25);color:#60a5fa;border:2px solid #60a5fa;padding:14px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;animation:pulseGlow 2s infinite;">¡JALAR LA CAÑA!</button></div>`;
    } else {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">⏳ <span data-countdown-end="${endTime}" data-refresh-on-ready="true">${formatTimer(endTime-Date.now())}</span></div>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── LOOP: EL OPERATIVO + MERCADO NEGRO (TEAM ROCKET) ─────────
const _OP_LOOT_BASE = ['Poción','Antídoto','Pokéball','Repelente','Despertar','Cura Quemadura'];
const _OP_LOOT_MID  = ['Super Poción','Ultra Ball','Éter','Cura Total','Súper Ball'];
const _OP_LOOT_HIGH = ['Hiper Poción','Revivir','Lente Zoom','Banda Focus','Restos'];
const _SEALED_POOL  = ['Cinta Elegida','Caramelo Raro','Huevo Suerte','Lazo Destino','Compartir EXP'];
const _BM_POOL      = [
  {name:'Banda Focus',   price:700},
  {name:'Restos',        price:600},
  {name:'Cinta Elegida', price:800},
  {name:'Lente Zoom',    price:400},
  {name:'Ultra Ball',    price:1200},
  {name:'Revivir',       price:1500},
  {name:'Hiper Poción',  price:1200},
  {name:'Caramelo Raro', price:500}
];

function sendOperative() {
  if (state.professionData.operative) { notify('Tu operativo ya está en misión.', '🚀'); return; }
  state.professionData.operative = { startedAt: Date.now() };
  scheduleSave();
  notify('¡Operativo enviado! Regresa en 5 horas.', '🚀');
  renderProfessionTab();
}

function resolveOperative() {
  const passion = state.passionPoints || 0;
  const isFail  = Math.random() < 0.10;
  let loot = [];
  const baseCount = isFail ? 1 : Math.floor(Math.random()*2)+1;
  for (let i=0; i<baseCount; i++) loot.push(_OP_LOOT_BASE[Math.floor(Math.random()*_OP_LOOT_BASE.length)]);
  if (!isFail && passion >= 40) loot.push(_OP_LOOT_MID[Math.floor(Math.random()*_OP_LOOT_MID.length)]);
  if (!isFail && passion >= 70) loot.push(_OP_LOOT_HIGH[Math.floor(Math.random()*_OP_LOOT_HIGH.length)]);
  const hasSealedBox = !isFail && Math.random() < 0.30;
  if (isFail) addPassion(-20);

  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
  ov.innerHTML = `
    <div style="background:#0d0d0d;border:2px solid #ef4444;border-radius:16px;padding:24px;max-width:340px;width:100%;">
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;margin-bottom:4px;">📋 REPORTE DEL OPERATIVO</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:${isFail?'#ef4444':'#4ade80'};margin-bottom:16px;">${isFail?'⚠️ Fallo parcial':'✅ Completado'}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:16px;">
        <strong>Botín:</strong><br>${loot.map(i=>`• ${i}`).join('<br>')}
        ${hasSealedBox?'<br>• 📦 Caja sellada':''}
      </div>
      ${hasSealedBox ? `<button id="_openBox" style="width:100%;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.4);padding:10px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;margin-bottom:10px;">ABRIR CAJA (₽200)</button>` : ''}
      <button id="_claimLoot" style="width:100%;background:#991b1b;color:white;border:none;padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">RECLAMAR BOTÍN</button>
    </div>`;
  document.body.appendChild(ov);
  if (hasSealedBox) {
    ov.querySelector('#_openBox').onclick = () => {
      if ((state.money||0) < 200) { notify('No tenés ₽200 para abrir la caja.','❌'); return; }
      state.money -= 200;
      const item = _SEALED_POOL[Math.floor(Math.random()*_SEALED_POOL.length)];
      state.inventory[item] = (state.inventory[item]||0)+1;
      notify(`¡La caja contenía: ${item}!`,'🎁');
      ov.querySelector('#_openBox').remove();
      scheduleSave();
    };
  }
  ov.querySelector('#_claimLoot').onclick = () => {
    loot.forEach(item => { state.inventory[item] = (state.inventory[item]||0)+1; });
    delete state.professionData.operative;
    scheduleSave();
    ov.remove();
    renderProfessionTab();
    notify('¡Botín reclamado!','🚀');
  };
}

function _rotateBM() {
  const shuffled = [..._BM_POOL].sort(()=>Math.random()-0.5).slice(0,4);
  return shuffled.map(i => ({ name:i.name, original:i.price, sale:Math.floor(i.price*0.5) }));
}

function renderRocketLoops(container) {
  if (!container) return;
  const op  = state.professionData.operative;
  const bm  = state.professionData.blackMarket;
  const OP_TIMER = 5 * 3600000;
  const BM_TIMER = 6 * 3600000;

  // Rotar Mercado Negro si expiró
  if (hasPerk('black_market') && (!bm || Date.now() > bm.expiresAt)) {
    state.professionData.blackMarket = { stock: _rotateBM(), expiresAt: Date.now() + BM_TIMER };
    scheduleSave();
  }
  const bmData = state.professionData.blackMarket;

  let html = `<div style="display:flex;flex-direction:column;gap:12px;">`;

  // ── Operativo ──
  html += `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#ef4444;margin-bottom:12px;">📋 EL OPERATIVO</div>`;
  if (!op) {
    html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Mandá a tus subordinados. Regresan en 5 horas con botín.</div>
      <button onclick="sendOperative()" style="width:100%;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.4);padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">🚀 ENVIAR OPERATIVO</button>`;
  } else {
    const endTime = op.startedAt + OP_TIMER;
    const ready   = Date.now() >= endTime;
    if (ready) {
      html += `<button onclick="resolveOperative()" style="width:100%;background:rgba(239,68,68,0.25);color:#ef4444;border:2px solid #ef4444;padding:14px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;animation:pulseGlow 2s infinite;">📋 VER REPORTE</button>`;
    } else {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.5);">Misión en curso...<br>⏳ <span data-countdown-end="${endTime}" data-refresh-on-ready="true">${formatTimer(endTime-Date.now())}</span></div>`;
    }
  }
  html += '</div>';

  // ── Mercado Negro ──
  if (hasPerk('black_market') && bmData) {
    html += `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#ef4444;">🏴 MERCADO NEGRO</div>
        <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);">Rota en: <span data-countdown-end="${bmData.expiresAt}">${formatTimer(bmData.expiresAt-Date.now())}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${bmData.stock.map(item => `
          <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px;text-align:center;">
            <div style="font-family:'Nunito',sans-serif;font-size:12px;color:white;margin-bottom:4px;">${item.name}</div>
            <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.3);text-decoration:line-through;">₽${item.original.toLocaleString()}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#ef4444;margin-bottom:8px;">₽${item.sale.toLocaleString()}</div>
            <button onclick="_bmBuy('${item.name}',${item.sale})" style="width:100%;background:#991b1b;color:white;border:none;padding:6px;border-radius:6px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;">COMPRAR</button>
          </div>`).join('')}
      </div>
    </div>`;
  } else if (!hasPerk('black_market')) {
    html += `<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:14px;text-align:center;">
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.4);">🔒 Mercado Negro<br><span style="font-size:11px;">Disponible en nivel 5</span></div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function _bmBuy(name, price) {
  if ((state.money||0) < price) { notify('No tenés suficiente dinero.','❌'); return; }
  state.money -= price;
  state.inventory[name] = (state.inventory[name]||0)+1;
  notify(`¡Compraste ${name} del Mercado Negro!`,'🏴');
  scheduleSave();
  updateHud();
  renderProfessionTab();
}

// ── LOOP: EL EXPERIMENTO (CIENTÍFICO) ───────────────────────
const LAB_EXPERIMENTS = [
  { id:'ivanalysis',   name:'Análisis de IVs',       icon:'🔬', durationMs:2*3600000,  desc:'Revela IVs exactos de cualquier Pokémon propio.', requiresTarget:true  },
  { id:'synthesis',    name:'Síntesis de Ítem',       icon:'⚗️',  durationMs:4*3600000,  desc:'Fabrica 1 ítem consumible aleatorio.',             requiresTarget:false },
  { id:'optimization', name:'Optimización Genética',  icon:'🧬',  durationMs:6*3600000,  desc:'Mejora +2 a 1 IV aleatorio de un Pokémon (máx 31). EXCLUSIVO.',  requiresTarget:true  },
  { id:'incubation',   name:'Incubación Acelerada',   icon:'🥚',  durationMs:3*3600000,  desc:'Reduce 50 pasos a todos tus huevos activos.',      requiresTarget:false }
];

function startExperiment(expId, targetUid) {
  if (!state.professionData.lab) state.professionData.lab = {};
  const lab   = state.professionData.lab;
  const today = new Date().toDateString();
  if (lab.lastDay !== today) { lab.experimentsToday = 0; lab.lastDay = today; }
  if ((lab.experimentsToday||0) >= 3) { notify('Completaste 3 experimentos hoy. Volvé mañana.','🔬'); return; }
  if (lab.active) { notify('Ya tenés un experimento en curso.','🔬'); return; }
  lab.active = { expId, startedAt: Date.now(), targetUid: targetUid||null };
  scheduleSave();
  notify('¡Experimento iniciado!','🧪');
  renderProfessionTab();
}

function resolveExperiment() {
  const lab  = state.professionData.lab;
  const { expId, targetUid } = lab.active;

  if (expId === 'ivanalysis') {
    const allPok = [...(state.team||[]), ...(state.box||[])];
    const target  = allPok.find(p => p.uid === targetUid);
    if (!target) { notify('Pokémon no encontrado.','❌'); return; }
    const ivs = target.ivs || {};
    const rows = Object.entries(ivs).map(([stat,val]) => {
      const color = val>=28?'#4ade80':val>=20?'#fbbf24':'#f87171';
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.7);text-transform:uppercase;">${stat}</span>
        <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:${color};">${val}/31</span>
      </div>`;
    }).join('');
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    ov.innerHTML = `<div style="background:#0a1a10;border:2px solid #34d399;border-radius:16px;padding:24px;max-width:300px;width:100%;">
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#34d399;margin-bottom:16px;">🔬 IVs DE ${target.name.toUpperCase()}</div>
      ${rows}
      <button onclick="this.closest('[style*=\'position:fixed\']').remove()" style="width:100%;margin-top:16px;background:#065f46;color:white;border:none;padding:12px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">CERRAR</button>
    </div>`;
    document.body.appendChild(ov);
    addPassion(5);
  }

  else if (expId === 'synthesis') {
    const pool = ['Poción','Super Poción','Éter','Repelente','Ultra Ball','Cura Total','Revivir','Éter'];
    const item  = pool[Math.floor(Math.random()*pool.length)];
    state.inventory[item] = (state.inventory[item]||0)+1;
    addPassion(8);
    notify(`¡Sintetizaste: ${item}!`,'⚗️');
  }

  else if (expId === 'optimization') {
    const allPok = [...(state.team||[]), ...(state.box||[])];
    const target  = allPok.find(p => p.uid === targetUid);
    if (!target) { notify('Pokémon no encontrado.','❌'); return; }
    const stats = ['hp','atk','def','spa','spd','spe'];
    const stat  = stats[Math.floor(Math.random()*stats.length)];
    const old   = target.ivs[stat];
    target.ivs[stat] = Math.min(31, old + 2);
    recalcPokemonStats(target);
    // PASO 16 — Proyecto Mewtwo: contar optimizaciones
    if (state.professionData?.mewtwoProject) {
      state.professionData.mewtwoProject.optimizations = (state.professionData.mewtwoProject.optimizations||0) + 1;
    }
    addPassion(12);
    notify(`¡IV de ${stat.toUpperCase()} mejorado: ${old} → ${target.ivs[stat]}!`,'🧬');
    scheduleSave();
  }

  else if (expId === 'incubation') {
    (state.eggs||[]).forEach(e => { e.steps = Math.max(0, e.steps-50); });
    addPassion(8);
    notify('¡Todos los huevos avanzaron 50 pasos!','🥚');
    scheduleSave();
  }

  lab.experimentsToday = (lab.experimentsToday||0)+1;
  lab.active = null;
  scheduleSave();
  renderProfessionTab();
}

function renderLabLoop(container) {
  if (!container) return;
  if (!state.professionData.lab) state.professionData.lab = {};
  const lab   = state.professionData.lab;
  const today = new Date().toDateString();
  if (lab.lastDay !== today) { lab.experimentsToday = 0; lab.lastDay = today; }
  const used = lab.experimentsToday || 0;
  const allPok = [...(state.team||[]), ...(state.box||[])];

  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(52,211,153,0.2);border-radius:12px;padding:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#34d399;">🧪 EL LABORATORIO</div>
      <div style="font-family:'Nunito',sans-serif;font-size:11px;color:${used>=3?'#f87171':'rgba(255,255,255,0.5)'};">${used}/3 hoy</div>
    </div>`;

  if (lab.active) {
    const exp     = LAB_EXPERIMENTS.find(e=>e.id===lab.active.expId);
    const endTime = lab.active.startedAt + (exp?.durationMs||3600000);
    const ready   = Date.now() >= endTime;
    const targetPok = allPok.find(p=>p.uid===lab.active.targetUid);
    html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:8px;">${exp?.icon} ${exp?.name}</div>
      ${targetPok ? `<div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">Sujeto: ${targetPok.name}</div>` : ''}`;
    if (ready) {
      html += `<button onclick="resolveExperiment()" style="width:100%;background:rgba(52,211,153,0.2);color:#34d399;border:2px solid #34d399;padding:14px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;animation:pulseGlow 2s infinite;">🧪 VER RESULTADOS</button>`;
    } else {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">⏳ <span data-countdown-end="${endTime}" data-refresh-on-ready="true">${formatTimer(endTime-Date.now())}</span></div>`;
    }
  } else if (used >= 3) {
    html += `<div style="text-align:center;font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,100,100,0.7);padding:12px;">Límite diario alcanzado.<br>Volvé mañana.</div>`;
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
    LAB_EXPERIMENTS.forEach(exp => {
      html += `<div style="background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.15);border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-family:'Nunito',sans-serif;font-size:13px;color:white;">${exp.icon} ${exp.name}</span>
          <span style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);">${formatTimer(exp.durationMs)}</span>
        </div>
        <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:10px;">${exp.desc}</div>`;
      if (exp.requiresTarget && allPok.length > 0) {
        html += `<div style="display:flex;gap:8px;align-items:center;">
          <select id="lab_target_${exp.id}" style="flex:1;background:rgba(0,0,0,0.4);color:white;border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:6px;font-family:Nunito,sans-serif;font-size:11px;">
            ${allPok.slice(0,20).map(p=>`<option value="${p.uid}">${p.name} Nv.${p.level}</option>`).join('')}
          </select>
          <button onclick="startExperiment('${exp.id}',document.getElementById('lab_target_${exp.id}').value)" style="background:#065f46;color:white;border:none;padding:8px 14px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">INICIAR</button>
        </div>`;
      } else {
        html += `<button onclick="startExperiment('${exp.id}')" style="width:100%;background:#065f46;color:white;border:none;padding:10px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">INICIAR</button>`;
      }
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── LOOP: EL SANTUARIO (GUARDABOSQUES) ───────────────────────
const _MYSTERY_POOL = ['eevee','porygon','lapras','snorlax','chansey','aerodactyl','kangaskhan','scyther'];

function markSanctuary() {
  const zoneId = state.lastWildLocId;
  if (!zoneId) { notify('Explorá una zona primero.','🌿'); return; }
  if (!state.professionData.sanctuary) state.professionData.sanctuary = {};
  const prev = state.professionData.sanctuary.zoneId;
  if (prev && prev !== zoneId && !confirm(`¿Cambiar tu Santuario de "${prev}" a "${zoneId}"? El vínculo anterior se perderá.`)) return;
  if (prev !== zoneId) state.professionData.sanctuary.bondLevel = 0;
  state.professionData.sanctuary.zoneId = zoneId;
  scheduleSave();
  notify(`¡Santuario marcado en ${zoneId}!`,'🌿');
  renderProfessionTab();
}

function checkSanctuaryVisitors() {
  const s = state.professionData.sanctuary;
  if (!s || !s.zoneId) return;
  const loc   = FIRE_RED_MAPS.find(z=>z.id===s.zoneId);
  const cycle = (typeof getDayCycle==='function') ? getDayCycle() : 'day';
  const pool  = loc ? (loc.wild[cycle]||loc.wild.day||[]) : ['rattata'];
  const visitors = [];
  const count = Math.floor(Math.random()*2)+2;
  for (let i=0; i<count; i++) {
    const id    = pool[Math.floor(Math.random()*pool.length)];
    const level = loc ? Math.floor(Math.random()*(loc.lv[1]-loc.lv[0]+1))+loc.lv[0] : 10;
    visitors.push({ id, level, isMystery:false });
  }
  const mystInterval = (s.bondLevel||0)>70 ? 24*3600000 : 48*3600000;
  if (Date.now()-(s.lastMysteryVisitor||0) >= mystInterval) {
    visitors.push({ id:null, level:30, isMystery:true });
    s.lastMysteryVisitor = Date.now();
  }
  s.pendingVisitors = visitors;
  s.lastVisitorCheck = Date.now();
  scheduleSave();
  renderProfessionTab();
}

function befriendVisitor(idx) {
  const s = state.professionData.sanctuary;
  const visitor = (s.pendingVisitors||[])[idx];
  if (!visitor) return;
  let pokId = visitor.isMystery ? _MYSTERY_POOL[Math.floor(Math.random()*_MYSTERY_POOL.length)] : visitor.id;
  let level = visitor.isMystery ? 30 : visitor.level;
  const friends = ['Bayas','Poción','Super Poción'];
  const used = friends.find(i=>(state.inventory[i]||0)>0);
  if (used) { state.inventory[used]--; if (state.inventory[used]<=0) delete state.inventory[used]; }
  else if ((state.money||0)>=100) { state.money -= 100; notify('Ofreciste ₽100.','💰'); }
  else { notify('No tenés ítems ni ₽100 para hacer amistad.','❌'); return; }

  const p = makePokemon(pokId, level);
  p.friendship = 255;
  if (state.team.length < 6) state.team.push(p);
  else { state.box.push(p); notify(`${p.name} enviado a la Caja.`,'📦'); }
  s.pendingVisitors.splice(idx,1);
  s.bondLevel = Math.min(100,(s.bondLevel||0)+10);
  addPassion(20);
  scheduleSave();
  notify(`¡${p.name} se unió con amistad máxima!`,'🌿');
  renderProfessionTab();
}

function ignoreVisitor(idx) {
  const s = state.professionData.sanctuary;
  (s.pendingVisitors||[]).splice(idx,1);
  s.bondLevel = Math.max(0,(s.bondLevel||0)-8);
  addPassion(-5);
  scheduleSave();
  renderProfessionTab();
}

function renderSanctuaryLoop(container) {
  if (!container) return;
  if (!state.professionData.sanctuary) state.professionData.sanctuary = {};
  const s = state.professionData.sanctuary;
  const VISIT_TIMER = 4 * 3600000;

  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(134,239,172,0.2);border-radius:12px;padding:14px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#86efac;margin-bottom:12px;">🌿 EL SANTUARIO</div>`;

  if (!s.zoneId) {
    html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Explorá una zona y márcala como tu base.<br>Los Pokémon vendrán a visitarte.</div>
      <button onclick="markSanctuary()" style="width:100%;background:rgba(134,239,172,0.15);color:#86efac;border:1px solid rgba(134,239,172,0.4);padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">🌿 MARCAR ZONA ACTUAL</button>`;
  } else {
    html += `<div style="margin-bottom:14px;">
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:6px;">📍 ${s.zoneId} · Vínculo: ${s.bondLevel||0}%</div>
      <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:8px;overflow:hidden;">
        <div style="width:${s.bondLevel||0}%;height:100%;background:#86efac;border-radius:6px;"></div>
      </div>
    </div>`;

    const visitors = s.pendingVisitors||[];
    if (visitors.length > 0) {
      html += `<div style="font-family:'Press Start 2P',monospace;font-size:8px;color:rgba(255,255,255,0.5);margin-bottom:10px;">VISITANTES:</div>`;
      visitors.forEach((v,i) => {
        const pData  = !v.isMystery ? POKEMON_DB[v.id] : null;
        const name   = v.isMystery ? '??? Misterioso 🌟' : (pData?pData.name:v.id);
        const sprite = v.isMystery ? '' : `<img src="https://img.pokemondb.net/sprites/black-white/anim/normal/${v.id}.gif" style="width:48px;height:48px;image-rendering:pixelated;" onerror="this.style.display='none'">`;
        html += `<div style="display:flex;align-items:center;gap:10px;background:rgba(134,239,172,0.05);border:1px solid rgba(134,239,172,0.15);border-radius:10px;padding:10px;margin-bottom:8px;">
          ${sprite || '<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:28px;">🌟</div>'}
          <div style="flex:1;">
            <div style="font-family:\'Nunito\',sans-serif;font-size:13px;color:white;">${name}</div>
            ${!v.isMystery?`<div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.5);">Nv. ${v.level}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button onclick="befriendVisitor(${i})" style="background:rgba(134,239,172,0.2);color:#86efac;border:1px solid rgba(134,239,172,0.4);padding:6px 10px;border-radius:6px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;">AMIGO</button>
            <button onclick="ignoreVisitor(${i})" style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);padding:6px 10px;border-radius:6px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;">IGNORAR</button>
          </div>
        </div>`;
      });
    }

    const lastCheck = s.lastVisitorCheck || 0;
    const nextCheck = lastCheck + VISIT_TIMER;
    if (Date.now() >= nextCheck) {
      html += `<button onclick="checkSanctuaryVisitors()" style="width:100%;background:rgba(134,239,172,0.15);color:#86efac;border:1px solid rgba(134,239,172,0.4);padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;${visitors.length>0?'margin-top:10px;':''}">🌿 VER VISITANTES</button>`;
    } else if (visitors.length === 0) {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.5);">Próximos visitantes en:<br>⏳ <span data-countdown-end="${nextCheck}" data-refresh-on-ready="true">${formatTimer(nextCheck-Date.now())}</span></div>`;
    }

    html += `<button onclick="markSanctuary()" style="width:100%;margin-top:12px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;">Cambiar zona de Santuario</button>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── LOOP: EL CIRCUITO (CAZADOR DE MEDALLAS) ──────────────────
const _CIRCUIT_CONDITIONS = [
  { type:'levelcap', getLabel: (gym) => `Solo Pokémon Nv. ≤ ${Math.floor((gym?.lv||20)*0.8)}`, getValue: (gym) => Math.floor((gym?.lv||20)*0.8) },
  { type:'noitems',  getLabel: ()    => 'Sin usar ítems en batalla',                            getValue: ()    => null },
  { type:'monotype', getLabel: ()    => { const t=['Fuego','Agua','Planta','Eléctrico','Psíquico','Normal'][Math.floor(Math.random()*6)]; return `Solo Pokémon tipo ${t}`; }, getValue: () => null }
];
const _CIRCUIT_REWARDS = ['Ultra Ball','Revivir','Elixir','Banda Focus','Restos','Cinta Elegida'];

function generateChallenge() {
  if (!state.defeatedGyms||state.defeatedGyms.length===0) { notify('Necesitás derrotar al menos 1 gimnasio primero.','🏆'); return; }
  const gymId = state.defeatedGyms[Math.floor(Math.random()*state.defeatedGyms.length)];
  const gym   = GYMS.find(g=>g.id===gymId);
  const cond  = _CIRCUIT_CONDITIONS[Math.floor(Math.random()*_CIRCUIT_CONDITIONS.length)];
  const streak = state.professionData.circuit?.acceptStreak || 0;
  const coins  = 80 + streak*20;
  const item   = _CIRCUIT_REWARDS[Math.min(streak, _CIRCUIT_REWARDS.length-1)];
  if (!state.professionData.circuit) state.professionData.circuit = {};
  state.professionData.circuit.lastChallengeAt = Date.now();
  state.professionData.circuit.currentChallenge = {
    gymId, gymName: gym?.leader||gymId,
    condLabel: cond.getLabel(gym), condType: cond.type, condValue: cond.getValue(gym),
    reward: { coins, item },
    expiresAt: Date.now() + 6*3600000
  };
  scheduleSave();
  notify('¡Nuevo desafío del Circuito!','🏆');
  renderProfessionTab();
}

function acceptChallenge() {
  const c = state.professionData.circuit;
  if (!c?.currentChallenge) return;
  c.activeRestriction = { gymId: c.currentChallenge.gymId, condType: c.currentChallenge.condType, condValue: c.currentChallenge.condValue, reward: c.currentChallenge.reward };
  c.currentChallenge = null;
  scheduleSave();
  notify(`¡Desafío aceptado! Entrá al gimnasio de ${c.activeRestriction.gymId}.`,'🏆');
  renderProfessionTab();
}

function declineChallenge() {
  if (!confirm('¿Seguro? Declinar rompe tu racha.')) return;
  const c = state.professionData.circuit;
  c.acceptStreak    = 0;
  c.currentChallenge = null;
  resetPassion();
  scheduleSave();
  notify('Racha rota. La Gloria requiere compromiso.','😔');
  renderProfessionTab();
}

function claimCircuitReward(reward) {
  state.battleCoins = (state.battleCoins||0) + reward.coins;
  if (reward.item) { state.inventory[reward.item] = (state.inventory[reward.item]||0)+1; }
  notify(`¡Recompensa del Circuito: 🪙${reward.coins} BC${reward.item?' + '+reward.item:''}!`,'🏆');
  scheduleSave();
  updateHud();
}

function renderCircuitLoop(container) {
  if (!container) return;
  if (!state.professionData.circuit) state.professionData.circuit = {};
  const c = state.professionData.circuit;
  const streak   = c.acceptStreak || 0;
  const CHALLENGE_COOLDOWN = 3 * 3600000;

  let html = `<div style="background:rgba(0,0,0,0.3);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:#fbbf24;">🏆 EL CIRCUITO</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:#fbbf24;">${'🔥'.repeat(Math.min(streak,5))} Racha: ${streak}</div>
    </div>`;

  // Verificar si el desafío actual expiró
  if (c.currentChallenge && Date.now() > c.currentChallenge.expiresAt) {
    c.currentChallenge = null; scheduleSave();
  }

  if (c.activeRestriction) {
    html += `<div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:12px;margin-bottom:10px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fbbf24;margin-bottom:6px;">⚔️ DESAFÍO ACTIVO</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:white;">Gimnasio: <strong>${c.activeRestriction.gymId}</strong></div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);">Condición: ${c.activeRestriction.condLabel||'Sin restricción'}</div>
    </div>`;
  } else if (c.currentChallenge) {
    const ch = c.currentChallenge;
    html += `<div style="background:rgba(251,191,36,0.05);border:2px solid rgba(251,191,36,0.4);border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fbbf24;margin-bottom:8px;">DESAFÍO ENTRANTE</div>
      <div style="font-family:'Nunito',sans-serif;font-size:13px;color:white;margin-bottom:4px;">🏛️ ${ch.gymName}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:4px;">📋 ${ch.condLabel}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:#fbbf24;margin-bottom:12px;">🎁 ${ch.reward.coins} BC + ${ch.reward.item}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;">Expira en: <span data-countdown-end="${ch.expiresAt}">${formatTimer(ch.expiresAt-Date.now())}</span></div>
      <div style="display:flex;gap:8px;">
        <button onclick="acceptChallenge()" style="flex:1;background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid #fbbf24;padding:10px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">ACEPTAR</button>
        <button onclick="declineChallenge()" style="background:rgba(239,68,68,0.1);color:rgba(239,68,68,0.7);border:1px solid rgba(239,68,68,0.3);padding:10px 14px;border-radius:8px;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;">DECLINAR</button>
      </div>
    </div>`;
  } else {
    const lastAt = c.lastChallengeAt || 0;
    const nextAt = lastAt + CHALLENGE_COOLDOWN;
    if (Date.now() >= nextAt) {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:12px;">Los líderes esperan tu llamado.</div>
        <button onclick="generateChallenge()" style="width:100%;background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">📬 VER CORREO DE DESAFÍOS</button>`;
    } else {
      html += `<div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.5);">Próximo desafío en:<br>⏳ <span data-countdown-end="${nextAt}" data-refresh-on-ready="true">${formatTimer(nextAt-Date.now())}</span></div>`;
    }
  }

  // Liga Élite (nivel 10)
  if (hasPerk('elite_circuit')) {
    html += `<div style="margin-top:14px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:12px;">
      <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fbbf24;margin-bottom:8px;">👑 LIGA ÉLITE</div>
      <div style="font-family:'Nunito',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:10px;">Versiones potenciadas de los 8 líderes (Nv. 60-80). Recompensas únicas.</div>
      ${(GYMS||[]).map(gym => `
        <button onclick="_startEliteGym('${gym.id}')" style="width:100%;margin-bottom:6px;background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2);padding:8px;border-radius:8px;font-family:'Nunito',sans-serif;font-size:12px;cursor:pointer;">
          ⚔️ ${gym.leader} (Nv. 70)
        </button>`).join('')}
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function _startEliteGym(gymId) {
  const gym = GYMS.find(g=>g.id===gymId);
  if (!gym) return;
  const eliteTeam = (gym.team||[{id:gym.ace||'rhydon',level:50}]).map(p => {
    const enemy = makePokemon(p.id, 70);
    return enemy;
  });
  const boss = eliteTeam[eliteTeam.length-1] || makePokemon(gym.ace||'rhydon', 70);
  startBattle(boss, true, gymId, null, false, eliteTeam, gym.leader + ' (Élite)');
}

// ── PERK NIVEL 10: PROYECTO MEWTWO (CIENTÍFICO) ──────────────
function renderMewtwoProject(container) {
  if (!state.professionData.mewtwoProject) {
    state.professionData.mewtwoProject = { stage:0, hasDitto:false, breeds:0, optimizations:0, completed:false };
  }
  const mp = state.professionData.mewtwoProject;

  // Verificar progreso automáticamente
  if (!mp.hasDitto) {
    const allPok = [...(state.team||[]),...(state.box||[])];
    if (allPok.find(p=>p.id==='ditto')) { mp.hasDitto=true; scheduleSave(); }
  }
  const currentStage = mp.completed ? 3 : mp.optimizations>=5 ? 2 : mp.breeds>=3 ? 2 : mp.hasDitto ? 1 : 0;

  const stages = [
    { label:'Conseguir un Ditto',            done: mp.hasDitto,         hint:'Capturá un Ditto en Cueva Celeste.' },
    { label:'Criar 3 veces en la Guardería', done: mp.breeds>=3,        hint:`Crías completadas: ${mp.breeds}/3` },
    { label:'Completar 5 Optimizaciones',    done: mp.optimizations>=5, hint:`Optimizaciones: ${mp.optimizations}/5` }
  ];

  let html = `<div style="background:rgba(52,211,153,0.05);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:12px;margin-top:12px;">
    <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#34d399;margin-bottom:10px;">🧬 PROYECTO MEWTWO</div>
    ${stages.map((s,i)=>`
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;opacity:${s.done?1:0.6};">
        <span style="font-size:16px;">${s.done?'✅':'⬜'}</span>
        <div>
          <div style="font-family:'Nunito',sans-serif;font-size:12px;color:${s.done?'white':'rgba(255,255,255,0.6)'};">${s.label}</div>
          ${!s.done?`<div style="font-family:'Nunito',sans-serif;font-size:11px;color:rgba(255,255,255,0.4);">${s.hint}</div>`:''}
        </div>
      </div>`).join('')}`;

  if (stages.every(s=>s.done) && !mp.completed) {
    html += `<button onclick="_claimMewtwo()" style="width:100%;background:#065f46;color:#34d399;border:2px solid #34d399;padding:12px;border-radius:10px;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;animation:pulseGlow 2s infinite;margin-top:8px;">⚡ RECLAMAR MEWTWO</button>`;
  } else if (mp.completed) {
    html += `<div style="text-align:center;color:#34d399;font-family:'Nunito',sans-serif;font-size:12px;margin-top:8px;">✅ ¡Proyecto completado!</div>`;
  }
  html += '</div>';
  if (container) container.insertAdjacentHTML('beforeend', html);
}

function _claimMewtwo() {
  const mp = state.professionData.mewtwoProject;
  if (!mp||mp.completed) return;
  const mewtwo = makePokemon('mewtwo', 70);
  // Garantizar 4 IVs perfectos
  const stats = ['hp','atk','def','spa','spd','spe'];
  const perfect = [...stats].sort(()=>Math.random()-0.5).slice(0,4);
  perfect.forEach(s => mewtwo.ivs[s] = 31);
  recalcPokemonStats(mewtwo);
  if (state.team.length<6) state.team.push(mewtwo); else state.box.push(mewtwo);
  mp.completed = true;
  scheduleSave();
  notify('¡MEWTWO se unió a tu equipo con 4 IVs perfectos!','🧬');
  renderProfessionTab();
}

// ── PERK NIVEL 10: SPAWN DE MEW (GUARDABOSQUES) ─────────────
// Esta función es llamada desde goLocation() en 06_encounters.js
function checkMewSpawn(locId) {
  if (!hasPerk('guardian_mew')) return false;
  const s = state.professionData.sanctuary;
  if (!s || s.zoneId !== locId) return false;
  const lastMew = s.lastMewEncounter || 0;
  if (Date.now() - lastMew < 7*24*3600000) return false; // 1 vez por semana
  if (Math.random() < (1/500)) {
    s.lastMewEncounter = Date.now();
    scheduleSave();
    const mew = makePokemon('mew', 40+Math.floor(Math.random()*11));
    startBattle(mew, false, null, locId);
    notify('¡MEW apareció en tu Santuario!','🌿');
    return true;
  }
  return false;
}
