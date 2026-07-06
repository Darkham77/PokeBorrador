import { sleep } from '@/logic/utils/timeUtils'
import { clearVolatileStatus } from '../battleStatus.ts'
import { handleEntryAbilities, applyEntryHazards } from '../battleFlow.ts'
import { runEnemyAction } from '../battleTurn.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { resolveShowdownSlot } from '../showdownAdapter.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'

export async function executeSwitch(ctx: BattleContext, teamIndex: number, isForced = false) {
  const { gs, activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, exitingPlayer, animations, playerStages, enemyStages, persistBattle, handleFaint } = ctx

  if (typeof isForced !== 'undefined' && !isForced) {
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
  const oldPoke = activeBattle.value.player
  
  if (oldPoke && !isForced) {
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
  
  if (typeof isForced !== 'undefined' && !isForced) {
    try {
      console.log('[switchAction] executeSwitch non-forced branch: importing dependencies...');
      const { showdownWorker, executeTurnInWorker } = await import('../orchestrator.ts')
      if (showdownWorker) {
        const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
        const { decideEnemyMove } = await import('../ai/battleAI.ts')

        console.log('[switchAction] transitioning FSM to BUILD_QUEUE...');
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
        console.log('[switchAction] transitioning FSM to POP_ACTION...');
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

        const active = activeBattle.value
        if (!active || !active.enemy || !active.player) {
          console.warn('[switchAction] activeBattle or participants are null!', { active: !!active, enemy: !!active?.enemy, player: !!active?.player });
          return
        }

        console.log('[switchAction] resolving slot...');
        const slot = resolveShowdownSlot(active, 'player', newPoke.uid)
        const p1Choice = `switch ${slot}`
        const isWild = !active.isTrainer && !active.isGym
        console.log('[switchAction] deciding enemy move...', { enemy: active.enemy.name, player: active.player.name });
        let eMove = decideEnemyMove(active.enemy, active.player, ctx.enemyStages.value, isWild)
        if (active.enemy.volatileCounters?.['lockedmove'] && active.enemy.volatileCounters['lockedmove'] > 0 && active.enemy.lastMove) {
          eMove = active.enemy.lastMove
        }
        const p2Choice = eMove ? `move ${eMove.id}` : 'struggle'

        console.log('[switchAction] building hp/status maps...');
        const team = (gs.state.team || []).filter((p): p is Pokemon => !!p);
        const p1Hps: Record<string, number> = {};
        const p1Statuses: Record<string, string> = {};
        for (const p of team) {
          p1Hps[p.uid] = p.hp;
          p1Statuses[p.uid] = p.status ?? '';
        }

        const enemyTeam = (active.enemyTeam || (active._initialEnemy ? [active._initialEnemy] : [])).filter((p): p is Pokemon => !!p);
        const p2Hps: Record<string, number> = {};
        const p2Statuses: Record<string, string> = {};
        for (const p of enemyTeam) {
          p2Hps[p.uid] = p.hp;
          p2Statuses[p.uid] = p.status ?? '';
        }

        let result;
        try {
          console.log('[switchAction] calling executeTurnInWorker...', { p1Choice, p2Choice });
          result = await executeTurnInWorker(p1Choice, p2Choice)
          console.log(`[E2E-DEBUG-SWITCH-RESULT] logs: ${JSON.stringify(result.logs)}`);
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
        console.log('[switchAction] executeSwitch forced branch: resolving slot...');
        const slot = resolveShowdownSlot(active, 'player', newPoke.uid)
        const { executeTurnInWorker } = await import('../orchestrator.ts')

        const team = (gs.state.team || []).filter((p): p is Pokemon => !!p);
        const p1Hps: Record<string, number> = {};
        const p1Statuses: Record<string, string> = {};
        for (const p of team) {
          p1Hps[p.uid] = p.hp;
          p1Statuses[p.uid] = p.status ?? '';
        }

        const enemyTeam = (active.enemyTeam || (active._initialEnemy ? [active._initialEnemy] : [])).filter((p): p is Pokemon => !!p);
        const p2Hps: Record<string, number> = {};
        const p2Statuses: Record<string, string> = {};
        for (const p of enemyTeam) {
          p2Hps[p.uid] = p.hp;
          p2Statuses[p.uid] = p.status ?? '';
        }

        console.log('[switchAction] calling executeTurnInWorker for forced switch...', { slot });
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

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE)
  }
  
  persistBattle()
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}
