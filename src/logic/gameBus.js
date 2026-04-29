/**
 * gameBus.js
 * A simple global event bus to decouple logic from visual components.
 * Replaces the old PhaserBridge to remove all engine dependencies.
 */
class GameBus extends EventTarget {
  emit(event, detail = {}) {
    this.dispatchEvent(new CustomEvent(event, { detail }))
  }

  on(event, callback) {
    this.addEventListener(event, callback)
  }

  off(event, callback) {
    this.removeEventListener(event, callback)
  }

  // Compatibility method for the old bridge
  sendCommand(scene, command, payload) {
    // For now, we just emit the command as a global event
    this.emit(command, payload)
  }
}

export const gameBus = new GameBus()
