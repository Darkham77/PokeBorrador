import { TRAINER_RANKS, MARKET_UNLOCKS } from '@/data/player/trainer'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'
import { OBEY_LEVEL_BY_BADGES } from '@/logic/constants/gameplay'
import { gsap } from 'gsap'
import { levelUpPokemon } from '@/logic/pokemon/pokemonFactory'
import { useUIStore, type LearnItem } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import type { GameState } from '@/types/system/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

export function useTrainerActions(state: GameState, scheduleSave: () => Promise<void>) {
  function getTrainerRank() {
    const idx = Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)
    return TRAINER_RANKS[idx]
  }

  function addTrainerExp(amount: number) {
    const uiStore = useUIStore()
    const eventStore = useEventStore()
    const evBonus = (eventStore.globalMultipliers?.exp || 1) - 1
    const totalMult = 1 + evBonus
    if (totalMult > 1) amount = Math.round(amount * totalMult)
    
    state.trainerExp += amount
    
    // Sumar XP a la clase activa también
    const classStore = usePlayerClassStore()
    classStore.addXP(amount)
    
    const MAX_LEVEL = 30
    
    let currentRank = getTrainerRank()
    if (!currentRank) return

    while (state.trainerExp >= (currentRank?.expNeeded || 0) && state.trainerLevel < MAX_LEVEL) {
      state.trainerExp -= (currentRank?.expNeeded || 0)
      state.trainerLevel++
      
      currentRank = getTrainerRank()
      if (currentRank) {
        uiStore.notify(`¡Subiste al rango ${currentRank.title}! Nivel ${state.trainerLevel}`, '⭐')
      }
      
      const unlocks = (MARKET_UNLOCKS as Record<number, readonly string[]>)[state.trainerLevel]
      if (unlocks) {
        gsap.delayedCall(1.5, () => uiStore.notify(`¡Nuevos items en el Poké Market!`, '🛒'))
      }
    }

    if (currentRank) {
      state.trainerExpNeeded = currentRank.expNeeded
    }

    scheduleSave()
  }

  function checkLevelUp(pokemon: Pokemon) {
    const uiStore = useUIStore()
    const learnQueue: LearnItem[] = []

    if (pokemon.level >= MAX_POKEMON_LEVEL) {
      pokemon.exp = 0
      pokemon.expNeeded = Infinity
      scheduleSave()
      return
    }

    while (pokemon.exp >= pokemon.expNeeded && pokemon.level < MAX_POKEMON_LEVEL) {
      pokemon.exp -= pokemon.expNeeded
      const pendingMoves = levelUpPokemon(pokemon)
      
      if (pendingMoves === null) break // Blocked by Everstone

      uiStore.notify(`¡${pokemon.name} subió al nivel ${pokemon.level}!`, '📈')
      
      if (pendingMoves && pendingMoves.length > 0) {
        pendingMoves.forEach(m => learnQueue.push({ pokemon, move: m }))
      }
    }

    if (learnQueue.length > 0) {
      uiStore.addToLearnQueue(learnQueue)
    }

    scheduleSave()
  }

  function getMaxObeyLevel() {
    const badgeCount = Math.min(8, Math.max(0, state.defeatedGyms?.length || 0))
    return OBEY_LEVEL_BY_BADGES[badgeCount] ?? OBEY_LEVEL_BY_BADGES[0]
  }

  return { getTrainerRank, addTrainerExp, checkLevelUp, getMaxObeyLevel }
}
