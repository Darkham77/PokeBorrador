<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useGymsStore } from '@/stores/gyms'
import { useModalStore } from '@/stores/modals'
import { useBreedingStore } from '@/stores/breeding'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { formatCurrency } from '@/logic/utils/formatters'
import { getItemById, getItemByName } from '@/data/items'
import EggSprite from '@/components/common/EggSprite.vue'
import { resolveNormalizedName } from '@/stores/inventoryHelpers'

const _gameStore = useGameStore()
const _uiStore = useUIStore()
const gymsStore = useGymsStore()
const modalStore = useModalStore()
const breedingStore = useBreedingStore()

const money = computed(() => _gameStore.state.money)
const battleCoins = computed(() => _gameStore.state.battleCoins || 0)

const moneyRef = ref<HTMLElement | null>(null)
const bcRef = ref<HTMLElement | null>(null)
const badgeRef = ref<HTMLElement | null>(null)
const ballRef = ref<HTMLElement | null>(null)
const eggRef = ref<HTMLElement | null>(null)
const materialsRef = ref<HTMLElement | null>(null)

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
 * Detalle dinámico de huevos en incubación y listos en la guardería
 */
const eggsBreakdown = computed(() => {
  const incubating = _gameStore.state.eggs || []
  const warehouse = breedingStore.warehouseEggs || []
  
  const lines: string[] = []
  
  if (incubating.length === 0 && warehouse.length === 0) {
    return 'No tienes huevos en incubación ni en la guardería.\n¡Haz clic para ir a la Guardería!'
  }
  
  if (incubating.length > 0) {
    lines.push(`Incubando: ${incubating.length} ${incubating.length === 1 ? 'huevo' : 'huevos'}`)
    incubating.forEach((egg, idx) => {
      if (egg.ready || egg.steps <= 0) {
        lines.push(`• Huevo ${idx + 1}: ¡Listo para nacer!🐣`)
      } else {
        lines.push(`• Huevo ${idx + 1}: ${Math.ceil(egg.steps).toLocaleString()} pasos`)
      }
    })
  } else {
    lines.push('No hay huevos en incubación.')
  }
  
  lines.push('') // Separador de secciones
  
  if (warehouse.length > 0) {
    lines.push(`En Guardería: ${warehouse.length} ${warehouse.length === 1 ? 'huevo sin reclamar' : 'huevos sin reclamar'}🥚`)
  } else {
    lines.push('No hay huevos pendientes en la Guardería.')
  }
  
  lines.push('')
  lines.push('Haz clic para abrir la Guardería.')
  
  return lines.join('\n')
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
      const found = getItemByName(name) || getItemById(name)
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
 * Materiales de Tier 0, 1 y 2 en la mochila
 */
const materialItems = computed(() => {
  const inventory = _gameStore.state.inventory || {}
  const list: { name: string; qty: number; tier: number; icon: string }[] = []
  
  for (const [key, qty] of Object.entries(inventory)) {
    const count = qty as number
    if (count <= 0) continue
    const officialName = resolveNormalizedName(key)
    const found = getItemByName(officialName) || getItemById(officialName)
    if (found) {
      let tier: number | null = null
      if (found.cat === 'raw_material' || found.sprite?.includes('crafting/tier0/')) {
        tier = 0
      } else if (found.cat === 'refined_material' || found.sprite?.includes('crafting/tier1/')) {
        tier = 1
      } else if (found.cat === 'component' || found.sprite?.includes('crafting/tier2/')) {
        tier = 2
      }
      
      if (tier !== null) {
        list.push({
          name: found.name,
          qty: count,
          tier,
          icon: found.icon || '📦'
        })
      }
    }
  }
  return list
})

const totalMaterials = computed(() => {
  return materialItems.value.reduce((sum, item) => sum + item.qty, 0)
})

const materialsBreakdown = computed(() => {
  const t0 = materialItems.value.filter(i => i.tier === 0)
  const t1 = materialItems.value.filter(i => i.tier === 1)
  const t2 = materialItems.value.filter(i => i.tier === 2)
  
  if (materialItems.value.length === 0) {
    return 'No tienes materiales en la mochila.\n\nExplora o excava para recolectar.'
  }
  
  const lines: string[] = []
  
  if (t0.length > 0) {
    lines.push('Materia Prima:')
    t0.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
  }
  
  if (t1.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('Material Refinado:')
    t1.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
  }
  
  if (t2.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push('Componentes:')
    t2.forEach(i => lines.push(`• ${i.icon} ${i.name}: ${i.qty}`))
  }
  
  return lines.join('\n')
})

// Global offscreen canvas for measuring text dimensions without triggering layout reflows
let measureCanvas: HTMLCanvasElement | null = null;

const getTextWidth = (text: string, fontSpec: string): number => {
  if (!measureCanvas && typeof document !== 'undefined') {
    measureCanvas = document.createElement('canvas');
  }
  if (!measureCanvas) return 0;
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = fontSpec;
  return ctx.measureText(text).width;
};

/**
 * Ajusta el tamaño de fuente de un elemento para que quepa en su contenedor
 * utilizando mediciones en CPU sin forzar recalculaciones geométricas del DOM.
 */
const fitText = async (el: HTMLElement | null, baseSize: number) => {
  if (!el) return
  await nextTick()
  
  const parent = el.parentElement
  if (!parent) return
  
  // Margen de seguridad para el icono y padding (pills tienen ~65px total)
  const maxW = parent.clientWidth - 8 
  
  const text = el.textContent || el.innerText || '';
  const fontFamily = '"Pokemon FireRed LeafGreen", monospace';
  let size = baseSize;
  
  // Realizamos las mediciones en CPU (Canvas virtual)
  let attempts = 0
  while (size > 4 && attempts < 20) {
    const fontSpec = `bold ${size}px ${fontFamily}`;
    const width = getTextWidth(text, fontSpec);
    if (width <= maxW) {
      break;
    }
    size -= 1;
    attempts++;
  }
  
  // Realizamos un único cambio en el DOM al finalizar
  el.style.fontSize = `${size}px`
}

const fitAllPills = () => {
  fitText(moneyRef.value, 14)
  fitText(bcRef.value, 14)
  fitText(badgeRef.value, 14)
  fitText(ballRef.value, 14)
  fitText(eggRef.value, 14)
  fitText(materialsRef.value, 14)
}

// Observador para cambios de tamaño (mobile resize / orientation)
let resizeObserver: ResizeObserver | null = null

// Observadores para disparar el ajuste cuando cambien los datos
watch([money, battleCoins, medals, balls, eggCount, totalMaterials], () => {
  fitAllPills()
}, { deep: true })

onMounted(async () => {
  // Cargar estado inicial de la guardería para sincronizar el almacén de huevos
  breedingStore.loadDaycare()

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

    <!-- MEDALLAS -->
    <PVTooltip
      title="MEDALLAS"
      :description="medalsBreakdown"
      position="bottom"
    >
      <div
        class="hud-pill badge-pill clickable-pill"
        @click.stop="_uiStore.activeTab = 'gyms'; _uiStore.openHudGroup = null"
      >
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
      <div
        class="hud-pill ball-pill clickable-pill"
        @click.stop="modalStore.open('Shop', { initialCategory: 'pokeballs' })"
      >
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
      :description="eggsBreakdown"
      position="bottom"
    >
      <div
        id="hud-egg-container"
        class="hud-pill egg-pill"
        @click.stop="modalStore.open('Daycare')"
      >
        <EggSprite size="26" />
        <span
          id="egg-count"
          ref="eggRef"
          class="pill-value"
        >{{ formatCurrency(eggCount) }}</span>
      </div>
    </PVTooltip>

    <!-- MATERIALES -->
    <PVTooltip
      title="⚡ MATERIALES"
      :description="materialsBreakdown"
      position="bottom"
    >
      <div
        id="hud-materials-container"
        class="hud-pill materials-pill clickable-pill"
        @click.stop="modalStore.open('Inventory', { initialCategory: 'raw_material' })"
      >
        <span class="materials-icon">🎒</span>
        <span
          id="materials-count"
          ref="materialsRef"
          class="pill-value"
        >{{ formatCurrency(totalMaterials) }}</span>
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

  &.materials-pill {
    border-color: Rgba($gray, 0.3);
    .pill-value, .materials-icon {
      color: var(--silver);
      text-shadow: 0 0 8px Rgba(#94a3b8, 0.4);
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

.materials-icon {
  font-size: 18px;
  margin-bottom: 2px;
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
