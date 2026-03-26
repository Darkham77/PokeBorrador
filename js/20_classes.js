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
    bonusLevels: [1, 1, 10, 20],
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
      catchMult: 1.0,
      shopDiscount: 0.20
    },
    technicalBonuses: [
      "Venta directa en PC: ₽500 + (Nivel Seleccionado x 10). Pokémon de Tier alta dan bonos extra.",
      "15% de probabilidad base. Escala a 30% al alcanzar el nivel 15 de clase. Solo vs Entrenadores NPC.",
      "Aplica un modificador de x0.80 al precio de todos los objetos en la Tienda del Entrenador.",
      "Misiones que generan ingresos y objetos de contrabando de forma pasiva mientras juegas."
    ],
    technicalPenalties: [
      "El servicio de enfermería básico tiene un recargo del 100% (x2) por ser miembro del Team Rocket.",
      "Tus patrocinadores te dan un 10% menos de Battle Coins por batalla debido a tu mala reputación.",
      "Los PokéMart oficiales detectan tu afiliación y aplican un recargo del +20% en todos los precios."
    ]
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
      '🐝 Aroma Atractivo: Chance de atraer Pokémon raros (Scyther/Pinsir) al caminar.',
      '🕸️ Red Maestra: 20% de capturar un segundo ejemplar de tipo Bicho (2x1).'
    ],
    bonusLevels: [1, 1, 10, 20],
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
      "Cada captura del mismo tipo suma +1 racha. +1 racha = +2% Shiny rate y +5 IVs garantizados (máx 3 acumulaciones).",
      "Bono de +5% de Catch Rate por cada Pokémon tipo Bicho en tu equipo activo de 6. (Bonificador máximo: +20%).",
      "Probabilidad de 0.5% por paso en hierba alta de forzar la aparición de un Pokémon raro (Scyther/Pinsir).",
      "Al capturar un Pokémon tipo Bicho, hay un 20% de probabilidad de recibir un segundo ejemplar idéntico en la caja."
    ],
    technicalPenalties: [
      "Tu enfoque en la naturaleza te hace menos eficiente entrenando contra otros humanos (x0.80 EXP).",
      "Los premios en metálico se reducen un 15% debido a tu falta de patrocinio oficial.",
      "La infraestructura de la guardería no está adaptada para tus métodos de crianza rústicos (x1.50 costo)."
    ]
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
      '⭐ Sistema de Reputación: desbloquea tienda exclusiva al acumular victorias en gym',
      '🏋️ Entrenamiento de Gimnasio Pasivo: misiones idle de 2/4/8h con EXP'
    ],
    bonusLevels: [1, 1, 10, 20],
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
      "Ganas 10 REP por cada victoria en Gimnasio. La reputación es una moneda para comprar ítems exclusivos.",
      "Misiones pasivas que otorgan grandes cantidades de EXP a tu nivel de entrenador mientras no estas en batalla."
    ],
    technicalPenalties: [
      "Tu ética profesional te impide capturar Pokémon genéticamente perfectos con facilidad (-10% Catch Rate si IV > 120).",
      "Prefieres el entrenamiento en campo; el mantenimiento en guardería te resulta más costoso (x1.50).",
      "Como figura pública, no puedes ser visto operando en mercados de dudosa legalidad."
    ]
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
      '🥚 Lazo Destino: Hereda 4 IVs aleatorios de los padres en lugar de 3.',
      '❤️ Vigor: 15% de chance de recuperar vigor tras eclosionar.',
      '👁️ Predecir Naturaleza: Permite ver la naturaleza del Pokémon rival en batalla.',
      '🏪 Mercado de Crías: venta automática de Pokémon criados',
      '🥚 Incubación Asistida: misiones idle de 4/8/12h que mejoran IVs'
    ],
    bonusLevels: [1, 1, 5, 5, 15, 20],
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
    },
    technicalBonuses: [
      "Al criar, se eligen 4 IVs aleatorios de entre los 12 disponibles de los padres (normalmente son solo 3).",
      "El contador de pasos requerido para que un huevo eclosione se reduce en un 25%.",
      "Cada eclosión tiene un 15% de posibilidad de devolver 1 punto de vigor a uno de los padres en la guardería.",
      "Muestra la Naturaleza (Modificadores de Stats) del Pokémon rival directamente en el HUD de batalla.",
      "Interfaz opcional en la Guardería que vende automáticamente los huevos por ₽1000 + 75% del costo de cría.",
      "Misiones pasivas de larga duración que garantizan mejores IVs mínimos para los huevos generados."
    ],
    technicalPenalties: [
      "Tu tiempo invertido en la genética reduce tu eficiencia en el entrenamiento de combate activo (-10% EXP).",
      "Cuesta un 50% más (x1.5) curar Pokémon que no tengan tu ID de entrenador original (Pokémon intercambiados).",
      "Tu dedicación a la crianza pura te aleja de los círculos de contrabando del Mercado Negro."
    ]
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

  state.playerClass = classId;
  state.classLevel = 1;
  state.classXP = 0;
  state.classData = state.classData || {};
  state.classData.captureStreak = 0;
  state.classData.longestStreak = 0;
  state.classData.reputationPoints = state.classData.reputationPoints || 0;
  state.classData.blackMarketSales = state.classData.blackMarketSales || 0;
  state.classData.criminality = state.classData.criminality || 0;

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
          ${isActive ? '✓ CLASE ACTUAL' : (isChange ? '🔄 CAMBIAR (10,000 BC)' : '▶ ELEGIR')}
        </button>
      </div>`;
  }).join('');

  modal.innerHTML = `
    <div style="width:100%;max-width:960px;padding-top:20px;padding-bottom:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:16px;color:#f59e0b;margin-bottom:8px;">
          🎭 ELEGÍ TU CLASE
        </div>
        <div style="font-size:13px;color:#9ca3af;padding:0 10px;">
          ${isChange ? 'Cambiar de clase cuesta <strong style="color:#f59e0b;">10,000 Battle Coins</strong>.' : 'Esta elección define cómo jugás. Podés cambiar más adelante por 10,000 Battle Coins.'}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
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
          <div style="font-size:13px;color:${textColor};line-height:1.4;display:flex;align-items:center;">
            ${bonus}
            ${reqLevel > 1 ? `<span style="font-size:9px;color:${unlocked ? cls.color : '#4b5563'};background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:6px;margin-left:8px;font-family:'Press Start 2P',monospace;">Nv.${reqLevel}</span>` : ''}
            <div class="class-tooltip">
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
        <div style="flex:1;font-size:13px;color:#f87171;line-height:1.4;display:flex;align-items:center;">
          ${p}
          <div class="class-tooltip">
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
    display:flex;align-items:center;justify-content:center;
    padding:16px;animation:fadeIn 0.2s;overflow-y:auto;
  `;

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
    </style>

    <div style="background:#111827;border-radius:24px;padding:32px;width:100%;max-width:650px;border:1px solid ${cls.color}33;box-shadow:0 25px 50px -12px rgba(0,0,0,0.8);position:relative;">
      
      <!-- Close Button -->
      <button onclick="document.getElementById('class-info-panel-overlay').remove()"
        style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.05);border:none;color:#9ca3af;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;transition:0.2s;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'"
        onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#9ca3af'">✕</button>

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:24px;margin-bottom:32px;">
        <div style="width:90px;height:90px;background:linear-gradient(135deg,${cls.color}22,${cls.colorDark}44);border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:54px;border:1px solid ${cls.color}44;box-shadow:0 8px 16px rgba(0,0,0,0.2);">
          ${cls.icon}
        </div>
        <div style="flex:1;">
          <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:${cls.color};margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">${cls.name}</div>
          <div style="font-size:13px;color:#9ca3af;line-height:1.6;max-width:400px;font-style:italic;">"${cls.description}"</div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:16px;display:flex;align-items:center;gap:16px;">
          <div style="width:48px;height:48px;background:${cls.color}15;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">🎖️</div>
          <div>
            <div style="font-size:9px;color:#6b7280;margin-bottom:2px;font-family:'Press Start 2P',monospace;">NIVEL ENTRENADOR</div>
            <div style="font-size:24px;font-weight:900;color:${cls.color};">Nv. ${trainerLevel}</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:16px;display:flex;align-items:center;gap:16px;">
          <div style="width:48px;height:48px;background:#eab30815;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;">✨</div>
          <div>
            <div style="font-size:9px;color:#6b7280;margin-bottom:2px;font-family:'Press Start 2P',monospace;">RANGO ACTUAL</div>
            <div style="font-size:14px;font-weight:700;color:#eab308;text-transform:uppercase;">${getTrainerRank().title}</div>
          </div>
        </div>
      </div>

      <!-- Tabs / Sections -->
      <div style="display:grid;grid-template-columns:1fr;gap:24px;">
        <!-- Bonos -->
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:16px;background:#22c55e;border-radius:2px;"></div>
            <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:#22c55e;letter-spacing:1px;">HABILIDADES DE CLASE</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:10px;">${bonusesHtml}</div>
        </div>

        <!-- Penalizaciones -->
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div style="width:4px;height:16px;background:#ef4444;border-radius:2px;"></div>
            <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;letter-spacing:1px;">LIMITACIONES</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:10px;">${penaltiesHtml}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top:32px;display:flex;flex-direction:column;gap:12px;border-top:1px solid rgba(255,255,255,0.05);padding-top:24px;">
        ${state.playerClass === 'entrenador' ? `
        <button onclick="document.getElementById('class-info-panel-overlay').remove();openReputationShop()"
          style="width:100%;padding:18px;border:none;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;box-shadow:0 6px 0 #14532d;transition:0.2s;"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 0 #14532d'"
          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 0 #14532d'">
          🏅 TIENDA DE REPUTACIÓN
        </button>` : ''}
        
        <div style="display:flex;gap:12px;">
          <button onclick="document.getElementById('class-info-panel-overlay').remove();openClassModal(false)"
            style="flex:1;padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:rgba(255,255,255,0.03);color:#9ca3af;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;transition:0.2s;"
            onmouseover="this.style.background='rgba(255,255,255,0.05)';this.style.color='#fff'"
            onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#9ca3af'">
            🔄 CAMBIAR CLASE<br><span style="color:#f59e0b;font-size:7px;">10,000 BC</span>
          </button>
          <button onclick="document.getElementById('class-info-panel-overlay').remove()"
            style="flex:1;padding:14px;border:none;border-radius:16px;background:linear-gradient(135deg,${cls.color},${cls.colorDark});color:#fff;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;box-shadow:0 6px 0 ${cls.colorDark}99;transition:0.2s;"
            onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 0 ${cls.colorDark}aa'"
            onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 0 ${cls.colorDark}99'">
            ✓ ENTENDIDO
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(ov);
}

// ── HUD de clase: actualiza el panel del entrenador ───────────────────────
function updateClassHud() {
  // Eliminar badge flotante viejo si existe
  const oldBadge = document.getElementById('class-hud-badge');
  if (oldBadge) oldBadge.remove();

  const label = document.getElementById('hud-class-label');
  const avatar = document.getElementById('hud-class-avatar');

  if (!state.playerClass) {
    if (label) label.style.display = 'none';
    if (avatar) avatar.textContent = '🧢';
    updateCriminalityBar();
    return;
  }

  const cls = PLAYER_CLASSES[state.playerClass];

  if (avatar) avatar.textContent = cls.icon;

  if (label) {
    label.style.display = 'block';
    label.style.color = cls.color;
    label.textContent = cls.name;
  }
  
  updateCriminalityBar();
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
  const price = Math.floor((pokemon.level * 50 + (totalIv / 186) * 500) * 0.8);

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
