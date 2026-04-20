
import { useModalStore } from '@/stores/modals'

/**
 * Triggers the flicker and exclamation animation for a rival encounter.
 */
export function triggerRivalSequence(onComplete) {
  const modalStore = useModalStore()
  modalStore.open('EncounterSequence', {
    type: 'rival',
    onComplete: onComplete
  })
}

/**
 * Shows the fishing intro modal and then starts the minigame.
 */
export function showFishingIntro(pokemon, rarity, onStart) {
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
export function startFishingMinigame(enemy, rarity, onWin, onFail) {
  const modalStore = useModalStore()
  
  modalStore.open('Fishing', {
    pokemon: enemy,
    rarity: rarity,
    onWin: onWin,
    onFail: onFail
  })
}
