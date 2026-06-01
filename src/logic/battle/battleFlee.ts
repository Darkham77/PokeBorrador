import { gameBus } from '@/logic/gameBus'
import type { BattleContext } from '@/types/battleContext'

export async function executeFlee(ctx: BattleContext) {
  if (ctx.isProcessing.value) return

  const active = ctx.activeBattle.value
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
        ctx.audio.flee()
        ctx.addLog('¡Escapaste sin problemas!', 'log-info', 'player')
        
        ctx.fsm.transition(ctx.fsm.currentState.value, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player' })
        
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
        ctx.audio.flee()
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
        
        await ctx.endBattle(false, true)
      } else {
        if (ctx.activeBattle.value) ctx.activeBattle.value.escapeAttempts++
        ctx.addLog('¡No pudiste escapar!', 'log-info', 'player')
        
        const { runEnemyAction } = await import('./battleTurn.ts')
        await runEnemyAction(ctx)
      }
      ctx.isProcessing.value = false
    }
  })
}
