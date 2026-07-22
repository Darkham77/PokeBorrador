import { sleep } from '@/logic/utils/timeUtils'
import type { BattleContext } from '@/types/battle/battleContext'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'
import { handleEntryAbilities, applyEntryHazards } from '../battleFlow.ts'

let isExecutingSwitch = false

export async function executeSwitch(ctx: BattleContext, teamIndex: number, isForced = false) {
  if (isExecutingSwitch) {
    console.warn('[switchAction] executeSwitch already executing. Aborting duplicate call.');
    return
  }
  if (ctx.fsm.currentState?.value === ctx.BATTLE_STATES.REORDER_TEAM) {
    console.warn('[switchAction] executeSwitch called while already transitioning in REORDER_TEAM. Aborting duplicate call.');
    return
  }

  isExecutingSwitch = true
  try {
    await runSwitchSequence(ctx, teamIndex, isForced)
  } finally {
    isExecutingSwitch = false
  }
}

async function runSwitchSequence(ctx: BattleContext, teamIndex: number, isForced = false) {
  const { gs, activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, playerStages, enemyStages, persistBattle } = ctx

  const oldPoke = activeBattle.value?.player
  const req = activeBattle.value?.playerRequest
  const hasForceSwitch = !!(req && req.forceSwitch && ((req.forceSwitch as unknown) === true || (Array.isArray(req.forceSwitch) && req.forceSwitch.some(x => !!x))))
  const isFaintState = (fsm.currentState?.value as unknown as string) === 'PLAYER_FAINT_SEQ' || fsm.currentSubState?.value === 'PLAYER_FAINT_SEQ' || (fsm.currentState?.value as unknown as string) === 'SWITCH_MENU' || fsm.currentSubState?.value === 'SWITCH_MENU'
  const reallyForced = isForced || hasForceSwitch || isFaintState || (oldPoke && oldPoke.hp <= 0)

  if (!reallyForced) {
    const { isPlayerTrappedInWorker } = await import('../orchestrator.ts')
    const isTrapped = await isPlayerTrappedInWorker()
    if (isTrapped) {
      const { useUIStore } = await import('@/stores/ui')
      ;(useUIStore() as unknown as { notify: (msg: string, icon: string) => void }).notify('¡No puedes cambiar de Pokémon ahora! (Atrapado)', '🚫')
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      return
    }
  }

  await fsm.transition(BATTLE_STATES.REORDER_TEAM)
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
  
  const newPoke = gs.state.team[teamIndex]
  if (!newPoke || newPoke.hp <= 0) return
  
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_ACTIVE_SEAT)
  if (!activeBattle.value) return
  
  if (oldPoke && !reallyForced) {
    const volatile = oldPoke.volatileCounters
    if (volatile) {
      if ((volatile['twoturnmove'] && volatile['twoturnmove'] > 0) ||
          (volatile['lockedmove'] && volatile['lockedmove'] > 0)) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
        return
      }
    }
  }
  
  if (oldPoke && oldPoke.uid === newPoke.uid) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  if (oldPoke && oldPoke.hp > 0) {
    const { processSwitchSwapAnimations } = await import('./switchSequenceHelper.ts')
    await processSwitchSwapAnimations(ctx, oldPoke, newPoke, teamIndex)
  } else {
    const { processSwitchCallAnimations } = await import('./switchSequenceHelper.ts')
    await processSwitchCallAnimations(ctx, newPoke, teamIndex)
  }
  
  if (!activeBattle.value.participants.includes(newPoke.uid)) {
    activeBattle.value.participants.push(newPoke.uid)
  }
  
  const s = playerStages.value
  playerStages.value = { 
    ...s,
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0
  }
  
  addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
  await sleep(400)

  applyEntryHazards(newPoke, playerStages.value, addLog)
  
  if (activeBattle.value && activeBattle.value.enemy) {
    handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog, activeBattle.value.weather?.type)
  }
  persistBattle()
  
  if (!reallyForced) {
    const { processNonForcedSwitchWorkerTurn } = await import('./switchWorkerTurn.ts')
    await processNonForcedSwitchWorkerTurn(ctx, newPoke, oldPoke || null)
  } else {
    // Si es un cambio forzado (por debilitación)
    if (activeBattle.value) {
      const active = activeBattle.value
      try {
        console.debug('[switchAction] executeSwitch forced branch: resolving slot...')
        const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.playerRequest, newPoke.uid)
        const { executeTurnInWorker } = await import('../showdownWorkerClient.ts')

        console.debug('[switchAction] calling executeTurnInWorker for forced switch...', { slot })
        const switchResult = await executeTurnInWorker(`switch ${slot}`, undefined)
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
        }

        if (newPoke.hp <= 0) {
          const { processFaint } = await import('../resolution.ts')
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
          await processFaint(ctx, 'player')
          return
        }
      } catch (forcedErr) {
        console.error('[switchAction] CRITICAL error in forced executeSwitch:', forcedErr)
        throw forcedErr
      }
    }
  }

  persistBattle()
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}
