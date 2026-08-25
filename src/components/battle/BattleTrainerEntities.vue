<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import VirtualEntity from './VirtualEntity.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { getPokemonFeetCoords, generatePixelShadow } from '@/logic/combat/shadowHelpers'
import {
  TRAINER_SHADOW_RADIUS_X,
  TRAINER_SHADOW_RADIUS_Y,
  TRAINER_SHADOW_WIDTH_RATIO,
  TRAINER_SHADOW_HEIGHT_RATIO
} from '@/logic/constants/visuals'
import {
  TRAINER_RETREAT_X_OFFSET_PX,
  TRAINER_RETREAT_Y_OFFSET_PX
} from '@/logic/constants/animations'
import { getTrainerIdleConfig } from './helpers/trainerIdleAnims'

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
  trainerName?: string
  playerBackSpriteUrl: string
}>()

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

const trainerShadowUrl = ref('')

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
  trainerShadowUrl.value = generatePixelShadow(TRAINER_SHADOW_RADIUS_X, TRAINER_SHADOW_RADIUS_Y)
  initPlayerIdleAnim()
  if (props.isTrainerVisible) initIntroEnemyIdleAnim()
  if (props.showStandingTrainers) initStandingEnemyIdleAnim()
})

onUnmounted(() => {
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

const getTrainerShadowStyle = (spriteUrl: string, entitySize: number) => {
  const cached = getPokemonFeetCoords(spriteUrl)
  
  const widthPx = TRAINER_SHADOW_WIDTH_RATIO * entitySize
  const heightPx = entitySize * TRAINER_SHADOW_HEIGHT_RATIO
  const offsetX = (cached.feetX - 0.5) * entitySize

  return {
    position: 'absolute' as const,
    backgroundImage: `url(${trainerShadowUrl.value})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    left: `calc(50% + ${offsetX}px)`,
    top: `${cached.feetY * 100}%`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: 'translate(-50%, -75%)',
    zIndex: 'calc(var(--z-base) - 1)',
    pointerEvents: 'none' as const
  }
}

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
    :w="baseEntitySizeEnemy * 0.8"
    :h="baseEntitySizeEnemy * 0.8"
    class="trainer-entity"
  >
    <div class="trainer-sprite-wrapper">
      <div
        ref="introEnemyTrainerIdleRef"
        class="trainer-idle-wrapper"
      >
        <div 
          class="pokemon-atmosphere-wrapper"
          :style="{ filter: 'var(--atmosphere-filter)' }"
        >
          <img 
            :src="getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador')" 
            class="trainer-image"
            @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
          >
        </div>
      </div>
    </div>
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador'), baseEntitySizeEnemy * 0.8 * (objectScale || 2))"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}x{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}</span>
    </div>
  </VirtualEntity>

  <!-- Standing Enemy Trainer (During active combat) -->
  <VirtualEntity
    v-if="showStandingTrainers && (isTrainerOrGym || isPvP)"
    ref="standingTrainerRef"
    :x="p2Pos.x + TRAINER_RETREAT_X_OFFSET_PX"
    :y="p2Pos.y + TRAINER_RETREAT_Y_OFFSET_PX"
    :w="baseEntitySizeEnemy * 0.8"
    :h="baseEntitySizeEnemy * 0.8"
    class="standing-trainer enemy-trainer"
  >
    <div class="trainer-sprite-wrapper">
      <div
        ref="standingEnemyTrainerIdleRef"
        class="trainer-idle-wrapper"
      >
        <div 
          class="pokemon-atmosphere-wrapper"
          :style="{ filter: 'var(--atmosphere-filter)' }"
        >
          <img 
            :src="getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador')" 
            class="trainer-image"
            @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
          >
        </div>
      </div>
    </div>
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador'), baseEntitySizeEnemy * 0.8 * (objectScale || 2))"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}x{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}</span>
    </div>
  </VirtualEntity>

  <!-- Standing Player Trainer (_back) -->
  <VirtualEntity
    :x="WORLD_CONSTANTS.SAFE_ZONE_X - Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale"
    :y="WORLD_CONSTANTS.SAFE_ZONE_Y + WORLD_CONSTANTS.SAFE_ZONE_HEIGHT - baseEntitySizePlayer * objectScale"
    :w="Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX)"
    :h="baseEntitySizePlayer"
    class="standing-trainer player-trainer"
  >
    <div class="trainer-sprite-wrapper">
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
    <div 
      class="trainer-custom-shadow"
      :style="getTrainerShadowStyle(playerBackSpriteUrl, Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale * 2.5)"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale }}x{{ baseEntitySizePlayer * objectScale }}</span>
    </div>
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
