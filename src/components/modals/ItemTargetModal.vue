<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/ui'
import { getSpriteUrl } from '@/logic/sprites'
import { getStatusIcon } from '@/logic/battle/battleStatus'

const gameStore = useGameStore()
const invStore = useInventoryStore()
const uiStore = useUIStore()

const isOpen = computed(() => invStore.isItemTargetModalOpen)
const itemName = computed(() => invStore.activeItemToUse)
const team = computed(() => gameStore.state.team || [])

const close = () => {
  invStore.closeItemTargetModal()
}

const handleSelect = async (index) => {
  const result = invStore.useItem(itemName.value, 'team', index)
  if (result.success) {
    uiStore.notify(`¡${result.msg}!`, '✨')
    close()
  } else {
    uiStore.notify(result.msg, '⚠️')
  }
}

const getHpColor = (p) => {
  const pct = (p.hp / p.maxHp) * 100
  if (pct > 50) return '#4caf50'
  if (pct > 20) return '#ffeb3b'
  return '#f44336'
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div class="target-modal-card">
        <div class="modal-header">
          <div class="item-icon-header">
            🎒
          </div>
          <h2>USAR {{ itemName?.toUpperCase() }}</h2>
          <p>¿Sobre qué Pokémon actuar?</p>
        </div>

        <div class="team-list">
          <div 
            v-for="(p, index) in team" 
            :key="p.uid || index"
            class="target-row"
            @click="handleSelect(index)"
          >
            <div class="poke-sprite">
              <img
                :src="getSpriteUrl(p.id, p.isShiny)"
                :alt="p.name"
              >
            </div>
            
            <div class="poke-info">
              <div class="name-line">
                <span class="p-name">{{ p.name }}</span>
                <span class="p-lv">Nv.{{ p.level }}</span>
                <span
                  v-if="p.status"
                  class="status-badge"
                >{{ getStatusIcon(p.status) }}</span>
              </div>
              
              <div class="hp-bar-container">
                <div 
                  class="hp-bar-fill" 
                  :style="{ 
                    width: (p.hp / p.maxHp * 100) + '%',
                    backgroundColor: getHpColor(p)
                  }"
                />
              </div>
              
              <div class="hp-text">
                {{ p.hp }} / {{ p.maxHp }} HP
              </div>
            </div>

            <div class="select-hint">
              ELEGIR
            </div>
          </div>
        </div>

        <button
          class="cancel-btn"
          @click="close"
        >
          CANCELAR
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.target-modal-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.item-icon-header {
  font-size: 32px;
  margin-bottom: 8px;
}

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
  margin: 0 0 8px 0;
}

p {
  color: var(--gray);
  font-size: 11px;
  margin: 0;
}

.team-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.target-row:hover {
  background: rgba(255, 217, 61, 0.1);
  border-color: rgba(255, 217, 61, 0.3);
  transform: translateX(4px);
}

.poke-sprite img {
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
}

.poke-info {
  flex: 1;
}

.name-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.p-name {
  font-weight: 700;
  font-size: 14px;
}

.p-lv {
  font-size: 10px;
  color: var(--gray);
}

.hp-bar-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.hp-bar-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.hp-text {
  font-size: 10px;
  color: var(--gray);
  font-family: monospace;
}

.select-hint {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: var(--yellow);
  opacity: 0;
  transition: opacity 0.2s;
}

.target-row:hover .select-hint {
  opacity: 1;
}

.cancel-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 16px;
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
