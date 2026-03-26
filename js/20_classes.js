// ===== SISTEMA DE CLASES =====
// Motor principal: definiciones, modificadores, selección y progresión.

const PLAYER_CLASSES = {
  rocket: {
    id: 'rocket',
    name: 'Equipo Rocket',
    icon: '🚀',
    color: '#ef4444',
    colorDark: '#991b1b',
    description: 'Vive en las sombras. Vende, roba y contrabandea para amasar fortuna. Alto riesgo, alta recompensa.',
    bonuses: [
      '💰 Mercado Negro: vendé Pokémon de la caja directo por ₽',
      '🎯 Robo Rápido: 15-30% de chance de robar un ítem al iniciar batalla vs entrenador',
      '🏪 20% de descuento en el Mercado Negro exclusivo',
      '📦 Contrabando Pasivo: misiones idle de 2/4/8h con ₽ y objetos raros'
    ],
    penalties: [
      '🏥 Centro Pokémon cuesta el doble (2x)',
      '🪙 -10% Battle Coins en todas las batallas',
      '🚫 Sin acceso a torneos y tiendas oficiales'
    ],
    modifiers: {
      expMult: 1.0,
      bcMult: 0.90,
      healCostMult: 2.0,
      daycareCostMult: 1.0,
      catchMult: 1.0
    }
  },
  cazabichos: {
    id: 'cazabichos',
    name: 'Cazabichos',
    icon: '🦗',
    color: '#22c55e',
    colorDark: '#15803d',
    description: 'Maestro del campo. Acumula rachas de capturas para aumentar las chances de Shiny e IVs altos. Vive en la naturaleza.',
    bonuses: [
      '⚡ Racha de Capturas: cada captura seguida aumenta Shiny rate e IVs mínimos (máx x3)',
      '🦋 Sinergia Bicho: +5% catchRate por Pokémon Bicho en el equipo (máx +20%)',
      '🗺️ Zonas Privilegiadas: más encuentros y Pokémon raros en zonas exclusivas',
      '🏕️ Expediciones: misiones idle de 1/3/6h que traen Pokémon y objetos de captura'
    ],
    penalties: [
      '⚔️ -20% EXP en batallas contra entrenadores NPC',
      '🪙 -15% Battle Coins en todas las batallas',
      '🏠 Guardería cuesta 1.5x más'
    ],
    modifiers: {
      expMult: 1.0,
      expMultTrainer: 0.80,
      bcMult: 0.85,
      healCostMult: 1.0,
      daycareCostMult: 1.5,
      catchMult: 1.0
    }
  },
  entrenador: {
    id: 'entrenador',
    name: 'Entrenador',
    icon: '🏅',
    color: '#3b82f6',
    colorDark: '#1d4ed8',
    description: 'El camino legítimo. Sube de nivel más rápido, domina los gimnasios y acumula Reputación que desbloquea tiendas exclusivas.',
    bonuses: [
      '📈 +10% EXP en todos los combates',
      '🏆 +30% Battle Coins en victorias de Gimnasio + ítem bonus',
      '💊 Entrenamiento de EVs en el Centro a mitad de precio',
      '⭐ Sistema de Reputación: desbloquea tienda exclusiva al acumular victorias en gym',
      '🏋️ Entrenamiento de Gimnasio Pasivo: misiones idle de 2/4/8h con EXP y EVs'
    ],
    penalties: [
      '🎯 -10% catchRate en Pokémon con IV total > 120',
      '🏠 Guardería cuesta 1.5x más',
      '🚫 Sin acceso al Mercado Negro'
    ],
    modifiers: {
      expMult: 1.10,
      bcMult: 1.0,
      bcGymMult: 1.30,
      healCostMult: 1.0,
      daycareCostMult: 1.5,
      catchMult: 1.0
    }
  },
  criador: {
    id: 'criador',
    name: 'Criador Pokémon',
    icon: '🧬',
    color: '#a855f7',
    colorDark: '#7e22ce',
    description: 'Maestro genético. Produce los Pokémon con mejores IVs y habilidades del servidor. Domina el meta competitivo desde la guardería.',
    bonuses: [
      '🧬 Lazo Destino transmite 4 IVs (vs 3 normal)',
      '✨ Habilidad Oculta: 75% de probabilidad (vs 60%)',
      '⏱️ -25% tiempo de eclosión de huevos',
      '💯 Everstone garantiza naturaleza al 100%',
      '🔬 Análisis Genético: ver IVs exactos desde la caja',
      '🏪 Mercado de Crías: venta automática de Pokémon criados',
      '🥚 Incubación Asistida: misiones idle de 4/8/12h que mejoran IVs y HA'
    ],
    penalties: [
      '📉 -10% EXP en todos los combates',
      '🏥 Centro Pokémon cuesta 1.5x para Pokémon no criados por vos',
      '🚫 Sin acceso al Mercado Negro'
    ],
    modifiers: {
      expMult: 0.90,
      bcMult: 1.0,
      healCostMult: 1.0,
      healCostForeignMult: 1.5,
      daycareCostMult: 1.0,
      catchMult: 1.0
    }
  }
};

