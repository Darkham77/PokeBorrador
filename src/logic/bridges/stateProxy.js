import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useMapStore } from '@/stores/map'

/**
 * Initializes the window.state Proxy.
 * This ensures that any modification to the legacy global state
 * is automatically synced to the relevant Pinia stores.
 */
export function initGameStateBridge() {
  if (typeof window === 'undefined') return

  const gameStore = useGameStore()
  const battleStore = useBattleStore()
  const mapStore = useMapStore()

  // Initial state if not exists
  if (!window.state) {
    window.state = gameStore.state || {}
  }

  // Define the Proxy
  const stateHandler = {
    get(target, prop) {
      return target[prop]
    },
    set(target, prop, value) {
      target[prop] = value

      // Trigger syncs to Vue stores
      if (prop === 'battle') {
        battleStore.syncFromLegacy(value)
      } else if (prop === 'location' || prop === 'map') {
        mapStore.syncFromLegacy(target)
      } else {
        // Generic game state sync
        gameStore.syncFromLegacy(target)
      }

      return true
    }
  }

  // Replace global state with a Proxy
  const initialState = { ...window.state }
  window.state = new Proxy(initialState, stateHandler)

  console.log('[StateProxy] Global window.state is now proxied to Pinia stores.')
}
