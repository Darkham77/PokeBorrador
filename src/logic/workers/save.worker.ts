/**
 * src/logic/workers/save.worker.ts
 *
 * Dedicated Web Worker for off-thread save file processing:
 * - GZIP decompression and OPFS binary decoding
 * - JSON AST parsing
 * - Structural schema validation and Pokémon legality checks (validateAndSanitize)
 * - Compression of save payloads for background OPFS caching
 */

import { decompress, compress, isGzip } from '@/logic/utils/compression.ts'
import { validateAndSanitize, type ValidateAndSanitizeResult } from '@/logic/auth/saveSanitizer.ts'
import type { GameState } from '@/types/system/game.ts'

export interface WorkerProcessSaveMessage {
  type: 'PROCESS_SAVE'
  payload: {
    binary?: Uint8Array
    rawString?: string
    rawObject?: GameState | Record<string, unknown>
  }
}

export interface WorkerCompressSaveMessage {
  type: 'COMPRESS_SAVE'
  payload: {
    data: GameState | Record<string, unknown> | string
  }
}

export type SaveWorkerIncomingMessage = WorkerProcessSaveMessage | WorkerCompressSaveMessage

export interface WorkerProcessSaveResponse {
  type: 'PROCESS_SAVE_RESULT'
  payload: ValidateAndSanitizeResult
}

export interface WorkerCompressSaveResponse {
  type: 'COMPRESS_SAVE_RESULT'
  payload: {
    compressed: Uint8Array
  }
}

export interface WorkerErrorResponse {
  type: 'WORKER_ERROR'
  error: string
}

export type SaveWorkerOutgoingMessage =
  | WorkerProcessSaveResponse
  | WorkerCompressSaveResponse
  | WorkerErrorResponse

self.onmessage = async (e: MessageEvent<SaveWorkerIncomingMessage>) => {
  const data = e.data
  if (!data || !data.type) return

  try {
    if (data.type === 'PROCESS_SAVE') {
      let targetObj: Record<string, unknown> | GameState | null = null

      if (data.payload.binary) {
        const bin = data.payload.binary
        const json = isGzip(bin) ? await decompress(bin) : new TextDecoder().decode(bin)
        targetObj = JSON.parse(json) as Record<string, unknown> // open-record: Generic key-value data dictionary container
      } else if (data.payload.rawString) {
        targetObj = JSON.parse(data.payload.rawString) as Record<string, unknown> // open-record: Generic key-value data dictionary container
      } else if (data.payload.rawObject) {
        targetObj = data.payload.rawObject
      }

      if (!targetObj) {
        const res: WorkerProcessSaveResponse = {
          type: 'PROCESS_SAVE_RESULT',
          payload: { valid: false, issues: ['No payload provided to worker'], error: 'No data' }
        }
        self.postMessage(res)
        return
      }

      const validation = validateAndSanitize(targetObj)
      const res: WorkerProcessSaveResponse = {
        type: 'PROCESS_SAVE_RESULT',
        payload: validation
      }
      self.postMessage(res)
      return
    }

    if (data.type === 'COMPRESS_SAVE') {
      const compressed = await compress(data.payload.data)
      const res: WorkerCompressSaveResponse = {
        type: 'COMPRESS_SAVE_RESULT',
        payload: { compressed }
      }
      self.postMessage(res)
      return
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const res: WorkerErrorResponse = {
      type: 'WORKER_ERROR',
      error: errorMsg
    }
    self.postMessage(res)
  }
}
