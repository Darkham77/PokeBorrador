import type { PurePokemon, PureCatchOptions, PureBattleWeather } from './battleMathTypes.ts'
import { getEffectiveStatPure } from './battleMath.ts'

function getMechWeather(type: string | null | undefined): string {
  if (!type) return 'clear'
  const lower = type.toLowerCase()
  if (['sun', 'heatwave', 'intense_sun', 'sunnyday', 'desolateland'].includes(lower)) return 'sun'
  if (['rain', 'storm', 'heavy_rain', 'raindance', 'primordialsea'].includes(lower)) return 'rain'
  if (['sandstorm', 'dust_storm'].includes(lower)) return 'sandstorm'
  if (['snow', 'hail', 'blizzard', 'cold', 'coldwave'].includes(lower)) return 'snow'
  if (['fog', 'mist'].includes(lower)) return 'fog'
  if (['thunderstorm'].includes(lower)) return 'thunderstorm'
  if (['strong_winds', 'deltastream'].includes(lower)) return 'clear'
  return 'clear'
}

export function calculateCatchRatePure(pokemon: PurePokemon, rawBallType = 'poke-ball', eventCatchMult = 1, ctx: PureCatchOptions = {}) {
  const ballName = String(rawBallType || '').toLowerCase()
  
  const BALL_BEHAVIORS: Record<string, { guaranteed?: boolean, mult?: number | ((p: PurePokemon, c: PureCatchOptions) => number) }> = {
    'master': { guaranteed: true },
    '100': { guaranteed: true },
    'ultra': { mult: 2.0 },
    'great': { mult: 1.5 },
    'super': { mult: 1.5 },
    'súper': { mult: 1.5 },
    'net': { 
      mult: (p, c) => {
        const isWaterOrBug = (p.type === 'water' || p.type2 === 'water' || p.type === 'bug' || p.type2 === 'bug')
        const mech = getMechWeather(c.weather?.type)
        const isRain = mech === 'rain'
        return (isWaterOrBug || isRain) ? 3.5 : 1.0
      }
    },
    'dusk': { 
      mult: (_p, c) => {
        const cycle = c.cycle || 'day'
        const isNight = cycle === 'night' || cycle === 'dusk'
        const isCave = !!c.isCave
        const mech = getMechWeather(c.weather?.type)
        const isFog = mech === 'fog'
        return (isNight || isCave || isFog) ? 3.0 : 1.0
      }
    },
    'timer': { 
      mult: (_p, c) => Math.min(4.0, 1.0 + ((c.turnCount || 1) * 0.3))
    }
  }

  const behaviorEntry = Object.entries(BALL_BEHAVIORS).find(([key]) => ballName.includes(key))
  const behavior = behaviorEntry ? behaviorEntry[1] : { mult: 1.0 }

  if (behavior.guaranteed) return { caught: true, shakes: 3 }

  let ballMult = 1.0
  if (typeof behavior.mult === 'function') ballMult = behavior.mult(pokemon, ctx)
  else if (behavior.mult) ballMult = behavior.mult

  const curHp = pokemon.hp ?? 10
  const maxHp = pokemon.maxHp ?? 10
  const hpFactor = (3 * maxHp - 2 * curHp) / (3 * maxHp)
  const catchRate = pokemon.catchRate ?? 45

  const statusMult = (pokemon.status === 'slp' || pokemon.status === 'frz') ? 2.0 : 
                     (pokemon.status ? 1.5 : 1.0)

  const eventBonus = eventCatchMult - 1
  const totalMult = Math.max(0.1, ballMult + eventBonus)

  const finalRate = Math.min(255, Math.max(1, Math.floor(catchRate * totalMult * hpFactor * statusMult)))
  const b = Math.floor(65535 * Math.pow(finalRate / 255, 0.25))
  
  let shakes = 0
  for (let i = 0; i < 4; i++) {
    if (Math.random() * 65535 < b) shakes++
    else break
  }

  return { caught: shakes === 4, shakes: Math.min(3, shakes) }
}

export function calculateEscapeChancePure(playerPoke: PurePokemon, wildPoke: PurePokemon, attempts: number, weather: PureBattleWeather | null) {
  const pSpe = getEffectiveStatPure(playerPoke, 'spe', {}, weather)
  const eSpe = getEffectiveStatPure(wildPoke, 'spe', {}, weather)
  const safeESpe = Math.max(1, eSpe)
  const f = Math.floor((pSpe * 128) / safeESpe) + 30 * attempts
  return Math.floor(Math.random() * 256) < f
}
