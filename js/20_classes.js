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
      '🗺️ Extorsión de Ruta: una ruta diaria x1.5 ₽ en batallas NPC genéricas',
      '🚔 Robo al Oficial: 5% chance de robar un Pokémon al Oficial'
    ],
    bonusLevels: [1, 1, 10, 15, 20],
    penalties: [
      '🏥 Centro Pokémon cuesta el doble (2x)',
      '🪙 -10% Battle Coins en todas las batallas',
      '🏪 20% de recargo en compras del Pokémart'
    ],
    modifiers: {
      expMult: 1.0,
      bcMult: 0.90,
      healCostMult: 2.0,
      daycareCostMult: 1.0,
      catchMult: 1.0,
      shopDiscount: 0.20
    },
    technicalBonuses: [
      "Venta directa en PC: ₽500 + (Nivel Seleccionado x 10). Pokémon de Tier alta dan bonos extra.",
      "15% de probabilidad base. Escala a 30% al alcanzar el nivel 15 de clase. Solo vs Entrenadores NPC.",
      "Aplica un modificador de x0.80 al precio de todos los objetos en la Tienda del Entrenador.",
      "Cada día se elige una ruta al azar. En esa ruta, ganarás x1.5 de dinero al derrotar entrenadores NPC genéricos.",
      "Al derrotar al Oficial de Policía en batalla, hay un 5% de probabilidad de robarle aleatoriamente uno de los Pokémon que utilizó y enviarlo a tu PC (requiere espacio)."
    ],
    technicalPenalties: [
      "El servicio de enfermería básico tiene un recargo del 100% (x2) por ser miembro del Team Rocket.",
      "Tus patrocinadores te dan un 10% menos de Battle Coins por batalla debido a tu mala reputación.",
      "Los PokéMart oficiales detectan tu afiliación y aplican un recargo del +20% en todos los precios."
    ],
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/rainbowrocketgrunt.png',
    avatarSprite: 'assets/sprites/trainers/teamrocket.png'
  },
  cazabichos: {
    id: 'cazabichos',
    name: 'Cazabichos',
    icon: '🦗',
    color: '#22c55e',
    colorDark: '#15803d',
    description: 'Maestro del campo. Acumula rachas de capturas para aumentar las chances de Shiny e IVs altos. Vive en la naturaleza.',
    bonuses: [
      '⚡ Racha de Capturas: cada captura seguida aumenta Shiny rate e IVs (máx x4)',
      '🦋 Sinergia Bicho: +5% catchRate por Pokémon Bicho en el equipo (máx +30%)',
      '🎒 Kit de Campo: cada 10 capturas salvajes recibís 1 Poké Ball',
      '🐝 Aroma Atractivo: chance de atraer Pokémon raros (Scyther/Pinsir)',
      '🕸️ Red Maestra: 20% de capturar un segundo ejemplar de tipo Bicho (2x1)'
    ],
    bonusLevels: [1, 1, 10, 15, 20],
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
    },
    technicalBonuses: [
      "Cada captura del mismo tipo suma +1 racha. +1 racha = +15% Shiny rate y +5 IVs garantizados (máx multiplicador x4.0).",
      "Bono de +5% de Catch Rate por cada Pokémon tipo Bicho en tu equipo activo (Bonificador máximo: +30%).",
      "Al ser un experto en el campo, por cada 10 Pokémon salvajes capturados, encontrás 1 Poké Ball extra en el equipo del Kit de Campo.",
      "Probabilidad de 0.5% por paso (10% en Safari) de forzar la aparición de un Pokémon raro (Scyther/Pinsir).",
      "Al capturar un Pokémon tipo Bicho, hay un 20% de probabilidad de recibir un segundo ejemplar idéntico en la caja."
    ],
    technicalPenalties: [
      "Tu enfoque en la naturaleza te hace menos eficiente entrenando contra otros humanos (x0.80 EXP).",
      "Los premios en metálico se reducen un 15% debido a tu falta de patrocinio oficial.",
      "La infraestructura de la guardería no está adaptada para tus métodos de crianza rústicos (x1.50 costo)."
    ],
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/bugcatcher-gen6.png',
    avatarSprite: 'assets/sprites/trainers/cazabichos.png'
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
      '🏆 +30% Battle Coins en victorias de Gimnasio',
      '⭐ Sistema de Reputación: acumulá puntos venciendo gimnasios',
      '📍 Ruta Oficial: marcá una ruta diaria para ganar +1 REP por combate (30 min)',
      '⚔️ Rival Doble: chance x2 de aparición del Rival si venciste todo en Difícil'
    ],
    bonusLevels: [1, 1, 10, 15, 20],
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
    },
    technicalBonuses: [
      "Multiplicador fijo de x1.10 a toda la experiencia base ganada al derrotar Pokémon salvajes o entrenadores.",
      "Bono de x1.30 a las Battle Coins obtenidas exclusivamente en batallas de Gimnasio / Líderes.",
      "Ganas 10 REP por cada victoria en Gimnasio. Los puntos se usan en la Tienda de Reputación.",
      "Una vez cada 24h podés marcar una ruta como 'Oficial'. Durante 30 min, cada combate en esa ruta otorga +1 Reputation.",
      "Si has derrotado a todos los Líderes de Gimnasio en dificultad Difícil al menos una vez, la probabilidad de que aparezca el Rival se duplica."
    ],
    technicalPenalties: [
      "Tu ética profesional te impide capturar Pokémon genéticamente perfectos con facilidad (-10% Catch Rate si IV > 120).",
      "Prefieres el entrenamiento en campo; el mantenimiento en guardería te resulta más costoso (x1.50).",
      "Como figura pública, no puedes ser visto operando en mercados de dudosa legalidad."
    ],
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.png',
    avatarSprite: 'assets/sprites/trainers/entrenador.png'
  },
  criador: {
    id: 'criador',
    name: 'Criador Pokémon',
    icon: '🧬',
    color: '#a855f7',
    colorDark: '#7e22ce',
    description: 'Maestro genético. Produce los Pokémon con mejores IVs y habilidades del servidor. Domina el meta competitivo desde la guardería.',
    bonuses: [
      '🧬 Lazo Destino: Hereda 4 IVs aleatorios de los padres (vs 3 normal).',
      '🥚 Incubación Rápida: Los pasos para eclosionar se reducen un 25%.',
      '❤️ Vigor: 15% de chance de recuperar vigor tras eclosionar.',
      '👁️ Predecir Naturaleza: Permite ver la naturaleza del Pokémon rival en batalla.',
      '🔍 Escáner de Huevos: Visualiza y gestiona IVs/Naturaleza post-eclosión.'
    ],
    bonusLevels: [1, 1, 5, 5, 20],
    penalties: [
      '📉 -10% EXP en todos los combates',
      '🚫 Sin acceso al Mercado Negro'
    ],
    modifiers: {
      expMult: 0.90,
      bcMult: 1.0,
      healCostMult: 1.0,
      daycareCostMult: 1.0,
      catchMult: 1.0
    },
    technicalBonuses: [
      "Al criar, se eligen 4 IVs aleatorios de entre los 12 disponibles de los padres (normalmente son solo 3).",
      "El contador de pasos requerido para que un huevo eclosione se reduce en un 25%.",
      "Cada eclosión tiene un 15% de posibilidad de recuperar 1 punto de vigor en uno de los padres en la guardería.",
      "Muestra la Naturaleza (Modificadores de Stats) del Pokémon rival directamente en el HUD de batalla.",
      "Tras eclosionar un huevo, selecciona otro huevo para conocer su genética. Permite conservarlo con un recordatorio en pantalla para gestionar su eclosión."
    ],
    technicalPenalties: [
      "Tu enfoque en la genética te aleja del fragor de la batalla (x0.90 EXP global).",
      "Como científico respetable, no posees los contactos necesarios para entrar al Mercado Negro."
    ],
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/jacq.png',
    avatarSprite: 'assets/sprites/trainers/criador.png'
  }
};

// ── HELPER: Generar HTML del Avatar ───────────────────────────────────────
function getAvatarHtml(cls, borderColor, sizePx = 40, customAvatarStyle = undefined) {
  const style = (customAvatarStyle !== undefined) ? customAvatarStyle : (state.avatar_style || '');
  const avatarClass = style ? ` ${style}` : '';
  if (!cls) {
    return `<div class="player-avatar-container${avatarClass}" style="width:${sizePx}px; height:${sizePx}px; border-radius:50%; border:2px solid ${borderColor}; background:#1e293b; display:flex; align-items:center; justify-content:center; font-size:${sizePx/2}px; box-shadow: 0 0 ${sizePx/4}px ${borderColor}66;">🧢</div>`;
  }
  
  const bgSize = cls.faceScale || 'cover';
  const bgPos = cls.facePos || 'center';
  const displayUrl = cls.avatarSprite || cls.sprite;
  
  return `
    <div class="player-avatar-container${avatarClass}" style="width:${sizePx}px; height:${sizePx}px; border-radius:50%; border:2px solid ${borderColor}; background-color: transparent; background-image: radial-gradient(circle, ${cls.color}44 0%, transparent 80%), url('${displayUrl}'); background-size: cover, ${bgSize}; background-position: center, ${bgPos}; background-repeat: no-repeat; box-shadow: 0 0 ${sizePx/4}px ${borderColor}66; image-rendering: pixelated; transition: background-position 0.2s;">
    </div>`;
}

// ── Obtener modificador de la clase activa ─────────────────────────────────
function getClassModifier(type, context = {}) {
  // PvP Balance: No advantages or modifiers allowed during PvP matches
  if (state.battle && state.battle.isPvP) {
    if (type === 'shopDiscount') return 0;
    return 1.0;
  }

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
    case 'shopDiscount':
      return m.shopDiscount || 0;
    default:
      return 1.0;
  }
}

// ── Añadir XP de clase (usa el mismo XP que el entrenador) ───────────────
function addClassXP(amount) {
  if (!state.playerClass) return;
  if (typeof addTrainerExp === 'function') addTrainerExp(amount);
}

