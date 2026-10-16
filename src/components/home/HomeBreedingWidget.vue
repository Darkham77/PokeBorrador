<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGameStore } from '@/stores/game';
import { useBreedingStore } from '@/stores/breeding';
import { useModalStore } from '@/stores/modals';
import EggSprite from '@/components/common/EggSprite.vue';
import type { PokemonEgg } from '@/types/pokemon/pokemon';
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue';

interface Props {
  columns?: 2 | 3;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2
});

const gameStore = useGameStore();
const breedingStore = useBreedingStore();
const modalStore = useModalStore();

onMounted(() => {
  breedingStore.loadDaycare();
});

const eggs = computed<PokemonEgg[]>(() => gameStore.state.eggs ?? []);
const warehouseCount = computed(() => breedingStore.warehouseEggs?.length || 0);

function getProgress(egg: PokemonEgg): number {
  if (!egg.totalSteps || egg.totalSteps <= 0) return 0;
  return Math.min(100, Math.max(0, ((egg.totalSteps - egg.steps) / egg.totalSteps) * 100));
}

function getStepsLabel(egg: PokemonEgg): string {
  if (egg.totalSteps) {
    const walked = Math.max(0, egg.totalSteps - egg.steps);
    return `${Math.floor(walked).toLocaleString()} / ${egg.totalSteps.toLocaleString()} pasos`;
  }
  return `${Math.ceil(egg.steps).toLocaleString()} pasos restantes`;
}

function isReady(egg: PokemonEgg): boolean {
  return egg.ready === true || egg.steps <= 0;
}

const openDaycare = () => {
  modalStore.open('Daycare');
};

const handleEggClick = (egg: PokemonEgg) => {
  if (isReady(egg)) {
    modalStore.open('HatchAnimation', { egg });
  } else {
    openDaycare();
  }
};

const isThreeColumns = computed(() => props.columns === 3);
</script>

<template>
  <div class="home-breeding-widget" :class="{ 'cols-3': isThreeColumns }">
    <!-- Header -->
    <div class="widget-header-row">
      <div class="header-left">
        <span class="emoji">🥚</span>
        <h3 class="widget-title">EN CAMINATA &amp; CRIANZA</h3>
      </div>
      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="breeding" />
      </div>
    </div>

    <!-- Active Incubating Eggs Grid -->
    <div v-if="eggs.length > 0" class="eggs-grid" :class="{ 'grid-cols-3': isThreeColumns }">
      <div
        v-for="egg in eggs"
        :id="`egg-hud-card-${egg.uid}`"
        :key="egg.uid"
        v-gsap-hover="'widget'"
        class="egg-hud-card"
        :class="{ 'is-ready': isReady(egg) }"
        role="button"
        tabindex="0"
        @click="handleEggClick(egg)"
      >
        <!-- Egg Icon -->
        <div class="egg-icon">
          <EggSprite :tint="egg.tint" size="28" class="egg-sprite-img" />
          <span v-if="egg.isShiny" class="shiny-star emoji">✨</span>
        </div>

        <!-- Egg Progress Body -->
        <div class="egg-body">
          <div class="egg-status-row">
            <span class="egg-status" :class="{ 'status-ready': isReady(egg) }">
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
      id="home-breeding-widget-div-opendaycare"
      v-gsap-hover="{ scale: 1.01, y: -1 }"
      class="empty-breeding-card"
      role="button"
      tabindex="0"
      @click="openDaycare"
    >
      <span class="emoji empty-icon">🧺</span>
      <div class="empty-info">
        <span class="empty-title">No hay huevos en caminata</span>
        <span class="empty-sub">
          {{
            warehouseCount > 0
              ? `Tienes ${warehouseCount} huevos en el almacén.`
              : 'Coloca una pareja en la guardería para incubar.'
          }}
        </span>
      </div>
      <button id="home-breeding-widget-btn-ir-a-guarder-a" v-gsap-hover class="empty-btn">
        IR A GUARDERÍA
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;

.home-breeding-widget {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-xl;
  background: Rgb(18 22 34 / 85%);
  box-shadow: $shadow-md;
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
  gap: $spacing-sm;

  .title-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: var(--font-16);
    line-height: 1;
  }

  .widget-title {
    @include pixelated;

    margin: 0;
    color: var(--yellow, #facc15);
    font-size: var(--font-10);
    line-height: 1.35;
    letter-spacing: 0.5px;
  }
}

.header-actions {
  @include widget-header-actions;
}

.eggs-grid {
  display: grid;
  gap: $spacing-sm;
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
  gap: $spacing-md-alt;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 8%);
  border-radius: $radius-lg-alt;
  background: Rgb(15 23 42 / 95%);
  box-shadow: var(--shadow-card);
  cursor: pointer;

  @media (width <= 480px) {
    gap: $spacing-sm;
    padding: 8px 10px;
  }

  &:hover {
    transform: Translatey(-2px);
    border-color: Rgb(255 255 255 / 20%);
    box-shadow: var(--shadow-card);
  }

  &.is-ready {
    background: Rgb(34 197 94 / 8%);
    border-color: Rgb(34 197 94 / 40%);
    box-shadow: var(--shadow-glow-amber);

    &:hover {
      border-color: Rgb(34 197 94 / 70%);
      box-shadow: var(--shadow-glow-amber-lg);
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
  border-radius: $radius-lg;
  background: Rgb(255 255 255 / 4%);
  flex-shrink: 0;
  box-shadow: var(--shadow-card);

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
    font-size: var(--font-8);
  }
}

.egg-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs-alt;
  min-width: 0;
  flex: 1;
}

.egg-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-xs;
  min-width: 0;
}

.egg-status {
  @include pixelated;

  min-width: 0;
  color: var(--gray, var(--slate-400));
  font-size: var(--font-7);
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 2px;
  padding-bottom: 1px;

  &.status-ready {
    color: var(--green-light);
    font-weight: bold;
  }
}

.egg-pct {
  @include pixelated;

  color: var(--yellow, #facc15);
  font-size: var(--font-7);
  line-height: 1.35;
  flex-shrink: 0;
  padding-right: 2px;
}

.progress-track {
  width: 100%;
  height: 4px;
  border-radius: $radius-xs;
  background: Rgb(255 255 255 / 8%);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: $radius-xs;
  background: Linear-Gradient(90deg, var(--sky), var(--blue-300));
  overflow: hidden;

  &.fill-ready {
    background: Linear-Gradient(90deg, var(--emerald), var(--green-light));
  }
}

.steps-remaining {
  @include pixelated;

  color: var(--gray, var(--slate-400));
  font-size: var(--font-6);
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
    border-radius: $radius-sm;
    background: Rgb(255 255 255 / 6%);
    color: var(--yellow, #facc15);
    font-size: var(--font-7);
    cursor: pointer;
  }
}
</style>
