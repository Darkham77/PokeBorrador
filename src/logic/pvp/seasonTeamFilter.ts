import type { Pokemon } from '@/types/pokemon/pokemon';
import type { SeasonalThemeConfig } from '@/data/system/rankedData';
import type { SeasonRules } from '@/types/battle/pvp';
import type { PokemonType } from '@/data/battle/types';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { calculatePokemonStrengthScore } from '@/logic/pokemon/pokemonUtils';
import { isLittleCupEligible, getPokemonGeneration } from '@/logic/pokemon/pokemonSpeciesHelper.ts';
const DEFAULT_TEAM_COUNT = 6 as const;

export interface PokemonSeasonEvaluation {
  eligible: boolean;
  reason?: string;
}

export type SeasonRulesInput = Partial<SeasonalThemeConfig> | SeasonRules | Record<string, unknown>;

function getPokemonTypes(pokemon: Pokemon): readonly PokemonType[] {
  const result: PokemonType[] = [];
  if (pokemon.type) result.push(pokemon.type);
  if (pokemon.type2 && pokemon.type2 !== pokemon.type) result.push(pokemon.type2);
  return result;
}

function checkBannedSpecies(
  speciesId: PokemonSpeciesId,
  rules: SeasonRulesInput
): PokemonSeasonEvaluation | null {
  const banned = ('bannedPokemonIds' in rules && Array.isArray(rules.bannedPokemonIds))
    ? (rules.bannedPokemonIds as readonly PokemonSpeciesId[])
    : [];
  if (banned.includes(speciesId)) {
    return { eligible: false, reason: 'Especie baneada en esta temporada' };
  }
  return null;
}

function checkLevelCap(
  level: number,
  rules: SeasonRulesInput
): PokemonSeasonEvaluation | null {
  const isLittleCup = 'isLittleCup' in rules && Boolean(rules.isLittleCup);
  const effectiveLevelCap = isLittleCup
    ? (('levelCap' in rules && typeof rules.levelCap === 'number') ? rules.levelCap : 5)
    : (('levelCap' in rules && typeof rules.levelCap === 'number' && rules.levelCap > 0) ? rules.levelCap : undefined);

  if (effectiveLevelCap !== undefined && level > effectiveLevelCap) {
    return {
      eligible: false,
      reason: isLittleCup
        ? `Nivel excede el límite de Little Cup (Nivel máximo: ${effectiveLevelCap})`
        : `Nivel excede el límite de la temporada (Nivel máximo: ${effectiveLevelCap})`
    };
  }
  return null;
}

function checkLittleCupAndGen(
  speciesId: PokemonSpeciesId,
  rules: SeasonRulesInput
): PokemonSeasonEvaluation | null {
  if ('isLittleCup' in rules && rules.isLittleCup) {
    if (!isLittleCupEligible(speciesId)) {
      return { eligible: false, reason: 'En Little Cup sólo se permiten crías o formas base con evolución' };
    }
  }

  const allowedGens = ('allowedGenerations' in rules && Array.isArray(rules.allowedGenerations))
    ? (rules.allowedGenerations as readonly number[])
    : [];
  const monGen = getPokemonGeneration(speciesId);
  if (allowedGens.length > 0 && !allowedGens.includes(monGen)) {
    return {
      eligible: false,
      reason: `Generación (Gen ${monGen}) no permitida en esta temporada (Permitidas: ${allowedGens.join(', ')})`
    };
  }
  return null;
}

function checkTypeRestrictions(
  pokeTypes: readonly PokemonType[],
  rules: SeasonRulesInput
): PokemonSeasonEvaluation | null {
  const allowed = ('allowedTypes' in rules && Array.isArray(rules.allowedTypes))
    ? (rules.allowedTypes as PokemonType[])
    : undefined;
  if (allowed && allowed.length > 0) {
    const hasAllowed = pokeTypes.some(t => allowed.includes(t));
    if (!hasAllowed) {
      return { eligible: false, reason: `Tipo (${pokeTypes.join('/')}) no permitido en esta temporada` };
    }
  }

  if ('requiresMonotype' in rules && rules.requiresMonotype && pokeTypes.length !== 1) {
    return { eligible: false, reason: 'Esta temporada exige Pokémon de un solo tipo (Monotipo)' };
  }

  if ('requiresDualType' in rules && rules.requiresDualType) {
    if (pokeTypes.length < 2) {
      return { eligible: false, reason: 'Esta temporada exige Pokémon de doble tipo' };
    }
    if (allowed && allowed.length > 0 && !pokeTypes.every(t => allowed.includes(t))) {
      return { eligible: false, reason: 'Ambos tipos deben pertenecer a los tipos permitidos' };
    }
  }

  return null;
}

export function evaluatePokemonForSeason(
  pokemon: Pokemon | null | undefined,
  rules: SeasonRulesInput
): PokemonSeasonEvaluation {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon no válido' };
  }
  if (pokemon.isIllegal) {
    return { eligible: false, reason: 'Pokémon marcado como ilegal' };
  }

  const speciesId = requirePokemonSpeciesId(pokemon.id);

  const bannedRes = checkBannedSpecies(speciesId, rules);
  if (bannedRes) return bannedRes;

  const levelRes = checkLevelCap(pokemon.level, rules);
  if (levelRes) return levelRes;

  const specRes = checkLittleCupAndGen(speciesId, rules);
  if (specRes) return specRes;

  const typeRes = checkTypeRestrictions(getPokemonTypes(pokemon), rules);
  if (typeRes) return typeRes;

  return { eligible: true };
}

export function buildAutoRankedTeam(
  pool: (Pokemon | null | undefined)[],
  rules: SeasonRulesInput,
  count: number = DEFAULT_TEAM_COUNT
): Pokemon[] {
  const eligible = (pool || []).filter((p): p is Pokemon => {
    return p != null && evaluatePokemonForSeason(p, rules).eligible;
  });

  if (eligible.length === 0) return [];

  const seen = new Set<string>();
  const uniqueEligible: Pokemon[] = [];
  for (const p of eligible) {
    const key = p.uid;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEligible.push(p);
    }
  }

  uniqueEligible.sort((a, b) => calculatePokemonStrengthScore(b) - calculatePokemonStrengthScore(a));

  return uniqueEligible.slice(0, count);
}
