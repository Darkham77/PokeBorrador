import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'

export async function processNonForcedSwitchWorkerTurn(
  ctx: BattleContext,
  newPoke: { uid: string },
  oldPoke: { uid: string } | null
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, persistBattle, animations } = ctx
  console.debug('[switchAction] executeSwitch non-forced branch: importing dependencies...')
  const { showdownWorker, executeTurnInWorker, syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
  if (!showdownWorker) return

  const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
  const { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } = await import('../ai/battleAI.ts')

  console.debug('[switchAction] transitioning FSM to BUILD_QUEUE...')
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
  console.debug('[switchAction] transitioning FSM to POP_ACTION...')
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

  const active = activeBattle.value
  if (!active || !active.enemy || !active.player) {
    console.warn('[switchAction] activeBattle or participants are null!', { active: !!active, enemy: !!active?.enemy, player: !!active?.player })
    return
  }

  console.debug('[switchAction] resolving slot...')
  const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.playerRequest, newPoke.uid)
  let p1Choice = `switch ${slot}`
  const isWild = !active.isTrainer && !active.isGym

  let p2Choice = 'struggle'
  const enemyTeam = active.enemyTeam
  const wantSwitch = !isWild && shouldEnemySwitch(active.enemy, active.player, enemyTeam, ctx)
  if (wantSwitch) {
    const bestIdx = findBestSwitchIndex(enemyTeam || [], active.player, active.enemy.uid, ctx)
    if (bestIdx !== -1) {
      const targetMon = enemyTeam?.[bestIdx]
      if (targetMon && targetMon.uid) {
        const p2Slot = ShowdownTeamResolver.getShowdownSlotForUid(active?.enemyRequest, targetMon.uid)
        p2Choice = `switch ${p2Slot}`
      }
    }
  } else {
    console.debug('[switchAction] deciding enemy move...', { enemy: active.enemy.name, player: active.player.name })
    let eMove = decideEnemyMove(active.enemy, active.player, ctx.enemyStages.value, isWild, ctx)
    if (active.enemy.volatileCounters?.['lockedmove'] && active.enemy.volatileCounters['lockedmove'] > 0 && active.enemy.lastMove) {
      eMove = active.enemy.lastMove
    }
    if (eMove) {
      p2Choice = `move ${eMove.id}`
    }
  }
  let p2Skip = false
  if (active?.enemyRequest?.wait) {
    p2Skip = true
  }

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
    if (!p2Skip) {
      p2Choice = window.__VITE_DEBUG__.nextEnemyChoice
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in switchAction: ${p2Choice}`)
      window.__VITE_DEBUG__.nextEnemyChoice = undefined
    } else {
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in switchAction because P2 is in wait state.`)
    }
  } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
    p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice
  }

  let result
  let p1Skip = false
  if (p1Choice === 'pass') {
    p1Choice = ''
    p1Skip = true
  }
  if (p2Choice === 'pass') {
    p2Choice = ''
    p2Skip = true
  }
  try {
    console.debug('[switchAction] calling executeTurnInWorker...', { p1Choice, p2Choice, p1Skip, p2Skip })
    result = await executeTurnInWorker(p1Choice, p2Choice, p1Skip, p2Skip)
    console.debug(`[E2E-DEBUG-SWITCH-RESULT] logs: ${JSON.stringify(result.logs)}`)
  } catch (error) {
    console.error('[switchAction] executeTurnInWorker thrown:', error)
    if (oldPoke && activeBattle.value) {
      activeBattle.value.player = oldPoke as Pokemon
      const oldIndex = (ctx.gs.state.team || []).findIndex(p => p?.uid === oldPoke.uid)
      if (oldIndex !== -1 && activeBattle.value) {
        activeBattle.value.playerTeamIndex = oldIndex
      }
    }
    persistBattle()
    throw error
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

  active.playerRequest = result.p1Request
  active.enemyRequest = result.p2Request

  ;(active as unknown as Record<string, unknown>).switchingToPlayer = newPoke
  const filteredLogs = filterShowdownLogs(result.logs)
  for (const logLine of filteredLogs) {
    await parseShowdownLogLine(ctx, logLine, filteredLogs)
  }

  await syncTeamsFromLastWorkerState()
  delete (active as unknown as Record<string, unknown>).switchingToPlayer

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

  if (activeBattle.value?.over) {
    if (activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      if (animations?.awaitTween) {
        await animations.awaitTween('escape-enemy')
      }
      await ctx.endBattle(false, true)
    }
  }
}
