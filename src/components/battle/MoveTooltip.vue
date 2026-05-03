<script setup>
import { computed } from 'vue'
import { MOVE_DATA } from '@/data/moves'
import { getMoveDescription } from '@/logic/pokemonUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'

const props = defineProps({
  move: { type: Object, required: true }
})

const battleStore = useBattleStore()

const modifierInfo = computed(() => {
  const m = props.move
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
  const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))

  // Status moves don't get weather/cycle damage multipliers
  if (m.cat === 'status' && !['solar_beam', 'solar_blade'].includes(m.id)) return null

  if (m.type === 'fire') {
    if (mechWeather === WEATHER_MECHANICAL.RAIN) return { type: 'penalized', text: 'Penalizado por Lluvia (0.5x)' }
    if (isSunActive) return { type: 'boosted', text: `Potenciado por ${mechWeather === WEATHER_MECHANICAL.SUN ? 'Sol' : 'Horario'} (1.5x/1.2x)` }
  }
  if (m.type === 'water') {
    if (mechWeather === WEATHER_MECHANICAL.SUN) return { type: 'penalized', text: 'Penalizado por Sol (0.5x)' }
    if (isRainActive) return { type: 'boosted', text: `Potenciado por ${mechWeather === WEATHER_MECHANICAL.RAIN ? 'Lluvia' : 'Horario'} (1.5x/1.2x)` }
  }
  if (m.id === 'solar_beam' || m.id === 'solar_blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return { type: 'penalized', text: 'Penalizado por clima adverso (0.5x)' }
    if (isSunActive) return { type: 'boosted', text: 'Carga instantánea por Sol/Horario.' }
  }
  return null
})
</script>

<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ getMoveDescription(move.name, MOVE_DATA[move.name]) }}
    </div>
    <div
      v-if="modifierInfo"
      class="move-modifier"
      :class="modifierInfo.type"
    >
      {{ modifierInfo.text }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.move-tooltip-rich {
  font-family: var(--font-ui);
  font-size: 11px;
  line-height: 1.5;
  color: Rgba(255, 255, 255, 0.95);
  max-width: 220px;
  padding: 4px;
  font-weight: 500;
}

.move-modifier {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  font-size: 10px;
  font-weight: bold;
  
  &.boosted { color: $coin-gold; }
  &.penalized { color: #ff4444; }
}
</style>
