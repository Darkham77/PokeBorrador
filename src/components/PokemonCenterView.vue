<script setup>
import { ref, computed } from 'vue'
import { useShopStore } from '@/stores/shopStore'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const shopStore = useShopStore()
const gameStore = useGameStore()
const uiStore = useUIStore()

const isHealing = ref(false)
const showConfirmation = ref(false)

const cost = computed(() => shopStore.getHealCost())

const handleHeal = () => {
  if (cost.value > 0) {
    showConfirmation.value = true
  } else {
    startHealing()
  }
}

const confirmHeal = () => {
  showConfirmation.value = false
  startHealing()
}

const startHealing = () => {
  isHealing.value = true
  
  // Wait for animation
  setTimeout(() => {
    const success = shopStore.healAllPokemon()
    if (success) {
      setTimeout(() => {
        isHealing.value = false
        uiStore.closeModal()
      }, 1000)
    } else {
      isHealing.value = false
    }
  }, 2000)
}
</script>

<template>
  <div
    class="center-overlay"
    @click.self="!isHealing && uiStore.closeModal()"
  >
    <div class="center-card animate-scale">
      <header class="card-header">
        <div class="title">
          CENTRO POKÉMON
        </div>
        <button
          v-if="!isHealing"
          class="close-btn"
          @click="uiStore.closeModal()"
        >
          ✕
        </button>
      </header>

      <div class="body-content">
        <!-- HEALING ANIMATION -->
        <div
          v-if="isHealing"
          class="healing-anim"
        >
          <div class="nurse-joy-area">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/113.png"
              class="chansey"
            >
            <div class="tray">
              <div
                v-for="i in 6"
                :key="i"
                class="ball-slot"
              >
                <div
                  v-if="gameStore.state.team[i-1]"
                  class="mini-ball pulse"
                />
              </div>
            </div>
          </div>
          <div class="status-text">
            CURANDO EQUIPO...
          </div>
        </div>

        <!-- MAIN UI -->
        <div
          v-else
          class="main-ui"
        >
          <div class="nurse-message">
            ¡Hola! Bienvenido al Centro Pokémon.<br>
            Podemos curar a tus Pokémon para que vuelvan a estar en plena forma.
          </div>

          <div class="team-preview">
            <div
              v-for="poke in gameStore.state.team"
              :key="poke.uid"
              class="poke-mini-card"
            >
              <div class="hp-bar">
                <div
                  class="hp-fill"
                  :style="{ width: (poke.hp/poke.maxHp*100) + '%' }"
                />
              </div>
              <div class="name">
                {{ poke.name }}
              </div>
            </div>
          </div>

          <div
            v-if="cost > 0"
            class="cost-notice"
          >
            <span class="warning">⚠️ Tu clase ({{ gameStore.state.playerClass }}) tiene un recargo por servicio médico.</span>
            <div class="price">
              COSTO: ₽{{ cost }}
            </div>
          </div>

          <button
            class="heal-btn"
            @click="handleHeal"
          >
            CURAR EQUIPO
          </button>
        </div>
      </div>

      <!-- CONFIRMATION MODAL -->
      <div
        v-if="showConfirmation"
        class="confirm-overlay"
      >
        <div class="confirm-box">
          <h3>¿Confirmar Pago?</h3>
          <p>Se te cobrarán ₽{{ cost }} por el servicio.</p>
          <div class="actions">
            <button
              class="btn-cancel"
              @click="showConfirmation = false"
            >
              CANCELAR
            </button>
            <button
              class="btn-confirm"
              @click="confirmHeal"
            >
              PAGAR Y CURAR
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.center-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
}

.center-card {
  width: min(400px, 90%);
  background: #1a1a1a;
  border-radius: 20px;
  overflow: hidden;
  border: 4px solid #f87171;
  position: relative;
}

.card-header {
  background: #f87171; padding: 15px; display: flex; justify-content: space-between; align-items: center;
  .title { font-family: 'Press Start 2P', cursive; font-size: 10px; color: white; }
  .close-btn { background: none; border: none; color: white; cursor: pointer; }
}

.body-content { padding: 25px; min-height: 250px; display: flex; flex-direction: column; }

.healing-anim {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px;

  .chansey { width: 120px; filter: drop-shadow(0 0 10px rgba(248, 113, 113, 0.4)); }
  
  .tray {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    background: #333; padding: 10px; border-radius: 10px; border: 2px solid #555;
    
    .ball-slot {
      width: 24px; height: 24px; background: #222; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    
    .mini-ball {
      width: 16px; height: 16px; background: #f87171; border-radius: 50%;
      border: 2px solid white;
      &.pulse { animation: pulse 0.5s infinite alternate; }
    }
  }

  .status-text { font-family: 'Press Start 2P', cursive; font-size: 8px; color: #f87171; }
}

.main-ui {
  display: flex; flex-direction: column; gap: 20px;
  .nurse-message { font-size: 14px; color: #ccc; line-height: 1.5; text-align: center; }
}

.team-preview {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  .poke-mini-card {
    background: #222; padding: 8px; border-radius: 8px;
    .hp-bar { height: 4px; background: #444; border-radius: 2px; margin-bottom: 4px; overflow: hidden; }
    .hp-fill { height: 100%; background: #4ade80; transition: width 0.3s; }
    .name { font-size: 8px; color: #888; text-align: center; }
  }
}

.cost-notice {
  background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3);
  padding: 10px; border-radius: 10px; text-align: center;
  .warning { font-size: 10px; color: #f87171; display: block; margin-bottom: 5px; }
  .price { font-weight: 800; color: white; }
}

.heal-btn {
  width: 100%; padding: 15px; border-radius: 12px; border: none;
  background: #f87171; color: white; font-family: 'Press Start 2P', cursive;
  font-size: 10px; cursor: pointer; transition: transform 0.2s;
  &:hover { transform: scale(1.02); background: #ef4444; }
}

.confirm-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  .confirm-box {
    text-align: center; padding: 20px;
    h3 { color: #f87171; margin-bottom: 10px; }
    p { color: #888; margin-bottom: 20px; }
    .actions { display: flex; gap: 10px; }
    button { 
      flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 10px; 
      font-family: 'Press Start 2P', cursive; cursor: pointer;
    }
    .btn-cancel { background: #333; color: white; }
    .btn-confirm { background: #f87171; color: white; }
  }
}

@keyframes pulse {
  from { opacity: 0.5; transform: scale(0.9); box-shadow: 0 0 0 rgba(248, 113, 113, 0); }
  to { opacity: 1; transform: scale(1.1); box-shadow: 0 0 10px rgba(248, 113, 113, 0.8); }
}

.animate-scale { animation: scaleIn 0.3s ease-out; }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
