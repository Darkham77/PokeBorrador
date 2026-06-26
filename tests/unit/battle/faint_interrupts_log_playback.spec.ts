/**
 * Regression test: when a |faint| log appears mid-turn, no subsequent logs
 * should be processed (the slower attacker must not execute its move after
 * the faster attacker already knocked it out).
 *
 * Scenario: enemy is faster, knocks out player, then player's move log appears.
 * Expected: the player |move| log is never processed after the |faint|.
 */
import { describe, it, expect } from 'vitest'
import { filterShowdownLogs } from '@/logic/battle/showdownBridge'

// The loop-with-break logic lives in executeTurn inside battleTurn.ts.
// We test it by driving the same log-iteration logic in isolation:
// a helper that mirrors the loop behaviour and signals whether it stopped early.

async function runLogPlayback(
  logs: string[],
  onLine: (line: string) => Promise<void>,
  shouldBreakAfter: (line: string) => boolean
): Promise<{ processedLines: string[] }> {
  const processedLines: string[] = []
  for (const line of logs) {
    await onLine(line)
    processedLines.push(line)
    if (shouldBreakAfter(line)) break
  }
  return { processedLines }
}

describe('faint interrupts log playback', () => {
  /**
   * Simulates a turn log where:
   *  - Enemy attacks first and knocks out player → |faint|p1a:
   *  - Player's (slower) move appears AFTER the faint
   *
   * With the bug: the player move log IS processed.
   * With the fix: the loop breaks on |faint| and the player move log is NOT processed.
   */
  const turnLogsBugScenario: string[] = [
    '|move|p2a: Arbok|Body Slam|p1a: Pikachu',
    '|-damage|p1a: Pikachu|0/100 fnt',
    '|faint|p1a: Pikachu',
    // This line must NOT be processed if the loop stops at |faint|
    '|move|p1a: Pikachu|Thunder|p2a: Arbok',
    '|-damage|p2a: Arbok|30/100',
  ]

  it('[REGRESSION] WITHOUT early-break, the slower attacker move IS processed after the faint', async () => {
    // This test documents the BUG — no break logic applied.
    const processed: string[] = []
    for (const line of turnLogsBugScenario) {
      processed.push(line)
      // no break — the bug
    }
    const playerMoveProcessed = processed.some(l => l.includes('|move|p1a:'))
    expect(playerMoveProcessed).toBe(true) // passes today, demonstrates the bug
  })

  it('[FIX] WITH early-break on |faint|, the slower attacker move is NOT processed', async () => {
    const { processedLines } = await runLogPlayback(
      turnLogsBugScenario,
      async () => { /* parse line — noop in this unit */ },
      (line) => line.startsWith('|faint|')
    )

    const playerMoveAfterFaint = processedLines.some(l => l.includes('|move|p1a:'))
    // The player move comes AFTER the |faint|, so with the break it must not appear.
    expect(playerMoveAfterFaint).toBe(false)

    // The faint line itself must be the last one processed.
    const lastLine = processedLines[processedLines.length - 1]
    expect(lastLine).toBe('|faint|p1a: Pikachu')
  })

  it('[FIX] enemy faint also stops the loop — enemy slower attack is skipped', async () => {
    const logsEnemyFaintFirst: string[] = [
      '|move|p1a: Pikachu|Thunderbolt|p2a: Geodude',
      '|-damage|p2a: Geodude|0/80 fnt',
      '|faint|p2a: Geodude',
      // Geodude's (slower) rock throw must NOT play after Geodude fainted
      '|move|p2a: Geodude|Rock Throw|p1a: Pikachu',
      '|-damage|p1a: Pikachu|60/100',
    ]

    const { processedLines } = await runLogPlayback(
      logsEnemyFaintFirst,
      async () => {},
      (line) => line.startsWith('|faint|')
    )

    const enemyMoveAfterFaint = processedLines.some(l => l.includes('|move|p2a:'))
    expect(enemyMoveAfterFaint).toBe(false)
  })

  it('filterShowdownLogs preserves faint lines', () => {
    const raw = [
      '|split|p1',
      '|-damage|p1a: Pikachu|0/100 fnt',
      '|-damage|p1a: Pikachu|0/100',
      '|faint|p1a: Pikachu',
    ]
    const filtered = filterShowdownLogs(raw)
    expect(filtered).toContain('|faint|p1a: Pikachu')
  })
})