// ── Seleccionar clase ──────────────────────────────────────────────────────
function selectClass(classId) {
  const cls = PLAYER_CLASSES[classId];
  if (!cls) return;

  const alreadyHasClass = !!state.playerClass;
  if (alreadyHasClass) {
    const cost = 10000;
    if ((state.battleCoins || 0) < cost) {
      notify(`Necesitás ${cost.toLocaleString()} Battle Coins para cambiar de clase.`, '🔒');
      return;
    }
    state.battleCoins -= cost;
    notify(`Cambiaste a ${cls.name}. Costó ${cost.toLocaleString()} Battle Coins.`, cls.icon);
  } else {
    notify(`¡Elegiste ser ${cls.name}! ${cls.description.split('.')[0]}.`, cls.icon);
  }

  // Liberar cualquier Pokémon que estuviese en misión al cambiar de clase
  [...(state.team || []), ...(state.box || [])].forEach(p => {
    if (p.onMission) {
      p.onMission = false;
    }
  });

  state.playerClass = classId;
  state.classLevel = 1;
  state.classXP = 0;
  
  // Reiniciar datos específicos de clase para evitar exploits al cambiar
  state.classData = {
    captureStreak: 0,
    longestStreak: 0,
    reputation: 0,
    blackMarketSales: 0,
    criminality: 0,
    extortedRouteId: null,
    officialRouteId: null,
    kitCaptures: 0
  };

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
    display:flex;align-items:flex-start;justify-content:center;padding:16px;
    animation:fadeIn 0.3s ease;overflow-y:auto;
    -webkit-overflow-scrolling: touch;
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
        <div style="margin-bottom:16px;display:flex;justify-content:center;">
          ${getAvatarHtml(cls, borderColor, 80)}
        </div>
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
          ${isActive ? '✓ CLASE ACTUAL' : (isChange ? '🔄 CAMBIAR (10,000 BC)' : '▶ ELEGIR')}
        </button>
      </div>`;
  }).join('');

  modal.innerHTML = `
    <div style="width:95%;max-width:1500px;padding-top:20px;padding-bottom:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:#f59e0b;margin-bottom:8px;">
          🎭 ELEGÍ TU CLASE
        </div>
        <div style="font-size:13px;color:#9ca3af;padding:0 10px;">
          ${isChange ? 'Cambiar de clase cuesta <strong style="color:#f59e0b;">10,000 Battle Coins</strong>.' : 'Esta elección define cómo jugás. Podés cambiar más adelante por 10,000 Battle Coins.'}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px;margin-bottom:20px;">
        ${cardsHtml}
      </div>
      ${canClose && state.playerClass ? `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;">
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

// ── Panel de información de clase (estilo mochila) ─────────────────────────
function openClassInfoPanel() {
  if (!state.playerClass) {
    openClassModal(true);
    return;
  }

  const existing = document.getElementById('class-info-panel-overlay');
  if (existing) existing.remove();

  const cls = PLAYER_CLASSES[state.playerClass];
  const trainerLevel = state.trainerLevel || 1;

  const bonusesHtml = cls.bonuses.map((bonus, i) => {
    const reqLevel = (cls.bonusLevels && cls.bonusLevels[i]) || 1;
    const unlocked = trainerLevel >= reqLevel;
    const tech = cls.technicalBonuses ? cls.technicalBonuses[i] : 'Información no disponible.';
    const borderColor = unlocked ? cls.color : '#374151';
    const textColor = unlocked ? '#e2e8f0' : '#6b7280';
    const icon = unlocked ? '✅' : '🔒';
    
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(0,0,0,0.4);border-radius:14px;border-left:4px solid ${borderColor};position:relative;">
        <span style="font-size:16px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;">
          <div class="class-ability-row" style="font-size:13px;color:${textColor};line-height:1.4;">
            <span style="flex:1;min-width:0;">${bonus}</span>
            ${reqLevel > 1 ? `<span style="font-size:9px;color:${unlocked ? cls.color : '#4b5563'};background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:6px;font-family:'Press Start 2P',monospace;white-space:nowrap;">Nv.${reqLevel}</span>` : ''}
            <div class="class-tooltip" style="flex-shrink:0;">
              ❓
              <span class="class-tooltiptext"><strong>Mecánica:</strong><br>${tech}</span>
            </div>
          </div>
          ${!unlocked ? `<div style="font-size:10px;color:#4b5563;margin-top:4px;">Requiere Nivel de Entrenador ${reqLevel}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const penaltiesHtml = cls.penalties.map((p, i) => {
    const tech = cls.technicalPenalties ? cls.technicalPenalties[i] : 'Información no disponible.';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(0,0,0,0.4);border-radius:14px;border-left:4px solid #ef444466;">
        <span style="font-size:16px;flex-shrink:0;">❌</span>
        <div class="class-ability-row" style="flex:1;font-size:13px;color:#f87171;line-height:1.4;">
          <span style="flex:1;min-width:0;">${p}</span>
          <div class="class-tooltip" style="flex-shrink:0;">
            ❓
            <span class="class-tooltiptext" style="border-color:#ef444444;"><strong>Efecto Negativo:</strong><br>${tech}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.id = 'class-info-panel-overlay';
  ov.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9000;
    display:flex;align-items:flex-start;justify-content:center;
    padding:16px;animation:fadeIn 0.2s;overflow-y:auto;
  `;

  const levelForBorder = state.trainerLevel || 1;
  let panelBorderColor = '#cd7f32';
  if (levelForBorder >= 20) panelBorderColor = '#ffd700';
  else if (levelForBorder >= 10) panelBorderColor = '#c0c0c0';

  const avatarHtml = getAvatarHtml(cls, panelBorderColor, 60);

  ov.innerHTML = `
    <style>
      .class-tooltip { position:relative; display:inline-block; margin-left:10px; cursor:help; font-size:12px; color:#4b5563; transition:color 0.2s; }
      .class-tooltip:hover { color:#fff; }
      .class-tooltiptext {
        visibility:hidden; width:260px; background:#0f172a; color:#cbd5e1; text-align:left;
        border:1px solid ${cls.color}44; border-radius:12px; padding:12px; position:absolute;
        z-index:100; bottom:125%; left:50%; margin-left:-130px; opacity:0; transition:opacity 0.3s, transform 0.3s;
        transform:translateY(10px); pointer-events:none; font-family:sans-serif; font-size:11px;
        line-height:1.5; box-shadow:0 10px 25px -5px rgba(0,0,0,0.6);
      }
      .class-tooltip:hover .class-tooltiptext { visibility:visible; opacity:1; transform:translateY(0); }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      .class-modal-content { padding: 32px; gap: 32px; box-sizing: border-box; }
      .class-modal-cols { gap: 40px; }
      .class-col-left { min-width: 280px; box-sizing: border-box; max-width: 100%; }
      .class-col-right { min-width: 350px; box-sizing: border-box; max-width: 100%; }
      .class-ability-row { display:flex; align-items:center; flex-wrap: wrap; gap: 4px; }
      @media (max-width: 600px) {
        .class-modal-content { 
          padding: 24px 16px !important; 
          gap: 24px !important; 
          width: 100% !important;
          height: auto !important;
          max-width: none !important;
          border-radius: 0 !important;
          display: block !important; /* Permitir scroll natural */
        }
        .class-modal-cols { 
          gap: 32px !important; 
          flex-direction: column !important; 
          display: flex !important;
        }
        .class-col-left, .class-col-right { 
          min-width: 100% !important; 
          max-width: 100% !important; 
          flex: none !important;
        }
        .class-tooltiptext { width: 200px; left: auto; right: 0; margin-left: 0; }
        .class-col-left img { width: 180px !important; }
        .class-ability-row { flex-wrap: wrap; }
        
        /* Asegurar que el footer no se coma el contenido */
        .class-col-right { padding-bottom: 40px; }
      }
    </style>

    <div class="class-modal-content" style="background:#111827;border-radius:24px;width:95%;max-width:900px;border:1px solid ${cls.color}33;box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);position:relative;display:flex;flex-direction:column;margin-top:auto;margin-bottom:auto;">
      
      <!-- Close Button -->
      <button onclick="document.getElementById('class-info-panel-overlay').remove()"
        style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.05);border:none;color:#9ca3af;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;z-index:10;transition:0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'"
        onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#9ca3af'">✕</button>

      <div class="class-modal-cols" style="display:flex;flex-wrap:wrap;">
        
        <!-- LEFT COLUMN: Sprite & Summary -->
        <div class="class-col-left" style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="position:relative;width:100%;max-width:300px;background:radial-gradient(circle, ${cls.color}15 0%, transparent 70%);border-radius:30px;padding:20px;display:flex;justify-content:center;margin-bottom:24px;border:1px solid ${cls.color}11;">
            <img src="${cls.sprite}" style="width:220px;height:auto;image-rendering:pixelated;filter:drop-shadow(0 10px 20px rgba(0,0,0,0.5));">
            <div style="position:absolute;top:20px;left:20px;">
              ${avatarHtml}
            </div>
          </div>

          <div style="width:100%;text-align:center;">
             <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:${cls.color};margin-bottom:14px;text-transform:uppercase;letter-spacing:1px;text-shadow:0 0 10px ${cls.color}44;">${cls.name}</div>
             <div style="font-size:14px;color:#9ca3af;line-height:1.6;font-style:italic;max-width:340px;margin:0 auto;">"${cls.description}"</div>
          </div>

          <div style="width:100%;margin-top:32px;display:grid;gap:12px;">
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:20px;display:flex;align-items:center;gap:20px;">
              <div style="width:50px;height:50px;background:${cls.color}15;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;">🎖️</div>
              <div>
                <div style="font-size:9px;color:#6b7280;margin-bottom:4px;font-family:'Press Start 2P',monospace;">NIVEL ENTRENADOR</div>
                <div style="font-size:26px;font-weight:900;color:${cls.color};text-shadow:0 0 10px ${cls.color}33;">Nv. ${trainerLevel}</div>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:20px;display:flex;align-items:center;gap:20px;">
              <div style="width:50px;height:50px;background:#eab30815;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;">✨</div>
              <div>
                <div style="font-size:9px;color:#6b7280;margin-bottom:4px;font-family:'Press Start 2P',monospace;">RANGO ACTUAL</div>
                <div style="font-size:16px;font-weight:700;color:#eab308;text-transform:uppercase;letter-spacing:1px;">${getTrainerRank().title}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Abilities & Penalties -->
        <div class="class-col-right" style="flex:1.5;display:flex;flex-direction:column;gap:32px;">
          <!-- Bonos -->
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <div style="width:6px;height:20px;background:#22c55e;border-radius:3px;box-shadow:0 0 10px #22c55e44;"></div>
              <span style="font-family:'Press Start 2P',monospace;font-size:11px;color:#22c55e;letter-spacing:1.5px;">HABILIDADES DE CLASE</span>
            </div>
            <div style="display:grid;gap:10px;box-sizing:border-box;max-width:100%;">${bonusesHtml}</div>
          </div>

          <!-- Penalizaciones -->
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <div style="width:6px;height:20px;background:#ef4444;border-radius:3px;box-shadow:0 0 10px #ef444444;"></div>
              <span style="font-family:'Press Start 2P',monospace;font-size:11px;color:#ef4444;letter-spacing:1.5px;">LIMITACIONES</span>
            </div>
            <div style="display:grid;gap:10px;box-sizing:border-box;max-width:100%;">${penaltiesHtml}</div>
          </div>

          <!-- Footer Actions inside Right Column -->
          <div style="margin-top:auto;display:grid;gap:12px;border-top:1px solid rgba(255,255,255,0.05);padding-top:24px;">

            <button onclick="document.getElementById('class-info-panel-overlay').remove();openClassMissionsPanel()"
              style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,${cls.color},${cls.colorDark});color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;box-shadow:0 5px 0 ${cls.colorDark}99;transition:0.2s;position:relative;overflow:hidden;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 7px 0 ${cls.colorDark}aa'"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 5px 0 ${cls.colorDark}99'">
              <div style="position:absolute;top:0;left:0;right:0;height:40%;background:linear-gradient(to bottom, rgba(255,255,255,0.2), transparent);"></div>
              <span style="position:relative;z-index:1;">📋 MISIONES PASIVAS</span>
            </button>
            ${state.playerClass === 'entrenador' ? `
            <button onclick="document.getElementById('class-info-panel-overlay').remove();openReputationShop()"
              style="width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;box-shadow:0 5px 0 #14532d;transition:0.2s;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 7px 0 #14532d'"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 5px 0 #14532d'">
              🏅 TIENDA DE REPUTACIÓN
            </button>` : ''}
            
            <div style="display:flex;gap:12px;">
              <button onclick="document.getElementById('class-info-panel-overlay').remove();openClassModal(false)"
                style="flex:1;padding:12px;border:1px solid rgba(255,255,255,0.08);border-radius:14px;background:rgba(255,255,255,0.03);color:#9ca3af;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;transition:0.2s;line-height:1.4;"
                onmouseover="this.style.background='rgba(255,255,255,0.05)';this.style.color='#fff'"
                onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#9ca3af'">
                🔄 CAMBIAR CLASE<br><span style="color:#f59e0b;font-size:7px;">10,000 BC</span>
              </button>
              <button onclick="document.getElementById('class-info-panel-overlay').remove()"
                style="flex:1;padding:12px;border:none;border-radius:14px;background:linear-gradient(135deg,${cls.color},${cls.colorDark});color:#fff;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;box-shadow:0 5px 0 ${cls.colorDark}99;transition:0.2s;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 7px 0 ${cls.colorDark}aa'"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 5px 0 ${cls.colorDark}99'">
                ✓ ENTENDIDO
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  document.body.appendChild(ov);
}

// ── HUD de clase y Perfil: actualiza avatares y panel ───────────────────────
function updateClassHud() {
  const oldBadge = document.getElementById('class-hud-badge');
  if (oldBadge) oldBadge.remove();

  const label = document.getElementById('hud-class-label');
  const avatar = document.getElementById('hud-class-avatar');
  const profAvatar = document.querySelector('.profile-avatar');

  if (typeof applyClassTheme === 'function') applyClassTheme();

  const level = state.trainerLevel || 1;
  let borderColor = '#cd7f32'; // Bronce (1-9)
  if (level >= 20) borderColor = '#ffd700'; // Oro (20+)
  else if (level >= 10) borderColor = '#c0c0c0'; // Plata (10-19)

  if (!state.playerClass) {
    if (label) label.style.display = 'none';
    if (avatar) avatar.innerHTML = getAvatarHtml(null, borderColor, 36);
    if (profAvatar) {
      profAvatar.innerHTML = getAvatarHtml(null, borderColor, 80);
      profAvatar.style.background = 'transparent';
      profAvatar.style.border = 'none';
      profAvatar.style.width = 'auto';
      profAvatar.style.height = 'auto';
    }
    updateCriminalityBar();
    return;
  }

  const cls = PLAYER_CLASSES[state.playerClass];

  if (avatar) {
    avatar.style.position = 'relative';
    avatar.innerHTML = getAvatarHtml(cls, borderColor, 36);
    
    // Alerta visual de misiones inactivas en el HUD
    const hasActiveMission = !!state.classData?.activeMission;
    if (!hasActiveMission) {
      const alertEl = document.createElement('div');
      alertEl.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 0 10px #ef4444;z-index:100;animation:blinkRed 1.5s infinite;';
      alertEl.textContent = '!';
      avatar.appendChild(alertEl);
    }
  }

  if (profAvatar) {
    profAvatar.innerHTML = getAvatarHtml(cls, borderColor, 80);
    profAvatar.style.margin = '0 auto 16px';
    profAvatar.style.background = 'transparent';
    profAvatar.style.border = 'none';
    profAvatar.style.width = 'auto';
    profAvatar.style.height = 'auto';
  }

  if (label) {
    label.style.display = 'block';
    label.style.color = cls.color;
    label.textContent = cls.name;
  }
  
  updateCriminalityBar();
}

// ── Tema Dinámico del HUD por Clase ───────────────────────────────────────
function applyClassTheme() {
  const root = document.documentElement;
  if (!state.playerClass) {
    root.style.setProperty('--darker', '#000000');
    root.style.setProperty('--dark', '#0a0a0a');
    root.style.setProperty('--card', '#121212');
    root.style.setProperty('--card2', '#1a1a1a');
    root.style.setProperty('--blue', '#0a84ff'); 
    root.style.setProperty('--hud-bg', 'var(--card)');
    root.style.setProperty('--hud-border', 'rgba(255,255,255,0.05)');
    return;
  }
  
  switch(state.playerClass) {
    case 'rocket':
      root.style.setProperty('--darker', '#050000');
      root.style.setProperty('--dark', '#0a0000');
      root.style.setProperty('--card', '#140505');
      root.style.setProperty('--card2', '#1f0a0a');
      root.style.setProperty('--blue', '#ef4444'); 
      root.style.setProperty('--hud-bg', 'linear-gradient(to right, #380b0b, #140202)');
      root.style.setProperty('--hud-border', '#ef4444');
      break;
    case 'cazabichos':
      root.style.setProperty('--darker', '#080d06');
      root.style.setProperty('--dark', '#0e170a');
      root.style.setProperty('--card', '#152410');
      root.style.setProperty('--card2', '#1e3316');
      root.style.setProperty('--blue', '#65a30d'); 
      root.style.setProperty('--hud-bg', 'linear-gradient(to right, #213813, #101c09)');
      root.style.setProperty('--hud-border', '#84cc16');
      break;
    case 'entrenador':
      root.style.setProperty('--darker', '#030812');
      root.style.setProperty('--dark', '#060d1a');
      root.style.setProperty('--card', '#0d1a33');
      root.style.setProperty('--card2', '#14274a');
      root.style.setProperty('--blue', '#3b82f6'); 
      root.style.setProperty('--hud-bg', 'linear-gradient(to right, #132a54, #081326)');
      root.style.setProperty('--hud-border', '#60a5fa');
      break;
    case 'criador':
      root.style.setProperty('--darker', '#0a0312');
      root.style.setProperty('--dark', '#11051f');
      root.style.setProperty('--card', '#1b0a33');
      root.style.setProperty('--card2', '#28114a');
      root.style.setProperty('--blue', '#a855f7'); 
      root.style.setProperty('--hud-bg', 'linear-gradient(to right, #34125c, #1a082e)');
      root.style.setProperty('--hud-border', '#c084fc');
      break;
  }
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
  // Racha máxima de x4 según diseño
  const currentStreak = state.classData.captureStreak || 0;
  if (currentStreak < 4) {
    state.classData.captureStreak = currentStreak + 1;
  }
  
  if (state.classData.captureStreak > (state.classData.longestStreak || 0)) {
    state.classData.longestStreak = state.classData.captureStreak;
  }
  
  const streak = state.classData.captureStreak;
  const mult = (1.0 + 0.75 * streak).toFixed(2); // x1.75, x2.50, x3.25, x4.00
  notify(`¡Racha x${streak}! Shiny e IVs x${mult}`, '⚡');

  // Kit de Campo (Nv. 10): 1 Poké Ball cada 10 capturas salvajes
  if ((state.classLevel || 1) >= 10) {
    state.classData.kitCaptures = (state.classData.kitCaptures || 0) + 1;
    if (state.classData.kitCaptures >= 10) {
      state.classData.kitCaptures = 0;
      state.inventory = state.inventory || {};
      state.inventory['Pokéball'] = (state.inventory['Pokéball'] || 0) + 1;
      notify('¡Kit de Campo! Recibiste 1 Poké Ball 🎒', '🎒');
    }
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
      // Multiplicador lineal hasta x4.0 (1.0 + 0.75 * streak)
      const mult = 1.0 + 0.75 * streak;
      baseRate = Math.floor(baseRate / mult);
    }
  }
  return baseRate;
}

// ── IVs mínimos por racha (Cazabichos) ───────────────────────────────────
function getStreakIvFloor() {
  if (state.playerClass !== 'cazabichos') return 0;
  const streak = (state.classData && state.classData.captureStreak) || 0;
  // Con racha x4, el suelo de IVs es 20 (buen balance)
  return Math.min(20, streak * 5);
}

// ── Robo Rápido (Equipo Rocket) ───────────────────────────────────────────
function tryRocketSteal() {
  if (state.playerClass !== 'rocket') return;
  const classLevel = state.classLevel || 1;
  const prob = Math.min(0.15 + (classLevel * 0.01), 0.30);
  if (Math.random() > prob) return;

  const lootTable = [
    'Poción', 'Super Poción', 'Antídoto', 'Pokéball', 'Súper Ball',
    'Revivir', 'Éter', 'Elixir Máximo', 'Cura Total', 'Hiper Poción'
  ];
  const item = lootTable[Math.floor(Math.random() * lootTable.length)];
  state.inventory = state.inventory || {};
  state.inventory[item] = (state.inventory[item] || 0) + 1;
  addClassXP(15);
  
  // Aumentar criminalidad por robo exitoso
  addCriminality(10);

  setTimeout(() => {
    notify(`¡Robo Rápido exitoso! Robaste: ${item} 🚀`, '🎯');
  }, 500);
}

// ── Sistema de Criminalidad (Equipo Rocket) ────────────────────────────────
function addCriminality(amount) {
  if (state.playerClass !== 'rocket') return;
  state.classData = state.classData || {};
  const prev = state.classData.criminality || 0;
  state.classData.criminality = Math.min(100, prev + amount);
  
  updateCriminalityBar();
  
  if (prev < 100 && state.classData.criminality >= 100) {
    notify("¡Tu nivel de criminalidad es máximo! La policía te busca.", "🚔");
  }
  
  if (typeof scheduleSave === 'function') scheduleSave();
}

function updateCriminalityBar() {
  const container = document.getElementById('criminality-bar-container');
  if (state.playerClass !== 'rocket') {
    if (container) container.style.display = 'none';
    return;
  }

  // Si no existe, lo creamos (se inyecta en el body para estar a la derecha del HUD de mapas)
  let bar = document.getElementById('criminality-bar-fill');
  if (!container) {
    const newContainer = document.createElement('div');
    newContainer.id = 'criminality-bar-container';
    newContainer.style.cssText = `
      position: fixed; right: 20px; top: 50%; transform: translateY(-50%);
      width: 12px; height: 200px; background: rgba(0,0,0,0.6);
      border: 2px solid #333; border-radius: 10px; z-index: 100;
      display: flex; align-items: flex-end; overflow: hidden;
      box-shadow: 0 0 10px rgba(0,0,0,0.5); pointer-events: none;
    `;
    
    const fill = document.createElement('div');
    fill.id = 'criminality-bar-fill';
    fill.style.cssText = `
      width: 100%; height: 0%; background: #ef4444;
      transition: height 0.3s ease, background 0.3s ease;
      box-shadow: 0 0 15px #ef4444;
    `;
    
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute; top: -25px; left: 50%; transform: translateX(-50%);
      color: #ef4444; font-family: 'Press Start 2P', monospace; font-size: 8px;
      white-space: nowrap; text-shadow: 1px 1px #000;
    `;
    label.textContent = "CRIMEN";
    
    newContainer.appendChild(label);
    newContainer.appendChild(fill);
    document.body.appendChild(newContainer);
    bar = fill;
  }

  const criminality = state.classData?.criminality || 0;
  const containerEl = document.getElementById('criminality-bar-container');
  
  // Mostrar solo en la pestaña de mapa
  const activeTab = document.querySelector('.hud-nav-btn.active')?.dataset.tab;
  containerEl.style.display = (activeTab === 'map') ? 'flex' : 'none';
  
  bar.style.height = criminality + '%';
  
  if (criminality >= 100) {
    bar.style.animation = 'blinkRed 0.5s infinite';
    if (!document.getElementById('criminality-anim')) {
      const style = document.createElement('style');
      style.id = 'criminality-anim';
      style.textContent = `
        @keyframes blinkRed {
          0% { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
          50% { background: #991b1b; box-shadow: 0 0 5px #991b1b; }
          100% { background: #ef4444; box-shadow: 0 0 20px #ef4444; }
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    bar.style.animation = 'none';
  }
}

// ── Reputación del Entrenador ─────────────────────────────────────────────
function addReputationPoints(points) {
  if (state.playerClass !== 'entrenador') return;
  state.classData = state.classData || {};
  const prev = state.classData.reputation || 0;
  state.classData.reputation = prev + points;
  const newVal = state.classData.reputation;

  const milestones = [50, 100, 200];
  milestones.forEach(m => {
    if (prev < m && newVal >= m) {
      notify(`¡Reputación ⭐! Alcanzaste ${m} pts. Nueva tienda disponible.`, '🏆');
    }
  });
  addClassXP(20);
  updateClassHud();
}

function checkAllGymsHardBeaten() {
  const gymList = (typeof GYMS !== 'undefined') ? GYMS : [];
  if (!gymList.length) return false;
  return gymList.every(g => (state.gymProgress?.[g.id] || 0) >= 3);
}

function activateOfficialRoute(locId) {
  if (state.playerClass !== 'entrenador') return;
  if ((state.classLevel || 1) < 15) {
    notify('Necesitás nivel 15 de Entrenador para marcar una Ruta Oficial.', '🔒');
    return;
  }

  const today = (function() {
    const d = getGMT3Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();

  state.classData = state.classData || {};
  if (state.classData.lastOfficialRouteDate === today) {
    notify('Ya marcaste una Ruta Oficial hoy. ¡Vuelve mañana!', '🚫');
    return;
  }

  const loc = FIRE_RED_MAPS.find(m => m.id === locId);
  if (!loc) return;

  state.classData.officialRouteId = locId;
  state.classData.officialRouteExp = Date.now() + (30 * 60 * 1000); // 30 min
  state.classData.lastOfficialRouteDate = today;

  notify(`📍 ¡${loc.name} marcada como Ruta Oficial! (+1 REP por combate durante 30 min)`, '🏅');
  
  if (typeof renderMaps === 'function') renderMaps();
  if (typeof updateClassHud === 'function') updateClassHud();
  if (typeof saveGame === 'function') saveGame(false);
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
  const price = Math.floor((pokemon.level * 100 + (totalIv / 186) * 1000) * 1.5);

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
  const p = state.box[boxIndex];
  if (p) returnHeldItem(p);
  state.box.splice(boxIndex, 1);

  state.money = (state.money || 0) + price;
  state.classData = state.classData || {};
  state.classData.blackMarketSales = (state.classData.blackMarketSales || 0) + 1;
  
  // Aumentar criminalidad por venta en mercado negro (15 por cada uno)
  if (state.playerClass === 'rocket') {
    addCriminality(15);
  }

  addClassXP(25);
  notify(`¡Pokémon vendido por ₽${price.toLocaleString()}! 💰`, '🚀');
  if (typeof renderBox === 'function') renderBox();
  if (typeof updateHud === 'function') updateHud();
  if (typeof saveGame === 'function') saveGame(false);
}

// ── Sistema de Misiones Idle por Clase (Rediseño) ────────────────────────
const CLASS_MISSIONS_NEW = [
  { id: 'mission_6h',  durationHs: 6,  reqLv: 1,  name: 'Misión Básica (6h)',     color: '#22c55e' },
  { id: 'mission_12h', durationHs: 12, reqLv: 15, name: 'Misión Avanzada (12h)',  color: '#3b82f6' },
  { id: 'mission_24h', durationHs: 24, reqLv: 25, name: 'Misión Experta (24h)',   color: '#a855f7' }
];

function openClassMissionsPanel() {
  document.getElementById('class-missions-overlay')?.remove();
  const cls = state.playerClass;
  if (!cls) return notify('Debes elegir una clase primero.', '⚠️');
  const clsDef = PLAYER_CLASSES[cls];
  const activeMission = state.classData?.activeMission || null; // Ahora solo permite 1 misión a la vez
  const now = Date.now();
  const trainerLevel = state.trainerLevel || 1;

  let activeHtml = '';
  let activePct = 0;
  let activeRemaining = '';
  let activeDone = false;

  if (activeMission) {
    const mActive = CLASS_MISSIONS_NEW.find(x => x.id === activeMission.id);
    activeDone = now >= activeMission.endsAt;
    activePct = Math.min(100, Math.floor(((now - activeMission.startedAt) / (activeMission.endsAt - activeMission.startedAt)) * 100));
    
    // Formato de tiempo restante local
    activeRemaining = '¡Lista!';
    if (!activeDone) {
      const ms = activeMission.endsAt - now;
      const h = Math.floor(ms / 3600000);
      const min = Math.floor((ms % 3600000) / 60000);
      activeRemaining = h > 0 ? `${h}h ${min}m` : `${min}m`;
    }

    const workingMsg = cls === 'cazabichos' 
      ? '¡Red colocada! Revisando especies interesantes...' 
      : 'Tus Pokémon están trabajando arduamente...';

    activeHtml = `
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid ${activeDone ? clsDef.color : 'rgba(255,255,255,0.1)'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:13px;font-weight:bold;color:${mActive.color};">📍 ${mActive.name}</span>
          <span style="font-size:11px;color:${activeDone ? clsDef.color : '#9ca3af'};font-weight:bold;">${activeRemaining}</span>
        </div>
        <div style="background:rgba(0,0,0,0.4);border-radius:6px;height:8px;margin-bottom:12px;overflow:hidden;">
          <div style="background:${activeDone ? clsDef.color : mActive.color};height:100%;width:${activePct}%;transition:width 0.5s;"></div>
        </div>
        ${activeDone ? `<button onclick="collectClassMission()" style="width:100%;padding:10px;border:none;border-radius:8px;background:${clsDef.color};color:#fff;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;box-shadow:0 4px 0 ${clsDef.colorDark};">RECOLECTAR RECOMPENSA</button>` : `<div style="text-align:center;font-size:10px;color:#6b7280;">${workingMsg}</div>`}
      </div>
    `;
  }

  const availableRows = CLASS_MISSIONS_NEW.map(m => {
    const isUnlocked = trainerLevel >= m.reqLv;
    const isActiveThis = activeMission && activeMission.id === m.id;

    let actionItem = '';
    if (isActiveThis) {
      actionItem = `
        <div style="margin-top:8px;">
          <div style="background:rgba(0,0,0,0.4);border-radius:4px;height:6px;margin-bottom:6px;overflow:hidden;">
            <div style="background:${activeDone ? clsDef.color : m.color};height:100%;width:${activePct}%;transition:width 0.5s;"></div>
          </div>
          <div style="text-align:center;font-size:9px;color:${activeDone ? clsDef.color : '#9ca3af'};font-weight:bold;">
            ${activeDone ? '¡LISTA PARA COBRAR!' : `PROGRESO: ${activePct}% (${activeRemaining})`}
          </div>
        </div>
      `;
    } else {
      actionItem = `
        <button onclick="startClassMission('${m.id}')" ${!isUnlocked || activeMission ? 'disabled' : ''} 
          style="width:100%;padding:8px;border:none;border-radius:8px;cursor:${isUnlocked && !activeMission ? 'pointer' : 'not-allowed'};background:${isUnlocked && !activeMission ? m.color + '44' : 'rgba(255,255,255,0.05)'};color:${isUnlocked && !activeMission ? '#fff' : '#6b7280'};font-size:10px;font-weight:bold;border:1px solid ${isUnlocked && !activeMission ? m.color : 'transparent'};">
          ${activeMission ? 'OCUPADO' : isUnlocked ? 'INICIAR MISIÓN' : 'BLOQUEADO'}
        </button>
      `;
    }

    return `
    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);opacity:${isUnlocked ? '1' : '0.5'};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:700;color:${isUnlocked ? m.color : '#6b7280'};">⏳ ${m.name}</span>
        <span style="font-size:9px;color:#9ca3af;background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">Lv.${m.reqLv}</span>
      </div>
      <div style="font-size:10px;color:#9ca3af;margin-bottom:10px;line-height:1.4;">
        ${getMissionDescription(m.id, cls)}
      </div>
      ${actionItem}
    </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.id = 'class-missions-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${clsDef.color}44;border-radius:20px;padding:24px;max-width:400px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${clsDef.color};">${clsDef.icon} MISIONES ${clsDef.name.toUpperCase()}</div>
        <button onclick="document.getElementById('class-missions-overlay').remove()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;">✕</button>
      </div>
      
      ${activeHtml}
      
      <div style="font-size:10px;color:#9ca3af;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Disponibles</div>
      ${availableRows}
      
      <div style="margin-top:16px;padding:12px;background:rgba(239, 68, 68, 0.1);border-radius:8px;border:1px solid rgba(239, 68, 68, 0.2);font-size:10px;color:#fca5a5;line-height:1.4;">
        <strong style="color:#ef4444;">⚠️ ATENCIÓN:</strong> Solo puedes tener 1 misión activa a la vez. Los Pokémon enviados a la misión quedarán bloqueados hasta que cobres la recompensa.
      </div>
    </div>`;
  document.body.appendChild(ov);
}

// ── Helpers internos de misiones ────────────────────────────────────────

// Calcula el coste y recompensas de la misión según clase y duración
function getMissionCostInfo(missionId) {
  const m = CLASS_MISSIONS_NEW.find(x => x.id === missionId);
  if (!m) return null;
  const cls = state.playerClass;
  const hs = m.durationHs;

  if (cls === 'cazabichos') {
    const costs = { mission_6h: 5000, mission_12h: 10000, mission_24h: 20000 };
    const ivFloor = { mission_6h: 5, mission_12h: 10, mission_24h: 15 };
    const shinyDiv = { mission_6h: 2, mission_12h: 4, mission_24h: 8 };
    return { type: 'money', cost: costs[missionId], ivFloor: ivFloor[missionId], shinyDiv: shinyDiv[missionId] };
  }
  if (cls === 'rocket') {
    const pokReq = { mission_6h: 1, mission_12h: 2, mission_24h: 3 };
    const mult = { mission_6h: 1.0, mission_12h: 1.3, mission_24h: 1.8 };
    return { type: 'pokemon_sacrifice', pokReq: pokReq[missionId], mult: mult[missionId] };
  }
  if (cls === 'entrenador') {
    const costs = { mission_6h: 5000, mission_12h: 10000, mission_24h: 20000 };
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    const bonusLevel = missionId === 'mission_24h';
    return { type: 'money_pokemon', cost: costs[missionId], blocks: blocks[missionId], bonusLevel };
  }
  if (cls === 'criador') {
    const costs = { mission_6h: 300, mission_12h: 600, mission_24h: 1000 };
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    const vigorSaveChance = missionId === 'mission_24h' ? 0.10 : 0;
    return { type: 'bc_pokemon', cost: costs[missionId], blocks: blocks[missionId], vigorSaveChance };
  }
  return null;
}

// Retorna una descripción amigable según la clase y misión
function getMissionDescription(missionId, cls) {
  if (cls === 'cazabichos') {
    return 'Captura 3 Pokémon Bicho con IVs garantizados y mayor probabilidad de Shiny.';
  }
  if (cls === 'rocket') {
    const mults = { mission_6h: '1.0', mission_12h: '1.3', mission_24h: '1.8' };
    return `Vende Pokémon Veneno en el mercado negro con un multiplicador de ₽ x${mults[missionId] || '1'}.`;
  }
  if (cls === 'entrenador') {
    return `Entrena a un Pokémon para que gane mucha EXP${missionId === 'mission_24h' ? ' y un +1 NV (nivel) extra' : ''}.`;
  }
  if (cls === 'criador') {
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    return `Aumenta ${blocks[missionId]} IVs aleatorios del Pokémon enviado a cambio de Vigor.`;
  }
  return 'Realiza tareas especiales para obtener recompensas de clase.';
}

// Genera 3 Pokémon bicho de rutas desbloqueadas (Cazabichos)
function generateBugNetPokemon(ivFloor, shinyDivisor) {
  const badgeCount = (Array.isArray(state.badges) ? state.badges.length : (parseInt(state.badges) || 0));
  const BUG_TYPES = ['bug'];
  
  // Recopilar todos los Pokémon bicho accesibles
  const accessibleBugs = [];
  FIRE_RED_MAPS.forEach(map => {
    if (map.badges > badgeCount) return;
    const allWild = Object.values(map.wild || {}).flat();
    allWild.forEach(id => {
      const pData = POKEMON_DB[id];
      if (pData && BUG_TYPES.includes(pData.type) && !accessibleBugs.includes(id)) {
        accessibleBugs.push({ id, lv: map.lv });
      }
    });
  });

  if (!accessibleBugs.length) return [];
  
  const shinyRate = Math.floor((GAME_RATIOS?.shinyRate || 4096) / shinyDivisor);
  const results = [];
  for (let i = 0; i < 3; i++) {
    const pick = accessibleBugs[Math.floor(Math.random() * accessibleBugs.length)];
    const level = Math.floor(Math.random() * (pick.lv[1] - pick.lv[0] + 1)) + pick.lv[0];
    const poke = makePokemon(pick.id, level);
    // Aplicar piso de IVs
    if (poke.ivs) {
      ['hp','atk','def','spa','spd','spe'].forEach(stat => {
        if (poke.ivs[stat] < ivFloor) poke.ivs[stat] = ivFloor;
      });
    }
    // Shiny check mejorado
    if (Math.random() < 1 / shinyRate) poke.shiny = true;
    results.push(poke);
  }
  return results;
}

// Calcula el dinero que da el Rocket (por Pokémon)
function calcRocketMissionMoney(pokeList, mult) {
  const subtotal = pokeList.reduce((acc, p) => {
    const totalIvs = Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0);
    const val = 2000 + (p.level * 200) + (totalIvs * 50);
    return acc + val;
  }, 0);
  return Math.floor(subtotal * mult);
}

// ── startClassMission: Abre UI de selección o pago según clase ────────────
function startClassMission(missionId) {
  const cls = state.playerClass;
  if (!cls) return notify('Debes elegir una clase primero.', '⚠️');
  if (state.classData?.activeMission) return notify('Ya tienes una misión activa. Cobrálas antes de iniciar otra.', '⚠️');
  
  const m = CLASS_MISSIONS_NEW.find(x => x.id === missionId);
  if (!m) return;
  const trainerLevel = state.trainerLevel || 1;
  if (trainerLevel < m.reqLv) return notify(`Necesitas nivel ${m.reqLv} de entrenador para esta misión.`, '🔒');

  const info = getMissionCostInfo(missionId);
  if (!info) return;
  const clsDef = PLAYER_CLASSES[cls];

  if (cls === 'cazabichos') {
    // Costo en dinero, sin Pokémon que seleccionar
    if ((state.money || 0) < info.cost) {
      return notify(`Necesitas ₽${info.cost.toLocaleString()} para esta misión.`, '💸');
    }
    state.money -= info.cost;
    _launchMission(missionId, { ivFloor: info.ivFloor, shinyDiv: info.shinyDiv });
    return;
  }

  if (cls === 'rocket') {
    // Mostrar modal de selección de Pokémon tipo Veneno
    _openRocketSacrificeModal(missionId, info);
    return;
  }

  if (cls === 'entrenador') {
    if ((state.money || 0) < info.cost) {
      return notify(`Necesitas ₽${info.cost.toLocaleString()} para esta misión.`, '💸');
    }
    _openPokemonSelectModal(missionId, info, 'entrenador');
    return;
  }

  if (cls === 'criador') {
    if ((state.battleCoins || 0) < info.cost) {
      return notify(`Necesitas ${info.cost} Battle Coins para esta misión.`, '💸');
    }
    _openPokemonSelectModal(missionId, info, 'criador');
    return;
  }
}

// Modal para Rocket: seleccionar Pokémon tipo Veneno para sacrificar
function _openRocketSacrificeModal(missionId, info) {
  document.getElementById('mission-select-overlay')?.remove();
  const clsDef = PLAYER_CLASSES.rocket;
  const poisonBox = (state.box || []).filter((p, idx) => {
    if (p.onMission || p.inDaycare) return false;
    const pData = typeof POKEMON_DB !== 'undefined' ? POKEMON_DB[p.id] : null;
    if (!pData) return false;
    return pData.type === 'poison' || pData.type2 === 'poison';
  });

  let selected = [];

  const renderSelected = () => {
    const el = document.getElementById('rocket-selected-list');
    if (!el) return;
    el.innerHTML = selected.length === 0
      ? `<div style="color:#6b7280;font-size:11px;text-align:center;padding:12px;border:1px dashed #ef444444;border-radius:12px;background:rgba(239,68,68,0.02);">Aún no seleccionaste ningún Pokémon</div>`
      : `<div style="display:flex;flex-direction:column;gap:6px;">` + selected.map((p, i) => {
          const projected = 1000 + (p.level * 100) + (Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0) * 25);
          return `<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(239,68,68,0.1);border-radius:10px;padding:8px 12px;border:1px solid rgba(239,68,68,0.3);">
            <div style="display:flex;align-items:center;gap:8px;">
              <span></span>
              <div>
                <div style="font-size:11px;font-weight:bold;color:#e2e8f0;">${p.name || p.id}</div>
                <div style="font-size:9px;color:#9ca3af;">Nv.${p.level} · <strong style="color:#22c55e;">≈₽${projected.toLocaleString()}</strong></div>
              </div>
            </div>
            <button onclick="_rocketDeselect(${i})" style="background:rgba(239,68,68,0.2);border:none;border-radius:6px;width:24px;height:24px;color:#ef4444;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:0.1s;" onmouseover="this.style.background='rgba(239,68,68,0.4)'" onmouseout="this.style.background='rgba(239,68,68,0.2)'">✕</button>
          </div>`;
        }).join('') + `</div>`;

    const btnConfirm = document.getElementById('rocket-confirm-btn');
    if (btnConfirm) {
      btnConfirm.disabled = selected.length < info.pokReq;
      btnConfirm.style.opacity = selected.length >= info.pokReq ? '1' : '0.4';
    }
    
    // Actualizar estado visual de los botones "Agregar" en la grilla
    document.querySelectorAll('.rocket-add-btn').forEach(btn => {
      const bIdx = parseInt(btn.dataset.idx);
      const p = (state.box || [])[bIdx];
      const isSelected = selected.find(x => x === p);
      if (isSelected) {
        btn.innerHTML = '✓ Sel.';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        btn.style.opacity = '1';
      } else {
        btn.innerHTML = '+ Ag.';
        btn.style.background = 'rgba(239,68,68,0.15)';
        btn.style.color = '#ef4444';
        btn.style.opacity = selected.length >= info.pokReq ? '0.3' : '1';
      }
    });
  };

  window._rocketDeselect = (i) => { selected.splice(i, 1); renderSelected(); };

  // Genera el HTML de una tarjeta Pokémon rica
  const buildCard = (p, realIdx) => {
    const totalIvs = Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0);
    const tags = p.tags || [];
    const spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(p.id, p.isShiny) : '';
    const projected = 1000 + (p.level * 100) + (totalIvs * 25);

    const tagsHtml = tags.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
      ${tags.includes('fav')   ? '<span style="background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">⭐ Fav</span>' : ''}
      ${tags.includes('breed') ? '<span style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">❤️ Crianza</span>' : ''}
      ${tags.includes('iv31')  ? '<span style="background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">31 IV Max</span>' : ''}
    </div>` : '';

    const IV_LABELS = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SpA', spd: 'SpD', spe: 'VEL' };
    const ivBars = Object.entries(p.ivs || {}).filter(([stat]) => IV_LABELS[stat]).map(([stat, val]) => {
      const pct = Math.round((val / 31) * 100);
      const color = val >= 28 ? '#4ade80' : val >= 15 ? '#fbbf24' : '#f87171';
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
        <span style="font-size:9px;color:#6b7280;width:26px;flex-shrink:0;">${IV_LABELS[stat] || stat}</span>
        <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
        </div>
        <span style="font-size:9px;color:${color};width:18px;text-align:right;">${val}</span>
      </div>`;
    }).join('');

    const shinyBadge = p.isShiny ? '<span style="font-size:11px;margin-left:4px;">✨</span>' : '';

    return `<div style="background:#ef44440d;border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px;transition:0.15s;"
        onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.4)'"
        onmouseout="this.style.background='#ef44440d';this.style.borderColor='rgba(239,68,68,0.2)'">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:44px;height:44px;flex-shrink:0;position:relative;">
          ${spriteUrl
            ? `<img src="${spriteUrl}" width="44" height="44" style="image-rendering:pixelated;" onerror="this.style.display='none'">`
            : ''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:bold;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name || p.id}${shinyBadge}</div>
          <div style="font-size:10px;color:#9ca3af;">Nv.${p.level} · ${p.nature || '—'}</div>
          ${tagsHtml}
        </div>
      </div>
      <div style="margin-bottom:8px;">${ivBars}</div>
      <div style="font-size:10px;color:#22c55e;margin-top:6px;font-weight:bold;">💵 Estimado: ≈₽${projected.toLocaleString()}</div>
      
      <div style="display:flex;gap:6px;margin-top:10px;">
        <button onclick="_missionViewDetail(${realIdx},'${missionId}')"
          style="flex:0 0 auto;padding:6px 10px;border:1px solid rgba(239,68,68,0.3);border-radius:8px;background:rgba(255,255,255,0.05);color:#ef4444;font-size:10px;cursor:pointer;transition:0.15s;"
          onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          🔍 Ver
        </button>
        <button onclick="_rocketSelect(${realIdx})" class="rocket-add-btn" data-idx="${realIdx}"
          style="flex:1;padding:6px 10px;border:none;border-radius:8px;background:rgba(239,68,68,0.15);color:#ef4444;font-size:10px;font-weight:bold;cursor:pointer;transition:0.15s;"
          onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter='none'">
          + Ag.
        </button>
      </div>
    </div>`;
  };

  const cardsHtml = poisonBox.length === 0
    ? `<div style="text-align:center;color:#6b7280;padding:24px;font-size:11px;">Tu PC está vacía o no hay Pokémon tipo Veneno disponibles.</div>`
    : poisonBox.map(p => buildCard(p, (state.box || []).indexOf(p))).join('');

  const ov = document.createElement('div');
  ov.id = 'mission-select-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9600;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid #ef444444;border-radius:20px;padding:20px;max-width:440px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-shrink:0;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;">💀 SACRIFICIO ROCKET</div>
        <button onclick="document.getElementById('mission-select-overlay').remove()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:12px;flex-shrink:0;">Selecciona <strong style="color:#ef4444;">${info.pokReq}</strong> Pokémon tipo Veneno para el mercado negro. <strong style="color:#3b82f6;">(Se borrarán de tu PC, los objetos volverán a tu mochila)</strong></div>
      
      <div id="rocket-selected-list" style="margin-bottom:12px;flex-shrink:0;"></div>
      
      <div style="font-size:10px;color:#6b7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:6px;">Tu PC (Tipo Veneno)</div>
      
      <div style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;padding-right:4px;">
        ${cardsHtml}
      </div>
      
      <button id="rocket-confirm-btn" disabled
        onclick="_confirmRocketSacrifice('${missionId}')"
        style="width:100%;margin-top:16px;padding:12px;border:none;border-radius:12px;background:#ef4444;color:#fff;font-family:'Press Start 2P',monospace;font-size:9px;cursor:pointer;opacity:0.4;flex-shrink:0;box-shadow:0 4px 12px rgba(239,68,68,0.3);">
        💀 CONFIRMAR SACRIFICIO
      </button>
    </div>`;
  document.body.appendChild(ov);

  window._missionViewDetail = (boxIdx, mid) => {
    if (typeof showPokemonDetails === 'function') {
      showPokemonDetails((state.box || [])[boxIdx], boxIdx, 'box');
    }
  };

  window._rocketSelect = (boxIdx) => {
    const p = (state.box || [])[boxIdx];
    if (!p) return;
    const isAlreadySelected = selected.find(x => x === p);
    if (isAlreadySelected) {
      // Si ya estaba seleccionado, lo deseleccionamos
      selected = selected.filter(x => x !== p);
      renderSelected();
      return;
    }
    if (selected.length >= info.pokReq) return notify(`Solo podés seleccionar ${info.pokReq} Pokémon.`, '⚠️');
    selected.push(p);
    renderSelected();
  };

  window._confirmRocketSacrifice = (mid) => {
    if (selected.length < info.pokReq) return;
    // Devolver objetos a la mochila
    selected.forEach(p => {
      if (typeof returnHeldItem === 'function') {
        returnHeldItem(p);
      } else if (p.heldItem) {
        state.inventory = state.inventory || {};
        state.inventory[p.heldItem] = (state.inventory[p.heldItem] || 0) + 1;
        p.heldItem = null;
      }
      // Eliminar de box

      const bIdx = (state.box || []).indexOf(p);
      if (bIdx >= 0) state.box.splice(bIdx, 1);
    });
    const money = calcRocketMissionMoney(selected, info.mult);
    document.getElementById('mission-select-overlay')?.remove();
    if (typeof closePokemonDetail === 'function') closePokemonDetail();
    _launchMission(mid, { pendingMoney: money });
    if (typeof renderBox === 'function') renderBox();
    if (typeof updateHud === 'function') updateHud();
  };

  renderSelected();
}

// Modal genérico para Entrenador o Criador: seleccionar 1 Pokémon de la PC o Equipo
function _openPokemonSelectModal(missionId, info, cls) {
  document.getElementById('mission-select-overlay')?.remove();
  const clsDef = PLAYER_CLASSES[cls];
  
  // Asignar UIDs a Pokémon que no lo tengan para evitar problemas de tracking
  [...(state.team || []), ...(state.box || [])].forEach(p => {
    if (!p.uid && typeof getUidStr === 'function') p.uid = getUidStr();
  });
  
  const availTeam = (state.team || []).filter(p => !p.onMission && !p.inDaycare);
  const availBox = (state.box || []).filter(p => !p.onMission && !p.inDaycare);
  const availPokes = [...availTeam, ...availBox];

  const costHtml = cls === 'criador'
    ? `<strong style="color:${clsDef.color};">${info.cost} BC</strong>`
    : `<strong style="color:${clsDef.color};">₽${info.cost.toLocaleString()}</strong>`;

  const rewardHtml = cls === 'criador'
    ? `+${info.blocks} IV aleatorio | -${info.blocks} Vigor${info.vigorSaveChance > 0 ? ' <span style="color:#a855f7;">(10% ahorro)</span>' : ''}`
    : `~${(15000 + 20 * 500) * info.blocks} EXP${info.bonusLevel ? ' + <strong>+1 Nivel</strong>' : ''}`;

  // Estado local de filtros
  window._missionFilter = { search: '', fav: false, breed: false, iv31: false };

  const buildCard = (p) => {
    const totalIvs = Object.values(p.ivs || {}).reduce((s, v) => s + (v || 0), 0);
    const vigor = (p.vigor !== undefined && p.vigor !== null) ? p.vigor : 20;
    const tags = p.tags || [];
    const spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(p.id, p.isShiny) : '';

    const tagsHtml = tags.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
      ${tags.includes('fav')   ? '<span style="background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">⭐ Fav</span>' : ''}
      ${tags.includes('breed') ? '<span style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">❤️ Crianza</span>' : ''}
      ${tags.includes('iv31')  ? '<span style="background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:1px 6px;font-size:10px;">31 IV Max</span>' : ''}
    </div>` : '';

    const IV_LABELS = { hp: 'HP', atk: 'ATK', def: 'DEF', spa: 'SpA', spd: 'SpD', spe: 'VEL' };
    const ivBars = Object.entries(p.ivs || {}).filter(([stat]) => IV_LABELS[stat]).map(([stat, val]) => {
      const pct = Math.round((val / 31) * 100);
      const color = val >= 28 ? '#4ade80' : val >= 15 ? '#fbbf24' : '#f87171';
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
        <span style="font-size:9px;color:#6b7280;width:26px;flex-shrink:0;">${IV_LABELS[stat] || stat}</span>
        <div style="flex:1;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:3px;"></div>
        </div>
        <span style="font-size:9px;color:${color};width:18px;text-align:right;">${val}</span>
      </div>`;
    }).join('');

    const extraInfo = cls === 'criador'
      ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
          <span style="font-size:10px;color:#a855f7;">💧 Vigor: <strong>${vigor}/20</strong></span>
          <span style="margin:0 4px;color:#374151;">|</span>
          <span style="font-size:10px;color:#6b7280;">IV Total: <strong style="color:#e2e8f0;">${totalIvs}/186</strong></span>
        </div>`
      : `<div style="font-size:10px;color:#3b82f6;margin-top:6px;">⚡ ~${(25000 + p.level * 1000) * info.blocks} EXP totales</div>`;

    const shinyBadge = p.isShiny ? '<span style="font-size:11px;margin-left:4px;">✨</span>' : '';

    return `<div style="background:${clsDef.color}0d;border:1px solid ${clsDef.color}33;border-radius:12px;padding:12px;transition:0.15s;"
        onmouseover="this.style.background='${clsDef.color}20';this.style.borderColor='${clsDef.color}66'"
        onmouseout="this.style.background='${clsDef.color}0d';this.style.borderColor='${clsDef.color}33'">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:44px;height:44px;flex-shrink:0;position:relative;">
          ${spriteUrl
            ? `<img src="${spriteUrl}" width="44" height="44" style="image-rendering:pixelated;" onerror="this.style.display='none'">`
            : ''}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:bold;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name || p.id}${shinyBadge}</div>
          <div style="font-size:10px;color:#9ca3af;">Nv.${p.level} · ${p.nature || '—'}</div>
          ${tagsHtml}
        </div>
      </div>
      <div style="margin-bottom:8px;">${ivBars}</div>
      ${extraInfo}
      <div style="display:flex;gap:6px;margin-top:10px;">
        <button onclick="_confirmPokemonSelect('${p.uid}','${missionId}')"
          style="flex:1;padding:6px 10px;border:none;border-radius:8px;background:${clsDef.color};color:#fff;font-size:10px;font-weight:bold;cursor:pointer;transition:0.15s;"
          onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          ✓ Enviar a misión
        </button>
      </div>
    </div>`;
  };

  const ov = document.createElement('div');
  ov.id = 'mission-select-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9600;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${clsDef.color}44;border-radius:20px;padding:20px;max-width:440px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;">
        <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:${clsDef.color};">${clsDef.icon || ''} SELECCIONAR PARA MISIÓN</div>
        <button onclick="document.getElementById('mission-select-overlay').remove()" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;line-height:1;">✕</button>
      </div>
      <!-- Coste y recompensa -->
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.06);font-size:11px;color:#9ca3af;line-height:1.7;flex-shrink:0;">
        💰 Costo: ${costHtml}&nbsp;&nbsp;·&nbsp;&nbsp;🎁 Recompensa: ${rewardHtml}
      </div>
      
      <!-- FILTROS -->
      <div style="margin-bottom:12px;flex-shrink:0;background:rgba(255,255,255,0.02);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
        <input type="text" id="mission-pokes-filter-name" placeholder="Buscar por nombre..." 
          style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);padding:10px;border-radius:8px;color:#fff;font-size:11px;margin-bottom:8px;outline:none;"
          oninput="window._updateMissionPokemonList_internal()">
        
        <div style="display:flex;gap:6px;">
          <button id="btn-mfilter-fav" onclick="window._toggleMissionFilter('fav')" style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(251,191,36,0.2);border-radius:8px;background:rgba(251,191,36,0.05);color:#fbbf24;cursor:pointer;transition:0.15s;">⭐ Fav</button>
          <button id="btn-mfilter-breed" onclick="window._toggleMissionFilter('breed')" style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(239,68,68,0.2);border-radius:8px;background:rgba(239,68,68,0.05);color:#f87171;cursor:pointer;transition:0.15s;">❤️ Crianza</button>
          <button id="btn-mfilter-iv31" onclick="window._toggleMissionFilter('iv31')" style="flex:1;padding:6px;font-size:9px;border:1px solid rgba(34,197,94,0.2);border-radius:8px;background:rgba(34,197,94,0.05);color:#4ade80;cursor:pointer;transition:0.15s;">🧬 IV 31</button>
        </div>
      </div>

      <!-- Pokémon cards container -->
      <div id="mission-pokes-list" style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;padding-right:4px;">
        <!-- Se rellena dinámicamente -->
      </div>
    </div>`;
  document.body.appendChild(ov);

  // Lógica de filtrado y renderizado
  window._updateMissionPokemonList_internal = () => {
    const listEl = document.getElementById('mission-pokes-list');
    if (!listEl) return;
    const f = window._missionFilter;
    const nameQuery = document.getElementById('mission-pokes-filter-name')?.value.toLowerCase().trim() || '';
    
    const filtered = availPokes.filter(p => {
      if (nameQuery && !p.name.toLowerCase().includes(nameQuery) && !p.id.toLowerCase().includes(nameQuery)) return false;
      const tags = p.tags || [];
      if (f.fav && !tags.includes('fav')) return false;
      if (f.breed && !tags.includes('breed')) return false;
      if (f.iv31 && !tags.includes('iv31')) return false;
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="text-align:center;color:#6b7280;padding:24px;font-size:11px;">No se encontraron Pokémon con los filtros actuales.</div>`;
    } else {
      listEl.innerHTML = filtered.map(p => buildCard(p)).join('');
    }

    // Update buttons style
    const updateBtn = (id, active, color) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.background = active ? color : 'rgba(255,255,255,0.05)';
        el.style.color = active ? '#fff' : color;
        el.style.border = active ? `1px solid ${color}` : `1px solid rgba(255,255,255,0.1)`;
      }
    };
    updateBtn('btn-mfilter-fav', f.fav, '#fbbf24');
    updateBtn('btn-mfilter-breed', f.breed, '#f87171');
    updateBtn('btn-mfilter-iv31', f.iv31, '#4ade80');
  };

  window._toggleMissionFilter = (key) => {
    window._missionFilter[key] = !window._missionFilter[key];
    window._updateMissionPokemonList_internal();
  };

  // Inicializar lista
  window._updateMissionPokemonList_internal();

  // Ver detalles completos (sin cerrar el selector)
  window._missionViewDetail = (uid) => {
    const p = (state.team || []).find(x => x.uid === uid) || (state.box || []).find(x => x.uid === uid);
    if (!p) return;
    if (typeof showPokemonDetails === 'function') {
      // Pasamos un índice temporal 0 y 'box' solo por el argumento, 
      // pero showPokemonDetails usa la referencia interna del Pokémon
      showPokemonDetails(p, 0, 'box');
    }
  };

  window._confirmPokemonSelect = (uid, mid) => {
    const p = (state.team || []).find(x => x.uid === uid) || (state.box || []).find(x => x.uid === uid);
    if (!p) return;
    const info2 = getMissionCostInfo(mid);

    if (cls === 'entrenador') {
      state.money = (state.money || 0) - info2.cost;
    } else if (cls === 'criador') {
      state.battleCoins = (state.battleCoins || 0) - info2.cost;
    }

    // Si el Pokémon está en el equipo, moverlo a la caja (PC) para evitar uso en combate
    const teamIdx = (state.team || []).indexOf(p);
    if (teamIdx !== -1) {
      if (state.team.length <= 1) {
        return notify('No puedes enviar a tu último Pokémon del equipo a una misión.', '⚠️');
      }
      state.team.splice(teamIdx, 1);
      state.box.push(p);
      notify(`¡${p.name || p.id} se movió a la Caja para su misión!`, '📦');
    }

    p.onMission = true;
    // Cerrar tanto el selector como el panel de detalles si está abierto
    document.getElementById('mission-select-overlay')?.remove();
    if (typeof closePokemonDetail === 'function') closePokemonDetail();
    _launchMission(mid, { pokeUid: p.uid, pokeName: p.name || p.id });
    
    // Persistir inmediatamente para que un reload no pierda el flag onMission
    if (typeof scheduleSave === 'function') scheduleSave();
    if (typeof updateHud === 'function') updateHud();
    if (typeof renderTeam === 'function') renderTeam();
    if (typeof renderBox === 'function') renderBox();
    if (typeof updateProfilePanel === 'function') updateProfilePanel();
  };
}


