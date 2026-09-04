import { gsap } from 'gsap'
import { gameBus } from '@/logic/events/gameBus'

interface RegisterTweenDetail {
  key: string
  tween: gsap.core.Tween | gsap.core.Timeline
}

export function useBattleTweenRegistry() {
  const activeTweens = new Map<string, gsap.core.Tween | gsap.core.Timeline>()
  // Pending resolvers: set when awaitTween is called before the component has mounted.
  // Resolved immediately by the REGISTER_TWEEN handler when the component fires the event.
  const pendingTweenResolvers = new Map<string, { resolve: () => void; reject: (err: Error) => void }>()

  const onRegisterTween = (e: Event) => {
    const data = (e as CustomEvent<RegisterTweenDetail>).detail
    if (data && typeof data.key === 'string' && data.tween) {
      activeTweens.set(data.key, data.tween)
      console.debug(`[TweenRegistry] Registered animation tween. context=${JSON.stringify({ key: data.key, pendingKeys: [...pendingTweenResolvers.keys()] })}`)
      // Unblock any awaitTween call that was already waiting for this key
      const pending = pendingTweenResolvers.get(data.key)
      if (pending) {
        pendingTweenResolvers.delete(data.key)
        pending.resolve()
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
    // Fail-fast: any pending awaiter whose component never fired REGISTER_TWEEN must crash loud.
    for (const [key, { reject }] of pendingTweenResolvers) {
      reject(new Error(`[TweenRegistry] Component never registered tween "${key}". FSM would have hung forever.`))
    }
    pendingTweenResolvers.clear()
  }

  const safeAwaitTween = async (tween: gsap.core.Tween | gsap.core.Timeline): Promise<void> => {
    // If the tween already completed, or was killed/detached (parent === null), unblock immediately.
    if (!tween.isActive() && (!tween.parent || tween.progress() === 1)) return

    return new Promise<void>((resolve) => {
      let resolved = false
      let fallbackCall: gsap.core.Tween | null = null

      const done = () => {
        if (!resolved) {
          resolved = true
          if (fallbackCall) fallbackCall.kill()
          resolve()
        }
      }

      // Preserve existing callback chains
      const origComplete = tween.eventCallback('onComplete')
      tween.eventCallback('onComplete', () => {
        if (typeof origComplete === 'function') origComplete()
        done()
      })
      const origInterrupt = tween.eventCallback('onInterrupt')
      tween.eventCallback('onInterrupt', () => {
        if (typeof origInterrupt === 'function') origInterrupt()
        done()
      })

      const durationSec = tween.totalDuration() || 0.5
      fallbackCall = gsap.delayedCall(durationSec + 0.1, done)
    })
  }

  /**
   * Awaits a GSAP tween registered by BattleCombatant via REGISTER_TWEEN.
   *
   * - Fast path: tween already registered (component mounted first) → awaits it directly.
   * - Slow path: blocks on an event-driven Promise resolved the instant the component fires
   *   REGISTER_TWEEN. No polling, no timers.
   * - Fail-fast: if the registry is cleaned up while still waiting, the Promise rejects loudly
   *   so the FSM crashes immediately instead of hanging forever.
   */
  const awaitTween = async (animKey: string): Promise<void> => {
    // Fast path: tween already registered
    const existing = activeTweens.get(animKey)
    if (existing) {
      activeTweens.delete(animKey)
      await safeAwaitTween(existing)
      return
    }

    // Slow path: event-driven wait with GSAP fallback safety
    console.debug(`[TweenRegistry] Awaiting component tween registration. context=${JSON.stringify({ animKey, activeKeys: [...activeTweens.keys()], pendingKeys: [...pendingTweenResolvers.keys()] })}`)
    await new Promise<void>((resolve, reject) => {
      const fallbackTimer = gsap.delayedCall(0.5, () => {
        pendingTweenResolvers.delete(animKey)
        resolve()
      })
      pendingTweenResolvers.set(animKey, {
        resolve: () => {
          fallbackTimer.kill()
          resolve()
        },
        reject: (err) => {
          fallbackTimer.kill()
          reject(err)
        }
      })
    })

    // Now await the actual GSAP tween (native GSAP coordination)
    const tween = activeTweens.get(animKey)
    if (tween) {
      activeTweens.delete(animKey)
      await safeAwaitTween(tween)
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
