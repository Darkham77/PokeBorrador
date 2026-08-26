import type { Pokemon } from '@/types/pokemon/pokemon';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isPokemonType } from '@/data/battle/types';

export interface EloTier {
  id: RankedTierId;
  name: RankedTierName;
  minElo: number;
  color: string;
  icon: string;
  allowedTypes?: string[];
}

export interface RankedRules {
  seasonName: string;
  maxPokemon: number;
  levelCap: number;
  allowedTypes: string[];
  bannedPokemonIds: string[];
}

import { RANKED_TIER_ORDER } from '@/data/system/rankedData.ts'
export { RANKED_TIER_ORDER }
export type RankedTierName = (typeof RANKED_TIER_ORDER)[number];
export type RankedTierId = 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante' | 'maestro';
type RankedTierCode = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE' | 'MAESTRO';
const RANKED_MAX_TIER_GAP = 1;

const ELO_THRESHOLD_PLATA = 1200;
const ELO_THRESHOLD_ORO = 1600;
const ELO_THRESHOLD_PLATINO = 2100;
const ELO_THRESHOLD_DIAMANTE = 2700;
const ELO_THRESHOLD_MAESTRO = 3400;

const RANKED_TIERS: Record<RankedTierCode, EloTier> = {
  BRONCE:   { id: 'bronce',   name: 'Bronce',   minElo: 0,                      color: '#c8a060', icon: '🥉' },
  PLATA:    { id: 'plata',    name: 'Plata',    minElo: ELO_THRESHOLD_PLATA,    color: '#9E9E9E', icon: '🥈' },
  ORO:      { id: 'oro',      name: 'Oro',      minElo: ELO_THRESHOLD_ORO,      color: '#FFB800', icon: '🥇' },
  PLATINO:  { id: 'platino',  name: 'Platino',  minElo: ELO_THRESHOLD_PLATINO,  color: '#E5C100', icon: '🔶' },
  DIAMANTE: { id: 'diamante', name: 'Diamante', minElo: ELO_THRESHOLD_DIAMANTE, color: '#89CFF0', icon: '💎' },
  MAESTRO:  { id: 'maestro',  name: 'Maestro',  minElo: ELO_THRESHOLD_MAESTRO,  color: '#FFD700', icon: '👑' }
};

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
  return RANKED_TIER_ORDER.indexOf(tier.name);
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
