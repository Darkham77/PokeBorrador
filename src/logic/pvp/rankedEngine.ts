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
  type RankedTierId,
  type RankedTierName
} from '@/data/system/rankedData.ts'
export { RANKED_TIER_ORDER, RANKED_TIER_INDEX_MAP, type RankedTierId, type RankedTierName }
export type RankedTierCode = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE' | 'MAESTRO';
const RANKED_MAX_TIER_GAP = 1;

export const ELO_THRESHOLD_PLATA = 1200;
export const ELO_THRESHOLD_ORO = 1600;
export const ELO_THRESHOLD_PLATINO = 2100;
export const ELO_THRESHOLD_DIAMANTE = 2700;
export const ELO_THRESHOLD_MAESTRO = 3400;

export const RANKED_TIERS: Record<RankedTierCode, EloTier> = {
  BRONCE:   { id: 'bronce',   name: 'Bronce',   minElo: 0,                      color: RANKED_MEDAL_CONFIGS.bronce.color,   icon: RANKED_MEDAL_CONFIGS.bronce.fallbackEmoji,   sprite: RANKED_MEDAL_CONFIGS.bronce.sprite },
  PLATA:    { id: 'plata',    name: 'Plata',    minElo: ELO_THRESHOLD_PLATA,    color: RANKED_MEDAL_CONFIGS.plata.color,    icon: RANKED_MEDAL_CONFIGS.plata.fallbackEmoji,    sprite: RANKED_MEDAL_CONFIGS.plata.sprite },
  ORO:      { id: 'oro',      name: 'Oro',      minElo: ELO_THRESHOLD_ORO,      color: RANKED_MEDAL_CONFIGS.oro.color,      icon: RANKED_MEDAL_CONFIGS.oro.fallbackEmoji,      sprite: RANKED_MEDAL_CONFIGS.oro.sprite },
  PLATINO:  { id: 'platino',  name: 'Platino',  minElo: ELO_THRESHOLD_PLATINO,  color: RANKED_MEDAL_CONFIGS.platino.color,  icon: RANKED_MEDAL_CONFIGS.platino.fallbackEmoji,  sprite: RANKED_MEDAL_CONFIGS.platino.sprite },
  DIAMANTE: { id: 'diamante', name: 'Diamante', minElo: ELO_THRESHOLD_DIAMANTE, color: RANKED_MEDAL_CONFIGS.diamante.color, icon: RANKED_MEDAL_CONFIGS.diamante.fallbackEmoji, sprite: RANKED_MEDAL_CONFIGS.diamante.sprite },
  MAESTRO:  { id: 'maestro',  name: 'Maestro',  minElo: ELO_THRESHOLD_MAESTRO,  color: RANKED_MEDAL_CONFIGS.maestro.color,  icon: RANKED_MEDAL_CONFIGS.maestro.fallbackEmoji,  sprite: RANKED_MEDAL_CONFIGS.maestro.sprite }
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
