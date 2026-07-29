import type { LogFn, BattleStages } from '@/types/battle/battle'
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

export async function executeRoarAction(
  src: Pokemon,
  tgt: Pokemon,
  tgtStages: BattleStages,
  addLogFn: LogFn,
  battleCtx: BattleContext
) {
  const b = battleCtx?.activeBattle.value
  if (!b) return

  if (tgt.ability === 'suctioncups') {
    addLogFn(`¡La habilidad Ventosa de ${tgt.name} impidió ser arrastrado!`, 'log-info', tgt)
    return
  }

  const isPlayerAttacking = (src.uid === b.player?.uid)
  const fsm = battleCtx.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx

  if (isPlayerAttacking) {
    if (!b.isTrainer && !b.isGym) {
      addLogFn(`¡El ${tgt.name} salvaje huyó asustado!`, 'log-player', tgt)
      gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee' })
      b.fled = true
      b.over = true
    } else {
      const team = b.enemyTeam || []
      const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0)
      if (aliveOthers.length === 0) {
        addLogFn('¡Pero no hay nadie para sustituirle!', 'log-info', tgt)
        return
      }
      const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null
      addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-player', 'player')

      battleCtx.exitingEnemy.value = tgt
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)

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
  } else {
    if (!b.isTrainer && !b.isGym) {
      addLogFn(`¡${src.name} expulsó a ${tgt.name} del combate!`, 'log-enemy', src)
      gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player', type: 'flee' })
      b.fled = true
      b.over = true
    } else {
      const team = b.playerTeam || []
      const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0)
      if (aliveOthers.length === 0) {
        addLogFn('¡Pero no surtió efecto!', 'log-enemy', src)
        return
      }
      const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null
      addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-enemy', 'enemy_trainer')

      battleCtx.exitingPlayer.value = tgt
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)

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
  }
}
