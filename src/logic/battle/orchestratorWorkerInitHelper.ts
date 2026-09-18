import { logger } from '../utils/logger.ts'
import { generateRandomSeed } from './battleSeedManager.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import {
  getShowdownWorker,
  preloadShowdownWorker,
  getSimulatorState
} from './showdownWorkerClient.ts'
import { prepareSeatPayload } from './orchestratorPayloadHelper.ts'

interface WorkerInitResponsePayload {
  debugLogs?: string[]
  p1Request?: ShowdownPlayerRequest
  p2Request?: ShowdownPlayerRequest
  message?: string
  logs?: string[]
}

function resolveWindowDebugSeed(): number[] | null {
  if (typeof window !== 'undefined') {
    const debugSeed = window.__VITE_DEBUG__?.battleSeed ?? null
    console.debug(`[E2E-SEED-ORCHESTRATOR-DEBUG] Read seed directly from window: ${JSON.stringify(debugSeed)}`)
    return debugSeed
  }
  return null
}

function resolveBattleTeams(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  debugSeed: number[] | null
) {
  const battleState = ctx.activeBattle.value
  const effectiveTeam = (battleState?.isPvP && battleState?.playerTeam && battleState.playerTeam.length > 0)
    ? battleState.playerTeam
    : (ctx.gs.state.team || [])
  const rawPlayerTeam = [...effectiveTeam]
  const p1Data = prepareSeatPayload(rawPlayerTeam, initialPlayer, debugSeed, 'Player')

  const isWild = Boolean(battleState && !battleState.isTrainer && !battleState.isGym && !battleState.isPvP)
  const rawEnemyTeam = isWild
    ? (initialEnemy ? [initialEnemy] : [])
    : [...(battleState?.enemyTeam || (initialEnemy ? [initialEnemy] : []))]
  const p2Data = prepareSeatPayload(rawEnemyTeam, initialEnemy, debugSeed, battleState?.trainerName || 'Enemy')

  return { p1Data, p2Data }
}

function buildInitPayload(
  p1Data: ReturnType<typeof prepareSeatPayload>,
  p2Data: ReturnType<typeof prepareSeatPayload>,
  initialWeather: string,
  seedArr: number[]
) {
  return {
    type: 'INIT_BATTLE',
    payload: {
      p1: { name: p1Data.name, team: p1Data.team },
      p2: { name: p2Data.name, team: p2Data.team },
      p1Hps: p1Data.hps,
      p2Hps: p2Data.hps,
      p1Statuses: p1Data.statuses,
      p2Statuses: p2Data.statuses,
      p1MovesPP: p1Data.movesPP,
      p2MovesPP: p2Data.movesPP,
      weather: initialWeather,
      seed: seedArr,
      isDeterministicSimulation: Boolean(typeof window !== 'undefined' && window.__VITE_DEBUG__?.isDeterministicSimulation),
      history: (typeof window !== 'undefined' && window.__VITE_DEBUG__ && ((window.__VITE_DEBUG__ as Record<string, unknown>).history as unknown[])) || [] // open-record: Generic key-value data dictionary container // no-domain: Non-domain utility collection or data structure
    }
  }
}

function detachWorkerInitListeners(
  worker: Worker,
  msgHandler: (e: MessageEvent) => void,
  errHandler: (e: ErrorEvent) => void
): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', msgHandler)
    worker.removeEventListener('error', errHandler)
  } else {
    worker.onmessage = null
  }
}

function handleWorkerLogMessage(responsePayload?: { message?: string }): void {
  const stage = responsePayload?.message ?? 'missing-stage'
  console.debug(`[WORKER] ${stage}`)
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.lastWorkerInitStage = stage
  }
}

async function handleInitBattleSuccessLogs(
  targetCtx: BattleContext,
  responsePayload?: { logs?: string[]; debugLogs?: string[] }
): Promise<void> {
  if (!responsePayload) return
  const rawLogs = responsePayload.logs || responsePayload.debugLogs
  if (!rawLogs || rawLogs.length === 0) return

  if (targetCtx.activeBattle.value) {
    if (!targetCtx.activeBattle.value.rawShowdownLogs) {
      targetCtx.activeBattle.value.rawShowdownLogs = [];
    }
    targetCtx.activeBattle.value.rawShowdownLogs.push(...rawLogs);
  }

  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')
  const filteredLogs = filterShowdownLogs(rawLogs)
  for (const logLine of filteredLogs) {
    if (
      logLine.startsWith('|-ability|') ||
      logLine.startsWith('|-transform|') ||
      logLine.startsWith('|-start|') ||
      logLine.startsWith('|-weather|')
    ) {
      await parseShowdownLogLine(targetCtx, logLine)
    }
  }
}

