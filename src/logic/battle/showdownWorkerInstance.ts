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

export function resolveBattleStore(): BattleStoreAccess | null { // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getBattleStore) {
    const s = showdownStoreResolvers.getBattleStore();
    if (s) return s;
  }
  if (typeof window !== 'undefined') {
    const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
    if (resolver) return resolver() as BattleStoreAccess;
    const debug = window.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      const gs = debug.getGameStore();
      const bs = Reflect.get(gs, 'gs') as BattleStoreAccess | undefined;
      if (bs) return bs;
    }
  }
  return null;
}

export function resolveGameStore(): GameStoreAccess | null { // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getGameStore) {
    const s = showdownStoreResolvers.getGameStore();
    if (s) return s;
  }
  if (typeof window !== 'undefined') {
    const debug = window.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      return debug.getGameStore() as GameStoreAccess;
    }
  }
  return null;
}

export let showdownWorker: Worker | null = null; // singleton-ok: Singleton instance state container

export function setShowdownWorker(worker: Worker | null): void {
  showdownWorker = worker;
  if (typeof window !== 'undefined') {
    if (worker) {
      window.__showdownWorker__ = worker;
    } else {
      delete window.__showdownWorker__;
    }
  }
}

export function getShowdownWorker(): Worker | null { // result-ok: Operation result wrapper payload
  if (!showdownWorker && typeof window !== 'undefined' && window.__showdownWorker__) {
    showdownWorker = window.__showdownWorker__;
  }
  return showdownWorker;
}

export function preloadShowdownWorker(): void {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || getShowdownWorker()) return;

  const worker = new Worker(new URL('./showdown.worker.ts', import.meta.url), { type: 'module' });
  setShowdownWorker(worker);
}

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  if (typeof window !== 'undefined') {
    if (window.__showdownWorker__) {
      window.__showdownWorker__.terminate();
      delete window.__showdownWorker__;
    }
  }
}

export function cleanWorkerListener(worker: Worker, handler: (e: MessageEvent) => void): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', handler);
  } else {
    worker.onmessage = null;
  }
}
