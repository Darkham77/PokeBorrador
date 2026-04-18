<script setup>
import { ref, onMounted } from 'vue';
import { useBreedingStore } from '@/stores/breeding';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import DaycarePicker from '@/components/breeding/DaycarePicker.vue';
import DaycareMissions from '@/components/breeding/DaycareMissions.vue';
import EggWarehouse from '@/components/breeding/EggWarehouse.vue';
import { getSpriteUrl } from '@/logic/pokemonUtils';
import { COMPAT_TEXT } from '@/data/breeding/breedingConstants';
import { getGeneticsForecast } from '@/logic/breeding/breedingEngine';
import { usePlayerClassStore } from '@/stores/playerClass';

const breedingStore = useBreedingStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const activeTab = ref('breeding'); // breeding | missions | eggs
const isPickerOpen = ref(false);
const activeSlotIndex = ref(0);

const openPicker = (slotIdx) => {
  activeSlotIndex.value = slotIdx;
  isPickerOpen.value = true;
};

const handleSelect = (pokemon) => {
  breedingStore.deposit(pokemon, activeSlotIndex.value);
  isPickerOpen.value = false;
};

onMounted(() => {
  breedingStore.loadDaycare();
  breedingStore.checkDailyReset();
});

const getGenderClass = (gender) => {
  if (gender === 'M') return 'gender-m';
  if (gender === 'F') return 'gender-f';
  return '';
};

