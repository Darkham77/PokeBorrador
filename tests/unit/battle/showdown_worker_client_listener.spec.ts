/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { executeTurnInWorker, setShowdownWorker } from '@/logic/battle/showdownWorkerClient.ts';

class ImmediateTurnWorker {
  private listeners = new Set<(event: MessageEvent) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  postMessage(message: { type: string }): void {
    if (message.type !== 'EXECUTE_TURN') return;
    if (this.listeners.size === 0) {
      throw new Error('TURN_SUCCESS would be lost because no listener was registered before postMessage.');
    }
    const event = {
      data: { type: 'TURN_SUCCESS', payload: { logs: [], isOver: false, winner: null } },
    } as MessageEvent;
    this.listeners.forEach(listener => listener(event));
  }
}

describe('Showdown worker turn delivery', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('registers the turn listener before posting a synchronous certified response', async () => {
    setShowdownWorker(new ImmediateTurnWorker() as unknown as Worker);

    await expect(executeTurnInWorker('switch 2', '', false, true)).resolves.toMatchObject({
      isOver: false,
      winner: null,
    });
  });
});
