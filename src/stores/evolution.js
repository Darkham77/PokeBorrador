import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evolvePokemonData } from '@/logic/evolutionLogic';
import { useGameStore } from '@/stores/game';

export const useEvolutionStore = defineStore('evolution', () => {
  const gameStore = useGameStore();

  // --- STATE ---
  const isEvolving = ref(false);
  const sourcePokemon = ref(null);
  const targetId = ref(null);
  const onComplete = ref(null);
  const pendingMoves = ref([]);

  // --- ACTIONS ---

  /**
   * Starts the evolution sequence.
   * @param {Object} pokemon - The pokemon instance to evolve.
   * @param {String} targetSpeciesId - The ID of the target species.
   * @param {Function} callback - Callback after the animation finishes.
   */
  function startEvolution(pokemon, targetSpeciesId, callback = null) {
    sourcePokemon.value = pokemon;
    targetId.value = targetSpeciesId;
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
      oldName: result.oldName, 
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
      onComplete.value({
        pokemon: sourcePokemon.value,
        pendingMoves: pendingMoves.value
      });
    }
    sourcePokemon.value = null;
    targetId.value = null;
    onComplete.value = null;
  }

  return {
    isEvolving,
    sourcePokemon,
    targetId,
    pendingMoves,
    startEvolution,
    evolve,
    finishEvolution
  };
});
