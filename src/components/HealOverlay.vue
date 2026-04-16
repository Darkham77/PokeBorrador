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
    <div
      v-if="isVisible"
      id="pokemon-center-overlay"
      class="center-overlay"
    >
      <!-- image-only container -->
      <div
        id="center-image-container"
        class="center-card"
      >
        <img
          id="center-nurse-img"
          src="/assets/pokecenter_heal.png"
          class="nurse-img"
        >
        
        <!-- Healing Effect Layer -->
        <Transition name="flash">
          <div
            v-if="showEffect"
            id="healing-effect"
            class="heal-flash"
          />
        </Transition>

        <!-- Status Text (Optional but good for feedback) -->
        <div
          v-if="showEffect"
          class="nurse-msg"
        >
          PROCESANDO CURACIÓN...
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.center-overlay {
  position: fixed;
  inset: 0;
  @include glass(rgba(0, 0, 0, 0.92), 15px);
  z-index: 999999; // Ensure it's on top of everything
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.center-card {
  width: 100%;
  max-width: 600px;
  position: relative;
  display: flex;
  justify-content: center;
  @include card-premium(24px);
  overflow: hidden;
  box-shadow: 0 0 80px rgba(0, 0, 0, 0.9), 0 0 30px rgba(59, 139, 255, 0.1);
}

.nurse-img {
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.8));
}

.heal-flash {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: radial-gradient(circle, rgba(107, 203, 119, 0.3) 0%, rgba(0, 0, 0, 0) 80%);
  box-shadow: inset 0 0 100px rgba(107, 203, 119, 0.5);
  pointer-events: none;
  mix-blend-mode: screen;
}

.nurse-msg {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  text-align: center;
  color: var(--green);
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 1), 0 0 10px rgba(107, 203, 119, 0.8);
  letter-spacing: 1px;
  animation: glowText 1s infinite alternate;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.flash-enter-active {
  animation: pulseHeal 0.6s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pulseHeal {
  from { opacity: 0.1; transform: scale3d(0.95, 0.95, 1); }
  to { opacity: 0.8; transform: scale3d(1.05, 1.05, 1); }
}

@keyframes glowText {
  from { text-shadow: 0 2px 4px rgba(0,0,0,1), 0 0 5px rgba(107, 203, 119, 0.4); }
  to { text-shadow: 0 4px 8px rgba(0,0,0,1), 0 0 15px rgba(107, 203, 119, 1); }
}
</style>
