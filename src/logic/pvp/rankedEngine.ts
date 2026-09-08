import type { Pokemon } from '@/types/pokemon/pokemon';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isPokemonType } from '@/data/battle/types';

export interface EloTier {
  id: RankedTierId;
  name: RankedTierName;
  minElo: number;
  color: string;
  icon: string;
  sprite: string; // domain-ok: Asset path URI string
  allowedTypes?: string[];
}

export interface RankedRules {
  seasonName: string;
  maxPokemon: number;
  levelCap: number;
  allowedTypes: string[];
  bannedPokemonIds: string[];
}

import {
  RANKED_TIER_ORDER,
  RANKED_TIER_INDEX_MAP,
  RANKED_MEDAL_CONFIGS,
  SPANISH_MONTH_NAMES,
  findSeasonalTheme,
  getSeasonalThemeForMonth,
  isSeasonalThemeId,
  SEASONAL_THEMES_BY_ID,
  type RankedTierId,
  type RankedTierName,
  type SeasonalThemeId
} from '@/data/system/rankedData.ts'
export { RANKED_TIER_ORDER, RANKED_TIER_INDEX_MAP, type RankedTierId, type RankedTierName }
export type RankedTierCode = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE' | 'MAESTRO';
import type { RankedSeasonMedal } from '@/types/battle/pvp.ts';
import { GAME_TIMEZONE, getGMT3Date } from '@/logic/utils/timeUtils.ts';
import { toID } from '@/logic/utils/strings.ts';
const RANKED_MAX_TIER_GAP = 1;

export const ELO_THRESHOLD_PLATA = 1200;
export const ELO_THRESHOLD_ORO = 1600;
export const ELO_THRESHOLD_PLATINO = 2100;
export const ELO_THRESHOLD_DIAMANTE = 2700;
export const ELO_THRESHOLD_MAESTRO = 3400;

import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

export const RANKED_TIERS: Record<RankedTierCode, EloTier> = {
  BRONCE:   { id: 'bronce',   name: 'Bronce',   minElo: 0,                      color: RANKED_MEDAL_CONFIGS.bronce.color,   icon: RANKED_MEDAL_CONFIGS.bronce.fallbackEmoji,   sprite: getAssetUrl(ASSET_TYPES.RANK, 'bronce') },
  PLATA:    { id: 'plata',    name: 'Plata',    minElo: ELO_THRESHOLD_PLATA,    color: RANKED_MEDAL_CONFIGS.plata.color,    icon: RANKED_MEDAL_CONFIGS.plata.fallbackEmoji,    sprite: getAssetUrl(ASSET_TYPES.RANK, 'plata') },
  ORO:      { id: 'oro',      name: 'Oro',      minElo: ELO_THRESHOLD_ORO,      color: RANKED_MEDAL_CONFIGS.oro.color,      icon: RANKED_MEDAL_CONFIGS.oro.fallbackEmoji,      sprite: getAssetUrl(ASSET_TYPES.RANK, 'oro') },
  PLATINO:  { id: 'platino',  name: 'Platino',  minElo: ELO_THRESHOLD_PLATINO,  color: RANKED_MEDAL_CONFIGS.platino.color,  icon: RANKED_MEDAL_CONFIGS.platino.fallbackEmoji,  sprite: getAssetUrl(ASSET_TYPES.RANK, 'platino') },
  DIAMANTE: { id: 'diamante', name: 'Diamante', minElo: ELO_THRESHOLD_DIAMANTE, color: RANKED_MEDAL_CONFIGS.diamante.color, icon: RANKED_MEDAL_CONFIGS.diamante.fallbackEmoji, sprite: getAssetUrl(ASSET_TYPES.RANK, 'diamante') },
  MAESTRO:  { id: 'maestro',  name: 'Maestro',  minElo: ELO_THRESHOLD_MAESTRO,  color: RANKED_MEDAL_CONFIGS.maestro.color,  icon: RANKED_MEDAL_CONFIGS.maestro.fallbackEmoji,  sprite: getAssetUrl(ASSET_TYPES.RANK, 'maestro') }
};

export interface SeasonalTierReward {
  battleCoins: number;
  dungeonTickets: number;
  tickets?: {
    cuevaCeleste: number;
    islasEspumas: number;
  };
  pokemonReward?: {
    species: PokemonSpeciesId;
    level: number;
    shiny: boolean;
    ivs: Record<string, number>; // open-record: Generic key-value data dictionary container
  };
}

