import { logger } from '@/logic/utils/logger'
import { useDebugStore } from '@/stores/debug'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'

export function setupBattleDebug(ctx: BattleContext) {
  if (typeof window === 'undefined') return

  const debugStore = useDebugStore()
  if (!debugStore.canAccess) return

  const win = window as unknown as { 
    __VITE_DEBUG__: Record<string, unknown>;
    __VITE_DEBUG_STORE_RESOLVER__?: () => unknown;
  }
  
  win.__VITE_DEBUG__ = win.__VITE_DEBUG__ || {}
  win.__VITE_DEBUG__.forceFlee = async () => {
    logger.warn('DEBUG', 'Forzando huida del combate...')
    ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.FLEE_ATTEMPT)
    await ctx.endBattle(false, true)
  }

  win.__VITE_DEBUG__.battle = {
    setPlayerStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.status = s
        active.player = { ...active.player }
        ctx.activeBattle.value = { ...active }
        logger.info('DEBUG', `Status de jugador cambiado a: ${s}`)
      }
    },
    setEnemyStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.status = s
        active.enemy = { ...active.enemy }
        ctx.activeBattle.value = { ...active }
        logger.info('DEBUG', `Status de enemigo cambiado a: ${s}`)
      }
    },
    setPlayerStage: (stat: keyof BattleStages, val: number) => { 
      ctx.playerStages.value[stat] = val 
      logger.info('DEBUG', `Stage de jugador ${stat} cambiado a: ${val}`)
    },
    setEnemyStage: (stat: keyof BattleStages, val: number) => { 
      ctx.enemyStages.value[stat] = val 
      logger.info('DEBUG', `Stage de enemigo ${stat} cambiado a: ${val}`)
    },
    setWeather: (w: string) => { 
      const active = ctx.activeBattle.value
      if (active) {
        active.weather = { type: w, turns: 5 }
        ctx.activeBattle.value = { ...active }
        logger.info('DEBUG', `Clima cambiado a: ${w}`)
      }
    },
    fullHeal: () => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.hp = active.player.maxHp
        active.player.status = null;
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).confused = 0;
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).seeded = false
        
        // Sincronizar el HP del equipo en el gameStore
        const team = ctx.gs.state.team
        if (team && team[active.playerTeamIndex]) {
          const tp = team[active.playerTeamIndex]
          if (tp) {
            tp.hp = active.player.maxHp
            tp.status = null
          }
        }
        
        // Forzar reactividad reasignando referencias
        active.player = { ...active.player }
        ctx.activeBattle.value = { ...active }
        
        logger.info('DEBUG', '¡Curación completa aplicada reactivamente al jugador!')
      }
    },
    killEnemy: async () => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.hp = 0
        // Forzar reactividad
        active.enemy = { ...active.enemy }
        ctx.activeBattle.value = { ...active }
        
        logger.warn('DEBUG', 'Enemigo fulminado (HP = 0), iniciando secuencia de debilitamiento/faint...')
        await ctx.handleFaint('enemy')
      }
    },
    animations: () => ctx.animations,
    store: () => {
      return win.__VITE_DEBUG_STORE_RESOLVER__?.()
    }
  }
}