// ── Obtener modificador de la clase activa ─────────────────────────────────
function getClassModifier(type, context = {}) {
  if (!state.playerClass) return 1.0;
  const cls = PLAYER_CLASSES[state.playerClass];
  if (!cls) return 1.0;
  const m = cls.modifiers;

  switch (type) {
    case 'expMult':
      if (state.playerClass === 'cazabichos' && context.isTrainer) return m.expMultTrainer || 1.0;
      return m.expMult || 1.0;
    case 'bcMult':
      if (state.playerClass === 'entrenador' && context.isGym) return m.bcGymMult || 1.0;
      return m.bcMult || 1.0;
    case 'healCostMult':
      if (state.playerClass === 'criador' && context.isForeign) return m.healCostForeignMult || 1.0;
      return m.healCostMult || 1.0;
    case 'daycareCostMult':
      return m.daycareCostMult || 1.0;
    case 'catchMult':
      return m.catchMult || 1.0;
    default:
      return 1.0;
  }
}

// ── Añadir XP de clase ────────────────────────────────────────────────────
function addClassXP(amount) {
  if (!state.playerClass) return;
  state.classXP = (state.classXP || 0) + amount;
  const xpPerLevel = 500;
  const maxLevel = 10;
  while (state.classXP >= xpPerLevel && (state.classLevel || 1) < maxLevel) {
    state.classXP -= xpPerLevel;
    state.classLevel = (state.classLevel || 1) + 1;
    const cls = PLAYER_CLASSES[state.playerClass];
    notify(`¡Subiste al nivel ${state.classLevel} de ${cls.name}! ${cls.icon}`, '🎖️');
  }
  updateClassHud();
}

// ── Seleccionar clase ──────────────────────────────────────────────────────
function selectClass(classId) {
  const cls = PLAYER_CLASSES[classId];
  if (!cls) return;

  const alreadyHasClass = !!state.playerClass;
  if (alreadyHasClass) {
    const cost = 500;
    if ((state.battleCoins || 0) < cost) {
      notify(`Necesitás ${cost} Battle Coins para cambiar de clase.`, '🔒');
      return;
    }
    state.battleCoins -= cost;
    notify(`Cambiaste a ${cls.name}. Costó ${cost} Battle Coins.`, cls.icon);
  } else {
    notify(`¡Elegiste ser ${cls.name}! ${cls.description.split('.')[0]}.`, cls.icon);
  }

  state.playerClass = classId;
  state.classLevel = 1;
  state.classXP = 0;
  state.classData = state.classData || {};
  state.classData.captureStreak = 0;
  state.classData.longestStreak = 0;
  state.classData.reputationPoints = state.classData.reputationPoints || 0;
  state.classData.blackMarketSales = state.classData.blackMarketSales || 0;

  closeClassModal();
  updateClassHud();
  if (typeof saveGame === 'function') saveGame(false);
}

