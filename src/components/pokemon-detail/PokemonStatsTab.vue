<script setup lang="ts">
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon'

interface StatDisplay {
  id: string
  label: string
  value: number
  max: number
  color: string
  iv: number
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
</style>
