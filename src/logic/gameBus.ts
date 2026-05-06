
/**
 * gameBus.ts
 * A simple global event bus to decouple logic from visual components.
 * Replaces the old PhaserBridge to remove all engine dependencies.
 */
class GameBus extends EventTarget {
  emit(event: string, detail: any = {}): void {
    this.dispatchEvent(new CustomEvent(event, { detail }))
  }

  on(event: string, callback: EventListenerOrEventListenerObject): void {
    this.addEventListener(event, callback)
  }

  off(event: string, callback: EventListenerOrEventListenerObject): void {
    this.removeEventListener(event, callback)
  }

  // Compatibility method for the old bridge
  sendCommand(_scene: string, command: string, payload: any): void {
    // For now, we just emit the command as a global event
    this.emit(command, payload)
  }
}

export const gameBus = new GameBus()
