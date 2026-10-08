<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import VirtualEntity from './VirtualEntity.vue'
import BattleTrainerFigure from './BattleTrainerFigure.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getPokemonFeetCoords } from '@/logic/combat/shadowHelpers'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import {
  TRAINER_RETREAT_X_OFFSET_PX,
  TRAINER_RETREAT_Y_OFFSET_PX,
  TRAINER_RETREAT_SCALE
} from '@/logic/constants/animations'
import type { GenderId } from '@/types/system/game'

const props = defineProps<{
  isTrainerVisible: boolean
  showStandingTrainers: boolean
  trainerAnimState?: string | null
  showGuides: boolean
  p2Pos: { x: number; y: number }
  baseEntitySizeEnemy: number
  baseEntitySizePlayer: number
  objectScale: number
  isTrainerOrGym: boolean
  isPvP: boolean
  trainerSprite?: string
  trainerGender?: GenderId
  trainerName?: string
  playerBackSpriteUrl: string
}>()

const resolvedEnemyTrainerSprite = computed(() => {
  if (props.trainerSprite) return props.trainerSprite
  if (props.isPvP) return 'entrenador'
  return props.trainerName || 'entrenador'
})

const enemyTrainerSpriteUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.TRAINER, resolvedEnemyTrainerSprite.value, { gender: props.trainerGender })
})

const shadowStore = useCombatShadowStore()
const enemyTrainerShadowKey = computed(() => `trainer_enemy_${resolvedEnemyTrainerSprite.value}`)
const playerTrainerShadowKey = computed(() => `trainer_player_${props.playerBackSpriteUrl}`)

const enemyFeetCoords = computed(() => {
  if (!enemyTrainerSpriteUrl.value) return null
  try {
    return getPokemonFeetCoords(enemyTrainerSpriteUrl.value)
  } catch {
    return null
  }
})

const playerFeetCoords = computed(() => {
  if (!props.playerBackSpriteUrl) return null
  try {
    return getPokemonFeetCoords(props.playerBackSpriteUrl)
  } catch {
    return null
  }
})

const TRAINER_SHADOW_FEET_Y = 1.0

const enemyTrainerSize = computed(() => props.baseEntitySizeEnemy * (props.objectScale || 2))
const playerTrainerSize = computed(() => props.baseEntitySizePlayer * (props.objectScale || 2))

watch(
  [enemyTrainerShadowKey, enemyTrainerSpriteUrl, enemyTrainerSize, enemyFeetCoords],
  () => {
    if (enemyTrainerSpriteUrl.value) {
      const coords = enemyFeetCoords.value
      shadowStore.requestShadow(enemyTrainerShadowKey.value, {
        side: 'enemy',
        feetX: 0.5,
        feetY: TRAINER_SHADOW_FEET_Y,
        entitySize: enemyTrainerSize.value,
        width: '70%',
        isFlying: coords?.isFlying ?? false,
        shadowScale: coords?.shadowScale ?? 1.0,
        spriteUrl: enemyTrainerSpriteUrl.value,
        visible: true
      })
    }
  },
  { immediate: true }
)

watch(
  [playerTrainerShadowKey, () => props.playerBackSpriteUrl, playerTrainerSize, playerFeetCoords],
  () => {
    if (props.playerBackSpriteUrl) {
      const coords = playerFeetCoords.value
      shadowStore.requestShadow(playerTrainerShadowKey.value, {
        side: 'player',
        feetX: 0.5,
        feetY: TRAINER_SHADOW_FEET_Y,
        entitySize: playerTrainerSize.value,
        width: '70%',
        isFlying: coords?.isFlying ?? false,
        shadowScale: coords?.shadowScale ?? 1.0,
        spriteUrl: props.playerBackSpriteUrl,
        visible: true
      })
    }
  },
  { immediate: true }
)

const trainerRef = ref<InstanceType<typeof VirtualEntity> | null>(null)
const standingTrainerRef = ref<InstanceType<typeof VirtualEntity> | null>(null)

const PLAYER_TRAINER_ASPECT_WIDTH_PX = 65
const PLAYER_TRAINER_ASPECT_HEIGHT_PX = 165
const STANDING_PLAYER_Y_OFFSET_PX = 55

const standingPlayerWidth = computed(() =>
  Math.round(props.baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX)
)

const standingPlayerX = computed(() =>
  WORLD_CONSTANTS.SAFE_ZONE_X - standingPlayerWidth.value * (props.objectScale || 2)
)

