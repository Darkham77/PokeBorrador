import { computed } from 'vue'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/utils/timeUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { useBattleStore } from '@/stores/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

export function useMoveSlotData(
  moveRef: () => Move | null,
  playerInfoRef: () => Pokemon | null
) {
  const battleStore = useBattleStore()

  const moveData = computed(() => {
    const move = moveRef()
    if (!move) return null
    const md = (move.id ? pokemonDataProvider.getMoveData(move.id) || {} : {}) as { type?: string; power?: number; acc?: number; cat?: string };
    return {
      ...move,
      type: move.type || md.type || 'normal',
      power: move.power !== undefined ? move.power : md.power,
      acc: move.acc !== undefined ? move.acc : md.acc,
      cat: (move.cat || md.cat || 'physical') as 'physical' | 'special' | 'status'
    }
  })

  const finalPower = computed(() => {
    const md = moveData.value
    if (!md || md.power === undefined || md.power === 0) return md?.power || 0

    let power = md.power
    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const isGym = !!battleStore.state?.isGym
    const isAclimatacion = attacker?.ability === 'Aclimatación' || defender?.ability === 'Aclimatación'
    const weather = isGym || isAclimatacion ? null : battleStore.state?.weather
    const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather?.type)
    const cycle = getDayCycle()

    if (!attacker) return power

    // 1. STAB
    const moveType = md.type.toLowerCase()
    let stab = (moveType === attacker.type?.toLowerCase() || moveType === attacker.type2?.toLowerCase()) ? 1.5 : 1
    if (attacker.ability === 'Adaptable' && stab > 1) stab = 2
    power *= stab

    // 2. Weather
    let weatherMult = 1
    if (weather && weather.turns !== 0) {
      const wType = (weather.visual || weather.type).toLowerCase()
      if (mechWeather === WEATHER_MECHANICAL.SUN) {
        if (moveType === 'fire') weatherMult = 1.5
        if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5
      } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
        if (moveType === 'water') weatherMult = 1.5
        if (moveType === 'fire') weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5
      } else if (wType === 'thunderstorm') {
        if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
      }
    }

    // Solar Beam
    if (md.id === 'solar_beam' && weather && weather.turns !== 0) {
      const isSun = mechWeather === WEATHER_MECHANICAL.SUN
      const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
      if (!isSun && !isClear) {
        weatherMult *= 0.5
      }
    }

    // Day cycle
    if (weatherMult === 1 && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
      if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') weatherMult = 1.2
      if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') weatherMult = 1.2
    }

    power *= weatherMult

    // 3. Ability
    let abilMult = 1
    const isLowHp = attacker.hp <= (attacker.maxHp / 3)
    if (isLowHp) {
      if (attacker.ability === 'Mar llamas' && moveType === 'fire') abilMult = 1.5
      if (attacker.ability === 'Torrente' && moveType === 'water') abilMult = 1.5
      if (attacker.ability === 'Espesura' && moveType === 'grass') abilMult = 1.5
      if (attacker.ability === 'Enjambre' && moveType === 'bug') abilMult = 1.5
    }
    if (attacker.ability === 'Experto' && md.power <= 60) {
      abilMult *= 1.5
    }
    if (weather && weather.turns !== 0 && attacker.ability === 'Fuerza arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        abilMult *= 1.3
      }
    }
    power *= abilMult

    // 4. Defender Ability
    if (defender && defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
      power *= 0.5
    }

    // 5. Item
    let itemMult = 1
    if (attacker.heldItem) {
      const h = attacker.heldItem
      const typeBoosters: Record<string, string> = {
        charcoal: 'fire',
        magnet: 'electric',
        mystic_water: 'water',
        miracle_seed: 'grass',
        black_belt: 'fighting',
        twisted_spoon: 'psychic',
        spell_tag: 'ghost',
        silver_powder: 'bug',
        poison_barb: 'poison'
      }
      if (typeBoosters[h] === moveType) itemMult = 1.2
      if (h === 'choice_band' && md.cat === 'physical') itemMult = 1.5
    }
    power *= itemMult

    return Math.max(0, Math.round(power))
  })

  const finalAccuracy = computed(() => {
    const md = moveData.value
    if (!md || md.acc === undefined || md.acc === 1000) return md?.acc || 0

    let acc = md.acc
    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const isGym = !!battleStore.state?.isGym
    const isAclimatacion = attacker?.ability === 'Aclimatación' || defender?.ability === 'Aclimatación'
    const weather = isGym || isAclimatacion ? null : battleStore.state?.weather?.type
    const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather)
    const cycle = getDayCycle()
    const isSunActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning')))
    const isRainActive = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk')))

    const isThunderstorm = weather === 'thunderstorm'
    if ((isRainActive || isThunderstorm) && (md.id === 'thunder' || md.id === 'hurricane')) {
      acc = 100
    } else if (isSunActive && (md.id === 'thunder' || md.id === 'hurricane')) {
      acc = 50
    } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && md.id === 'blizzard') {
      acc = 100
    } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
      const isMist = weather === "mist" || weather === "mist_visual"
      acc = Math.floor(md.acc * (isMist ? 0.8 : 0.6))
    }

    const accStage = battleStore.playerStages?.acc || 0
    const evaStage = battleStore.enemyStages?.eva || 0

    acc = acc * (1 + (0.33 * accStage)) * (1 - (0.33 * evaStage))
    return Math.max(0, Math.min(100, Math.round(acc)))
  })

  const moveModifier = computed(() => {
    const md = moveData.value
    if (!md || !battleStore.isBattleActive) return null

    const attacker = playerInfoRef()
    const defender = battleStore.state?.enemy
    const isGym = !!battleStore.state?.isGym
    const isAclimatacion = attacker?.ability === 'Aclimatación' || defender?.ability === 'Aclimatación'
    const weather = isGym || isAclimatacion ? null : battleStore.state?.weather
    const mechWeather = isGym || isAclimatacion ? WEATHER_MECHANICAL.CLEAR : getMechanicalWeather(weather?.type)
    const cycle = getDayCycle()

    const isRaining = !isGym && !isAclimatacion && mechWeather === WEATHER_MECHANICAL.RAIN
    const isSunny = !isGym && !isAclimatacion && mechWeather === WEATHER_MECHANICAL.SUN
    const isSnowing = !isGym && !isAclimatacion && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)
    const isDayTime = cycle === 'day' || cycle === 'morning'
    const isNightTime = cycle === 'night' || cycle === 'dusk'

    const isSunActive = !isGym && !isAclimatacion && (isSunny || (mechWeather === WEATHER_MECHANICAL.CLEAR && isDayTime))
    const isRainActive = !isGym && !isAclimatacion && (isRaining || (mechWeather === WEATHER_MECHANICAL.CLEAR && isNightTime))

    const moveName = (md.name || '').toLowerCase()

    // 1. Accuracy Boosted
    if (moveName === 'trueno' || moveName === 'thunder' || moveName === 'vendaval' || moveName === 'hurricane') {
      if (isSunny) return 'penalized'
      if (isRaining) return 'boosted'
    }

    if (moveName === 'ventisca' || moveName === 'blizzard') {
      if (isSnowing) return 'boosted'
    }

    // 2. Solar Moves
    if (moveName === 'rayo solar' || moveName === 'solar beam' || moveName === 'cuchilla solar' || moveName === 'solar blade') {
      if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return 'penalized'
      if (isSunActive) return 'boosted'
    }

    // 3. Weather Ball
    if (moveName === 'meteorobola' || moveName === 'weather ball') {
      if (mechWeather !== WEATHER_MECHANICAL.CLEAR) return 'boosted'
    }

    // 4. Accuracy Penalties (Fog)
    if (mechWeather === WEATHER_MECHANICAL.FOG) {
      return 'penalized'
    }

    if (md.cat === 'status') return null

    // 5. Elemental
    if (md.type === 'fire') {
      if (isRaining) return 'penalized'
      if (isSunActive) return 'boosted'
    }
    if (md.type === 'water') {
      if (isSunny) return 'penalized'
      if (isRainActive) return 'boosted'
    }

    return null
  })

  return {
    moveData,
    finalPower,
    finalAccuracy,
    moveModifier
  }
}
