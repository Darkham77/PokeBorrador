<script setup lang="ts">

import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory'
import UnifiedTeamSlot from './UnifiedTeamSlot.vue'

import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()
const uiStore = useUIStore()
const invStore = useInventoryStore()
const boxStore = useBoxStore()

defineProps<{
  team: Pokemon[]
}>()

const maxObeyLv = computed(() => gameStore.getMaxObeyLevel())

const isSelectMode = computed(() => 
  boxStore.teamReleaseMode || 
  boxStore.teamRocketMode
)

const selectType = computed(() => {
  if (boxStore.teamReleaseMode) return 'release'
  if (boxStore.teamRocketMode) return 'rocket'
  return null
})

const isSelected = (index: number): boolean => {
  if (selectType.value === 'release') {
    return (boxStore.teamReleaseSelected as number[]).includes(index)
  }
  if (selectType.value === 'rocket') {
    return (boxStore.teamRocketSelected as number[]).includes(index)
  }
  return false
}

const handleCardClick = (index: number) => {
  if (selectType.value === 'release') {
    boxStore.toggleTeamReleaseSelect(index)
  } else if (selectType.value === 'rocket') {
    boxStore.toggleTeamRocketSelect(index)
  } else {
    const p = gameStore.state.team[index]
    if (p) uiStore.openPokemonDetail(p, index, 'team')
  }
}

const openItem = (index: number) => {
  const p = gameStore.state.team[index]
  if (p && p.heldItem) {
    invStore.unequipItem('team', index)
  } else {
    uiStore.toggleInventory('team', index)
  }
}

const sendToBox = (index: number) => {
  gameStore.sendToBox(index)
}

// Drag & Drop
const onDragStart = (e: DragEvent, index: number) => {
  if (isSelectMode.value) {
    e.preventDefault()
    return
  }
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }
}

const onDrop = (e: DragEvent, targetIndex: number) => {
  if (e.dataTransfer) {
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (draggedIndex === targetIndex || isNaN(draggedIndex)) return
    gameStore.reorderTeam(draggedIndex, targetIndex)
  }
}
</script>

<template>
  <div
    v-if="team.length === 0"
    class="empty-state legacy-panel"
  >
    <div class="empty-icon">
      🎒
    </div>
    <p>No tenés Pokémon en tu equipo todavía.</p>
  </div>
  
  <div 
    v-else 
    class="team-grid-container"
    @dragover.prevent
  >
    <UnifiedTeamSlot
      v-for="(pokemon, i) in team"
      :key="i"
      :pokemon="pokemon"
      :index="i"
      :is-select-mode="isSelectMode"
      :is-selected="isSelected(i)"
      :select-type="selectType"
      :max-obey-lv="maxObeyLv"
      @click.stop="handleCardClick"
      @open-detail="handleCardClick"
      @open-item="openItem"
      @send-to-box="sendToBox"
      @dragstart="onDragStart($event, i)"
      @drop="onDrop($event, i)"
    />
  </div>
</template>

<style scoped>
@use "@/styles/core/_mixins" as *;
.team-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 25px;
  padding: 10px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: Rgba(17, 17, 17, 1);
  border: 4px solid Rgba(51, 51, 51, 1);
  box-shadow: 0 0 0 4px var(--black);
  color: Rgba(136, 136, 136, 1);
  @include pixelated;
  font-size: 10px;
  text-align: center;
  gap: 20px;
}

.empty-icon {
  font-size: 40px;
}

@media (max-width: 640px) {
  .team-grid-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
