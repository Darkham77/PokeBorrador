import { gameBus } from '@/logic/events/gameBus'
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
        
        ctx.fsm.transition(ctx.fsm.currentState.value, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player' })
        
        ctx.activeBattle.value.playerFled = true
        await ctx.endBattle(false, true)
        ctx.isProcessing.value = false
        return
      }

      ctx.activeBattle.value.escapeAttempts = (ctx.activeBattle.value.escapeAttempts || 0)
      
      const p = ctx.activeBattle.value.player
      const e = ctx.activeBattle.value.enemy
      if (!p || !e) { ctx.isProcessing.value = false; return }

      const isP1Forced = ctx.activeBattle.value.playerRequest?.forceSwitch?.some((x: unknown) => !!x);
      if (p.hp <= 0 || isP1Forced) {
        console.warn('[executeFlee] Player Pokemon is fainted or forceSwitch is requested. Aborting flee and transiting to replacements.');
        const { handleForceSwitch } = await import('./resolution.ts');
        await handleForceSwitch(ctx, 'player');
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
        
        ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
        ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player' })
        
        if (ctx.animations?.awaitTween) {
          await ctx.animations.awaitTween(`player-${p.uid}`)
        } else {
          const { gsapSleep } = await import('@/logic/utils/gsapHelpers')
          await gsapSleep(800)
        }
        
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

          const result = await executeTurnInWorker('move struggle', `move ${enemyMove.id}`)

          await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.APPLY_MOVE)

          // Playback only enemy actions, filter out player struggle to simulate player doing nothing/fleeing
          const cleanLogs = filterShowdownLogs(result.logs);
          const filteredLogs = cleanLogs.filter(line => {
            if (line.startsWith('|move|p1a:')) return false;
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
              await gsapSleep(800)
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
