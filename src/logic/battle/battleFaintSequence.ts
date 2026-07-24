import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { findBestSwitchIndex } from './ai/battleAI.ts'
import { ShowdownTeamResolver } from './showdownTeamResolver.ts'
import { registerRewardCombatant } from './rewardsDistributor.ts'
import { syncTeamHP } from './battleStateSync.ts'
import { terminateBattle } from './resolution.ts'
import { sleep } from '@/logic/utils/timeUtils'
import { gameBus } from '@/logic/events/gameBus'

export async function processEnemyFaintSequence(ctx: BattleContext, pokemon: Pokemon) {
  const active = ctx.activeBattle.value
  if (!active) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const isTr = active.isTrainer || active.isGym || active.isPvP
  const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
  ctx.addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
  
  // ENEMY_REPLACEMENT_SEQ Starts
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TYPE_CHECK)

  if (!isTr) {
    // isWild: Defeat animation
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
    if (ctx.animations?.handleFaintAnim) {
      await ctx.animations.handleFaintAnim({ side: 'enemy' })
    } else {
      await sleep(1300)
    }
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
  } else {
    // isTrainer / isNpc: Recall animation
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    if (ctx.animations?.handleCatchRequest) {
      await ctx.animations.handleCatchRequest({ side: 'enemy', pokemon })
    } else {
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      await sleep(800)
    }
  }

  // CLEANUP_MEMORY
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
  if (active) {
    registerRewardCombatant(active)
    syncTeamHP(ctx)
    if (isTr && ctx.animations?.playBallFadeOut) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
      await ctx.animations.playBallFadeOut('enemy')
    }
    active.enemy = null
    if (!isTr || !active.enemyTeam || !active.enemyTeam.some(p => p.hp > 0)) {
      active._initialEnemy = null
    }
  }

  // CHECK_REMAINING
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
  
  let nextEnemy: Pokemon | null = null
  if (active.enemyTeam) {
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
      const { isMatchingUid } = await import('./showdownUidMapper.ts')
      const debugObj = window.__VITE_DEBUG__
      const enemyChoices = (debugObj?.enemyChoices as string[]) || [];
      const runner = new ShowdownBattleRunner(debugObj.playerChoices || [], enemyChoices)
      runner.p1ChoiceIdx = debugObj.p1ChoiceIdx || 0
      runner.p2ChoiceIdx = debugObj.p2ChoiceIdx || 0
      const rawChoice = runner.resolveAndConsumeNextChoice('p2', active.enemyRequest)
      debugObj.p1ChoiceIdx = runner.p1ChoiceIdx
      debugObj.p2ChoiceIdx = runner.p2ChoiceIdx
      if (rawChoice.startsWith('switch ')) {
        const slotIdx = parseInt(rawChoice.replace('switch ', '').trim(), 10) - 1
        const reqPokemon = (active.enemyRequest as { side?: { pokemon?: Array<{ ident?: string }> } })?.side?.pokemon
        const rawIdent = reqPokemon?.[slotIdx]?.ident || ''
        const candidateUid = rawIdent.split(': ')[1] || ''
        if (candidateUid) {
          nextEnemy = active.enemyTeam.find((p: Pokemon) => p.uid && isMatchingUid(p.uid, candidateUid)) || null
        }
      }
    }
    if (!nextEnemy) {
      const activePlayer = active.player || active.enemyTeam[0]
      if (activePlayer) {
        const bestIdx = findBestSwitchIndex(
          active.enemyTeam,
          activePlayer,
          pokemon.uid,
          ctx
        )
        if (bestIdx !== -1) {
          nextEnemy = active.enemyTeam[bestIdx] || null
        } else {
          nextEnemy = active.enemyTeam.find((p: Pokemon) => p.hp > 0) || null
        }
      } else {
        nextEnemy = active.enemyTeam.find((p: Pokemon) => p.hp > 0) || null
      }
    }
  }

  if (nextEnemy) {
    // STABILIZE_STAGE
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EMPTY_WAIT)
    await sleep(200) // organic sleep
    
    const s = ctx.enemyStages.value
    ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, 
      reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
    
    // AI_NEXT_PICK
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
    
    // NEXT_PICK_TYPE -> POKEMON_CALL
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.NEXT_PICK_TYPE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)
    
    ctx.faintedSides.value.delete('enemy')
    ctx.addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
    
    const { showdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
    if (showdownWorker && active.enemyTeam) {
      const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.enemyRequest, nextEnemy.uid)
      active.switchingToEnemy = nextEnemy
      const result = await executeTurnInWorker('', `switch ${slot}`)
      if (result) {
        active.playerRequest = result.p1Request
        active.enemyRequest = result.p2Request

        // Parsear logs para aplicar el daño/debilitación por hazards
        const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')
        const filteredLogs = filterShowdownLogs(result.logs)
        for (const logLine of filteredLogs) {
          await parseShowdownLogLine(ctx, logLine, filteredLogs)
        }
      }
      delete active.switchingToEnemy
    }

    if (nextEnemy.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      const { processFaint } = await import('./resolution.ts')
      await processFaint(ctx, 'enemy')
      return
    }

    active.enemy = nextEnemy
    if (ctx.animations?.handleReleaseRequest) {
      await ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: nextEnemy })
    } else {
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  // No remaining / isWild -> End battle
  if (active) {
    active.over = true
    registerRewardCombatant(active)
    active.enemy = null
    active._initialEnemy = null
  }
  ctx.faintedSides.value.add('enemy')
  await terminateBattle(ctx, true)
}
