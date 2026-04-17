/**
 * PLAYER_CLASSES: Definiciones estáticas de las clases de jugador.
 * Incluye bonos, penalizaciones, modificadores de batalla y sprites.
 */
import teamrocketAvatar from '@/assets/sprites/trainers/teamrocket.webp';
import cazabichosAvatar from '@/assets/sprites/trainers/cazabichos.webp';
import entrenadorAvatar from '@/assets/sprites/trainers/entrenador.webp';
import criadorAvatar from '@/assets/sprites/trainers/criador.webp';

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
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/rainbowrocketgrunt.webp',
    avatarSprite: teamrocketAvatar
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
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/bugcatcher-gen6.webp',
    avatarSprite: cazabichosAvatar
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
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.webp',
    avatarSprite: entrenadorAvatar
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
    sprite: 'https://play.pokemonshowdown.com/sprites/trainers/jacq.webp',
    avatarSprite: criadorAvatar
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
