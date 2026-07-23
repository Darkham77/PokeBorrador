import type { Ref } from 'vue'
import type { BattleState } from '@/types/battle/battle'

export function checkEnemyHudSuppressed(
  s: BattleState | null | undefined,
  seat2: unknown,
  isFaintInProgress: Ref<boolean>,
  faintedPokemonSnapshot: Ref<{ side?: string } | null | undefined>,
  fsmState: unknown
): boolean {
  if (s?.isArchaeology) return true
  
  const seat = seat2 as { entry?: Record<string, unknown>; exit?: Record<string, unknown> } | undefined
  const isCapturing = seat?.entry?.isCaptureActive || seat?.entry?.isAnimatingCapture || 
                      seat?.exit?.isCaptureActive || seat?.exit?.isAnimatingCapture ||
                      seat?.entry?.animState === 'catching' || seat?.exit?.animState === 'catching'

  const isFainted = (s?.enemy && s.enemy.hp <= 0) || 
                    (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'enemy')

  if (isCapturing || isFainted) return true

  const isTrainerIntro = s?.isTrainer || s?.isGym || s?.isPvP
  if (isTrainerIntro && fsmState === 'FIRST_INTRO') return false

  return !s?.enemy
}

export function checkPlayerHudSuppressed(
  s: BattleState | null | undefined,
  seat1: unknown,
  isFaintInProgress: Ref<boolean>,
  faintedPokemonSnapshot: Ref<{ side?: string } | null | undefined>
): boolean {
  const seat = seat1 as { entry?: Record<string, unknown>; exit?: Record<string, unknown> } | undefined
  const isCapturing = seat?.entry?.isCaptureActive || seat?.entry?.isAnimatingCapture || 
                      seat?.exit?.isCaptureActive || seat?.exit?.isAnimatingCapture ||
                      seat?.entry?.animState === 'catching' || seat?.exit?.animState === 'catching'

  const isFainted = (s?.player && s.player.hp <= 0) || 
                    (isFaintInProgress.value && faintedPokemonSnapshot.value?.side === 'player')

  if (isCapturing || isFainted) return true
  return !s?.player
}
