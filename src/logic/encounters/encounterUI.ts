
import { useModalStore } from '@/stores/modals'
import type { Pokemon } from '@/types/pokemon/pokemon'

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
export function startFishingMinigame(
  enemy: Pokemon,
  rarity: number,
  onWin: (difficulty?: string) => void,
  onFail: () => void,
  difficulty?: string
): void {
  const modalStore = useModalStore()
  
  modalStore.open('Fishing', {
    pokemon: enemy,
    rarity: rarity,
    difficulty: difficulty,
    onWin: onWin,
    onFail: onFail
  })
}

/**
 * Shows the archaeology intro modal and then starts the minigame.
 */
export function showArchaeologyIntro(pokemon: Pokemon, rarity: number, onStart: () => void): void {
  const modalStore = useModalStore()
  modalStore.open('EncounterSequence', {
    type: 'archaeology',
    pokemon: pokemon,
    rarity: rarity,
    onStart: onStart
  })
}

/**
 * Starts the grid-based archaeology minigame via Vue UI.
 */
export function startArchaeologyMinigame(
  enemy: Pokemon,
  rarity: number,
  onWin: (difficulty?: string) => void,
  onFail: () => void,
  difficulty?: string
): void {
  const modalStore = useModalStore()
  
  modalStore.open('Archaeology', {
    pokemon: enemy,
    rarity: rarity,
    difficulty: difficulty,
    onWin: onWin,
    onFail: onFail
  })
}