export function getSeasonalPrizesForTier(tierInput: string): SeasonalTierReward {
  const tier = String(tierInput).toLowerCase();
  switch (tier) {
    case 'maestro':
      return {
        battleCoins: 500,
        dungeonTickets: 6,
        tickets: { cuevaCeleste: 3, islasEspumas: 3 },
        pokemonReward: {
          species: 'eevee',
          level: 50,
          shiny: true,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        }
      };
    case 'diamante':
      return {
        battleCoins: 350,
        dungeonTickets: 4,
        tickets: { cuevaCeleste: 2, islasEspumas: 2 },
        pokemonReward: {
          species: 'eevee',
          level: 50,
          shiny: false,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 28 }
        }
      };
    case 'platino':
      return {
        battleCoins: 250,
        dungeonTickets: 4,
        tickets: { cuevaCeleste: 2, islasEspumas: 2 }
      };
    case 'oro':
      return {
        battleCoins: 150,
        dungeonTickets: 2,
        tickets: { cuevaCeleste: 1, islasEspumas: 1 }
      };
    case 'plata':
      return {
        battleCoins: 75,
        dungeonTickets: 1,
        tickets: { cuevaCeleste: 1, islasEspumas: 0 }
      };
    case 'bronce':
    default:
      return {
        battleCoins: 25,
        dungeonTickets: 0,
        tickets: { cuevaCeleste: 0, islasEspumas: 0 }
      };
  }
}

/**
 * Returns the tier corresponding to an ELO value.
 */
export function getEloTier(elo: number | string): EloTier {
  const e = Number(elo) || 0;
  if (e >= (RANKED_TIERS.MAESTRO?.minElo || ELO_THRESHOLD_MAESTRO)) return RANKED_TIERS.MAESTRO || { id: 'maestro', name: 'Maestro', minElo: ELO_THRESHOLD_MAESTRO, color: '', icon: '' };
  if (e >= (RANKED_TIERS.DIAMANTE?.minElo || ELO_THRESHOLD_DIAMANTE)) return RANKED_TIERS.DIAMANTE || { id: 'diamante', name: 'Diamante', minElo: ELO_THRESHOLD_DIAMANTE, color: '', icon: '' };
  if (e >= (RANKED_TIERS.PLATINO?.minElo || ELO_THRESHOLD_PLATINO)) return RANKED_TIERS.PLATINO || { id: 'platino', name: 'Platino', minElo: ELO_THRESHOLD_PLATINO, color: '', icon: '' };
  if (e >= (RANKED_TIERS.ORO?.minElo || ELO_THRESHOLD_ORO)) return RANKED_TIERS.ORO || { id: 'oro', name: 'Oro', minElo: ELO_THRESHOLD_ORO, color: '', icon: '' };
  if (e >= (RANKED_TIERS.PLATA?.minElo || ELO_THRESHOLD_PLATA)) return RANKED_TIERS.PLATA || { id: 'plata', name: 'Plata', minElo: ELO_THRESHOLD_PLATA, color: '', icon: '' };
  return RANKED_TIERS.BRONCE || { id: 'bronce', name: 'Bronce', minElo: 0, color: '', icon: '' };
}

/**
 * Returns the index of the tier for gap comparison.
 */
function getEloTierIndex(elo: number | string): number {
  const tier = getEloTier(elo);
  return RANKED_TIER_INDEX_MAP[tier.name as RankedTierName] ?? -1;
}

/**
 * Checks if a match is allowed between two ELO ratings.
 */
export function isAllowedRankGap(myElo: number | string, opponentElo: number | string, maxGap: number = RANKED_MAX_TIER_GAP): boolean {
  return Math.abs(getEloTierIndex(myElo) - getEloTierIndex(opponentElo)) <= maxGap;
}

/**
 * Normalizes ranked rules from raw configuration.
 */
import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

const MIN_TEAM_MEMBERS = 1;
const MAX_TEAM_MEMBERS = 6;
const MIN_RANKED_POKEMON_LEVEL = 1;
const MAX_RANKED_POKEMON_LEVEL = 100;

export function normalizeRankedRules(raw: Partial<RankedRules> = {}, seasonName: string = 'TEMPORADA ACTUAL'): RankedRules {
  return {
    seasonName: seasonName || 'TEMPORADA ACTUAL',
    maxPokemon: Math.max(MIN_TEAM_MEMBERS, Math.min(MAX_TEAM_MEMBERS, Number(raw.maxPokemon) || MAX_TEAM_MEMBERS)),
    levelCap: Math.max(MIN_RANKED_POKEMON_LEVEL, Math.min(MAX_RANKED_POKEMON_LEVEL, Number(raw.levelCap) || MAX_RANKED_POKEMON_LEVEL)),
    allowedTypes: Array.isArray(raw.allowedTypes) ? raw.allowedTypes.map(t => String(t).toLowerCase()).filter((t): t is PokemonType => isPokemonType(t)) : [],
    bannedPokemonIds: Array.isArray(raw.bannedPokemonIds) ? raw.bannedPokemonIds.map(id => String(id).toLowerCase()).filter((id): id is PokemonSpeciesId => isPokemonSpeciesId(id)) : []
  };
}

