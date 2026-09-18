import type { Pokemon } from '@/types/pokemon/pokemon'
import type { LogFn, BattleSide } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'

const STEALTH_ROCK_DENOMINATOR = 8 as const
const MIN_DAMAGE = 1 as const
const SPIKES_MIN_LAYERS = 1 as const
const SPIKES_MAX_LAYERS = 3 as const
const SPIKES_DAMAGE_FRACTIONS = [0, 0.125, 0.16666666666666666, 0.25] as const
const DEFAULT_SPIKES_FRACTION = 0.125 as const

export function calculateStealthRockDamage(pokemon: Pokemon, typeEffectivenessMultiplier: number): number {
  const baseDmg = Math.floor(pokemon.maxHp / STEALTH_ROCK_DENOMINATOR)
  return Math.max(MIN_DAMAGE, Math.floor(baseDmg * typeEffectivenessMultiplier))
}

export function calculateSpikesDamage(pokemon: Pokemon, spikeLayers: number): number {
  const isGrounded = pokemon.type !== 'flying' && pokemon.type2 !== 'flying' && pokemon.ability !== 'levitate'
  if (!isGrounded) return 0
  const layers = Math.min(SPIKES_MAX_LAYERS, Math.max(SPIKES_MIN_LAYERS, spikeLayers))
  const dmgFraction = SPIKES_DAMAGE_FRACTIONS[layers] ?? DEFAULT_SPIKES_FRACTION
  return Math.max(MIN_DAMAGE, Math.floor(pokemon.maxHp * dmgFraction))
}

function resolveHazardContext(
  pokemon: Pokemon,
  sideOrCtx: unknown,
  ctxOrLog?: BattleContext | LogFn
): { ctx: BattleContext; side: BattleSide } | null {
  const ctx = (typeof ctxOrLog === 'object' && ctxOrLog !== null && 'activeBattle' in ctxOrLog)
    ? (ctxOrLog as BattleContext)
    : null
  if (!ctx) return null
  const active = ctx.activeBattle.value
  if (!active || pokemon.hp <= 0) return null

  const side: BattleSide = (sideOrCtx === 'enemy' || sideOrCtx === 'player')
    ? sideOrCtx
    : (pokemon.uid === active.player?.uid ? 'player' : 'enemy')

  return { ctx, side }
}

async function applyStealthRockHazard(
  pokemon: Pokemon,
  side: BattleSide,
  ctx: BattleContext
): Promise<void> {
  const { getTypeEffectiveness } = await import('@/logic/pokemon/typeEngine')
  const eff1 = getTypeEffectiveness('rock', pokemon.type)
  const eff2 = pokemon.type2 ? getTypeEffectiveness('rock', pokemon.type2) : 1
  const dmg = calculateStealthRockDamage(pokemon, eff1 * eff2)

  pokemon.hp = Math.max(0, pokemon.hp - dmg)
  ctx.addLog(`¡Las rocas afiladas claváronse en ${pokemon.name}! (-${dmg} HP)`, 'log-info', pokemon)

  if (ctx.animations?.handleBlinkRequest) {
    await ctx.animations.handleBlinkRequest({ side })
  }
}

async function applySpikesHazard(
  pokemon: Pokemon,
  side: BattleSide,
  spikeLayers: number,
  ctx: BattleContext
): Promise<void> {
  const dmg = calculateSpikesDamage(pokemon, spikeLayers)
  if (dmg <= 0) return

  pokemon.hp = Math.max(0, pokemon.hp - dmg)
  ctx.addLog(`¡${pokemon.name} se hirió con las púas! (-${dmg} HP)`, 'log-info', pokemon)

  if (ctx.animations?.handleBlinkRequest) {
    await ctx.animations.handleBlinkRequest({ side })
  }
}

export async function applyEntryHazards(pokemon: Pokemon, sideOrCtx: unknown, ctxOrLog?: BattleContext | LogFn) {
  const resolved = resolveHazardContext(pokemon, sideOrCtx, ctxOrLog)
  if (!resolved) return

  const { ctx, side } = resolved
  const active = ctx.activeBattle.value
  const sideConditions = (side === 'player' ? active?.playerSideConditions : active?.enemySideConditions) || {}
  const isImmune = pokemon.ability === 'magicguard'

  if (sideConditions.stealthrock && !isImmune) {
    await applyStealthRockHazard(pokemon, side, ctx)
  }

  const spikeLayers = sideConditions.spikes?.turns ?? 0
  if (spikeLayers > 0 && !isImmune) {
    await applySpikesHazard(pokemon, side, spikeLayers, ctx)
  }
}
