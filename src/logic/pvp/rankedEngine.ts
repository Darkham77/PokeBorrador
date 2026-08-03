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

export const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'] as const;
export type RankedTierName = (typeof RANKED_TIER_ORDER)[number];
export type RankedTierId = 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante' | 'maestro';
type RankedTierCode = 'BRONCE' | 'PLATA' | 'ORO' | 'PLATINO' | 'DIAMANTE' | 'MAESTRO';
const RANKED_MAX_TIER_GAP = 1;

const RANKED_TIERS: Record<RankedTierCode, EloTier> = {
  BRONCE:   { id: 'bronce',   name: 'Bronce',   minElo: 0,    color: '#c8a060', icon: '🥉' },
  PLATA:    { id: 'plata',    name: 'Plata',    minElo: 1200, color: '#9E9E9E', icon: '🥈' },
  ORO:      { id: 'oro',      name: 'Oro',      minElo: 1600, color: '#FFB800', icon: '🥇' },
  PLATINO:  { id: 'platino',  name: 'Platino',  minElo: 2100, color: '#E5C100', icon: '🔶' },
  DIAMANTE: { id: 'diamante', name: 'Diamante', minElo: 2700, color: '#89CFF0', icon: '💎' },
  MAESTRO:  { id: 'maestro',  name: 'Maestro',  minElo: 3400, color: '#FFD700', icon: '👑' }
};

/**
 * Returns the tier corresponding to an ELO value.
 */
export function getEloTier(elo: number | string): EloTier {
  const e = Number(elo) || 0;
  if (e >= (RANKED_TIERS.MAESTRO?.minElo || 3400)) return RANKED_TIERS.MAESTRO || { id: 'maestro', name: 'Maestro', minElo: 3400, color: '', icon: '' };
  if (e >= (RANKED_TIERS.DIAMANTE?.minElo || 2700)) return RANKED_TIERS.DIAMANTE || { id: 'diamante', name: 'Diamante', minElo: 2700, color: '', icon: '' };
  if (e >= (RANKED_TIERS.PLATINO?.minElo || 2100)) return RANKED_TIERS.PLATINO || { id: 'platino', name: 'Platino', minElo: 2100, color: '', icon: '' };
  if (e >= (RANKED_TIERS.ORO?.minElo || 1600)) return RANKED_TIERS.ORO || { id: 'oro', name: 'Oro', minElo: 1600, color: '', icon: '' };
  if (e >= (RANKED_TIERS.PLATA?.minElo || 1200)) return RANKED_TIERS.PLATA || { id: 'plata', name: 'Plata', minElo: 1200, color: '', icon: '' };
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

export function normalizeRankedRules(raw: Partial<RankedRules> = {}, seasonName: string = 'TEMPORADA ACTUAL'): RankedRules {
  return {
    seasonName: seasonName || 'TEMPORADA ACTUAL',
    maxPokemon: Math.max(1, Math.min(6, Number(raw.maxPokemon) || 6)),
    levelCap: Math.max(1, Math.min(100, Number(raw.levelCap) || 100)),
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
    return { ok: false, reason: `${pokemon.name || id} está baneado esta temporada.` };
  }

  if (pokemon.level > rules.levelCap) {
    return { ok: false, reason: `${pokemon.name || id} supera el nivel máximo (${rules.levelCap}).` };
  }

  if (rules.allowedTypes.length > 0) {
    const types = [pokemon.type, pokemon.type2].filter((t): t is PokemonType => !!t);
    const hasAllowedType = types.some((t: PokemonType) => rules.allowedTypes.includes(t));
    if (!hasAllowedType) {
      return { ok: false, reason: `${pokemon.name || id} no tiene un tipo permitido.` };
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
