<script setup>
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps({
  displayStats: { type: Array, required: true },
  species: { type: Object, required: true },
  isInstance: { type: Boolean, default: false },
  pokemon: { type: Object, default: null }
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
          (species.stats.hp + species.stats.atk + species.stats.def + species.stats.spa + species.stats.spd + species.stats.spe) +
            (isInstance && pokemon?.ivs ? Object.values(pokemon.ivs).reduce((s,v)=>s+(v||0),0) : 0)
        }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";
</style>
