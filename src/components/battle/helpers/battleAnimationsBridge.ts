import type { useBattleAnimations } from '@/composables/battle/useBattleAnimations'
import type { useBattleStore } from '@/stores/battle/battle'

export function createBattleAnimationsBridge(
  animations: ReturnType<typeof useBattleAnimations>
): NonNullable<ReturnType<typeof useBattleStore>['animations']> {
  return {
    triggerSearchEncounter: animations.triggerSearchEncounter,
    revealWildPokemon: animations.revealWildPokemon,
    triggerWildEmergence: animations.triggerWildEmergence,
    triggerCatchSparkles: animations.triggerCatchSparkles,
    handleCatchRequest: animations.handleCatchRequest,
    handleReleaseRequest: animations.handleReleaseRequest,
    handleWithdrawRequest: animations.handleWithdrawRequest,
    handleShakeRequest: animations.handleShakeRequest,
    handleFaintAnim: animations.handleFaintAnim,
    playCatchCelebration: animations.playCatchCelebration,
    playBallFadeOut: animations.playBallFadeOut,
    triggerTrainerEntry: animations.triggerTrainerEntry,
    triggerTrainerDialogs: animations.triggerTrainerDialogs,
    triggerTrainerRetreat: animations.triggerTrainerRetreat,
    triggerTrainerExit: animations.triggerTrainerExit,
    triggerPokemonCall: animations.triggerPokemonCall,
    handleHealRequest: animations.handleHealRequest,
    handleBlinkRequest: animations.handleBlinkRequest,
    awaitTween: animations.awaitTween,
    resetAll: animations.resetAll
  }
}
