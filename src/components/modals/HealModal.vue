<script setup>
import { ref, computed, onMounted } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

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
          emit('close')
        }, 800)
      } else {
        isHealing.value = false
      }
    }
  }, 80)
}

function handleClose() {
  if (isHealing.value) return
  emit('close')
}

// ── LEGACY COMPATIBILITY ─────────────────────────────────────────────────────
onMounted(() => {
  window.showHealEffect = (active) => {
    if (active) {
      // In dynamic system, we should ideally trigger through modalStore
      // but for legacy events we can still use this if it's called from outside Vue
      import('@/stores/modals').then(module => {
        if (module && module.useModalStore) {
          const modalStore = module.useModalStore()
          modalStore.open('HealOverlay')
          setTimeout(() => handleHeal(), 100)
        }
      })
    }
  }
})
</script>

<template>
  <BaseModal
    :show="show"
    title="🏥 CENTRO POKÉMON"
    max-width="420px"
    @close="handleClose"
  >
    <div class="heal-modal-inner">
      <p class="subtitle">
        Servicio de Salud para Entrenadores
      </p>

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
            RESTAURANDO EQUIPO...
          </p>
        </div>
        
        <div
          v-else
          class="info-text"
        >
          <div
            v-if="cost > 0"
            class="cost-notice"
          >
            <p class="cost-label">
              COSTO DE SERVICIO
            </p>
            <div class="price-tag">
              ₽ {{ cost.toLocaleString() }}
            </div>
            <small
              v-if="gameStore.state.playerClass === 'rocket'"
              class="rocket-surcharge"
            >Recargo: Team Rocket (2x)</small>
          </div>
          <p
            v-else
            class="free-msg"
          >
            ¡Hola! Restauraremos a tus Pokémon al instante.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="heal-actions">
        <button 
          class="btn-heal-primary" 
          :disabled="isHealing || team.length === 0 || (cost > 0 && gameStore.state.money < cost)"
          @click="handleHeal"
        >
          {{ isHealing ? 'CURANDO...' : 'CURAR EQUIPO' }}
        </button>
        <button
          class="btn-cancel-secondary"
          :disabled="isHealing"
          @click="handleClose"
        >
          VOLVER
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.heal-modal-inner {
  padding: 8px 0;
  text-align: center;
}

.subtitle {
  color: rgba(255, 255, 255, 0.4);
  font-size: 8px;
  font-family: 'Press Start 2P', cursive;
  margin-bottom: 30px;
  text-transform: uppercase;
  letter-spacing: 1px;
  @include pixelated;
}

.team-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.slot {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.2;

  &.active {
    opacity: 1;
    background: rgba(255, 255, 255, 0.06);
  }

  &.healing {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.4);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
    transform: Scale(1.1);
  }
}

.ball-icon {
  font-size: 24px;
  filter: Grayscale(1);
}

.slot.active .ball-icon {
  filter: Grayscale(0);
}

.slot.healing .ball-icon {
  animation: pulse-ball 0.6s infinite alternate;
}

@keyframes pulse-ball {
  from { transform: Scale(1); filter: Brightness(1); }
  to { transform: Scale(1.2); filter: Brightness(1.4) drop-shadow(0 0 10px #ff4444); }
}

.progress-container {
  margin-top: 20px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.5);
  transition: width 0.1s linear;
}

.healing-text {
  color: #22c55e;
  font-family: 'Press Start 2P', cursive;
  font-size: 7px;
  letter-spacing: 1px;
  @include pixelated;
}

.free-msg {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
}

.cost-notice {
  background: rgba(239, 68, 68, 0.05);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.15);
  
  .cost-label {
    font-family: 'Press Start 2P', cursive;
    font-size: 7px;
    color: #ef4444;
    margin-bottom: 12px;
    @include pixelated;
  }
  
  .price-tag {
    font-family: 'Press Start 2P', cursive;
    font-size: 16px;
    color: #fff;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
    @include pixelated;
  }
  
  .rocket-surcharge {
    display: block;
    margin-top: 8px;
    color: rgba(239, 68, 68, 0.5);
    font-size: 8px;
    @include pixelated;
  }
}

.heal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-heal-primary {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  border: none;
  padding: 18px;
  border-radius: 14px;
  font-family: 'Press Start 2P', cursive;
  font-size: 9px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
  @include pixelated;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
    filter: Brightness(1.1);
  }
  
  &:disabled {
    background: #27272a;
    color: #52525b;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:active:not(:disabled) {
    transform: translateY(0) Scale(0.98);
  }
}

.btn-cancel-secondary {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 14px;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
  @include pixelated;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
