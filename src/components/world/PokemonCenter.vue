<script setup>
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

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

  // Animation logic: 2 seconds total
  const interval = setInterval(() => {
    progress.value += 5
    if (progress.value % 17 === 0 && healedCount.value < team.value.length) {
      healedCount.value++
    }
    
    if (progress.value >= 100) {
      clearInterval(interval)
      const success = shopStore.healAllPokemon()
      if (success) {
        setTimeout(() => {
          isHealing.value = false
          uiStore.activeModal = null // Close modal
        }, 500)
      } else {
        isHealing.value = false
      }
    }
  }, 100)
}

function close() {
  if (isHealing.value) return
  uiStore.activeModal = null
}
</script>

<template>
  <div
    class="pokemon-center-overlay"
    @click.self="close"
  >
    <div class="center-card glass">
      <div class="header">
        <div class="icon-circle">
          🏥
        </div>
        <h2>Centro Pokémon</h2>
        <p class="subtitle">
          Enfermería Oficial de Kanto
        </p>
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
            <div class="ball-icon">
              🔴
            </div>
          </div>
        </div>
        
        <div
          v-if="isHealing"
          class="progress-container"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: progress + '%' }"
            />
          </div>
          <p class="healing-text">
            Restaurando HP/PP...
          </p>
        </div>
        
        <div
          v-else
          class="info-text"
        >
          <p v-if="cost === 0">
            ¡El servicio es gratuito para entrenadores registrados!
          </p>
          <div
            v-else
            class="cost-notice"
          >
            <p>Servicio con recargo especial</p>
            <div class="price-tag">
              ₽ {{ cost.toLocaleString() }}
            </div>
            <small v-if="gameStore.state.playerClass === 'rocket'">Penalización: Miembro del Equipo Rocket (2x)</small>
          </div>
        </div>
      </div>

      <div class="actions">
        <button 
          class="btn-heal" 
          :disabled="isHealing || team.length === 0 || (cost > 0 && gameStore.state.money < cost)"
          @click.stop="handleHeal"
        >
          {{ isHealing ? 'CURANDO...' : 'RESTAURAR EQUIPO' }}
        </button>
        <button
          class="btn-cancel"
          :disabled="isHealing"
          @click.stop="close"
        >
          VOLVER
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pokemon-center-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: 20px;
  transform: translateZ(0);
}

.center-card {
  width: 100%;
  max-width: 450px;
  padding: 40px 30px;
  border-radius: 30px;
  text-align: center;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px Rgba(0, 0, 0, 0.5);
}

.glass {
  background: Rgba(13, 17, 23, 0.98);
}

.header {
  margin-bottom: 30px;
}

.icon-circle {
  font-size: 40px;
  width: 80px;
  height: 80px;
  background: Rgba(239, 68, 68, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  border: 2px solid Rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 20px Rgba(239, 68, 68, 0.2);
}

h2 {
  font-size: 24px;
  font-weight: 800;
  color: var(--white);
  margin: 0;
  letter-spacing: 0.5px;
}

.subtitle {
  color: Rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin-top: 5px;
}

.team-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.slot {
  aspect-ratio: 1;
  background: Rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  opacity: 0.3;
}

.slot.active {
  opacity: 1;
  background: Rgba(255, 255, 255, 0.08);
  border-color: Rgba(255, 255, 255, 0.2);
}

.slot.empty {
  opacity: 0.1;
  border-style: dashed;
}

.slot.healing {
  background: Rgba(34, 197, 94, 0.1);
  border-color: Rgba(34, 197, 94, 0.5);
  box-shadow: 0 0 15px Rgba(34, 197, 94, 0.2);
  transform: Scale(1.05);
}

.ball-icon {
  font-size: 24px;
  filter: Grayscale(1);
  transition: all 0.3s ease;
}

.slot.active .ball-icon {
  filter: Grayscale(0);
}

.slot.healing .ball-icon {
  animation: pulse 0.5s infinite alternate;
}

@keyframes pulse {
  from { transform: Scale(1); filter: Brightness(1); }
  to { transform: Scale(1.2); filter: Brightness(1.5) Drop-Shadow(0 0 5px Rgba(255, 85, 85, 1)); }
}

.progress-container {
  margin-top: 20px;
}

.progress-bar {
  height: 8px;
  background: Rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, Rgba(34, 197, 94, 1), Rgba(74, 222, 128, 1));
  box-shadow: 0 0 10px Rgba(34, 197, 94, 0.5);
  transition: width 0.1s linear;
}

.healing-text {
  color: Rgba(74, 222, 128, 1);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-text p {
  color: Rgba(255, 255, 255, 0.7);
  font-size: 15px;
  line-height: 1.5;
}

.cost-notice {
  background: Rgba(239, 68, 68, 0.1);
  padding: 15px;
  border-radius: 15px;
  border: 1px solid Rgba(239, 68, 68, 0.2);
}

.cost-notice p {
  color: Rgba(239, 68, 68, 1) !important;
  font-weight: 700;
  margin-bottom: 5px;
}

.price-tag {
  font-size: 24px;
  font-weight: 900;
  color: var(--white);
}

.cost-notice small {
  display: block;
  margin-top: 5px;
  color: Rgba(239, 68, 68, 0.6);
  font-size: 11px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}

.btn-heal {
  background: linear-gradient(135deg, Rgba(239, 68, 68, 1), Rgba(185, 28, 28, 1));
  color: var(--white);
  border: none;
  padding: 16px;
  border-radius: 15px;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px -5px Rgba(239, 68, 68, 0.4);
}

.btn-heal:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 15px 25px -5px Rgba(239, 68, 68, 0.5);
}

.btn-heal:active:not(:disabled) {
  transform: translateY(0);
}

.btn-heal:disabled {
  background: Rgba(255, 255, 255, 0.1);
  color: Rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
  box-shadow: none;
}

.btn-cancel {
  background: transparent;
  color: Rgba(255, 255, 255, 0.5);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  padding: 14px;
  border-radius: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover:not(:disabled) {
  background: Rgba(255, 255, 255, 0.05);
  color: $white;
  border-color: Rgba(255, 255, 255, 0.3);
}
</style>
