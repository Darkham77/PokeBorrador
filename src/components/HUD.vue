<script setup>
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'

const gameStore = useGameStore()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
}
</script>

<template>
  <div class="hud">
    <div class="hud-trainer">
      <span class="trainer-avatar">🧢</span>
      <div>
        <div class="trainer-name">
          {{ gameStore.state.name }}
        </div>
        <div class="trainer-info">
          Entrenador Nv. <span>{{ gameStore.state.level }}</span>
        </div>
        <div class="exp-bar-container">
          <div 
            class="exp-bar-fill"
            :style="{ width: (gameStore.state.exp / gameStore.state.expNeeded * 100) + '%' }"
          />
        </div>
      </div>
    </div>

    <div class="hud-items">
      <div class="hud-pill money-pill">
        <span>₽</span>
        <span>{{ gameStore.state.money }}</span>
      </div>
      <div class="hud-pill money-pill">
        <i class="fas fa-coins" />
        <span>{{ gameStore.state.bc }}</span>
      </div>
      <button
        class="logout-btn"
        @click="handleLogout"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: fixed;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1800px, 98vw); /* Restored to 1800px per request */
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(5, 5, 5, 0.80); /* 80% opacity per request */
  backdrop-filter: blur(14px);
  border-radius: 20px;
  padding: 10px 24px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 60px rgba(0, 0, 0, 1);
  z-index: 8000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* BUTTONS & PILLS (Allowing original colors while remaining solid) */
.hud-nav-btn, .hud-pill, .library-btn, .hud-action-btn {
  background: rgba(26, 26, 30, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  opacity: 1 !important;
}

.hud-trainer {
  display: flex;
  align-items: center;
  gap: 15px;
}

.trainer-avatar {
  font-size: 24px;
}

.trainer-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
}

.trainer-info {
  font-size: 11px;
  color: var(--gray);
  margin-top: 4px;
}

.exp-bar-container {
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  height: 5px;
  width: 120px;
  overflow: hidden;
}

.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #C77DFF, #9b4dca);
  border-radius: 10px;
  transition: width 0.5s;
}

.hud-items {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-pill {
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: bold;
}

.logout-btn {
  background: rgba(255, 69, 58, 0.1);
  color: var(--red);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

@media (max-width: 768px) {
  .hud {
    padding: 10px 16px;
  }
  .exp-bar-container {
    width: 80px;
  }
}
</style>
