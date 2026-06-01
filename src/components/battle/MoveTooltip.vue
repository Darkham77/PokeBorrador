<!-- [PureVue-Ignore-Length] -->
<script setup lang="ts">

import { computed } from 'vue'
import { MOVE_DATA } from '@/data/moves'
import { getMoveDescription } from '@/logic/pokemonUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/timeUtils'
import { useBattleStore } from '@/stores/battle'
import { calculateDamagePure, type PurePokemon, type PureMove } from '@/logic/battle/battleMath'
import type { Move } from '@/types/pokemon'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

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

  const moveId = m.id || (m.name ? pokemonDataProvider.resolveMoveId(m.name) : '')

  if (moveId === 'thunder' || moveId === 'hurricane') {
    const isThunderstorm = weather?.toLowerCase() === 'thunderstorm'
    if (isSunny) return { type: 'penalized', text: 'Penalizado por Clima Soleado (Precisión 50%)' }
    if (isRaining || isThunderstorm) return { type: 'boosted', text: `Potenciado por ${isThunderstorm ? 'Tormenta Eléctrica' : 'Lluvia'} (¡No falla!)` }
  }
  
  if (moveId === 'blizzard') {
    if (isSnowing) return { type: 'boosted', text: 'Potenciado por Granizo/Ventisca (¡No falla!)' }
  }

  // 2. Charging Moves (Solar)
  if (moveId === 'solar_beam' || moveId === 'solar_blade') {
    if (mechWeather !== WEATHER_MECHANICAL.CLEAR && !isSunActive) return { type: 'penalized', text: 'Penalizado por clima adverso (0.5x y requiere carga)' }
    if (isSunActive) return { type: 'boosted', text: 'Carga instantánea por Sol/Horario.' }
  }

  // 3. Weather Ball
  if (moveId === 'weather_ball') {
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

const activeDetails = computed(() => {
  if (!battleStore.isBattleActive) return null

  const m = props.move
  const attacker = battleStore.state?.player
  const defender = battleStore.state?.enemy
  const weather = battleStore.state?.weather
  const mechWeather = getMechanicalWeather(weather?.type)
  const cycle = getDayCycle()

  if (!attacker) return null

  // 1. Power computation
  const moveIdLookup = m.id || (m.name ? pokemonDataProvider.resolveMoveId(m.name) : '')
  const md = (MOVE_DATA as Record<string, { power?: number; acc?: number; cat?: string; type?: string }>)[moveIdLookup] || {}
  const basePower = m.power !== undefined ? m.power : md.power || 0
  const isStatus = m.cat === 'status' || md.cat === 'status'

  let currentPower = basePower
  const powerList: { label: string; mult: number }[] = []

  const moveType = (m.type || md.type || 'normal').toLowerCase()
  if (basePower > 0) {
    // STAB
    if (moveType === attacker.type?.toLowerCase() || moveType === attacker.type2?.toLowerCase()) {
      const stab = attacker.ability === 'Adaptable' ? 2.0 : 1.5
      powerList.push({ label: `STAB (${m.type})`, mult: stab })
      currentPower *= stab
    }

    // Weather
    if (weather && weather.turns !== 0) {
      const wType = weather.type.toLowerCase()
      let weatherMult = 1
      if (mechWeather === WEATHER_MECHANICAL.SUN) {
        if (moveType === 'fire') weatherMult = 1.5
        if (moveType === 'water') weatherMult = (wType === 'heatwave') ? 0 : 0.5
      } else if (mechWeather === WEATHER_MECHANICAL.RAIN) {
        if (moveType === 'water') weatherMult = 1.5
        if (moveType === 'fire') weatherMult = (wType === 'storm' || wType === 'heavy_rain') ? 0 : 0.5
        if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
      } else if (wType === 'thunderstorm') {
        if (moveType === 'electric' || moveType === 'dragon') weatherMult = 1.5
      }

      if (weatherMult !== 1) {
        powerList.push({ label: `Clima (${weather.type})`, mult: weatherMult })
        currentPower *= weatherMult
      }
    }

    // Solar Beam
    if (m.id === 'solar_beam' && weather && weather.turns !== 0) {
      const isSun = mechWeather === WEATHER_MECHANICAL.SUN
      const isClear = mechWeather === WEATHER_MECHANICAL.CLEAR && weather.type !== 'thunderstorm'
      if (!isSun && !isClear) {
        powerList.push({ label: 'Rayo Solar Clima', mult: 0.5 })
        currentPower *= 0.5
      }
    }

    // Day cycle
    if (weather && (mechWeather === WEATHER_MECHANICAL.CLEAR || !weather)) {
      let cycleMult = 1
      if ((cycle === 'day' || cycle === 'morning') && moveType === 'fire') cycleMult = 1.2
      if ((cycle === 'night' || cycle === 'dusk') && moveType === 'water') cycleMult = 1.2
      if (cycleMult !== 1) {
        powerList.push({ label: `Horario (${cycle})`, mult: cycleMult })
        currentPower *= cycleMult
      }
    }

    // Attacker Ability
    let abilMult = 1
    const isLowHp = attacker.hp <= (attacker.maxHp / 3)
    if (isLowHp) {
      if (attacker.ability === 'Mar llamas' && moveType === 'fire') abilMult = 1.5
      if (attacker.ability === 'Torrente' && moveType === 'water') abilMult = 1.5
      if (attacker.ability === 'Espesura' && moveType === 'grass') abilMult = 1.5
      if (attacker.ability === 'Enjambre' && moveType === 'bug') abilMult = 1.5
    }
    if (attacker.ability === 'Experto' && basePower <= 60) {
      abilMult *= 1.5
    }
    if (weather && weather.turns !== 0 && attacker.ability === 'Fuerza arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
      if (moveType === 'ground' || moveType === 'rock' || moveType === 'steel') {
        abilMult *= 1.3
      }
    }
    if (abilMult !== 1) {
      powerList.push({ label: `Habilidad (${attacker.ability})`, mult: abilMult })
      currentPower *= abilMult
    }

    // Defender Ability
    if (defender && defender.ability === 'Sebo' && (moveType === 'fire' || moveType === 'ice')) {
      powerList.push({ label: 'Habilidad Rival (Sebo)', mult: 0.5 })
      currentPower *= 0.5
    }

    // Held Item
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
      let itemMult = 1
      if (typeBoosters[h] === moveType) itemMult = 1.2
      if (h === 'choice_band' && m.cat === 'physical') itemMult = 1.5
      
      if (itemMult !== 1) {
        powerList.push({ label: `Objeto (${h})`, mult: itemMult })
        currentPower *= itemMult
      }
    }
  }

  const finalPower = Math.max(1, Math.round(currentPower))

  // 2. Accuracy computation
  const baseAcc = m.acc !== undefined ? m.acc : md.acc || 0
  let currentAcc = baseAcc
  const accList: { label: string; mult: number | string }[] = []

  if (baseAcc > 0 && baseAcc < 1000) {
    const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
    const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))
    const isThunderstorm = weather?.type === 'thunderstorm'

    if ((isRainActive || isThunderstorm) && (m.id === 'thunder' || m.id === 'hurricane')) {
      currentAcc = 100
      accList.push({ label: 'Lluvia (¡No falla!)', mult: '100%' })
    } else if (isSunActive && (m.id === 'thunder' || m.id === 'hurricane')) {
      currentAcc = 50
      accList.push({ label: 'Sol (Precisión 50%)', mult: '0.5' })
    } else if ((mechWeather === WEATHER_MECHANICAL.HAIL || mechWeather === WEATHER_MECHANICAL.SNOW) && m.id === 'blizzard') {
      currentAcc = 100
      accList.push({ label: 'Nieve (¡No falla!)', mult: '100%' })
    } else if (mechWeather === WEATHER_MECHANICAL.FOG) {
      const isMist = weather?.type === "mist" || weather?.type === "mist_visual"
      const factor = isMist ? 0.8 : 0.6
      currentAcc = Math.floor(baseAcc * factor)
      accList.push({ label: `Niebla/Bruma`, mult: factor })
    }

    const accStage = battleStore.playerStages?.acc || 0
    const evaStage = battleStore.enemyStages?.eva || 0

    if (accStage !== 0) {
      const factor = 1 + (0.33 * accStage)
      accList.push({ label: `Rango Prec. (${accStage > 0 ? '+' : ''}${accStage})`, mult: factor })
      currentAcc *= factor
    }

    if (evaStage !== 0) {
      const factor = 1 - (0.33 * evaStage)
      accList.push({ label: `Rango Eva. Rival (${evaStage > 0 ? '+' : ''}${evaStage})`, mult: factor })
      currentAcc *= factor
    }
  }

  const finalAccuracy = Math.max(0, Math.min(100, Math.round(currentAcc)))

  // 3. Type effectiveness & damage estimation against defender
  let effectiveness = null
  let damageRange = null

  const pureAttacker = attacker as unknown as PurePokemon
  const pureDefender = defender as unknown as PurePokemon
  const pureMove: PureMove = {
    id: m.id,
    name: m.name,
    type: m.type || md.type || 'normal',
    power: basePower,
    cat: (m.cat || md.cat || 'physical') as PureMove['cat'],
    effect: typeof m.effect === 'string' ? m.effect : undefined
  }

  const pureCtx = {
    atkStages: battleStore.playerStages?.atk || 0,
    defStages: battleStore.enemyStages?.def || 0,
    weather: weather ? { type: weather.type, turns: weather.turns } : null
  }

  if (defender) {
    const sim = calculateDamagePure(pureAttacker, pureDefender, pureMove, pureCtx, cycle, 1.0, false)
    const eff = sim.eff
    let effLabel = 'Neutro'
    let effClass = 'neutral'
    if (eff > 1) {
      effLabel = 'Súper eficaz'
      effClass = 'boosted'
    } else if (eff < 1 && eff > 0) {
      effLabel = 'Poco eficaz'
      effClass = 'penalized'
    } else if (eff === 0) {
      effLabel = 'Inmune'
      effClass = 'penalized'
    }

    effectiveness = {
      value: eff,
      label: effLabel,
      class: effClass
    }

    if (!isStatus && basePower > 0) {
      const normalMin = calculateDamagePure(pureAttacker, pureDefender, pureMove, pureCtx, cycle, 0.85, false).dmg
      const normalMax = calculateDamagePure(pureAttacker, pureDefender, pureMove, pureCtx, cycle, 1.0, false).dmg

      const critMin = calculateDamagePure(pureAttacker, pureDefender, pureMove, pureCtx, cycle, 0.85, true).dmg
      const critMax = calculateDamagePure(pureAttacker, pureDefender, pureMove, pureCtx, cycle, 1.0, true).dmg

      const rivalMaxHp = defender.maxHp || 100
      const normalPctMin = Math.round((normalMin / rivalMaxHp) * 100)
      const normalPctMax = Math.round((normalMax / rivalMaxHp) * 100)
      const critPctMin = Math.round((critMin / rivalMaxHp) * 100)
      const critPctMax = Math.round((critMax / rivalMaxHp) * 100)

      damageRange = {
        normalMin,
        normalMax,
        normalPctMin,
        normalPctMax,
        critMin,
        critMax,
        critPctMin,
        critPctMax
      }
    }
  }

  // 4. Critical hit rate
  let critRate = 0.0625
  if (attacker.heldItem === 'scope_lens') critRate = 0.12
  if (attacker.focusEnergy) critRate = 0.25
  if (defender && (defender.ability === 'Caparazón' || defender.ability === 'Armadura Batalla')) {
    critRate = 0
  }

  const critVal = (critRate * 100).toFixed(2).replace('.00', '')
  const critClass = critRate > 0.0625 ? 'boosted' : (critRate === 0 ? 'penalized' : 'neutral')

  return {
    isStatus,
    power: {
      base: basePower,
      final: isStatus ? '-' : finalPower,
      list: powerList,
      class: isStatus ? '' : (finalPower > basePower ? 'boosted' : (finalPower < basePower ? 'penalized' : ''))
    },
    accuracy: {
      base: baseAcc,
      final: baseAcc === 1000 ? 1000 : finalAccuracy,
      list: accList,
      class: baseAcc === 1000 ? '' : (finalAccuracy > baseAcc ? 'boosted' : (finalAccuracy < baseAcc ? 'penalized' : ''))
    },
    effectiveness,
    critChance: {
      value: critVal,
      class: critClass
    },
    damageRange
  }
})