// ── Modal de selección de clase ────────────────────────────────────────────
function openClassModal(forced = false) {
  const existing = document.getElementById('class-selection-modal');
  if (existing) existing.remove();

  const canClose = !forced;
  const isChange = !!state.playerClass;

  const modal = document.createElement('div');
  modal.id = 'class-selection-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.92);
    display:flex;align-items:center;justify-content:center;padding:16px;
    animation:fadeIn 0.3s ease;overflow-y:auto;
  `;

  const cardsHtml = Object.values(PLAYER_CLASSES).map(cls => {
    const isActive = state.playerClass === cls.id;
    const borderColor = isActive ? cls.color : 'rgba(255,255,255,0.08)';
    const glowColor = isActive ? cls.color + '55' : 'transparent';
    const bonusesHtml = cls.bonuses.map(b => `<li style="margin-bottom:4px;font-size:11px;color:#d1d5db;">${b}</li>`).join('');
    const penaltiesHtml = cls.penalties.map(p => `<li style="margin-bottom:4px;font-size:11px;color:#f87171;">${p}</li>`).join('');

    return `
      <div style="background:#1e293b;border-radius:20px;border:2px solid ${borderColor};
        padding:20px;cursor:pointer;transition:all 0.2s;box-shadow:0 0 20px ${glowColor};
        position:relative;${isActive ? 'order:-1;' : ''}"
        onclick="selectClass('${cls.id}')"
        onmouseover="this.style.borderColor='${cls.color}';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='${borderColor}';this.style.transform='translateY(0)'">
        ${isActive ? `<div style="position:absolute;top:12px;right:12px;background:${cls.color};color:#fff;font-size:9px;padding:3px 8px;border-radius:8px;font-family:'Press Start 2P',monospace;">ACTIVA</div>` : ''}
        <div style="font-size:36px;margin-bottom:8px;text-align:center;">${cls.icon}</div>
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${cls.color};text-align:center;margin-bottom:8px;">${cls.name}</div>
        <div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:16px;line-height:1.5;">${cls.description}</div>
        <div style="margin-bottom:10px;">
          <div style="font-size:10px;color:#22c55e;font-weight:bold;margin-bottom:4px;">✅ VENTAJAS</div>
          <ul style="margin:0;padding-left:16px;">${bonusesHtml}</ul>
        </div>
        <div>
          <div style="font-size:10px;color:#ef4444;font-weight:bold;margin-bottom:4px;">❌ PENALIZACIONES</div>
          <ul style="margin:0;padding-left:16px;">${penaltiesHtml}</ul>
        </div>
        <button style="width:100%;margin-top:16px;padding:12px;border:none;border-radius:12px;
          background:linear-gradient(135deg,${cls.color},${cls.colorDark});color:#fff;
          font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
          ${isActive ? '✓ CLASE ACTUAL' : (isChange ? '🔄 CAMBIAR (500 BC)' : '▶ ELEGIR')}
        </button>
      </div>`;
  }).join('');

  modal.innerHTML = `
    <div style="width:100%;max-width:960px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:#f59e0b;margin-bottom:8px;">
          🎭 ELEGÍ TU CLASE
        </div>
        <div style="font-size:13px;color:#9ca3af;">
          ${isChange ? 'Cambiar de clase cuesta <strong style="color:#f59e0b;">500 Battle Coins</strong> y reinicia tu progreso de clase.' : 'Esta elección define cómo jugás. Podés cambiar más adelante por 500 Battle Coins.'}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px;">
        ${cardsHtml}
      </div>
      ${canClose && state.playerClass ? `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;">
        <button onclick="closeClassModal();openClassMissionsPanel()" style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);color:#fbbf24;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:11px;font-weight:700;">
          📋 Misiones de Clase
        </button>
        ${state.playerClass === 'entrenador' ? `<button onclick="closeClassModal();openReputationShop()" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:11px;font-weight:700;">
          🏅 Tienda de Reputación (${state.classData?.reputation || 0} ⭐)
        </button>` : ''}
      </div>` : ''}
      ${canClose ? `<div style="text-align:center;">
        <button onclick="closeClassModal()" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:12px;">
          Cerrar
        </button>
      </div>` : ''}
    </div>`;

  document.body.appendChild(modal);
}

function closeClassModal() {
  const m = document.getElementById('class-selection-modal');
  if (m) m.remove();
}

// ── HUD badge de clase ─────────────────────────────────────────────────────
function updateClassHud() {
  let badge = document.getElementById('class-hud-badge');
  if (!state.playerClass) {
    if (badge) badge.remove();
    return;
  }
  const cls = PLAYER_CLASSES[state.playerClass];
  const lvl = state.classLevel || 1;
  const xp = state.classXP || 0;
  const xpNeeded = 500;
  const pct = Math.min(100, Math.floor((xp / xpNeeded) * 100));

  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'class-hud-badge';
    badge.style.cssText = `
      position:fixed;bottom:72px;right:12px;z-index:500;
      background:#1e293b;border:1px solid ${cls.color}44;border-radius:14px;
      padding:8px 12px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.4);
      min-width:120px;transition:all 0.2s;
    `;
    badge.onclick = () => openClassModal(false);
    const hudRoot = document.getElementById('app') || document.body;
    hudRoot.appendChild(badge);
  }

  badge.style.borderColor = cls.color + '66';
  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span style="font-size:14px;">${cls.icon}</span>
      <span style="font-family:'Press Start 2P',monospace;font-size:7px;color:${cls.color};">${cls.name}</span>
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-bottom:4px;">Nv. ${lvl} · ${xp}/${xpNeeded} XP</div>
    <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:4px;overflow:hidden;">
      <div style="background:${cls.color};width:${pct}%;height:100%;border-radius:4px;transition:width 0.5s;"></div>
    </div>`;
}

// ── Verificar si mostrar el modal al subir de nivel ────────────────────────
function checkClassUnlock() {
  if (!state.playerClass && (state.trainerLevel || 1) >= 5) {
    setTimeout(() => openClassModal(true), 800);
  }
}

// ── Racha de capturas (Cazabichos) ────────────────────────────────────────
function onCaptureSuccess() {
  if (state.playerClass !== 'cazabichos') return;
  state.classData = state.classData || {};
  state.classData.captureStreak = (state.classData.captureStreak || 0) + 1;
  if (state.classData.captureStreak > (state.classData.longestStreak || 0)) {
    state.classData.longestStreak = state.classData.captureStreak;
  }
  const streak = state.classData.captureStreak;
  const mult = Math.min(1.0 + 0.15 * streak, 3.0).toFixed(2);
  if (streak % 5 === 0) {
    notify(`¡Racha x${streak}! Shiny x${mult} — ¡Seguí!`, '⚡');
  }
  addClassXP(10);
  updateClassHud();
}

