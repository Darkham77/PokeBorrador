import { gameBus } from '@/logic/events/gameBus'
import { gsap } from 'gsap'

export function useBattleTweenRegistry() {
  if (typeof window !== 'undefined') {
    (window as unknown as { gsap?: typeof gsap }).gsap = gsap;
  }
  const activeTweens = new Map<string, unknown>()
  // Pending resolvers: set when awaitTween is called before the component has mounted.
  // Resolved immediately by the REGISTER_TWEEN handler when the component fires the event.
  const pendingTweenResolvers = new Map<string, Array<() => void>>()

  const onRegisterTween = (e: Event) => {
    const data = (e as CustomEvent).detail as { key?: string; tween?: unknown } | undefined
    if (data && data.key && data.tween) {
      activeTweens.set(data.key, data.tween)
      // Unblock any awaitTween call that was already waiting for this key
      const resolvers = pendingTweenResolvers.get(data.key)
      if (resolvers) {
        pendingTweenResolvers.delete(data.key)
        resolvers.forEach(resolve => resolve())
      }
    }
  }

  const initTweenRegistryListeners = () => {
    cleanupTweenRegistryListeners()
    gameBus.on('REGISTER_TWEEN', onRegisterTween)
  }

  const cleanupTweenRegistryListeners = () => {
    gameBus.off('REGISTER_TWEEN', onRegisterTween)
    activeTweens.clear()
    pendingTweenResolvers.clear()
  }

  /**
   * Helper to await a registered GSAP tween/timeline cleanly.
   * Leverages native GSAP event callbacks (onComplete, onInterrupt, onKill) for deterministic coordination.
   */
  const awaitGsapTween = (tween: unknown): Promise<void> => {
    return new Promise<void>(resolve => {
      if (tween && typeof (tween as { eventCallback?: unknown }).eventCallback === 'function') {
        const t = tween as { eventCallback: (event: string, callback?: () => void) => unknown, progress: () => number };
        if (t.progress() === 1) {
          resolve();
          return;
        }
        const prevComplete = t.eventCallback('onComplete') as (() => void) | undefined;
        const prevInterrupt = t.eventCallback('onInterrupt') as (() => void) | undefined;
        
        t.eventCallback('onComplete', () => {
          if (prevComplete) prevComplete();
          resolve();
        });
        t.eventCallback('onInterrupt', () => {
          if (prevInterrupt) prevInterrupt();
          resolve();
        });
        t.eventCallback('onKill', () => {
          resolve();
        });
      } else {
        Promise.resolve(tween).then(() => resolve(), () => resolve());
      }
    });
  }

  /**
   * Awaits a GSAP tween registered by BattleCombatant via REGISTER_TWEEN.
   *
   * - If the tween is already registered (component was mounted): awaits it directly.
   * - If not yet registered (component just mounting): blocks on an event-driven Promise
   *   that resolves the instant the component fires REGISTER_TWEEN — no polling.
   * - GSAP delayedCall acts as a 2-second safety fallback (not setTimeout).
   */
  const awaitTween = async (animKey: string): Promise<void> => {
    let timeoutId: unknown = null;

    const timeoutPromise = new Promise<void>(resolve => {
      timeoutId = gsap.delayedCall(2, () => {
        const currentList = pendingTweenResolvers.get(animKey);
        if (currentList) {
          pendingTweenResolvers.delete(animKey);
        }
        resolve();
      });
    });

    const workPromise = (async () => {
      const existing = activeTweens.get(animKey)
      if (existing) {
        await awaitGsapTween(existing);
        activeTweens.delete(animKey)
        return
      }

      await new Promise<void>(resolve => {
        let list = pendingTweenResolvers.get(animKey)
        if (!list) {
          list = []
          pendingTweenResolvers.set(animKey, list)
        }
        list.push(resolve)
      })

      const tween = activeTweens.get(animKey)
      if (tween) {
        await awaitGsapTween(tween);
        activeTweens.delete(animKey)
      }
    })();

    await Promise.race([workPromise, timeoutPromise]);

    if (timeoutId) {
      (timeoutId as { kill: () => void }).kill();
    }
  }

  return {
    activeTweens,
    pendingTweenResolvers,
    onRegisterTween,
    initTweenRegistryListeners,
    cleanupTweenRegistryListeners,
    awaitTween
  }
}