const parsedStatusEffect = computed(() => {
  if (!battleStore.isBattleActive) return null

  const m = props.move
  const attacker = battleStore.state?.player
  const defender = battleStore.state?.enemy
  if (!attacker) return null

  const moveIdLookup = m.id || (m.name ? pokemonDataProvider.resolveMoveId(m.name) : '')
  const md = (MOVE_DATA as Record<string, { effect?: string; cat?: string }>)[moveIdLookup] || {}
  const effectStr = (m.effect || md.effect) as string | undefined

  if (!effectStr || typeof effectStr !== 'string') return null

  // 1. Mapear efectos tipo stat_up/stat_down
  const statMatch = effectStr.match(/stat_(up|down)_(self|enemy)_([a-z0-9_]+)/)
  if (statMatch) {
    const [, direction, target, statKey] = statMatch
    if (!direction || !target || !statKey) return null

    const isUp = direction === 'up'
    const isSelf = target === 'self'

    // Determinar cantidad de niveles (por ejemplo, _2 al final de iron_defense_2 o similar)
    let stat = statKey
    let amount = 1
    if (statKey.endsWith('_2')) {
      stat = statKey.substring(0, statKey.length - 2)
      amount = 2
    } else if (statKey.endsWith('_3')) {
      stat = statKey.substring(0, statKey.length - 2)
      amount = 3
    }

    // Si tiene sufijos de probabilidad (ej. _10 o _20), los extraemos pero no cambian el nivel base de 1
    if (stat.endsWith('_10')) stat = stat.substring(0, stat.length - 3)
    if (stat.endsWith('_20')) stat = stat.substring(0, stat.length - 3)
    if (stat.endsWith('_30')) stat = stat.substring(0, stat.length - 3)
    if (stat.endsWith('_50')) stat = stat.substring(0, stat.length - 3)

    // Map stat key to Spanish name
    const statNames: Record<string, string> = {
      atk: 'Ataque',
      def: 'Defensa',
      spa: 'At. Especial',
      spd: 'Def. Especial',
      spe: 'Velocidad',
      acc: 'Precisión',
      eva: 'Evasión',
      all: 'Todos los Stats'
    }
    const statName = statNames[stat] || stat.toUpperCase()

    // Determinar Pokémon objetivo y sus stages
    const targetPokemon = isSelf ? attacker : defender
    const targetStages = isSelf ? battleStore.playerStages : battleStore.enemyStages
    
    if (!targetPokemon) return null

    const currentStage = targetStages ? (targetStages[stat as keyof typeof targetStages] || 0) as number : 0
    const finalStage = Math.max(-6, Math.min(6, currentStage + (isUp ? amount : -amount)))

    // Multiplicadores
    const getStageMultiplier = (stage: number) => {
      if (stat === 'acc' || stat === 'eva') {
        if (stage >= 0) return (3 + stage) / 3
        return 3 / (3 - stage)
      }
      if (stage >= 0) return (2 + stage) / 2
      return 2 / (2 - stage)
    }

    const baseStatVal = (stat === 'acc' || stat === 'eva') ? 100 : ((targetPokemon as unknown as Record<string, number>)[stat] || 100)
    const initialStatVal = Math.round(baseStatVal * getStageMultiplier(currentStage))
    const finalStatVal = Math.round(baseStatVal * getStageMultiplier(finalStage))
    const suffix = (stat === 'acc' || stat === 'eva') ? '%' : ''

    return {
      isCondition: false,
      isSelf,
      direction,
      stat,
      statName,
      amount,
      targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
      currentStage,
      finalStage,
      initialStatVal: initialStatVal + suffix,
      finalStatVal: finalStatVal + suffix,
      label: `${isUp ? 'Aumenta' : 'Reduce'} ${statName} en ${amount} ${amount === 1 ? 'nivel' : 'niveles'}`,
      effect: undefined,
      details: undefined
    }
  }

  // 2. Mapear efectos tipo status condition / condiciones de combate específicas
  const conditionDescriptions: Record<string, { label: string; effect: string; details: string; isSelf: boolean }> = {
    'poison': {
      label: 'Envenenamiento',
      effect: 'Estado Alterado (PSN)',
      details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno.',
      isSelf: false
    },
    'bad_poison': {
      label: 'Envenenamiento Grave',
      effect: 'Estado Alterado (TÓXICO)',
      details: 'El objetivo pierde PS progresivamente: empieza en 1/16 y aumenta en 1/16 cada turno consecutivo.',
      isSelf: false
    },
    'burn': {
      label: 'Quemadura',
      effect: 'Estado Alterado (BRN)',
      details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno. Además, reduce a la mitad (x0.5) su Ataque Físico.',
      isSelf: false
    },
    'paralyze': {
      label: 'Parálisis',
      effect: 'Estado Alterado (PAR)',
      details: 'Reduce la Velocidad del objetivo al 50% (x0.5) y otorga un 25% de probabilidad de no atacar en cada turno.',
      isSelf: false
    },
    'sleep': {
      label: 'Sueño',
      effect: 'Estado Alterado (SLP)',
      details: 'El objetivo se duerme durante 1 a 3 turnos, impidiéndole atacar por completo.',
      isSelf: false
    },
    'freeze': {
      label: 'Congelación',
      effect: 'Estado Alterado (FRZ)',
      details: 'El objetivo queda congelado e incapaz de moverse. Cada turno tiene un 20% de probabilidad de descongelarse.',
      isSelf: false
    },
    'confuse': {
      label: 'Confusión',
      effect: 'Estado Volátil',
      details: 'El objetivo se confunde durante 1 a 4 turnos. En cada turno, tiene una probabilidad del 33% de golpearse a sí mismo (daño físico de potencia 40).',
      isSelf: false
    },
    'leech_seed': {
      label: 'Semilla Drenadora',
      effect: 'Efecto de Campo Volátil',
      details: 'Al final de cada turno, el objetivo pierde 1/8 (12.5%) de sus PS máximos y se los transfiere al usuario.',
      isSelf: false
    },
    'heal_50': {
      label: 'Recuperación de Salud',
      effect: 'Efecto de Curación',
      details: 'Restaura el 50% de los PS máximos del usuario de forma inmediata.',
      isSelf: true
    },
    'reset_stats': {
      label: 'Niebla / Reinicio',
      effect: 'Efecto de Limpieza',
      details: 'Elimina todos los cambios en los rangos de estadísticas (ataque, defensa, velocidad, etc.) de todos los Pokémon activos y los devuelve a +0.',
      isSelf: true
    }
  }

  const cond = conditionDescriptions[effectStr]
  if (cond) {
    return {
      isCondition: true,
      isSelf: cond.isSelf,
      direction: cond.isSelf ? 'up' : 'down',
      targetName: cond.isSelf ? 'Usuario (Tú)' : 'Rival',
      label: cond.label,
      effect: cond.effect,
      details: cond.details,
      stat: undefined,
      statName: undefined,
      amount: undefined,
      currentStage: undefined,
      finalStage: undefined,
      initialStatVal: undefined,
      finalStatVal: undefined
    }
  }

  return null
})

