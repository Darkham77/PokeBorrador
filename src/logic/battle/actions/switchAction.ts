import { sleep } from '@/logic/utils/timeUtils'
import { clearVolatileStatus } from '../battleStatus.ts'
import { handleEntryAbilities, applyEntryHazards } from '../battleFlow.ts'
import { runEnemyAction } from '../battleTurn.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'

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
  const { gs, activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, exitingPlayer, animations, playerStages, enemyStages, persistBattle, handleFaint } = ctx

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
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
    addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
    addLog(`¡Envía a ${newPoke.name}!`, 'log-info', newPoke)
    

    exitingPlayer.value = oldPoke
    activeBattle.value.player = newPoke
    activeBattle.value.playerTeamIndex = teamIndex
    clearVolatileStatus(oldPoke)

    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }

    const withdrawPromise = animations?.handleCatchRequest
      ? animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
      : Promise.resolve()

    const sendOutPromise = animations?.handleReleaseRequest
      ? animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
      : Promise.resolve()

    await Promise.all([withdrawPromise, sendOutPromise])
    exitingPlayer.value = null
  } else {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    activeBattle.value.player = newPoke
    activeBattle.value.playerTeamIndex = teamIndex
    
    if (animations?.handleReleaseRequest) {
      await animations.handleReleaseRequest({ side: 'player', pokemon: newPoke })
    } else {
      await sleep(800)
    }
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
    try {
      console.debug('[switchAction] executeSwitch non-forced branch: importing dependencies...');
      const { showdownWorker, executeTurnInWorker } = await import('../showdownWorkerClient.ts')
      if (showdownWorker) {
        const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
        const { decideEnemyMove } = await import('../ai/battleAI.ts')

        console.debug('[switchAction] transitioning FSM to BUILD_QUEUE...');
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
        console.debug('[switchAction] transitioning FSM to POP_ACTION...');
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

        const active = activeBattle.value
        if (!active || !active.enemy || !active.player) {
          console.warn('[switchAction] activeBattle or participants are null!', { active: !!active, enemy: !!active?.enemy, player: !!active?.player });
          return
        }

        console.debug('[switchAction] resolving slot...');
        const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.playerRequest, newPoke.uid)
        let p1Choice = `switch ${slot}`
        const isWild = !active.isTrainer && !active.isGym
        console.debug('[switchAction] deciding enemy move...', { enemy: active.enemy.name, player: active.player.name });
        let eMove = decideEnemyMove(active.enemy, active.player, ctx.enemyStages.value, isWild, ctx)
        if (active.enemy.volatileCounters?.['lockedmove'] && active.enemy.volatileCounters['lockedmove'] > 0 && active.enemy.lastMove) {
          eMove = active.enemy.lastMove
        }
        let p2Choice = eMove ? `move ${eMove.id}` : 'struggle'
        let p2Skip = false;
        if (active?.enemyRequest?.wait) {
          p2Skip = true;
        }

        // Interceptar elección de enemigo si está inyectada dinámicamente en el test determinista
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
          if (!p2Skip) {
            p2Choice = window.__VITE_DEBUG__.nextEnemyChoice;
            console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in switchAction: ${p2Choice}`);
            window.__VITE_DEBUG__.nextEnemyChoice = undefined;
          } else {
            console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in switchAction because P2 is in wait state.`);
          }
        } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
          p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice;
        }

        console.debug('[switchAction] building hp/status maps...');


        let result;
        let p1Skip = false;
        if (p1Choice === 'pass') {
          p1Choice = '';
          p1Skip = true;
        }
        if (p2Choice === 'pass') {
          p2Choice = '';
          p2Skip = true;
        }
        try {
          console.debug('[switchAction] calling executeTurnInWorker...', { p1Choice, p2Choice, p1Skip, p2Skip });
          result = await executeTurnInWorker(p1Choice, p2Choice, p1Skip, p2Skip)
          console.debug(`[E2E-DEBUG-SWITCH-RESULT] logs: ${JSON.stringify(result.logs)}`);
        } catch (error) {
          console.error('[switchAction] executeTurnInWorker thrown:', error);
          if (oldPoke) {
            activeBattle.value.player = oldPoke;
            const oldIndex = (gs.state.team || []).findIndex(p => p?.uid === oldPoke.uid);
            if (oldIndex !== -1) {
              activeBattle.value.playerTeamIndex = oldIndex;
            }
          }
          persistBattle();
          throw error;
        }

        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

        active.playerRequest = result.p1Request;
        active.enemyRequest = result.p2Request;
        
        (active as unknown as Record<string, unknown>).switchingToPlayer = newPoke;
        const filteredLogs = filterShowdownLogs(result.logs)
        for (const logLine of filteredLogs) {
          await parseShowdownLogLine(ctx, logLine, filteredLogs)
        }

        const { syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
        await syncTeamsFromLastWorkerState()
        delete (active as unknown as Record<string, unknown>).switchingToPlayer;

        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

        if (activeBattle.value?.over) {
          if (activeBattle.value.fled) {
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
            if (animations?.awaitTween) {
              await animations.awaitTween('escape-enemy')
            } else {
              await sleep(800)
            }
            await ctx.endBattle(false, true)
          }
          return
        }

        const playerFainted = activeBattle.value?.player && activeBattle.value.player.hp <= 0
        const enemyFainted = activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0

        if (playerFainted || enemyFainted) {
          if (playerFainted && enemyFainted) {
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
            await handleFaint('player')
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
            await handleFaint('enemy')
          } else if (playerFainted) {
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
            await handleFaint('player')
            return
          } else {
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
            await handleFaint('enemy')
            return
          }
        }

        if (result.isOver && activeBattle.value) {
          activeBattle.value.over = true
        }
      } else {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
        await runEnemyAction(ctx)
        
        if (
          fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE ||
          activeBattle.value?.over ||
          fsm.currentSubState.value === BATTLE_SUBSTATES.SWITCH_MENU ||
          fsm.currentSubState.value === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ ||
          fsm.currentSubState.value === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ
        ) {
          return
        }

        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

        if (activeBattle.value?.player && activeBattle.value.player.hp <= 0) {
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
          await handleFaint('player')
          return
        }
        if (activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0) {
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
          await handleFaint('enemy')
          return
        }
      }
    } catch (outerErr) {
      console.error('[switchAction] CRITICAL error in non-forced executeSwitch:', outerErr)
      throw outerErr
    }
  } else {
    // Si es un cambio forzado (por debilitación)
    if (activeBattle.value) {
      const active = activeBattle.value
      try {
        console.debug('[switchAction] executeSwitch forced branch: resolving slot...');
        const slot = ShowdownTeamResolver.getShowdownSlotForUid(active.playerRequest, newPoke.uid)
        const { executeTurnInWorker } = await import('../showdownWorkerClient.ts')



        console.debug('[switchAction] calling executeTurnInWorker for forced switch...', { slot });
        const switchResult = await executeTurnInWorker(`switch ${slot}`, undefined)
        if (switchResult) {
          active.playerRequest = switchResult.p1Request
          active.enemyRequest = switchResult.p2Request

          // Parsear logs para aplicar el daño/debilitación por hazards
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
