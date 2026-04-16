<script setup>
import { onMounted, computed, ref } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import { useGameStore } from '@/stores/game'

// Components
import DaycareSlot from '@/components/breeding/DaycareSlot.vue'
import CompatibilityPanel from '@/components/breeding/CompatibilityPanel.vue'
import EggCard from '@/components/breeding/EggCard.vue'
import DaycareMissionCard from '@/components/breeding/DaycareMissionCard.vue'

// Modals
import BreedingPickerModal from '@/components/BreedingPickerModal.vue'
import EggScannerModal from '@/components/EggScannerModal.vue'

const breedingStore = useBreedingStore()
const gameStore = useGameStore()

const isPickerOpen = ref(false)
const isScannerOpen = ref(false)
const pickerMode = ref('daycare')
const pickerSlotIdx = ref(0)
const pickerMissionIdx = ref(-1)

const compat = computed(() => breedingStore.compatibility)
const missions = computed(() => gameStore.state.daycare_missions || [])

onMounted(async () => {
  await breedingStore.loadDaycareData()
})

const openPicker = (slotIdx) => {
  pickerMode.value = 'daycare'
  pickerSlotIdx.value = slotIdx
  isPickerOpen.value = true
}

const openMissionPicker = (mIdx) => {
  pickerMode.value = 'mission'
  pickerMissionIdx.value = mIdx
  isPickerOpen.value = true
}

const handleWithdraw = async (slotId) => {
  await breedingStore.withdrawPokemon(slotId)
}

const collectEgg = async (egg) => {
  await breedingStore.collectEgg(egg)
}
</script>

<template>
  <div class="daycare-view-legacy custom-scrollbar">
    <!-- HEADER -->
    <div class="daycare-header-retro">
      <h1 class="view-title">
        🥚 CENTRO DE CRIANZA
      </h1>
      <p class="view-desc">
        Deja dos Pokémon compatibles para obtener un huevo. Transmitirán sus genes, movimientos y naturalezas a su descendencia.
      </p>
    </div>

    <!-- COMPATIBILITY PANEL -->
    <CompatibilityPanel 
      :compatibility="compat" 
      :compat-text="breedingStore.COMPAT_TEXT" 
    />

    <!-- MAIN SLOTS -->
    <div class="slots-layout">
      <DaycareSlot
        slot-id="a"
        :pokemon="breedingStore.slots[0].pokemon"
        :item="breedingStore.slots[0].pokemon?.heldItem"
        @deposit="openPicker(0)"
        @withdraw="handleWithdraw('a')"
      />

      <div class="heart-divider">
        ❤️
      </div>

      <DaycareSlot
        slot-id="b"
        :pokemon="breedingStore.slots[1].pokemon"
        :item="breedingStore.slots[1].pokemon?.heldItem"
        @deposit="openPicker(1)"
        @withdraw="handleWithdraw('b')"
      />
    </div>

    <!-- FORECAST PANEL -->
    <div
      v-if="compat.level > 0"
      class="forecast-panel-retro"
    >
      <div class="panel-tag">
        PRONÓSTICO DE CRÍA
      </div>
      <div class="forecast-grid-retro">
        <div class="forecast-box">
          <div class="box-label">
            ESPECIE RESULTANTE
          </div>
          <div class="box-value species">
            {{ compat.eggSpecies ? compat.eggSpecies.toUpperCase().replace('_', ' ') : '???' }}
          </div>
        </div>
        <div class="forecast-box">
          <div class="box-label">
            COSTO DE RECOLECCIÓN
          </div>
          <div class="box-value cost">
            ₽{{ breedingStore.calculateBreedingCost(breedingStore.slots[0].pokemon, breedingStore.slots[1].pokemon).toLocaleString() }}
          </div>
        </div>
        <div class="forecast-box full">
          <div class="box-label">
            REGLAS DE HERENCIA
          </div>
          <p class="box-desc">
            Se transmitirán 3 IVs aleatorios. El Pokémon nacido heredará la especie de la madre. 
            <span class="highlight">Piedra Eterna</span> asegura naturaleza. <span class="highlight">Objetos Recio</span> aseguran IVs específicos.
          </p>
        </div>
      </div>
    </div>

    <!-- INCUBATOR SECTION -->
    <div class="egg-incubator-retro">
      <div class="incubator-header">
        <h2 class="section-title">
          🥚 INCUBADORA DE LA GUARDERÍA
        </h2>
        <button
          v-if="gameStore.state.playerClass === 'criador'"
          class="scanner-btn-retro"
          @click="isScannerOpen = true"
        >
          🔍 ESCÁNER GENÉTICO
        </button>
      </div>
      
      <div
        v-if="breedingStore.eggs.length === 0"
        class="empty-egg-state"
      >
        <div class="empty-icon-egg">
          ⏳
        </div>
        <p>No hay huevos esperando. Sigue caminando para generar nuevas crías.</p>
      </div>
      
      <div
        v-else
        class="egg-grid-retro"
      >
        <EggCard 
          v-for="egg in breedingStore.eggs" 
          :key="egg.egg_id" 
          :egg="egg" 
          @collect="collectEgg"
        />
      </div>
    </div>

    <!-- DAILY MISSIONS -->
    <div class="missions-retro">
      <h2 class="section-title">
        📅 ENCARGOS DEL DÍA
      </h2>
      <div class="mission-grid-retro">
        <DaycareMissionCard 
          v-for="(m, idx) in missions" 
          :key="idx" 
          :mission="m" 
          @deliver="openMissionPicker(idx)"
        />
      </div>
    </div>

    <!-- Modals -->
    <BreedingPickerModal 
      :is-open="isPickerOpen"
      :mode="pickerMode"
      :slot-idx="pickerSlotIdx"
      :mission-idx="pickerMissionIdx"
      @close="isPickerOpen = false"
    />

    <EggScannerModal 
      :is-open="isScannerOpen"
      @close="isScannerOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
