import type { PurePokemon, PureCatchOptions, PureBattleWeather, PureBattleStages, CatchRateResult } from './battleMathTypes.ts'
const CATCH_MATH_65535_MAX = 65535
const CATCH_MATH_256_MAX = 256
const CATCH_MATH_255_MAX = 255
import { getEffectiveStatPure } from './battleMath.ts'

import { getMechanicalWeather } from '@/logic/weather/weatherRegistry';
import type { ItemId } from '@/data/inventory/items';

const BALL_BEHAVIORS: Partial<Record<ItemId, { guaranteed?: boolean, mult?: number | ((p: PurePokemon, c: PureCatchOptions) => number) }>> = {
  masterball: { guaranteed: true },
  ultraball: { mult: 2.0 },
  greatball: { mult: 1.5 },
  netball: {
      mult: (p, c) => {
        const isWaterOrBug = (p.type === 'water' || p.type2 === 'water' || p.type === 'bug' || p.type2 === 'bug')
        const mech = getMechanicalWeather(c.weather?.type)
        const isRain = mech === 'rain'
        return (isWaterOrBug || isRain) ? 3.5 : 1.0
      }
    },
  duskball: {
      mult: (_p, c) => {
        const cycle = c.cycle || 'day'
        const isNight = cycle === 'night' || cycle === 'dusk'
        const isCave = !!c.isCave
        const mech = getMechanicalWeather(c.weather?.type)
        const isFog = mech === 'fog'
        return (isNight || isCave || isFog) ? 3.0 : 1.0
      }
    },
  timerball: {
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
}

export function getPokedexCriticalFactor(pokedexCount: number): number {
  if (pokedexCount < 15) return 0
  if (pokedexCount < 50) return 0.5
  if (pokedexCount < 100) return 1.0
  if (pokedexCount < 150) return 1.5
  if (pokedexCount < 200) return 2.0
  return 2.5
}

export function calculateCriticalCaptureThreshold(a: number, pokedexCount: number): number {
  const p = getPokedexCriticalFactor(pokedexCount)
  if (p <= 0) return 0
  return Math.floor((Math.min(CATCH_MATH_255_MAX, a) * p) / 6)
}

import {
  BUG_SYNERGY_BONUS_PER_BUG,
  BUG_SYNERGY_MAX_BONUS,
  TRAINER_HIGH_IV_THRESHOLD,
  TRAINER_IV_PENALTY_RATE
} from '@/logic/constants/gameplay.ts';

export function calculateCatchRatePure(
  pokemon: PurePokemon,
  rawBallType: ItemId = 'pokeball',
  eventCatchMult = 1,
  ctx: PureCatchOptions = {}
): CatchRateResult {
  const behavior = BALL_BEHAVIORS[rawBallType] ?? { mult: 1.0 }

  let classMultiplier = 1.0;
  let bugSynergyBonus = 0;
  let trainerIvPenaltyApplied = false;

  if (ctx.playerClass === 'cazabichos' && ctx.activeTeam) {
    const bugCount = ctx.activeTeam.filter(p => p.type1 === 'bug' || p.type2 === 'bug').length;
    if (bugCount > 0) {
      bugSynergyBonus = Math.min(BUG_SYNERGY_MAX_BONUS, bugCount * BUG_SYNERGY_BONUS_PER_BUG);
      classMultiplier += bugSynergyBonus;
    }
  } else if (ctx.playerClass === 'entrenador' && (ctx.ivTotal ?? 0) > TRAINER_HIGH_IV_THRESHOLD) {
    trainerIvPenaltyApplied = true;
    classMultiplier = Math.max(0.1, classMultiplier - TRAINER_IV_PENALTY_RATE);
  }

  if (behavior.guaranteed) {
    return { caught: true, shakes: 3, isCritical: false, statusMultiplierApplied: false, bugSynergyBonus, trainerIvPenaltyApplied }
  }

  let ballMult = 1.0
  if (typeof behavior.mult === 'function') ballMult = behavior.mult(pokemon, ctx)
  else if (behavior.mult) ballMult = behavior.mult

  const currenthp = pokemon.hp ?? 10
  const maxHp = pokemon.maxHp ?? 10
  const hpFactor = (3 * maxHp - 2 * currenthp) / (3 * maxHp)
  const catchRate = pokemon.catchRate ?? 45

  // Status multiplier: 2.0 for Sleep/Freeze, 1.5 for Paralyzed/Burn/Poison, 1.0 without status
  const statusMult = (pokemon.status === 'slp' || pokemon.status === 'frz') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0)

  const eventBonus = eventCatchMult - 1
  const ballbonus = Math.max(0.1, ballMult + eventBonus)
  const totalMult = ballbonus * classMultiplier

  const rawRate = Math.floor(catchRate * totalMult * hpFactor * statusMult)
  const statusApplied = statusMult > 1.0

  // 06_captura.md: If a >= 255, captured automatically without checking shakes
  if (rawRate >= CATCH_MATH_255_MAX) {
    return { caught: true, shakes: 3, isCritical: false, statusMultiplierApplied: statusApplied, bugSynergyBonus, trainerIvPenaltyApplied }
  }

  const finalRate = Math.max(1, rawRate)
  const b = Math.floor(CATCH_MATH_65535_MAX * Math.pow(finalRate / CATCH_MATH_255_MAX, 0.25))

  // Critical Capture Roll
  const pokedexCount = ctx.pokedexCount ?? 0
  const ccThreshold = calculateCriticalCaptureThreshold(finalRate, pokedexCount)
  const isCritical = !!ctx.forceCritical || (ccThreshold > 0 && Math.random() * CATCH_MATH_256_MAX < ccThreshold)

  if (isCritical) {
    // Critical capture only performs 1 shake check against b
    const criticalSuccess = Math.random() * CATCH_MATH_65535_MAX < b
    return {
      caught: criticalSuccess,
      shakes: criticalSuccess ? 1 : 0,
      isCritical: true,
      statusMultiplierApplied: statusApplied,
      bugSynergyBonus,
      trainerIvPenaltyApplied
    }
  }

  // Standard 4 shakes loop
  let shakes = 0
  for (let i = 0; i < 4; i++) {
    if (Math.random() * CATCH_MATH_65535_MAX < b) shakes++
    else break
  }

  return {
    caught: shakes === 4,
    shakes: Math.min(3, shakes),
    isCritical: false,
    statusMultiplierApplied: statusApplied,
    bugSynergyBonus,
    trainerIvPenaltyApplied
  }
}

