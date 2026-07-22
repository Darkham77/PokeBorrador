import type { Pokemon } from '@/types/pokemon/pokemon'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'

export function calculateStealthRockDamage(pokemon: Pokemon, typeEffectivenessMultiplier: number): number {
  const baseDmg = Math.floor(pokemon.maxHp / 8)
  return Math.max(1, Math.floor(baseDmg * typeEffectivenessMultiplier))
}

export function calculateSpikesDamage(pokemon: Pokemon, spikeLayers: number): number {
  const isGrounded = !['flying'].includes(pokemon.type) && !['flying'].includes(pokemon.type2 || '') && pokemon.ability !== 'levitate'
  if (!isGrounded) return 0
  const layers = Math.min(3, Math.max(1, spikeLayers))
  const fractions = [0, 1 / 8, 1 / 6, 1 / 4]
  const dmgFraction = fractions[layers] || (1 / 8)
  return Math.max(1, Math.floor(pokemon.maxHp * dmgFraction))
}

export async function applyEntryHazards(pokemon: Pokemon, sideOrCtx: 'player' | 'enemy' | unknown, ctxOrLog?: BattleContext | LogFn) {
  const ctx = (typeof ctxOrLog === 'object' && ctxOrLog !== null && 'activeBattle' in ctxOrLog) ? (ctxOrLog as BattleContext) : null
  if (!ctx) return
  const active = ctx.activeBattle.value
  if (!active || pokemon.hp <= 0) return

  const side = (sideOrCtx === 'enemy' || sideOrCtx === 'player') ? sideOrCtx : (pokemon.uid === active.player?.uid ? 'player' : 'enemy')
  const sideConditions = (side === 'player' ? active.playerSideConditions : active.enemySideConditions) || {}
  const addLog: LogFn = ctx.addLog
  const isImmune = pokemon.ability === 'magicguard'

  // Stealth Rock (Trampa Rocas)
  if (sideConditions.stealthRock && !isImmune) {
    const { getTypeEffectiveness } = await import('@/logic/pokemon/typeEngine')
    const eff1 = getTypeEffectiveness('rock', pokemon.type)
    const eff2 = pokemon.type2 ? getTypeEffectiveness('rock', pokemon.type2) : 1
    const dmg = calculateStealthRockDamage(pokemon, eff1 * eff2)

    pokemon.hp = Math.max(0, pokemon.hp - dmg)
    addLog(`¡Las rocas afiladas claváronse en ${pokemon.name}! (-${dmg} HP)`, 'log-info', pokemon)

    if (ctx.animations?.handleBlinkRequest) {
      await ctx.animations.handleBlinkRequest({ side })
    }
  }

  // Spikes (Púas)
  const spikesEntry = sideConditions.spikes as { turns?: number; layers?: number; count?: number } | number | undefined
  const spikeLayers = typeof spikesEntry === 'number' ? spikesEntry : (spikesEntry?.layers || spikesEntry?.count || (spikesEntry?.turns ? 1 : 0))
  if (spikeLayers > 0 && !isImmune) {
    const dmg = calculateSpikesDamage(pokemon, spikeLayers)
    if (dmg > 0) {
      pokemon.hp = Math.max(0, pokemon.hp - dmg)
      addLog(`¡${pokemon.name} se hirió con las púas! (-${dmg} HP)`, 'log-info', pokemon)

      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side })
      }
    }
  }
}