.daycare-view-legacy {
  padding: 30px;
  background: #0d1117;
  height: 100%;
  overflow-y: auto;
}

.daycare-header-retro {
  text-align: center;
  margin-bottom: 35px;
  .view-title { 
    font-family: 'Press Start 2P', monospace; 
    font-size: 14px; color: #fff; margin-bottom: 15px; 
    text-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
  }
  .view-desc { font-size: 11px; color: #64748b; max-width: 600px; margin: 0 auto; line-height: 1.6; }
}

.slots-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
  margin-bottom: 40px;
  
  .heart-divider { font-size: 24px; opacity: 0.8; filter: drop-shadow(0 0 10px #ef4444); }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    .heart-divider { transform: rotate(90deg); margin: 0 auto; }
  }
}

.forecast-panel-retro {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(0, 0, 0, 0.4));
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 40px;

  .panel-tag { font-family: 'Press Start 2P', monospace; font-size: 8px; color: #a855f7; margin-bottom: 20px; }
}

.forecast-grid-retro { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.forecast-box {
  background: rgba(0,0,0,0.2); padding: 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);
  &.full { grid-column: span 2; }
  .box-label { font-size: 9px; color: #64748b; font-weight: bold; margin-bottom: 10px; }
  .box-value { font-size: 18px; font-weight: 900; color: #fff; }
  .species { color: #a855f7; }
  .cost { color: #ffd700; }
  .box-desc { font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 10px; }
  .highlight { color: #fff; font-weight: bold; }
}

.egg-incubator-retro {
  background: rgba(0,0,0,0.2); padding: 30px; border-radius: 24px; margin-bottom: 40px; border: 1px solid rgba(255,255,255,0.04);
  .incubator-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .section-title { font-family: 'Press Start 2P', monospace; font-size: 9px; color: #94a3b8; }
  .scanner-btn-retro { 
    background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; color: #a855f7; 
    padding: 10px 18px; border-radius: 12px; font-size: 9px; font-weight: bold; cursor: pointer;
    &:hover { background: #a855f7; color: #fff; }
  }
}

.empty-egg-state {
  text-align: center; color: #334155; padding: 40px;
  .empty-icon-egg { font-size: 40px; margin-bottom: 15px; opacity: 0.3; }
  p { font-size: 11px; }
}

.egg-grid-retro { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }

.missions-retro {
  .section-title { font-family: 'Press Start 2P', monospace; font-size: 9px; color: #94a3b8; margin-bottom: 30px; }
}

.mission-grid-retro { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>
