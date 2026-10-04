<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useModalStore } from '@/stores/modals'
import { useAuthStore } from '@/stores/auth'
import { useTradeStore } from '@/stores/trade'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const classStore = usePlayerClassStore()
const tradeStore = useTradeStore()
const modalStore = useModalStore()
const gs = computed(() => gameStore.state)

const displayName = computed(() => {
  const user = authStore.user as { user_metadata?: { username?: string } } | null
  return gs.value.trainer || user?.user_metadata?.username || 'Entrenador'
})

// Experience bar logic
const trainerExpPct = computed(() => {
  if (!gs.value.trainerExpNeeded || gs.value.trainerExpNeeded === 0) return 0
  return Math.min(100, (gs.value.trainerExp / gs.value.trainerExpNeeded) * 100)
})

const handlePanelClick = (event: Event) => {
  // If clicking specifically the avatar area, handle class logic
  const isAvatar = (event.target as HTMLElement).closest('#hud-class-avatar')
  
  if (isAvatar) {
    if (!gameStore.state.playerClass) {
      modalStore.open('ClassSelection')
    } else {
      modalStore.open('ClassMissions')
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
      :avatar-style="gs.avatar_style || undefined"
      :size="48"
      :gender="gs.gender || 'h'"
    >
      <template #overlay>
        <PVTooltip
          v-if="tradeStore.pendingCount > 0"
          title="INTERCAMBIOS"
          description="Tienes solicitudes de intercambio pendientes."
          position="top"
        >
          <div 
            v-gsap-loop="{ effect: 'pulse', scale: 1.1, duration: 1, ease: 'sine.inOut' }"
            class="alert-badge"
          >
            !
          </div>
        </PVTooltip>
      </template>
    </TrainerAvatar>

    <div class="trainer-content">
      <div
        id="hud-name"
        v-gsap-nick="gs.nick_style || 'normal'"
        :class="['trainer-name', gs.nick_style || 'normal']"
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

  color: var(--gray);
  font-size: 8px;
  margin-top: 2px;
  
  span { color: var(--yellow); }
}

.exp-bar-container {
  width: 140px;
  height: 5px;
  border-radius: 10px;
  background: Rgb(255 255 255 / 10%);
  margin-top: 5px;
  overflow: hidden;
}

.exp-bar-fill {
  height: 100%;
  border-radius: 10px;
  background: Linear-Gradient(90deg, Rgb(199 125 255 / 100%), Rgb(155 77 202 / 100%));
  
}

.class-label {
  @include pixelated;

  display: none;
  font-size: 8px;
  margin-top: 4px;
}

.pointer-cursor { cursor: pointer; }

.alert-badge {
  @include pixelated;

  position: absolute;
  top: -2px;
  right: -2px;
  z-index: var(--z-base);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--white);
  border-radius: 50%;
  background: Rgb(239 68 68 / 100%);
  color: white;
  font-size: 8px;
  font-weight: bold;
  box-shadow: 0 0 10px Rgb(239 68 68 / 50%);
}



.trainer-content {
  display: flex;
  flex-direction: column;
}
</style>
