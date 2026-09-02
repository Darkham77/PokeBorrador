/**
 * src/logic/workers/saveWorkerClient.ts
 *
 * Client bridge for save.worker.ts.
 * Handles worker lifecycle, message exchange, and graceful fallbacks when workers are unavailable.
 */

import { logger } from '@/logic/utils/logger.ts'
import { decompress, compress as syncCompress, isGzip } from '@/logic/utils/compression.ts'
import { validateAndSanitize, type ValidateAndSanitizeResult } from '@/logic/auth/saveSanitizer.ts'
import type { GameState } from '@/types/system/game.ts'
import type {
  WorkerProcessSaveMessage,
  WorkerCompressSaveMessage,
  SaveWorkerOutgoingMessage
} from './save.worker.ts'

let saveWorkerInstance: Worker | null = null

export function getSaveWorker(): Worker | null { // result-ok
  if (!saveWorkerInstance && typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      saveWorkerInstance = new Worker(new URL('./save.worker.ts', import.meta.url), { type: 'module' })
    } catch (e) {
      logger.warn('SaveWorker', `Could not instantiate save worker: ${(e as Error).message}. Falling back to main thread.`)
      saveWorkerInstance = null
    }
  }
  return saveWorkerInstance
}

export function preloadSaveWorker(): void {
  getSaveWorker()
}

export async function processSaveInWorker(input: {
  binary?: Uint8Array
  rawString?: string
  rawObject?: GameState | Record<string, unknown>
}): Promise<ValidateAndSanitizeResult> {
  const worker = getSaveWorker()

  if (!worker) {
    // Fallback to main thread execution
    let targetObj: Record<string, unknown> | GameState | null = null
    if (input.binary) {
      const json = isGzip(input.binary) ? await decompress(input.binary) : new TextDecoder().decode(input.binary)
      targetObj = JSON.parse(json) as Record<string, unknown> // open-record
    } else if (input.rawString) {
      targetObj = JSON.parse(input.rawString) as Record<string, unknown> // open-record
    } else if (input.rawObject) {
      targetObj = input.rawObject
    }

    if (!targetObj) {
      return { valid: false, issues: ['No payload provided'], error: 'No data' }
    }

    return validateAndSanitize(targetObj)
  }

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<SaveWorkerOutgoingMessage>) => {
      const data = e.data
      if (!data) return

      if (data.type === 'PROCESS_SAVE_RESULT') {
        worker.removeEventListener('message', handler)
        resolve(data.payload)
      } else if (data.type === 'WORKER_ERROR') {
        worker.removeEventListener('message', handler)
        reject(new Error(data.error))
      }
    }

    worker.addEventListener('message', handler)

    const msg: WorkerProcessSaveMessage = {
      type: 'PROCESS_SAVE',
      payload: input
    }
    worker.postMessage(msg)
  })
}

export async function compressSaveInWorker(data: GameState | Record<string, unknown> | string): Promise<Uint8Array> {
  const worker = getSaveWorker()

  if (!worker) {
    return await syncCompress(data)
  }

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<SaveWorkerOutgoingMessage>) => {
      const resp = e.data
      if (!resp) return

      if (resp.type === 'COMPRESS_SAVE_RESULT') {
        worker.removeEventListener('message', handler)
        resolve(resp.payload.compressed)
      } else if (resp.type === 'WORKER_ERROR') {
        worker.removeEventListener('message', handler)
        reject(new Error(resp.error))
      }
    }

    worker.addEventListener('message', handler)

    const msg: WorkerCompressSaveMessage = {
      type: 'COMPRESS_SAVE',
      payload: { data }
    }
    worker.postMessage(msg)
  })
}

export function terminateSaveWorker(): void {
  if (saveWorkerInstance) {
    saveWorkerInstance.terminate()
    saveWorkerInstance = null
  }
}