// Anchored relative to P1 ANCHOR with custom vertical ground nudge to align feet with the battlefield ground line.
// Height: baseEntitySizePlayer * objectScale = 225 * 2 = 450px.
// Base Top: 1233 + 55 = 1288, Bottom: 1288 + 450 = 1738.
const standingPlayerY = computed(() =>
  WORLD_CONSTANTS.SAFE_ZONE_Y + WORLD_CONSTANTS.SAFE_ZONE_HEIGHT - WORLD_CONSTANTS.ENTITY_SIZE_PLAYER + STANDING_PLAYER_Y_OFFSET_PX
)

onUnmounted(() => {
  if (enemyTrainerShadowKey.value) {
    shadowStore.hideShadow(enemyTrainerShadowKey.value)
  }
  if (playerTrainerShadowKey.value) {
    shadowStore.hideShadow(playerTrainerShadowKey.value)
  }
})

const getTrainerElement = (): HTMLElement | null => {
  const el = props.showStandingTrainers ? standingTrainerRef.value : trainerRef.value
  if (!el) return null
  if ('$el' in el && el.$el instanceof HTMLElement) return el.$el
  if (el instanceof HTMLElement) return el
  return null
}

function onEnemyTrainerError(e: Event): void {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { gender: props.trainerGender })
  }
}

function onPlayerTrainerBackError(e: Event): void {
  const target = e.target as HTMLImageElement | null
  if (target) {
    target.src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { trainerSuffix: 'back', gender: 'h' })
  }
}

defineExpose({
  trainerRef,
  standingTrainerRef,
  getTrainerElement
})
</script>

<template>
  <!-- Entrenador Rival en Introducción (Slide-in al centro, Diálogo en Centro y Retirada al fondo) -->
  <VirtualEntity
    v-if="!showStandingTrainers && isTrainerVisible && isTrainerOrGym"
    ref="trainerRef"
    :x="p2Pos.x"
    :y="p2Pos.y"
    :w="baseEntitySizeEnemy"
    :h="baseEntitySizeEnemy"
    class="trainer-entity"
  >
    <BattleTrainerFigure
      :sprite-url="enemyTrainerSpriteUrl"
      :alt-text="trainerName || 'Entrenador rival'"
      :size="enemyTrainerSize"
      :feet-coords="enemyFeetCoords"
      :shadow-key="enemyTrainerShadowKey"
      :show-guide="showGuides"
      :guide-width="baseEntitySizeEnemy * (objectScale || 2)"
      :guide-height="baseEntitySizeEnemy * (objectScale || 2)"
      @error="onEnemyTrainerError"
    />
  </VirtualEntity>

  <!-- Standing Enemy Trainer (During active combat) -->
  <!-- ui-branching-ok: visual entity rendering for trainers/gyms/pvp standing sprite in field -->
  <VirtualEntity
    v-if="showStandingTrainers && (isTrainerOrGym || isPvP)"
    ref="standingTrainerRef"
    :x="p2Pos.x + TRAINER_RETREAT_X_OFFSET_PX"
    :y="p2Pos.y + TRAINER_RETREAT_Y_OFFSET_PX"
    :w="baseEntitySizeEnemy"
    :h="baseEntitySizeEnemy"
    class="standing-trainer enemy-trainer"
  >
    <BattleTrainerFigure
      :sprite-url="enemyTrainerSpriteUrl"
      :alt-text="trainerName || 'Entrenador rival'"
      :size="enemyTrainerSize"
      :feet-coords="enemyFeetCoords"
      :shadow-key="enemyTrainerShadowKey"
      :show-guide="showGuides"
      :guide-width="baseEntitySizeEnemy * (objectScale || 2) * TRAINER_RETREAT_SCALE"
      :guide-height="baseEntitySizeEnemy * (objectScale || 2) * TRAINER_RETREAT_SCALE"
      @error="onEnemyTrainerError"
    />
  </VirtualEntity>

  <!-- Standing Player Trainer (_back) -->
  <VirtualEntity
    :x="standingPlayerX"
    :y="standingPlayerY"
    :w="standingPlayerWidth"
    :h="baseEntitySizePlayer"
    class="standing-trainer player-trainer"
  >
    <BattleTrainerFigure
      :sprite-url="playerBackSpriteUrl"
      alt-text="Player Trainer"
      :size="playerTrainerSize"
      :feet-coords="playerFeetCoords"
      :shadow-key="playerTrainerShadowKey"
      :show-guide="showGuides"
      :guide-width="standingPlayerWidth * (objectScale || 2)"
      :guide-height="baseEntitySizePlayer * (objectScale || 2)"
      image-class="player-trainer-image shadow-pixelated"
      @error="onPlayerTrainerBackError"
    />
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
