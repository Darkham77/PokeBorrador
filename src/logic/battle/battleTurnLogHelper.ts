import type { BattleContext } from '@/types/battle/battleContext'

function shouldSkipP1Log(type: string, parts: string[], p1Skip: boolean, skipLogsForP1: boolean): { skip: boolean; newSkipState: boolean } {
  if (!p1Skip) return { skip: false, newSkipState: skipLogsForP1 }
  if (type === 'move' && parts[2]?.startsWith('p1')) {
    return { skip: true, newSkipState: true }
  }
  if (skipLogsForP1) {
    if (type === '-damage' && parts[2]?.startsWith('p2')) {
      return { skip: true, newSkipState: true }
    }
    if (type === 'move' && !parts[2]?.startsWith('p1')) {
      return { skip: false, newSkipState: false }
    }
  }
  return { skip: false, newSkipState: skipLogsForP1 }
}

function shouldSkipP2Log(type: string, parts: string[], p2Skip: boolean, skipLogsForP2: boolean): { skip: boolean; newSkipState: boolean } {
  if (!p2Skip) return { skip: false, newSkipState: skipLogsForP2 }
  if (type === 'move' && parts[2]?.startsWith('p2')) {
    return { skip: true, newSkipState: true }
  }
  if (skipLogsForP2) {
    if (type === '-damage' && parts[2]?.startsWith('p1')) {
      return { skip: true, newSkipState: true }
    }
    if (type === 'move' && !parts[2]?.startsWith('p2')) {
      return { skip: false, newSkipState: false }
    }
  }
  return { skip: false, newSkipState: skipLogsForP2 }
}

export async function parseLogsWithSkip(store: BattleContext, logs: string[], p1Skip: boolean, p2Skip: boolean) {
  let skipLogsForP1 = false
  let skipLogsForP2 = false

  const { parseShowdownLogLine } = await import('./showdownBridge.ts')

  for (const logLine of logs) {
    const parts = logLine.split('|').map(x => x.trim())
    const type = parts[1]

    const p1Result = shouldSkipP1Log(type || '', parts, p1Skip, skipLogsForP1)
    skipLogsForP1 = p1Result.newSkipState
    if (p1Result.skip) continue

    const p2Result = shouldSkipP2Log(type || '', parts, p2Skip, skipLogsForP2)
    skipLogsForP2 = p2Result.newSkipState
    if (p2Result.skip) continue

    await parseShowdownLogLine(store, logLine, logs)
  }
}
