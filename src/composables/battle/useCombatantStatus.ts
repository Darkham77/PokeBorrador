import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { useBattleStore } from '@/stores/battle/battle'
import { STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP, STATUS_EMOJI_MAP, STATUS_NAME_MAP } from '@/logic/battle/battleUiUtils'
import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, type WeatherMechanical } from '@/logic/weather/weatherRegistry'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getStatMultiplier } from '@/logic/battle/battleEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { VOLATILE_STATUS_LIST } from '@/data/battle/volatileStatusMap'
import { toID } from '@pkmn/sim'
import { ACTIVE_GENERATION } from '@/data/system/constants'
import { getWeatherCombatDescription } from '@/logic/weather/weatherGenerationProvider'
import { useGameStore } from '@/stores/game'
import { useProfileStore } from '@/stores/player/profile'
import { supabase } from '@/logic/db/supabase'
import { getItemName } from '@/data/inventory/items'

function formatAbilityDescription(desc: string): string {
  const lines: string[] = []
  
  const boostRegexes = [
    /aumenta la velocidad/i,
    /aumenta el ataque/i,
    /aumenta la defensa/i,
    /aumenta la precisión/i,
    /potencia el/i,
    /sube el/i,
    /potencia los/i,
    /aumenta.*un\s*\d+%/i
  ]

  const debuffRegexes = [
    /reduce/i,
    /baja/i,
    /debilita/i,
    /pierde hp/i
  ]

  const blockRegexes = [
    /evita/i,
    /inmunidad/i,
    /impide/i,
    /protege/i
  ]

  if (/[▲▼⚡🚫•]/u.test(desc)) {
    return desc
  }

  const sentences = desc.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    let matched = false
    for (const rx of blockRegexes) {
      if (rx.test(trimmed)) {
        lines.push(`🚫 ${trimmed}`)
        matched = true
        break
      }
    }
    if (matched) continue

    for (const rx of boostRegexes) {
      if (rx.test(trimmed)) {
        lines.push(`▲ ${trimmed}`)
        matched = true
        break
      }
    }
    if (matched) continue

    for (const rx of debuffRegexes) {
      if (rx.test(trimmed)) {
        lines.push(`▼ ${trimmed}`)
        matched = true
        break
      }
    }
    if (matched) continue

    lines.push(`• ${trimmed}`)
  }

  return lines.join('\n')
}

interface UnifiedStatus {
  id: string
  emoji: string
  title: string
  description: string
  count?: number | string
  class: string
  isBoosted?: boolean
  stageValue?: number
  isAdminOnly?: boolean
}

interface VolatileStatusItem {
  icon: string
  text?: string
  isBoosted?: boolean
  isAdminOnly?: boolean
}

