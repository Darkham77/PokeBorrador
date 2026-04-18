import { 
  makePokemon, 
  recalcPokemonStats, 
  levelUpPokemon, 
  assignGender, 
  ensurePokemonGender,
  getExpNeeded
} from '@/logic/pokemonFactory'
import {
  checkLevelUpEvolution,
  checkTradeEvolution,
  evolvePokemonData,
  getEvolvedForm
} from '@/logic/evolutionLogic'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventoryStore'

export function initEvolutionBridge() {
  // Constant Bindings
  window.EVOLUTION_TABLE = EVOLUTION_TABLE
  window.STONE_EVOLUTIONS = STONE_EVOLUTIONS
  window.TRADE_EVOLUTIONS = TRADE_EVOLUTIONS

  // Factory Bindings
  window.makePokemon = makePokemon
  window.recalcPokemonStats = recalcPokemonStats
  window.levelUpPokemon = levelUpPokemon
  window.assignGender = assignGender
  window.ensurePokemonGender = ensurePokemonGender
  window.getExpNeeded = getExpNeeded

  // Logic Bindings
  window.checkLevelUpEvolution = checkLevelUpEvolution
  window.checkTradeEvolution = checkTradeEvolution
  window.evolvePokemonData = evolvePokemonData
  window.getEvolvedForm = getEvolvedForm

  // UI Bindings (Pinia redirection)
  window.showEvolutionScene = (pokemon, targetId, onComplete) => {
    const uiStore = useUIStore()
    uiStore.startEvolution(pokemon, targetId, onComplete)
  }

  window.showStonePicker = (teamIndex) => {
    // Legacy call passed teamIndex. We need to get the pokemon and then open the Vue modal.
    if (typeof window.state === 'undefined') return
    const p = window.state.team[teamIndex]
    if (!p) return

    const uiStore = useUIStore()
    uiStore.selectedPokemon = p
    
    const inventoryStore = useInventoryStore()
    // Triggering the stone picker by setting an active item (any stone, or the component logic handles it)
    inventoryStore.activeItemToUse = 'Piedra' // Generic trigger for StonePicker.vue
    inventoryStore.isItemTargetModalOpen = true
  }

  window.useStoneOnPokemon = (stoneName, teamIndex) => {
    // This is handled by StonePicker.vue now, but for legacy compatibility:
    const inventoryStore = useInventoryStore()
    inventoryStore.useItem(stoneName, 'team', teamIndex)
  }
  
  console.log('[EvolutionBridge] Evolution and Factory bindings initialized (Modern Redirects).')
}
