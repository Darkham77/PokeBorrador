import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { gsap } from 'gsap'
import { useBattleTweenRegistry } from '@/composables/battle/useBattleTweenRegistry'
import { gameBus } from '@/logic/events/gameBus'

describe('useBattleTweenRegistry', () => {
  let registry: ReturnType<typeof useBattleTweenRegistry>

  beforeEach(() => {
    registry = useBattleTweenRegistry()
    registry.initTweenRegistryListeners()
  })

  afterEach(() => {
    registry.cleanupTweenRegistryListeners()
  })

  it('unblocks immediately if tween is already registered before awaitTween is called', async () => {
    const dummyObj = { val: 0 }
    const tween = gsap.to(dummyObj, { val: 1, duration: 0.01 })
    gameBus.emit('REGISTER_TWEEN', { key: 'player-test-1', tween })

    await expect(registry.awaitTween('player-test-1')).resolves.toBeUndefined()
  })

  it('unblocks when REGISTER_TWEEN is emitted while awaitTween is waiting', async () => {
    const dummyObj = { val: 0 }
    const tween = gsap.to(dummyObj, { val: 1, duration: 0.01 })

    const promise = registry.awaitTween('player-test-2')
    gameBus.emit('REGISTER_TWEEN', { key: 'player-test-2', tween })

    await expect(promise).resolves.toBeUndefined()
  })

  it('unblocks safely via fallback if tween is killed before completion', async () => {
    const dummyObj = { val: 0 }
    // A long tween
    const tween = gsap.to(dummyObj, { val: 1, duration: 10 })
    gameBus.emit('REGISTER_TWEEN', { key: 'player-test-3', tween })

    const promise = registry.awaitTween('player-test-3')
    // Kill the tween abruptly (mimicking killTweensOf)
    tween.kill()

    // Under fallback, safeAwaitTween should resolve safely without hanging
    await expect(promise).resolves.toBeUndefined()
  })

  it('unblocks safely via fallback if REGISTER_TWEEN never fires', async () => {
    // Fast-forward or await the fallback timer (0.5s in GSAP)
    await expect(registry.awaitTween('unregistered-key')).resolves.toBeUndefined()
  }, 3000)

  it('rejects pending awaiters loudly if cleaned up while waiting', async () => {
    const promise = registry.awaitTween('player-pending')
    registry.cleanupTweenRegistryListeners()

    await expect(promise).rejects.toThrowError(/Component never registered tween/)
  })
})
