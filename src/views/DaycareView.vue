<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useBreedingStore } from '@/stores/breeding';
import DaycarePicker from '@/components/breeding/DaycarePicker.vue';
import DaycareMissions from '@/components/breeding/DaycareMissions.vue';
import EggWarehouse from '@/components/breeding/EggWarehouse.vue';
import BreedingSummary from '@/components/breeding/BreedingSummary.vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

import type { Pokemon } from '@/types/pokemon';

const breedingStore = useBreedingStore();

const activeTab = ref('breeding'); // breeding | missions | eggs
const isPickerOpen = ref(false);
const activeSlotIndex = ref(0);

const openPicker = (slotIdx: number) => {
  activeSlotIndex.value = slotIdx;
  isPickerOpen.value = true;
};

const handleSelect = (pokemon: Pokemon) => {
  breedingStore.deposit(pokemon, activeSlotIndex.value);
  isPickerOpen.value = false;
};

onMounted(() => {
  breedingStore.loadDaycare();
  breedingStore.checkDailyReset();
});

const getGenderClass = (gender: string | null | undefined) => {
  if (gender === 'M') return 'gender-m';
  if (gender === 'F') return 'gender-f';
  return '';
};
</script>

<template>
  <div class="daycare-view">
    <!-- Header -->
    <header class="daycare-header">
      <div class="header-content">
        <h1>Guardería Pokémon</h1>
        <p class="subtitle">
          Cuida y cría a tus compañeros
        </p>
      </div>
      <nav class="daycare-nav">
        <button 
          v-for="tab in ['breeding', 'eggs', 'missions']" 
          :key="tab"
          :class="{ active: activeTab === tab }"
          @click.stop="activeTab = tab"
        >
          {{ tab === 'breeding' ? 'Crianza' : tab === 'eggs' ? 'Almacén' : 'Misiones' }}
          <span
            v-if="tab === 'eggs' && breedingStore.warehouseEggs.length > 0"
            class="badge"
          >
            {{ breedingStore.warehouseEggs.length }}
          </span>
        </button>
      </nav>
    </header>

    <main class="daycare-main">
      <!-- Tab: Breeding -->
      <section
        v-if="activeTab === 'breeding'"
        class="tab-content breeding-tab"
      >
        <div class="slots-grid">
          <!-- Slot A -->
          <div
            class="daycare-slot"
            :class="{ empty: !breedingStore.slots[0]?.pokemon }"
          >
            <template v-if="breedingStore.slots[0]?.pokemon">
              <div class="slot-info">
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, breedingStore.slots[0].pokemon.id, { isShiny: breedingStore.slots[0].pokemon.isShiny })"
                  alt="Parent A"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
                <h3>{{ breedingStore.slots[0].pokemon.name }}</h3>
                <span
                  class="gender"
                  :class="getGenderClass(breedingStore.slots[0].pokemon.gender)"
                >
                  {{ breedingStore.slots[0].pokemon.gender === 'M' ? '♂' : '♀' }}
                </span>
              </div>
            </template>
            <button
              v-else
              class="btn-deposit"
              @click.stop="openPicker(0)"
            >
              <span>+</span>
              DEPOSITAR
            </button>
          </div>

          <!-- Compatibility & Forecast -->
          <div class="summary-column">
            <BreedingSummary />
          </div>

          <!-- Slot B -->
          <div
            class="daycare-slot"
            :class="{ empty: !breedingStore.slots[1]?.pokemon }"
          >
            <template v-if="breedingStore.slots[1]?.pokemon">
              <div class="slot-info">
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, breedingStore.slots[1].pokemon.id, { isShiny: breedingStore.slots[1].pokemon.isShiny })"
                  alt="Parent B"
                  @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
                >
                <h3>{{ breedingStore.slots[1].pokemon.name }}</h3>
                <span
                  class="gender"
                  :class="getGenderClass(breedingStore.slots[1].pokemon.gender)"
                >
                  {{ breedingStore.slots[1].pokemon.gender === 'M' ? '♂' : '♀' }}
                </span>
              </div>
            </template>
            <button
              v-else
              class="btn-deposit"
              @click.stop="openPicker(1)"
            >
              <span>+</span>
              DEPOSITAR
            </button>
          </div>
        </div>
      </section>

      <!-- Tab: Eggs -->
      <section
        v-if="activeTab === 'eggs'"
        class="tab-content eggs-tab"
      >
        <EggWarehouse />
      </section>

      <!-- Tab: Missions -->
      <section
        v-if="activeTab === 'missions'"
        class="tab-content missions-tab"
      >
        <DaycareMissions />
      </section>
    </main>

    <DaycarePicker 
      v-if="isPickerOpen"
      :slot-index="activeSlotIndex"
      :other-parent="breedingStore.slots[activeSlotIndex === 0 ? 1 : 0]?.pokemon"
      @select="handleSelect"
      @close="isPickerOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.daycare-view {
  color: var(--white);
  font-family: 'Inter', system-ui, sans-serif;
}

