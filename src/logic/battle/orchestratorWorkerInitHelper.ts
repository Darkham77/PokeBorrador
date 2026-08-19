import { logger } from '../utils/logger.ts'
import { generateRandomSeed } from './battleSeedManager.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import {
  showdownWorker,
  preloadShowdownWorker,
  getSimulatorState
} from './showdownWorkerClient.ts'
import { prepareSeatPayload } from './orchestratorPayloadHelper.ts'

export async function initWorkerForBattle(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon
) {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return

  preloadShowdownWorker()
  const workerInstance = showdownWorker!
  if (typeof window !== 'undefined') {
    window.__showdownWorker__ = workerInstance;
  }
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.getSimulatorState = getSimulatorState
  }

  let debugSeed: number[] | null = null
  if (typeof window !== 'undefined') {
    debugSeed = window.__VITE_DEBUG__?.battleSeed ?? null
    console.debug(`[E2E-SEED-ORCHESTRATOR-DEBUG] Read seed directly from window: ${JSON.stringify(debugSeed)}`)
  }
  const seedArr = debugSeed || generateRandomSeed()
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.seed = seedArr
    ctx.activeBattle.value.battleHistory = []
  }

  const battleState = ctx.activeBattle.value
  const rawPlayerTeam = [...(ctx.gs.state.team || [])]
  const p1Data = prepareSeatPayload(rawPlayerTeam, initialPlayer, debugSeed, 'Player')

  const rawEnemyTeam = [...(battleState?.enemyTeam || (initialEnemy ? [initialEnemy] : []))]
  const p2Data = prepareSeatPayload(rawEnemyTeam, initialEnemy, debugSeed, battleState?.trainerName || 'Enemy')

  const initialWeatherOfficial = battleState?.weather?.type || 'none'

  console.debug(`[E2E-SEED-DEBUG] Initializing worker battle. context=${JSON.stringify({ initialWeatherOfficial, debugSeed, seedArr })}`)

  return new Promise<void>((resolve, reject) => {
    const worker = showdownWorker!
    const handleWorkerError = (event: ErrorEvent) => {
      const errorText = event.message || 'Showdown worker failed before initializing the battle'
      logger.error('ShowdownWorker', `Error del worker al inicializar batalla: ${errorText}`)
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
        window.__VITE_DEBUG__.lastWorkerInitError = errorText
      }
      if (worker.removeEventListener) {
        worker.removeEventListener('error', handleWorkerError)
        worker.removeEventListener('message', initHandler)
      } else {
        worker.onmessage = null
      }
      reject(new Error(errorText))
    }
    if (worker.addEventListener) {
      worker.addEventListener('error', handleWorkerError)
    }

    const initHandler = async (e: MessageEvent) => {
      const data = e.data as {
        type: string
        payload?: {
          debugLogs?: string[]
          p1Request?: ShowdownPlayerRequest
          p2Request?: ShowdownPlayerRequest
          message?: string
        }
      }
      const { type: responseType, payload: responsePayload } = data
      if (responseType === 'WORKER_LOG') {
        const stage = responsePayload?.message ?? 'missing-stage'
        console.debug(`[WORKER] ${stage}`)
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
          window.__VITE_DEBUG__.lastWorkerInitStage = stage
        }
        return
      }
      const activeWorker = showdownWorker!
      if (responseType === 'INIT_BATTLE_SUCCESS' || responseType === 'INIT_SUCCESS') {
        logger.info('ShowdownWorker', 'Batalla inicializada con éxito en el worker.')
        console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] responsePayload keys:', Object.keys(responsePayload || {}))
        if (responsePayload) {
          console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs type:', typeof responsePayload.debugLogs, 'isArray:', Array.isArray(responsePayload.debugLogs))
          if (responsePayload.debugLogs) {
            console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs length:', responsePayload.debugLogs.length)
            responsePayload.debugLogs.forEach((l: string) => {
              console.debug(`[E2E-WORKER-BUFFERED] ${l}`)
            })
          }
        }
        if (ctx.activeBattle.value && responsePayload) {
          ctx.activeBattle.value.playerRequest = responsePayload.p1Request
          ctx.activeBattle.value.enemyRequest = responsePayload.p2Request
        }
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
          window.__VITE_DEBUG__.p1ChoiceIdx = window.__VITE_DEBUG__.p1ChoiceIdx ?? 0
          window.__VITE_DEBUG__.p2ChoiceIdx = window.__VITE_DEBUG__.p2ChoiceIdx ?? 0
          window.dispatchEvent(new CustomEvent('worker-init-complete'))
        }
        if (activeWorker.removeEventListener) {
          activeWorker.removeEventListener('message', initHandler)
          activeWorker.removeEventListener('error', handleWorkerError)
        } else {
          activeWorker.onmessage = null
        }
        resolve()
      } else if (responseType === 'ERROR') {
        const errorText = responsePayload?.message || 'Error desconocido'
        logger.error('ShowdownWorker', `Error del simulador al inicializar batalla: ${errorText}`)
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
          window.__VITE_DEBUG__.lastWorkerInitError = errorText
        }
        if (activeWorker.removeEventListener) {
          activeWorker.removeEventListener('message', initHandler)
          activeWorker.removeEventListener('error', handleWorkerError)
        } else {
          activeWorker.onmessage = null
        }
        const { useErrorStore } = await import('@/stores/errorStore')
        useErrorStore().setError(new Error(errorText), { 
          type: 'Simulator Initialization Error', 
          source: 'ShowdownWorker INIT_BATTLE' 
        })
        reject(new Error(errorText))
      }
    }

    if (worker.addEventListener) {
      worker.addEventListener('message', initHandler)
    } else {
      worker.onmessage = initHandler
    }

    const initPayload = {
      type: 'INIT_BATTLE',
      payload: {
        p1: { name: p1Data.name, team: p1Data.team },
        p2: { name: p2Data.name, team: p2Data.team },
        p1Hps: p1Data.hps,
        p2Hps: p2Data.hps,
        p1Statuses: p1Data.statuses,
        p2Statuses: p2Data.statuses,
        weather: initialWeatherOfficial,
        seed: seedArr,
        isDeterministicSimulation: !!(typeof window !== 'undefined' && window.__VITE_DEBUG__ && window.__VITE_DEBUG__.isDeterministicSimulation),
        history: (typeof window !== 'undefined' && window.__VITE_DEBUG__ && ((window.__VITE_DEBUG__ as Record<string, unknown>).history as unknown[])) || [] // open-record // no-domain
      }
    }
    try {
      worker.postMessage(initPayload)
    } catch (error: unknown) {
      reject(new Error(`[ShowdownWorker] INIT_BATTLE payload could not be transferred: ${(error as Error).message}`, { cause: error }))
    }
  })
}
