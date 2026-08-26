import type { BattleMinigame } from '@/types/battle/battle'

// fallow-ignore-next-line unused-exports
export const BATTLE_MINIGAMES = ['fishing', 'archaeology'] as const
export type { BattleMinigame }

export interface MinigameStateCarrier {
  minigame?: BattleMinigame | null
}

/**
 * Single source of truth for detecting if a battle state corresponds to a minigame.
 * Uses the `minigame` field (enum: 'fishing' | 'archaeology' | null).
 */
export function isBattleMinigame(state: MinigameStateCarrier | null | undefined): boolean {
  if (!state) return false
  return state.minigame != null
}

/**
 * Gets the active minigame type ('fishing' | 'archaeology') or null if not a minigame.
 */
export function getActiveMinigame(state: MinigameStateCarrier | null | undefined): BattleMinigame | null { // result-ok
  return state?.minigame ?? null
}

/**
 * Sets the minigame on a given battle state.
 * Pass null or undefined to clear the minigame.
 */
export function setBattleMinigame(
  state: MinigameStateCarrier | null | undefined,
  minigame: BattleMinigame | null | undefined
): void {
  if (!state) return
  state.minigame = minigame ?? null
}

/**
 * Resets the minigame field on a given battle state.
 */
export function resetBattleMinigameFlags(state: MinigameStateCarrier | null | undefined): void {
  if (!state) return
  state.minigame = null
}
