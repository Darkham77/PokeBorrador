<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import VirtualEntity from './VirtualEntity.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getPokemonFeetCoords } from '@/logic/combat/shadowHelpers'
import CombatShadow from './CombatShadow.vue'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import {
  TRAINER_RETREAT_X_OFFSET_PX,
  TRAINER_RETREAT_Y_OFFSET_PX,
  TRAINER_RETREAT_SCALE
} from '@/logic/constants/animations'
import { getTrainerIdleConfig } from './helpers/trainerIdleAnims.ts'
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

const TRAINER_GROUND_Y = '100%' as const
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

const introEnemyTrainerIdleRef = ref<HTMLElement | null>(null)
const standingEnemyTrainerIdleRef = ref<HTMLElement | null>(null)
const playerTrainerIdleRef = ref<HTMLElement | null>(null)

let introEnemyIdleTween: gsap.core.Tween | null = null
let standingEnemyIdleTween: gsap.core.Tween | null = null
let playerIdleTween: gsap.core.Tween | null = null

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

const initIntroEnemyIdleAnim = () => {
  if (introEnemyIdleTween) {
    introEnemyIdleTween.kill()
    introEnemyIdleTween = null
  }
  if (!introEnemyTrainerIdleRef.value) return
  gsap.killTweensOf(introEnemyTrainerIdleRef.value)
  gsap.set(introEnemyTrainerIdleRef.value, { transformOrigin: 'bottom center' })
  introEnemyIdleTween = gsap.to(introEnemyTrainerIdleRef.value, getTrainerIdleConfig())
}

const initStandingEnemyIdleAnim = () => {
  if (standingEnemyIdleTween) {
    standingEnemyIdleTween.kill()
    standingEnemyIdleTween = null
  }
  if (!standingEnemyTrainerIdleRef.value) return
  gsap.killTweensOf(standingEnemyTrainerIdleRef.value)
  gsap.set(standingEnemyTrainerIdleRef.value, { transformOrigin: 'bottom center' })
  standingEnemyIdleTween = gsap.to(standingEnemyTrainerIdleRef.value, getTrainerIdleConfig())
}

const initPlayerIdleAnim = () => {
  if (playerIdleTween) {
    playerIdleTween.kill()
    playerIdleTween = null
  }
  if (!playerTrainerIdleRef.value) return
  gsap.killTweensOf(playerTrainerIdleRef.value)
  gsap.set(playerTrainerIdleRef.value, { transformOrigin: 'bottom center' })
  playerIdleTween = gsap.to(playerTrainerIdleRef.value, getTrainerIdleConfig())
}

watch(introEnemyTrainerIdleRef, (el) => {
  if (el) initIntroEnemyIdleAnim()
})

watch(standingEnemyTrainerIdleRef, (el) => {
  if (el) initStandingEnemyIdleAnim()
})

watch(playerTrainerIdleRef, (el) => {
  if (el) initPlayerIdleAnim()
})

onMounted(() => {
  initPlayerIdleAnim()
  if (props.isTrainerVisible) initIntroEnemyIdleAnim()
  if (props.showStandingTrainers) initStandingEnemyIdleAnim()
})

onUnmounted(() => {
  if (enemyTrainerShadowKey.value) {
    shadowStore.hideShadow(enemyTrainerShadowKey.value)
  }
  if (playerTrainerShadowKey.value) {
    shadowStore.hideShadow(playerTrainerShadowKey.value)
  }
  if (introEnemyIdleTween) {
    introEnemyIdleTween.kill()
    introEnemyIdleTween = null
  }
  if (standingEnemyIdleTween) {
    standingEnemyIdleTween.kill()
    standingEnemyIdleTween = null
  }
  if (playerIdleTween) {
    playerIdleTween.kill()
    playerIdleTween = null
  }
})

