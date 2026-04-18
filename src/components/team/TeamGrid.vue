<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/boxStore'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventoryStore'
import TeamPokemonCard from './TeamPokemonCard.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const invStore = useInventoryStore()
const boxStore = useBoxStore()

const props = defineProps({
  team: { type: Array, required: true }
})

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

const isSelected = (index) => {
  if (selectType.value === 'release') {
    return boxStore.teamReleaseSelected.includes(index)
  }
  if (selectType.value === 'rocket') {
    return boxStore.teamRocketSelected.includes(index)
  }
  return false
}

const handleCardClick = (index) => {
  if (selectType.value === 'release') {
    boxStore.toggleTeamReleaseSelect(index)
  } else if (selectType.value === 'rocket') {
    boxStore.toggleTeamRocketSelect(index)
  } else {
    uiStore.openPokemonDetail(gameStore.state.team[index], index, 'team')
  }
}

const openItem = (index) => {
  const p = gameStore.state.team[index]
  if (p && p.heldItem) {
    invStore.unequipItem('team', index)
  } else {
    invStore.openItemMenu(null)
  }
}

const sendToBox = (index) => {
  gameStore.sendToBox(index)
}

// Drag & Drop
const onDragStart = (e, index) => {
  if (isSelectMode.value) {
    e.preventDefault()
    return
  }
  e.dataTransfer.setData('text/plain', index)
  e.dataTransfer.effectAllowed = 'move'
}

const onDrop = (e, targetIndex) => {
  const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
  if (draggedIndex === targetIndex || isNaN(draggedIndex)) return
  
  gameStore.reorderTeam(draggedIndex, targetIndex)
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
    <TeamPokemonCard
      v-for="(pokemon, i) in team"
      :key="i"
      :pokemon="pokemon"
      :index="i"
      :is-select-mode="isSelectMode"
      :is-selected="isSelected(i)"
      :select-type="selectType"
      :max-obey-lv="maxObeyLv"
      @click="handleCardClick"
      @open-detail="handleCardClick"
      @open-item="openItem"
      @send-to-box="sendToBox"
      @dragstart="onDragStart($event, i)"
      @drop="onDrop($event, i)"
    />
  </div>
</template>

<style scoped>
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
  background: #111;
  border: 4px solid #333;
  box-shadow: 0 0 0 4px #000;
  color: #888;
  font-family: 'Press Start 2P', monospace;
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
