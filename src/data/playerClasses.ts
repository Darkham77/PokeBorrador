/**
 * PLAYER_CLASSES: Definiciones estáticas de las clases de jugador.
 * Incluye bonos, penalizaciones, modificadores de batalla y sprites.
 * Los sprites se resuelven dinámicamente mediante el AssetService.
 */

export const PLAYER_CLASSES = {
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
      '🏥 Centro Pokémon con sobrecargo por nivel y rareza (Tier)',
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
    avatarSpriteId: 'rocket',
    showdownSpriteId: 'rocket'
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
      '🪙 -15% Battle Coins en todas las balallas',
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
    avatarSpriteId: 'cazabichos',
    showdownSpriteId: 'cazabichos'
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
    avatarSpriteId: 'entrenador',
    showdownSpriteId: 'entrenador'
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
      '🔍 Escáner de Huevos: Escanea y revela los IVs y el Grado de un Huevo del Almacén (1 vez al día).'
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
      "Permite revelar por completo la genética (IVs y Grado de IVs) de un huevo depositado en el Almacén de la Guardería. Limitado a un escaneo diario."
    ],
    technicalPenalties: [
      "Tu enfoque en la genética te aleja del fragor de la batalla (x0.90 EXP global).",
      "Como científico respetable, no posees los contactos necesarios para entrar al Mercado Negro."
    ],
    avatarSpriteId: 'criador',
    showdownSpriteId: 'criador'
  }
};

/**
 * CLASS_MISSIONS: Definiciones de misiones idle según la duración.
 */
export const CLASS_MISSIONS = [
  { id: 'mission_6h',  durationHs: 6,  reqLv: 1,  name: 'Misión Básica (6h)',     color: '#22c55e' },
  { id: 'mission_12h', durationHs: 12, reqLv: 15, name: 'Misión Avanzada (12h)',  color: '#3b82f6' },
  { id: 'mission_24h', durationHs: 24, reqLv: 25, name: 'Misión Experta (24h)',   color: '#a855f7' }
];

/**
 * REPUTATION_SHOP_ITEMS: Ítems canjeables por puntos de reputación (solo Entrenador).
 */
export const REPUTATION_SHOP_ITEMS = [
  { id: 'rep_ultra_ball', name: 'Ultra Ball x3', cost: 20, icon: '🔵', desc: 'Tres Ultra Balls de la tienda oficial del Gimnasio.' },
  { id: 'rep_tm_earthquake', name: 'MT26 Terremoto', cost: 80, icon: '🌋', desc: 'El poderoso movimiento Terremoto en formato MT.' },
  { id: 'rep_revive', name: 'Revivir x5', cost: 30, icon: '💊', desc: 'Cinco Revivires del botiquín de los Gimnasios.' },
  { id: 'rep_full_heal', name: 'Cura Total x3', cost: 25, icon: '✨', desc: 'Tres Cura Total para sanar cualquier estado alterado.' },
  { id: 'rep_iv_scanner', name: 'Escáner de IVs', cost: 100, icon: '🔍', desc: 'Radar avanzado: Revela los IVs totales de los rivales salvajes durante 1 hora.' },
  { id: 'rep_star_piece', name: 'Trozo Estrella x3', cost: 60, icon: '⭐', desc: 'Tres trozos de estrella de valor extraordinario.' },
];