export function useCombatantStatus(
  pokemonRef: MaybeRefOrGetter<Pokemon | null | undefined>,
  battleStore: ReturnType<typeof useBattleStore>,
  isPlayer: MaybeRefOrGetter<boolean>
) {
  const p = computed(() => toValue(pokemonRef))
  const isPlayerVal = computed(() => toValue(isPlayer))
  const gameStore = useGameStore()
  const profileStore = useProfileStore()

  const isIvScannerActive = computed(() => {
    return (gameStore.state.ivScannerSecs || 0) > 0
  })

  const isAdmin = computed(() => {
    const win = window as unknown as { __ADMIN_DEBUG__: boolean }
    return profileStore.profileData.isAdmin || (typeof window !== 'undefined' && win.__ADMIN_DEBUG__) || supabase.isLocal
  })

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
      const showAbility = isPlayerVal.value || isIvScannerActive.value || isAdmin.value
      
      if (showAbility) {
        const ab = target.ability
        const abId = toID(ab)
        const weather = battleStore.state?.weather?.type
        const mechWeather = getMechanicalWeather(weather)
        
        let isAbBoosted = false
        let abEntry = null
        try {
          abEntry = pokemonDataProvider.getAbilityData(ab)
        } catch (_err) {
          // Fallback gracefully for unknown or custom abilities
        }
        const abDescription = abEntry?.desc || 'Sin descripción disponible.'

        const isSunActive = mechWeather === WEATHER_MECHANICAL.SUN
        const isRainActive = mechWeather === WEATHER_MECHANICAL.RAIN

        let statusMsg = ''
        if (abId === 'chlorophyll' && isSunActive) { isAbBoosted = true; statusMsg = ' (Activa por Sol)' }
        if (abId === 'swiftswim' && isRainActive) { isAbBoosted = true; statusMsg = ' (Activa por Lluvia)' }
        if (abId === 'sandrush' && mechWeather === WEATHER_MECHANICAL.SANDSTORM) { isAbBoosted = true; statusMsg = ' (Activa por Arena)' }
        if (abId === 'slushrush' && (mechWeather === WEATHER_MECHANICAL.SNOW || mechWeather === WEATHER_MECHANICAL.HAIL)) { isAbBoosted = true; statusMsg = ' (Activa por Nieve)' }

        let formattedDesc = formatAbilityDescription(abDescription)
        if (statusMsg) {
          formattedDesc += `\n${statusMsg}`
        }

        const abText = `HABILIDAD - ${String(abEntry?.name || ab).toUpperCase()}:\n${formattedDesc}`

        list.push({ 
          icon: '🧠', 
          text: abText,
          isBoosted: isAbBoosted,
          isAdminOnly: !isPlayerVal.value && !isIvScannerActive.value && isAdmin.value
        })
      }
    }

    // 0.5. Mochila/Inventario del NPC (Solo visible para admins/debug)
    if (!isPlayerVal.value && isAdmin.value && battleStore.state?.enemyInventory) {
      const inv = battleStore.state.enemyInventory;
      const money = battleStore.state.enemyMoney ?? 0;
      
      const itemKeys = Object.keys(inv).filter(k => inv[k]! > 0);
      let itemsListText = '';
      if (itemKeys.length === 0) {
        itemsListText = 'Mochila Vacía';
      } else {
        itemsListText = itemKeys.map(k => {
          const qty = inv[k]!;
          const name = getItemName(k);
          return `• ${name} x${qty}`;
        }).join('\n');
      }

      const level = battleStore.state.enemyMaxLevel ?? target.level;
      const invText = `INVENTARIO DEL NPC (Lv. ${level}):\nPresupuesto restante: ₽${money}\n\nObjetos:\n${itemsListText}`;

      list.push({
        icon: '🎒',
        text: invText,
        isAdminOnly: true
      });
    }

    // 1. Estados Propios del Pokémon
    for (const def of VOLATILE_STATUS_LIST) {
      const val = target[def.prop as keyof Pokemon];
      if (!val) continue;

      if (def.isCounter) {
        const num = Number(val);
        if (num > 0) {
          let customText = `${def.text} (${num}t).`;
          if (def.prop === 'substitute') {
            customText = `SUSTITUTO: Un señuelo de ${num} HP recibe el daño.`;
          } else if (def.prop === 'perishSongCount') {
            customText = `CANTO MORTAL: El Pokémon caerá en ${num} turnos.`;
          }
          list.push({ icon: def.icon, text: customText });
        }
      } else {
        list.push({ icon: def.icon, text: def.text });
      }
    }


    // 2. Efectos de Campo (Side-based)
    const stages = isPlayerVal.value ? battleStore.playerStages : battleStore.enemyStages
    if (stages) {
      if (stages.reflect > 0) list.push({ icon: '🪞', text: `REFLEJO: Reduce el daño físico (${stages.reflect}t).` })
      if (stages.lightScreen > 0) list.push({ icon: '💡', text: `PANTALLA LUZ: Reduce el daño especial (${stages.lightScreen}t).` })
      if (stages.safeguard > 0) list.push({ icon: '🛡️', text: `VELO SAGRADO: Protege contra estados (${stages.safeguard}t).` })
      if (stages.mist > 0) list.push({ icon: '🌫️', text: `NEBLINA: Protege contra reducción de stats (${stages.mist}t).` })
      if (stages.spikes > 0) list.push({ icon: '📍', text: `PÚAS: Daña a los Pokémon que entran al campo (${stages.spikes} capas).` })
    }

    // 3. Clima
    const weather = battleStore.state?.weather
    const types: string[] = []
    if (target.type) types.push(target.type.toLowerCase())
    if (target.type2) types.push(target.type2.toLowerCase())
    const moveNames = (target.moves || []).map((m) => (m?.name || '').toLowerCase())

    let weatherAffects = false
    if (weather && weather.type !== 'clear' && weather.type !== 'none') {
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

    if (battleStore.state?.isGym) {
      return list
    }

    if (weather && weather.type !== 'clear' && weather.type !== 'none' && weatherAffects) {
      const desc = getWeatherCombatDescription(weather.type, ACTIVE_GENERATION)
      if (desc && desc !== 'Sin efectos en combate.') {
        const visualType = weather.visual || weather.type
        const mechType = getMechanicalWeather(weather.type)
        const config = WEATHER_VISUAL_METADATA[visualType] || WEATHER_UI_METADATA[mechType as WeatherMechanical]
        if (config) {
          list.push({ icon: config.icon, text: `${config.label}: ${desc}` })
        }
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
      const emoji = (STATUS_EMOJI_MAP as Record<string, string>)[s]
      const title = (STATUS_NAME_MAP as Record<string, string>)[s]
      const description = (STATUS_TOOLTIP_MAP as Record<string, string>)[s]

      if (!emoji || !title || !description) {
        throw new Error(
          `[STATUS MATCH ERROR] Missing mapping for status "${s}". Emoji: ${emoji}, Title: ${title}, Description: ${description}`
        )
      }

      list.push({
        id: `primary-${s}`,
        emoji,
        title,
        description,
        count: s === 'sleep' ? target.sleepTurns : undefined,
        class: s
      })
    }

    // 2. Estados Volátiles
    volatileStatuses.value.forEach((vs, idx) => {
      const text = vs.text || ''
      const firstColonIndex = text.indexOf(':')
      const title = firstColonIndex !== -1 ? text.slice(0, firstColonIndex).trim() : ''
      const description = firstColonIndex !== -1 ? text.slice(firstColonIndex + 1).trim() : text
      list.push({
        id: `volatile-${idx}`,
        emoji: vs.icon,
        title: title || '',
        description: description || text || '',
        class: 'volatile',
        isBoosted: vs.isBoosted,
        isAdminOnly: (vs as VolatileStatusItem).isAdminOnly
      })
    })

    // 3. Stages
    activeStages.value.forEach((s) => {
      list.push({
        id: `stage-${s.key}`,
        emoji: s.icon,
        title: s.text?.split('(')[0]?.trim() || '',
        description: `Multiplicador actual: ${s.text?.match(/\(([^)]+)\)/)?.[1] || '100%'}`,
        class: `stage ${(s.val || 0) > 0 ? 'is-up' : 'is-down'}`,
        stageValue: s.val
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
