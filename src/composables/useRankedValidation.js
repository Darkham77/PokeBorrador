import { useRankedStore } from '@/stores/rankedStore';

export function useRankedValidation() {
  const rankedStore = useRankedStore();

  /**
   * Valida un único Pokémon contra las reglas actuales.
   */
  const validatePokemon = (pokemon) => {
    if (!pokemon) return { ok: false, reason: 'Pokémon inválido.' };

    const rules = rankedStore.rules;
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
    if (rules.allowedTypes?.length > 0) {
      const types = Array.isArray(pokemon.type) ? pokemon.type : [pokemon.type];
      const hasAllowedType = types.some(t => rules.allowedTypes.includes(t.toLowerCase()));
      if (!hasAllowedType) {
        return { ok: false, reason: `${pokemon.name} no cumple con los tipos permitidos.` };
      }
    }

    return { ok: true };
  };

  /**
   * Valida un equipo completo.
   */
  const validateTeam = (team) => {
    if (!team || team.length === 0) {
      return { ok: false, reason: 'El equipo está vacío.' };
    }

    const rules = rankedStore.rules;
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
