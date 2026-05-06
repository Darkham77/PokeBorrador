import { TRAINER_RANKS, MARKET_UNLOCKS } from '@/data/trainer'
import { levelUpPokemon } from '@/logic/pokemonFactory'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'

export function useTrainerActions(state, scheduleSave) {
  function getTrainerRank() {
    const idx = Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)
    return TRAINER_RANKS[idx]
  }

  function addTrainerExp(amount) {
    const uiStore = useUIStore() as any
    const eventStore = useEventStore() as any
    const evBonus = (eventStore.globalMultipliers?.exp || 1) - 1
    const totalMult = 1 + evBonus
    if (totalMult > 1) amount = Math.round(amount * totalMult)
    
    state.trainerExp += amount
    const MAX_LEVEL = 30
    
    let currentRank = getTrainerRank()


    while (state.trainerExp >= currentRank.expNeeded && state.trainerLevel < MAX_LEVEL) {
      state.trainerExp -= currentRank.expNeeded
      state.trainerLevel++

      
      currentRank = getTrainerRank()
      uiStore.notify(`¡Subiste al rango ${currentRank.title}! Nivel ${state.trainerLevel}`, '⭐')
      
      const unlocks = MARKET_UNLOCKS[state.trainerLevel]
      if (unlocks) {
        setTimeout(() => uiStore.notify(`¡Nuevos items en el Poké Market!`, '🛒'), 1500)
      }
    }

    scheduleSave()
  }

  function checkLevelUp(pokemon) {
    const uiStore = useUIStore() as any
    const learnQueue = []

    while ((pokemon as any).exp >= (pokemon as any).expNeeded && (pokemon as any).level < 100) {
      (pokemon as any).exp -= (pokemon as any).expNeeded
      const pendingMoves = levelUpPokemon(pokemon)
      
      if (pendingMoves === null) break // Blocked by Everstone

      uiStore.notify(`¡${(pokemon as any).name} subió al nivel ${(pokemon as any).level}!`, '📈')
      
      if (pendingMoves.length > 0) {
        pendingMoves.forEach(m => learnQueue.push({ pokemon, move: m }))
      }
    }

    if (learnQueue.length > 0) {
      uiStore.addToLearnQueue(learnQueue)
    }

    scheduleSave()
  }

  function getMaxObeyLevel() {
    const badges = state.defeatedGyms?.length || 0
    if (badges >= 8) return 100
    if (badges >= 7) return 75
    if (badges >= 6) return 65
    if (badges >= 5) return 55
    if (badges >= 4) return 45
    if (badges >= 3) return 35
    if (badges >= 2) return 30
    if (badges >= 1) return 25
    return 20
  }

  return { getTrainerRank, addTrainerExp, checkLevelUp, getMaxObeyLevel }
}
