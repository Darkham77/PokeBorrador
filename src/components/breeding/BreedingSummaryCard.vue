<script setup lang="ts">
import { computed } from 'vue'
import type { Pokemon, BreedingCompatibility } from '@/types/pokemon'

interface Props {
  parentA: Pokemon
  parentB: Pokemon
  compatibility: BreedingCompatibility
  itemA?: string
  itemB?: string
  cost?: number
  intervalText?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemA: '',
  itemB: '',
  cost: 2000,
  intervalText: '—'
})

const eggSpeciesName = computed(() => {
  if (!props.compatibility.eggSpecies) return '—'
  return props.compatibility.eggSpecies.charAt(0).toUpperCase() + props.compatibility.eggSpecies.slice(1)
})

const powerMap: Record<string, { stat: string, label: string }> = {
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
  let lines: string[] = []

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
@use "@/styles/core/_mixins" as *;
.breeding-summary-card {
  background: Linear-Gradient(135deg, Rgba(30, 41, 59, 0.9), Rgba(15, 23, 42, 0.95));
  border: 1px solid Rgba(139, 92, 246, 0.5);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px Rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;
  text-align: left;

  .dna-bg {
    position: absolute;
    top: -20px;
    right: -20px;
    font-size: 100px;
    opacity: 0.05;
    z-index: var(--z-base);
    pointer-events: none;
  }

  .title {
    text-align: center;
    @include pixelated;
    font-size: 10px;
    color: Rgba(167, 139, 250, 1);
    margin-bottom: 20px;
    text-shadow: 0 0 10px Rgba(139, 92, 246, 0.5);
    position: relative;
    z-index: var(--z-base);
  }

  .stats-grid {
    position: relative;
    z-index: var(--z-base);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: Rgba(0, 0, 0, 0.4);
    padding: 12px;
    border-radius: 12px;
    border-left: 4px solid $white;

    .label {
      @include pixelated;
      font-size: 9px;
      color: $muted;
    }

    .value {
      font-size: 13px;
      font-weight: 800;
      color: $white;
    }

    &.specie { border-left-color: Rgba(16, 185, 129, 1); }
    &.nature { border-left-color: Rgba(251, 191, 36, 1); }
    &.genetics {
      flex-direction: column;
      align-items: flex-start;
      border-left-color: Rgba(59, 130, 246, 1);
      
      .genetics-list {
        margin-top: 8px;
        width: 100%;
        .gen-line {
          font-size: 11px;
          color: Rgba(59, 130, 246, 1);
          font-weight: 700;
          line-height: 1.5;
        }
      }
    }
  }

  .footer {
    position: relative;
    z-index: var(--z-base);
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: $muted;

    span {
      font-weight: 800;
      &.cost { color: Rgba(251, 191, 36, 1); }
      &.time { color: Rgba(16, 185, 129, 1); }
    }
  }
}
</style>
