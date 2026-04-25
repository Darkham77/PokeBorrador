<script setup>
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

defineProps({
  displayStats: { type: Array, required: true },
  species: { type: Object, required: true },
  isInstance: { type: Boolean, default: false }
})
</script>

<template>
  <div class="pdex-stats-pane">
    <div class="stats-section">
      <h4 class="section-title">
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
      <h4 class="section-title">
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
        title="BASE STAT TOTAL (BST)"
        description="La suma de todas las estadísticas base del Pokémon. Determina su poder bruto y su tier competitiva."
        position="top"
      >
        <span class="pdex-label pixelated">BST TOTAL:</span>
      </PVTooltip>
      <span class="pdex-value pixelated">{{ species.stats.hp + species.stats.atk + species.stats.def + species.stats.spa + species.stats.spd + species.stats.spe }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-detail/_vicio-panes.scss";
</style>
