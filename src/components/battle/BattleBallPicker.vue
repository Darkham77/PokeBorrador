<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { getItemById, isItemId, type ItemId } from '@/data/inventory/items'
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
  (e: 'select-ball', ballId: ItemId): void
  (e: 'catch'): void
}>()

const gameStore = useGameStore()
const battleStore = useBattleStore()

const isBallMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const availableBalls = computed(() => {
  const inventory = gameStore.state.inventory || {}
  return (Object.entries(inventory) as [ItemId, number | undefined][])
    .filter(([id, qty]) => {
      if (typeof qty !== 'number' || qty <= 0 || !isItemId(id)) return false
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
    .toSorted((a, b) => b.price - a.price)
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

const BALL_MENU_ANIM_Y_OFFSET_PX = 40
const BALL_MENU_CLOSE_Y_OFFSET_PX = 20
const BALL_MENU_OPEN_DURATION_SEC = 0.25
const BALL_MENU_CLOSE_DURATION_SEC = 0.15

const openMenu = () => {
  if (!menuRef.value) return
  
  const tl = gsap.timeline()
  
  gsap.set(menuRef.value, {
    scale: 0.2,
    opacity: 0,
    y: BALL_MENU_ANIM_Y_OFFSET_PX,
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
    duration: BALL_MENU_OPEN_DURATION_SEC, // Double speed (from 0.5)
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
    y: BALL_MENU_CLOSE_Y_OFFSET_PX,
    duration: BALL_MENU_CLOSE_DURATION_SEC, // Ultra-fast close
    ease: 'power2.in',
    onComplete: () => {
      isBallMenuOpen.value = false
    }
  })
}

const selectBall = (ballId: ItemId) => {
  emit('select-ball', ballId)
  closeMenu()
}



const containerRef = ref<HTMLElement | null>(null)

onClickOutside(containerRef, () => {
  if (isBallMenuOpen.value) {
    closeMenu()
  }
})

defineExpose({
  toggleBallMenu
})
</script>

<template>
  <div
    ref="containerRef"
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
            :id="'battle-ball-option-' + ball.id"
            class="ball-option-item"
            @click.stop="selectBall(ball.id)"
          >
            <span class="ball-sprite-wrapper">
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, ball.sprite)" 
                :alt="ball.name" 
                class="ball-icon-mini" 
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
            </span>
            <span class="ball-info">
              <span class="ball-name">{{ ball.name }}</span>
            </span>
            <span class="ball-qty">
              x{{ ball.qty }}
            </span>
            <span class="ball-action-arrow">
              <span class="emoji">▶</span>
            </span>
          </button>
        </PVTooltip>
      </div>
    </div>

    <button
      id="battle-catch-ball-btn"
      v-gsap-hover="{ scale: 1.12, rotation: 5, y: 0 }"
      class="btn-catch-ball"
      :class="{ 'is-active': isBallMenuOpen }"
      :disabled="props.disabled || battleStore.isProcessing || props.isFinishing || battleStore.isIntroAnimating || (battleStore.uiConfig ? !battleStore.uiConfig.allowCatch : false)"
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
  position: relative;
  z-index: var(--z-low);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 64px; 
  height: 64px;
  overflow: visible;

  &.menu-open {
    z-index: var(--z-max); 
  }
}

.btn-catch-ball {
  position: relative;
  z-index: var(--z-map-spawns); 
  display: block;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 3px solid #0a0a0a !important;
  border-radius: 50% !important;
  background: white !important;
  transform: Translatez(0);
  box-shadow: 0 6px 15px Rgb(0 0 0 / 40%), inset 0 -3px 0 Rgb(0 0 0 / 10%) !important;
  cursor: pointer;
  overflow: hidden; 
  transform-origin: center center;
  transform-style: preserve-3d;
  will-change: transform, filter, box-shadow;
  

  &:hover:not(:disabled) {
    filter: Brightness(1.1);
    box-shadow: 0 10px 20px Rgb(0 0 0 / 50%), inset 0 -3px 0 Rgb(0 0 0 / 10%) !important;
  }

  &:disabled {
    opacity: 0.7;
    filter: Grayscale(0.8);
    cursor: not-allowed;
  }

  &.is-active {
    transform: Scale(0.9);
    border-color: #ff453a !important;
  }

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    z-index: var(--z-map-floor);
    width: 100%;
    height: 50%;
    background: #ef5350;
    content: '';
    border-bottom: 3px solid #0a0a0a;
  }

  &::after {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: calc(var(--z-map-floor) + 1);
    width: 18px;
    height: 18px;
    border: 3px solid #0a0a0a;
    border-radius: 50%;
    background: white;
    transform: Translate(-50%, -50%);
    content: '';
    box-shadow: 0 0 0 3px white, 0 0 10px Rgb(0 0 0 / 20%);
  }

  .sr-only { display: none; }
}

.ball-dropdown-menu {
  @include m.shell-premium(Rgba(15, 23, 42, 0.95), 24px);

  position: absolute;
  bottom: calc(100% + 20px);
  left: 50%;
  z-index: var(--z-max);
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 260px;
  min-height: 0; // Force proper flexbox child shrinking
  max-height: calc(75dvh / var(--app-zoom, 1));
  padding: 12px;
  transform: Translatex(-50%);
  backdrop-filter: Blur(12px);
  will-change: transform, opacity, backdrop-filter;
  pointer-events: auto;
  &::after {
    position: absolute;
    border: 1px solid Rgb(255 255 255 / 20%);
    border-radius: inherit;
    content: '';
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 15px Rgb(255 255 255 / 5%);
  }
}

.menu-header {
  padding: 0 8px 8px;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
  flex-shrink: 0;
  
  .header-label {
    @include m.pixelated;

    color: #86868b;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 2px;
  }
}

.menu-items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px;
  flex: 1;
  overflow: hidden auto;
  scrollbar-width: thin;
  scrollbar-color: Rgb(255 255 255 / 40%) Rgb(0 0 0 / 25%);
  scroll-behavior: auto !important;

  // Custom retro scrollbar
  &::-webkit-scrollbar {
    display: block !important;
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    border-radius: 3px;
    background: Rgb(0 0 0 / 20%);
  }
  &::-webkit-scrollbar-thumb {
    border: 1px solid Rgb(0 0 0 / 20%);
    border-radius: 3px;
    background: Rgb(255 255 255 / 40%);
    &:hover {
      background: Rgb(255 255 255 / 55%);
    }
  }

  .ball-tooltip-wrapper {
    display: block;
    width: 100%;
    flex-shrink: 0;
  }
}

