import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { extractBattleConfig } from './orchestratorConfigHelper.ts'

export async function validatePlayerTeamLegality(effectivePlayerTeam: Pokemon[], isDebugOrReplay: boolean): Promise<boolean> {
  if (isDebugOrReplay) return true
  const { checkPokemonLegality } = await import('@/logic/pokemon/pokemonLegality')
  const illegalPoke = effectivePlayerTeam.find((p: Pokemon) => {
    if (!p) return false
    if (p.isIllegal) return true
    const legality = checkPokemonLegality(p)
    if (!legality.isLegal) {
      p.isIllegal = true
      p.illegalReasons = legality.issues
      return true
    }
    return false
  })
  if (illegalPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify(`No puedes combatir: tu equipo contiene Pokémon ilegales (${illegalPoke.name}). Repáralos antes de continuar.`, '⚠️')
    return false
  }
  return true
}

function resetPvPStats(p: Pokemon): void {
  p.hp = p.maxHp
  p.fainted = false
  p.status = ''
  p.statusTurns = 0
  p.sleepTurns = 0
  p.isGuardian = false
}

export function cleanTeamVolatileStatus(team: Pokemon[], isPvP: boolean, ctx: BattleContext): void {
  team.forEach((p: Pokemon) => {
    if (p) {
      ctx.clearVolatileStatus(p)
      if (isPvP) {
        resetPvPStats(p)
      }
    }
  })
}

export function setupSeatsProtocol(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean,
  finalEnemyPoke: Pokemon,
  effectivePlayerTeam: Pokemon[]
): void {
  if (!ctx.activeBattle.value) return
  ctx.activeBattle.value.enemy = (!isTrainer && !isGym) ? finalEnemyPoke : null
  const currentP = ctx.activeBattle.value.player
  const firstAlive = effectivePlayerTeam.find(p => p && p.hp > 0)
  if (!currentP || !firstAlive || currentP.uid !== firstAlive.uid) {
    ctx.activeBattle.value.player = null
  }
}

export function checkIsDebugOrReplay(isDebugOption?: boolean): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.__VITE_DEBUG__?.isDeterministicSimulation || window.__VITE_DEBUG__?.isScriptedReplayMode || isDebugOption)
}

export async function handleOngoingBattleConflict(ctx: BattleContext): Promise<void> {
  const isConflict = ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value
  if (isConflict) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }
}

export function registerEncounterPokedex(ctx: BattleContext, enemyPoke: Pokemon, cfg: ReturnType<typeof extractBattleConfig>): void {
  ctx.gs.registerPokedex(enemyPoke.id)
  if (cfg.isTrainer && cfg.enemyTeam) {
    cfg.enemyTeam.forEach((p: Pokemon) => ctx.gs.registerPokedex(p.id))
  }
}

export function setupDebugLoopPokemon(ctx: BattleContext, enemyPoke: Pokemon, isDebug: unknown, wasSearching: boolean): void {
  if (!isDebug) return
  ctx.debugLoopPokemon.value = wasSearching ? (cloneReactive(enemyPoke) as Pokemon) : null
}

export function pickActivePlayerTeam(cfg: ReturnType<typeof extractBattleConfig>, gsTeam: Pokemon[] | undefined): Pokemon[] {
  if (cfg.isPvP && cfg.playerTeam && cfg.playerTeam.length > 0) return cfg.playerTeam
  return gsTeam ?? []
}

export function resolveStartingEnemyTeam(enemyPoke: Pokemon, enemyTeam?: Pokemon[]) {
  const finalEnemyTeam = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [enemyPoke]
  const startingEnemyPoke = finalEnemyTeam.find(p => p && p.hp > 0) || enemyPoke
  return { finalEnemyTeam, startingEnemyPoke }
}
