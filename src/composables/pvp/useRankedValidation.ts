import { usePvPStore } from '@/stores/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PokemonType } from '@/data/battle/types';

export function useRankedValidation() {
  const rankedStore = usePvPStore();

  /**
   * Valida un único Pokémon contra las reglas actuales.
   */
  const validatePokemon = (pokemon: Pokemon) => {
    if (!pokemon) return { ok: false, reason: 'Pokémon inválido.' };

    const rules = rankedStore.rules;
    if (!rules) return { ok: true }; // No rules, no restrictions

    const pokeId = String(pokemon.id || '').toLowerCase();

    // 1. Ban List
    if (rules.bannedPokemonIds?.includes(pokeId)) {
      return { ok: false, reason: `${pokemon.name} está baneado esta temporada.` };
    }

    // 2. Level Cap
    if (pokemon.level > rules.levelCap) {
      return { ok: false, reason: `${pokemon.name} supera el nivel máximo (${rules.levelCap}).` };
    }

    // 3. Type Restrictions
    if ((rules.allowedTypes?.length ?? 0) > 0) {
      const types = Array.isArray(pokemon.type) ? pokemon.type as PokemonType[] : [pokemon.type as PokemonType];
      const hasAllowedType = types.some((t: PokemonType) => rules.allowedTypes!.includes(t));
      if (!hasAllowedType) {
        return { ok: false, reason: `${pokemon.name} no cumple con los tipos permitidos.` };
      }
    }

    return { ok: true };
  };

  /**
   * Valida un equipo completo.
   */
  const validateTeam = (team: Pokemon[]) => {
    if (!team || team.length === 0) {
      return { ok: false, reason: 'El equipo está vacío.' };
    }

    const rules = rankedStore.rules;
    if (!rules) return { ok: true };

    if (team.length > rules.maxPokemon) {
      return { ok: false, reason: `Máximo ${rules.maxPokemon} Pokémon permitidos.` };
    }

    for (const p of team) {
      const result = validatePokemon(p);
      if (!result.ok) return result;
    }

    return { ok: true };
  };

  return {
    validatePokemon,
    validateTeam
  };
}
