import { gameBus } from '@/logic/events/gameBus'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'
const ESCAPE_ANIMATION_FALLBACK_DELAY_MS = 800
import type { BattleContext } from '@/types/battle/battleContext'

export async function executeFlee(ctx: BattleContext) {
  if (ctx.isProcessing.value) return

  const active = ctx.activeBattle.value
  if (active && active.cannotEscape) {
    ctx.addLog('¡No puedes escapar de este combate!', 'log-error', 'player')
    return
  }
  if (active && (active.isTrainer || active.isGym)) {
    ctx.addLog('¡No puedes huir de un combate de entrenador!', 'log-error', 'player')
    return
  }
  if (active && (isPokemonLocked(active.player) || active.player?.trapped || active.player?.volatileCounters?.['partiallytrapped'])) {
    ctx.addLog('¡No puedes huir mientras estás ejecutando un movimiento bloqueado o atrapado!', 'log-error', 'player')
    return
  }

  ctx.uiStore.openConfirm({
    title: 'HUIR DEL COMBATE',
    message: '¿Estás seguro que deseas huir de este encuentro?',
    confirmText: 'SÍ, HUIR',
    cancelText: 'VOLVER',
    onConfirm: async () => {
      ctx.isProcessing.value = true
      if (!ctx.activeBattle.value) { ctx.isProcessing.value = false; return }
      
      const isPreCombat = ctx.fsm.currentState.value !== ctx.BATTLE_STATES.ACTIVE_BATTLE
      if (isPreCombat) {
        ctx.addLog('¡Escapaste sin problemas!', 'log-info', 'player')
        
        await ctx.fsm.transition(ctx.fsm.currentState.value, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
        ctx.activeBattle.value.playerFled = true
        await ctx.endBattle(false, true)
        ctx.isProcessing.value = false
        return
      }

      ctx.activeBattle.value.escapeAttempts = (ctx.activeBattle.value.escapeAttempts || 0)
      
      const p = ctx.activeBattle.value.player
      const e = ctx.activeBattle.value.enemy
      if (!p || !e) { ctx.isProcessing.value = false; return }

      const { validateAndInterceptFaintedPlayer } = await import('./resolution.ts');
      const intercepted = await validateAndInterceptFaintedPlayer(ctx);
      if (intercepted) {
        ctx.isProcessing.value = false;
        return;
      }
      
      const { calculateEscapeChance } = await import('./battleEngine.ts')
      const canEscape = calculateEscapeChance(
        p, 
        e, 
        ctx.activeBattle.value.escapeAttempts, 
        { 
          playerStages: ctx.playerStages.value, 
          enemyStages: ctx.enemyStages.value, 
          weather: ctx.activeBattle.value.weather 
        }
      )

      if (canEscape) {
        ctx.addLog('¡Escapaste sin problemas!', 'log-info', 'player')
        
        await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
        await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.POKEMON_RECALL)
        
        // 1. Animación del jugador regresando a su Pokéball
        const playerRecallPromise = ctx.animations?.handleWithdrawRequest
          ? ctx.animations.handleWithdrawRequest({ side: 'player', pokemon: p })
          : Promise.resolve()

        // 2. Animación paralela del enemigo salvaje huyendo
        const isWild = !ctx.activeBattle.value.isTrainer && !ctx.activeBattle.value.isGym
        let enemyEscapePromise: Promise<void> | Promise<unknown> = Promise.resolve()

        if (isWild && e) {
          gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee', pokemon: e })
          if (ctx.animations?.awaitTween) {
            enemyEscapePromise = ctx.animations.awaitTween('escape-enemy')
          } else {
            const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
            enemyEscapePromise = gsapSleep(ESCAPE_ANIMATION_FALLBACK_DELAY_MS)
          }
        }

        // Esperar ambas animaciones en paralelo
        await Promise.all([playerRecallPromise, enemyEscapePromise])

        await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.VACATE_SEAT)
        
        ctx.activeBattle.value.playerFled = true
        await ctx.endBattle(false, true)
      } else {
        if (ctx.activeBattle.value) ctx.activeBattle.value.escapeAttempts++
        ctx.addLog('¡No pudiste escapar!', 'log-info', 'player')
        gameBus.emit('PLAY_CRY', { name: e.id })

        const { decideEnemyMove } = await import('./ai/battleAI.ts')
        const isWild = !ctx.activeBattle.value?.isTrainer && !ctx.activeBattle.value?.isGym
        let enemyMove = decideEnemyMove(e, p, ctx.playerStages.value, isWild, ctx)
        if (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
          enemyMove = e.lastMove
        }

        const { showdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
        const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')

        if (showdownWorker && enemyMove) {
          await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.BUILD_QUEUE)
          await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.POP_ACTION)

          const result = await executeTurnInWorker('move 1', `move ${enemyMove.id}`, true, false)

          await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.APPLY_MOVE)

          // Playback only enemy actions, filter out player skipped turn/struggle to simulate player doing nothing/fleeing
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
        
        if (ctx.activeBattle.value?.over) {
          if (ctx.activeBattle.value.fled) {
            await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
            if (ctx.animations?.awaitTween) {
              await ctx.animations.awaitTween('escape-enemy')
            } else {
              const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
              await gsapSleep(ESCAPE_ANIMATION_FALLBACK_DELAY_MS)
            }
            await ctx.endBattle(false, true)
          }
          ctx.isProcessing.value = false
          return
        }

        await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.EVAL_HP)
        
        // Chequear si el jugador fue noqueado por el contraataque
        if (ctx.activeBattle.value?.player && ctx.activeBattle.value.player.hp <= 0) {
          await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
          await ctx.handleFaint('player')
          ctx.isProcessing.value = false
          return
        }

        
        // Volver al estado de espera para restaurar HUD y badge activo del Pokémon
        if (ctx.activeBattle.value && !ctx.activeBattle.value.over &&
            ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE) {
          ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.WAIT_INPUT)
        }
      }
      ctx.isProcessing.value = false
    }
  })
}
