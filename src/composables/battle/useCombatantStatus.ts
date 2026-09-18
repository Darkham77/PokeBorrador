import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { useBattleStore } from '@/stores/battle/battle'
import { STATUS_TOOLTIP_MAP, STAT_EMOJI_MAP, STATUS_EMOJI_MAP, STATUS_NAME_MAP } from '@/logic/battle/battleUiUtils'
import { getStatMultiplier } from '@/logic/battle/battleEngine'
import type { Pokemon, PokemonStatus } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import { useProfileStore } from '@/stores/player/profile'
import { supabase } from '@/logic/db/supabase'
import {
  buildAbilityVolatileItem,
  buildEnemyInventoryVolatileItem,
  buildPokemonVolatiles,
  buildSideFieldVolatiles,
  buildWeatherVolatileItem,
  type VolatileStatusItem,
} from './combatantStatusHelpers.ts'

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

type ShowdownStatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
const SHOWDOWN_STAGE_KEYS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'] as const satisfies readonly ShowdownStatKey[];

export function useCombatantStatus(
  pokemonRef: MaybeRefOrGetter<Pokemon | null | undefined>,
  battleStore: ReturnType<typeof useBattleStore>,
  isPlayer: MaybeRefOrGetter<boolean>
) {
  const p = computed(() => toValue(pokemonRef));
  const isPlayerVal = computed(() => toValue(isPlayer));
  const gameStore = useGameStore();
  const profileStore = useProfileStore();

  const isIvScannerActive = computed(() => {
    return (gameStore.state.ivScannerSecs || 0) > 0;
  });

  const isAdmin = computed(() => {
    return profileStore.profileData.isAdmin || (typeof window !== 'undefined' && Boolean(Reflect.get(window, '__ADMIN_DEBUG__'))) || supabase.isLocal;
  });

  const activeStages = computed(() => {
    const s = isPlayerVal.value ? battleStore.playerStages : battleStore.enemyStages;
    if (!s) return [];

    const results = [];
    for (const key of SHOWDOWN_STAGE_KEYS) {
      const val = (s as Record<string, number | undefined>)[key] || 0 // open-record: Generic key-value data dictionary container
      if (val !== 0) {
        const config = (STAT_EMOJI_MAP as Record<string, { icon: string; name: string }>)[key] || { icon: '❓', name: key } // open-record: Generic key-value data dictionary container
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

  const volatileStatuses = computed<VolatileStatusItem[]>(() => {
    const list: VolatileStatusItem[] = []
    const target = p.value
    if (!target) return []

    const abilityItem = buildAbilityVolatileItem(
      target,
      isPlayerVal.value,
      isIvScannerActive.value,
      isAdmin.value,
      battleStore.state?.weather?.type
    )
    if (abilityItem) list.push(abilityItem)

    const enemyInvItem = buildEnemyInventoryVolatileItem(
      target,
      isPlayerVal.value,
      isAdmin.value,
      battleStore.state?.enemyInventory,
      battleStore.state?.enemyMoney ?? 0,
      battleStore.state?.enemyMaxLevel,
      battleStore.state?.enemyTeam || []
    )
    if (enemyInvItem) list.push(enemyInvItem)

    list.push(...buildPokemonVolatiles(target))

    const stages = isPlayerVal.value ? battleStore.playerStages : battleStore.enemyStages
    list.push(...buildSideFieldVolatiles(stages))

    const weatherItem = buildWeatherVolatileItem(target, battleStore.state?.weather, battleStore.state?.isGym)
    if (weatherItem) list.push(weatherItem)

    return list
  })

  const unifiedStatuses = computed<UnifiedStatus[]>(() => {
    const list: UnifiedStatus[] = []
    const target = p.value
    if (!target) return []

    // 1. Estado Primario
    if (target.status) {
      const s = target.status as PokemonStatus
      const emoji = (STATUS_EMOJI_MAP as Record<string, string>)[s] // open-record: Generic key-value data dictionary container
      const title = (STATUS_NAME_MAP as Record<string, string>)[s] // open-record: Generic key-value data dictionary container
      const description = (STATUS_TOOLTIP_MAP as Record<string, string>)[s] // open-record: Generic key-value data dictionary container

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
        count: s === 'slp' ? target.sleepTurns : undefined,
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
        count: vs.count,
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
