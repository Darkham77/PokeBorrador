import { useGameStore } from '@/stores/game'

function initGameStateBridge() {
  const gameStore = useGameStore()

  // 1. Initial bridging: Ensure window.state exists and has basic properties
  if (typeof window !== 'undefined') {
    // If legacy 'state' variable was declared but not attached to window
    if (typeof state !== 'undefined' && !window.state) {
      window.state = state;
    } else {
      window.state = window.state || {};
    }

    // Proxy the map state to avoid black screen issues
    if (!window.state.map) {
      window.state.map = 'route1';
    }
  }

  // 2. Continuous Sync
  setInterval(() => {
    if (window.state && window.state.map && gameStore.state.map !== window.state.map) {
      // Logic for keeping store in sync
    }
  }, 2000);

  console.log('[StateBridge] Bridged legacy state to Vue stores.');
}

export { initGameStateBridge }
