import type { Pokemon } from '@/types/pokemon/pokemon';
import type { SeasonalThemeConfig } from '@/data/system/rankedData';
import type { PokemonType } from '@/data/battle/types';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { Dex } from '@pkmn/sim';

const LEVEL_WEIGHT_MULTIPLIER = 1000 as const;
const DEFAULT_LEVEL_FALLBACK = 1 as const;
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

  const speciesId = pokemon.species;
  const spec = Dex.species.get(speciesId);

  // 1. Check banned species
  const banned = (rules.bannedPokemonIds || []) as readonly PokemonSpeciesId[];
  if (banned.includes(speciesId)) {
    return { eligible: false, reason: 'Especie baneada en esta temporada' };
  }

  // 2. Little cup checks
  if (rules.isLittleCup) {
    const levelCap = ('levelCap' in rules && typeof rules.levelCap === 'number') ? rules.levelCap : 5;
    if ((pokemon.level || 1) > levelCap) {
      return { eligible: false, reason: `Nivel excede el límite de Little Cup (Máx Lv ${levelCap})` };
    }
    const hasPrevo = Boolean(spec.prevo);
    const hasEvos = Boolean(spec.evos && spec.evos.length > 0);
    if (hasPrevo || !hasEvos) {
      return { eligible: false, reason: 'En Little Cup sólo se permiten crías o formas base con evolución' };
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

export function calculatePokemonStrengthScore(p: Pokemon): number {
  const ivs = p.ivs;
  const totalIvs = ivs
    ? (Number(ivs.hp) || 0) +
      (Number(ivs.atk) || 0) +
      (Number(ivs.def) || 0) +
      (Number(ivs.spa) || 0) +
      (Number(ivs.spd) || 0) +
      (Number(ivs.spe) || 0)
    : 0;

  return (p.level || DEFAULT_LEVEL_FALLBACK) * LEVEL_WEIGHT_MULTIPLIER + totalIvs;
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
    const key = p.uid || p.id || Math.random().toString();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEligible.push(p);
    }
  }

  uniqueEligible.sort((a, b) => calculatePokemonStrengthScore(b) - calculatePokemonStrengthScore(a));

  return uniqueEligible.slice(0, count);
}
