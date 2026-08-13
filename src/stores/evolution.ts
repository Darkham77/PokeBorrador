import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evolvePokemonData } from '@/logic/evolution/evolutionLogic';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { useGameStore } from '@/stores/game';
import type { Pokemon, PokemonMove } from '@/types/pokemon/pokemon';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';

export interface EvolutionCompletePayload {
  pokemon: Pokemon;
  pendingMoves: PokemonMove[];
}

export const useEvolutionStore = defineStore('evolution', () => {
  const gameStore = useGameStore();

  // --- STATE ---
  const isEvolving = ref(false);
  const sourcePokemon = ref<Pokemon | null>(null);
  const targetId = ref<PokemonSpeciesId | null>(null);
  const itemName = ref<string>('');
  const onComplete = ref<((data: EvolutionCompletePayload) => void) | null>(null);
  const pendingMoves = ref<PokemonMove[]>([]);

  // --- ACTIONS ---

  /**
   * Starts the evolution sequence.
   * @param {Object} pokemon - The pokemon instance to evolve.
   * @param {String} targetSpeciesId - The ID of the target species.
   * @param {String} evItemName - Name of the evolutionary item used (optional).
   * @param {Function} callback - Callback after the animation finishes.
   */
  function startEvolution(
    pokemon: Pokemon, 
    targetSpeciesId: string, 
    evItemName = '', 
    callback: ((data: EvolutionCompletePayload) => void) | null = null
  ) {
    sourcePokemon.value = pokemon;
    targetId.value = requirePokemonSpeciesId(targetSpeciesId);
    itemName.value = evItemName;
    isEvolving.value = true;
    onComplete.value = callback;
    pendingMoves.value = [];
  }

  /**
   * Performs the data transformation of the pokemon species.
   * Mutates the sourcePokemon object.
   */
  function evolve() {
    if (!sourcePokemon.value || !targetId.value) return;

    const result = evolvePokemonData(sourcePokemon.value, targetId.value);
    if (!result) return;

    pendingMoves.value = result.pendingMoves;

    // Pokédex registration
    gameStore.registerPokedex(targetId.value, true); // true = caught
    
    // Persistence
    gameStore.scheduleSave();
    
    return { 
      oldName: pokemonDataProvider.getPokemonData(result.fromId)?.name || 'Pokémon', 
      newName: sourcePokemon.value.name,
      fromId: result.fromId,
      toId: result.toId
    };
  }

  /**
   * Resets the evolution state and triggers the callback.
   */
  function finishEvolution() {
    isEvolving.value = false;
    if (onComplete.value) {
      if (sourcePokemon.value) {
        onComplete.value({
          pokemon: sourcePokemon.value,
          pendingMoves: pendingMoves.value
        });
      }
    }
    sourcePokemon.value = null;
    targetId.value = null;
    onComplete.value = null;
  }

  return {
    isEvolving,
    sourcePokemon,
    targetId,
    itemName,
    pendingMoves,
    startEvolution,
    evolve,
    finishEvolution
  };
});
