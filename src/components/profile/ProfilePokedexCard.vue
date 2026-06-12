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
@use "@/styles/core/_mixins" as *;

.profile-section-card {
  padding: 20px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    letter-spacing: 1px;
  }
}

.pokedex-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.pokedex-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pokedex-val {
  @include pixelated;
  font-size: 16px;
  color: var(--white);
}

.pokedex-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
}

.pokedex-bar-container {
  width: 100%;
  height: 8px;
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.pokedex-bar-progress {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #eab308, #22c55e);
  border-radius: 4px;
  box-shadow: 0 0 8px Rgba(34, 197, 94, 0.4);
}

.pokedex-footer {
  display: flex;
  justify-content: space-between;
  @include pixelated;
  font-size: 7px;
  color: Rgba(255, 255, 255, 0.25);
}
</style>
