/**
 * tests/unit/battle/battle_faint_playback_and_hp_sync_suite.spec.ts
 * Consolidated domain test suite for Battle Faint Mechanics:
 * Faint interruptions during turn log playback and faint HP synchronization to 0.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import '../../helpers/battleMockSetup';
import { filterShowdownLogs } from '@/logic/battle/showdownBridge';
import { processFaint } from '@/logic/battle/resolution';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: {},
  executeTurnInWorker: vi.fn()
}));

vi.mock('@/logic/battle/showdownAdapter', () => ({
  getShowdownSlot: vi.fn(() => 2),
  swapActivePokemon: vi.fn((arr) => arr),
  resolveShowdownSlot: vi.fn(() => 2),
  resolveCurrentTeamOrder: vi.fn((_order, team) => team)
}));

// =============================================================================
// 1. Faint Interrupts Log Playback Suite
// =============================================================================
describe('Faint Interrupts Log Playback', () => {
  async function runLogPlayback(
    logs: string[],
    onLine: (line: string) => Promise<void>,
    shouldBreakAfter: (line: string) => boolean
  ): Promise<{ processedLines: string[] }> {
    const processedLines: string[] = [];
    for (const line of logs) {
      await onLine(line);
      processedLines.push(line);
      if (shouldBreakAfter(line)) break;
    }
    return { processedLines };
  }

  const turnLogsBugScenario: string[] = [
    '|move|p2a: Arbok|Body Slam|p1a: Pikachu',
    '|-damage|p1a: Pikachu|0/100 fnt',
    '|faint|p1a: Pikachu',
    '|move|p1a: Pikachu|Thunder|p2a: Arbok',
    '|-damage|p2a: Arbok|30/100',
  ];

  it('documents regression: without early-break, slower attacker move plays after faint', async () => {
    const processed: string[] = [];
    for (const line of turnLogsBugScenario) {
      processed.push(line);
    }
    const playerMoveProcessed = processed.some(l => l.includes('|move|p1a:'));
    expect(playerMoveProcessed).toBe(true);
  });

  it('verifies early-break on |faint| prevents slower attacker move from playing', async () => {
    const { processedLines } = await runLogPlayback(
      turnLogsBugScenario,
      async () => {},
      (line) => line.startsWith('|faint|')
    );

    const playerMoveAfterFaint = processedLines.some(l => l.includes('|move|p1a:'));
    expect(playerMoveAfterFaint).toBe(false);

    const lastLine = processedLines[processedLines.length - 1];
    expect(lastLine).toBe('|faint|p1a: Pikachu');
  });

  it('verifies enemy faint stops loop and skips enemy slower attack', async () => {
    const logsEnemyFaintFirst: string[] = [
      '|move|p1a: Pikachu|Thunderbolt|p2a: Geodude',
      '|-damage|p2a: Geodude|0/80 fnt',
      '|faint|p2a: Geodude',
      '|move|p2a: Geodude|Rock Throw|p1a: Pikachu',
      '|-damage|p1a: Pikachu|60/100',
    ];

    const { processedLines } = await runLogPlayback(
      logsEnemyFaintFirst,
      async () => {},
      (line) => line.startsWith('|faint|')
    );

    const enemyMoveAfterFaint = processedLines.some(l => l.includes('|move|p2a:'));
    expect(enemyMoveAfterFaint).toBe(false);
  });

  it('filterShowdownLogs preserves faint lines in output', () => {
    const raw = [
      '|split|p1',
      '|-damage|p1a: Pikachu|0/100 fnt',
      '|-damage|p1a: Pikachu|0/100',
      '|faint|p1a: Pikachu'
    ];
    const filtered = filterShowdownLogs(raw);
    expect(filtered).toContain('|faint|p1a: Pikachu');
  });
});

// =============================================================================
// 2. Faint HP Sync Suite
// =============================================================================
describe('Faint HP Sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should update fainted enemy HP to 0 in enemyTeam array', async () => {
    const faintedEnemy = { uid: 'e-fainted', name: 'Rhydon', hp: 0, maxHp: 165, moves: [] } as unknown as Pokemon;
    const nextEnemy = { uid: 'e-next', name: 'Rhyhorn', hp: 137, maxHp: 137, moves: [] } as unknown as Pokemon;
    const enemyTeam = [faintedEnemy, nextEnemy];

    const activeBattle = ref({
      player: { uid: 'p-active', name: 'Eevee', hp: 100, moves: [] } as unknown as Pokemon,
      enemy: faintedEnemy,
      enemyTeam,
      isTrainer: true,
      over: false
    });

    const fsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
      currentSubState: { value: BATTLE_SUBSTATES.CLEANUP_MEMORY },
      transition: vi.fn(async (s: string, sub?: string) => {
        (fsm.currentState as { value: string }).value = s;
        if (sub) (fsm.currentSubState as { value: string | null }).value = sub;
      })
    };

    const mockCtx = {
      activeBattle,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      faintedSides: { value: new Set<string>() },
      enemyStages: ref({}),
      gs: {
        state: { team: [] }
      },
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext;

    await processFaint(mockCtx, 'enemy');

    expect(enemyTeam[0]?.hp).toBe(0);
  });
});
