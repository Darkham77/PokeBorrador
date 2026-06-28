import { sleep } from '@/logic/utils/timeUtils'
import { clearVolatileStatus } from '../battleStatus.ts'
import { handleEntryAbilities, applyEntryHazards } from '../battleFlow.ts'
import { runEnemyAction } from '../battleTurn.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { resolveShowdownSlot, swapActivePokemon } from '../showdownAdapter.ts'
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
    const { showdownWorker, executeTurnInWorker } = await import('../orchestrator.ts')
    if (showdownWorker) {
      const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
      const { decideEnemyMove } = await import('../ai/battleAI.ts')

      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

      const active = activeBattle.value
      if (!active || !active.enemy || !active.player) return

       const slot = resolveShowdownSlot(active, 'player', newPoke.uid, gs.state.team || [])
      const p1Choice = `switch ${slot}`
      const currentOrder = active.showdownPlayerTeamOrder || (active.playerTeam || gs.state.team || []).filter((p): p is Pokemon => !!p).map(p => p.uid)
      active.showdownPlayerTeamOrder = swapActivePokemon(currentOrder, newPoke.uid)
      const isWild = !active.isTrainer && !active.isGym
      let eMove = decideEnemyMove(active.enemy, active.player, ctx.enemyStages.value, isWild)
      if (active.enemy.volatileCounters?.['lockedmove'] && active.enemy.volatileCounters['lockedmove'] > 0 && active.enemy.lastMove) {
        eMove = active.enemy.lastMove
      }
      const p2Choice = eMove ? `move ${eMove.id}` : 'struggle'

       const playerOrder = active.initialPlayerTeamOrder || (active.playerTeam || gs.state.team || []).filter((p): p is Pokemon => !!p).map(p => p.uid);
       const team = gs.state.team || [];
       const p1Hps = playerOrder.map(uid => team.find(p => p?.uid === uid)?.hp ?? 0);
 
       const enemyOrder = active.initialEnemyTeamOrder || (active.enemyTeam || (active._initialEnemy ? [active._initialEnemy] : [])).filter((p): p is Pokemon => !!p).map(p => p.uid);
       const enemyTeam = (active.enemyTeam || (active._initialEnemy ? [active._initialEnemy] : [])).filter((p): p is Pokemon => !!p);
       const p2Hps = enemyOrder.map(uid => enemyTeam.find(p => p?.uid === uid)?.hp ?? 0);

      let result;
      try {
        result = await executeTurnInWorker(p1Choice, p2Choice, p1Hps, p2Hps)
      } catch (error) {
        if (oldPoke) {
          activeBattle.value.player = oldPoke;
          const oldIndex = (gs.state.team || []).findIndex(p => p?.uid === oldPoke.uid);
          if (oldIndex !== -1) {
            activeBattle.value.playerTeamIndex = oldIndex;
          }
        }
        active.showdownPlayerTeamOrder = currentOrder;
        persistBattle();
        throw error;
      }

      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

      const filteredLogs = filterShowdownLogs(result.logs)
      for (const logLine of filteredLogs) {
        // Ignorar la línea de switch del propio jugador ya que ejecutamos la animación visualmente arriba
        if (logLine.startsWith('|switch|p1a:')) {
          continue
        }
        await parseShowdownLogLine(ctx, logLine, filteredLogs)
        if (logLine.startsWith('|faint|')) break
      }

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
  } else {
    // Si es un cambio forzado (por debilitación)
    if (activeBattle.value) {
      const active = activeBattle.value
      const slot = resolveShowdownSlot(active, 'player', newPoke.uid, gs.state.team || [])
      const { executeTurnInWorker } = await import('../orchestrator.ts')
      await executeTurnInWorker(`switch ${slot}`)
      const currentOrder = active.showdownPlayerTeamOrder || (active.playerTeam || gs.state.team || []).filter((p): p is Pokemon => !!p).map(p => p.uid)
      active.showdownPlayerTeamOrder = swapActivePokemon(currentOrder, newPoke.uid)
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE)
  }
  
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}