const moveDescriptionText = computed(() => {
  const m = props.move
  const moveId = m.id || (m.name ? pokemonDataProvider.resolveMoveId(m.name) : '')
  const moveDataObj = MOVE_DATA[moveId]
  return getMoveDescription(m.name, moveDataObj)
})
</script>

<template>
  <div class="move-tooltip-rich">
    <div class="move-desc">
      {{ moveDescriptionText }}
    </div>
    <div
      v-if="modifierInfo"
      class="move-modifier"
      :class="modifierInfo.type"
    >
      {{ modifierInfo.text }}
    </div>

    <!-- Advanced Combat Calculations Dashboard -->
    <div
      v-if="battleStore.isBattleActive && activeDetails"
      class="move-details-calc"
    >
      <div class="calc-section-title">
        ESTADÍSTICAS EN COMBATE
      </div>
      
      <!-- Premium Grid Layout for Stats -->
      <div class="combat-stats-grid">
        <!-- Power Box -->
        <div class="stat-box">
          <span class="stat-lbl">POTENCIA</span>
          <span
            class="stat-val"
            :class="activeDetails.power.class"
          >
            <template v-if="activeDetails.power.base === activeDetails.power.final || activeDetails.power.final === '-'">
              {{ activeDetails.power.final }}
            </template>
            <template v-else>
              {{ activeDetails.power.base }} ➔ {{ activeDetails.power.final }}
              <span
                v-if="activeDetails.power.class === 'boosted'"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.power.class === 'penalized'"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>
        
        <!-- Accuracy Box -->
        <div class="stat-box">
          <span class="stat-lbl">PRECISIÓN</span>
          <span
            class="stat-val"
            :class="activeDetails.accuracy.class"
          >
            <template v-if="activeDetails.accuracy.base === activeDetails.accuracy.final">
              {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }}
            </template>
            <template v-else>
              {{ activeDetails.accuracy.base === 1000 ? '♾️' : activeDetails.accuracy.base + '%' }} ➔ 
              {{ activeDetails.accuracy.final === 1000 ? '♾️' : activeDetails.accuracy.final + '%' }}
              <span
                v-if="activeDetails.accuracy.class === 'boosted'"
                class="arrow up"
              >▲</span>
              <span
                v-if="activeDetails.accuracy.class === 'penalized'"
                class="arrow down"
              >▼</span>
            </template>
          </span>
        </div>

        <!-- Effectiveness Box -->
        <div
          v-if="!activeDetails.isStatus"
          class="stat-box"
        >
          <span class="stat-lbl">EF. CONTRA RIVAL</span>
          <span
            v-if="activeDetails.effectiveness !== null"
            class="stat-val"
            :class="activeDetails.effectiveness.class"
          >
            x{{ activeDetails.effectiveness.value }}
          </span>
          <span
            v-else
            class="stat-val"
          >-</span>
        </div>

        <!-- Critical Box -->
        <div
          v-if="!activeDetails.isStatus"
          class="stat-box"
        >
          <span class="stat-lbl">PROB. CRÍTICO</span>
          <span
            class="stat-val"
            :class="activeDetails.critChance.class"
          >
            {{ activeDetails.critChance.value }}%
          </span>
        </div>
      </div>

      <!-- Status Effect Details -->
      <div
        v-if="activeDetails.isStatus && parsedStatusEffect"
        class="status-effect-box"
      >
        <div class="calc-section-title">
          EFECTO DE ESTADO
        </div>
        
        <!-- Si es condición persistente/volátil (Envenenado, Drenadoras, etc.) -->
        <template v-if="parsedStatusEffect.isCondition">
          <div class="status-grid-2col">
            <!-- Box 1: Objetivo -->
            <div class="status-col-box">
              <span class="status-col-lbl">APLICADO A</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.targetName }}
              </span>
            </div>
            
            <!-- Box 2: Estado -->
            <div class="status-col-box">
              <span class="status-col-lbl">ESTADO</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.label }}
              </span>
            </div>
          </div>

          <!-- Description Box (Full Width) -->
          <div class="status-desc-box">
            <span class="status-col-lbl">DETALLE DE COMBATE</span>
            <div class="status-desc-text">
              {{ parsedStatusEffect.details }}
            </div>
          </div>
        </template>

        <!-- Si es cambio de estadísticas (Gruñido, Fortaleza, etc.) -->
        <template v-else>
          <div class="status-grid-2col">
            <!-- Box 1: Objetivo -->
            <div class="status-col-box">
              <span class="status-col-lbl">APLICADO A</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.isSelf ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.isSelf ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.isSelf ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.targetName }}
              </span>
            </div>

            <!-- Box 2: Estadística -->
            <div class="status-col-box">
              <span class="status-col-lbl">ESTADÍSTICA</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
              >
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
                {{ parsedStatusEffect.statName }}
              </span>
            </div>

            <!-- Box 3: RANGO (STAGE) -->
            <div class="status-col-box">
              <span class="status-col-lbl">RANGO (STAGE)</span>
              <span
                class="status-col-val"
                :class="parsedStatusEffect.direction === 'up' ? 'boosted' : 'penalized'"
              >
                {{ (parsedStatusEffect.currentStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.currentStage ?? 0 }} ➔ 
                {{ (parsedStatusEffect.finalStage ?? 0) >= 0 ? '+' : '' }}{{ parsedStatusEffect.finalStage ?? 0 }}
                <span
                  class="arrow"
                  :class="parsedStatusEffect.direction === 'up' ? 'up' : 'down'"
                >
                  {{ parsedStatusEffect.direction === 'up' ? '▲' : '▼' }}
                </span>
              </span>
            </div>

            <!-- Box 4: Valor Neto -->
            <div
              v-if="parsedStatusEffect.stat !== 'all'"
              class="status-col-box"
            >
              <span class="status-col-lbl">VALOR NETO</span>
              <span class="status-col-val">
                {{ parsedStatusEffect.initialStatVal }} ➔ {{ parsedStatusEffect.finalStatVal }}
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- Active Modifiers Section -->
      <div 
        v-if="!activeDetails.isStatus && (activeDetails.power.list.length > 0 || activeDetails.accuracy.list.length > 0)" 
        class="modifiers-section"
      >
        <div class="calc-section-title">
          MODIFICADORES ACTIVOS
        </div>
        <div class="breakdown-list">
          <div
            v-for="item in activeDetails.power.list"
            :key="item.label"
            class="breakdown-item"
          >
            <span :class="item.mult >= 1 ? 'boosted' : 'penalized'">{{ item.mult >= 1 ? '▲' : '▼' }}</span>
            POT: {{ item.label }} <span :class="item.mult > 1 ? 'boosted' : 'penalized'">x{{ item.mult.toFixed(2).replace('.00', '') }}</span>
          </div>
          <div
            v-for="item in activeDetails.accuracy.list"
            :key="item.label"
            class="breakdown-item"
          >
            <span :class="((typeof item.mult === 'number' && item.mult >= 1) || item.mult === '100%') ? 'boosted' : 'penalized'">
              {{ ((typeof item.mult === 'number' && item.mult >= 1) || item.mult === '100%') ? '▲' : '▼' }}
            </span>
            PREC: {{ item.label }} <span :class="(typeof item.mult === 'number' && item.mult > 1) || item.mult === '100%' ? 'boosted' : 'penalized'">
              {{ typeof item.mult === 'number' ? `x${item.mult.toFixed(2).replace('.00', '')}` : item.mult }}
            </span>
          </div>
        </div>
      </div>

      <!-- Estimated Damage Section -->
      <div
        v-if="activeDetails.damageRange"
        class="damage-section"
      >
        <div class="calc-section-title">
          DAÑO ESTIMADO
        </div>
        <div class="damage-grid">
          <!-- Normal Damage Row -->
          <div class="dmg-label">
            NORMAL:
          </div>
          <div class="dmg-value-group">
            <span class="hp-range">{{ activeDetails.damageRange.normalMin }} - {{ activeDetails.damageRange.normalMax }} HP</span>
            <span class="pct-range">({{ activeDetails.damageRange.normalPctMin }}% - {{ activeDetails.damageRange.normalPctMax }}% de vida)</span>
          </div>

          <!-- Critical Damage Row -->
          <div class="dmg-label">
            CRÍTICO:
          </div>
          <div class="dmg-value-group crit">
            <span class="hp-range">{{ activeDetails.damageRange.critMin }} - {{ activeDetails.damageRange.critMax }} HP</span>
            <span class="pct-range">({{ activeDetails.damageRange.critPctMin }}% - {{ activeDetails.damageRange.critPctMax }}% de vida)</span>
          </div>
        </div>
      </div>
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
  max-width: 260px;
  min-width: 220px;
  padding: 2px;
}

