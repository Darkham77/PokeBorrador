import { defineStore } from 'pinia';
import { POKEMON_DB } from '@/data/pokemonDB';
import { 
  checkLevelUpEvolution,
  checkStoneEvolution,
  evolvePokemonData
} from '@/logic/evolutionLogic';
import { useGameStore } from '@/stores/game';

export const useEvolutionStore = defineStore('evolution', {
  state: () => ({
    isEvolving: false,
    sourcePokemon: null,
    targetId: null,
    onComplete: null,
    pendingMoves: []
  }),

  actions: {
    /**
     * Starts the evolution sequence.
     * @param {Object} pokemon - The pokemon instance to evolve.
     * @param {String} targetId - The ID of the target species.
     * @param {Function} onComplete - Callback after the animation finishes.
     */
    startEvolution(pokemon, targetId, onComplete = null) {
      this.sourcePokemon = pokemon;
      this.targetId = targetId;
      this.isEvolving = true;
      this.onComplete = onComplete;
      this.pendingMoves = [];
    },

    /**
     * Performs the data transformation of the pokemon species.
     * Mutates the sourcePokemon object.
     */
    evolve() {
      if (!this.sourcePokemon || !this.targetId) return;

      const result = evolvePokemonData(this.sourcePokemon, this.targetId);
      if (!result) return;

      this.pendingMoves = result.pendingMoves;

      // 5. Pokédex registration
      const gameStore = useGameStore();
      gameStore.registerPokedex(this.targetId, true); // true = caught
      
      // 6. Persistence
      gameStore.scheduleSave();
      
      return { oldName: result.oldName, newName: this.sourcePokemon.name };
    },

    finishEvolution() {
      this.isEvolving = false;
      if (this.onComplete) {
        this.onComplete({
          pokemon: this.sourcePokemon,
          pendingMoves: this.pendingMoves
        });
      }
      this.sourcePokemon = null;
      this.targetId = null;
      this.onComplete = null;
    }
  }
});
