<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { SHOP_ITEMS } from '@/data/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const props = defineProps({
  isFinishing: { type: Boolean, default: false }
})

const emit = defineEmits(['switch', 'bag', 'run', 'catch', 'select-ball'])

const gameStore = useGameStore()
const battleStore = useBattleStore()

const isBallMenuOpen = ref(false)

const availableBalls = computed(() => {
  const inventory = gameStore.state.inventory || {}
  return Object.entries(inventory)
    .filter(([name, qty]) => {
      if (qty <= 0) return false
      const item = SHOP_ITEMS.find(i => i.name === name)
      return item && item.cat === 'pokeballs'
    })
    .map(([name, qty]) => {
      const item = SHOP_ITEMS.find(i => i.name === name)
      return {
        name,
        qty,
        price: item.price || 0,
        sprite: item.sprite,
        id: item.id
      }
    })
    .sort((a, b) => b.price - a.price) // Mas cara arriba (index 0), mas barata abajo
})

const toggleBallMenu = () => {
  if (battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating) return
  
  if (availableBalls.value.length === 0) {
    emit('catch') // Let parent handle "no balls" state
    return
  }

  // Si solo hay una, lanzamos directamente para agilizar
  if (availableBalls.value.length === 1 && !isBallMenuOpen.value) {
    emit('select-ball', availableBalls.value[0].name)
    return
  }

  isBallMenuOpen.value = !isBallMenuOpen.value
}

const selectBall = (ballName) => {
  emit('select-ball', ballName)
  isBallMenuOpen.value = false
}

const handleClickOutside = (e) => {
  if (isBallMenuOpen.value && !e.target.closest('.catch-btn-wrapper')) {
    isBallMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside) // [PureVue-Ignore]
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div 
    class="actions-container"
    :class="{ 'intro-fade': battleStore.isIntroAnimating }"
  >
    <div class="action-row-complex">
      <button
        class="btn-vicio-secondary switch"
        :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating"
        @click.stop="emit('switch')"
      >
        <span class="icon">🔄</span> CAMBIAR
      </button>

      <div
        class="catch-btn-wrapper"
        :class="{ 'menu-open': isBallMenuOpen }"
      >
        <!-- Upward Dropdown Menu -->
        <Transition name="slide-up">
          <div
            v-if="isBallMenuOpen"
            class="ball-dropdown-menu"
          >
            <button
              v-for="ball in availableBalls"
              :key="ball.name"
              class="ball-option-item"
              @click.stop="selectBall(ball.name)"
            >
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, ball.sprite)" 
                :alt="ball.name" 
                class="ball-icon-mini" 
                @error="e => e.target.style.display = 'none'"
              > <!-- [PureVue-Ignore] -->
              <div class="ball-info">
                <span class="ball-name">{{ ball.name }}</span>
                <span class="ball-qty">x{{ ball.qty }}</span>
              </div>
            </button>
          </div>
        </Transition>

        <button
          class="btn-catch-ball"
          :class="{ 'is-active': isBallMenuOpen }"
          :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || battleStore.state?.isTrainer"
          @click.stop="toggleBallMenu"
        >
          <span>CAPTURAR</span>
        </button>
      </div>

      <button
        class="btn-vicio-success bag"
        :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating"
        @click.stop="emit('bag')"
      >
        <span class="icon">🎒</span> MOCHILA
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.actions-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: visible;
  position: relative;
  z-index: Var(--z-low);

  &.intro-fade {
    opacity: 0.1;
    pointer-events: none;
  }
}

.action-row-complex {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: Var(--move-panel-gap, 12px);
  align-items: center;
  overflow: visible;

  .btn-vicio-secondary, .btn-vicio-success {
    padding: 6px 12px;
    font-size: 8px;
    border-radius: 10px;
    min-height: 40px; // Altura fija compacta para alineación
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    &:disabled {
      cursor: not-allowed;
    }
  }
}

.catch-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px; 
  height: 64px;
  position: relative;
  z-index: Var(--z-low);
  flex-shrink: 0; 
  overflow: visible;

  &.menu-open {
    z-index: Var(--z-max); // Máxima prioridad visual para evitar solapamientos
  }
}

/* The Iconic Pokeball Button */
.btn-catch-ball {
  width: 64px;
  height: 64px;
  border-radius: 50% !important;
  background: $white !important;
  position: absolute; 
  inset: 0;
  margin: auto;
  border: 3px solid Var(--dark) !important;
  box-shadow: 0 6px 15px Rgba(0,0,0,0.4), inset 0 -3px 0 Rgba(0,0,0,0.1) !important;
  cursor: pointer;
  transition: all 0.3s cubic-Bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  padding: 0;
  z-index: Var(--z-base);
  transform: TranslateZ(0); 
  transform-origin: center center;
  backface-visibility: hidden;

  &:disabled {
    filter: Grayscale(0.8);
    opacity: 0.7;
    cursor: not-allowed;
  }

  &.is-active {
    transform: Scale(0.9);
    border-color: Var(--red) !important;
  }
}

.btn-catch-ball::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: Rgba(239, 83, 80, 1);
  border-bottom: 3px solid Var(--dark);
}

.btn-catch-ball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: Translate(-50%, -50%);
  width: 18px;
  height: 18px;
  background: $white;
  border: 3px solid Var(--dark);
  border-radius: 50%;
  z-index: Var(--z-low);
  box-shadow: 0 0 0 3px $white, 0 0 10px Rgba(0,0,0,0.2);
}

.btn-catch-ball:Not(:disabled):hover {
  transform: Scale(1.1) TranslateY(-8px) Rotate(10deg); 
  box-shadow: 0 12px 30px Rgba(0,0,0,0.5);
  z-index: Var(--z-low);

  @media (max-width: 600px) {
    transform: Scale(1.05) TranslateY(-4px) Rotate(5deg);
  }
}

.btn-catch-ball span { display: none; }

/* Dropdown Menu Styling */
.ball-dropdown-menu {
  position: absolute;
  bottom: Calc(100% + 12px);
  left: 50%;
  transform: TranslateX(-50%);
  // Sólido y oscuro para evitar cualquier transparencia
  background: Var(--darker); 
  border: 2px solid Var(--glass-border);
  border-radius: 16px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  box-shadow: 0 25px 70px Rgba(0, 0, 0, 1);
  z-index: Var(--z-max);
  pointer-events: auto;

  @media (max-width: 600px) {
    min-width: 160px;
    padding: 6px;
  }
}

.ball-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: Var(--card);
  border: 1px solid Var(--glass-border);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;

  &:hover {
    background: Var(--card2);
    transform: TranslateX(4px);
    border-color: Var(--glass-edge);
    box-shadow: 0 4px 15px Rgba(0,0,0,0.8);
  }

  &:active {
    transform: Scale(0.98);
  }

  .ball-icon-mini {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.8));
  }

  .ball-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .ball-name {
      font-size: 12px;
      font-weight: 700;
      text-transform: Uppercase;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px Rgba(0,0,0,1);
      color: $white;
    }

    .ball-qty {
      font-size: 10px;
      opacity: 0.9;
      font-family: monospace;
      color: Var(--yellow, $coin-gold);
    }
  }
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-Bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: TranslateX(-50%) TranslateY(20px) Scale(0.8);
}

</style>
