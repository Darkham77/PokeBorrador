<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useGymsStore } from '@/stores/gyms'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { SHOP_ITEMS } from '@/data/items'

const _gameStore = useGameStore()
const _uiStore = useUIStore()
const gymsStore = useGymsStore()

const money = computed(() => _gameStore.state.money)
const battleCoins = computed(() => _gameStore.state.battleCoins || 0)

const moneyRef = ref<HTMLElement | null>(null)
const bcRef = ref<HTMLElement | null>(null)
const badgeRef = ref<HTMLElement | null>(null)
const ballRef = ref<HTMLElement | null>(null)
const eggRef = ref<HTMLElement | null>(null)

const medals = computed(() => _gameStore.state.badges || 0)
const eggCount = computed(() => (_gameStore.state.eggs || []).length)

/**
 * Detalle dinámico de medallas obtenidas para el tooltip del HUD
 */
const medalsBreakdown = computed(() => {
  const defeated = _gameStore.state.defeatedGyms || []
  if (defeated.length === 0) {
    return 'No has ganado ninguna medalla todavía.\n¡Desafía a los Líderes de Gimnasio para obtenerlas!'
  }
  
  const earnedList = gymsStore.gyms
    .filter(g => defeated.includes(g.id))
    .map(g => `${g.badge} ${g.badgeName} (${g.leader})`)
    
  return `Medallas obtenidas (${defeated.length}/8):\n${earnedList.map(item => `• ${item}`).join('\n')}\n\nDesbloquean nuevas zonas y Pokémon.`
})

/**
 * Lista de pokébolas detectadas en el inventario
 */
const ballsList = computed(() => {
  const inventory = _gameStore.state.inventory || {}
  return Object.entries(inventory)
    .map(([name, qty]) => {
      const count = qty as number
      if (count <= 0) return null
      const found = SHOP_ITEMS.find(i => i.name === name)
      if (found?.cat === 'pokeballs' || name.toLowerCase().includes('ball')) {
        return { name, qty: count }
      }
      return null
    })
    .filter(Boolean) as { name: string, qty: number }[]
})

/**
 * Total de pokébolas (suma de todos los tipos)
 */
const balls = computed(() => ballsList.value.reduce((acc, i) => acc + i.qty, 0))

/**
 * Breakdown de pokébolas por tipo para el tooltip
 */
const ballsBreakdown = computed(() => {
  if (ballsList.value.length === 0) return 'No tienes Poké Balls.'
  
  return ballsList.value
    .map(i => `• ${i.name}: ${i.qty}`)
    .join('\n')
})

/**
 * Ajusta el tamaño de fuente de un elemento para que quepa en su contenedor
 */
const fitText = async (el: HTMLElement | null, baseSize: number) => {
  if (!el) return
  await nextTick()
  
  const parent = el.parentElement
  if (!parent) return
  
  // Margen de seguridad para el icono y padding (pills tienen ~65px total)
  // En pantallas chicas el pill puede ser más angosto por flex/zoom
  const maxW = parent.clientWidth - 8 
  
  let size = baseSize
  el.style.fontSize = `${size}px`
  
  // Aseguramos que el elemento pueda medir su scrollWidth sin restricciones temporales
  const prevMaxWidth = el.style.maxWidth
  el.style.maxWidth = 'none'
  
  // Iteramos hasta que quepa o lleguemos al mínimo legible
  let attempts = 0
  while (el.scrollWidth > maxW && size > 4 && attempts < 20) {
    size -= 0.5
    el.style.fontSize = `${size}px`
    attempts++
  }
  
  el.style.maxWidth = prevMaxWidth
}

// Observador para cambios de tamaño (mobile resize / orientation)
let resizeObserver: ResizeObserver | null = null

// Observadores para disparar el ajuste cuando cambien los datos
watch([money, battleCoins, medals, balls, eggCount], () => {
  fitText(moneyRef.value, 14)
  fitText(bcRef.value, 14)
  fitText(badgeRef.value, 14)
  fitText(ballRef.value, 14)
  fitText(eggRef.value, 14)
}, { deep: true })

onMounted(async () => {
  await nextTick()
  
  // Ejecución inicial
  fitText(moneyRef.value, 14)
  fitText(bcRef.value, 14)
  fitText(badgeRef.value, 14)
  fitText(ballRef.value, 14)
  fitText(eggRef.value, 14)

  // Configurar observer en el contenedor HUD
  if (moneyRef.value?.closest('.hud-items')) {
    resizeObserver = new ResizeObserver(() => {
      fitText(moneyRef.value, 14)
      fitText(bcRef.value, 14)
      fitText(badgeRef.value, 14)
      fitText(ballRef.value, 14)
      fitText(eggRef.value, 14)
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
      <div class="hud-pill money-pill">
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
      <div class="hud-pill bc-pill">
        <i class="fas fa-coins currency-icon-bc" />
        <span
          id="hud-bc"
          ref="bcRef"
          class="pill-value"
        >{{ formatCurrency(battleCoins) }}</span>
      </div>
    </PVTooltip>

    <!-- MEDALLAS -->
    <PVTooltip
      title="MEDALLAS"
      :description="medalsBreakdown"
      position="bottom"
    >
      <div class="hud-pill badge-pill">
        <i class="fas fa-medal" />
        <span
          id="badge-count"
          ref="badgeRef"
          class="pill-value"
        >{{ formatCurrency(medals) }}</span>
      </div>
    </PVTooltip>

    <!-- BALLS -->
    <PVTooltip
      title="⚡ POKÉ BALLS"
      :description="`Total: ${balls}\n\n${ballsBreakdown}`"
      position="bottom"
    >
      <div class="hud-pill ball-pill">
        <div class="ball-icon-wrap">
          <img
            src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'><circle cx='20' cy='20' r='19' fill='%23222' stroke='%23111' stroke-width='1.5'/><path d='M1 20 A19 19 0 0 1 39 20 Z' fill='%23e63030'/><path d='M1 20 A19 19 0 0 0 39 20 Z' fill='%23f5f5f5'/><rect x='1' y='18' width='38' height='4' fill='%23111'/><circle cx='20' cy='20' r='6' fill='%23111'/><circle cx='20' cy='20' r='4' fill='%23f5f5f5'/><circle cx='18' cy='18' r='1.2' fill='%23ffffff' opacity='0.7'/></svg>"
            width="24"
            height="24"
            data-ignore="[PureVue-Ignore]"
            @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
          >
        </div>
        <span
          id="ball-count"
          ref="ballRef"
          class="pill-value"
        >{{ formatCurrency(balls) }}</span>
      </div>
    </PVTooltip>

    <!-- HUEVOS -->
    <PVTooltip
      title="⚡ HUEVOS POKÉMON"
      description="Huevos en proceso de incubación. Haz clic para ver detalles."
      position="bottom"
    >
      <div
        id="hud-egg-container"
        class="hud-pill egg-pill"
        @click.stop="_uiStore.toggleProfile()"
      >
        <span>🥚</span>
        <span
          id="egg-count"
          ref="eggRef"
          class="pill-value"
        >{{ formatCurrency(eggCount) }}</span>
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
  gap: 2px;

  .pill-value {
    @include pixelated;
    text-transform: uppercase;
    text-align: center;
    white-space: nowrap;
    display: inline-block;
    width: auto;
    max-width: 100%;
    line-height: 1;
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
}

.currency-icon-money {
  font-size: 18px;
  margin-bottom: 0px;
}

.currency-icon-bc {
  font-size: 16px;
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
