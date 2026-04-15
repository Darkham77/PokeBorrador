<script setup>
import { ref, onMounted } from 'vue'

const isVisible = ref(false)
const showEffect = ref(false)

// Expose state to legacy engine
onMounted(() => {
  window.openPokemonCenter = () => {
    isVisible.value = true
    // Logic is handled by the legacy healAllPokemon which is called inside 08_shop.js openPokemonCenter
    // But since we are overriding the function, we need to call healAllPokemon here if we want to keep the logic.
    if (typeof window.healAllPokemon === 'function') {
      window.healAllPokemon()
    }
  }

  window.closePokemonCenter = () => {
    isVisible.value = false
  }
  
  // Bridge for the healing effect if the legacy code wants to trigger it
  window.showHealEffect = (active) => {
    showEffect.value = active
  }
})
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" id="pokemon-center-overlay" class="center-overlay">
      <!-- image-only container -->
      <div id="center-image-container" class="center-card">
        <img id="center-nurse-img" src="/assets/pokecenter_heal.png" class="nurse-img">
        
        <!-- Healing Effect Layer -->
        <Transition name="flash">
          <div v-if="showEffect" id="healing-effect" class="heal-flash"></div>
        </Transition>

        <!-- Status Text (Optional but good for feedback) -->
        <div class="nurse-msg" v-if="showEffect">
          PROCESANDO CURACIÓN...
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.center-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-card {
  width: 100%;
  max-width: 600px;
  position: relative;
  display: flex;
  justify-content: center;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
  border-radius: 24px;
  overflow: hidden;
  background: #000;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.nurse-img {
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  object-fit: contain;
}

.heal-flash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: rgba(0, 255, 100, 0.2);
  box-shadow: inset 0 0 100px rgba(0, 255, 100, 0.5);
  pointer-events: none;
}

.nurse-msg {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  color: #00ff66;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  letter-spacing: 1px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.flash-enter-active {
  animation: pulse 0.5s infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.2; }
  to { opacity: 0.6; }
}
</style>
