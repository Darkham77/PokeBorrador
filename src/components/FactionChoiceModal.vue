<script setup>
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const closeFactionModal = () => {
  if (typeof window.closeFactionChoice === 'function') {
    window.closeFactionChoice()
  }
}

const chooseFaction = (faction) => {
  if (typeof window.chooseFaction === 'function') {
    window.chooseFaction(faction)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      id="faction-choice-modal"
      class="modal-overlay"
    >
      <div class="modal-content-premium faction-card">
        <button
          class="modal-close-btn"
          @click="closeFactionModal"
        >
          ✕
        </button>
        <h2 class="faction-title">
          ¡ELIGE TU BANDO!
        </h2>
        <div class="faction-options">
          <button
            class="faction-btn union-btn"
            @click="chooseFaction('union')"
          >
            <img
              src="/assets/factions/union.png"
              class="faction-icon-large"
            >
            <span class="faction-name union-text">Team Unión</span>
          </button>
          <button
            class="faction-btn poder-btn"
            @click="chooseFaction('poder')"
          >
            <img
              src="/assets/factions/poder.png"
              class="faction-icon-large"
            >
            <span class="faction-name poder-text">Team Poder</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: var(--gray);
  font-size: 20px;
  cursor: pointer;
}

.faction-btn {
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s, background 0.2s;
}

.faction-btn:hover {
  transform: #{'scale(1.02)'};
}

.union-btn {
  background: #0f172a;
  border: 3px solid #3b82f6;
}

.poder-btn {
  background: #2a0f0f;
  border: 3px solid #ef4444;
}

.faction-icon-large {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 8px;
}

.faction-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
}

.union-text { color: #3b82f6; }
.poder-text { color: #ef4444; }

/* New classes from inline cleanup */
.faction-card { padding: 24px; max-width: 400px; text-align: center; }
.faction-title { font-family: 'Press Start 2P', monospace; font-size: 14px; color: var(--yellow); margin-bottom: 16px; }
.faction-options { display: flex; gap: 16px; flex-direction: column; }
</style>
