import type { BattleContext } from '@/types/battle/battleContext'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'
import { isRevivingForceSwitchRequest } from '../helpers/requestHelper.ts'

import { checkLockedVolatiles, resetPlayerStages } from './switchActionHelpers.ts'

export async function executeSwitch(ctx: BattleContext, teamIndex: number, isForced = false) {
  const active = ctx.activeBattle.value
  if (!active) return
  if (active.isExecutingSwitch) {
    console.warn('[switchAction] executeSwitch already executing. Aborting duplicate call.');
    return
  }
  if (ctx.fsm.currentState?.value === ctx.BATTLE_STATES.REORDER_TEAM) {
    console.warn('[switchAction] executeSwitch called while already transitioning in REORDER_TEAM. Aborting duplicate call.');
    return
  }

  active.isExecutingSwitch = true
  try {
    await runSwitchSequence(ctx, teamIndex, isForced)
  } finally {
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.isExecutingSwitch = false
    }
  }
}

async function runSwitchSequence(ctx: BattleContext, teamIndex: number, isForced = false) {
  const { gs, activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, playerStages, persistBattle } = ctx

  const oldPoke = activeBattle.value?.player
  const req = activeBattle.value?.playerRequest
  const isRevivingTarget = isRevivingForceSwitchRequest(req)
  const forceSw = req?.forceSwitch
  const isForceBool = typeof forceSw === 'boolean' && forceSw
  const isForceArr = Array.isArray(forceSw) && forceSw.some(Boolean)
  const hasForceSwitch = !isRevivingTarget && (isForceBool || isForceArr)
  const isFaintState = (fsm.currentState?.value as string) === 'PLAYER_FAINT_SEQ'
    || (fsm.currentSubState?.value as string) === 'PLAYER_FAINT_SEQ'
    || (fsm.currentSubState?.value as string) === 'SWITCH_MENU'
    || ctx.uiStore?.isBattleSwitchForced === true
    || !oldPoke
    || (oldPoke && oldPoke.hp <= 0)
  const reallyForced = isForced || hasForceSwitch || isFaintState

  if (!reallyForced) {
    const { isPlayerTrappedInWorker } = await import('../orchestrator.ts')
    const isTrapped = await isPlayerTrappedInWorker()
    if (isTrapped) {
      const { useUIStore } = await import('@/stores/ui')
      useUIStore().notify('¡No puedes cambiar de Pokémon ahora! (Atrapado)', '🚫')
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      return
    }
  }

  await fsm.transition(BATTLE_STATES.REORDER_TEAM)
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
  
  const targetMon = gs.state.team[teamIndex]
  const newPoke = targetMon
  if (!newPoke || (newPoke.hp <= 0 && !isRevivingTarget)) {
    console.warn(`[switchAction] Cannot switch to fainted or missing Pokémon: ${newPoke?.name ?? 'unknown'}`);
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }
  
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_ACTIVE_SEAT)
  if (!activeBattle.value) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  if (isRevivingTarget) {
    await processForcedSwitchWorkerTurn(ctx, newPoke, true)
    persistBattle()
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }
  
  if (oldPoke && !reallyForced && checkLockedVolatiles(oldPoke as { volatileCounters?: Record<string, number> })) { // domain-ok: Open dynamic text or non-domain string payload
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  if (oldPoke && oldPoke.uid === newPoke.uid) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  if (oldPoke && oldPoke.hp > 0 && !reallyForced) {
    const { processSwitchSwapAnimations } = await import('./switchSequenceHelper.ts')
    await processSwitchSwapAnimations(ctx, oldPoke, newPoke, teamIndex)
  } else {
    const { processSwitchCallAnimations } = await import('./switchSequenceHelper.ts')
    await processSwitchCallAnimations(ctx, newPoke, teamIndex)
  }
  
  if (!activeBattle.value.participants) {
    activeBattle.value.participants = []
  }
  if (!activeBattle.value.participants.includes(newPoke.uid)) {
    activeBattle.value.participants.push(newPoke.uid)
  }
  
  playerStages.value = resetPlayerStages(playerStages.value)
  
  Reflect.set(activeBattle.value, '_playerSwitchLogged', true)
  addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)

  persistBattle()
  
  if (!reallyForced) {
    const { processNonForcedSwitchWorkerTurn } = await import('./switchWorkerTurn.ts')
    await processNonForcedSwitchWorkerTurn(ctx, newPoke, oldPoke || null)
  } else {
    await processForcedSwitchWorkerTurn(ctx, newPoke)
  }

  const { useUIStore } = await import('@/stores/ui')
  const { useModalStore } = await import('@/stores/modals')
  useModalStore().close('PokemonSelection')

  if (newPoke.hp > 0 && !activeBattle.value?.over) {
    useUIStore().isBattleSwitchForced = false
    persistBattle()
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  } else {
    persistBattle()
  }
}

async function processForcedSwitchWorkerTurn(
  ctx: BattleContext,
  newPoke: NonNullable<BattleContext['activeBattle']['value']>['player'],
  isRevivingTarget = false
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!activeBattle.value || !newPoke) return
  const active = activeBattle.value
  try {
    const { executeTurnInWorker } = await import('../showdownWorkerClient.ts')
    const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.playerRequest, newPoke.uid)
    const p1Choice = `switch ${slot}`
    const p2Choice = ''
    const p2Skip = true
    const switchResult = await executeTurnInWorker(p1Choice, p2Choice, false, p2Skip)
    if (switchResult) {
      active.playerRequest = switchResult.p1Request
      active.enemyRequest = switchResult.p2Request

      const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
      const filteredLogs = filterShowdownLogs(switchResult.logs)
      for (const logLine of filteredLogs) {
        await parseShowdownLogLine(ctx, logLine, filteredLogs)
      }

      const { syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
      await syncTeamsFromLastWorkerState()
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
        const { ShowdownBattleRunner } = await import('../helpers/showdownBattleRunner.ts')
        ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__)
      }

      const { handleForceSwitch } = await import('../resolution.ts')
      const { isRevivingForceSwitchRequest } = await import('../helpers/requestHelper.ts')
      const p2Force = !!switchResult.p2Request?.forceSwitch?.some((x: boolean) => !!x) && !isRevivingForceSwitchRequest(switchResult.p2Request)
      if (p2Force) {
        await handleForceSwitch(ctx, 'enemy')
      }
    }

    if (!isRevivingTarget && newPoke.hp <= 0) {
      const { processFaint } = await import('../resolution.ts')
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
      await processFaint(ctx, 'player')
    }
  } catch (forcedErr) {
    console.error('[switchAction] CRITICAL error in forced executeSwitch:', forcedErr)
    throw forcedErr
  }
}
