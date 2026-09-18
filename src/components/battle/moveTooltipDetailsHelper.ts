import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'
import type { PokemonMoveId } from '@/data/battle/moves'

const WEIGHT_BASED_MOVES: Record<string, boolean> = {
  lowkick: true,
  grassknot: true,
  heavyslam: true,
  heatcrash: true
}

export interface TacticalRow {
  emoji: string
  text: string
  penalized?: boolean
}

export interface SpeedMatchupDisplay {
  emoji: string
  text: string
  boosted: boolean
  attackerSpeed: number
  defenderSpeed: number
}

export function resolveSpeedMatchup(speedInfo?: ActiveMoveDetails['speedInfo']): SpeedMatchupDisplay | null { // domain-ok: UI presentation helper returns null when speedInfo is absent
  if (!speedInfo) return null
  const isBoosted = speedInfo.outspeeds || speedInfo.priority > 0

  let emoji = '⏱️'
  let text = 'Rival mueve primero'

  if (speedInfo.priority > 0) {
    emoji = '⚡'
    text = `Prioridad +${speedInfo.priority}`
  } else if (speedInfo.outspeeds) {
    emoji = '▶️'
    text = '¡Mueves primero!'
  }

  return {
    emoji,
    text,
    boosted: isBoosted,
    attackerSpeed: speedInfo.attackerSpeed,
    defenderSpeed: speedInfo.defenderSpeed
  }
}

export function resolveTacticalRows(
  tacticalInfo?: ActiveMoveDetails['tacticalInfo'],
  moveId?: PokemonMoveId
): TacticalRow[] {
  if (!tacticalInfo) return []
  const rows: TacticalRow[] = []

  if (moveId && WEIGHT_BASED_MOVES[moveId]) {
    rows.push({
      emoji: '⚖️',
      text: `Peso: Tu ${tacticalInfo.attackerWeight}kg vs Rival ${tacticalInfo.defenderWeight}kg`
    })
  }

  if (tacticalInfo.overrideOffensiveStat) {
    rows.push({ emoji: '🧠', text: 'Usa tu DEFENSA para atacar' })
  }

  if (tacticalInfo.overrideDefensiveStat) {
    rows.push({ emoji: '🧠', text: 'Ataca contra la DEFENSA FÍSICA del rival' })
  }

  if (tacticalInfo.ignoreDefensive) {
    rows.push({ emoji: '🛡️', text: 'Ignora aumentos de defensa del rival' })
  }

  if (tacticalInfo.breaksProtect) {
    rows.push({ emoji: '💥', text: 'Rompe la Protección del rival' })
  }

  if (tacticalInfo.hasCrashDamage) {
    rows.push({ emoji: '⚠️', text: 'Daño por colisión si falla' })
  }

  for (const warning of tacticalInfo.terrainReductions) {
    rows.push({
      emoji: '💥',
      text: warning,
      penalized: true
    })
  }

  return rows
}
