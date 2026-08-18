<script setup lang="ts">
import { computed } from 'vue'
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { calculateTotalEvs, MAX_TOTAL_EVS } from '@/logic/pokemon/evMath'

interface StatDisplay {
  id: string
  label: string
  value: number
  max: number
  color: string
  iv: number
  ev: number
}

interface SpeciesData {
  name: string
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

interface Props {
  displayStats: StatDisplay[]
  species: SpeciesData
  isInstance?: boolean
  pokemon?: Pokemon | null
}

const props = withDefaults(defineProps<Props>(), {
  isInstance: false,
  pokemon: null
})

const totalEvs = computed(() => {
  return calculateTotalEvs(props.pokemon?.evs)
})

const isEvMaxed = computed(() => {
  return totalEvs.value >= MAX_TOTAL_EVS
})

const pokerusStatus = computed(() => {
  return props.pokemon?.pokerus
})
</script>

<template>
  <div class="pdex-stats-pane">
    <div class="stats-section">
      <h4 class="vp-section-title">
        ESTADÍSTICAS REALES
      </h4>
      <PokemonStatBar
        v-for="s in displayStats"
        :key="'real-'+s.id"
        :label="s.label"
        :value="s.value"
        :max="s.max"
        :color="s.color"
        mode="stat"
      />
    </div>

    <div
      v-if="isInstance"
      class="stats-section mt-32"
    >
      <h4 class="vp-section-title">
        POTENCIAL GENÉTICO (IV)
      </h4>
      <PokemonStatBar
        v-for="s in displayStats"
        :key="'iv-'+s.id"
        :label="s.label"
        :value="s.iv"
        :max="31"
        mode="iv"
      />
    </div>

    <div
      v-if="isInstance"
      class="stats-section mt-32"
    >
      <div class="vp-section-header-row">
        <h4 class="vp-section-title">
          ENTRENAMIENTO (EV)
        </h4>
        <div class="ev-summary-badge pixelated">
          <span
            v-if="pokerusStatus === 'infected'"
            class="pkrs-badge infected"
          >[PKRS]</span>
          <span
            v-else-if="pokerusStatus === 'cured'"
            class="pkrs-badge cured"
          >[PKRS CURADO]</span>
          <span
            class="ev-total-text"
            :class="{ 'is-maxed': isEvMaxed }"
          >
            TOTAL: {{ totalEvs }} / {{ MAX_TOTAL_EVS }}
          </span>
          <span
            v-if="isEvMaxed"
            class="max-badge"
          >✨ MAX</span>
        </div>
      </div>
      <PokemonStatBar
        v-for="s in displayStats"
        :key="'ev-'+s.id"
        :label="s.label"
        :value="s.ev"
        :max="252"
        color="Rgba(167, 139, 250, 1)"
        mode="stat"
      />
    </div>

    <div class="vicio-stat-total mt-32">
      <PVTooltip
        title="PODER TOTAL"
        description="La suma de estadísticas base e IVs individuales. Representa el nivel de combate final del Pokémon."
        position="top"
      >
        <span class="vp-pane-label pixelated">PODER TOTAL:</span>
      </PVTooltip>
      <span class="vp-stat-value pixelated">
        {{ 
          (props.species.hp + props.species.atk + props.species.def + props.species.spa + props.species.spd + props.species.spe) +
            (isInstance && pokemon?.ivs ? Object.values(pokemon.ivs).reduce((s: number, v) => s + (Number(v) || 0), 0) : 0)
        }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";

.vp-section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .vp-section-title {
    margin-bottom: 0;
    flex: 1;
  }
}

.ev-summary-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 8px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .ev-total-text {
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0.5px;

    &.is-maxed {
      color: var(--yellow, #ffd60a);
      font-weight: bold;
    }
  }

  .max-badge {
    color: var(--yellow, #ffd60a);
    font-weight: bold;
    letter-spacing: 0.5px;
  }

  .pkrs-badge {
    padding: 2px 4px;
    border-radius: 4px;
    font-weight: bold;

    &.infected {
      background: rgba(236, 72, 153, 0.2);
      color: #f472b6;
      border: 1px solid rgba(236, 72, 153, 0.4);
    }

    &.cured {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.4);
    }
  }
}
</style>