// Inicia la misión en state y actualiza el HUD
function _launchMission(missionId, extraData = {}) {
  const m = CLASS_MISSIONS_NEW.find(x => x.id === missionId);
  if (!m) return;
  state.classData = state.classData || {};
  state.classData.activeMission = {
    id: missionId,
    startedAt: Date.now(),
    endsAt: Date.now() + (m.durationHs * 3600 * 1000),
    ...extraData
  };
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateClassHud === 'function') updateClassHud();
  notify(`¡Misión iniciada! (${m.durationHs}h)`, '📋');
  openClassMissionsPanel();
}

function _applyTrainerMissionProgress(pokemon, expAmount, bonusLevels = 0) {
  const result = {
    levelsFromExp: 0,
    bonusLevels: 0,
    blockedByEverstone: false,
    pendingMoves: []
  };
  if (!pokemon || (pokemon.level || 1) >= 100) return result;

  const safeExp = Math.max(0, Math.floor(expAmount || 0));
  if (!Number.isFinite(pokemon.expNeeded) || pokemon.expNeeded <= 0) {
    pokemon.expNeeded = (typeof getExpNeeded === 'function') ? getExpNeeded(pokemon.level || 1) : Infinity;
  }

  pokemon.exp = (pokemon.exp || 0) + safeExp;
  let needed = pokemon.expNeeded;

  while (pokemon.exp >= needed && pokemon.level < 100) {
    if (typeof isLevelBlockedByEverstone === 'function' && isLevelBlockedByEverstone(pokemon)) {
      result.blockedByEverstone = true;
      break;
    }
    pokemon.exp -= needed;
    const pending = levelUpPokemon(pokemon);
    if (pending === null) {
      result.blockedByEverstone = true;
      break;
    }
    result.levelsFromExp++;
    if (Array.isArray(pending) && pending.length > 0) {
      pending.forEach(move => result.pendingMoves.push({ pokemon: pokemon, move: move }));
    }
    needed = pokemon.expNeeded;
  }

  for (let i = 0; i < bonusLevels && pokemon.level < 100; i++) {
    if (typeof isLevelBlockedByEverstone === 'function' && isLevelBlockedByEverstone(pokemon)) {
      result.blockedByEverstone = true;
      break;
    }
    const pending = levelUpPokemon(pokemon);
    if (pending === null) {
      result.blockedByEverstone = true;
      break;
    }
    result.bonusLevels++;
    if (Array.isArray(pending) && pending.length > 0) {
      pending.forEach(move => result.pendingMoves.push({ pokemon: pokemon, move: move }));
    }
  }

  return result;
}

