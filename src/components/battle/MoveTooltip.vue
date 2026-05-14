<script setup lang="ts">

import { computed } from 'vue'
import { MOVE_DATA } from '@/data/moves'
import { getMoveDescription } from '@/logic/pokemonUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import type { Move } from '@/types/pokemon'

interface Props {
  move: Move
}

const props = defineProps<Props>()

const battleStore = useBattleStore()

const modifierInfo = computed(() => {
  if (!battleStore.isBattleActive) return null
  
  const m = props.move
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
  const isSnowing = mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime)

  const moveName = (m.name || '').toLowerCase()

  if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
    const isThunderstorm = weather?.toLowerCase() === 'thunderstorm'
    if (isSunny) return { type: 'penalized', text: 'Penalizado por Clima Soleado (Precisión 50%)' }
    if (isRaining || isThunderstorm) return { type: 'boosted', text: `Potenciado por ${isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia'} (¡No falla!)` }
  }
  
  if (moveName === 'ventisca' || moveName === 'blizzard') {
    if (isSnowing) return { type: 'boosted', text: 'Potenciado por Granizo/Ventisca (¡No falla!)' }
  }

  // 2. Charging Moves (Solar)
  if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return { type: 'penalized', text: 'Penalizado por clima adverso (0.5x y requiere carga)' }
    if (isSunActive) return { type: 'boosted', text: 'Carga instantánea por Sol/Horario.' }
  }

  // 3. Weather Ball
  if (moveName === 'meteorobola' || moveName === 'weather ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'boosted', text: 'Tipo y potencia adaptados al clima (100 BP).' }
  }

  // 4. General Accuracy Warning (Fog)
  if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather?.toLowerCase() === 'mist'
    const label = isMist ? 'Bruma' : 'Niebla'
    const penalty = isMist ? '80%' : '60%'
    return { type: 'penalized', text: `Precisión reducida al ${penalty} por ${label}.` }
  }

  // Status moves don't get weather/cycle damage multipliers (except explicit ones above)
  if (m.cat === 'status') return null

  // 5. Elemental Multipliers
  if (m.type === 'fire') {
    const isExtreme = weather?.toLowerCase() === 'storm' || weather?.toLowerCase() === 'thunderstorm' || weather?.toLowerCase() === 'heavy_rain'
    if (isRaining) return { type: 'penalized', text: `Penalizado por ${isExtreme ? 'Tormenta' : 'Lluvia'} (${isExtreme ? 'x0' : '0.5x'})` }
    if (isSunActive) return { type: 'boosted', text: `Potenciado por ${isSunny ? 'Sol' : 'Horario'} (1.5x/1.2x)` }
  }
  if (m.type === 'water') {
    const isExtreme = weather?.toLowerCase() === 'heatwave' || weather?.toLowerCase() === 'intense_sun'
    if (isSunny) return { type: 'penalized', text: `Penalizado por ${isExtreme ? 'Calor Extremo' : 'Sol'} (${isExtreme ? 'x0' : '0.5x'})` }
    if (isRainActive) return { type: 'boosted', text: `Potenciado por ${isRaining ? 'Lluvia' : 'Horario'} (1.5x/1.2x)` }
  }
  return null
})
</script>

<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ getMoveDescription(move.name, (MOVE_DATA as any)[move.name]) }}
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
  @include pixelated;
  font-size: 9px;
  line-height: 1.5;
  color: Rgba(255, 255, 255, 0.95);
  max-width: 250px;
  padding: 2px;
}

.move-modifier {
  @include pixelated;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid Rgba(255, 255, 255, 0.1);
  font-size: 8px;
  
  &.boosted { color: var(--yellow); }
  &.penalized { color: $red; }
}
</style>
