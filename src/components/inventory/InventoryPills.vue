<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { formatCurrency } from '@/logic/utils/formatters'

const _gameStore = useGameStore()
const modalStore = useModalStore()

const money = computed(() => _gameStore.state.money)
const battleCoins = computed(() => _gameStore.state.battleCoins || 0)
const warCoins = computed(() => _gameStore.state.warCoins || 0)

const moneyRef = ref<HTMLElement | null>(null)
const bcRef = ref<HTMLElement | null>(null)
const warRef = ref<HTMLElement | null>(null)

const PILL_PADDING_SAFETY_PX = 8
const MIN_FONT_SIZE_PX = 4
const MAX_FIT_ATTEMPTS = 20
const DEFAULT_PILL_FONT_SIZE_PX = 14

/**
 * Ajusta dinámicamente el tamaño de fuente para que quepa exactamente
 * en el ancho del contenedor sin desbordarse.
 */
const fitText = async (el: HTMLElement | null, baseSize: number) => {
  if (!el) return
  await nextTick()
  
  const parent = el.parentElement
  if (!parent) return
  
  const maxW = parent.clientWidth - PILL_PADDING_SAFETY_PX 
  if (maxW <= 0) return
  
  let size = baseSize
  el.style.fontSize = `${size}px`
  
  let attempts = 0
  while (size > MIN_FONT_SIZE_PX && attempts < MAX_FIT_ATTEMPTS && el.scrollWidth > maxW) {
    size -= 1
    el.style.fontSize = `${size}px`
    attempts++
  }
}

const fitAllPills = () => {
  fitText(moneyRef.value, DEFAULT_PILL_FONT_SIZE_PX)
  fitText(bcRef.value, DEFAULT_PILL_FONT_SIZE_PX)
  fitText(warRef.value, DEFAULT_PILL_FONT_SIZE_PX)
}

// Observador para cambios de tamaño (mobile resize / orientation)
let resizeObserver: ResizeObserver | null = null

// Observadores para disparar el ajuste cuando cambien los datos
watch([money, battleCoins, warCoins], () => {
  fitAllPills()
}, { deep: true })

onMounted(async () => {
  // Cargar estado inicial de la guardería para sincronizar el almacén de huevos
  const { useBreedingStore } = await import('@/stores/breeding')
  useBreedingStore().loadDaycare()

  await nextTick()
  
  // Ejecución inicial
  fitAllPills()

  // Re-evaluar una vez que la fuente física esté totalmente lista
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.ready.then(() => {
      fitAllPills()
    })
  }

  // Configurar observer en el contenedor HUD
  if (moneyRef.value?.closest('.hud-items')) {
    resizeObserver = new ResizeObserver(() => {
      fitAllPills()
    })
    resizeObserver.observe(moneyRef.value.closest('.hud-items')!)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div class="hud-items">
    <!-- DINERO -->
    <PVTooltip
      title="POKÉ-PESOS (₱)"
      :description="`Saldo: ₱${(money || 0).toLocaleString()}. Moneda principal obtenida en combates y venta de objetos.`"
      position="bottom"
    >
      <div
        class="hud-pill money-pill clickable-pill"
        @click.stop="modalStore.open('Shop', { initialCategory: 'todos' })"
      >
        <span class="currency-icon-money">₱</span>
        <span
          id="hud-money"
          ref="moneyRef"
          class="pill-value"
        >{{ formatCurrency(money) }}</span>
      </div>
    </PVTooltip>

    <!-- BC -->
    <PVTooltip
      title="BATTLE COINS (BC)"
      :description="`Saldo: ${(battleCoins || 0).toLocaleString()} BC. Moneda de élite obtenida en eventos y misiones especiales.`"
      position="bottom"
    >
      <div
        class="hud-pill bc-pill clickable-pill"
        @click.stop="modalStore.open('BCShop')"
      >
        <i class="fas fa-coins currency-icon-bc" />
        <span
          id="hud-bc"
          ref="bcRef"
          class="pill-value"
        >{{ formatCurrency(battleCoins) }}</span>
      </div>
    </PVTooltip>

    <!-- MONEDAS DE GUERRA -->
    <PVTooltip
      title="MONEDAS DE GUERRA"
      :description="`Saldo: ${(warCoins || 0).toLocaleString()} Monedas de Guerra. Moneda especial de batallas de facciones y dominio territorial.`"
      position="bottom"
    >
      <div
        class="hud-pill war-pill clickable-pill"
        @click.stop="modalStore.open('WarShop')"
      >
        <span class="emoji war-icon">⚔️</span>
        <span
          id="hud-war-coins"
          ref="warRef"
          class="pill-value"
        >{{ formatCurrency(warCoins) }}</span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
.hud-items {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-pill {
  width: 65px;
  height: 65px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 2px;
  overflow: hidden;
  gap: 4px;

  &.clickable-pill {
    cursor: pointer;
    will-change: background-color;
    &:hover { background: Rgba($white, 0.05); }
  }

  .pill-value {
    @include pixelated;
    text-transform: uppercase;
    text-align: center;
    white-space: nowrap;
    display: inline-block;
    width: auto;
    max-width: 100%;
    margin: 0;
  }

  &.money-pill {
    border-color: Rgba($green, 0.3);
    .pill-value, .currency-icon-money {
      color: var(--green);
      text-shadow: 0 0 8px Rgba($green, 0.4);
    }
  }

  &.bc-pill {
    border-color: Rgba($purple, 0.3);
    .pill-value, .currency-icon-bc {
      color: var(--purple);
      text-shadow: 0 0 8px Rgba($purple, 0.4);
    }
  }

  &.badge-pill {
    border-color: Rgba($yellow, 0.3);
    .pill-value, .fa-medal {
      color: var(--yellow);
      text-shadow: 0 0 8px Rgba($yellow, 0.4);
    }
  }

  &.ball-pill {
    border-color: Rgba($red, 0.3);
    .pill-value {
      color: var(--red);
      text-shadow: 0 0 8px Rgba($red, 0.4);
    }
  }

  &.egg-pill {
    border-color: Rgba($coin-gold, 0.3);
    cursor: pointer;
    &:hover { background: Rgba($white, 0.05); }
    .pill-value {
      color: var(--coin-gold);
      text-shadow: 0 0 8px Rgba($coin-gold, 0.4);
    }
  }

  &.war-pill {
    border-color: Rgba(239, 68, 68, 0.3);
    .pill-value, .war-icon {
      color: #EF4444;
      text-shadow: 0 0 8px Rgba(239, 68, 68, 0.4);
    }
  }
}

.currency-icon-money {
  font-size: 18px;
  line-height: 1;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-icon-bc {
  font-size: 16px;
  line-height: 1;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.war-icon {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  font-size: 14px;
  line-height: 1;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-icon-wrap {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
  filter: Drop-Shadow(0 0 4px Rgba($red, 0.4));
  will-change: filter;
  
  img {
    margin-top: -2px; // Ajuste óptico para centrar la bola
  }
}
</style>
