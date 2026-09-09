import type { PokemonType } from '../battle/types.ts';
import type { PokemonSpeciesId } from '../pokemon/pokedex.ts';
import { toID } from '@/logic/utils/strings.ts';

export const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'] as const;
export type RankedTierName = (typeof RANKED_TIER_ORDER)[number];

export const RANKED_TIER_IDS = ['bronce', 'plata', 'oro', 'platino', 'diamante', 'maestro'] as const;
export type RankedTierId = (typeof RANKED_TIER_IDS)[number];
const RANKED_TIER_IDS_SET: ReadonlySet<string> = new Set(RANKED_TIER_IDS);

export function isRankedTierId(value: unknown): value is RankedTierId {
  return typeof value === 'string' && RANKED_TIER_IDS_SET.has(value);
}

export const RANKED_TIER_INDEX_MAP: Readonly<Record<RankedTierName, number>> = Object.freeze({
  Bronce: 0,
  Plata: 1,
  Oro: 2,
  Platino: 3,
  Diamante: 4,
  Maestro: 5
});

export interface RankedTierConfig {
  readonly id: RankedTierId;
  readonly name: RankedTierName;
  readonly color: string; // domain-ok: Hex color code
  readonly fallbackEmoji: string; // domain-ok: Unicode emoji character
}

export const RANKED_MEDAL_CONFIGS: Readonly<Record<RankedTierId, RankedTierConfig>> = Object.freeze({
  bronce: {
    id: 'bronce',
    name: 'Bronce',
    color: '#c8a060',
    fallbackEmoji: '🥉'
  },
  plata: {
    id: 'plata',
    name: 'Plata',
    color: '#9E9E9E',
    fallbackEmoji: '🥈'
  },
  oro: {
    id: 'oro',
    name: 'Oro',
    color: '#FFB800',
    fallbackEmoji: '🥇'
  },
  platino: {
    id: 'platino',
    name: 'Platino',
    color: '#E5C100',
    fallbackEmoji: '🔶'
  },
  diamante: {
    id: 'diamante',
    name: 'Diamante',
    color: '#89CFF0',
    fallbackEmoji: '💎'
  },
  maestro: {
    id: 'maestro',
    name: 'Maestro',
    color: '#FFD700',
    fallbackEmoji: '👑'
  }
});

export const RANKED_MEDAL_CONFIGS_BY_NAME: Readonly<Record<RankedTierName, RankedTierConfig>> = Object.freeze({
  Bronce: RANKED_MEDAL_CONFIGS.bronce,
  Plata: RANKED_MEDAL_CONFIGS.plata,
  Oro: RANKED_MEDAL_CONFIGS.oro,
  Platino: RANKED_MEDAL_CONFIGS.platino,
  Diamante: RANKED_MEDAL_CONFIGS.diamante,
  Maestro: RANKED_MEDAL_CONFIGS.maestro
});

export const RANKED_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic',
  'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'
];

export const RANKED_REWARD_MILESTONES = [
  { id: 'bronce_1000', tier: 'Bronce', elo: 1000, rewards: { 'naturepatch': 1 }, icon: '🍃' },
  { id: 'bronce_1100', tier: 'Bronce', elo: 1100, rewards: { 'naturepatch': 1 }, icon: '🍃' },
  { id: 'plata_1200', tier: 'Plata', elo: 1200, rewards: { 'naturepatch': 1, 'vigorcandy': 1 }, icon: '🍬' },
  { id: 'plata_1400', tier: 'Plata', elo: 1400, rewards: { 'naturepatch': 2 }, icon: '🍃' },
  { id: 'oro_1600', tier: 'Oro', elo: 1600, rewards: { 'vigorcandy': 2 }, icon: '🍬' },
  { id: 'oro_1800', tier: 'Oro', elo: 1800, rewards: { 'naturepatch': 2, 'vigorcandy': 1 }, icon: '🍬' },
  { id: 'oro_2000', tier: 'Oro', elo: 2000, rewards: { 'naturepatch': 2 }, icon: '🍃' },
  { id: 'platino_2100', tier: 'Platino', elo: 2100, rewards: { 'naturepatch': 1, 'vigorcandy': 2 }, icon: '💊' },
  { id: 'platino_2400', tier: 'Platino', elo: 2400, rewards: { 'naturepatch': 2, 'vigorcandy': 2 }, icon: '💊' },
  { id: 'diamante_2700', tier: 'Diamante', elo: 2700, rewards: { 'abilitypill': 1, 'vigorcandy': 2 }, icon: '🪙' },
  { id: 'diamante_3000', tier: 'Diamante', elo: 3000, rewards: { 'naturepatch': 3, 'vigorcandy': 2 }, icon: '🍃' },
  { id: 'diamante_3300', tier: 'Diamante', elo: 3300, rewards: { 'abilitypill': 1 }, icon: '💊' },
  { id: 'maestro_3400', tier: 'Maestro', elo: 3400, rewards: { 'abilitypill': 2, 'naturepatch': 3, 'vigorcandy': 3 }, icon: '🌟' }
] as const;

