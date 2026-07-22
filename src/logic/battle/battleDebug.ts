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

  let battleReadyTimeout: ReturnType<typeof setTimeout> | null = null

  win.__VITE_DEBUG__.executeScriptedAction = async () => {
    if (battleReadyTimeout) {
      clearTimeout(battleReadyTimeout)
      battleReadyTimeout = null
    }
    const { executeScriptedPlayerAction } = await import('./ai/scriptedAI')
    return await executeScriptedPlayerAction(ctx)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('battle-ready-for-input', (e) => {
      if (!win.__VITE_DEBUG__?.isScriptedReplayMode) return
      const detail = (e as CustomEvent<{ over: boolean; subState: string }>).detail
      if (detail.over) return

      if (battleReadyTimeout) clearTimeout(battleReadyTimeout)

      battleReadyTimeout = setTimeout(() => {
        const errorMsg = `[SIMULATION-FATAL] battle-ready-for-input event was not consumed within 15 seconds! Current SubState: ${detail.subState}`
        console.error(errorMsg)
        throw new Error(errorMsg)
      }, 15000)
    })
  }

  win.__VITE_DEBUG__.waitForBattleReady = () => {
    const active = ctx.activeBattle.value
    if (!active || active.over) {
      return Promise.resolve({ subState: '', p1ChoiceIdx: 0, p2ChoiceIdx: 0, over: true })
    }
    const subStateVal = ctx.fsm.currentSubState.value ? String(ctx.fsm.currentSubState.value) : ''
    const isReady = ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE &&
                    ['WAIT_INPUT', 'SWITCH_MENU', 'ENEMY_REPLACEMENT_SEQ'].includes(subStateVal) &&
                    !ctx.isProcessing.value &&
                    !ctx.isIntroAnimating.value
    if (isReady) {
      return Promise.resolve({
        subState: subStateVal,
        p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0,
        p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0,
        over: false
      })
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('battle-ready-for-input', handler)
        reject(new Error('Timeout waiting for battle-ready-for-input event (max 5s exceeded)'))
      }, 5000)

      const handler = (e: Event) => {
        clearTimeout(timer)
        window.removeEventListener('battle-ready-for-input', handler)
        resolve((e as CustomEvent).detail)
      }
      window.addEventListener('battle-ready-for-input', handler, { once: true })
    })
  }

  win.__VITE_DEBUG__.battle = {
    setPlayerStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.status = s
        logger.info('DEBUG', `Status de jugador cambiado a: ${s}`)
      }
    },
    setEnemyStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.status = s
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
        
        logger.info('DEBUG', '¡Curación completa aplicada reactivamente al jugador!')
      }
    },
    killEnemy: async () => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.hp = 0
        
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
