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
import {
  showEvolutionScene,
  showStonePicker,
  useStoneOnPokemon
} from '@/logic/evolutionUI'
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData'

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

  // UI Bindings
  window.showEvolutionScene = showEvolutionScene
  window.showStonePicker = showStonePicker
  window.useStoneOnPokemon = useStoneOnPokemon
  
  console.log('[EvolutionBridge] Evolution and Factory bindings initialized.')
}