.ball-option-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: Rgb(255 255 255 / 1%);
  color: white;
  text-align: left;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    @include m.shell-hover-blue;

    transform: none; // Zero movement to prevent sticking
    outline: none;
    
    .ball-sprite-wrapper .ball-icon-mini {
      transform: Scale(1.15); // Scale is safe, it doesn't shift the hit area
    }

    .ball-qty, .ball-action-arrow {
      color: white;
      opacity: 1;
    }
  }
  

  .ball-sprite-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: Rgb(255 255 255 / 3%);
    flex-shrink: 0;

    .ball-icon-mini {
      @include m.pixelated;

      width: 36px;
      height: 36px;
      will-change: transform;
      filter: Drop-Shadow(0 4px 6px Rgb(0 0 0 / 50%));
    }
  }

  .ball-info {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
    
    .ball-name {
      @include m.pixelated;

      display: inline-flex;
      align-items: center;
      color: white;
      font-size: 8px;
      font-weight: 900;
      line-height: 1.4;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .ball-qty {
    @include m.pixelated;

    display: flex;
    align-items: center;
    color: #ffd60a;
    font-size: 7px;
    font-weight: 700;
    margin-right: 4px;
    flex-shrink: 0;
  }

  .ball-action-arrow {
    display: flex;
    align-items: center;
    color: #ffd60a;
    font-size: 8px;
    opacity: 0.3;
    flex-shrink: 0;
  }
}
</style>
>