.daycare-header {
  padding: 40px 20px 0;
  text-align: center;
  
  h1 {
    @include pixelated;
    font-size: 24px;
    margin-bottom: 8px;
    background: Linear-Gradient(to right, var(--purple-light), var(--blue-light));
    -webkit-background-clip: text;
    -webkit-background-clip: text; -webkit-background-clip: text; -webkit-background-clip: text; -webkit-background-clip: text; background-clip: text;;;;;
    -webkit-text-fill-color: transparent;
    filter: Drop-Shadow(0 2px 10px Rgba(139, 92, 246, 0.3));
  }
  
  .subtitle {
    @include pixel-perfect(8px);
    color: var(--gray);
    margin-bottom: 32px;
    opacity: 0.7;
    letter-spacing: 1px;
  }
}

.daycare-nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  border-bottom: 1px solid #334155;
  
  button {
    background: none;
    border: none;
    padding: 12px 24px;
    color: var(--gray);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
    
    &.active {
      color: var(--white);
      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: Rgba(139, 92, 246, 1);
      }
    }
    
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: var(--red);
      color: var(--white);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 99px;
    }
  }
}

.daycare-main {
  padding: var(--ui-v-gap) var(--ui-h-padding);
  max-width: 800px;
  margin: 0 auto;
}

.slots-grid {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.daycare-slot {
  flex: 1;
  @include glass-solid(Rgba(255, 255, 255, 0.03));
  border-radius: 20px;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  @include will-animate(transform, background, border-color);
  
  &:not(.empty):hover {
    transform: TranslateY(-4px);
    border-color: var(--purple-light);
    background: Rgba(255, 255, 255, 0.06);
  }
  
  &.empty {
    border-style: dashed;
    background: Rgba(255, 255, 255, 0.01);
    opacity: 0.5;
  }
}

.slot-info {
  text-align: center;
  img {
    width: 96px;
    height: 96px;
    @include sprite-render;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 14px;
    font-weight: 700;
  }
  .gender {
    font-size: 16px;
    font-weight: 900;
    &.gender-m { color: Rgba(59, 130, 246, 1); }
    &.gender-f { color: Rgba(236, 72, 153, 1); }
  }
}

.btn-deposit {
  background: none;
  border: none;
  color: var(--gray);
  @include pixelated;
  font-size: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  
  span {
    font-size: 32px;
    line-height: 1;
  }
  
  &:hover {
    color: var(--gray);
  }
}

.compat-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 120px;
}

.compat-indicator {
  text-align: center;
  .compat-label {
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .timer {
    @include pixelated;
    font-size: 10px;
    color: var(--white);
  }
}

.heart-fx {
  font-size: 32px;
  opacity: 0.1;
  filter: Grayscale(100%);
  transition: all 0.5s;
  @include will-animate(transform);
  
  &.active {
    opacity: 1;
    filter: Grayscale(100%);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% { transform: Scale(1.0); filter: Drop-Shadow(0 0 0 Rgba(239, 68, 68, 0)); }
  50% { transform: Scale(1.2); filter: Drop-Shadow(0 0 15px Rgba(239, 68, 68, 0.6)); }
  100% { transform: Scale(1.0); filter: Drop-Shadow(0 0 0 Rgba(239, 68, 68, 0)); }
}

.breeding-forecast {
  background: Rgba(30, 41, 59, 1);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid Rgba(139, 92, 246, 0.3);
  box-shadow: 0 10px 30px Rgba(0,0,0,0.2);
  
  .forecast-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid Rgba(255,255,255,0.05);
    
    .icon { font-size: 20px; }
    h4 {
      font-size: 14px;
      font-weight: 800;
      color: var(--white);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }
}

.forecast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.forecast-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: Rgba(0,0,0,0.2);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
  
  .label {
    font-size: 10px;
    color: var(--gray);
    font-weight: 600;
  }
  
  .value {
    font-size: 12px;
    color: var(--white);
    font-weight: 700;
  }
  
  &.active {
    border-color: Rgba(139, 92, 246, 0.4);
    background: Rgba(139, 92, 246, 0.05);
    .value { color: Rgba(167, 139, 250, 1); }
  }
  
  &.positive {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.05);
    .value { color: Rgba(74, 222, 128, 1); }
  }
}

.forecast-help {
  padding-top: 12px;
  border-top: 1px dashed Rgba(51, 65, 85, 1);
  p {
    font-size: 11px;
    color: var(--gray);
    line-height: 1.5;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--gray);
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
}
</style>
