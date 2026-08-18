import { computed, type ComputedRef } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { GYMS } from '@/data/world/gyms'
import type { BattleState } from '@/types/battle/battle'
import type { useBattleStore } from '@/stores/battle/battle'

export function useBattleTrainerVisuals(
  battleStore: ReturnType<typeof useBattleStore>,
  battle: ComputedRef<BattleState | null | undefined>
) {
  const classStore = usePlayerClassStore()
  const gameStore = useGameStore()

  const playerBackSpriteUrl = computed(() => {
    const spriteId = classStore.currentClassDef?.avatarSpriteId || classStore.currentClassDef?.id || 'entrenador'
    const gender = gameStore.state.gender || 'h'
    return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'back', gender })
  })

  const showStandingTrainers = computed(() => {
    return battleStore.isBattleActive && 
           battleStore.currentFsmState !== 'FIRST_INTRO' && 
           battleStore.currentFsmState !== 'INITIALIZING' &&
           !battleStore.isSearching
  })

  const trainerDialogText = computed(() => {
    if (!battle.value) return ''
    if (battle.value.isGym && battle.value.gymId) {
      const gym = GYMS.find(g => g.id === battle.value?.gymId)
      if (gym) return gym.quote
    }
    if (battle.value.quote) return battle.value.quote
    return '¡Prepárate para combatir! ¡No te lo pondré fácil!'
  })

  return {
    playerBackSpriteUrl,
    showStandingTrainers,
    trainerDialogText
  }
}