function onCaptureFail() {
  if (state.playerClass !== 'cazabichos') return;
  state.classData = state.classData || {};
  if ((state.classData.captureStreak || 0) > 0) {
    notify(`Racha perdida (era x${state.classData.captureStreak})`, '💔');
    state.classData.captureStreak = 0;
    updateClassHud();
  }
}

// ── Calcular shinyRate activa con modificador de racha ────────────────────
function getActiveShinyRate() {
  let baseRate = (state.shinyBoostSecs || 0) > 0
    ? Math.floor(GAME_RATIOS.shinyRate / 2)
    : GAME_RATIOS.shinyRate;

  if (state.playerClass === 'cazabichos') {
    const streak = (state.classData && state.classData.captureStreak) || 0;
    if (streak > 0) {
      const mult = Math.min(1.0 + 0.15 * streak, 3.0);
      baseRate = Math.floor(baseRate / mult);
    }
  }
  return baseRate;
}

// ── IVs mínimos por racha (Cazabichos) ───────────────────────────────────
function getStreakIvFloor() {
  if (state.playerClass !== 'cazabichos') return 0;
  const streak = (state.classData && state.classData.captureStreak) || 0;
  return Math.min(20, Math.floor(streak * 2));
}

// ── Robo Rápido (Equipo Rocket) ───────────────────────────────────────────
function tryRocketSteal() {
  if (state.playerClass !== 'rocket') return;
  const classLevel = state.classLevel || 1;
  const prob = Math.min(0.15 + (classLevel * 0.01), 0.30);
  if (Math.random() > prob) return;

  const lootTable = [
    'Poción', 'Super Poción', 'Antídoto', 'Pokéball', 'Super Ball',
    'Revivir', 'Éter', 'Elixir', 'Vendaje Cura', 'Hiper Poción'
  ];
  const item = lootTable[Math.floor(Math.random() * lootTable.length)];
  state.inventory = state.inventory || {};
  state.inventory[item] = (state.inventory[item] || 0) + 1;
  addClassXP(15);

  setTimeout(() => {
    notify(`¡Robo Rápido exitoso! Robaste: ${item} 🚀`, '🎯');
  }, 500);
}

// ── Reputación del Entrenador ─────────────────────────────────────────────
function addReputationPoints(points) {
  if (state.playerClass !== 'entrenador') return;
  state.classData = state.classData || {};
  const prev = state.classData.reputationPoints || 0;
  state.classData.reputationPoints = prev + points;
  const newVal = state.classData.reputationPoints;

  const milestones = [50, 100, 200];
  milestones.forEach(m => {
    if (prev < m && newVal >= m) {
      notify(`¡Reputación desbloqueada! Nivel ${m} pts — Nueva tienda disponible ⭐`, '🏆');
    }
  });
  addClassXP(20);
  updateClassHud();
}

