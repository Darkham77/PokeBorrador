<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'
import { PLAYER_CLASSES } from '@/data/playerClasses'

const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gameStore = useGameStore()

const isOpen = computed(() => uiStore.isClassSelectionOpen)
const currentClass = computed(() => classStore.playerClass)
const battleCoins = computed(() => gameStore.state.battleCoins || 0)

const close = () => { uiStore.isClassSelectionOpen = false }

async function handleSelect(classId) {
  const res = await classStore.selectClass(classId)
  if (res.success) {
    close()
  } else {
    uiStore.notify(res.msg, '⚠️')
  }
}

const changeCost = 10000
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div class="modal-container">
        <header class="modal-header">
          <div class="header-content">
            <h2 class="press-start">
              ELIGE TU CAMINO
            </h2>
            <p
              v-if="currentClass"
              class="current-label"
            >
              Clase actual: <span :style="{ color: PLAYER_CLASSES[currentClass].color }">{{ PLAYER_CLASSES[currentClass].name }}</span>
            </p>
          </div>
          <button
            class="close-btn"
            @click="close"
          >
            ✕
          </button>
        </header>

        <div class="class-grid">
          <div 
            v-for="cls in PLAYER_CLASSES" 
            :key="cls.id"
            class="class-card"
            :class="{ active: currentClass === cls.id }"
            :style="{ '--cls-color': cls.color, '--cls-color-dark': cls.colorDark }"
          >
            <div class="card-header">
              <span class="class-icon">{{ cls.icon }}</span>
              <h3 class="class-name">
                {{ cls.name }}
              </h3>
            </div>
            
            <p class="class-desc">
              {{ cls.description }}
            </p>

            <div class="lists-container">
              <div class="list-section">
                <h4 class="list-title bonus">
                  VENTAJAS
                </h4>
                <ul>
                  <li
                    v-for="(b, i) in cls.bonuses"
                    :key="i"
                  >
                    {{ b }}
                  </li>
                </ul>
              </div>
              
              <div class="list-section">
                <h4 class="list-title penalty">
                  DESVENTAJAS
                </h4>
                <ul>
                  <li
                    v-for="(p, i) in cls.penalties"
                    :key="i"
                  >
                    {{ p }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="card-footer">
              <button 
                v-if="currentClass === cls.id" 
                class="action-btn selected"
                disabled
              >
                CLASE ACTIVA
              </button>
              <button 
                v-else 
                class="action-btn select"
                @click="handleSelect(cls.id)"
              >
                {{ currentClass ? `CAMBIAR (₽${changeCost.toLocaleString()})` : 'ELEGIR CLASE' }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <p class="footer-hint">
            <span class="warning-icon">⚠️</span> 
            Cambiar de clase cuesta <strong>{{ changeCost.toLocaleString() }} Battle Coins</strong> y reiniciará tu progreso de clase actual.
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.modal-container {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
  color: #fff;
  margin: 0;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.current-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.class-grid {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.class-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.class-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: radial-gradient(circle at top right, var(--cls-color) 0%, transparent 60%);
  opacity: 0.05;
  pointer-events: none;
}

.class-card.active {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--cls-color);
  box-shadow: 0 0 20px -5px var(--cls-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.class-icon {
  font-size: 32px;
}

.class-name {
  font-size: 20px;
  font-weight: 800;
  color: #f8fafc;
}

.class-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.lists-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-section li {
  font-size: 11px;
  color: #cbd5e1;
  margin-bottom: 8px;
  padding-left: 12px;
  position: relative;
}

.list-section li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--cls-color);
}

.list-title {
  font-size: 10px;
  letter-spacing: 1px;
  font-weight: 700;
  margin-bottom: 12px;
  opacity: 0.6;
}

.list-title.bonus { color: #4ade80; }
.list-title.penalty { color: #f87171; }

.card-footer {
  margin-top: 32px;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.select {
  background: var(--cls-color);
  color: #fff;
  box-shadow: 0 4px 0 var(--cls-color-dark);
}

.action-btn.select:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 var(--cls-color-dark);
}

.action-btn.select:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--cls-color-dark);
}

.action-btn.selected {
  background: rgba(255, 255, 255, 0.05);
  color: #64748b;
  cursor: default;
}

.modal-footer {
  padding: 24px 32px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.footer-hint {
  font-size: 12px;
  color: #64748b;
  text-align: center;
}

.warning-icon {
  margin-right: 8px;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .class-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
}
</style>
