import type { BattleStages } from '@/types/battle/battle'

export function checkLockedVolatiles(oldPoke: { volatileCounters?: Record<string, number> } | null | undefined): boolean {
  if (!oldPoke || !oldPoke.volatileCounters) return false
  const volatile = oldPoke.volatileCounters
  return !!(
    (volatile['twoturnmove'] && volatile['twoturnmove'] > 0) ||
    (volatile['lockedmove'] && volatile['lockedmove'] > 0)
  )
}

export function resetPlayerStages(currentStages: BattleStages): BattleStages {
  return {
    ...currentStages,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    acc: 0,
    eva: 0
  }
}