// ── collectClassMission: Cobrar recompensas al terminar ──────────────────
function collectClassMission() {
  const cls = state.playerClass;
  if (!cls) return;
  const am = state.classData?.activeMission;
  if (!am) return;
  if (Date.now() < am.endsAt) return notify('¡La misión aún no ha terminado!', '⏳');

  const m = CLASS_MISSIONS_NEW.find(x => x.id === am.id);
  if (!m) return;
  const info = getMissionCostInfo(am.id);

  // Intentar encontrar al Pokémon por UID en la Caja (o Equipo, por si acaso)
  const p = (state.box || []).find(x => x.uid === am.pokeUid) || (state.team || []).find(x => x.uid === am.pokeUid);

  let notifMsg = '⚠️ Misión completada.';
  let notifIcon = '📋';

  if (cls === 'cazabichos') {
    const pokemons = generateBugNetPokemon(am.ivFloor || 5, am.shinyDiv || 2);
    state.box = state.box || [];
    state.box.push(...pokemons);
    const shinyCount = pokemons.filter(p => p.shiny).length;
    notifMsg = `¡Red recogida! Capturaste ${pokemons.length} Pokémon${shinyCount > 0 ? ` (¡${shinyCount} SHINY!)` : ''}.`;
    notifIcon = shinyCount > 0 ? '✨' : '🦋';
    addClassXP(30 * m.durationHs / 6);

  } else if (cls === 'rocket') {
    const earned = am.pendingMoney || 0;
    state.money = (state.money || 0) + earned;
    notifMsg = `¡Extorsión completada! +₽${earned.toLocaleString()}`;
    notifIcon = '🚀';
    addClassXP(40 * m.durationHs / 6);
    addCriminality(5 * m.durationHs / 6);

  } else if (cls === 'entrenador') {
    if (p) {
      const expBlocks = info?.blocks || 1;
      const expGained = expBlocks * (25000 + (p.level * 1000));
      const bonusLevels = am.id === 'mission_24h' ? 1 : 0;
      const progress = _applyTrainerMissionProgress(p, expGained, bonusLevels);
      const totalLevels = progress.levelsFromExp + progress.bonusLevels;
      const pokeName = am.pokeName || p.name || p.id || 'Tu Pokemon';

      if (totalLevels > 0) {
        notifMsg = `¡${pokeName} ganó +${expGained.toLocaleString()} EXP y subió ${totalLevels} nivel${totalLevels !== 1 ? 'es' : ''}!`;
      } else {
        notifMsg = `¡${pokeName} ganó +${expGained.toLocaleString()} EXP!`;
      }

      if (progress.blockedByEverstone) {
        notifMsg += ' Tu Pokemon no subio de nivel porque lleva Piedra Eterna.';
      }

      if (progress.pendingMoves.length > 0 && typeof processLearnMoveQueue === 'function') {
        setTimeout(() => processLearnMoveQueue(progress.pendingMoves, () => {}), 250);
      }

      p.onMission = false;
    } else {
      notifMsg = '¡Entrenamiento completado!';
    }
    notifIcon = '🏅';
    addClassXP(30 * m.durationHs / 6);
    if (typeof updateHud === 'function') updateHud();

  } else if (cls === 'criador') {
    if (p) {
      const blocks = info?.blocks || 1;
      const vigorSaveChance = info?.vigorSaveChance || 0;
      const IV_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
      let ivGained = 0;
      let vigorLost = 0;
      const vigor = (p.vigor !== undefined && p.vigor !== null) ? p.vigor : 20;
      let currentVigor = vigor;
      
      for (let block = 0; block < blocks; block++) {
        if (currentVigor <= 0) break; // Sin vigor, no sube IVs
        
        // Buscar stat que no esté en 31 (intentos aumentados a 12 para asegurar acierto)
        let attempts = 0;
        let gained = false;
        while (attempts < 12 && !gained) {
          const stat = IV_STATS[Math.floor(Math.random() * IV_STATS.length)];
          p.ivs = p.ivs || {};
          if ((p.ivs[stat] || 0) < 31) {
            p.ivs[stat] = (p.ivs[stat] || 0) + 1;
            ivGained++;
            gained = true;
          }
          attempts++;
        }
        // Consumir Vigor (con chance de ahorro en 24h)
        if (Math.random() >= vigorSaveChance) {
          currentVigor--;
          vigorLost++;
        }
      }
      p.vigor = currentVigor;
      p.onMission = false;
      notifMsg = `¡Laboratorio: ${am.pokeName} ganó +${ivGained} IV${ivGained !== 1 ? 's' : ''} (-${vigorLost} Vigor)!`;
      notifIcon = '🧬';
    } else {
      notifMsg = '¡Investigación completada!';
    }
    addClassXP(20 * m.durationHs / 6);
  }

  state.classData.activeMission = null;
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateClassHud === 'function') updateClassHud();
  if (typeof renderBox === 'function') renderBox();
  if (typeof renderTeam === 'function') renderTeam();
  notify(notifMsg, notifIcon);
  openClassMissionsPanel();
}

