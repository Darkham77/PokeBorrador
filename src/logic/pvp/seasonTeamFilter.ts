import type { Pokemon } from '@/types/pokemon/pokemon';
import type { SeasonalThemeConfig } from '@/data/system/rankedData';
import type { PokemonType } from '@/data/battle/types';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { calculatePokemonStrengthScore } from '@/logic/pokemon/pokemonUtils';
import { Dex } from '@pkmn/sim';

export { calculatePokemonStrengthScore } from '@/logic/pokemon/pokemonUtils';

const DEFAULT_TEAM_COUNT = 6 as const;

export interface PokemonSeasonEvaluation {
  eligible: boolean;
  reason?: string;
}

export function getPokemonTypes(pokemon: Pokemon): readonly PokemonType[] {
  const result: PokemonType[] = [];
  if (pokemon.type) result.push(pokemon.type);
  if (pokemon.type2 && pokemon.type2 !== pokemon.type) result.push(pokemon.type2);
  return result;
}

export function evaluatePokemonForSeason(
  pokemon: Pokemon | null | undefined,
  rules: Partial<SeasonalThemeConfig> | Record<string, unknown>
): PokemonSeasonEvaluation {
  if (!pokemon) {
    return { eligible: false, reason: 'Pokémon no válido' };
  }
  if (pokemon.isIllegal) {
    return { eligible: false, reason: 'Pokémon marcado como ilegal' };
  }

  const speciesId = requirePokemonSpeciesId(pokemon.id);
  const spec = Dex.species.get(speciesId);

  // 1. Check banned species
  const banned = (rules.bannedPokemonIds || []) as readonly PokemonSpeciesId[];
  if (banned.includes(speciesId)) {
    return { eligible: false, reason: 'Especie baneada en esta temporada' };
  }

  // 2. Level cap checks (general levelCap or Little Cup levelCap)
  const effectiveLevelCap = rules.isLittleCup
    ? (('levelCap' in rules && typeof rules.levelCap === 'number') ? rules.levelCap : 5)
    : (('levelCap' in rules && typeof rules.levelCap === 'number' && rules.levelCap > 0) ? rules.levelCap : undefined);

  if (effectiveLevelCap !== undefined && pokemon.level > effectiveLevelCap) {
    return {
      eligible: false,
      reason: rules.isLittleCup
        ? `Nivel excede el límite de Little Cup (Nivel máximo: ${effectiveLevelCap})`
        : `Nivel excede el límite de la temporada (Nivel máximo: ${effectiveLevelCap})`
    };
  }

  // 3. Little cup checks
  if (rules.isLittleCup) {
    const hasPrevo = Boolean(spec.prevo);
    const hasEvos = Boolean(spec.evos && spec.evos.length > 0);
    if (hasPrevo || !hasEvos) {
      return { eligible: false, reason: 'En Little Cup sólo se permiten crías o formas base con evolución' };
    }
  }

  // 4. Allowed generations check
  const allowedGens = (rules.allowedGenerations || []) as readonly number[];
  if (allowedGens.length > 0) {
    const monGen = spec.gen;
    if (!allowedGens.includes(monGen)) {
      return {
        eligible: false,
        reason: `Generación (Gen ${monGen}) no permitida en esta temporada (Permitidas: ${allowedGens.join(', ')})`
      };
    }
  }

  const pokeTypes = getPokemonTypes(pokemon);

  // 3. Allowed types check
  const allowed = rules.allowedTypes as PokemonType[] | undefined;
  if (allowed && allowed.length > 0) {
    const hasAllowed = pokeTypes.some(t => allowed.includes(t));
    if (!hasAllowed) {
      return { eligible: false, reason: `Tipo (${pokeTypes.join('/')}) no permitido en esta temporada` };
    }
  }

  // 4. Requires monotype
  if (rules.requiresMonotype) {
    if (pokeTypes.length !== 1) {
      return { eligible: false, reason: 'Esta temporada exige Pokémon de un solo tipo (Monotipo)' };
    }
  }

  // 5. Requires dual type
  if (rules.requiresDualType) {
    if (pokeTypes.length < 2) {
      return { eligible: false, reason: 'Esta temporada exige Pokémon de doble tipo' };
    }
    if (allowed && allowed.length > 0) {
      const allAllowed = pokeTypes.every(t => allowed.includes(t));
      if (!allAllowed) {
        return { eligible: false, reason: 'Ambos tipos deben pertenecer a los tipos permitidos' };
      }
    }
  }

  return { eligible: true };
}

export function buildAutoRankedTeam(
  pool: (Pokemon | null | undefined)[],
  rules: Partial<SeasonalThemeConfig> | Record<string, unknown>,
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
