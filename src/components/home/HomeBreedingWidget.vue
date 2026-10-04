<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { useModalStore } from '@/stores/modals'
import EggSprite from '@/components/common/EggSprite.vue'
import type { PokemonEgg } from '@/types/pokemon/pokemon'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

interface Props {
  columns?: 2 | 3
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2
})

const gameStore = useGameStore()
const breedingStore = useBreedingStore()
const modalStore = useModalStore()

onMounted(() => {
  breedingStore.loadDaycare()
})

const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs ?? [])
const warehouseCount = computed(() => breedingStore.warehouseEggs?.length || 0)

function getProgress(egg: PokemonEgg): number {
  if (!egg.totalSteps || egg.totalSteps <= 0) return 0
  return Math.min(100, Math.max(0, ((egg.totalSteps - egg.steps) / egg.totalSteps) * 100))
}

function getStepsLabel(egg: PokemonEgg): string {
  if (egg.totalSteps) {
    const walked = Math.max(0, egg.totalSteps - egg.steps)
    return `${Math.floor(walked).toLocaleString()} / ${egg.totalSteps.toLocaleString()} pasos`
  }
  return `${Math.ceil(egg.steps).toLocaleString()} pasos restantes`
}

function isReady(egg: PokemonEgg): boolean {
  return egg.ready === true || egg.steps <= 0
}

const openDaycare = () => {
  modalStore.open('Daycare')
}

const handleEggClick = (egg: PokemonEgg) => {
  if (isReady(egg)) {
    modalStore.open('HatchAnimation', { egg })
  } else {
    openDaycare()
  }
}
</script>

<template>
  <div
    class="home-breeding-widget"
    :class="{ 'cols-3': props.columns === 3 }"
  >
    <!-- Header -->
    <div class="widget-header-row">
      <div class="header-left">
        <span class="emoji">🥚</span>
        <h3 class="widget-title">
          EN CAMINATA &amp; CRIANZA
        </h3>
      </div>
      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="breeding" />
      </div>
    </div>

    <!-- Active Incubating Eggs Grid -->
    <div
      v-if="eggs.length > 0"
      class="eggs-grid"
      :class="{ 'grid-cols-3': props.columns === 3 }"
    >
      <div
        v-for="egg in eggs"
        :id="`egg-hud-card-${egg.uid}`"
        :key="egg.uid"
        v-gsap-hover="{ scale: 1.02, y: -2 }"
        class="egg-hud-card"
        :class="{ 'is-ready': isReady(egg) }"
        @click="handleEggClick(egg)"
      >
        <!-- Egg Icon -->
        <div class="egg-icon">
          <EggSprite
            :tint="egg.tint"
            size="28"
            class="egg-sprite-img"
          />
          <span
            v-if="egg.isShiny"
            class="shiny-star emoji"
          >✨</span>
        </div>

        <!-- Egg Progress Body -->
        <div class="egg-body">
          <div class="egg-status-row">
            <span
              class="egg-status"
              :class="{ 'status-ready': isReady(egg) }"
            >
              {{ isReady(egg) ? '¡LISTO PARA ECLOSIONAR!' : 'CAMINANDO' }}
            </span>
            <span class="egg-pct">{{ Math.round(getProgress(egg)) }}%</span>
          </div>

          <!-- Progress track -->
          <div class="progress-track">
            <div
              class="progress-fill"
              :class="{ 'fill-ready': isReady(egg) }"
              :style="{ width: `${getProgress(egg)}%` }"
            />
          </div>

          <!-- Steps remaining -->
          <div class="steps-remaining">
            {{ isReady(egg) ? 'Toca para eclosionar' : getStepsLabel(egg) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      v-gsap-hover="{ scale: 1.01, y: -1 }"
      class="empty-breeding-card"
      @click="openDaycare"
    >
      <span class="emoji empty-icon">🧺</span>
      <div class="empty-info">
        <span class="empty-title">No hay huevos en caminata</span>
        <span class="empty-sub">
          {{ warehouseCount > 0 ? `Tienes ${warehouseCount} huevos en el almacén.` : 'Coloca una pareja en la guardería para incubar.' }}
        </span>
      </div>
      <button
        v-gsap-hover
        class="empty-btn"
      >
        IR A GUARDERÍA
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-breeding-widget {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 12px;
  background: Rgb(18 22 34 / 85%);
  box-shadow: 0 4px 16px Rgb(0 0 0 / 40%);
  box-sizing: border-box;

  &.cols-3 {
    max-width: 640px;
  }
}

.widget-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .title-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    line-height: 1;
  }

  .widget-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: 10px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }
}

.header-actions {
  @include widget-header-actions;
}

.eggs-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;

  &.grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));

    @media (width <= 768px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (width <= 400px) {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 400px) {
    grid-template-columns: 1fr;
  }
}

.egg-hud-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: 10px;
  background: Rgb(15 23 42 / 95%);
  box-shadow: 0 4px 12px Rgb(0 0 0 / 45%);
  cursor: pointer;

  @media (width <= 480px) {
    gap: 8px;
    padding: 8px 10px;
  }

  &:hover {
    transform: Translatey(-2px);
    border-color: Rgb(255 255 255 / 20%);
    box-shadow: 0 6px 16px Rgb(0 0 0 / 55%);
  }

  &.is-ready {
    background: Rgb(34 197 94 / 8%);
    border-color: Rgb(34 197 94 / 40%);
    box-shadow: 0 0 12px Rgb(34 197 94 / 20%);

    &:hover {
      border-color: Rgb(34 197 94 / 70%);
      box-shadow: 0 0 16px Rgb(34 197 94 / 35%);
    }
  }
}

.egg-icon {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: Rgb(255 255 255 / 4%);
  flex-shrink: 0;
  box-shadow: inset 0 0 6px Rgb(0 0 0 / 30%);

  @media (width <= 480px) {
    width: 28px;
    height: 28px;
  }

  .egg-sprite-img {
    @include pixelated;

    width: 26px;
    height: 26px;

    @media (width <= 480px) {
      width: 20px;
      height: 20px;
    }
  }

  .shiny-star {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 8px;
  }
}

.egg-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.egg-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.egg-status {
  @include pixelated;

  min-width: 0;
  color: var(--gray, #94a3b8);
  font-size: 7px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 2px;
  padding-bottom: 1px;

  &.status-ready {
    color: #4ade80;
    font-weight: bold;
  }
}

.egg-pct {
  @include pixelated;

  color: var(--yellow, #facc15);
  font-size: 7px;
  line-height: 1.35;
  flex-shrink: 0;
  padding-right: 2px;
}

.progress-track {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: Rgb(255 255 255 / 8%);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: Linear-Gradient(90deg, #38bdf8, #818cf8);
  overflow: hidden;

  &.fill-ready {
    background: Linear-Gradient(90deg, #22c55e, #4ade80);
  }
}

.steps-remaining {
  @include pixelated;

  color: var(--gray, #94a3b8);
  font-size: 6px;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 2px;
  padding-bottom: 1px;
}

.empty-breeding-card {
  @include empty-state-card;

  .empty-btn {
    @include pixelated;

    padding: 4px 8px;
    border: 1px solid Rgb(255 255 255 / 15%);
    border-radius: 4px;
    background: Rgb(255 255 255 / 6%);
    color: var(--yellow, #facc15);
    font-size: 7px;
    cursor: pointer;
  }
}
</style>