function processOfflineClassMissions() {
  const am = state.classData?.activeMission;
  if (!am || Date.now() < am.endsAt) return;
  
  const cls = state.playerClass;
  if (!cls) return;
  const m = CLASS_MISSIONS_NEW.find(x => x.id === am.id);
  if (!m) return;
  const info = getMissionCostInfo(am.id);

  // Liberar el Pokémon si había uno bloqueado (usando UID o fallback de Index antiguo)
  const p = (state.box || []).find(x => x.uid === am.pokeUid) || 
            (state.team || []).find(x => x.uid === am.pokeUid) ||
            (am.pokeBoxIdx !== undefined ? (state.box || [])[am.pokeBoxIdx] : null);
  
  if (p) p.onMission = false;

  let notifMsg = 'Misión completada mientras estabas fuera.';
  if (cls === 'cazabichos') {
    const pokemons = generateBugNetPokemon(am.ivFloor || 5, am.shinyDiv || 2);
    state.box = state.box || [];
    state.box.push(...pokemons);
    const shinyCount = pokemons.filter(p => p.shiny).length;
    notifMsg = `📬 Red recogida: +${pokemons.length} Pokémon${shinyCount > 0 ? ` (${shinyCount} SHINY!)` : ''}.`;
  } else if (cls === 'rocket') {
    const earned = am.pendingMoney || 0;
    state.money = (state.money || 0) + earned;
    notifMsg = `📬 Extorsión offline: +₽${earned.toLocaleString()}.`;
  } else if (cls === 'entrenador') {
    if (p) {
      const expBlocks = info?.blocks || 1;
      const expGained = expBlocks * (15000 + (p.level * 500));
      const bonusLevels = am.id === 'mission_24h' ? 1 : 0;
      const progress = _applyTrainerMissionProgress(p, expGained, bonusLevels);
      const totalLevels = progress.levelsFromExp + progress.bonusLevels;
      const pokeName = am.pokeName || p.name || p.id || 'Tu Pokemon';

      notifMsg = `📬 ${pokeName} ganó EXP mientras no estabas`;
      if (totalLevels > 0) {
        notifMsg += ` y subió ${totalLevels} nivel${totalLevels !== 1 ? 'es' : ''}`;
      }
      if (progress.blockedByEverstone) {
        notifMsg += '. Tu Pokemon no subio de nivel porque lleva Piedra Eterna.';
      } else {
        notifMsg += '.';
      }

      if (progress.pendingMoves.length > 0 && typeof processLearnMoveQueue === 'function') {
        setTimeout(() => processLearnMoveQueue(progress.pendingMoves, () => {}), 250);
      }
    }
  } else if (cls === 'criador') {
    if (p) {
      const blocks = info?.blocks || 1;
      const vigorSaveChance = info?.vigorSaveChance || 0;
      const IV_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
      let ivGained = 0;
      let currentVigor = (p.vigor !== undefined && p.vigor !== null) ? p.vigor : 20;
      for (let block = 0; block < blocks; block++) {
        if (currentVigor <= 0) break;
        let attempts = 0, gained = false;
        while (attempts < 6 && !gained) {
          const stat = IV_STATS[Math.floor(Math.random() * IV_STATS.length)];
          p.ivs = p.ivs || {};
          if ((p.ivs[stat] || 0) < 31) { p.ivs[stat]++; ivGained++; gained = true; }
          attempts++;
        }
        if (Math.random() >= vigorSaveChance) currentVigor--;
      }
      p.vigor = currentVigor;
      notifMsg = `📬 ${am.pokeName || 'Tu Pokémon'} ganó +${ivGained} IV${ivGained !== 1 ? 's' : ''} en el laboratorio.`;
    }
  }

  state.classData.activeMission = null;
  addClassXP(15);
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateClassHud === 'function') updateClassHud();
  notify(notifMsg, '📬');
}

