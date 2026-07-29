import type { PurePokemon, PureCatchOptions, PureBattleWeather, PureBattleStages } from './battleMathTypes.ts'
import { getEffectiveStatPure } from './battleMath.ts'

import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { ItemId } from '@/data/inventory/items';

function getMechWeather(type: WeatherId | string | null | undefined): string {
  if (!type) return 'clear'
  const lower = type as WeatherId
  if (['sun', 'heatwave', 'intense_sun', 'sunnyday', 'desolateland'].includes(lower)) return 'sun'
  if (['rain', 'storm', 'heavy_rain', 'raindance', 'primordialsea'].includes(lower)) return 'rain'
  if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm'
  if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'snow'
  if (['fog', 'mist'].includes(lower)) return 'fog'
  if (['thunderstorm'].includes(lower)) return 'thunderstorm'
  if (['strong_winds', 'deltastream'].includes(lower)) return 'clear'
  return 'clear'
}

const BALL_BEHAVIORS: Partial<Record<ItemId, { guaranteed?: boolean, mult?: number | ((p: PurePokemon, c: PureCatchOptions) => number) }>> = {
  masterball: { guaranteed: true },
  ultraball: { mult: 2.0 },
  greatball: { mult: 1.5 },
  netball: {
      mult: (p, c) => {
        const isWaterOrBug = (p.type === 'water' || p.type2 === 'water' || p.type === 'bug' || p.type2 === 'bug')
        const mech = getMechWeather(c.weather?.type)
        const isRain = mech === 'rain'
        return (isWaterOrBug || isRain) ? 3.5 : 1.0
      }
    },
  duskball: {
      mult: (_p, c) => {
        const cycle = c.cycle || 'day'
        const isNight = cycle === 'night' || cycle === 'dusk'
        const isCave = !!c.isCave
        const mech = getMechWeather(c.weather?.type)
        const isFog = mech === 'fog'
        return (isNight || isCave || isFog) ? 3.0 : 1.0
      }
    },
  timerball: {
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
}

export function calculateCatchRatePure(pokemon: PurePokemon, rawBallType: ItemId = 'pokeball', eventCatchMult = 1, ctx: PureCatchOptions = {}) {
  const behavior = BALL_BEHAVIORS[rawBallType] ?? { mult: 1.0 }

  if (behavior.guaranteed) return { caught: true, shakes: 3 }

  let ballMult = 1.0
  if (typeof behavior.mult === 'function') ballMult = behavior.mult(pokemon, ctx)
  else if (behavior.mult) ballMult = behavior.mult

  const currenthp = pokemon.hp ?? 10
  const maxHp = pokemon.maxHp ?? 10
  const hpFactor = (3 * maxHp - 2 * currenthp) / (3 * maxHp)
  const catchRate = pokemon.catchRate ?? 45

  const statusbonus = (pokemon.status === 'slp' || pokemon.status === 'frz') ? 2.5 : 
                      (pokemon.status ? 1.5 : 1.0)
  const statusMult = statusbonus

  const eventBonus = eventCatchMult - 1
  const ballbonus = Math.max(0.1, ballMult + eventBonus)
  const totalMult = ballbonus

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)))
  const b = Math.floor(65535 * Math.pow(finalRate / 255, 0.25))
  
  let shakes = 0
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65535 < b) shakes++
    else break
  }

  return { caught: shakes === 4, shakes: Math.min(3, shakes), statusMultiplierApplied: statusMult > 1.0 }
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

  const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts
  if (f >= 256) {
    return true
  }

  return Math.floor(Math.random() * 256) < f
}
