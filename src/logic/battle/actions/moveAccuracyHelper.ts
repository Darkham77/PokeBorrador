import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/utils/timeUtils'

export function checkMoveAccuracy(
  store: BattleContext,
  attacker: Pokemon,
  defender: Pokemon,
  attackerStages: BattleStages,
  defenderStages: BattleStages,
  executableMove: Move
): boolean {
  void defender
  const moveAcc = executableMove.acc || 100
  if (moveAcc >= 100 || attacker.lockOn) return true

  const accStage = attackerStages.acc || 0
  const evaStage = defenderStages.eva || 0
  const weather = store.activeBattle.value?.weather?.type
  const mechWeather = getMechanicalWeather(weather)
  const cycle = store.activeBattle.value?.isGym ? 'day' : getDayCycle()
  const isRaining = mechWeather === WEATHER_MECHANICAL.RAIN
  const isSunnyActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
  const isRainActive = isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))
  let finalAcc = moveAcc

  const isThunderstorm = weather === 'thunderstorm'
  if ((isRainActive || isThunderstorm) && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 100
  else if (isSunnyActive && (executableMove.id === 'thunder' || executableMove.id === 'hurricane')) finalAcc = 50
  else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && executableMove.id === 'blizzard') finalAcc = 100
  else if (mechWeather === WEATHER_MECHANICAL.FOG) {
    const isMist = weather === 'mist' || weather === 'mist_visual'
    finalAcc = Math.floor(moveAcc * (isMist ? 0.8 : 0.6))
  }

  finalAcc = finalAcc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage))
  if (Math.random() * 100 > finalAcc) {
    store.addLog(`¡El ataque de ${attacker.name} falló!`, 'log-info', attacker)
    return false
  }

  if (attacker.lockOn) attacker.lockOn = false
  return true
}
