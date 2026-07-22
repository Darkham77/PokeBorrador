<script setup lang="ts">
import VirtualEntity from '@/components/battle/VirtualEntity.vue'
import { ASSET_TYPES } from '@/logic/services/assetService'
import type { BattleState } from '@/types/battle/battle'

/* eslint-disable @typescript-eslint/no-explicit-any */
defineProps<{
  isTrainerVisible: boolean
  battle: BattleState | null
  p2Pos: { x: number; y: number }
  baseEntitySizeEnemy: number
  objectScale: number
  showGuides: boolean
  getAssetUrl: (type: any, name: string, opts?: Record<string, unknown>) => string
  getTrainerShadowStyle: (url: string, width: number) => Record<string, any>
}>()
/* eslint-enable @typescript-eslint/no-explicit-any */
</script>

<template>
  <VirtualEntity
    v-if="isTrainerVisible && (battle?.isTrainer || battle?.isGym)"
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
</template>
