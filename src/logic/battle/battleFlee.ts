import { gameBus } from '@/logic/gameBus'
import type { BattleContext } from '@/types/battleContext'

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
        
        const { runEnemyAction } = await import('./battleTurn.ts')
        
        // FSM: Transicionar correctamente como si fuera un turno normal.
        // Sin APPLY_MOVE, el watcher de useBattleAnimations limpia los asientos
        // durante el ataque, suprimiendo el HUD y las animaciones de daño.
        await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.APPLY_MOVE)
        await runEnemyAction(ctx)
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
