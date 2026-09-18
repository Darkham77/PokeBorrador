<script setup lang="ts">
import type { FogOfWarSideState } from '@/logic/battle/replay/tacticalReplayEngine.ts'

defineProps<{
  pokemon?: FogOfWarSideState['activePokemon'] | null
  isPlayer?: boolean
}>()
</script>

<template>
  <div class="pokemon-sprite-wrap">
    <img
      v-if="pokemon?.sprite"
      :src="pokemon.sprite"
      :alt="pokemon.name || 'Pokemon'"
      class="combatant-sprite"
      :class="isPlayer ? 'player-sprite' : 'enemy-sprite'"
    >
    <span
      v-else
      class="sprite-placeholder emoji"
    >❓</span>
  </div>
</template>

<style scoped src="./BattleReplayModal.styles.scss" lang="scss"></style>
