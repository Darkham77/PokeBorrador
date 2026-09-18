import { gameBus } from '@/logic/events/gameBus'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'
const ESCAPE_ANIMATION_FALLBACK_DELAY_MS = 800
import type { BattleContext } from '@/types/battle/battleContext'

type ActiveBattleRef = NonNullable<BattleContext['activeBattle']['value']>;

function checkEscapePreconditions(active: ActiveBattleRef | null): string | null {
  if (!active) return null;
  if (active.cannotEscape) {
    return '¡No puedes escapar de este combate!';
  }
  if (active.isTrainer || active.isGym) {
    return '¡No puedes huir de un combate de entrenador!';
  }
  if (isPokemonLocked(active.player) || active.player?.trapped || active.player?.volatileCounters?.['partiallytrapped']) {
    return '¡No puedes huir mientras estás ejecutando un movimiento bloqueado o atrapado!';
  }
  return null;
}

async function handlePreCombatFlee(ctx: BattleContext, active: ActiveBattleRef): Promise<void> {
  ctx.addLog('¡Escapaste sin problemas!', 'log-info', 'player');
  ctx.classStore?.onCaptureFail?.();
  await ctx.fsm.transition(ctx.fsm.currentState.value, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS);
  active.playerFled = true;
  await ctx.endBattle(false, true);
}

async function handleSuccessfulFlee(ctx: BattleContext, active: ActiveBattleRef, p: NonNullable<ActiveBattleRef['player']>, e: NonNullable<ActiveBattleRef['enemy']>): Promise<void> {
  ctx.addLog('¡Escapaste sin problemas!', 'log-info', 'player');
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS);
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.POKEMON_RECALL);

  const playerRecallPromise = ctx.animations?.handleWithdrawRequest
    ? ctx.animations.handleWithdrawRequest({ side: 'player', pokemon: p })
    : Promise.resolve();

  const isWild = !active.isTrainer && !active.isGym;
  let enemyEscapePromise: Promise<void> | Promise<unknown> = Promise.resolve();

  if (isWild) {
    gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee', pokemon: e });
    if (ctx.animations?.awaitTween) {
      enemyEscapePromise = ctx.animations.awaitTween('escape-enemy');
    } else {
      const { gsapSleep } = await import('@/logic/utils/gsapHelpers');
      enemyEscapePromise = gsapSleep(ESCAPE_ANIMATION_FALLBACK_DELAY_MS);
    }
  }

  await Promise.all([playerRecallPromise, enemyEscapePromise]);
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.VACATE_SEAT);
  active.playerFled = true;
  await ctx.endBattle(false, true);
}

async function executeEnemyRetaliationTurn(ctx: BattleContext, active: ActiveBattleRef, p: NonNullable<ActiveBattleRef['player']>, e: NonNullable<ActiveBattleRef['enemy']>): Promise<void> {
  const { decideEnemyMove } = await import('./ai/battleAI.ts');
  const isWild = !active.isTrainer && !active.isGym;
  let enemyMove = decideEnemyMove(e, p, ctx.playerStages.value, isWild, ctx);
  if (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    enemyMove = e.lastMove;
  }

  const { getShowdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts');
  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts');

  if (getShowdownWorker() && enemyMove) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.BUILD_QUEUE);
    await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.POP_ACTION);

    const result = await executeTurnInWorker('move 1', `move ${enemyMove.id}`, true, false);
    await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.APPLY_MOVE);

    const cleanLogs = filterShowdownLogs(result.logs);
    const filteredLogs = cleanLogs.filter(line => {
      if (line.startsWith('|move|p1a:')) return false;
      if (line.startsWith('|cant|p1a:')) return false;
      if (line.startsWith('|-damage|p1a:') && line.includes('[from] recoil')) return false;
      return true;
    });

    for (const logLine of filteredLogs) {
      await parseShowdownLogLine(ctx, logLine, filteredLogs);
    }

    if (result.isOver && ctx.activeBattle.value) {
      ctx.activeBattle.value.over = true;
    }
  }
}

async function handleFailedFlee(ctx: BattleContext, active: ActiveBattleRef, p: NonNullable<ActiveBattleRef['player']>, e: NonNullable<ActiveBattleRef['enemy']>): Promise<void> {
  active.escapeAttempts = (active.escapeAttempts || 0) + 1;
  ctx.addLog('¡No pudiste escapar!', 'log-info', 'player');
  gameBus.emit('PLAY_CRY', { name: e.id });

  await executeEnemyRetaliationTurn(ctx, active, p, e);

  if (ctx.activeBattle.value?.over) {
    if (ctx.activeBattle.value.fled) {
      ctx.classStore?.onCaptureFail?.();
      await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
      if (ctx.animations?.awaitTween) {
        await ctx.animations.awaitTween('escape-enemy');
      } else {
        const { gsapSleep } = await import('@/logic/utils/gsapHelpers');
        await gsapSleep(ESCAPE_ANIMATION_FALLBACK_DELAY_MS);
      }
      await ctx.endBattle(false, true);
    }
    return;
  }

  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.EVAL_HP);

  if (ctx.activeBattle.value?.player && ctx.activeBattle.value.player.hp <= 0) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ);
    await ctx.handleFaint('player');
    return;
  }

  if (ctx.activeBattle.value && !ctx.activeBattle.value.over && ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE) {
    ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.WAIT_INPUT);
  }
}

export async function executeFlee(ctx: BattleContext) {
  if (ctx.isProcessing.value) return;

  const active = ctx.activeBattle.value;
  const preconditionError = checkEscapePreconditions(active);
  if (preconditionError) {
    ctx.addLog(preconditionError, 'log-error', 'player');
    return;
  }

  ctx.uiStore.openConfirm({
    title: 'HUIR DEL COMBATE',
    message: '¿Estás seguro que deseas huir de este encuentro?',
    confirmText: 'SÍ, HUIR',
    cancelText: 'VOLVER',
    onConfirm: async () => {
      ctx.isProcessing.value = true;
      const currentActive = ctx.activeBattle.value;
      if (!currentActive) {
        ctx.isProcessing.value = false;
        return;
      }

      const isPreCombat = ctx.fsm.currentState.value !== ctx.BATTLE_STATES.ACTIVE_BATTLE;
      if (isPreCombat) {
        await handlePreCombatFlee(ctx, currentActive);
        ctx.isProcessing.value = false;
        return;
      }

      const p = currentActive.player;
      const e = currentActive.enemy;
      if (!p || !e) {
        ctx.isProcessing.value = false;
        return;
      }

      const { validateAndInterceptFaintedPlayer } = await import('./resolution.ts');
      const intercepted = await validateAndInterceptFaintedPlayer(ctx);
      if (intercepted) {
        ctx.isProcessing.value = false;
        return;
      }

      const { calculateEscapeChance } = await import('./battleEngine.ts');
      const canEscape = calculateEscapeChance(p, e, currentActive.escapeAttempts || 0, {
        playerStages: ctx.playerStages.value,
        enemyStages: ctx.enemyStages.value,
        weather: currentActive.weather
      });

      if (canEscape) {
        await handleSuccessfulFlee(ctx, currentActive, p, e);
      } else {
        await handleFailedFlee(ctx, currentActive, p, e);
      }
      ctx.isProcessing.value = false;
    }
  });
}
