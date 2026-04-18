<script setup>
import { ref, computed, onMounted } from 'vue'
import { useShopStore } from '@/stores/shopStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const isVisible = ref(false)
const isHealing = ref(false)
const progress = ref(0)
const healedCount = ref(0)

const cost = computed(() => shopStore.getHealCost())
const team = computed(() => gameStore.state.team || [])

async function handleHeal() {
  if (team.value.length === 0) return
  
  if (cost.value > 0 && gameStore.state.money < cost.value) {
    uiStore.notify('No tenés suficiente dinero para la enfermería.', '💸')
    return
  }

  isHealing.value = true
  progress.value = 0
  healedCount.value = 0

  const interval = setInterval(() => {
    progress.value += 4
    if (progress.value % 16 === 0 && healedCount.value < team.value.length) {
      healedCount.value++
    }
    
    if (progress.value >= 100) {
      clearInterval(interval)
      const success = shopStore.healAllPokemon()
      if (success) {
        setTimeout(() => {
          isHealing.value = false
          isVisible.value = false
        }, 800)
      } else {
        isHealing.value = false
      }
    }
  }, 80)
}

function close() {
  if (isHealing.value) return
  isVisible.value = false
}

// ── LEGACY COMPATIBILITY ─────────────────────────────────────────────────────
onMounted(() => {
  window.openPokemonCenter = () => {
    isVisible.value = true
  }
  window.closePokemonCenter = () => {
    isVisible.value = false
  }
  window.showHealEffect = (active) => {
    if (active) {
      isVisible.value = true
      handleHeal()
    }
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isVisible" class="pokemon-center-overlay" @click.self="close">
        <div class="center-card glass">
          <div class="header">
            <div class="icon-circle">🏥</div>
            <h2>CENTRO POKÉMON</h2>
            <p class="subtitle">Servicio de Salud para Entrenadores</p>
          </div>

          <div class="status-section">
            <div class="team-slots">
              <div 
                v-for="i in 6" 
                :key="i" 
                class="slot"
                :class="{ 
                  'active': i <= team.length, 
                  'healing': isHealing && i <= healedCount,
                  'empty': i > team.length
                }"
              >
                <div class="ball-icon">🔴</div>
              </div>
            </div>
            
            <div v-if="isHealing" class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
              </div>
              <p class="healing-text">RESTAURANDO EQUIPO...</p>
            </div>
            
            <div v-else class="info-text">
              <div v-if="cost > 0" class="cost-notice">
                <p>COSTO DE SERVICIO</p>
                <div class="price-tag">₽ {{ cost.toLocaleString() }}</div>
                <small v-if="gameStore.state.playerClass === 'rocket'">Recargo: Team Rocket (2x)</small>
              </div>
              <p v-else class="free-msg">¡Hola! Restauraremos a tus Pokémon al instante.</p>
            </div>
          </div>

          <div class="actions">
            <button 
              class="btn-heal" 
              :disabled="isHealing || team.length === 0 || (cost > 0 && gameStore.state.money < cost)"
              @click="handleHeal"
            >
              {{ isHealing ? 'CURANDO...' : 'CURAR EQUIPO' }}
            </button>
            <button class="btn-cancel" :disabled="isHealing" @click="close">
              VOLVER
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.pokemon-center-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999999;
  padding: 20px;
}

.center-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 30px;
  border-radius: 24px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(20, 20, 25, 0.8);
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
}

.header {
  margin-bottom: 30px;
}

.icon-circle {
  font-size: 36px;
  width: 70px;
  height: 70px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #fff;
  margin: 0;
}

.subtitle {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.team-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 30px;
}

.slot {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.2;
}

.slot.active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.06);
}

.slot.healing {
  background: rgba(34, 197, 94, 0.08);
  border-color: rgba(34, 197, 94, 0.4);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.1);
  transform: scale(1.08);
}

.ball-icon {
  font-size: 20px;
  filter: grayscale(1);
}

.slot.active .ball-icon {
  filter: grayscale(0);
}

.slot.healing .ball-icon {
  animation: pulse-ball 0.6s infinite alternate;
}

@keyframes pulse-ball {
  from { transform: scale(1); filter: brightness(1); }
  to { transform: scale(1.2); filter: brightness(1.4) drop-shadow(0 0 5px #ff4444); }
}

.progress-container {
  margin-top: 20px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
  transition: width 0.1s linear;
}

.healing-text {
  color: #22c55e;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
}

.free-msg {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
}

.cost-notice {
  background: rgba(239, 68, 68, 0.05);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.15);
  
  p {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #ef4444;
    margin-bottom: 8px;
  }
  
  .price-tag {
    font-family: 'Press Start 2P', monospace;
    font-size: 16px;
    color: #fff;
  }
  
  small {
    display: block;
    margin-top: 6px;
    color: rgba(239, 68, 68, 0.5);
    font-size: 9px;
  }
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.btn-heal {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 18px;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
  
  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-2px);
  }
  
  &:disabled {
    background: #27272a;
    color: #52525b;
    box-shadow: none;
    cursor: not-allowed;
  }
}

.btn-cancel {
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 12px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
