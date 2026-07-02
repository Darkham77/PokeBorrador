import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { logger } from '../utils/logger.ts'
import { executeMoveAction } from './actions/moveExecutor.ts'
import { updateCastformForm } from './battleFlow.ts'
import type { BattleState } from '@/types/battle/battle'

/** Collects uid-keyed HP and status snapshots for both sides before sending to the worker. */
function collectHpSnapshots(
  store: BattleContext,
  active: BattleState | null | undefined
): {
  p1Hps: Record<string, number> | undefined;
  p2Hps: Record<string, number> | undefined;
  p1Statuses: Record<string, string> | undefined;
  p2Statuses: Record<string, string> | undefined;
} {
  if (!active) return { p1Hps: undefined, p2Hps: undefined, p1Statuses: undefined, p2Statuses: undefined };
  const team = (store.gs.state.team || []).filter((p): p is Pokemon => !!p);
  const p1Hps: Record<string, number> = {};
  const p1Statuses: Record<string, string> = {};
  for (const p of team) {
    p1Hps[p.uid] = p.hp;
    p1Statuses[p.uid] = p.status ?? '';
  }
  const enemyTeam = (active.enemyTeam || (active._initialEnemy ? [active._initialEnemy] : [])).filter((p: Pokemon | null): p is Pokemon => !!p);
  const p2Hps: Record<string, number> = {};
  const p2Statuses: Record<string, string> = {};
  for (const p of enemyTeam) {
    p2Hps[p.uid] = p.hp;
    p2Statuses[p.uid] = p.status ?? '';
  }
  return { p1Hps, p2Hps, p1Statuses, p2Statuses };
}

/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  console.log(`[BattleTurn] executeTurn started. store.persistBattle type: ${typeof store.persistBattle}`);
  
  if (!p || !e) {
    logger.warn('BattleTurn', 'Aborting turn: Player or Enemy is null', { p, e })
    return
  }

  // Resetear banderas de uso de objetos al inicio del turno
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = false;
    store.activeBattle.value.enemyUsedItem = false;
  }

  // Transformar Castform antes de decidir y evaluar movimientos de IA
  if (store.activeBattle.value) {
    updateCastformForm(p, store.activeBattle.value.weather?.type, store.addLog)
    updateCastformForm(e, store.activeBattle.value.weather?.type, store.addLog)
  }

  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  // Thrash / lockedmove check
  if (p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0 && p.lastMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.lastMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.effect === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  const isLocked = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) || !!(p.thrashTurns && p.thrashTurns > 0);
  const isStruggle = moveIndex === -1;
  const move = isStruggle ? null : p.moves[moveIndex];

  if (!isStruggle && !isLocked) {
    if (!move || move.pp <= 0) {
      store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
      return
    }
  }

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  // Evaluar uso de objetos por parte del enemigo en turno normal
  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let eMove = p2Skip ? null : decideEnemyMove(e, p, store.enemyStages.value, isWild)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    eMove = e.lastMove
  }

  // Importar dinámicamente dependencias asíncronas para evitar dependencias circulares
  const { showdownWorker, executeTurnInWorker } = await import('./orchestrator.ts')
  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')

  if (showdownWorker) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

    if (move && move.pp > 0 && !isLocked) {
      move.pp--
    }

    let p1Choice = isStruggle ? 'struggle' : `move ${move?.id ?? 'struggle'}`;
    const active = store.activeBattle.value;
    if (active?.playerRequest?.active?.[0]?.moves) {
      const activeMoves = active.playerRequest.active[0].moves;
      if (activeMoves && activeMoves.length === 1 && activeMoves[0] && activeMoves[0].id === 'recharge') {
        p1Choice = 'move recharge';
      }
    }
    let p2Choice = eMove ? `move ${eMove.id}` : 'struggle';
    if (p2Skip && active?.enemyRequest?.active?.[0]?.moves) {
      const validMove = active.enemyRequest.active[0].moves.find((m: { id?: string; disabled?: boolean | string }) => !m.disabled);
      if (validMove) {
        p2Choice = `move ${validMove.id}`;
      }
    }
    // Interceptar elección de enemigo si está inyectada en el test determinista
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
      p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice;
    }
    const { p1Hps, p2Hps, p1Statuses, p2Statuses } = collectHpSnapshots(store, active);

    logger.info('BattleTurn', `Enviando elecciones al worker: Player: ${p1Choice}, Enemy: ${p2Choice} (p2Skip: ${p2Skip})`);

    const result = await executeTurnInWorker(p1Choice, p2Choice, p1Hps, p2Hps, p1Statuses, p2Statuses, false, p2Skip)
    logger.info('BattleTurn', 'Logs recibidos de pkms:', result.logs)

    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

    // Reproducir todos los logs del simulador asíncronamente.
    // IMPORTANTE: interrumpir en |faint| para que el atacante más lento no ejecute
    // su movimiento después de haber sido derrotado por el más rápido.
    const filteredLogs = filterShowdownLogs(result.logs);
    for (const logLine of filteredLogs) {
      await parseShowdownLogLine(store, logLine, filteredLogs);
    }



    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    const playerFainted = !store.activeBattle.value?.player || store.activeBattle.value.player.hp <= 0
    const enemyFainted = !store.activeBattle.value?.enemy || store.activeBattle.value.enemy.hp <= 0

    if (playerFainted || enemyFainted) {
      if (playerFainted && enemyFainted) {
        // En un Doble KO por daño de retroceso (recoil de Struggle), el enemigo siempre se debilita primero
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
        if (fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
        
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else if (playerFainted) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      }
      if (fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
    } else {
      const { handleForceSwitch } = await import('./resolution.ts')
      if (result.p2ForceSwitch) {
        await handleForceSwitch(store, 'enemy')
      }
      if (result.p1ForceSwitch) {
        await handleForceSwitch(store, 'player')
        return
      }
    }

    if (result.isOver && store.activeBattle.value) {
      store.activeBattle.value.over = true;
    }
  }

  if (store.activeBattle.value?.over) {
    if (store.activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      if (store.animations?.awaitTween) {
        await store.animations.awaitTween('escape-enemy')
      } else {
        await sleep(800)
      }
      await store.endBattle(false, true)
    }
    return
  }
  
  console.log(`[BattleTurn] executeTurn finished. calling store.persistBattle`);
  if (store.persistBattle) store.persistBattle()
}