// ── Análisis Genético (Criador) ───────────────────────────────────────────
function showGeneticAnalysis(pokemon) {
  if (state.playerClass !== 'criador') {
    notify('Solo los Criadores pueden usar el Análisis Genético.', '🔒');
    return;
  }
  if (!pokemon) return;

  const ivs = pokemon.ivs || {};
  const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0);
  const maxIv = 186;
  const pct = Math.floor((totalIv / maxIv) * 100);
  const isHA = (pokemon.ability || '').includes('(HA)') ||
    (ABILITIES[pokemon.id] && ABILITIES[pokemon.id].length > 1 &&
     pokemon.ability === ABILITIES[pokemon.id][ABILITIES[pokemon.id].length - 1]);

  const stars = pct >= 90 ? '⭐⭐⭐' : pct >= 70 ? '⭐⭐' : pct >= 50 ? '⭐' : '';

  const rows = [
    ['HP', ivs.hp], ['ATK', ivs.atk], ['DEF', ivs.def],
    ['SPA', ivs.spa], ['SPD', ivs.spd], ['SPE', ivs.spe]
  ].map(([stat, val]) => {
    const v = val ?? '?';
    const color = v >= 28 ? '#22c55e' : v >= 20 ? '#f59e0b' : v >= 10 ? '#9ca3af' : '#ef4444';
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="color:#9ca3af;font-size:11px;">${stat}</span>
      <span style="color:${color};font-weight:bold;font-size:11px;">${v}/31</span>
    </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.id = 'genetic-analysis-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#1e293b;border-radius:20px;padding:24px;max-width:320px;width:100%;border:2px solid #a855f788;">
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#a855f7;text-align:center;margin-bottom:16px;">
        🔬 ANÁLISIS GENÉTICO
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:14px;font-weight:bold;color:#e2e8f0;">${pokemon.name || pokemon.id} ${stars}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
          Naturaleza: <strong style="color:#f59e0b;">${pokemon.nature || '?'}</strong> ·
          Habilidad: <strong style="color:${isHA ? '#a855f7' : '#9ca3af'};">${pokemon.ability || '?'}${isHA ? ' (HA)' : ''}</strong>
        </div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
          IV Total: <strong style="color:#22c55e;">${totalIv}/${maxIv} (${pct}%)</strong>
        </div>
      </div>
      <div style="margin-bottom:16px;">${rows}</div>
      <button onclick="document.getElementById('genetic-analysis-modal').remove()"
        style="width:100%;padding:10px;border:none;border-radius:10px;background:#a855f7;color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
        CERRAR
      </button>
    </div>`;
  document.body.appendChild(ov);
}

// ── Mercado Negro del Rocket ──────────────────────────────────────────────
function sellPokemonBlackMarket(pokemon, boxIndex) {
  if (state.playerClass !== 'rocket') {
    notify('Solo el Equipo Rocket tiene acceso al Mercado Negro.', '🔒');
    return;
  }
  if (!pokemon) return;

  const ivs = pokemon.ivs || {};
  const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0);
  const price = Math.floor(pokemon.level * 50 + (totalIv / 186) * 500);

  const ov = document.createElement('div');
  ov.id = 'black-market-sell-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#1e293b;border-radius:20px;padding:24px;max-width:300px;width:100%;border:2px solid #ef444488;">
      <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;text-align:center;margin-bottom:16px;">
        🚀 MERCADO NEGRO
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:13px;color:#e2e8f0;margin-bottom:8px;">
          Vender <strong>${pokemon.name || pokemon.id}</strong>
        </div>
        <div style="font-size:20px;color:#22c55e;font-weight:bold;">₽${price.toLocaleString()}</div>
        <div style="font-size:10px;color:#9ca3af;margin-top:4px;">
          Nv.${pokemon.level} · IV Total: ${totalIv}/186
        </div>
        <div style="font-size:10px;color:#f87171;margin-top:8px;">⚠️ Esta acción es irreversible.</div>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="confirmBlackMarketSell(${boxIndex}, ${price})"
          style="flex:1;padding:12px;border:none;border-radius:10px;background:#ef4444;color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;">
          VENDER
        </button>
        <button onclick="document.getElementById('black-market-sell-modal').remove()"
          style="flex:1;padding:12px;border:none;border-radius:10px;background:rgba(255,255,255,0.08);color:#9ca3af;font-size:12px;cursor:pointer;">
          Cancelar
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

function confirmBlackMarketSell(boxIndex, price) {
  document.getElementById('black-market-sell-modal')?.remove();
  if (boxIndex < 0 || boxIndex >= (state.box || []).length) return;

  state.box.splice(boxIndex, 1);
  state.money = (state.money || 0) + price;
  state.classData = state.classData || {};
  state.classData.blackMarketSales = (state.classData.blackMarketSales || 0) + 1;

  addClassXP(25);
  notify(`¡Pokémon vendido por ₽${price.toLocaleString()}! 💰`, '🚀');
  if (typeof renderBox === 'function') renderBox();
  if (typeof updateHud === 'function') updateHud();
  if (typeof saveGame === 'function') saveGame(false);
}

// ── Sistema de Misiones Idle por Clase ────────────────────────────────────
const CLASS_MISSIONS = {
  rocket: [
    { id: 'contrabando_basico', name: 'Contrabando Básico', desc: 'Vende artículos robados en el mercado negro.', icon: '💼', durationMs: 30 * 60 * 1000, rewardMoney: 1200, rewardXP: 40, classOnly: 'rocket' },
    { id: 'robo_laboratorio', name: 'Robo de Laboratorio', desc: 'Infiltra el Laboratorio Oak y roba recursos.', icon: '🧪', durationMs: 60 * 60 * 1000, rewardMoney: 3500, rewardXP: 90, classOnly: 'rocket' },
    { id: 'extorsion', name: 'Extorsión', desc: 'Amenaza a un criador local para obtener fondos.', icon: '🃏', durationMs: 45 * 60 * 1000, rewardMoney: 2000, rewardXP: 60, classOnly: 'rocket' },
  ],
  cazabichos: [
    { id: 'expedicion_captura', name: 'Expedición de Captura', desc: 'Explora el Bosque Verde en busca de Pokémon insecto.', icon: '🌲', durationMs: 45 * 60 * 1000, rewardMoney: 600, rewardXP: 55, rewardItem: 'Poké Ball', rewardItemQty: 3, classOnly: 'cazabichos' },
    { id: 'torneo_bicho', name: 'Torneo de Insectos', desc: 'Participa en el concurso de bichos de Azulona.', icon: '🏆', durationMs: 90 * 60 * 1000, rewardMoney: 1500, rewardXP: 120, classOnly: 'cazabichos' },
    { id: 'investigacion_habitat', name: 'Investigación de Hábitat', desc: 'Documenta Pokémon raros en zonas remotas.', icon: '🔍', durationMs: 60 * 60 * 1000, rewardMoney: 800, rewardXP: 75, classOnly: 'cazabichos' },
  ],
  entrenador: [
    { id: 'entrenamiento_gym', name: 'Sesión de Gimnasio', desc: 'Practica con el equipo de un gimnasio local.', icon: '🥊', durationMs: 30 * 60 * 1000, rewardMoney: 400, rewardXP: 80, rewardReputation: 5, classOnly: 'entrenador' },
    { id: 'torneo_local', name: 'Torneo Local', desc: 'Compite en un torneo organizado en Pueblo Paleta.', icon: '🎖️', durationMs: 90 * 60 * 1000, rewardMoney: 2200, rewardXP: 150, rewardReputation: 15, classOnly: 'entrenador' },
    { id: 'mentoria', name: 'Mentoría', desc: 'Entrena a un aprendiz y aumenta tu fama.', icon: '📚', durationMs: 60 * 60 * 1000, rewardMoney: 700, rewardXP: 90, rewardReputation: 10, classOnly: 'entrenador' },
  ],
  criador: [
    { id: 'incubacion_asistida', name: 'Incubación Asistida', desc: 'Ayuda a empollar huevos de criadores novatos.', icon: '🥚', durationMs: 60 * 60 * 1000, rewardMoney: 900, rewardXP: 70, classOnly: 'criador' },
    { id: 'concurso_belleza', name: 'Concurso de Belleza', desc: 'Presenta tu Pokémon mejor criado en un concurso.', icon: '✨', durationMs: 45 * 60 * 1000, rewardMoney: 1100, rewardXP: 85, classOnly: 'criador' },
    { id: 'analisis_genetico_prof', name: 'Análisis Genético Profundo', desc: 'Estudia combinaciones de IVs para clientes.', icon: '🔬', durationMs: 90 * 60 * 1000, rewardMoney: 2800, rewardXP: 130, classOnly: 'criador' },
  ],
};

const MAX_ACTIVE_CLASS_MISSIONS = 2;

function getAvailableClassMissions() {
  const cls = state.playerClass;
  if (!cls) return [];
  const active = (state.classData?.activeMissions || []).map(m => m.id);
  return (CLASS_MISSIONS[cls] || []).filter(m => !active.includes(m.id));
}

function startClassMission(missionId) {
  const cls = state.playerClass;
  if (!cls) return notify('Debes elegir una clase primero.', '⚠️');
  const mission = (CLASS_MISSIONS[cls] || []).find(m => m.id === missionId);
  if (!mission) return;
  state.classData = state.classData || {};
  state.classData.activeMissions = state.classData.activeMissions || [];
  if (state.classData.activeMissions.length >= MAX_ACTIVE_CLASS_MISSIONS)
    return notify('Ya tienes el máximo de misiones activas.', '⚠️');
  if (state.classData.activeMissions.find(m => m.id === missionId))
    return notify('Esa misión ya está en curso.', '⚠️');
  state.classData.activeMissions.push({ id: missionId, startedAt: Date.now(), endsAt: Date.now() + mission.durationMs });
  if (typeof scheduleSave === 'function') scheduleSave();
  notify(`Misión iniciada: ${mission.name}`, mission.icon);
  openClassMissionsPanel();
}

function collectClassMission(missionId) {
  const cls = state.playerClass;
  if (!cls) return;
  const idx = (state.classData?.activeMissions || []).findIndex(m => m.id === missionId);
  if (idx < 0) return;
  const active = state.classData.activeMissions[idx];
  if (Date.now() < active.endsAt) return notify('La misión aún no ha terminado.', '⏳');
  const mission = (CLASS_MISSIONS[cls] || []).find(m => m.id === missionId);
  if (!mission) return;

  state.classData.activeMissions.splice(idx, 1);
  state.money = (state.money || 0) + (mission.rewardMoney || 0);
  addClassXP(mission.rewardXP || 0);
  if (mission.rewardReputation) {
    state.classData.reputation = (state.classData.reputation || 0) + mission.rewardReputation;
  }
  if (mission.rewardItem) {
    state.inventory = state.inventory || {};
    state.inventory[mission.rewardItem] = (state.inventory[mission.rewardItem] || 0) + (mission.rewardItemQty || 1);
  }
  if (typeof updateHud === 'function') updateHud();
  if (typeof scheduleSave === 'function') scheduleSave();
  notify(`¡Misión completada! +₽${(mission.rewardMoney || 0).toLocaleString()} ${mission.rewardReputation ? `+${mission.rewardReputation} REP` : ''} ${mission.rewardItem ? `+${mission.rewardItemQty || 1}x ${mission.rewardItem}` : ''}`, mission.icon);
  openClassMissionsPanel();
}

function openClassMissionsPanel() {
  document.getElementById('class-missions-overlay')?.remove();
  const cls = state.playerClass;
  if (!cls) return notify('Debes elegir una clase primero.', '⚠️');
  const clsDef = PLAYER_CLASSES[cls];
  const activeMissions = state.classData?.activeMissions || [];
  const available = getAvailableClassMissions();
  const now = Date.now();

  const missionRows = activeMissions.map(am => {
    const m = (CLASS_MISSIONS[cls] || []).find(x => x.id === am.id);
    if (!m) return '';
    const done = now >= am.endsAt;
    const pct = Math.min(100, Math.floor(((now - am.startedAt) / (am.endsAt - am.startedAt)) * 100));
    const remaining = done ? '¡Lista!' : formatTimerMs(am.endsAt - now);
    return `
    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid ${done ? clsDef.color + '88' : 'rgba(255,255,255,0.1)'};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:700;">${m.icon} ${m.name}</span>
        <span style="font-size:10px;color:${done ? clsDef.color : '#9ca3af'};">${remaining}</span>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px;margin-bottom:8px;">
        <div style="background:${clsDef.color};border-radius:4px;height:6px;width:${pct}%;transition:width 0.3s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;">
        <span>+₽${(m.rewardMoney || 0).toLocaleString()} | +${m.rewardXP} XP${m.rewardReputation ? ' | +' + m.rewardReputation + ' REP' : ''}${m.rewardItem ? ' | ' + (m.rewardItemQty || 1) + 'x ' + m.rewardItem : ''}</span>
        ${done ? `<button onclick="collectClassMission('${m.id}')" style="padding:6px 14px;border:none;border-radius:8px;background:${clsDef.color};color:#fff;font-size:10px;cursor:pointer;font-weight:700;">COBRAR</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const availableRows = available.map(m => `
    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.08);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:700;">${m.icon} ${m.name}</span>
        <span style="font-size:10px;color:#9ca3af;">${formatTimerMs(m.durationMs)}</span>
      </div>
      <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">${m.desc}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;">
        <span>+₽${(m.rewardMoney || 0).toLocaleString()} | +${m.rewardXP} XP${m.rewardReputation ? ' | +' + m.rewardReputation + ' REP' : ''}${m.rewardItem ? ' | ' + (m.rewardItemQty || 1) + 'x ' + m.rewardItem : ''}</span>
        ${activeMissions.length < MAX_ACTIVE_CLASS_MISSIONS
          ? `<button onclick="startClassMission('${m.id}')" style="padding:6px 14px;border:none;border-radius:8px;background:${clsDef.color}33;color:${clsDef.color};font-size:10px;cursor:pointer;font-weight:700;border:1px solid ${clsDef.color}44;">INICIAR</button>`
          : `<span style="color:#6b7280;font-size:9px;">Máx. activas</span>`}
      </div>
    </div>`).join('');

  const ov = document.createElement('div');
  ov.id = 'class-missions-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:3000;display:flex;align-items:center;justify-content:center;padding:12px;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${clsDef.color}44;border-radius:20px;padding:20px;max-width:420px;width:100%;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${clsDef.color};">${clsDef.icon} MISIONES ${clsDef.name.toUpperCase()}</div>
        <button onclick="document.getElementById('class-missions-overlay').remove()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;">✕</button>
      </div>
      ${activeMissions.length > 0 ? `<div style="font-size:10px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">En Curso (${activeMissions.length}/${MAX_ACTIVE_CLASS_MISSIONS})</div>${missionRows}` : ''}
      <div style="font-size:10px;color:#9ca3af;margin-top:12px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Disponibles</div>
      ${availableRows || '<div style="font-size:11px;color:#6b7280;text-align:center;padding:16px;">Sin misiones disponibles ahora.</div>'}
    </div>`;
  document.body.appendChild(ov);
}

function formatTimerMs(ms) {
  if (ms <= 0) return '¡Lista!';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Procesa misiones offline al cargar el juego
function processOfflineClassMissions() {
  const active = state.classData?.activeMissions || [];
  if (!active.length) return;
  const now = Date.now();
  const cls = state.playerClass;
  let collected = 0;
  for (const am of [...active]) {
    if (now >= am.endsAt) {
      const m = (CLASS_MISSIONS[cls] || []).find(x => x.id === am.id);
      if (m) {
        const idx = state.classData.activeMissions.findIndex(x => x.id === am.id);
        if (idx >= 0) state.classData.activeMissions.splice(idx, 1);
        state.money = (state.money || 0) + (m.rewardMoney || 0);
        addClassXP(m.rewardXP || 0);
        if (m.rewardReputation) state.classData.reputation = (state.classData.reputation || 0) + m.rewardReputation;
        if (m.rewardItem) {
          state.inventory = state.inventory || {};
          state.inventory[m.rewardItem] = (state.inventory[m.rewardItem] || 0) + (m.rewardItemQty || 1);
        }
        collected++;
      }
    }
  }
  if (collected > 0) notify(`${collected} misión(es) de clase completadas mientras estabas ausente.`, '📬');
}

// ── Tienda de Reputación (Entrenador) ────────────────────────────────────
const REPUTATION_SHOP_ITEMS = [
  { id: 'rep_ultra_ball', name: 'Ultra Ball x3', cost: 20, icon: '🔵', desc: 'Tres Ultra Balls de la tienda oficial del Gimnasio.', grant: () => { state.inventory['Ultra Ball'] = (state.inventory['Ultra Ball'] || 0) + 3; } },
  { id: 'rep_tm_earthquake', name: 'MT Terremoto', cost: 50, icon: '🌋', desc: 'El poderoso movimiento Terremoto en formato MT.', grant: () => { state.inventory['TM26 Terremoto'] = (state.inventory['TM26 Terremoto'] || 0) + 1; } },
  { id: 'rep_revive', name: 'Revivir x5', cost: 30, icon: '💊', desc: 'Cinco Revivires del botiquín de los Gimnasios.', grant: () => { state.inventory['Revivir'] = (state.inventory['Revivir'] || 0) + 5; } },
  { id: 'rep_full_restore', name: 'Restauración Total', cost: 45, icon: '💉', desc: 'Restaura PS y estados. Uso exclusivo de campeones.', grant: () => { state.inventory['Restauración Total'] = (state.inventory['Restauración Total'] || 0) + 2; } },
  { id: 'rep_lucky_egg', name: 'Huevo Suerte', cost: 100, icon: '🍀', desc: 'Aumenta la EXP obtenida al 1.5x mientras se sujeta.', grant: () => { state.inventory['Huevo Suerte'] = (state.inventory['Huevo Suerte'] || 0) + 1; } },
  { id: 'rep_star_piece', name: 'Trozo Estrella x3', cost: 60, icon: '⭐', desc: 'Tres trozos de estrella de valor extraordinario.', grant: () => { state.inventory['Trozo Estrella'] = (state.inventory['Trozo Estrella'] || 0) + 3; } },
];

function openReputationShop() {
  if (state.playerClass !== 'entrenador') return notify('Solo disponible para Entrenadores.', '⚠️');
  document.getElementById('rep-shop-overlay')?.remove();
  const rep = state.classData?.reputation || 0;
  const cls = PLAYER_CLASSES.entrenador;

  const rows = REPUTATION_SHOP_ITEMS.map(item => {
    const canAfford = rep >= item.cost;
    return `
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.08);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:700;">${item.icon} ${item.name}</span>
        <span style="font-size:11px;font-weight:700;color:${canAfford ? cls.color : '#6b7280'};">${item.cost} ⭐ REP</span>
      </div>
      <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">${item.desc}</div>
      <button onclick="buyReputationItem('${item.id}')" ${canAfford ? '' : 'disabled'} 
        style="width:100%;padding:8px;border:none;border-radius:8px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
          background:${canAfford ? cls.color + '33' : 'rgba(255,255,255,0.04)'};
          color:${canAfford ? cls.color : '#4b5563'};font-size:10px;font-weight:700;
          border:1px solid ${canAfford ? cls.color + '55' : 'transparent'};">
        ${canAfford ? 'CANJEAR' : 'SIN REPUTACIÓN'}
      </button>
    </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.id = 'rep-shop-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:3000;display:flex;align-items:center;justify-content:center;padding:12px;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${cls.color}44;border-radius:20px;padding:20px;max-width:420px;width:100%;max-height:88vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${cls.color};">🏅 TIENDA DE REPUTACIÓN</div>
        <button onclick="document.getElementById('rep-shop-overlay').remove()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:16px;">Tu reputación: <strong style="color:${cls.color};">${rep} ⭐</strong></div>
      ${rows}
    </div>`;
  document.body.appendChild(ov);
}

function buyReputationItem(itemId) {
  if (state.playerClass !== 'entrenador') return;
  const item = REPUTATION_SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const rep = state.classData?.reputation || 0;
  if (rep < item.cost) return notify('No tienes suficiente reputación.', '⚠️');
  state.classData.reputation = rep - item.cost;
  item.grant();
  addClassXP(20);
  if (typeof updateHud === 'function') updateHud();
  if (typeof scheduleSave === 'function') scheduleSave();
  notify(`¡${item.name} canjeado! (-${item.cost} REP)`, item.icon);
  openReputationShop();
}

// ── Inicialización ────────────────────────────────────────────────────────
function initClassSystem() {
  updateClassHud();
  checkClassUnlock();
  processOfflineClassMissions();
  console.log('[CLASES] Sistema de clases inicializado.');
}