export type RankedRewardMilestone = (typeof RANKED_REWARD_MILESTONES)[number];
export type RankedRewardMilestoneId = RankedRewardMilestone['id'];

export const RANKED_REWARD_MILESTONES_BY_ID: Readonly<Record<RankedRewardMilestoneId, RankedRewardMilestone>> = Object.freeze(
  Object.fromEntries(RANKED_REWARD_MILESTONES.map(m => [m.id, m])) as Record<RankedRewardMilestoneId, RankedRewardMilestone>
);

export function isRankedRewardMilestoneId(value: string): value is RankedRewardMilestoneId {
  return value in RANKED_REWARD_MILESTONES_BY_ID;
}

export const RANKED_TYPE_META: Partial<Record<PokemonType, { label: string; icon: string }>> = {
  normal:   { label: 'Normal', icon: '⚪' },
  fire:     { label: 'Fuego', icon: '🔥' },
  water:    { label: 'Agua', icon: '💧' },
  electric: { label: 'Eléctrico', icon: '⚡' },
  grass:    { label: 'Planta', icon: '🌿' },
  ice:      { label: 'Hielo', icon: '❄️' },
  fighting: { label: 'Lucha', icon: '🥊' },
  poison:   { label: 'Veneno', icon: '☠️' },
  ground:   { label: 'Tierra', icon: '⛰️' },
  flying:   { label: 'Volador', icon: '🦅' },
  psychic:  { label: 'Psíquico', icon: '🔮' },
  bug:      { label: 'Bicho', icon: '🐛' },
  rock:     { label: 'Roca', icon: '🌑' },
  ghost:    { label: 'Fantasma', icon: '👻' },
  dragon:   { label: 'Dragón', icon: '🐲' },
  dark:     { label: 'Siniestro', icon: '🌑' },
  steel:    { label: 'Acero', icon: '⚙️' }
};

export const SEASONAL_THEME_IDS = [
  'monotype_clash',
  'kanto_classic',
  'little_cup',
  'weather_masters',
  'dual_type_duo',
  'no_legendaries',
  'speed_warp',
  'elemental_triad',
  'johto_kanto_frontier',
  'halloween_spook',
  'titan_clash',
  'masters_allstars'
] as const;
export type SeasonalThemeId = (typeof SEASONAL_THEME_IDS)[number];
const SEASONAL_THEME_IDS_SET: ReadonlySet<string> = new Set(SEASONAL_THEME_IDS);

export function isSeasonalThemeId(value: unknown): value is SeasonalThemeId {
  return typeof value === 'string' && SEASONAL_THEME_IDS_SET.has(value);
}

export function requireSeasonalThemeId(value: unknown): SeasonalThemeId {
  if (isSeasonalThemeId(value)) return value;
  throw new Error(`[PVP] Invalid seasonal theme id: ${String(value)}`);
}

export interface SeasonalRewardPokemonConfig {
  readonly species: PokemonSpeciesId;
  readonly level: number;
  readonly shiny: boolean;
  readonly guaranteedMaxIvs: number;
}

