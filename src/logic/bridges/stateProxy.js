import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useMapStore } from '@/stores/map'

/**
 * Ensures window.state is a reactive Proxy that bridges legacy logic with Pinia stores.
 * This is the modern replacement for the global 'state' object.
 */
export function initGameStateBridge() {
  if (typeof window === 'undefined') return

  const gameStore = useGameStore()
  const battleStore = useBattleStore()
  const mapStore = useMapStore()
  
  // Physical fallback for properties not yet migrated to Pinia
  if (!window._legacyState) {
    window._legacyState = window.state || {}
  }

  // Create the Global State Proxy
  const stateProxy = new Proxy(window._legacyState, {
    get(target, prop) {
      if (!gameStore) return target[prop]

      // Propiedades críticas del Store
      if (prop === 'map') {
        // El motor legacy espera que state.map sea un STRING (el ID del mapa)
        return gameStore.state.map?.currentMap || 'route1'
      }
      if (prop === 'battle') return gameStore.state.battle
      if (prop === 'trainer') return gameStore.state.trainer
      if (prop === 'team') return gameStore.state.team
      if (prop === 'badges') return gameStore.state.badges

      // Si la propiedad existe en el estado de Pinia, devolverla directamente
      if (gameStore.state[prop] !== undefined) {
        return gameStore.state[prop]
      }

      return target[prop]
    },

    set(target, prop, value) {
      if (!gameStore) {
        target[prop] = value
        return true
      }

      if (prop === 'map') {
        // Si el legacy intenta setear state.map = 'id', lo mapeamos a currentMap
        if (typeof value === 'string') {
          gameStore.state.map.currentMap = value
        }
        return true
      }

      // 3. Game Store Sync
      if (prop in gameStore.state) {
        gameStore.state[prop] = value
        return true
      }

      // 4. Fallback to legacy object
      target[prop] = value
      return true
    },

    ownKeys(target) {
      return [...new Set([
        ...Reflect.ownKeys(target),
        ...Reflect.ownKeys(gameStore.state),
        'battle',
        'map'
      ])]
    },

    getOwnPropertyDescriptor(target, prop) {
      if (prop in gameStore.state || prop === 'battle' || prop === 'map') {
        return { enumerable: true, configurable: true }
      }
      return Reflect.getOwnPropertyDescriptor(target, prop)
    }
  })

  window.state = stateProxy
  console.log('[StateBridge] window.state fully migrated to Reactive Pinia Proxy.')
}
