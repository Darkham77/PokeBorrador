
import { useModalStore } from '@/stores/modals'
import type { Pokemon } from '@/types/pokemon'

/**
 * Triggers the flicker and exclamation animation for a rival encounter.
 */
export function triggerRivalSequence(onComplete: () => void): void {
  const modalStore = useModalStore()
  modalStore.open('EncounterSequence', {
    type: 'rival',
    onComplete: onComplete
  })
}

/**
 * Shows the fishing intro modal and then starts the minigame.
 */
export function showFishingIntro(pokemon: Pokemon, rarity: number, onStart: () => void): void {
  const modalStore = useModalStore()
  modalStore.open('EncounterSequence', {
    type: 'fishing',
    pokemon: pokemon,
    rarity: rarity,
    onStart: onStart
  })
}

/**
 * Starts the rhythm-based fishing minigame via Vue UI.
 */
export function startFishingMinigame(enemy: Pokemon, rarity: number, onWin: () => void, onFail: () => void): void {
  const modalStore = useModalStore()
  
  modalStore.open('Fishing', {
    pokemon: enemy,
    rarity: rarity,
    onWin: onWin,
    onFail: onFail
  })
}