export function calculateEscapeChancePure(
  playerPoke: PurePokemon,
  wildPoke: PurePokemon,
  attempts: number,
  weather: PureBattleWeather | null,
  playerStages: PureBattleStages = {},
  enemyStages: PureBattleStages = {}
): boolean {
  const pAb = (playerPoke.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const pItem = (playerPoke.heldItem || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const isGhost = playerPoke.type === 'ghost' || playerPoke.type2 === 'ghost'

  // Habilidades, objetos o tipos que garantizan escapar e ignoran atrapado
  if (pAb === 'runaway' || pItem === 'smokeball' || pItem === 'shedshell' || isGhost) {
    return true
  }

  // Habilidades de atrapado del Pokémon salvaje
  const eAb = (wildPoke.ability || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (eAb === 'shadowtag' && pAb !== 'shadowtag') {
    return false
  }
  if (eAb === 'arenatrap') {
    const isFloating = playerPoke.type === 'flying' || playerPoke.type2 === 'flying' || pAb === 'levitate'
    if (!isFloating) return false
  }
  if (eAb === 'magnetpull') {
    const isSteel = playerPoke.type === 'steel' || playerPoke.type2 === 'steel'
    if (isSteel) return false
  }

  // Cálculo de velocidad efectiva con stages y clima
  const pSpe = getEffectiveStatPure(playerPoke, 'spe', playerStages, weather)
  const eSpe = getEffectiveStatPure(wildPoke, 'spe', enemyStages, weather)
  const safeESpe = Math.max(1, eSpe)

  if (pSpe >= safeESpe) {
    return true
  }

  const enemyQuarter = Math.max(1, Math.floor(safeESpe / 4))
  const f = Math.floor((pSpe * 32) / enemyQuarter) + 30 * attempts
  if (f >= CATCH_MATH_256_MAX) {
    return true
  }

  return Math.floor(Math.random() * CATCH_MATH_256_MAX) < f
}
