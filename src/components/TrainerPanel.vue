<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'

const gameStore = useGameStore()
const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gs = computed(() => gameStore.state)

// Experience bar logic
const trainerExpPct = computed(() => {
  if (!gs.value.expNeeded || gs.value.expNeeded === 0) return 0
  return Math.min(100, (gs.value.exp / gs.value.expNeeded) * 100)
})

const handlePanelClick = () => {
  if (!classStore.playerClass) {
    uiStore.isClassSelectionOpen = true
  } else {
    uiStore.isClassMissionsOpen = true
  }
}
</script>

<template>
  <div
    id="hud-trainer-panel"
    class="hud-trainer pointer-cursor"
    @click="handlePanelClick"
  >
    <span
      id="hud-class-avatar"
      class="trainer-avatar"
      v-html="classStore.currentClassDef?.icon || gs.avatar_style || '👤'"
    />
    <div>
      <div
        id="hud-name"
        :class="['trainer-name', gs.nick_style]"
      >
        {{ gs.trainer || 'Entrenador' }}
      </div>
      <div class="trainer-info">
        <div class="trainer-lv">
          Entrenador Nv. <span>{{ gs.level }}</span>
        </div>
      </div>
      <div class="exp-bar-container">
        <div
          id="trainer-exp-bar"
          class="exp-bar-fill"
          :style="{ width: trainerExpPct + '%' }"
        />
      </div>
      <div
        id="hud-class-label"
        class="class-label"
        :style="{ display: classStore.playerClass ? 'block' : 'none', color: classStore.currentClassDef?.color }"
      >
        {{ classStore.currentClassDef?.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.exp-bar-container {
  margin-top: 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 5px;
  width: 140px;
  overflow: hidden;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C77DFF, #9b4dca);
  border-radius: 10px;
  transition: width 0.5s;
}

.class-label {
  display: none;
  margin-top: 4px;
  font-size: 8px;
  font-family: 'Press Start 2P', monospace;
}
.pointer-cursor { cursor: pointer; }
</style>