// ── Tienda de Reputación (Entrenador) ────────────────────────────────────
const REPUTATION_SHOP_ITEMS = [
  { id: 'rep_ultra_ball', name: 'Ultra Ball x3', cost: 20, icon: '🔵', desc: 'Tres Ultra Balls de la tienda oficial del Gimnasio.', grant: () => { state.inventory['Ultra Ball'] = (state.inventory['Ultra Ball'] || 0) + 3; state.balls += 6; } },
  { id: 'rep_tm_earthquake', name: 'MT26 Terremoto', cost: 80, icon: '🌋', desc: 'El poderoso movimiento Terremoto en formato MT.', grant: () => { state.inventory['MT26 Terremoto'] = (state.inventory['MT26 Terremoto'] || 0) + 1; } },
  { id: 'rep_revive', name: 'Revivir x5', cost: 30, icon: '💊', desc: 'Cinco Revivires del botiquín de los Gimnasios.', grant: () => { state.inventory['Revivir'] = (state.inventory['Revivir'] || 0) + 5; } },
  { id: 'rep_full_heal', name: 'Cura Total x3', cost: 25, icon: '✨', desc: 'Tres Cura Total para sanar cualquier estado alterado.', grant: () => { state.inventory['Cura Total'] = (state.inventory['Cura Total'] || 0) + 3; } },
  { id: 'rep_iv_scanner', name: 'Escáner de IVs', cost: 100, icon: '🔍', desc: 'Radar avanzado: Revela los IVs totales de los rivales salvajes durante 1 hora.', grant: () => { state.inventory['Escáner de IVs'] = (state.inventory['Escáner de IVs'] || 0) + 1; } },
  { id: 'rep_star_piece', name: 'Trozo Estrella x3', cost: 60, icon: '⭐', desc: 'Tres trozos de estrella de valor extraordinario.', grant: () => { state.inventory['Trozo Estrella'] = (state.inventory['Trozo Estrella'] || 0) + 3; } },
];

