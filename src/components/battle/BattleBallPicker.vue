<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { getItemById } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { gsap } from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger)

interface Props {
  disabled?: boolean
  isFinishing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  isFinishing: false
})

const emit = defineEmits<{
  (e: 'select-ball', ballName: string): void
  (e: 'catch'): void
}>()

const gameStore = useGameStore()
const battleStore = useBattleStore()

const isBallMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const availableBalls = computed(() => {
  const inventory = gameStore.state.inventory || {}
  return Object.entries(inventory)
    .filter(([id, qty]) => {
      if (typeof qty !== 'number' || qty <= 0) return false
      const item = getItemById(id)
      return item && item.cat === 'pokeballs'
    })
    .map(([id, qty]) => {
      const item = getItemById(id)
      return {
        name: item ? item.name : id,
        qty: qty as number,
        price: (item as { price?: number })?.price || 0,
        sprite: (item as { sprite: string }).sprite,
        id: id,
        desc: (item as { desc?: string }).desc || ''
      }
    })
    .sort((a, b) => b.price - a.price)
})

const toggleBallMenu = () => {
  if (battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || props.disabled) return
  
  if (availableBalls.value.length === 0) {
    emit('catch')
    return
  }

  if (availableBalls.value.length === 1 && !isBallMenuOpen.value) {
    const ball = availableBalls.value[0]
    if (ball) emit('select-ball', ball.id)
    return
  }

  if (isBallMenuOpen.value) {
    closeMenu()
  } else {
    isBallMenuOpen.value = true
  }
}

const openMenu = () => {
  if (!menuRef.value) return
  
  const tl = gsap.timeline()
  
  gsap.set(menuRef.value, {
    scale: 0.2,
    opacity: 0,
    y: 40,
    transformOrigin: 'bottom center'
  })

  const container = menuRef.value?.querySelector('.menu-items-container')
  if (container) {
    (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight
  }

  tl.to(menuRef.value, {
    scale: 1,
    opacity: 1,
    y: 0,
    duration: 0.25, // Double speed (from 0.5)
    ease: 'back.out(1.7)',
    onStart: () => {
      if (container) {
        (container as HTMLElement).scrollTop = (container as HTMLElement).scrollHeight
      }
    }
  })
}

const closeMenu = () => {
  if (!menuRef.value) {
    isBallMenuOpen.value = false
    return
  }

  gsap.to(menuRef.value, {
    scale: 0.5,
    opacity: 0,
    y: 20,
    duration: 0.15, // Ultra-fast close
    ease: 'power2.in',
    onComplete: () => {
      isBallMenuOpen.value = false
    }
  })
}

const selectBall = (ballId: string) => {
  emit('select-ball', ballId)
  closeMenu()
}



const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isBallMenuOpen.value && !target.closest('.catch-btn-wrapper')) {
    closeMenu()
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div
    class="catch-btn-wrapper"
    :class="{ 'menu-open': isBallMenuOpen }"
  >
    <!-- Upward Dropdown Menu -->
    <div
      v-if="isBallMenuOpen"
      ref="menuRef"
      class="ball-dropdown-menu"
      @vue:mounted="openMenu"
    >
      <div class="menu-header">
        <span class="header-label">SELECCIONAR BALL</span>
      </div>
      <div class="menu-items-container">
        <PVTooltip
          v-for="ball in availableBalls"
          :key="ball.name"
          :title="ball.name"
          :description="ball.desc"
          position="right"
          tag="div"
          class="ball-tooltip-wrapper"
        >
          <button
            class="ball-option-item"
            @click.stop="selectBall(ball.id)"
          >
            <div class="ball-sprite-wrapper">
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, ball.sprite)" 
                :alt="ball.name" 
                class="ball-icon-mini" 
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
            </div>
            <div class="ball-info">
              <span class="ball-name">{{ ball.name }}</span>
            </div>
            <div class="ball-qty">
              x{{ ball.qty }}
            </div>
            <div class="ball-action-arrow">
              ▶
            </div>
          </button>
        </PVTooltip>
      </div>
    </div>

    <button
      v-gsap-hover="{ scale: 1.12, rotation: 5, y: 0 }"
      class="btn-catch-ball"
      :class="{ 'is-active': isBallMenuOpen }"
      :disabled="battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || battleStore.state?.isTrainer"
      @click.stop="toggleBallMenu"
    >
      <span class="sr-only">CAPTURAR</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_variables" as v;
@use "@/styles/core/_mixins" as m;
@use "@/styles/core/_tools" as t;