export async function runPlayerAction(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  if (!p) return

  const move = p.moves[moveIndex]
  if (!move) return

  await executeMoveAction(store, 'player', move)
}

export async function runEnemyAction(store: BattleContext) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e || e.hp <= 0) return

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = true;
    store.activeBattle.value.enemyUsedItem = false;
  }

  if (!isWild && store.activeBattle.value && shouldEnemySwitch(e, p, store.activeBattle.value.enemyTeam)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.value.enemyTeam || [], p, e.uid)
    if (store.activeBattle.value.enemyTeam && bestIdx !== -1) {
      const { executeEnemySwitch } = await import('./actions/switchActions.ts')
      await executeEnemySwitch(store, bestIdx)
      return
    }
  }

  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let enemyMove = p2Skip ? null : decideEnemyMove(e, p, store.playerStages.value, isWild)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    enemyMove = e.lastMove
  }

  const { showdownWorker, executeTurnInWorker } = await import('./orchestrator.ts')
  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')
  if (showdownWorker) {
    interface ShowdownMoveRequest {
      id?: string;
      move?: string;
      disabled?: boolean;
    }
    interface ShowdownActiveRequest {
      moves?: ShowdownMoveRequest[];
    }
    interface ShowdownPlayerRequest {
      active?: ShowdownActiveRequest[];
    }

    const active = store.activeBattle.value;
    const playerRequest = active?.playerRequest as ShowdownPlayerRequest | undefined;
    const enemyRequest = active?.enemyRequest as ShowdownPlayerRequest | undefined;

    let p1Choice = 'struggle';
    if (playerRequest?.active?.[0]?.moves) {
      const validMove = playerRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p1Choice = `move ${validMove.id}`;
      }
    } else if (p && p.moves && p.moves.length > 0) {
      const firstMove = p.moves[0];
      if (firstMove && firstMove.id) {
        p1Choice = `move ${firstMove.id}`;
      }
    }

    let p2Choice = 'struggle';
    if (p2Skip && enemyRequest?.active?.[0]?.moves) {
      const validMove = enemyRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p2Choice = `move ${validMove.id}`;
      }
    } else if (!p2Skip && enemyMove) {
      p2Choice = `move ${enemyMove.id}`;
    }
    // Interceptar elección de enemigo si está inyectada en el test determinista
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
      p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice;
    }
    
    console.log(`[BattleTurn] [runEnemyAction] Sending choices: p1Choice: "${p1Choice}", p2Choice: "${p2Choice}", p1Skip: true, p2Skip: ${p2Skip}`);
    console.log(`[BattleTurn] [runEnemyAction] PlayerRequest:`, JSON.stringify(active?.playerRequest || {}));
    console.log(`[BattleTurn] [runEnemyAction] EnemyRequest:`, JSON.stringify(active?.enemyRequest || {}));

    const { p1Hps, p2Hps, p1Statuses, p2Statuses } = collectHpSnapshots(store, active);

    const result = await executeTurnInWorker(p1Choice, p2Choice, p1Hps, p2Hps, p1Statuses, p2Statuses, true, p2Skip)
    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }
    const filteredLogs = filterShowdownLogs(result.logs);
    for (const logLine of filteredLogs) {
      await parseShowdownLogLine(store, logLine, filteredLogs);
    }



    const playerFainted = store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0
    const enemyFainted = store.activeBattle.value?.enemy && store.activeBattle.value.enemy.hp <= 0

    if (playerFainted || enemyFainted) {
      if (playerFainted && enemyFainted) {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
        if (store.fsm.currentState.value === store.BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
        
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else if (playerFainted) {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      }
      if (store.fsm.currentState.value === store.BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
    } else {
      const { handleForceSwitch } = await import('./resolution.ts')
      if (result.p2ForceSwitch) {
        await handleForceSwitch(store, 'enemy')
      }
      if (result.p1ForceSwitch) {
        await handleForceSwitch(store, 'player')
        return
      }
    }

    if (result.isOver && store.activeBattle.value) {
      store.activeBattle.value.over = true;
    }
  }
}

async function evaluateAndUseNPCItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
  const battleState = ctx.activeBattle.value;
  if (!battleState || !battleState.enemyInventory) return false;

  const enemyInventory = battleState.enemyInventory;
  const hasItems = Object.values(enemyInventory).some(qty => qty > 0);
  if (!hasItems) return false;

  const npcName = battleState.isGym ? `Líder ${battleState.trainerName || 'de Gimnasio'}` : `${battleState.trainerName || 'Entrenador'}`;

  const triggerFXAndSound = async (onlySound = false) => {
    if (!onlySound) {
      if (ctx.animations?.handleHealRequest) {
        await ctx.animations.handleHealRequest({ side: 'enemy' });
      } else {
        const { gameBus } = await import('@/logic/events/gameBus');
        gameBus.emit('PLAY_HEAL', { side: 'enemy' });
      }
    }
    const audioStore = await import('@/stores/audio').then(m => m.useAudioStore());
    audioStore.play('heal');
  };

  // 1. Revive Check (HP stable in active pokemon)
  const fainted = (battleState.enemyTeam || []).filter((poke): poke is Pokemon => !!poke && poke.hp <= 0);
  if (fainted.length > 0 && e.hp >= e.maxHp * 0.5) {
    if (enemyInventory['revivemax'] && enemyInventory['revivemax'] > 0) {
      const target = fainted[0]!;
      target.hp = target.maxHp;
      target.status = undefined;
      enemyInventory['revivemax']--;
      if (enemyInventory['revivemax'] <= 0) delete enemyInventory['revivemax'];

      ctx.addLog(`¡${npcName} usó Revivir Máximo en ${target.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${target.name} revivió por completo!`, 'log-info', target, 'enemy');
      await triggerFXAndSound(true);
      return true;
    }
    if (enemyInventory['revive'] && enemyInventory['revive'] > 0) {
      const target = fainted[0]!;
      target.hp = Math.floor(target.maxHp * 0.5);
      target.status = undefined;
      enemyInventory['revive']--;
      if (enemyInventory['revive'] <= 0) delete enemyInventory['revive'];

      ctx.addLog(`¡${npcName} usó Revivir en ${target.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${target.name} revivió con la mitad de su salud!`, 'log-info', target, 'enemy');
      await triggerFXAndSound(true);
      return true;
    }
  }

  // 2. Status Check
  if (e.status) {
    let cured = false;

    if (enemyInventory['fullrestore'] && enemyInventory['fullrestore'] > 0) {
      e.hp = e.maxHp;
      e.status = undefined;
      enemyInventory['fullrestore']--;
      if (enemyInventory['fullrestore'] <= 0) delete enemyInventory['fullrestore'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Restaurar Todo en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó toda su salud y curó sus problemas de estado!`, 'log-info', e, 'enemy');
    } else if (enemyInventory['fullheal'] && enemyInventory['fullheal'] > 0) {
      e.status = undefined;
      enemyInventory['fullheal']--;
      if (enemyInventory['fullheal'] <= 0) delete enemyInventory['fullheal'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Cura Total en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} curó sus problemas de estado!`, 'log-info', e, 'enemy');
    } else if ((e.status === 'psn' || e.status === 'tox') && enemyInventory['antidote'] && enemyInventory['antidote'] > 0) {
      e.status = undefined;
      enemyInventory['antidote']--;
      if (enemyInventory['antidote'] <= 0) delete enemyInventory['antidote'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Antídoto en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡El envenenamiento de ${e.name} fue curado!`, 'log-info', e, 'enemy');
    } else if (e.status === 'brn' && enemyInventory['burnheal'] && enemyInventory['burnheal'] > 0) {
      e.status = undefined;
      enemyInventory['burnheal']--;
      if (enemyInventory['burnheal'] <= 0) delete enemyInventory['burnheal'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Cura Quemadura en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡La quemadura de ${e.name} fue curada!`, 'log-info', e, 'enemy');
    } else if (e.status === 'par' && enemyInventory['paralyzeheal'] && enemyInventory['paralyzeheal'] > 0) {
      e.status = undefined;
      enemyInventory['paralyzeheal']--;
      if (enemyInventory['paralyzeheal'] <= 0) delete enemyInventory['paralyzeheal'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Antiparaliz en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡La parálisis de ${e.name} fue curada!`, 'log-info', e, 'enemy');
    } else if (e.status === 'slp' && enemyInventory['awakening'] && enemyInventory['awakening'] > 0) {
      e.status = undefined;
      enemyInventory['awakening']--;
      if (enemyInventory['awakening'] <= 0) delete enemyInventory['awakening'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Despertar en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} se despertó!`, 'log-info', e, 'enemy');
    } else if (e.status === 'frz' && enemyInventory['iceheal'] && enemyInventory['iceheal'] > 0) {
      e.status = undefined;
      enemyInventory['iceheal']--;
      if (enemyInventory['iceheal'] <= 0) delete enemyInventory['iceheal'];
      cured = true;
      ctx.addLog(`¡${npcName} usó Anticongelante en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} se descongeló!`, 'log-info', e, 'enemy');
    }

    if (cured) {
      await triggerFXAndSound();
      return true;
    }
  }

  // 3. HP Check (Potions)
  if (e.hp < e.maxHp * 0.25) {
    let healed = 0;

    if (enemyInventory['fullrestore'] && enemyInventory['fullrestore'] > 0) {
      e.hp = e.maxHp;
      e.status = undefined;
      enemyInventory['fullrestore']--;
      if (enemyInventory['fullrestore'] <= 0) delete enemyInventory['fullrestore'];
      ctx.addLog(`¡${npcName} usó Restaurar Todo en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó toda su salud y curó sus problemas de estado!`, 'log-info', e, 'enemy');
      healed = e.maxHp;
    } else if (enemyInventory['maxpotion'] && enemyInventory['maxpotion'] > 0) {
      e.hp = e.maxHp;
      enemyInventory['maxpotion']--;
      if (enemyInventory['maxpotion'] <= 0) delete enemyInventory['maxpotion'];
      ctx.addLog(`¡${npcName} usó Poción Máxima en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó toda su salud!`, 'log-info', e, 'enemy');
      healed = e.maxHp;
    } else if (enemyInventory['hyperpotion'] && enemyInventory['hyperpotion'] > 0) {
      const prev = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 200);
      enemyInventory['hyperpotion']--;
      if (enemyInventory['hyperpotion'] <= 0) delete enemyInventory['hyperpotion'];
      ctx.addLog(`¡${npcName} usó Hiper Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
      healed = e.hp - prev;
    } else if (enemyInventory['superpotion'] && enemyInventory['superpotion'] > 0) {
      const prev = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 50);
      enemyInventory['superpotion']--;
      if (enemyInventory['superpotion'] <= 0) delete enemyInventory['superpotion'];
      ctx.addLog(`¡${npcName} usó Súper Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
      healed = e.hp - prev;
    } else if (enemyInventory['potion'] && enemyInventory['potion'] > 0) {
      const prev = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 20);
      enemyInventory['potion']--;
      if (enemyInventory['potion'] <= 0) delete enemyInventory['potion'];
      ctx.addLog(`¡${npcName} usó Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
      ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
      healed = e.hp - prev;
    }

    if (healed > 0) {
      await triggerFXAndSound();
      return true;
    }
  }

  return false;
}

