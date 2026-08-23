import { watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useDebugStore } from '@/stores/debug'
import { gameBus } from '@/logic/events/gameBus'
import { useAudioStore } from '@/stores/audio'
import { useBattleStore } from '@/stores/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { requirePokemonStatus, requireVolatileStatusKey, type Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, BattleSide } from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import { requireBattleConditionKey } from '@/types/battle/battle'
import { requireWeatherId } from '@/logic/weather/weatherRegistry'
import { canExecuteScriptedReplayAction } from './helpers/scriptedReplayReadiness.ts'
import { isBattleCompletionReady } from './helpers/battleCompletionReadiness.ts'
import { requiresAction } from './helpers/requestHelper.ts'
import { projectBattleReadySwitchSlots } from './helpers/battleReadySwitchSlots.ts'
import { BATTLE_UI_EVENTS, isBattleReadyForInputDetail, type BattleReadyForInputDetail } from '@/types/battle/battleEvents.ts'

export { canExecuteScriptedReplayAction } from './helpers/scriptedReplayReadiness.ts'

const DEBUG_INDEFINITE_WEATHER_TURNS = 99;
const MAX_BATTLE_READY_TIMEOUT_MS = 5000;

interface ScriptedReplayReadinessDetail extends BattleReadyForInputDetail {
  isReady: boolean
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
      bStore.attackerSide = side as BattleSide
      bStore.activeMove = {
        name: options.cat === 'selfKO' ? 'Autodestrucción' : 'Ataque Debug',
        cat: options.cat === 'selfKO' ? 'special' : ((options.cat as MoveCategory | undefined) || 'physical'),
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

  win.__VITE_DEBUG__.setStatus = async (side: string, status: string) => {
    const target = side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy
    if (!target) return

    const resolvedStatus = (status === 'null' || status === 'clear') ? '' : requirePokemonStatus(status)
    target.status = resolvedStatus
    if (side === 'player') {
      const teamTarget = ctx.gs.state.team.find(pokemon => pokemon?.uid === target.uid)
      if (!teamTarget) {
        throw new Error(`[battleDebug] Active player ${target.uid} is missing from the game team`)
      }
      teamTarget.status = resolvedStatus
    }
    const { applyDebugStatusInWorker } = await import('./showdownWorkerClient.ts')
    await applyDebugStatusInWorker(side === 'player' ? 'p1' : 'p2', target.uid, resolvedStatus)
  }

  win.__VITE_DEBUG__.setSecondaryStatus = (side: string, type: string) => {
    const target = (side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy) as Record<string, unknown> | undefined // open-record
    if (!target) return

    const key = requireVolatileStatusKey(type)
    if (!target.volatileCounters) target.volatileCounters = {}
    const vc = target.volatileCounters as Record<string, number> // open-record
    vc[key] = vc[key] ? 0 : 3
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
    const key = requireBattleConditionKey(effect)
    const stagesRef = side === 'player' ? ctx.playerStages : ctx.enemyStages
    const active = ctx.activeBattle.value

    const isScreenOrHazard = (['reflect', 'lightscreen', 'safeguard', 'mist', 'spikes', 'stealthrock', 'toxicspikes'] as const).includes(key as 'reflect' | 'lightscreen' | 'safeguard' | 'mist' | 'spikes' | 'stealthrock' | 'toxicspikes')
    if (isScreenOrHazard) {
      const stageKey = key === 'lightscreen' ? 'lightScreen' : key
      const current = (stagesRef.value as Record<string, number>)[stageKey] || 0 // open-record
      const newVal = current > 0 ? 0 : val
      stagesRef.value = {
        ...stagesRef.value,
        [stageKey]: newVal
      }
      const sideConds = side === 'player' ? active?.playerSideConditions : active?.enemySideConditions
      if (sideConds) {
        if (newVal > 0) sideConds[key] = { turns: newVal }
        else delete sideConds[key]
      }
      if (active) {
        ctx.activeBattle.value = { ...active }
      }
      return
    }

    const CANONICAL_TERRAINS = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'] as const
    const isTerrain = (CANONICAL_TERRAINS as readonly string[]).includes(key)

    if (active) {
      const updatedConditions = { ...(active.fieldConditions || {}) }
      if (updatedConditions[key]) {
        delete updatedConditions[key]
      } else {
        if (isTerrain) {
          CANONICAL_TERRAINS.forEach(t => {
            delete updatedConditions[t]
          })
        }
        updatedConditions[key] = { turns: val }
      }
      active.fieldConditions = updatedConditions
      ctx.activeBattle.value = { ...active, fieldConditions: updatedConditions }
    }
  }

  win.__VITE_DEBUG__.toggleSilhouette = () => {
    const bStore = useBattleStore()
    Reflect.set(bStore, 'debugSilhouette', !Reflect.get(bStore, 'debugSilhouette'))
  }

  win.__VITE_DEBUG__.forceFlee = async () => {
    logger.warn('DEBUG', 'Forzando huida del combate...')
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.playerFled = true
    }
    const currState = ctx.fsm.currentState.value || ctx.BATTLE_STATES.ACTIVE_BATTLE
    if (currState === ctx.BATTLE_STATES.ACTIVE_BATTLE) {
      ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.FLEE_ATTEMPT)
    } else {
      ctx.fsm.transition(currState, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS)
    }
    await ctx.endBattle(false, true)
  }

  const getScriptedReplayReadiness = (): ScriptedReplayReadinessDetail => {
    const active = ctx.activeBattle.value
    if (isBattleCompletionReady({
      hasActiveBattle: active !== null,
      isOver: active?.over === true,
      fsmState: ctx.fsm.currentState.value,
      fsmSubState: ctx.fsm.currentSubState.value,
    })) {
      return { subState: '', p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0, p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0, over: true, playerSwitchSlots: [], isReady: true }
    }
    if (!active) {
      return { subState: ctx.fsm.currentSubState.value ?? '', p1ChoiceIdx: 0, p2ChoiceIdx: 0, over: false, playerSwitchSlots: [], isReady: false }
    }
    if (active.over) {
      return { subState: '', p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0, p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0, over: true, playerSwitchSlots: projectBattleReadySwitchSlots(active.playerRequest), isReady: true }
    }
    const subStateVal = ctx.fsm.currentSubState.value ?? ''
    const hasPendingSwitch = Boolean(Reflect.get(active, 'switchingToPlayer')) || Boolean(Reflect.get(active, 'switchingToEnemy'))
    const isReady = canExecuteScriptedReplayAction({
      isActiveBattle: ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE,
      subState: subStateVal,
      isProcessing: ctx.isProcessing.value,
      isIntroAnimating: ctx.isIntroAnimating.value,
      hasPendingSwitch,
      hasPendingPlayerAction: requiresAction(active.playerRequest),
    })
    if (!isReady && subStateVal === 'SWITCH_MENU' && win.__VITE_DEBUG__?.isScriptedReplayMode) {
      console.debug(`[E2E-CERTIFIED-REPLAY] SWITCH_MENU is not actionable. context=${JSON.stringify({
        isActiveBattle: ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE,
        isProcessing: ctx.isProcessing.value,
        isIntroAnimating: ctx.isIntroAnimating.value,
        hasPendingSwitch,
        introDiagnostics: win.__VITE_DEBUG__?.certifiedReplayIntroDiagnostics,
      })}`)
    }
    return {
      subState: subStateVal,
      p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0,
      p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0,
      over: false,
      playerSwitchSlots: projectBattleReadySwitchSlots(active.playerRequest),
      isReady,
    }
  }

  win.__VITE_DEBUG__.getScriptedReplayReadiness = getScriptedReplayReadiness

  win.__VITE_DEBUG__.waitForBattleReady = (timeoutMs = MAX_BATTLE_READY_TIMEOUT_MS, options?: { skipImmediate?: boolean }) => {
    return new Promise((resolve, reject) => {
      const checkCurrentReady = () => {
        const detail = getScriptedReplayReadiness()
        if (detail.over || detail.isReady) {
          return detail
        }
        return null
      }

      // 1. Chequeo sincrónico inicial
      if (!options?.skipImmediate) {
        const immediateReady = checkCurrentReady()
        if (immediateReady) {
          resolve(immediateReady)
          return
        }
      }

      // 2. Reactividad Vue (watch) y evento battle-ready-for-input
      let unwatch: (() => void) | null = null
      let timer: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (unwatch) unwatch()
        if (timer) clearTimeout(timer)
        window.removeEventListener(BATTLE_UI_EVENTS.READY_FOR_INPUT, handler)
      }

      const onReady = (detail: unknown) => {
        if (!isBattleReadyForInputDetail(detail)) {
          cleanup()
          reject(new Error(`[battleDebug] Invalid ${BATTLE_UI_EVENTS.READY_FOR_INPUT} detail payload`))
          return
        }
        cleanup()
        resolve(detail)
      }

      const handler = (e: Event) => {
        if (!(e instanceof CustomEvent)) {
          cleanup()
          reject(new Error(`[battleDebug] ${BATTLE_UI_EVENTS.READY_FOR_INPUT} must be a CustomEvent`))
          return
        }
        onReady(e.detail)
      }

      timer = setTimeout(() => {
        cleanup()
        const currentDetail = getScriptedReplayReadiness()
        if (currentDetail.isReady || currentDetail.over) {
          resolve(currentDetail)
          return
        }
        reject(new Error(`[battleDebug] Timeout (${timeoutMs}ms) waiting for battle-ready-for-input. Current state: ${JSON.stringify(currentDetail)}`))
      }, timeoutMs)

      window.addEventListener(BATTLE_UI_EVENTS.READY_FOR_INPUT, handler, { once: true })

      unwatch = watch(
        [ctx.fsm.currentState, ctx.fsm.currentSubState, ctx.isProcessing, ctx.isIntroAnimating],
        () => {
          const res = checkCurrentReady()
          if (res) {
            onReady(res)
          }
        },
        { immediate: !options?.skipImmediate }
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
        active.weather = { type: weatherId, turns: DEBUG_INDEFINITE_WEATHER_TURNS, visual }
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