.move-desc {
  word-break: break-word;
}

.move-modifier {
  @include pixelated;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid Rgba(255, 255, 255, 0.15);
  font-size: 8px;
  
  &.boosted { color: var(--yellow); }
  &.penalized { color: $red; }
}

.move-details-calc {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed Rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.calc-section-title {
  font-size: 7.5px;
  color: var(--yellow);
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.combat-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.stat-box {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .stat-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
  }

  .stat-val {
    font-size: 8px;
    font-weight: bold;
    color: white;
    white-space: nowrap;

    &.boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
    }

    &.penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
    }
  }
}

.modifiers-section {
  background: Rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 4px 6px;
  border: 1px dotted Rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 2px;
}

.breakdown-item {
  font-size: 7.5px;
  color: Rgba(255, 255, 255, 0.6);

  .boosted { color: #10B981; font-weight: bold; }
  .penalized { color: #EF4444; font-weight: bold; }
}

.damage-section {
  border-top: 1px dotted Rgba(255, 255, 255, 0.15);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.damage-grid {
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 4px 8px;
  align-items: center;
}

.dmg-label {
  font-size: 7.5px;
  color: Rgba(255, 255, 255, 0.6);
  font-weight: bold;
}

.dmg-value-group {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;

  .hp-range {
    font-size: 8px;
    font-weight: bold;
    color: white;
  }

  .pct-range {
    font-size: 6.5px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1;
    margin-top: 1px;
  }

  &.crit {
    .hp-range {
      color: #FBBF24;
      text-shadow: 0 0 3px Rgba(251, 191, 36, 0.3);
    }
  }
}

.status-effect-box {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.status-col-box {
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .status-col-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-col-val {
    font-size: 8px;
    font-weight: bold;
    color: white;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 3px;

    &.boosted {
      color: #10B981;
      text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
    }

    &.penalized {
      color: #EF4444;
      text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
    }
  }
}

.status-desc-box {
  margin-top: 4px;
  background: Rgba(0, 0, 0, 0.15);
  border: 1px dotted Rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .status-col-lbl {
    font-size: 6px;
    color: Rgba(255, 255, 255, 0.5);
    font-weight: bold;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  .status-desc-text {
    font-size: 7.5px;
    line-height: 1.3;
    color: Rgba(255, 255, 255, 0.8);
    word-break: break-word;
  }
}

.arrow {
  display: inline-flex;
  align-items: center;
  font-size: 8px;
  margin-right: 1px;
  
  &.up {
    color: #10B981;
    text-shadow: 0 0 2px Rgba(16, 185, 129, 0.4);
  }
  
  &.down {
    color: #EF4444;
    text-shadow: 0 0 2px Rgba(239, 68, 68, 0.4);
  }
}
</style>
