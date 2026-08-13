const FAINT_ANIMATION_FALLBACK_DELAY_MS = 1300
const WITHDRAW_ANIMATION_FALLBACK_DELAY_MS = 800
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { findBestSwitchIndex } from './ai/battleAI.ts'
import { ShowdownTeamResolver } from './showdownTeamResolver.ts'
import { registerRewardCombatant } from './rewardsDistributor.ts'
import { syncTeamHP } from './battleStateSync.ts'
import { sleep } from '@/logic/utils/timeUtils'
import { gameBus } from '@/logic/events/gameBus'

import type { BattleSide } from '@/types/battle/battle'

interface EnemyFaintResolutionActions {
  processFaint: (ctx: BattleContext, side: BattleSide) => Promise<void>
  terminateBattle: (ctx: BattleContext, winParam: boolean, fled?: boolean) => Promise<void>
}

export async function processEnemyFaintSequence(ctx: BattleContext, pokemon: Pokemon, actions: EnemyFaintResolutionActions) {
  const active = ctx.activeBattle.value
  if (!active) return

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const isCurrentActiveBattle = () => ctx.activeBattle.value === active && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE
  if (!isCurrentActiveBattle()) return
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
      await sleep(FAINT_ANIMATION_FALLBACK_DELAY_MS)
    }
    if (!isCurrentActiveBattle()) return
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
  } else {
    // isTrainer / isNpc: Recall animation — trainer calls back their fainted pokemon
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    if (ctx.animations?.handleWithdrawRequest) {
      await ctx.animations.handleWithdrawRequest({ side: 'enemy', pokemon })
    } else {
      gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
      await sleep(WITHDRAW_ANIMATION_FALLBACK_DELAY_MS)
    }
    if (!isCurrentActiveBattle()) return
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
      if (!isCurrentActiveBattle()) return
    }
    active.enemy = null
    if (!isTr || !active.enemyTeam || !active.enemyTeam.some(p => p.hp > 0)) {
      active._initialEnemy = null
    }
  }

  // CHECK_REMAINING
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
  
  let nextEnemy: Pokemon | null = null
  let certifiedEnemySwitchChoice: string | null = null
  if (active.enemyTeam) {
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
      const { isMatchingUid } = await import('./showdownUidMapper.ts')
      const debugObj = window.__VITE_DEBUG__
      const pendingEntry = ShowdownBattleRunner.requirePendingHistoryEntry(debugObj)
      if (!pendingEntry) {
        // The final submitted turn already ended in Showdown. There is no
        // replacement request to replay, so the normal terminal path below
        // must close the visual battle without inventing a choice.
        certifiedEnemySwitchChoice = null
      } else {
        const history = Reflect.get(debugObj, 'history') as Array<{ p1Choice?: string; p2Choice?: string }> | undefined
        const historyIndex = Reflect.get(debugObj, 'replayHistoryIdx') as number | undefined
        
        let targetChoice = pendingEntry.p2Choice || ''
        if (!targetChoice.startsWith('switch ') && Array.isArray(history) && typeof historyIndex === 'number') {
          for (let i = historyIndex; i < history.length; i++) {
            const candidate = history[i]?.p2Choice
            if (candidate && candidate.startsWith('switch ')) {
              targetChoice = candidate
              break
            }
          }
        }

        certifiedEnemySwitchChoice = targetChoice
        if (targetChoice.startsWith('switch ')) {
          const slotIdx = parseInt(targetChoice.replace('switch ', '').trim(), 10) - 1
          const reqPokemon = (active.enemyRequest as { side?: { pokemon?: Array<{ ident?: string }> } })?.side?.pokemon
          const rawIdent = reqPokemon?.[slotIdx]?.ident || ''
          const candidateUid = rawIdent.split(': ')[1] || ''
          if (candidateUid) {
            nextEnemy = active.enemyTeam.find((p: Pokemon) => p.uid && isMatchingUid(p.uid, candidateUid)) || null
          }
          if (!nextEnemy) {
            nextEnemy = active.enemyTeam.find((p: Pokemon) => !p.fainted && p.hp > 0) || null
          }
        }
      }
    }
    const hasLiveEnemy = active.enemyTeam.some((p: Pokemon) => !p.fainted && p.hp > 0)
    if (!nextEnemy && hasLiveEnemy && typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode && window.__VITE_DEBUG__.certifiedReplayWorkerEnded !== true) {
      throw new Error(`[battleFaintSequence] Certified enemy replacement does not resolve to a live Pokémon. context=${JSON.stringify({ choice: certifiedEnemySwitchChoice })}`)
    }
    if (!nextEnemy && !(typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode)) {
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
    if (!isCurrentActiveBattle()) return
    
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
      active.switchingToEnemy = nextEnemy
      const p2Choice = certifiedEnemySwitchChoice ?? `switch ${ShowdownTeamResolver.getShowdownSlotForUid(active.enemyRequest, nextEnemy.uid)}`
      const result = await executeTurnInWorker('', p2Choice, true, false)
      if (!isCurrentActiveBattle()) return
      if (result) {
        active.playerRequest = result.p1Request
        active.enemyRequest = result.p2Request

        // Parsear logs para aplicar el daño/debilitación por hazards
        const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')
        const filteredLogs = filterShowdownLogs(result.logs)
        for (const logLine of filteredLogs) {
          await parseShowdownLogLine(ctx, logLine, filteredLogs)
        }
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
          const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
          ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__)
        }
      }
      delete active.switchingToEnemy
    }

    if (nextEnemy.hp <= 0) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      await actions.processFaint(ctx, 'enemy')
      return
    }

    active.enemy = nextEnemy
    if (ctx.animations?.handleReleaseRequest) {
      await ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: nextEnemy })
    } else {
      gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
    }

    if (!isCurrentActiveBattle()) return
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
  await actions.terminateBattle(ctx, true)
}
