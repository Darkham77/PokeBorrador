<script setup lang="ts">

import { computed } from 'vue'
import { MOVE_DATA } from '@/data/moves'
import { getMoveDescription } from '@/logic/pokemonUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/battle/weatherMapper'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'

interface Props {
  move: any
}

const props = defineProps<Props>()

const battleStore = useBattleStore() as any

const modifierInfo = computed(() => {
  if (!battleStore.isBattleActive) return null
  
  const m = props.move
  const weather = battleStore.state?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = getDayCycle()

  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunny = mechWeather === WEATHER_MECHANICAL.SUN
  const isDayTime = cycle === 'day' || cycle === 'morning'
  const isNightTime = cycle === 'night' || cycle === 'dusk'

  const isSunActive = isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime)
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime)

  const moveName = (m.name || '').toLowerCase()

  // Trueno (Thunder) and Vendaval (Hurricane) are always boosted in Rain, penalized in Sun
  if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
    if (isSunny) return { type: 'penalized', text: 'Penalizado por Clima Soleado (Precisión 50%)' }
    if (isRaining) return { type: 'boosted', text: 'Potenciado por Lluvia (¡No falla!)' }
    return null
  }

  // Rayo Solar (Solar Beam) and Cuchilla Solar (Solar Blade)
  if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return { type: 'penalized', text: 'Penalizado por clima adverso (0.5x)' }
    if (isSunActive) return { type: 'boosted', text: 'Carga instantánea por Sol/Horario.' }
  }

  // Meteorobola (Weather Ball)
  if (moveName === 'meteorobola' || moveName === 'weather ball') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return { type: 'boosted', text: 'Potencia duplicada por clima.' }
  }

  // Status moves don't get weather/cycle damage multipliers (except explicit ones above)
  if (m.cat === 'status') return null

  if (m.type === 'fire') {
    if (mechWeather === WEATHER_MECHANICAL.RAIN) return { type: 'penalized', text: 'Penalizado por Lluvia (0.5x)' }
    if (isSunActive) return { type: 'boosted', text: `Potenciado por ${mechWeather === WEATHER_MECHANICAL.SUN ? 'Sol' : 'Horario'} (1.5x/1.2x)` }
  }
  if (m.type === 'water') {
    if (mechWeather === WEATHER_MECHANICAL.SUN) return { type: 'penalized', text: 'Penalizado por Sol (0.5x)' }
    if (isRainActive) return { type: 'boosted', text: `Potenciado por ${mechWeather === WEATHER_MECHANICAL.RAIN ? 'Lluvia' : 'Horario'} (1.5x/1.2x)` }
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