function openReputationShop() {
  if (state.playerClass !== 'entrenador') return notify('Solo disponible para Entrenadores.', '⚠️');
  document.getElementById('rep-shop-overlay')?.remove();
  const rep = state.classData?.reputation || 0;
  const cls = PLAYER_CLASSES.entrenador;

  // Ordenar por costo (menor a mayor)
  const sortedItems = [...REPUTATION_SHOP_ITEMS].sort((a, b) => a.cost - b.cost);

  const rows = sortedItems.map(item => {
    const canAfford = rep >= item.cost;
    
    // Buscar sprite en SHOP_ITEMS
    const baseName = item.name.split(' x')[0];
    const shopItem = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(si => si.name === baseName) : null;
    const spriteUrl = shopItem?.sprite || '';

    return `
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.08);display:flex;gap:12px;align-items:center;">
      <div style="width:44px;height:44px;flex-shrink:0;background:rgba(255,255,255,0.03);border-radius:10px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
        ${spriteUrl 
          ? `<img src="${spriteUrl}" width="32" height="32" style="image-rendering:pixelated;" onerror="this.style.display='none'">`
          : ''}
        <span style="font-size:24px;">${item.icon}</span>
      </div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
          <span style="font-size:13px;font-weight:700;color:#f8fafc;">${item.name}</span>
          <span style="font-size:11px;font-weight:700;color:${canAfford ? cls.color : '#6b7280'};">${item.cost} ⭐ REP</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;line-height:1.4;">${item.desc}</div>
        <button onclick="buyReputationItem('${item.id}')" ${canAfford ? '' : 'disabled'} 
          style="width:100%;padding:8px;border:none;border-radius:10px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
            background:${canAfford ? cls.color + '22' : 'rgba(255,255,255,0.04)'};
            color:${canAfford ? cls.color : '#4b5563'};font-size:10px;font-weight:700;
            border:1px solid ${canAfford ? cls.color + '44' : 'transparent'};
            transition:0.2s;">
          ${canAfford ? 'CANJEAR' : 'SIN REPUTACIÓN'}
        </button>
      </div>
    </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.id = 'rep-shop-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:3000;display:flex;align-items:center;justify-content:center;padding:12px;';
  ov.innerHTML = `
    <div style="background:#0f172a;border:1px solid ${cls.color}44;border-radius:20px;padding:20px;max-width:420px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
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
  // Limpieza de misiones fantasma: si no hay misión activa rastreando un UID, desbloquear todos los Pokémon
  const activeMission = state.classData?.activeMission;
  const activeUid = activeMission?.pokeUid;
  let ghostsCleaned = false;
  
  // Revisar Box y Equipo
  [...(state.team || []), ...(state.box || [])].forEach(p => {
    if (!p.uid && typeof getUidStr === 'function') p.uid = getUidStr(); // Auto-fix
    if (p.onMission && p.uid !== activeUid) {
      p.onMission = false;
      ghostsCleaned = true;
      console.log(`[CLASES] Pokémon desbloqueado (misión fantasma): ${p.name || p.id}`);
    }
  });

  if (ghostsCleaned && typeof scheduleSave === 'function') {
    scheduleSave();
  }

  updateClassHud();
  checkClassUnlock();
  processOfflineClassMissions();
  console.log('[CLASES] Sistema de clases inicializado.');
}

// ── Helpers XP de clase y criminalidad ───────────────────────────────────
/**
 * Otorga XP de clase (classXP en state), sin afectar el nivel de entrenador.
 * Se usa internamente por las misiones idle.
 */
function addClassXP(amount) {
  if (!amount || amount <= 0) return;
  state.classXP = (state.classXP || 0) + amount;
  // Puede extenderse más adelante para subir nivel de clase
  if (typeof scheduleSave === 'function') scheduleSave();
}

/**
 * Incrementa el contador de criminalidad del Rocket.
 * Se usa internamente al cobrar misiones de extorsión.
 */
function addCriminality(amount) {
  if (!amount || amount <= 0) return;
  state.classData = state.classData || {};
  state.classData.criminality = (state.classData.criminality || 0) + amount;
  if (typeof updateCriminalityBar === 'function') updateCriminalityBar();
  if (typeof scheduleSave === 'function') scheduleSave();
}
