import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'

export async function processNonForcedSwitchWorkerTurn(
  ctx: BattleContext,
  newPoke: { uid: string },
  oldPoke: { uid: string } | null,
  side: 'player' | 'enemy' = 'player'
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, persistBattle, animations } = ctx
  console.debug('[switchAction] executeSwitch non-forced branch: importing dependencies...')
  const { showdownWorker, executeTurnInWorker, syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
  if (!showdownWorker) return

  const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
  const { decideEnemyMove } = await import('../ai/battleAI.ts')

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
  const req = side === 'player' ? active.playerRequest : active.enemyRequest
  const slot = ShowdownTeamResolver.getShowdownSlotForUid(req, newPoke.uid)
  let p1Choice = side === 'player' ? `switch ${slot}` : ''
  const isWild = !active.isTrainer && !active.isGym

  const { computeP2Choice } = await import('../battleTurnChoiceHelper.ts')
  let p2Choice = ''
  if (side === 'player') {
    let eMove = decideEnemyMove(active.enemy, active.player, ctx.playerStages?.value ?? {}, isWild, ctx)
    if (active.enemy.volatileCounters?.['lockedmove'] && active.enemy.volatileCounters['lockedmove'] > 0 && active.enemy.lastMove) {
      eMove = active.enemy.lastMove
    }
    p2Choice = await computeP2Choice(ctx, active.player, active.enemy, isWild, false, eMove)
  } else {
    p2Choice = `switch ${slot}`
  }

  let p1Skip = side !== 'player'
  let p2Skip = false

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
    console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via queue in switchAction: ${p2Choice}`)
  }

  let result
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
      if (side === 'player') {
        activeBattle.value.player = oldPoke as Pokemon
        const oldIndex = (ctx.gs.state.team || []).findIndex(p => p?.uid === oldPoke.uid)
        if (oldIndex !== -1 && activeBattle.value) {
          activeBattle.value.playerTeamIndex = oldIndex
        }
      } else {
        activeBattle.value.enemy = oldPoke as Pokemon
      }
    }
    persistBattle()
    throw error
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

  active.playerRequest = result.p1Request
  active.enemyRequest = result.p2Request

  ;(active as unknown as Record<string, unknown>)[side === 'player' ? 'switchingToPlayer' : 'switchingToEnemy'] = newPoke
  const filteredLogs = filterShowdownLogs(result.logs)
  for (const logLine of filteredLogs) {
    await parseShowdownLogLine(ctx, logLine, filteredLogs)
  }

  await syncTeamsFromLastWorkerState()
  delete (active as unknown as Record<string, unknown>)[side === 'player' ? 'switchingToPlayer' : 'switchingToEnemy']

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

  const activeCombatant = side === 'player' ? activeBattle.value?.player : activeBattle.value?.enemy
  if (activeCombatant && activeCombatant.hp <= 0) {
    const { processFaint } = await import('../resolution.ts')
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    await processFaint(ctx, side)
    return
  }

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
