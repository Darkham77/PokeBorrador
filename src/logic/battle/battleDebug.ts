import { watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useDebugStore } from '@/stores/debug'
import { gameBus } from '@/logic/events/gameBus'
import { useAudioStore } from '@/stores/audio'
import { useBattleStore } from '@/stores/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { requirePokemonStatus, requireVolatileStatusKey, type Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import { requireBattleConditionKey } from '@/types/battle/battle'
import { requireWeatherId } from '@/logic/weather/weatherRegistry'

interface BattleReadyDetail {
  subState: string
  p1ChoiceIdx: number
  p2ChoiceIdx: number
  over: boolean
}

function isBattleReadyDetail(value: unknown): value is BattleReadyDetail {
  return typeof value === 'object' &&
    value !== null &&
    'subState' in value &&
    typeof value.subState === 'string' &&
    'p1ChoiceIdx' in value &&
    typeof value.p1ChoiceIdx === 'number' &&
    'p2ChoiceIdx' in value &&
    typeof value.p2ChoiceIdx === 'number' &&
    'over' in value &&
    typeof value.over === 'boolean'
}

export function setupBattleDebug(ctx: BattleContext) {
  if (typeof window === 'undefined') return

  const debugStore = useDebugStore()
  if (!debugStore.canAccess) return

  const win = window
  
  win.__VITE_DEBUG__ = win.__VITE_DEBUG__ || {}

  win.__VITE_DEBUG__.triggerAnim = (type: string, side = 'enemy', options: Record<string, unknown> = {}) => {
    if (type === 'attack') {
      if (options.cat === 'recoil') {
        gameBus.emit('PLAY_RECOIL', { side })
        return
      }
      const bStore = useBattleStore()
      bStore.attackerSide = side as 'player' | 'enemy'
      bStore.activeMove = {
        name: options.cat === 'selfKO' ? 'Autodestrucción' : 'Ataque Debug',
        cat: options.cat === 'selfKO' ? 'special' : ((options.cat as 'physical' | 'special' | 'status' | undefined) || 'physical'),
        selfKO: options.cat === 'selfKO',
        pp: 5,
        maxPP: 5
      }
      gameBus.emit('PLAY_ATTACK_ANIM', { side, cat: options.cat || 'physical' })
      return
    }
    const eventMap: Record<string, string> = {
      'release': 'PLAY_RELEASE_ENERGY',
      'catch': 'PLAY_CATCH_ENERGY',
      'shake': 'CATCH_SHAKE',
      'shake_damage': 'PLAY_DAMAGE',
      'recoil_rebound': 'PLAY_RECOIL',
      'blink': 'PLAY_BLINK',
      'heal': 'PLAY_HEAL',
      'success': 'CATCH_SUCCESS',
      'faint': 'POKEMON_FAINT',
      'emergence': 'START_BATTLE',
      'reveal': 'START_BATTLE',
      'encounter': 'ENCOUNTER_ANIM',
      'bush_wiggle': 'WIGGLE_BUSH'
    }
    const event = eventMap[type] || type
    gameBus.emit(event, { side, ...options })
  }

  win.__VITE_DEBUG__.playSound = (id: string) => {
    useAudioStore().play(id)
  }

  win.__VITE_DEBUG__.setStatus = (side: string, status: string) => {
    const target = side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy
    if (target) target.status = (status === 'null' || status === 'clear') ? '' : requirePokemonStatus(status)
  }

  win.__VITE_DEBUG__.setSecondaryStatus = (side: string, type: string) => {
    const target = side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy
    if (target) {
      if (!target.volatileCounters) target.volatileCounters = {}
      const key = requireVolatileStatusKey(type)
      target.volatileCounters[key] = (target.volatileCounters[key] || 0) > 0 ? 0 : 3
    }
  }

  win.__VITE_DEBUG__.setStatStage = (side: string, stat: keyof BattleStages, val: number) => {
    if (side === 'player') ctx.playerStages.value[stat] = val
    else ctx.enemyStages.value[stat] = val
  }

  win.__VITE_DEBUG__.modifyStatStage = (side: string, stat: keyof BattleStages, delta: number) => {
    const stages = side === 'player' ? ctx.playerStages.value : ctx.enemyStages.value
    stages[stat] = Math.max(-6, Math.min(6, (stages[stat] || 0) + delta))
  }

  win.__VITE_DEBUG__.setFieldEffect = (side: string, effect: string, val: number) => {
    const sideCond = side === 'player' ? ctx.activeBattle.value?.playerSideConditions : ctx.activeBattle.value?.enemySideConditions
    if (sideCond) {
      const key = requireBattleConditionKey(effect)
      if (sideCond[key]) delete sideCond[key]
      else sideCond[key] = { turns: val }
    }
  }

  win.__VITE_DEBUG__.toggleSilhouette = () => {
    const bStore = useBattleStore() as unknown as Record<string, unknown>
    bStore.debugSilhouette = !bStore.debugSilhouette
  }

  win.__VITE_DEBUG__.forceFlee = async () => {
    logger.warn('DEBUG', 'Forzando huida del combate...')
    ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.FLEE_ATTEMPT)
    await ctx.endBattle(false, true)
  }

  win.__VITE_DEBUG__.executeScriptedAction = async () => {
    const { executeScriptedPlayerAction } = await import('./ai/scriptedAI')
    return await executeScriptedPlayerAction(ctx)
  }

  win.__VITE_DEBUG__.waitForBattleReady = () => {
    return new Promise((resolve) => {
      const checkCurrentReady = () => {
        const active = ctx.activeBattle.value
        if (!active || active.over) {
          return { subState: '', p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0, p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0, over: true }
        }
        const subStateVal = ctx.fsm.currentSubState.value ? String(ctx.fsm.currentSubState.value) : ''
        const bState = active as unknown as Record<string, unknown>
        const hasPendingSwitch = !!bState?.switchingToPlayer || !!bState?.switchingToEnemy
        const isReady = ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE &&
                        ['WAIT_INPUT', 'SWITCH_MENU', 'ENEMY_REPLACEMENT_SEQ'].includes(subStateVal) &&
                        !ctx.isProcessing.value &&
                        !ctx.isIntroAnimating.value &&
                        !hasPendingSwitch
        if (isReady) {
          return {
            subState: subStateVal,
            p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0,
            p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0,
            over: false
          }
        }
        return null
      }

      // 1. Chequeo sincrónico inicial
      const immediateReady = checkCurrentReady()
      if (immediateReady) {
        resolve(immediateReady)
        return
      }

      // 2. Reactividad Vue (watch) y evento battle-ready-for-input
      let unwatch: (() => void) | null = null

      const onReady = (detail: unknown) => {
        if (!isBattleReadyDetail(detail)) {
          throw new Error('[battleDebug] Invalid battle-ready-for-input detail payload')
        }
        if (unwatch) unwatch()
        window.removeEventListener('battle-ready-for-input', handler)
        resolve(detail)
      }

      const handler = (e: Event) => {
        if (!(e instanceof CustomEvent)) {
          throw new Error('[battleDebug] battle-ready-for-input must be a CustomEvent')
        }
        onReady(e.detail)
      }

      window.addEventListener('battle-ready-for-input', handler, { once: true })

      unwatch = watch(
        [ctx.fsm.currentSubState, ctx.isProcessing, ctx.isIntroAnimating],
        () => {
          const res = checkCurrentReady()
          if (res) {
            onReady(res)
          }
        },
        { immediate: true }
      )
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
        const weatherId = requireWeatherId(w)
        const visual = weatherId === 'clear' || weatherId === 'null' ? 'clear' : weatherId
        active.weather = { type: weatherId, turns: 99, visual }
        logger.info('DEBUG', `Clima/Terreno cambiado a: ${weatherId}`)
      }
    },
    fullHeal: () => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.hp = active.player.maxHp
        active.player.status = '';
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).confused = 0;
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).seeded = false
        
        // Sincronizar el HP del equipo en el gameStore
        const team = ctx.gs.state.team
        if (team && team[active.playerTeamIndex]) {
          const tp = team[active.playerTeamIndex]
          if (tp) {
            tp.hp = active.player.maxHp
            tp.status = ''
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
