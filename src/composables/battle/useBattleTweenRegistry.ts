import gsap from 'gsap'
import { gameBus } from '@/logic/events/gameBus'

interface RegisterTweenDetail {
  key: string
  tween: gsap.core.Tween | gsap.core.Timeline
}

export function useBattleTweenRegistry() {
  const activeTweens = new Map<string, gsap.core.Tween | gsap.core.Timeline>()
  // Pending resolvers: set when awaitTween is called before the component has mounted.
  // Resolved immediately by the REGISTER_TWEEN handler when the component fires the event.
  const pendingTweenResolvers = new Map<string, () => void>()

  const onRegisterTween = (e: Event) => {
    const data = (e as CustomEvent<RegisterTweenDetail>).detail
    if (data && typeof data.key === 'string' && data.tween) {
      activeTweens.set(data.key, data.tween)
      // Unblock any awaitTween call that was already waiting for this key
      const resolver = pendingTweenResolvers.get(data.key)
      if (resolver) {
        pendingTweenResolvers.delete(data.key)
        resolver()
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
   * Awaits a GSAP tween registered by BattleCombatant via REGISTER_TWEEN.
   *
   * - If the tween is already registered (component was mounted): awaits it directly.
   * - If not yet registered (component just mounting): blocks on an event-driven Promise
   *   that resolves the instant the component fires REGISTER_TWEEN — no polling.
   * - GSAP delayedCall acts as a 2-second safety fallback (not setTimeout).
   */
  const awaitTween = async (animKey: string): Promise<void> => {
    // Fast path: tween already registered
    const existing = activeTweens.get(animKey)
    if (existing) {
      await existing
      activeTweens.delete(animKey)
      return
    }

    // Slow path: wait for the component to fire REGISTER_TWEEN
    const fallback = { timer: null as ReturnType<typeof gsap.delayedCall> | null }
    await new Promise<void>(resolve => {
      pendingTweenResolvers.set(animKey, resolve)
      // Safety: if component never mounts or has no sprite, unblock after 2s via GSAP (not setTimeout)
      fallback.timer = gsap.delayedCall(2, () => {
        if (pendingTweenResolvers.has(animKey)) {
          pendingTweenResolvers.delete(animKey)
          resolve()
        }
      })
    })
    fallback.timer?.kill()

    // Now await the actual GSAP tween (native GSAP coordination)
    const tween = activeTweens.get(animKey)
    if (tween) {
      await tween
      activeTweens.delete(animKey)
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
