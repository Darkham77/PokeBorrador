<script setup>
import { MOVE_DATA } from '@/data/moves'
import { getMoveDescription } from '@/logic/pokemonUtils'

const _props = defineProps({
  move: { type: Object, required: true }
})
</script>

<template>
  <div class="move-tooltip-simple">
    {{ getMoveDescription(move.name, MOVE_DATA[move.name]) }}
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.move-tooltip-simple {
  font-family: var(--font-ui);
  font-size: 11px;
  line-height: 1.5;
  color: Rgba(255, 255, 255, 0.95);
  max-width: 220px;
  padding: 4px;
  font-weight: 500;
}
</style>