async function handleInitBattleSuccess(
  targetCtx: BattleContext,
  responsePayload: WorkerInitResponsePayload | undefined,
  cleanup: () => void,
  onResolve: () => void
): Promise<void> {
  logger.info('ShowdownWorker', 'Batalla inicializada con éxito en el worker.')
  console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] responsePayload keys:', Object.keys(responsePayload || {}))
  await handleInitBattleSuccessLogs(targetCtx, responsePayload)

  if (targetCtx.activeBattle.value && responsePayload) {
    targetCtx.activeBattle.value.playerRequest = responsePayload.p1Request
    targetCtx.activeBattle.value.enemyRequest = responsePayload.p2Request
  }
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.p1ChoiceIdx = window.__VITE_DEBUG__.p1ChoiceIdx ?? 0
    window.__VITE_DEBUG__.p2ChoiceIdx = window.__VITE_DEBUG__.p2ChoiceIdx ?? 0
    window.dispatchEvent(new CustomEvent('worker-init-complete'))
  }
  cleanup()
  onResolve()
}

async function handleInitBattleError(
  responsePayload: { message?: string } | undefined,
  cleanup: () => void,
  onReject: (reason?: unknown) => void
): Promise<void> {
  const errorText = responsePayload?.message || 'Error desconocido'
  logger.error('ShowdownWorker', `Error del simulador al inicializar batalla: ${errorText}`)
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.lastWorkerInitError = errorText
  }
  cleanup()
  const { useErrorStore } = await import('@/stores/errorStore')
  useErrorStore().setError(new Error(errorText), { 
    type: 'Simulator Initialization Error', 
    source: 'ShowdownWorker INIT_BATTLE' 
  })
  onReject(new Error(errorText))
}

function attachWorkerInitListeners(
  worker: Worker,
  ctx: BattleContext,
  resolve: () => void,
  reject: (reason?: unknown) => void
): void {
  const handleWorkerError = (event: ErrorEvent) => {
    const errorText = event.message || 'Showdown worker failed before initializing the battle'
    logger.error('ShowdownWorker', `Error del worker al inicializar batalla: ${errorText}`)
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
      window.__VITE_DEBUG__.lastWorkerInitError = errorText
    }
    detachWorkerInitListeners(worker, initHandler, handleWorkerError)
    reject(new Error(errorText))
  }
  if (worker.addEventListener) {
    worker.addEventListener('error', handleWorkerError)
  }

  const initHandler = async (e: MessageEvent) => {
    const data = e.data as {
      type: string
      payload?: WorkerInitResponsePayload
    }
    const { type: responseType, payload: responsePayload } = data
    if (responseType === 'WORKER_LOG') {
      handleWorkerLogMessage(responsePayload)
      return
    }
    const cleanup = () => detachWorkerInitListeners(worker, initHandler, handleWorkerError)
    if (responseType === 'INIT_BATTLE_SUCCESS' || responseType === 'INIT_SUCCESS') {
      await handleInitBattleSuccess(ctx, responsePayload, cleanup, resolve)
    } else if (responseType === 'ERROR') {
      await handleInitBattleError(responsePayload, cleanup, reject)
    }
  }

  if (worker.addEventListener) {
    worker.addEventListener('message', initHandler)
  } else {
    worker.onmessage = initHandler
  }
}

export async function initWorkerForBattle(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon
) {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return

  preloadShowdownWorker()
  const workerInstance = getShowdownWorker()!
  if (typeof window !== 'undefined') {
    window.__showdownWorker__ = workerInstance
  }
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.getSimulatorState = getSimulatorState
  }

  const debugSeed = resolveWindowDebugSeed()
  const seedArr = debugSeed || generateRandomSeed()
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.seed = seedArr
    ctx.activeBattle.value.battleHistory = []
  }

  const battleState = ctx.activeBattle.value
  const { p1Data, p2Data } = resolveBattleTeams(ctx, initialPlayer, initialEnemy, debugSeed)
  const initialWeatherOfficial = battleState?.weather?.type || 'none'

  console.debug(`[E2E-SEED-DEBUG] Initializing worker battle. context=${JSON.stringify({ initialWeatherOfficial, debugSeed, seedArr })}`)

  return new Promise<void>((resolve, reject) => {
    const worker = getShowdownWorker()!
    attachWorkerInitListeners(worker, ctx, resolve, reject)

    const initPayload = buildInitPayload(p1Data, p2Data, initialWeatherOfficial, seedArr)
    try {
      worker.postMessage(initPayload)
    } catch (error: unknown) {
      reject(new Error(`[ShowdownWorker] INIT_BATTLE payload could not be transferred: ${(error as Error).message}`, { cause: error }))
    }
  })
}
