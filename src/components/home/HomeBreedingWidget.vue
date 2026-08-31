<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { useModalStore } from '@/stores/modals'
import EggSprite from '@/components/common/EggSprite.vue'
import type { PokemonEgg } from '@/types/pokemon/pokemon'

const gameStore = useGameStore()
const breedingStore = useBreedingStore()
const modalStore = useModalStore()

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
  <div class="home-breeding-widget">
    <!-- Header -->
    <div class="widget-header-row">
      <div class="header-left">
        <span class="title-icon">🥚</span>
        <h3 class="widget-title">
          EN CAMINATA & CRIANZA
        </h3>
      </div>
      <div class="header-actions">
        <button
          id="home-daycare-btn"
          class="card-action-btn"
          @click="openDaycare"
        >
          <span class="btn-icon">🏡</span>
          GUARDERÍA
        </button>
      </div>
    </div>

    <!-- Active Incubating Eggs Grid -->
    <div
      v-if="eggs.length > 0"
      class="eggs-grid"
    >
      <div
        v-for="(egg, index) in eggs"
        :key="egg.uid || index"
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
            class="shiny-star emoji-inline"
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
      class="empty-breeding-card"
      @click="openDaycare"
    >
      <span class="empty-icon">🧺</span>
      <div class="empty-info">
        <span class="empty-title">No hay huevos en caminata</span>
        <span class="empty-sub">
          {{ warehouseCount > 0 ? `Tienes ${warehouseCount} huevos en el almacén.` : 'Coloca una pareja en la guardería para incubar.' }}
        </span>
      </div>
      <button class="empty-btn">
        IR A GUARDERÍA
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-breeding-widget {
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
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
    font-size: 16px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .widget-title {
    @include pixelated;
    font-size: 10px;
    color: var(--yellow, #facc15);
    margin: 0;
    line-height: 1;
    letter-spacing: 1px;
  }
}

.header-actions {
  display: flex;
  gap: 6px;
}

.missions-badge-btn {
  @include pixelated;
  font-size: 7px;
  padding: 4px 8px;
  background: Rgba(250, 204, 21, 0.15);
  border: 1px solid Rgba(250, 204, 21, 0.4);
  border-radius: 4px;
  color: var(--yellow, #facc15);
  cursor: pointer;

  &:hover {
    background: Rgba(250, 204, 21, 0.25);
  }
}

.card-action-btn {
  @include pixelated;
  font-size: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: var(--white, #ffffff);
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
  white-space: nowrap;
  letter-spacing: 0.5px;

  .btn-icon {
    font-size: 12px;
    line-height: 1;
  }

  &:hover:not(:disabled) {
    background: Rgba(255, 255, 255, 0.12);
    border-color: var(--yellow, #facc15);
    color: var(--yellow, #facc15);
    box-shadow: 0 0 10px Rgba(250, 204, 21, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.eggs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.egg-hud-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: Translatey(-2px);
    border-color: Rgba(255, 255, 255, 0.2);
    box-shadow: 0 6px 16px Rgba(0, 0, 0, 0.55);
  }

  &.is-ready {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.08);
    box-shadow: 0 0 12px Rgba(34, 197, 94, 0.2);

    &:hover {
      border-color: Rgba(34, 197, 94, 0.7);
      box-shadow: 0 0 16px Rgba(34, 197, 94, 0.35);
    }
  }
}

.egg-icon {
  position: relative;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: inset 0 0 6px Rgba(0, 0, 0, 0.3);

  .egg-sprite-img {
    width: 26px;
    height: 26px;
    @include pixelated;
  }

  .shiny-star {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 8px;
  }
}

.egg-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.egg-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.egg-status {
  @include pixelated;
  font-size: 7px;
  color: var(--gray, #94a3b8);

  &.status-ready {
    color: #4ade80;
    font-weight: bold;
  }
}

.egg-pct {
  @include pixelated;
  font-size: 7px;
  color: var(--yellow, #facc15);
}

.progress-track {
  width: 100%;
  height: 4px;
  background: Rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 2px;
  transition: width 0.3s ease;

  &.fill-ready {
    background: linear-gradient(90deg, #22c55e, #4ade80);
  }
}

.steps-remaining {
  @include pixelated;
  font-size: 6px;
  color: var(--gray, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-breeding-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: Rgba(0, 0, 0, 0.25);
  border: 1px dashed Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    border-color: Rgba(255, 255, 255, 0.2);
    background: Rgba(0, 0, 0, 0.35);
  }

  .empty-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .empty-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .empty-title {
    font-size: 11px;
    font-weight: bold;
    color: #ffffff;
  }

  .empty-sub {
    font-size: 9px;
    color: var(--gray, #94a3b8);
  }

  .empty-btn {
    @include pixelated;
    font-size: 7px;
    padding: 4px 8px;
    background: Rgba(255, 255, 255, 0.06);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: var(--yellow, #facc15);
    cursor: pointer;
  }
}
</style>
