<script setup lang="ts">
import VirtualEntity from './VirtualEntity.vue'
import CombatGrass from './CombatGrass.vue'

defineProps<{
  p2Pos: { x: number; y: number }
  baseEntitySizeEnemy: number
  locationId?: string
  enemyGroundY: string | number
  grassSeed: number
  shouldShowEncounterLayers: boolean
  enemyIsFloating: boolean
  isInstantBush: boolean
  bushIsBehind?: boolean
}>()
</script>

<template>
  <!-- Arbustos Atrás -->
  <VirtualEntity
    :x="p2Pos.x"
    :y="p2Pos.y"
    :w="baseEntitySizeEnemy"
    :h="baseEntitySizeEnemy"
  >
    <CombatGrass
      layer="back"
      :location-id="locationId"
      :ground-y="String(enemyGroundY)"
      :seed="grassSeed"
      :visible="shouldShowEncounterLayers && !enemyIsFloating"
      :instant="isInstantBush"
      :hide-instant="enemyIsFloating"
    />
  </VirtualEntity>
</template>
