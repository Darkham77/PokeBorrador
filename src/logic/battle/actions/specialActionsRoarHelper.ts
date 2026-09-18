import type { LogFn, BattleStages, BattleSide } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { gameBus } from '@/logic/events/gameBus'
import { callPokemonToBattle } from './specialActionsHelper.ts'

const BATTLE_STAGE_RESET_KEYS = [
  'atk',
  'def',
  'spa',
  'spd',
  'spe',
  'accuracy',
  'evasion',
  'reflect',
  'lightScreen',
  'safeguard',
  'mist',
  'spikes',
  'stealthrock',
  'toxicspikes',
  'acc',
  'eva'
] as const satisfies readonly (keyof BattleStages)[]

function resetBattleStages(stages: BattleStages): void {
  for (const key of BATTLE_STAGE_RESET_KEYS) {
    stages[key] = 0
  }
}

function handleWildRoarEscape(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  side: BattleSide,
  msg: string,
  logType: 'log-player' | 'log-enemy',
  logOrigin: Pokemon,
  addLogFn: LogFn
): void {
  addLogFn(msg, logType, logOrigin)
  gameBus.emit('PLAY_ESCAPE_ANIM', { side, type: 'flee' })
  b.fled = true
  b.over = true
}

async function handlePlayerRoarTrainerSwitch(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  tgt: Pokemon,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
): Promise<void> {
  const team = b.enemyTeam || []
  const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0)
  if (aliveOthers.length === 0) {
    addLogFn('¡Pero no hay nadie para sustituirle!', 'log-info', tgt)
    return
  }
  const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null
  addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-player', 'player')

  battleCtx.exitingEnemy.value = tgt
  await battleCtx.fsm.transition(battleCtx.BATTLE_STATES.ACTIVE_BATTLE, battleCtx.BATTLE_SUBSTATES.POKEMON_RECALL)

  const withdrawPromise = battleCtx.animations?.handleCatchRequest
    ? battleCtx.animations.handleCatchRequest({ side: 'enemy', pokemon: tgt })
    : Promise.resolve()

  b.enemy = randomPick
  resetBattleStages(tgtStages)

  await withdrawPromise

  if (randomPick && battleCtx) {
    await callPokemonToBattle(
      'enemy',
      randomPick,
      `¡${randomPick.name} entra al combate!`,
      'enemy_trainer',
      addLogFn,
      battleCtx
    )
  }
  battleCtx.exitingEnemy.value = null
}

async function handleEnemyRoarTrainerSwitch(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  src: Pokemon,
  tgt: Pokemon,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
): Promise<void> {
  const team = b.playerTeam || []
  const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0)
  if (aliveOthers.length === 0) {
    addLogFn('¡Pero no surtió efecto!', 'log-enemy', src)
    return
  }
  const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null
  addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-enemy', 'enemy_trainer')

  battleCtx.exitingPlayer.value = tgt
  await battleCtx.fsm.transition(battleCtx.BATTLE_STATES.ACTIVE_BATTLE, battleCtx.BATTLE_SUBSTATES.POKEMON_RECALL)

  const withdrawPromise = battleCtx.animations?.handleCatchRequest
    ? battleCtx.animations.handleCatchRequest({ side: 'player', pokemon: tgt })
    : Promise.resolve()

  b.player = randomPick
  if (randomPick) {
    b.playerTeamIndex = b.playerTeam?.findIndex(p => p.uid === randomPick.uid) ?? b.playerTeamIndex
  }
  resetBattleStages(tgtStages)

  await withdrawPromise

  if (randomPick && battleCtx) {
    await callPokemonToBattle(
      'player',
      randomPick,
      `¡Envía a ${randomPick.name}!`,
      'player',
      addLogFn,
      battleCtx
    )
  }
  battleCtx.exitingPlayer.value = null
}

export async function executeRoarAction(
  src: Pokemon,
  tgt: Pokemon,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
): Promise<void> {
  const b = battleCtx?.activeBattle.value
  if (!b) return

  if (tgt.ability === 'suctioncups') {
    addLogFn(`¡La habilidad Ventosa de ${tgt.name} impidió ser arrastrado!`, 'log-info', tgt)
    return
  }

  const isPlayerAttacking = (src.uid === b.player?.uid)
  const isWild = !b.isTrainer && !b.isGym

  if (isPlayerAttacking) {
    if (isWild) {
      handleWildRoarEscape(b, 'enemy', `¡El ${tgt.name} salvaje huyó asustado!`, 'log-player', tgt, addLogFn)
    } else {
      await handlePlayerRoarTrainerSwitch(b, tgt, tgtStages, addLogFn, battleCtx)
    }
  } else {
    if (isWild) {
      handleWildRoarEscape(b, 'player', `¡${src.name} expulsó a ${tgt.name} del combate!`, 'log-enemy', src, addLogFn)
    } else {
      await handleEnemyRoarTrainerSwitch(b, src, tgt, tgtStages, addLogFn, battleCtx)
    }
  }
}
