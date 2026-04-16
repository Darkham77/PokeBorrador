import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'

/**
 * Ensures basic state structure is available to avoid legacy crashes.
 * Bridges window.state with Pinia using a Proxy.
 */
export function initGameStateBridge() {
  if (typeof window === 'undefined') return

  const gameStore = useGameStore()
  const battleStore = useBattleStore()
  
  // Internal physical object for properties that are NOT in Pinia yet or are transient
  if (!window._legacyState) {
    window._legacyState = window.state || {}
    if (!window._legacyState.map) window._legacyState.map = 'route1'
  }

  // Create the Proxy
  const stateProxy = new Proxy(window._legacyState, {
    get(target, prop) {
      // 1. Redirect 'battle' to battleStore
      if (prop === 'battle') {
        return battleStore.state
      }
      // 2. Check if it exists in Pinia gameStore.state
      if (prop in gameStore.state) {
        return gameStore.state[prop]
      }
      // 3. Fallback to legacy object
      return target[prop]
    },
    set(target, prop, value) {
      // 1. Redirect 'battle' to battleStore sync
      if (prop === 'battle') {
        if (!value) {
          battleStore.completeBattleFlow() 
        } else {
          battleStore.syncFromLegacy(value)
        }
        return true
      }
      // 2. If it's in Pinia, update Pinia
      if (prop in gameStore.state) {
        gameStore.state[prop] = value
        return true
      }
      // 3. Else update legacy object
      target[prop] = value
      return true
    },
    ownKeys(target) {
      // Combine keys from both for transparency (Object.keys, etc)
      return [...new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(gameStore.state)])]
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in gameStore.state) {
        return { enumerable: true, configurable: true }
      }
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }
  })

  window.state = stateProxy
  console.log('[StateBridge] window.state is now a reactive Proxy to Pinia.')
}
