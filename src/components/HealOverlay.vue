<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()
const isVisible = ref(false)
const isConfirming = ref(false)
const showEffect = ref(false)
const healCost = ref(0)

const gs = computed(() => gameStore.state)

// Expose state to legacy engine
onMounted(() => {
  window.openPokemonCenter = async () => {
    isVisible.value = true
    isConfirming.value = false
    
    if (typeof window.getHealCost === 'function') {
      healCost.value = window.getHealCost()
    }
    
    if (healCost.value > 0) {
      isConfirming.value = true
    } else {
      await nextTick()
      if (typeof window._doHeal === 'function') {
        window._doHeal()
      }
    }
  }

  window.closePokemonCenter = () => {
    isVisible.value = false
    isConfirming.value = false
  }
  
  window.showHealEffect = (active) => {
    showEffect.value = active
    if (active) isVisible.value = true
  }

  // Handle legacy direct overlay display calls
  const originalDoHeal = window._doHeal
  if (typeof originalDoHeal === 'function') {
    window._doHeal = () => {
      isVisible.value = true
      originalDoHeal()
    }
  }
})

const handleConfirm = () => {
  isConfirming.value = false
  if (typeof window.confirmHeal === 'function') {
    window.confirmHeal()
  } else if (typeof window._doHeal === 'function') {
    // Fallback if confirmHeal isn't there
    window._doHeal()
  }
}

const handleCancel = () => {
  isConfirming.value = false
  isVisible.value = false
  if (typeof window.cancelHealConfirm === 'function') {
    window.cancelHealConfirm()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isVisible"
        id="pokemon-center-overlay"
        class="center-overlay"
      >
        <div
          class="center-card"
          :class="{ 'with-confirm': isConfirming }"
        >
          <!-- Nurse Image (Blurred during confirmation) -->
          <img
            id="center-nurse-img"
            src="@/assets/ui/banners/pokecenter_heal.webp"
            class="nurse-img"
            :class="{ 'is-blurred': isConfirming }"
          >
          
          <!-- Healing Effect Layer -->
          <Transition name="flash">
            <div
              v-if="showEffect"
              id="healing-effect"
              class="heal-flash"
            />
          </Transition>

          <!-- GBA Style Dialogue (For Confirmation) -->
          <Transition name="slide-up">
            <div
              v-if="isConfirming"
              class="gba-dialogue-container"
            >
              <div class="gba-dialogue-box">
                <div class="gba-dialogue-content">
                  <p class="gba-text">
                    La curación tiene un costo de <span class="cost">₽{{ healCost.toLocaleString() }}</span>. ¿Continuar?
                  </p>
                  <div class="gba-actions">
                    <button
                      class="gba-btn confirm"
                      @click="handleConfirm"
                    >
                      SÍ
                    </button>
                    <button
                      class="gba-btn cancel"
                      @click="handleCancel"
                    >
                      NO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.center-overlay {
  position: fixed;
  inset: 0;
  @include glass(rgba(0, 0, 0, 0.92), 15px);
  z-index: 999999;
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
  transition: all 0.5s ease;

  &.is-blurred {
    filter: blur(15px) #{"grayScale(100%)"};
    opacity: 0.4;
    transform: #{"Scale(1.05)"};
  }
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

.gba-dialogue-container {
  position: absolute;
  bottom: 0px;
  left: 0;
  right: 0;
  padding: 12px;
  z-index: 10;
  display: flex;
  justify-content: center;
}

.gba-dialogue-box {
  width: 100%;
  background: white;
  border: 3px solid #111;
  border-radius: 8px;
  padding: 2px; // Inner border offset
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  
  // The iconic white inner line of GBA boxes
  &::before {
    content: '';
    display: block;
    position: absolute;
    inset: 4px;
    border: 2px solid white;
    border-radius: 6px;
    pointer-events: none;
  }
}

.gba-dialogue-content {
  padding: 16px 20px;
  position: relative;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.gba-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  line-height: 1.8;
  color: #333;
  margin: 0;
  text-transform: none;
  
  .cost {
    color: #c53030; // Dark red for cost
    font-weight: bold;
  }
}

.gba-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 20px;
}

.gba-btn {
  background: transparent;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  padding: 4px 8px;
  position: relative;
  transition: all 0.1s;

  &::before {
    content: '▶';
    position: absolute;
    left: -12px;
    opacity: 0;
    font-size: 10px;
  }

  &:hover {
    color: #000;
    &::before { opacity: 1; }
  }

  &.confirm {
    color: #2b6cb0; // Blueish for confirm
    &:hover { color: #2c5282; }
  }
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

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

@keyframes pulseHeal {
  from { opacity: 0.1; transform: scale3d(0.95, 0.95, 1); }
  to { opacity: 0.8; transform: scale3d(1.05, 1.05, 1); }
}
</style>
