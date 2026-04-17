/**
 * phaserBridge.js
 * A singleton for communication between Vue components and Phaser Scenes.
 * Avoids storing large Phaser objects in Vue's reactive state.
 */

class PhaserBridge {
  constructor() {
    this.game = null;
    this.events = new EventTarget();
  }

  /**
   * Set the Phaser Game instance.
   */
  setGame(game) {
    this.game = game;
    this.emit('game-ready', !!game);
  }

  /**
   * Emit an event to anyone listening (Vue or Phaser).
   */
  emit(event, data = null) {
    const customEvent = new CustomEvent(event, { detail: data });
    this.events.dispatchEvent(customEvent);
  }

  /**
   * Listen for an event.
   */
  on(event, callback) {
    this.events.addEventListener(event, callback);
    return () => this.events.removeEventListener(event, callback);
  }

  /**
   * Send a command directly to a specific Phaser Scene.
   */
  sendCommand(sceneKey, command, data) {
    if (!this.game) return;
    const scene = this.game.scene.getScene(sceneKey);
    if (scene && typeof scene.handleCommand === 'function') {
      scene.handleCommand(command, data);
    }
  }
}

export const phaserBridge = new PhaserBridge();
