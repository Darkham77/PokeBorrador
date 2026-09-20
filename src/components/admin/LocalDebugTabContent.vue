<script setup lang="ts">
import DebugStatsTab from './debug/DebugStatsTab.vue'
import DebugClassTab from './debug/DebugClassTab.vue'
import DebugItemsTab from './debug/DebugItemsTab.vue'
import DebugPokemonTab from './debug/DebugPokemonTab.vue'
import DebugTimeTab from './debug/DebugTimeTab.vue'
import DebugModalsTab from './debug/DebugModalsTab.vue'
import DebugMapTab from './debug/DebugMapTab.vue'
import DebugMissionsTab from './debug/DebugMissionsTab.vue'
import DebugTrainersTab from './debug/DebugTrainersTab.vue'
import type { DebugPanelCategoryId } from './debug/debugPanelCategories'

defineProps<{
  selectedCategory: DebugPanelCategoryId | string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <main 
    class="debug-content"
    @wheel.stop
  >
    <DebugStatsTab
      v-if="selectedCategory === 'stats'"
    />
    <DebugClassTab
      v-if="selectedCategory === 'class'"
    />
    <DebugItemsTab
      v-if="selectedCategory === 'items'"
    />
    <DebugTimeTab
      v-if="selectedCategory === 'time'"
    />
    <DebugModalsTab
      v-if="selectedCategory === 'modals'"
    />
    <DebugPokemonTab
      v-if="selectedCategory === 'pokes'"
    />
    <DebugTrainersTab
      v-if="selectedCategory === 'trainers'"
      @close="emit('close')"
    />
    <DebugMapTab
      v-if="selectedCategory === 'map'"
    />
    <DebugMissionsTab
      v-if="selectedCategory === 'missions'"
    />
  </main>
</template>

<style scoped lang="scss">
.debug-content {
  flex: 1;
  padding: 20px 16px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}
</style>
