<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useTradeStore } from '@/stores/trade'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const tradeStore = useTradeStore()
const gs = computed(() => gameStore.state)

// Experience bar logic
const trainerExpPct = computed(() => {
  if (!gs.value.expNeeded || gs.value.expNeeded === 0) return 0
  return Math.min(100, (gs.value.exp / gs.value.expNeeded) * 100)
})

const handlePanelClick = () => {
  uiStore.isProfileOpen = true
}
</script>

<template>
  <div
    id="hud-trainer-panel"
    class="hud-trainer pointer-cursor"
    @click="handlePanelClick"
  >
    <TrainerAvatar
      id="hud-class-avatar"
      :player-class="gs.playerClass"
      :level="gs.level"
      :size="48"
    >
      <template #overlay>
        <div 
          v-if="tradeStore.pendingCount > 0" 
          class="alert-badge"
          title="Intercambios pendientes"
        >
          !
        </div>
      </template>
    </TrainerAvatar>
    
    <div class="trainer-content">
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

.alert-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #ef4444;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  font-weight: bold;
  border: 2px solid #fff;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  animation: pulse-red 2s infinite;
  z-index: 10;
}

@keyframes pulse-red {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.trainer-content {
  display: flex;
  flex-direction: column;
}
</style>