.catch-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px; 
  height: 64px;
  position: relative;
  z-index: var(--z-low);
  overflow: visible;

  &.menu-open {
    z-index: var(--z-max); 
  }
}

.btn-catch-ball {
  width: 64px;
  height: 64px;
  border-radius: 50% !important;
  background: white !important;
  position: relative; 
  display: block;
  border: 3px solid #0a0a0a !important;
  box-shadow: 0 6px 15px Rgba(0,0,0,0.4), inset 0 -3px 0 Rgba(0,0,0,0.1) !important;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  z-index: var(--z-map-spawns);
  transform: Translatez(0); 
  transform-origin: center center;
  transform-style: preserve-3d;
  will-change: transform, filter, box-shadow;
  

  &:hover:not(:disabled) {
    filter: Brightness(1.1);
    box-shadow: 0 10px 20px Rgba(0,0,0,0.5), Inset 0 -3px 0 Rgba(0,0,0,0.1) !important;
  }

  &:active:not(:disabled) {
  }

  &:disabled {
    filter: Grayscale(0.8);
    opacity: 0.7;
    cursor: not-allowed;
  }

  &.is-active {
    transform: Scale(0.9) !important;
    border-color: #ff453a !important;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50%;
    background: #ef5350;
    border-bottom: 3px solid #0a0a0a;
    z-index: var(--z-map-floor);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: Translate(-50%, -50%);
    width: 18px;
    height: 18px;
    background: white;
    border: 3px solid #0a0a0a;
    border-radius: 50%;
    z-index: calc(var(--z-map-floor) + 1);
    box-shadow: 0 0 0 3px white, 0 0 10px Rgba(0,0,0,0.2);
  }

  .sr-only { display: none; }
}

.ball-dropdown-menu {
  position: absolute;
  bottom: calc(100% + 20px);
  left: 50%;
  transform: Translatex(-50%);
  @include m.shell-premium(Rgba(15, 23, 42, 0.95), 24px);
  backdrop-filter: Blur(12px);
  will-change: transform, opacity, backdrop-filter;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 260px;
  max-height: calc(75dvh / var(--app-zoom, 1));
  min-height: 0; // Force proper flexbox child shrinking
  z-index: var(--z-max);
  pointer-events: auto;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid Rgba(255, 255, 255, 0.2);
    pointer-events: none;
    box-shadow: inset 0 0 15px Rgba(255, 255, 255, 0.05);
  }
}

.menu-header {
  padding: 0 8px 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  
  .header-label {
    font-size: 7px;
    color: #86868b;
    letter-spacing: 2px;
    font-weight: 900;
    @include m.pixelated;
  }
}

.menu-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px;
  scrollbar-width: thin;
  scrollbar-color: Rgba(255, 255, 255, 0.4) Rgba(0, 0, 0, 0.25);
  scroll-behavior: auto !important;

  // Custom retro scrollbar
  &::-webkit-scrollbar {
    width: 6px;
    display: block !important;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.4);
    border-radius: 3px;
    border: 1px solid Rgba(0, 0, 0, 0.2);
    &:hover {
      background: Rgba(255, 255, 255, 0.55);
    }
  }

  .ball-tooltip-wrapper {
    width: 100%;
    display: block;
    flex-shrink: 0;
  }
}

.ball-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: Rgba(255, 255, 255, 0.01);
  border: 1px solid transparent;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  width: 100%;
  text-align: left;
  position: relative;
  overflow: hidden;
  

  .ball-sprite-wrapper {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: Rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    flex-shrink: 0;

    .ball-icon-mini {
      width: 36px;
      height: 36px;
      @include m.pixelated;
      will-change: transform;
      filter: Drop-Shadow(0 4px 6px Rgba(0,0,0,0.5));
    }
  }

  .ball-info {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    
    .ball-name {
      font-size: 8px;
      font-weight: 900;
      text-transform: Uppercase;
      letter-spacing: 0.5px;
      color: white;
      @include m.pixelated;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1;
      display: inline-flex;
      align-items: center;
    }
  }

  .ball-qty {
    font-size: 7px;
    color: #ffd60a;
    font-weight: 700;
    @include m.pixelated;
    margin-right: 4px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .ball-action-arrow {
    font-size: 8px;
    color: #ffd60a;
    opacity: 0.3;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  &:hover {
    @include m.shell-hover-blue;
    transform: none !important; // Zero movement to prevent sticking
    outline: none;
    
    .ball-sprite-wrapper .ball-icon-mini {
      transform: Scale(1.15); // Scale is safe, it doesn't shift the hit area
    }

    .ball-qty, .ball-action-arrow {
      color: white;
      opacity: 1;
    }
  }
}
</style>
>
