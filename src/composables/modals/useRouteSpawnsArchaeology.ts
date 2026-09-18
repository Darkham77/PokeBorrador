import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { calculateArchaeologyWeights } from '@/logic/utils/archaeologyHelpers.ts'
import {
  type ArchaeologyRewardData,
  buildFossilReward,
  buildStaticCategoryRewards,
  formatArchaeologyTooltip
} from './routeSpawnsArchaeologyHelpers.ts'
import type { RouteSpawnsProps } from '@/composables/modals/useRouteSpawnsCalculation'

export type { ArchaeologyRewardData }

const DEFAULT_RATE_FALLBACK = 10 as const

export function useRouteSpawnsArchaeology(props: RouteSpawnsProps) {
  const gameStore = useGameStore()

  const archaeologyRewards = computed<ArchaeologyRewardData[]>(() => {
    if (!props.map.archaeology?.pool) return []

    const pool = props.map.archaeology.pool
    const rates = props.map.archaeology.rates || []
    const totalRates = rates.reduce((sum, r) => sum + r, 0) || 1

    const pickaxeType = (gameStore.state.pickaxeSecs || 0) > 0 ? (gameStore.state.pickaxeType || 'standard') : null
    const brushType = (gameStore.state.brushSecs || 0) > 0 ? (gameStore.state.brushType || 'standard') : null

    const baseWeights = calculateArchaeologyWeights(null, null)
    const activeWeights = calculateArchaeologyWeights(pickaxeType, brushType)

    const baseTotal = baseWeights.fossil + baseWeights.stone + baseWeights.common + baseWeights.rare
    const activeTotal = activeWeights.fossil + activeWeights.stone + activeWeights.common + activeWeights.rare

    const fossilRewards = pool.map((id, index) => {
      const rate = rates[index] !== undefined ? rates[index]! : DEFAULT_RATE_FALLBACK
      const relativeRate = rate / totalRates
      return buildFossilReward(id, relativeRate, baseWeights.fossil, activeWeights.fossil, baseTotal, activeTotal)
    })

    const staticRewards = buildStaticCategoryRewards(baseWeights, activeWeights, baseTotal, activeTotal)

    return [...fossilRewards, ...staticRewards]
  })

  function getArchaeologySpawnTooltip(reward: ArchaeologyRewardData) {
    const pickaxeType = (gameStore.state.pickaxeSecs || 0) > 0 ? (gameStore.state.pickaxeType || 'standard') : null
    const brushType = (gameStore.state.brushSecs || 0) > 0 ? (gameStore.state.brushType || 'standard') : null
    return formatArchaeologyTooltip(reward, pickaxeType, brushType)
  }

  return {
    archaeologyRewards,
    getArchaeologySpawnTooltip
  }
}
