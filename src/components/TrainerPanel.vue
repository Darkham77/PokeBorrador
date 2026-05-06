<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useModalStore } from '@/stores/modals'
import { useAuthStore } from '@/stores/auth'
import { useTradeStore } from '@/stores/trade'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore() as any
const uiStore = useUIStore() as any
const authStore = useAuthStore() as any
const classStore = usePlayerClassStore() as any
const tradeStore = useTradeStore() as any
const gs = computed(() => gameStore.state)

const displayName = computed(() => {
  return gs.value.trainer || authStore.user?.user_metadata?.username || 'Entrenador'
})

// Experience bar logic
const trainerExpPct = computed(() => {
  if (!gs.value.expNeeded || gs.value.expNeeded === 0) return 0
  return Math.min(100, (gs.value.exp / gs.value.expNeeded) * 100)
})

const handlePanelClick = (event: Event) => {
  // If clicking specifically the avatar area, handle class logic
  const isAvatar = (event.target as HTMLElement).closest('#hud-class-avatar')
  
  if (isAvatar) {
    if (!gameStore.state.playerClass) {
      (useModalStore() as any).open('ClassSelection')
    } else {
      (useModalStore() as any).open('ClassMissions')
    }
    return
  }
  
  uiStore.toggleProfile()
}
</script>

<template>
  <div
    id="hud-trainer-panel"
    class="hud-trainer pointer-cursor"
    @click.stop="handlePanelClick"
  >
    <TrainerAvatar
      id="hud-class-avatar"
      :player-class="gs.playerClass"
      :level="gs.trainerLevel"
      :size="48"
    >
      <template #overlay>
        <PVTooltip
          v-if="tradeStore.pendingCount > 0"
          title="INTERCAMBIOS"
          description="Tienes solicitudes de intercambio pendientes."
          position="top"
        >
          <div class="alert-badge">
            !
          </div>
        </PVTooltip>
      </template>
    </TrainerAvatar>
    
    <div class="trainer-content">
      <div
        id="hud-name"
        :class="['trainer-name', gs.nick_style]"
      >
        {{ displayName }}
      </div>
      <div class="trainer-info">
        <div class="trainer-lv">
          Nivel <span>{{ gs.trainerLevel }}</span>
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.trainer-lv {
  @include pixelated;
  font-size: 8px;
  color: var(--gray);
  margin-top: 2px;
  
  span { color: var(--yellow); }
}
.exp-bar-container {
  margin-top: 5px;
  background: Rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 5px;
  width: 140px;
  overflow: hidden;
}

.exp-bar-fill {
  height: 100%;
  background: Linear-Gradient(90deg, Rgba(199, 125, 255, 1), Rgba(155, 77, 202, 1));
  border-radius: 10px;
  transition: width 0.5s;
}

.class-label {
  display: none;
  margin-top: 4px;
  font-size: 8px;
  @include pixelated;
}
.pointer-cursor { cursor: pointer; }

.alert-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: Rgba(239, 68, 68, 1);
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  @include pixelated;
  font-size: 8px;
  font-weight: bold;
  border: 2px solid var(--white);
  box-shadow: 0 0 10px Rgba(239, 68, 68, 0.5);
  animation: pulse-red 2s infinite;
  z-index: var(--z-base);
}

@keyframes pulse-red {
  0% { transform: Scale(1); box-shadow: 0 0 0 0 Rgba(239, 68, 68, 0.7); }
  70% { transform: Scale(1.1); box-shadow: 0 0 0 10px Rgba(239, 68, 68, 0); }
  100% { transform: Scale(1); box-shadow: 0 0 0 0 Rgba(239, 68, 68, 0); }
}

.trainer-content {
  display: flex;
  flex-direction: column;
}
</style>
