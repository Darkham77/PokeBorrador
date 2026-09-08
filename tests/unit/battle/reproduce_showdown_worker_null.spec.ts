/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { executeTurnInWorker, setShowdownWorker, testResetShowdownWorker } from '@/logic/battle/showdownWorkerClient.ts';
import { executeCanonicalTurn } from '@/logic/battle/helpers/canonicalTurnRunner.ts';
import type { BattleContext } from '@/types/battle/battleContext';

class MockWorker {
  private listeners = new Set<(event: MessageEvent) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  terminate(): void {}

  postMessage(message: { type: string }): void {
    if (message.type === 'EXECUTE_TURN') {
      const event = {
        data: {
          type: 'TURN_SUCCESS',
          payload: {
            logs: ['|turn|1', '|move|p1a: Pikachu|Tackle|p2a: Pidgey'],
            isOver: false,
            winner: null,
            p1Request: { active: [{ moves: [{ id: 'tackle' }] }] },
            p2Request: { active: [{ moves: [{ id: 'tackle' }] }] }
          }
        }
      } as MessageEvent;
      this.listeners.forEach(l => l(event));
    }
  }
}

function createMockBattleContext(): BattleContext {
  const p = { id: '25', uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100, level: 50, moves: [{ id: 'tackle', name: 'Tackle', power: 40, pp: 35 }] };
  const e = { id: '16', uid: 'e1', name: 'Pidgey', hp: 100, maxHp: 100, level: 5, moves: [{ id: 'tackle', name: 'Tackle', power: 40, pp: 35 }] };
  return {
    activeBattle: {
      value: {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        participants: ['p1', 'e1'],
        turnCount: 0,
        over: false
      }
    },
    fsm: {
      transition: async () => true
    },
    BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
    BATTLE_SUBSTATES: {
      BUILD_QUEUE: 'BUILD_QUEUE',
      POP_ACTION: 'POP_ACTION',
      APPLY_MOVE: 'APPLY_MOVE',
      EVAL_HP: 'EVAL_HP'
    },
    playerStages: { value: {} },
    enemyStages: { value: {} },
    battleLogs: { value: [] },
    addLog: () => {},
    endBattle: async () => {},
    persistBattle: () => {}
  } as unknown as BattleContext;
}

describe('Showdown Worker null desynchronization reproduction (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    testResetShowdownWorker();
  });

  it('fails with "showdownWorker is null" when window.__showdownWorker__ is set but module showdownWorker is null', async () => {
    const mockWorker = new MockWorker() as unknown as Worker;

    // Simulate scenario: window.__showdownWorker__ was created/preserved across HMR or page context,
    // but the newly evaluated module has showdownWorker = null.
    setShowdownWorker(null);
    window.__showdownWorker__ = mockWorker;

    // This MUST resolve turn using window.__showdownWorker__, NOT throw "showdownWorker is null"
    const turnResult = await executeTurnInWorker('move 1', 'move 1');
    expect(turnResult.isOver).toBe(false);
  });

  it('fails in executeCanonicalTurn when window.__showdownWorker__ is set but module variable is null', async () => {
    const mockWorker = new MockWorker() as unknown as Worker;
    setShowdownWorker(null);
    window.__showdownWorker__ = mockWorker;

    const ctx = createMockBattleContext();
    const result = await executeCanonicalTurn(ctx, 'move 1', 'move 1');
    expect(result.isOver).toBe(false);
    expect(result.logs.length).toBeGreaterThan(0);
  });
});
