<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'

const _gameStore = useGameStore() as any
const _uiStore = useUIStore() as any
const gs = computed(() => _gameStore.state)
const money = computed(() => _gameStore.state.money)

// Refs para el ajuste dinámico
const moneyRef = ref<HTMLElement | null>(null)

/**
 * Ajusta el tamaño de fuente de un elemento para que quepa en su contenedor
 */
const fitText = async (el: HTMLElement | null, maxW: number, baseSize: number) => {
  if (!el) return
  await nextTick()
  let size = baseSize
  el.style.fontSize = `${size}px`
  while (el.scrollWidth > maxW && size > 5) {
    size -= 0.5
    el.style.fontSize = `${size}px`
  }
}

// Observadores para disparar el ajuste cuando cambien los datos
watch([money], async () => {
  await nextTick()
  fitText(moneyRef.value, 60, 14)
}, { deep: true })

onMounted(async () => {
  await nextTick()
  fitText(moneyRef.value, 60, 14)
})
</script>

<template>
  <div class="hud-items">
    <!-- DINERO -->
    <PVTooltip
      title="POKÉ-PESOS (₱)"
      description="Moneda principal obtenida en combates y venta de objetos."
      position="bottom"
    >
      <div class="hud-pill money-pill">
        <span class="currency-icon-money">₱</span>
        <span
          id="hud-money"
          ref="moneyRef"
          class="pill-value"
        >{{ (money || 0).toLocaleString() }}</span>
      </div>
    </PVTooltip>

    <!-- BC -->
    <PVTooltip
      title="BATTLE COINS (BC)"
      description="Moneda de élite obtenida en eventos y misiones especiales."
      position="bottom"
    >
      <div class="hud-pill bc-pill">
        <i class="fas fa-coins currency-icon-bc" />
        <span
          id="hud-bc"
          class="pill-value"
        >{{ (gs.battleCoins || 0).toLocaleString() }}</span>
      </div>
    </PVTooltip>

    <!-- MEDALLAS -->
    <PVTooltip
      title="MEDALLAS"
      description="Progreso de tu aventura. Desbloquean nuevas zonas y Pokémon."
      position="bottom"
    >
      <div class="hud-pill badge-pill">
        <i class="fas fa-medal" />
        <span
          id="badge-count"
          class="pill-value"
        >{{ gs.badges }}</span>
      </div>
    </PVTooltip>

    <!-- BALLS -->
    <PVTooltip
      title="POKÉ BALLS"
      description="Cantidad total de Poké Balls disponibles en tu mochila."
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
          class="pill-value"
        >{{ gs.balls }}</span>
      </div>
    </PVTooltip>

    <!-- HUEVOS -->
    <PVTooltip
      title="HUEVOS POKÉMON"
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
          class="pill-value"
        >{{ (gs.eggs || []).length }}</span>
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
    .pill-value {
      color: var(--green);
      margin-top: 2px;
      letter-spacing: -0.2px;
    }
  }
}

.currency-icon-money {
  font-size: 18px;
  color: var(--green);
  margin-bottom: 0px;
}

.ball-icon-wrap {
  height: 28px;
  display: flex;
  align-items: center;
}
</style>
