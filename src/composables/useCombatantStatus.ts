import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { useBattleStore } from '@/stores/battle'
import { STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP, STATUS_EMOJI_MAP, STATUS_NAME_MAP } from '@/logic/battle/battleUiUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherMechanical } from '@/logic/weather/weatherRegistry'
import { getDayCycle } from '@/logic/timeUtils'
import { ABILITY_DATA } from '@/data/abilities'
import { getStatMultiplier } from '@/logic/battle/battleEngine'
import type { Pokemon } from '@/types/pokemon'

export interface UnifiedStatus {
  id: string
  emoji: string
  title: string
  description: string
  count?: number | string
  class: string
  isBoosted?: boolean
}

export function useCombatantStatus(
  pokemonRef: MaybeRefOrGetter<Pokemon | null | undefined>,
  battleStore: ReturnType<typeof useBattleStore>,
  isPlayer: MaybeRefOrGetter<boolean>
) {
  const p = computed(() => toValue(pokemonRef))
  const isPlayerVal = computed(() => toValue(isPlayer))

  const activeStages = computed(() => {
    const s = isPlayerVal.value ? battleStore.playerStages : battleStore.enemyStages
    if (!s) return []
    
    const results = []
    const keys = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva']
    
    for (const key of keys) {
      const val = (s as Record<string, number | undefined>)[key] || 0
      if (val !== 0) {
        const config = (STAT_EMOJI_MAP as Record<string, { icon: string; name: string }>)[key] || { icon: '❓', name: key }
        const mult = getStatMultiplier(val || 0)
        const pct = Math.round((mult - 1) * 100)
        const pctText = pct > 0 ? `+${pct}%` : `${pct}%`
        
        results.push({
          key,
          val,
          icon: config.icon,
          text: `${config.name} ${val > 0 ? '↑' : '↓'}${Math.abs(val)} (${pctText})`
        })
      }
    }

    return results
  })

  const volatileStatuses = computed(() => {
    const list = []
    const target = p.value
    if (!target) return []
    
    // 0. Habilidad Base (MANDATORIA)
    if (target.ability) {
      const ab = target.ability
      const weather = battleStore.state?.weather?.type
      const mechWeather = getMechanicalWeather(weather)
      const cycle = getDayCycle()
      
      let isAbBoosted = false
      const abEntry = (ABILITY_DATA as Record<string, { desc: string }>)[ab] || Object.entries(ABILITY_DATA).find(([k]) => k.toLowerCase() === ab.toLowerCase())?.[1]
      const abDescription = abEntry?.desc || 'Sin descripción disponible.'
      let abText = `HABILIDAD: ${ab.toUpperCase()}. ${abDescription}`

      const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'day' || cycle === 'morning'))
      const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN || (mechWeather === WEATHER_MECHANICAL.CLEAR && (cycle === 'night' || cycle === 'dusk'))

      if (ab === 'Clorofila' && isSunActive) { isAbBoosted = true; abText += ' (ACTIVA por el sol/horario)' }
      if (ab === 'Nado rápido' && isRainActive) { isAbBoosted = true; abText += ' (ACTIVA por la lluvia/horario)' }
      if (ab === 'Ímpetu arena' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) { isAbBoosted = true; abText += ' (ACTIVA por la arena)' }
      if (ab === 'Quitanieves' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) { isAbBoosted = true; abText += ' (ACTIVA por la nieve)' }

      list.push({ 
        icon: '🧠', 
        text: abText,
        isBoosted: isAbBoosted
      })
    }

    // 1. Estados Propios del Pokémon
    if (target.confused) list.push({ icon: '🌀', text: 'CONFUNDIDO: Puede golpearse a sí mismo.' })
    if (target.attracted) list.push({ icon: '❤️', text: 'ENAMORADO: Puede no atacar por atracción.' })
    if (target.cursed) list.push({ icon: '👻', text: 'MALDITO: Pierde 1/4 HP cada turno.' })
    if (target.seeded) list.push({ icon: '🌱', text: 'DRENADORAS: Pierde HP cada turno y cura al rival.' })
    if (target.badPoison) list.push({ icon: '☣️', text: 'TÓXICO: El daño del veneno aumenta cada turno.' })
    if (target.endure) list.push({ icon: '🛡️', text: 'AGUANTE: Sobrevivirá el próximo golpe fatal.' })
    if (target.trapped) list.push({ icon: '🪤', text: 'ATRAPADO: No puede escapar del combate.' })
    if (target.disabledTurns && target.disabledTurns > 0) list.push({ icon: '🚫', text: `ANULADO: Un movimiento está bloqueado (${target.disabledTurns}t).` })
    if (target.encoreTurns && target.encoreTurns > 0) list.push({ icon: '🔁', text: `OTRA VEZ: Repite el mismo movimiento (${target.encoreTurns}t).` })
    if (target.tauntTurns && target.tauntTurns > 0) list.push({ icon: '🤐', text: `MOFA: No puede usar movimientos de estado (${target.tauntTurns}t).` })
    if (target.flinched) list.push({ icon: '💫', text: 'RETROCEDER: No puede atacar este turno.' })
    if (target.protect || target.detect) list.push({ icon: '🛡️', text: 'PROTECCIÓN: Evita el daño este turno.' })
    if (target.substitute && target.substitute > 0) list.push({ icon: '🎭', text: `SUSTITUTO: Un señuelo de ${target.substitute} HP recibe el daño.` })
    if (target.destinyBond) list.push({ icon: '🔗', text: 'MISMODESTINO: Si el usuario cae, el rival también.' })
    if (target.perishSongCount !== undefined && target.perishSongCount > 0) list.push({ icon: '⏳', text: `CANTO MORTAL: El Pokémon caerá en ${target.perishSongCount} turnos.` })
    if (target.ingrain) list.push({ icon: '🌳', text: 'ARRAIGO: Recupera HP cada turno pero no puede ser retirado.' })
    if (target.focusEnergy) list.push({ icon: '🎯', text: 'FOCO ENERGÍA: Aumenta la probabilidad de golpes críticos.' })
    if (target.lockOn) list.push({ icon: '👁️', text: 'FIJAR BLANCO: El próximo ataque no fallará.' })
    if (target.isTransformed) list.push({ icon: '✨', text: 'TRANSFORMADO: Copia la apariencia y ataques del rival.' })
    if (target.rageActive) list.push({ icon: '💢', text: 'FURIA: Su Ataque sube al recibir daño.' })
    if (target.snatching) list.push({ icon: '🧤', text: 'ROBO: Robará el próximo movimiento de estado beneficioso.' })
    if (target.tormentActive) list.push({ icon: '😒', text: 'TORMENTO: No puede usar el mismo movimiento dos veces.' })
    if (target.mustRecharge) list.push({ icon: '🔋', text: 'RECARGA: Debe descansar el próximo turno.' })
    if (target.bound && target.bound > 0) list.push({ icon: '⛓️', text: `ATADURA: Sufre daño por atrapamiento (${target.bound}t).` })

    // 2. Efectos de Campo (Side-based)
    const stages = isPlayerVal.value ? battleStore.playerStages : battleStore.enemyStages
    if (stages) {
      if (stages.reflect > 0) list.push({ icon: '🪞', text: `REFLEJO: Reduce el daño físico (${stages.reflect}t).` })
      if (stages.lightScreen > 0) list.push({ icon: '💡', text: `PANTALLA LUZ: Reduce el daño especial (${stages.lightScreen}t).` })
      if (stages.safeguard > 0) list.push({ icon: '🛡️', text: `VELO SAGRADO: Protege contra estados (${stages.safeguard}t).` })
      if (stages.mist > 0) list.push({ icon: '🌫️', text: `NEBLINA: Protege contra reducción de stats (${stages.mist}t).` })
      if (stages.spikes > 0) list.push({ icon: '📍', text: `PÚAS: Daña a los Pokémon que entran al campo (${stages.spikes} capas).` })
    }

    // 3. Clima y Ciclo
    const weather = battleStore.state?.weather
    const types: string[] = []
    if (target.type) types.push(target.type.toLowerCase())
    if (target.type2) types.push(target.type2.toLowerCase())
    const moveTypes = (target.moves || []).map((m) => (m?.type || '').toLowerCase())
    const moveNames = (target.moves || []).map((m) => (m?.name || '').toLowerCase())
    const cycle = getDayCycle()

    let weatherAffects = false
    if (weather && weather.type !== 'clear') {
      const mechWeather = getMechanicalWeather(weather.type)
      const visualWeather = weather.type
      
      if (['sandstorm', 'hail', 'fog'].includes(mechWeather)) weatherAffects = true
      if (['blizzard', 'coldwave', 'fog'].includes(visualWeather)) weatherAffects = true

      if (mechWeather === 'sun' && (types.includes('fire') || types.includes('water') || types.includes('grass'))) weatherAffects = true
      if (mechWeather === 'rain' && (types.includes('fire') || types.includes('water') || types.includes('electric'))) weatherAffects = true
      if (mechWeather === 'snow' && types.includes('ice')) weatherAffects = true
      if ((mechWeather === 'wind' || visualWeather === 'strong_winds') && (types.includes('flying') || target.isFloating)) weatherAffects = true

      const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
      const rainMoves = ['thunder', 'trueno', 'hurricane', 'vendaval', 'weather ball']
      const snowMoves = ['blizzard', 'ventisca', 'aurora veil', 'velo aurora', 'cold-snap']

      if (!weatherAffects) {
        if (mechWeather === 'sun' && moveNames.some(n => sunMoves.includes(n))) weatherAffects = true
        if (mechWeather === 'rain' && moveNames.some(n => rainMoves.includes(n))) weatherAffects = true
        if (mechWeather === 'snow' && moveNames.some(n => snowMoves.includes(n))) weatherAffects = true
      }
    }

    let cycleAffects = false
    if (cycle === 'morning' || cycle === 'day') {
      const sunMoves = ['synthesis', 'síntesis', 'morning sun', 'sol beam', 'rayo solar', 'solar beam', 'solar blade', 'cuchilla solar']
      if (types.includes('fire') || types.includes('water') || moveTypes.includes('fire') || moveTypes.includes('water') || moveNames.some((n) => sunMoves.includes(n))) {
        cycleAffects = true
      }
    } else if (cycle === 'dusk' || cycle === 'night') {
      if (types.includes('water') || moveTypes.includes('water')) {
        cycleAffects = true
      }
    }

    if (weather && weather.type !== 'clear' && weatherAffects) {
      const visualType = weather.visual || weather.type
      const mechType = getMechanicalWeather(weather.type)
      const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechType as WeatherMechanical]
      if (config) {
        list.push({ icon: config.icon, text: `${config.label}: ${config.description}` })
      }
    } else if (cycleAffects) {
      const cycleData = ({
        morning: { icon: '🌅', label: 'MAÑANA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
        day: { icon: '☀️', label: 'DÍA', desc: 'Bonifica movimientos FUEGO (1.2x) y habilidades solares.' },
        dusk: { icon: '🌆', label: 'OCASO', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' },
        night: { icon: '🌙', label: 'NOCHE', desc: 'Bonifica movimientos AGUA (1.2x) y habilidades nocturnas.' }
      } as Record<string, { icon: string; label: string; desc: string }>)[cycle]
      if (cycleData) {
        list.push({ icon: cycleData.icon, text: `HORARIO (${cycleData.label}): ${cycleData.desc}` })
      }
    }

    return list
  })

  const unifiedStatuses = computed<UnifiedStatus[]>(() => {
    const list: UnifiedStatus[] = []
    const target = p.value
    if (!target) return []

    // 1. Estado Primario
    if (target.status) {
      const s = target.status.toLowerCase()
      list.push({
        id: `primary-${s}`,
        emoji: (STATUS_EMOJI_MAP as Record<string, string>)[s] || '❓',
        title: (STATUS_NAME_MAP as Record<string, string>)[s] || s.toUpperCase(),
        description: (STATUS_TOOLTIP_MAP as Record<string, string>)[s] || s,
        count: s === 'sleep' ? target.sleepTurns : undefined,
        class: s
      })
    }

    // 2. Estados Volátiles
    volatileStatuses.value.forEach((vs, idx) => {
      const parts = vs.text?.split(':') || []
      list.push({
        id: `volatile-${idx}`,
        emoji: vs.icon,
        title: parts[0]?.trim() || '',
        description: parts[1]?.trim() || vs.text || '',
        class: 'volatile',
        isBoosted: vs.isBoosted
      })
    })

    // 3. Stages
    activeStages.value.forEach((s) => {
      list.push({
        id: `stage-${s.key}`,
        emoji: s.icon,
        title: s.text?.split('(')[0]?.trim() || '',
        description: `Multiplicador actual: ${s.text?.match(/\(([^)]+)\)/)?.[1] || '100%'}`,
        class: `stage ${(s.val || 0) > 0 ? 'is-up' : 'is-down'}`
      })
    })

    return list
  })

  return {
    activeStages,
    volatileStatuses,
    unifiedStatuses
  }
}
