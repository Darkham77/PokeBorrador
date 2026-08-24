<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

defineProps<{
  isTrainerVisible: boolean
  showStandingTrainers: boolean
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

const PLAYER_TRAINER_ASPECT_WIDTH_PX = 65
const PLAYER_TRAINER_ASPECT_HEIGHT_PX = 165
const ENEMY_TRAINER_OFFSET_X_PX = 340
const ENEMY_TRAINER_OFFSET_Y_PX = -25

const trainerShadowUrl = ref('')
onMounted(() => {
  trainerShadowUrl.value = generatePixelShadow(TRAINER_SHADOW_RADIUS_X, TRAINER_SHADOW_RADIUS_Y)
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
    left: `calc(50% + ${offsetX}px)`, // no-magic
    top: `${cached.feetY * 100}%`,
    width: `${widthPx}px`,
    height: `${heightPx}px`,
    transform: 'translate(-50%, -75%)', // no-magic
    zIndex: 'calc(var(--z-base) - 1)',
    pointerEvents: 'none' as const
  }
}

const getTrainerElement = (): HTMLElement | null => {
  const el = trainerRef.value
  if (!el) return null
  if ('$el' in el && el.$el instanceof HTMLElement) return el.$el
  if (el instanceof HTMLElement) return el
  return null
}

defineExpose({
  trainerRef,
  getTrainerElement
})
</script>

<template>
  <!-- Entrenador Rival (Solo en modo Trainer/Gym) -->
  <VirtualEntity
    v-if="isTrainerVisible && isTrainerOrGym"
    ref="trainerRef"
    :x="p2Pos.x"
    :y="p2Pos.y"
    :w="baseEntitySizeEnemy * 0.8"
    :h="baseEntitySizeEnemy * 0.8"
    class="trainer-entity"
  >
    <div class="trainer-sprite-wrapper">
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
    <!-- Floor Shadow (same technique as pokemon) -->
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador'), baseEntitySizeEnemy * 0.8 * (objectScale || 2))"
    />
    <!-- Cyan box overlay when guides are active -->
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
    :x="p2Pos.x + ENEMY_TRAINER_OFFSET_X_PX"
    :y="p2Pos.y + ENEMY_TRAINER_OFFSET_Y_PX"
    :w="baseEntitySizeEnemy * 0.8"
    :h="baseEntitySizeEnemy * 0.8"
    class="standing-trainer enemy-trainer"
  >
    <div class="trainer-sprite-wrapper">
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
    <!-- Floor Shadow (same technique as pokemon) -->
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, trainerSprite || trainerName || 'entrenador'), baseEntitySizeEnemy * 0.8 * (objectScale || 2))"
    />
    <!-- Cyan box overlay when guides are active -->
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}x{{ Math.round(baseEntitySizeEnemy * 0.8 * (objectScale || 2)) }}</span>
    </div>
  </VirtualEntity>

  <!-- Standing Player Trainer (_back) - Siempre visible. Escalado al tamaño del juego usando BASE_ENTITY_SIZE_PLAYER como referencia de altura -->
  <VirtualEntity
    :x="WORLD_CONSTANTS.SAFE_ZONE_X - Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale"
    :y="WORLD_CONSTANTS.SAFE_ZONE_Y + WORLD_CONSTANTS.SAFE_ZONE_HEIGHT - baseEntitySizePlayer * objectScale"
    :w="Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX)"
    :h="baseEntitySizePlayer"
    class="standing-trainer player-trainer"
  >
    <div class="trainer-sprite-wrapper">
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

    <!-- Custom Pixel Shadow underneath standing player trainer -->
    <div 
      class="trainer-custom-shadow"
      :style="getTrainerShadowStyle(playerBackSpriteUrl, Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale * 2.5)"
    />
    <!-- Cyan box overlay when guides are active -->
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizePlayer * PLAYER_TRAINER_ASPECT_WIDTH_PX / PLAYER_TRAINER_ASPECT_HEIGHT_PX) * objectScale }}x{{ baseEntitySizePlayer * objectScale }}</span>
    </div>
  </VirtualEntity>
</template>

<style scoped lang="scss" src="@/styles/components/_battle-arena-view.scss"></style>
