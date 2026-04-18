<script setup>
import { useWarStore } from '@/stores/war'
import { useGameStore } from '@/stores/game'
import { ref } from 'vue'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])
const warStore = useWarStore()
const gameStore = useGameStore()
const isProcessing = ref(false)

const FACTION_CHANGE_COST = 25000

const handleChoice = async (faction) => {
  if (isProcessing.value) return
  isProcessing.value = true
  
  const success = await warStore.chooseFaction(faction)
  if (success) {
    emit('close')
  }
  isProcessing.value = false
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="faction-modal-overlay"
      @click.self="$emit('close')"
    >
      <div class="faction-card">
        <button
          class="close-btn"
          @click="$emit('close')"
        >
          ✕
        </button>
        
        <h2 class="title">
          ¡ELIGE TU BANDO!
        </h2>
        
        <p class="description">
          Tu bando determina con quién disputás el control de Kanto.<br>
          <span class="warning">Cambiar de bando cuesta 🪙{{ FACTION_CHANGE_COST.toLocaleString() }} y resetea tus puntos semanales.</span>
        </p>

        <div class="factions-container">
          <!-- TEAM UNION -->
          <button 
            class="faction-btn union" 
            :disabled="isProcessing"
            @click="handleChoice('union')"
          >
            <div class="icon-wrapper">
              <img
                src="@/assets/factions/union.png"
                alt="Team Unión"
              >
            </div>
            <span class="faction-name">Team Unión</span>
            <span class="faction-motto">Amistad. Armonía. Compañerismo.</span>
          </button>

          <!-- TEAM PODER -->
          <button 
            class="faction-btn poder" 
            :disabled="isProcessing"
            @click="handleChoice('poder')"
          >
            <div class="icon-wrapper">
              <img
                src="@/assets/factions/poder.png"
                alt="Team Poder"
              >
            </div>
            <span class="faction-name">Team Poder</span>
            <span class="faction-motto">Poder. Herramientas. Eficiencia.</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.faction-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(5px);
}

.faction-card {
  background: #111;
  border: 2px solid var(--gray, #666);
  border-radius: 24px;
  padding: 32px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: var(--gray, #666);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover { color: white; }
}

.title {
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
  color: var(--yellow, #facc15);
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.3);
}

.description {
  font-size: 12px;
  color: #ccc;
  margin-bottom: 24px;
  line-height: 1.6;
  
  .warning {
    display: block;
    margin-top: 8px;
    color: var(--yellow, #facc15);
    font-weight: bold;
  }
}

.factions-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faction-btn {
  border: 3px solid transparent;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .icon-wrapper {
    width: 80px;
    height: 80px;
    margin-bottom: 12px;
    transition: transform 0.3s;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .faction-name {
    font-family: 'Press Start 2P', cursive;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .faction-motto {
    font-size: 11px;
    color: #cbd5e1;
  }

  &.union {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(59, 130, 246, 0.1));
    border-color: #3b82f6;
    
    .faction-name { color: #3b82f6; }
    .icon-wrapper img { filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.6)); }
    
    &:hover:not(:disabled) {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);
      .icon-wrapper { transform: scale(1.1); }
    }
  }

  &.poder {
    background: linear-gradient(135deg, rgba(42, 15, 15, 0.8), rgba(239, 68, 68, 0.1));
    border-color: #ef4444;
    
    .faction-name { color: #ef4444; }
    .icon-wrapper img { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)); }

    &:hover:not(:disabled) {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2);
      .icon-wrapper { transform: scale(1.1); }
    }
  }
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-enter-active .faction-card {
  animation: cardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cardIn {
  from { transform: scale(0.8) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
