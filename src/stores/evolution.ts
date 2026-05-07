import { defineStore } from 'pinia';
import { ref } from 'vue';
import { evolvePokemonData } from '@/logic/evolutionLogic';
import { useGameStore } from '@/stores/game';

export const useEvolutionStore = defineStore('evolution', () => {
  const gameStore = useGameStore() as any;

  // --- STATE ---
  const isEvolving = ref(false);
  const sourcePokemon = ref<any>(null);
  const targetId = ref<string | null>(null);
  const onComplete = ref<((data: any) => void) | null>(null);
  const pendingMoves = ref<any[]>([]);

  // --- ACTIONS ---

  /**
   * Starts the evolution sequence.
   * @param {Object} pokemon - The pokemon instance to evolve.
   * @param {String} targetSpeciesId - The ID of the target species.
   * @param {Function} callback - Callback after the animation finishes.
   */
  function startEvolution(pokemon: any, targetSpeciesId: string, callback: ((data: any) => void) | null = null) {
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

    pendingMoves.value = (result as any).pendingMoves;

    // Pokédex registration
    gameStore.registerPokedex(targetId.value, true); // true = caught
    
    // Persistence
    gameStore.scheduleSave();
    
    return { 
      oldName: (result as any).oldName, 
      newName: sourcePokemon.value.name,
      fromId: (result as any).fromId,
      toId: (result as any).toId
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
