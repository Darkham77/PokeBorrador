import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

export interface BattleStoreAccess {
  state?: BattleState | null;
  [key: string]: unknown;
}

export interface GameStoreAccess {
  state?: { team?: Pokemon[] };
  [key: string]: unknown;
}

let showdownStoreResolvers: {
  getBattleStore?: () => BattleStoreAccess | null | undefined;
  getGameStore?: () => GameStoreAccess | null | undefined;
} = {}; // singleton-ok: Singleton instance state container

export function registerShowdownStoreResolvers(resolvers: {
  getBattleStore?: () => BattleStoreAccess | null | undefined;
  getGameStore?: () => GameStoreAccess | null | undefined;
}): void {
  showdownStoreResolvers = { ...showdownStoreResolvers, ...resolvers };
}

export function resolveBattleStore(): BattleStoreAccess | null {
  // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getBattleStore) {
    const s = showdownStoreResolvers.getBattleStore();
    if (s) return s;
  }
  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (win) {
    const resolver = win.__VITE_DEBUG_STORE_RESOLVER__ as (() => unknown) | undefined;
    if (resolver) return resolver() as BattleStoreAccess;
    const debug = win.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      const gs = (debug.getGameStore as () => unknown)();
      const bs = Reflect.get(gs as object, 'gs') as BattleStoreAccess | undefined;
      if (bs) return bs;
    }
  }
  return null;
}

export function resolveGameStore(): GameStoreAccess | null {
  // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getGameStore) {
    const s = showdownStoreResolvers.getGameStore();
    if (s) return s;
  }
  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (win) {
    const debug = win.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      return (debug.getGameStore as () => unknown)() as GameStoreAccess;
    }
  }
  return null;
}

let showdownWorker: Worker | null = null; // singleton-ok: Singleton instance state container

export function setShowdownWorker(worker: Worker | null): void {
  showdownWorker = worker;
  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (win) {
    if (worker) {
      win.__showdownWorker__ = worker;
    } else {
      delete win.__showdownWorker__;
    }
  }
}

export function getShowdownWorker(): Worker | null {
  // result-ok: Operation result wrapper payload
  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (!showdownWorker && win?.__showdownWorker__) {
    showdownWorker = win.__showdownWorker__;
  }
  return showdownWorker;
}

export function preloadShowdownWorker(): void {
  if (
    typeof globalThis.window === 'undefined' ||
    typeof Worker === 'undefined' ||
    getShowdownWorker()
  )
    return;

  const worker = new Worker(new URL('./showdown.worker.ts', import.meta.url), { type: 'module' });
  setShowdownWorker(worker);
}

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  const win = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (win && win.__showdownWorker__) {
    win.__showdownWorker__.terminate();
    delete win.__showdownWorker__;
  }
}

export function cleanWorkerListener(worker: Worker, handler: (e: MessageEvent) => void): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', handler);
  } else {
    worker.onmessage = null;
  }
}
