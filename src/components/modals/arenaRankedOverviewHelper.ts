const DEFAULT_ELO = 1000 as const
const DEFAULT_TIER_NAME = 'Bronce' as const
const DEFAULT_TIER_COLOR = '#888' as const
const DEFAULT_TIER_ICON = '🥉' as const

export interface RankedTierDisplay {
  name: string
  color: string
  icon: string
  elo: number
}

export interface RankedStatsDisplay {
  wins: number
  losses: number
  winRateText: string
}

export function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses
  if (total <= 0) return '0.0%'
  return `${((wins / total) * 100).toFixed(1)}%`
}

export function resolveSearchMessage(phase: string, secondsRemaining: number): string {
  if (phase === 'passive_fallback') {
    return 'Buscando defensa pasiva...'
  }
  return `Buscando rival humano... (${secondsRemaining}s)`
}

export function resolveRankedTierDisplay(
  tier: { name?: string; color?: string; icon?: string } | undefined,
  elo: number | undefined
): RankedTierDisplay {
  return {
    name: tier?.name || DEFAULT_TIER_NAME,
    color: tier?.color || DEFAULT_TIER_COLOR,
    icon: tier?.icon || DEFAULT_TIER_ICON,
    elo: elo || DEFAULT_ELO
  }
}

export function resolveRankedStatsDisplay(
  stats: { wins?: number; losses?: number } | undefined
): RankedStatsDisplay {
  const wins = stats?.wins || 0
  const losses = stats?.losses || 0
  return {
    wins,
    losses,
    winRateText: formatWinRate(wins, losses)
  }
}
