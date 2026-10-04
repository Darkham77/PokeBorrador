<script setup lang="ts">
import { computed, onMounted, nextTick, watch, useTemplateRef } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { formatCurrency } from '@/logic/utils/formatters'

const _gameStore = useGameStore()
const modalStore = useModalStore()

const money = computed(() => _gameStore.state.money)
const battleCoins = computed(() => _gameStore.state.battleCoins || 0)
const warCoins = computed(() => _gameStore.state.warCoins || 0)

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const moneyRef = useTemplateRef<HTMLElement>('moneyRef')
const bcRef = useTemplateRef<HTMLElement>('bcRef')
const warRef = useTemplateRef<HTMLElement>('warRef')

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
  void fitText(moneyRef.value, DEFAULT_PILL_FONT_SIZE_PX)
  void fitText(bcRef.value, DEFAULT_PILL_FONT_SIZE_PX)
  void fitText(warRef.value, DEFAULT_PILL_FONT_SIZE_PX)
}

// Observador para cambios de tamaño (mobile resize / orientation)
useResizeObserver(containerRef, () => {
  fitAllPills()
})

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
})
</script>

<template>
  <div
    ref="containerRef"
    class="hud-items"
  >
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
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  width: 65px;
  height: 65px;
  padding: 4px 2px;
  overflow: hidden;

  &.clickable-pill {
    cursor: pointer;
    will-change: background-color;
    &:hover { background: rgba($white, 0.05); }
  }

  .pill-value {
    @include pixelated;

    display: inline-block;
    width: auto;
    max-width: 100%;
    margin: 0;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
  }

  &.money-pill {
    border-color: rgba($green, 0.3);
    .pill-value, .currency-icon-money {
      color: var(--green);
      text-shadow: 0 0 8px rgba($green, 0.4);
    }
  }

  &.bc-pill {
    border-color: rgba($purple, 0.3);
    .pill-value, .currency-icon-bc {
      color: var(--purple);
      text-shadow: 0 0 8px rgba($purple, 0.4);
    }
  }

  &.war-pill {
    border-color: rgb(239 68 68 / 30%);
    .pill-value, .war-icon {
      color: #EF4444;
      text-shadow: 0 0 8px rgb(239 68 68 / 40%);
    }
  }
}

.currency-icon-money {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 18px;
  font-size: 18px;
  line-height: 1;
}

.currency-icon-bc {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 18px;
  font-size: 16px;
  line-height: 1;
}

.war-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 18px;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  font-size: 14px;
  line-height: 1;
}
</style>