// Formatting timer
const formatTime = (ms) => {
  if (!ms) return '--:--';
  const left = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const classStore = usePlayerClassStore();

const forecast = computed(() => {
  if (!breedingStore.isBreeding) return null;
  return getGeneticsForecast(
    breedingStore.slots[0].pokemon,
    breedingStore.slots[1].pokemon,
    classStore.activeClass
  );
});
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
          @click="activeTab = tab"
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
                  :src="getSpriteUrl(breedingStore.slots[0].pokemon.id, breedingStore.slots[0].pokemon.isShiny)"
                  alt="Parent A"
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
              @click="openPicker(0)"
            >
              <span>+</span>
              DEPOSITAR
            </button>
          </div>

          <!-- Compatibility & Timer -->
          <div class="compat-center">
            <div
              class="compat-indicator"
              :style="{ color: COMPAT_TEXT[breedingStore.compatibility.level]?.color || '#94a3b8' }"
            >
              <div class="compat-label">
                {{ breedingStore.compatibility.label || COMPAT_TEXT[breedingStore.compatibility.level]?.label }}
              </div>
              <div
                v-if="breedingStore.isBreeding"
                class="timer"
              >
                <span class="timer-icon">⏳</span>
                {{ formatTime(breedingStore.nextEggTime) }}
              </div>
            </div>
            <div
              class="heart-fx"
              :class="{ active: breedingStore.isBreeding }"
            >
              ❤️
            </div>
          </div>

          <!-- Slot B -->
          <div
            class="daycare-slot"
            :class="{ empty: !breedingStore.slots[1]?.pokemon }"
          >
            <template v-if="breedingStore.slots[1]?.pokemon">
              <div class="slot-info">
                <img
                  :src="getSpriteUrl(breedingStore.slots[1].pokemon.id, breedingStore.slots[1].pokemon.isShiny)"
                  alt="Parent B"
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
              @click="openPicker(1)"
            >
              <span>+</span>
              DEPOSITAR
            </button>
          </div>
        </div>

        <div
          v-if="breedingStore.isBreeding && forecast"
          class="breeding-forecast"
        >
          <div class="forecast-header">
            <span class="icon">🧬</span>
            <h4>Pronóstico de Herencia</h4>
          </div>
          
          <div class="forecast-grid">
            <div
              class="forecast-item"
              :class="{ positive: forecast.ivsInherited >= 5 }"
            >
              <span class="label">IVs heredados:</span>
              <span class="value">{{ forecast.ivsInherited }} de 6</span>
            </div>
            
            <div
              class="forecast-item"
              :class="{ active: forecast.natureGuaranteed }"
            >
              <span class="label">Naturaleza:</span>
              <span class="value">{{ forecast.natureGuaranteed ? 'GARANTIZADA' : 'Aleatoria' }}</span>
            </div>

            <div
              class="forecast-item"
              :class="{ active: forecast.masudaActive }"
            >
              <span class="label">Método Masuda:</span>
              <span class="value">{{ forecast.masudaActive ? `ACTIVO (x${forecast.shinyMultiplier})` : 'Inactivo' }}</span>
            </div>

            <div
              class="forecast-item"
              :class="{ positive: forecast.eggMovesCount > 0 }"
            >
              <span class="label">Movimientos Huevo:</span>
              <span class="value">{{ forecast.eggMovesCount > 0 ? 'DETECTADOS ✨' : 'Ninguno' }}</span>
            </div>
            
            <div class="forecast-item">
              <span class="label">Habilidad (Madre):</span>
              <span class="value">{{ forecast.hiddenAbilityChance }}% chance</span>
            </div>
          </div>

          <div class="forecast-help">
            <p>ℹ️ Usa Piedra Eterna para la Naturaleza y Lazo Destino para heredar más IVs.</p>
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
.daycare-view {
  min-height: 100vh;
  background: #0f172a;
  color: #f8fafc;
  font-family: 'Inter', system-ui, sans-serif;
}

.daycare-header {
  padding: 40px 20px 0;
  background: linear-gradient(to bottom, #1e293b, #0f172a);
  text-align: center;
  
  h1 {
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 8px;
    background: linear-gradient(to right, #8b5cf6, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .subtitle {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 32px;
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
    color: #94a3b8;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
    
    &.active {
      color: #fff;
      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: #8b5cf6;
      }
    }
    
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 99px;
    }
  }
}

.daycare-main {
  padding: 24px;
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
  background: #1e293b;
  border-radius: 20px;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #334155;
  transition: all 0.2s;
  
  &:not(.empty):hover {
    transform: translateY(-4px);
    border-color: #475569;
  }
  
  &.empty {
    border-style: dashed;
    background: rgba(30, 41, 59, 0.4);
  }
}

.slot-info {
  text-align: center;
  img {
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
    margin-bottom: 12px;
  }
  h3 {
    font-size: 14px;
    font-weight: 700;
  }
  .gender {
    font-size: 16px;
    font-weight: 900;
    &.gender-m { color: #3b82f6; }
    &.gender-f { color: #ec4899; }
  }
}

.btn-deposit {
  background: none;
  border: none;
  color: #64748b;
  font-family: 'Press Start 2P', cursive;
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
    color: #94a3b8;
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
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    color: #fff;
  }
}

.heart-fx {
  font-size: 32px;
  opacity: 0.1;
  filter: grayScale(100%);
  transition: all 0.5s;
  
  &.active {
    opacity: 1;
    filter: grayScale(100%);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% { transform: Scale(1.0); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); }
  50% { transform: Scale(1.2); filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.6)); }
  100% { transform: Scale(1.0); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); }
}

.breeding-forecast {
  background: #1e293b;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  
  .forecast-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    
    .icon { font-size: 20px; }
    h4 {
      font-size: 14px;
      font-weight: 800;
      color: #fff;
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
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.3s;
  
  .label {
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
  }
  
  .value {
    font-size: 12px;
    color: #fff;
    font-weight: 700;
  }
  
  &.active {
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(139, 92, 246, 0.05);
    .value { color: #a78bfa; }
  }
  
  &.positive {
    border-color: rgba(34, 197, 94, 0.4);
    background: rgba(34, 197, 94, 0.05);
    .value { color: #4ade80; }
  }
}

.forecast-help {
  padding-top: 12px;
  border-top: 1px dashed #334155;
  p {
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.5;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #64748b;
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
  }
}
</style>