const getTrainerElement = (): HTMLElement | null => {
  const el = props.showStandingTrainers ? standingTrainerRef.value : trainerRef.value
  if (!el) return null
  if ('$el' in el && el.$el instanceof HTMLElement) return el.$el
  if (el instanceof HTMLElement) return el
  return null
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
    <div
      class="trainer-sprite-wrapper"
      :style="{
        width: `${enemyTrainerSize}px`,
        height: `${enemyTrainerSize}px`,
        position: 'absolute',
        left: '50%',
        top: TRAINER_GROUND_Y,
        transform: `translate(calc(-${(enemyFeetCoords?.feetX ?? 0.5) * 100}%), calc(-${(enemyFeetCoords?.feetY ?? 0.95) * 100}%)) ${enemyFeetCoords?.isFlying ? 'translateY(-24px)' : ''}`
      }"
    >
      <div
        ref="introEnemyTrainerIdleRef"
        class="trainer-idle-wrapper"
      >
        <div 
          class="pokemon-atmosphere-wrapper"
          :style="{ filter: 'var(--atmosphere-filter)' }"
        >
          <img 
            :src="enemyTrainerSpriteUrl" 
            class="trainer-image"
            @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { gender: props.trainerGender })"
          >
        </div>
      </div>
    </div>
    <CombatShadow
      :shadow-id="enemyTrainerShadowKey"
      :sprite-size="enemyTrainerSize"
      :shadow-scale="enemyFeetCoords?.shadowScale"
      :style="{
        '--shadow-y': TRAINER_GROUND_Y
      }"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizeEnemy * (objectScale || 2)) }}x{{ Math.round(baseEntitySizeEnemy * (objectScale || 2)) }}</span>
    </div>
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
    <div
      class="trainer-sprite-wrapper"
      :style="{
        width: `${enemyTrainerSize}px`,
        height: `${enemyTrainerSize}px`,
        position: 'absolute',
        left: '50%',
        top: TRAINER_GROUND_Y,
        transform: `translate(calc(-${(enemyFeetCoords?.feetX ?? 0.5) * 100}%), calc(-${(enemyFeetCoords?.feetY ?? 0.95) * 100}%)) ${enemyFeetCoords?.isFlying ? 'translateY(-24px)' : ''}`
      }"
    >
      <div
        ref="standingEnemyTrainerIdleRef"
        class="trainer-idle-wrapper"
      >
        <div 
          class="pokemon-atmosphere-wrapper"
          :style="{ filter: 'var(--atmosphere-filter)' }"
        >
          <img 
            :src="enemyTrainerSpriteUrl" 
            class="trainer-image"
            @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { gender: props.trainerGender })"
          >
        </div>
      </div>
    </div>
    <CombatShadow
      :shadow-id="enemyTrainerShadowKey"
      :sprite-size="enemyTrainerSize"
      :shadow-scale="enemyFeetCoords?.shadowScale"
      :style="{
        '--shadow-y': TRAINER_GROUND_Y
      }"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizeEnemy * (objectScale || 2) * TRAINER_RETREAT_SCALE) }}x{{ Math.round(baseEntitySizeEnemy * (objectScale || 2) * TRAINER_RETREAT_SCALE) }}</span>
    </div>
  </VirtualEntity>

  <!-- Standing Player Trainer (_back) -->
  <VirtualEntity
    :x="standingPlayerX"
    :y="standingPlayerY"
    :w="standingPlayerWidth"
    :h="baseEntitySizePlayer"
    class="standing-trainer player-trainer"
  >
    <div
      class="trainer-sprite-wrapper"
      :style="{
        width: `${playerTrainerSize}px`,
        height: `${playerTrainerSize}px`,
        position: 'absolute',
        left: '50%',
        top: TRAINER_GROUND_Y,
        transform: `translate(calc(-${(playerFeetCoords?.feetX ?? 0.5) * 100}%), calc(-${(playerFeetCoords?.feetY ?? 0.95) * 100}%)) ${playerFeetCoords?.isFlying ? 'translateY(-24px)' : ''}`
      }"
    >
      <div
        ref="playerTrainerIdleRef"
        class="trainer-idle-wrapper"
      >
        <div 
          class="pokemon-atmosphere-wrapper"
          :style="{ filter: 'var(--atmosphere-filter)' }"
        >
          <img 
            :src="playerBackSpriteUrl"
            class="trainer-image player-trainer-image shadow-pixelated"
            alt="Player Trainer"
            @error="(e: Event) => { (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { trainerSuffix: 'back', gender: 'h' }) }"
          >
        </div>
      </div>
    </div>
    <CombatShadow
      :shadow-id="playerTrainerShadowKey"
      :sprite-size="playerTrainerSize"
      :shadow-scale="playerFeetCoords?.shadowScale"
      :style="{
        '--shadow-y': TRAINER_GROUND_Y
      }"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(standingPlayerWidth * (objectScale || 2)) }}x{{ Math.round(baseEntitySizePlayer * (objectScale || 2)) }}</span>
    </div>
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
