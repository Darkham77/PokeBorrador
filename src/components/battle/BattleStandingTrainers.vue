<script setup lang="ts">
import VirtualEntity from '@/components/battle/VirtualEntity.vue'
import { ASSET_TYPES } from '@/logic/services/assetService'
import type { BattleState } from '@/types/battle/battle'

defineProps<{
  showStandingTrainers: boolean
  battle: BattleState | null
  p1Pos: { x: number; y: number }
  p2Pos: { x: number; y: number }
  baseEntitySizeEnemy: number
  objectScale: number
  showGuides: boolean
  getAssetUrl: (type: typeof ASSET_TYPES[keyof typeof ASSET_TYPES], name: string, opts?: Record<string, unknown>) => string
  getTrainerShadowStyle: (url: string, width: number) => Record<string, string>
}>()
</script>

<template>
  <!-- Standing Enemy Trainer (During active combat) -->
  <VirtualEntity
    v-if="showStandingTrainers && (battle?.isTrainer || battle?.isGym || battle?.isPvP)"
    :x="p2Pos.x + 340"
    :y="p2Pos.y - 25"
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
          :src="getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador')" 
          class="trainer-image"
          @error="(e: Event) => (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador')"
        >
      </div>
    </div>
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(getAssetUrl(ASSET_TYPES.TRAINER, battle?.trainerSprite || battle?.trainerName || 'entrenador'), baseEntitySizeEnemy * 0.8 * (objectScale || 2))"
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
    :x="worldConstants.SAFE_ZONE_X - Math.round(baseEntitySizePlayer * 65 / 165)"
    :y="worldConstants.SAFE_ZONE_Y + worldConstants.SAFE_ZONE_HEIGHT - baseEntitySizePlayer"
    :w="Math.round(baseEntitySizePlayer * 65 / 165)"
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
          class="trainer-image player-trainer-image"
          @error="(e: Event) => { (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.TRAINER, 'entrenador', { trainerSuffix: 'back', gender: gameStore.state.gender || 'h' }) }"
        >
      </div>
    </div>
    <div 
      class="trainer-shadow"
      :style="getTrainerShadowStyle(playerBackSpriteUrl, Math.round(baseEntitySizePlayer * 65 / 165) * objectScale * 2.5)"
    />
    <div
      v-if="showGuides"
      class="debug-trainer-guide"
    >
      <span>{{ Math.round(baseEntitySizePlayer * 65 / 165) * objectScale }}x{{ baseEntitySizePlayer * objectScale }}</span>
    </div>
  </VirtualEntity>
</template>
