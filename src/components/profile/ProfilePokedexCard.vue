<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  pokedexCaught: number
  pokedexSeen: number
}

const props = defineProps<Props>()

const completionPct = computed(() => {
  if (props.pokedexCaught <= 0) return 0
  return Math.round((props.pokedexCaught / 151) * 100)
})

const barWidthPct = computed(() => {
  return Math.min(100, (props.pokedexCaught / 151) * 100)
})
</script>

<template>
  <div class="profile-section-card pokedex-card">
    <div class="section-label">
      PROGRESO DE POKÉDEX
    </div>
    <div class="pokedex-stats">
      <div class="pokedex-stat">
        <span class="pokedex-val">{{ pokedexCaught }}</span>
        <span class="pokedex-lbl">Capturados</span>
      </div>
      <div class="pokedex-stat">
        <span class="pokedex-val">{{ pokedexSeen }}</span>
        <span class="pokedex-lbl">Vistos</span>
      </div>
    </div>
    <div class="pokedex-bar-container">
      <div 
        class="pokedex-bar-progress" 
        :style="{ width: barWidthPct + '%' }" 
      />
    </div>
    <div class="pokedex-footer">
      <span>Gen I Total: 151</span>
      <span>{{ completionPct }}% Completado</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/_profile-shared.scss";
</style>
