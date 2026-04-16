<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import TeamPokemonCard from './TeamPokemonCard.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()

const props = defineProps({
  team: { type: Array, required: true }
})

const maxObeyLv = computed(() => {
  if (typeof window.getMaxObeyLevel === 'function') {
    return window.getMaxObeyLevel()
  }
  return 100
})

const isSelectMode = computed(() => 
  gameStore.state.uiSelection.teamReleaseMode || 
  gameStore.state.uiSelection.teamRocketMode
)

const selectType = computed(() => {
  if (gameStore.state.uiSelection.teamReleaseMode) return 'release'
  if (gameStore.state.uiSelection.teamRocketMode) return 'rocket'
  return null
})

const isSelected = (index) => {
  if (selectType.value === 'release') {
    return gameStore.state.uiSelection.teamReleaseSelected.includes(index)
  }
  if (selectType.value === 'rocket') {
    return gameStore.state.uiSelection.teamRocketSelected.includes(index)
  }
  return false
}

// Acciones Legacy
const handleCardClick = (index) => {
  if (selectType.value === 'release') {
    if (typeof window.toggleReleaseSelect === 'function') {
      window.toggleReleaseSelect(index)
    }
  } else if (selectType.value === 'rocket') {
    if (typeof window.toggleTeamRocketSelect === 'function') {
      window.toggleTeamRocketSelect(index)
    }
  } else {
    if (typeof window.openPokemonDetail === 'function') {
      window.openPokemonDetail(index)
    }
  }
}

const openItem = (index) => {
  if (typeof window.openTeamItemMenu === 'function') {
    window.openTeamItemMenu(index)
  }
}

const sendToBox = (index) => {
  if (typeof window.sendToBox === 'function') {
    window.sendToBox(index)
  }
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
  
  if (typeof window.reorderTeam === 'function') {
     window.reorderTeam(draggedIndex, targetIndex)
  } else {
    const newTeam = [...gameStore.state.team]
    const [moved] = newTeam.splice(draggedIndex, 1)
    newTeam.splice(targetIndex, 0, moved)
    gameStore.updateState({ team: newTeam })
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