export interface SeasonalThemeConfig {
  readonly id: SeasonalThemeId;
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly description: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly monthIndex: number; // 1 to 12
  readonly bannerImage: string; // domain-ok: Canonical banner asset identifier
  readonly allowedTypes?: readonly PokemonType[];
  readonly bannedPokemonIds?: readonly PokemonSpeciesId[];
  readonly isLittleCup?: boolean;
  readonly levelCap?: number;
  readonly requiresDualType?: boolean;
  readonly requiresMonotype?: boolean;
  readonly rewardPokemon: {
    readonly diamante: SeasonalRewardPokemonConfig;
    readonly maestro: SeasonalRewardPokemonConfig;
  };
}

export const SEASONAL_ANNUAL_THEMES: readonly SeasonalThemeConfig[] = Object.freeze([
  {
    id: 'monotype_clash',
    name: 'Copa Monotipo',
    description: 'Todos los integrantes del equipo deben compartir al menos un tipo elemental común.',
    monthIndex: 1,
    bannerImage: 'tournament_monotype_full',
    requiresMonotype: true,
    rewardPokemon: {
      diamante: { species: 'charmander', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'charizard', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'kanto_classic',
    name: 'Clásico Kanto',
    description: 'Exclusivo para Pokémon de la Pokédex original de Kanto (#001 a #151). Míticos y Legendarios prohibidos.',
    monthIndex: 2,
    bannerImage: 'tournament_kanto_full',
    bannedPokemonIds: ['mewtwo', 'mew', 'articuno', 'zapdos', 'moltres'],
    rewardPokemon: {
      diamante: { species: 'squirtle', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'blastoise', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'little_cup',
    name: 'Little Cup',
    description: 'Solo Pokémon en su primera etapa evolutiva que tengan la capacidad de evolucionar.',
    monthIndex: 3,
    bannerImage: 'tournament_little_cup_full',
    isLittleCup: true,
    rewardPokemon: {
      diamante: { species: 'pichu', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'raichu', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'weather_masters',
    name: 'Maestros del Clima',
    description: 'Batallas bajo climas extremos. Tipos permitidos: Agua, Fuego, Roca, Hielo y Planta.',
    monthIndex: 4,
    bannerImage: 'tournament_weather_masters_full',
    allowedTypes: ['water', 'fire', 'rock', 'ice', 'grass'],
    rewardPokemon: {
      diamante: { species: 'vulpix', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'ninetales', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'dual_type_duo',
    name: 'Dúo Elemental',
    description: 'Solo se permiten Pokémon que posean exactamente dos tipos elementales combinados.',
    monthIndex: 5,
    bannerImage: 'tournament_dual_type_duo_full',
    requiresDualType: true,
    rewardPokemon: {
      diamante: { species: 'gastly', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'gengar', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'no_legendaries',
    name: 'Duelo de Honor (Sin Legendarios)',
    description: 'Formato estándar competitivo OU con restricción absoluta de Pokémon Legendarios y Míticos.',
    monthIndex: 6,
    bannerImage: 'tournament_no_legendaries_full',
    bannedPokemonIds: ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew'],
    rewardPokemon: {
      diamante: { species: 'snorlax', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'dragonite', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'speed_warp',
    name: 'Copa Velocidad & Espacio Raro',
    description: 'Agilidad y distorsión temporal. Tipos permitidos: Eléctrico, Volador, Psíquico y Fantasma.',
    monthIndex: 7,
    bannerImage: 'tournament_speed_warp_full',
    allowedTypes: ['electric', 'flying', 'psychic', 'ghost'],
    rewardPokemon: {
      diamante: { species: 'jolteon', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'alakazam', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'elemental_triad',
    name: 'Tríada Elemental',
    description: 'El clásico triángulo de combate. Solo Pokémon con al menos un tipo entre Fuego, Agua o Planta.',
    monthIndex: 8,
    bannerImage: 'tournament_elemental_triad_full',
    allowedTypes: ['fire', 'water', 'grass'],
    rewardPokemon: {
      diamante: { species: 'bulbasaur', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'venusaur', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'johto_kanto_frontier',
    name: 'Frontera Kanto & Johto',
    description: 'Enfrentamiento clásico regional. Solo especies descubiertas en Kanto y Johto.',
    monthIndex: 9,
    bannerImage: 'tournament_johto_kanto_frontier_full',
    rewardPokemon: {
      diamante: { species: 'eevee', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'lapras', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'halloween_spook',
    name: 'Noche de Brujas',
    description: 'Especial tenebroso de Halloween. Solo se permiten especies de tipo Fantasma, Siniestro o Veneno.',
    monthIndex: 10,
    bannerImage: 'tournament_halloween_spook_full',
    allowedTypes: ['ghost', 'dark', 'poison'],
    rewardPokemon: {
      diamante: { species: 'haunter', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'gengar', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'titan_clash',
    name: 'Choque de Titanes',
    description: 'El poder destructivo de los pesos pesados. Solo tipos Dragón, Acero y Lucha.',
    monthIndex: 11,
    bannerImage: 'tournament_titan_clash_full',
    allowedTypes: ['dragon', 'steel', 'fighting'],
    rewardPokemon: {
      diamante: { species: 'dratini', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'machamp', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  },
  {
    id: 'masters_allstars',
    name: 'Torneo de Maestros All-Stars',
    description: 'Gran clausura anual abierta sin restricciones de tipo ni región. Máxima libertad estratégica.',
    monthIndex: 12,
    bannerImage: 'tournament_masters_allstars_full',
    rewardPokemon: {
      diamante: { species: 'eevee', level: 50, shiny: true, guaranteedMaxIvs: 3 },
      maestro: { species: 'gyarados', level: 50, shiny: true, guaranteedMaxIvs: 4 }
    }
  }
]);

export const SEASONAL_THEMES_BY_ID: Readonly<Record<SeasonalThemeId, SeasonalThemeConfig>> = Object.freeze(
  Object.fromEntries(SEASONAL_ANNUAL_THEMES.map(t => [t.id, t])) as Record<SeasonalThemeId, SeasonalThemeConfig>
);

export const SEASONAL_THEMES_BY_MONTH: Readonly<Record<number, SeasonalThemeConfig>> = Object.freeze(
  Object.fromEntries(SEASONAL_ANNUAL_THEMES.map(t => [t.monthIndex, t])) as Record<number, SeasonalThemeConfig>
);

export function getSeasonalThemeForMonth(month: number): SeasonalThemeConfig {
  const normalizedMonth = ((Math.floor(month) - 1) % 12 + 12) % 12 + 1;
  const found = SEASONAL_THEMES_BY_MONTH[normalizedMonth] ?? SEASONAL_ANNUAL_THEMES[0];
  if (!found) {
    throw new Error('[PVP] No seasonal themes configured');
  }
  return found;
}

export const SPANISH_MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

const THEMES_BY_LOOKUP_KEY: Readonly<Record<string, SeasonalThemeConfig>> = Object.freeze( // open-record: Generic key-value data dictionary container
  (() => {
    const map: Record<string, SeasonalThemeConfig> = {}; // open-record: Generic key-value data dictionary container
    for (const theme of SEASONAL_ANNUAL_THEMES) {
      map[theme.id] = theme;
      map[theme.name] = theme;
      map[toID(theme.name)] = theme;
      map[toID(theme.id)] = theme;
    }
    return map;
  })()
);

export function findSeasonalTheme(identifier?: string | null): SeasonalThemeConfig | undefined { // result-ok: Operation result wrapper payload
  if (!identifier) return undefined;
  if (isSeasonalThemeId(identifier)) {
    return SEASONAL_THEMES_BY_ID[identifier];
  }
  return THEMES_BY_LOOKUP_KEY[identifier] ?? THEMES_BY_LOOKUP_KEY[toID(identifier)];
}

export function getSeasonalThemeConfig(id: SeasonalThemeId): SeasonalThemeConfig {
  const found = SEASONAL_THEMES_BY_ID[id] ?? SEASONAL_ANNUAL_THEMES[0];
  if (!found) {
    throw new Error(`[PVP] Seasonal theme not found for id: ${id}`);
  }
  return found;
}
