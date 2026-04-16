<script setup>
import { onMounted, computed } from 'vue'
import { useBreedingStore } from '@/stores/breeding'
import DaycareSlot from '@/components/breeding/DaycareSlot.vue'

const breedingStore = useBreedingStore()

const compat = computed(() => breedingStore.compatibility)
const compatStyle = computed(() => breedingStore.COMPAT_TEXT[compat.value.level] || breedingStore.COMPAT_TEXT[0])

onMounted(async () => {
  await breedingStore.loadDaycareData()
})

const handleDeposit = (slotId) => {
  // For now, call legacy deposit UI if available, or trigger a placeholder
  if (typeof window.showDaycarePicker === 'function') {
    window.showDaycarePicker(slotId)
  }
}

const handleWithdraw = async (slotId) => {
  // For now, call legacy withdraw
  if (typeof window.withdrawFromDaycare === 'function') {
    await window.withdrawFromDaycare(slotId)
    await breedingStore.loadDaycareData()
  }
}
</script>

<template>
  <div class="daycare-view">
    <div class="daycare-header">
      <div class="view-title">
        🥚 CENTRO DE CRIANZA
      </div>
      <p class="view-desc">
        Deja dos Pokémon compatibles para obtener un huevo. Transmitirán sus genes, movimientos y naturalezas a su descendencia.
      </p>
    </div>

    <!-- Compatibility Bar -->
    <div
      class="compat-panel"
      :style="{ '--compat-color': compatStyle.color }"
    >
      <div class="compat-status">
        <span class="icon">{{ compat.level > 0 ? '🧬' : '🔎' }}</span>
        <span class="label">{{ compatStyle.label }}</span>
        <span
          v-if="compat.reason"
          class="reason"
        >({{ compat.reason }})</span>
      </div>
      <div class="compat-bar">
        <div
          class="fill"
          :style="{ width: (compat.level / 3 * 100) + '%' }"
        />
      </div>
    </div>

    <!-- Main Slots Grid -->
    <div class="slots-container">
      <DaycareSlot
        slot-id="a"
        :pokemon="breedingStore.slots[0].pokemon"
        :item="breedingStore.slots[0].item"
        @deposit="handleDeposit('a')"
        @withdraw="handleWithdraw('a')"
      />

      <div class="breeding-arrow">
        ❤️
      </div>

      <DaycareSlot
        slot-id="b"
        :pokemon="breedingStore.slots[1].pokemon"
        :item="breedingStore.slots[1].item"
        @deposit="handleDeposit('b')"
        @withdraw="handleWithdraw('b')"
      />
    </div>

    <!-- Breeding Forecast -->
    <div
      v-if="compat.level > 0"
      class="forecast-panel"
    >
      <div class="panel-header">
        PREDICCIÓN GENÉTICA
      </div>
      <div class="forecast-grid">
        <div class="forecast-item">
          <div class="label">
            ESPECIE
          </div>
          <div class="value">
            {{ compat.eggSpecies ? compat.eggSpecies.toUpperCase() : '???' }}
          </div>
        </div>
        <div class="forecast-item">
          <div class="label">
            COSTO
          </div>
          <div class="value cost">
            ₽{{ breedingStore.calculateBreedingCost(breedingStore.slots[0].pokemon, breedingStore.slots[1].pokemon) }}
          </div>
        </div>
        <div class="forecast-item full">
          <div class="label">
            HERENCIA
          </div>
          <p class="desc">
            3 IVs serán heredados al azar. Equipar una <b>Piedra Eterna</b> garantiza la naturaleza. Los <b>Objetos Recio</b> garantizan un IV específico.
          </p>
        </div>
      </div>
    </div>

    <!-- Egg Grid (Incubator) -->
    <div class="egg-section">
      <div class="section-title">
        🥚 INCUBADORA DE LA GUARDERÍA
      </div>
      <div
        v-if="breedingStore.eggs.length === 0"
        class="empty-eggs"
      >
        No hay huevos esperando en este momento.
      </div>
      <div
        v-else
        class="egg-grid"
      >
        <div
          v-for="egg in breedingStore.eggs"
          :key="egg.egg_id"
          class="egg-card"
        >
          <div class="egg-sprite">
            🥚
          </div>
          <div class="egg-info">
            <div class="egg-name">
              Huevo de {{ egg.species }}
            </div>
            <div class="egg-timer">
              Listo en: {{ Math.ceil((new Date(egg.hatch_ready_time) - new Date()) / 60000) }} min
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.daycare-view {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease;
}

.daycare-header {
  margin-bottom: 32px;
  text-align: center;
}

.view-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 18px;
  color: #fff;
  margin-bottom: 12px;
}

.view-desc {
  font-size: 14px;
  color: var(--gray);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}

.compat-panel {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 24px;
}

.compat-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-weight: 800;
  
  .icon { font-size: 20px; }
  .label { color: var(--compat-color); font-family: 'Press Start 2P', monospace; font-size: 10px; }
  .reason { color: var(--gray); font-size: 11px; font-weight: 400; }
}

.compat-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  
  .fill {
    height: 100%;
    background: var(--compat-color);
    box-shadow: 0 0 10px var(--compat-color);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.slots-container {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    .breeding-arrow { transform: rotate(90deg); }
  }
}

.breeding-arrow {
  font-size: 24px;
  filter: drop-shadow(0 0 10px var(--red));
}

.forecast-panel {
  background: linear-gradient(135deg, rgba(var(--purple-rgb), 0.1), rgba(0, 0, 0, 0.4));
  border: 1px solid rgba(var(--purple-rgb), 0.2);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 32px;
}

.panel-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: var(--purple);
  margin-bottom: 16px;
}

.forecast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.forecast-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 12px;
  
  &.full { grid-column: span 2; }
  
  .label { font-size: 9px; color: var(--gray); font-weight: 800; margin-bottom: 4px; }
  .value { font-size: 16px; font-weight: 900; color: #fff; }
  .cost { color: var(--yellow); }
  .desc { font-size: 11px; color: var(--gray); line-height: 1.4; margin: 4px 0 0; }
}

.egg-section {
  background: rgba(255, 255, 255, 0.02);
  padding: 24px;
  border-radius: 24px;
}

.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--gray);
  margin-bottom: 20px;
}

.empty-eggs {
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
  font-style: italic;
  padding: 20px;
}

.egg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.egg-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.egg-sprite { font-size: 32px; }
.egg-name { font-size: 14px; font-weight: 800; color: #fff; }
.egg-timer { font-size: 11px; color: var(--gray); margin-top: 4px; }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