/**
 * Validates a single Pokemon against the rules.
 */
export function validatePokemonForRanked(pokemon: Pokemon | null, rules: RankedRules): { ok: boolean; reason?: string } {
  if (!pokemon) return { ok: false, reason: 'Pokémon inválido.' };

  const id = isPokemonSpeciesId(pokemon.id) ? pokemon.id : null;
  if (id && rules.bannedPokemonIds.includes(id)) {
    return { ok: false, reason: `${pokemon.name} está baneado esta temporada.` };
  }

  if (pokemon.level > rules.levelCap) {
    return { ok: false, reason: `${pokemon.name} supera el nivel máximo (${rules.levelCap}).` };
  }

  if (rules.allowedTypes.length > 0) {
    const types = [pokemon.type, pokemon.type2].filter((t): t is PokemonType => !!t);
    const hasAllowedType = types.some((t: PokemonType) => rules.allowedTypes.includes(t));
    if (!hasAllowedType) {
      return { ok: false, reason: `${pokemon.name} no tiene un tipo permitido.` };
    }
  }

  return { ok: true };
}

/**
 * Validates a full team against the rules.
 */
export function validateTeamForRanked(team: (Pokemon | null)[], rules: RankedRules): { ok: boolean; reason?: string } {
  const members = (team || []).filter((p): p is Pokemon => p !== null);
  if (members.length === 0) return { ok: false, reason: 'El equipo está vacío.' };
  if (members.length > rules.maxPokemon) return { ok: false, reason: `Máximo ${rules.maxPokemon} Pokémon permitidos.` };

  for (const p of members) {
    const v = validatePokemonForRanked(p, rules);
    if (!v.ok) return v;
  }

  return { ok: true };
}

export interface ResolvedMedalTournamentInfo {
  readonly tournamentName: string;
  readonly formattedDate: string;
  readonly exactDate: string;
  readonly themeId?: SeasonalThemeId;
  readonly isAvailable: boolean;
}

function isGenericSeasonName(name: string): boolean {
  const norm = name.trim().toLowerCase();
  return (
    norm.startsWith('temporada') ||
    norm.startsWith('season') ||
    norm.startsWith('ranked_season') ||
    norm === 'actual' ||
    norm === ''
  );
}

export function resolveMedalTournamentInfo(
  medal: RankedSeasonMedal,
  currentSeasonName?: string
): ResolvedMedalTournamentInfo {
  let zdt: Temporal.ZonedDateTime | null = null;
  if (medal.awardedAt) {
    try {
      const inst = Temporal.Instant.from(medal.awardedAt);
      zdt = inst.toZonedDateTimeISO(GAME_TIMEZONE);
    } catch {
      zdt = null;
    }
  }
  if (!zdt) {
    zdt = getGMT3Date();
  }

  const monthIndex = zdt.month;
  const year = zdt.year;
  const monthName = SPANISH_MONTH_NAMES[monthIndex - 1] ?? 'Septiembre';
  const formattedDate = `${monthName} ${year}`;
  const exactDate = `${String(zdt.day).padStart(2, '0')}/${String(monthIndex).padStart(2, '0')}/${year}`;

  let themeConfig = (medal.themeId && isSeasonalThemeId(medal.themeId))
    ? SEASONAL_THEMES_BY_ID[medal.themeId]
    : undefined;

  if (!themeConfig && medal.seasonName) {
    themeConfig = findSeasonalTheme(medal.seasonName);
  }

  if (!themeConfig) {
    themeConfig = getSeasonalThemeForMonth(monthIndex);
  }

  const tournamentName = medal.tournamentName
    || (medal.seasonName && !isGenericSeasonName(medal.seasonName) ? medal.seasonName : undefined)
    || themeConfig?.name
    || 'Frontera Kanto & Johto';

  const nowZdt = getGMT3Date();
  const currentTheme = getSeasonalThemeForMonth(nowZdt.month);

  const isSameMonthAndYear = (zdt.month === nowZdt.month && zdt.year === nowZdt.year);
  const matchesCurrentTournament = (themeConfig?.id === currentTheme.id) ||
    (toID(tournamentName) === toID(currentTheme.name)) ||
    (currentSeasonName ? toID(tournamentName) === toID(currentSeasonName) : false);

  const isAvailable = matchesCurrentTournament && isSameMonthAndYear;

  return {
    tournamentName,
    formattedDate,
    exactDate,
    themeId: themeConfig?.id,
    isAvailable
  };
}
