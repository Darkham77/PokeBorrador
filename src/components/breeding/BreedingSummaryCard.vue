<script setup>
import { computed } from 'vue'

const props = defineProps({
  parentA: { type: Object, required: true },
  parentB: { type: Object, required: true },
  compatibility: { type: Object, required: true },
  itemA: { type: String, default: '' },
  itemB: { type: String, default: '' },
  cost: { type: Number, default: 2000 },
  intervalText: { type: String, default: '—' }
})

const eggSpeciesName = computed(() => {
  if (!props.compatibility.eggSpecies) return '—'
  // Aquí idealmente usaríamos un i18n o la DB de Pokémon
  return props.compatibility.eggSpecies.charAt(0).toUpperCase() + props.compatibility.eggSpecies.slice(1)
})

const powerMap = {
  'Pesa Recia': { stat: 'hp', label: 'PS' },
  'Brazal Recio': { stat: 'atk', label: 'Ataque' },
  'Cinto Recio': { stat: 'def', label: 'Defensa' },
  'Lente Recia': { stat: 'spa', label: 'At. Especial' },
  'Banda Recia': { stat: 'spd', label: 'Def. Especial' },
  'Franja Recia': { stat: 'spe', label: 'Velocidad' }
}

const guaranteedNature = computed(() => {
  if (props.itemA === 'Piedra Eterna' && props.itemB === 'Piedra Eterna') {
    return `${props.parentA.nature} o ${props.parentB.nature} (50/50)`
  }
  if (props.itemA === 'Piedra Eterna') return props.parentA.nature
  if (props.itemB === 'Piedra Eterna') return props.parentB.nature
  return 'Aleatoria (1/25)'
})

const geneticsSummary = computed(() => {
  const forcedA = powerMap[props.itemA]
  const forcedB = powerMap[props.itemB]
  let lines = []

  if (forcedA) {
    lines.push(`✓ 100% ${forcedA.label} (${props.parentA.name})`)
  }
  
  if (forcedB) {
    if (!forcedA || forcedB.stat !== forcedA.stat) {
      lines.push(`✓ 100% ${forcedB.label} (${props.parentB.name})`)
    } else {
      // Ambos eligieron el mismo stat
      lines = [`✓ 50% ${forcedA.label} (${props.parentA.name}) / 50% (${props.parentB.name})`]
    }
  }

  if (lines.length === 0) {
    return ['3 stats al azar (Madre/Padre)']
  }
  return lines
})
</script>

<template>
  <div class="breeding-summary-card">
    <div class="dna-bg">
      🧬
    </div>
    <h3 class="title">
      PRONÓSTICO DE CRÍA
    </h3>
    
    <div class="stats-grid">
      <!-- Especie -->
      <div class="stat-item specie">
        <span class="label">ESPECIE</span>
        <span class="value">🥚 {{ eggSpeciesName }}</span>
      </div>

      <!-- Naturaleza -->
      <div class="stat-item nature">
        <span class="label">NATURALEZA</span>
        <span class="value">{{ guaranteedNature }}</span>
      </div>

      <!-- Genética -->
      <div class="stat-item genetics">
        <span class="label">GENÉTICA (IVs)</span>
        <div class="genetics-list">
          <div
            v-for="(line, idx) in geneticsSummary"
            :key="idx"
            class="gen-line"
          >
            {{ line }}
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-item">
        Costo: <span class="cost">${{ cost.toLocaleString() }}</span>
      </div>
      <div class="footer-item">
        Tiempo: <span class="time">{{ intervalText }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.breeding-summary-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;
  text-align: left;

  .dna-bg {
    position: absolute;
    top: -20px;
    right: -20px;
    font-size: 100px;
    opacity: 0.05;
    z-index: 0;
    pointer-events: none;
  }

  .title {
    text-align: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #a78bfa;
    margin-bottom: 20px;
    text-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
    position: relative;
    z-index: 1;
  }

  .stats-grid {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    padding: 12px;
    border-radius: 12px;
    border-left: 4px solid #fff;

    .label {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      color: #64748b;
    }

    .value {
      font-size: 13px;
      font-weight: 800;
      color: #fff;
    }

    &.specie { border-left-color: #10b981; }
    &.nature { border-left-color: #fbbf24; }
    &.genetics {
      flex-direction: column;
      align-items: flex-start;
      border-left-color: #3b82f6;
      
      .genetics-list {
        margin-top: 8px;
        width: 100%;
        .gen-line {
          font-size: 11px;
          color: #3b82f6;
          font-weight: 700;
          line-height: 1.5;
        }
      }
    }
  }

  .footer {
    position: relative;
    z-index: 1;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;

    span {
      font-weight: 800;
      &.cost { color: #fbbf24; }
      &.time { color: #10b981; }
    }
  }
}
</style>
