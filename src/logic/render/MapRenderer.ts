/**
 * src/logic/render/MapRenderer.ts
 * 
 * Main thread orchestrator for the OffscreenCanvas map rendering.
 * Spawns the worker, transfers canvas control, and sends state updates.
 */

export interface MapRendererState {
  camera: { x: number; y: number };
  player: { x: number; y: number };
  entities: Array<{ id: string; x: number; y: number; type: string }>;
}

export class MapRenderer {
  private worker: Worker | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initWorker();
  }

  private initWorker() {
    // Check support for OffscreenCanvas
    if (!('transferControlToOffscreen' in this.canvas)) {
      console.error('OffscreenCanvas is not supported in this browser.');
      return;
    }

    // Transfer control to offscreen
    const offscreen = this.canvas.transferControlToOffscreen();

    // Spawn the Web Worker
    // Note: We use Vite's native worker import syntax or new URL pattern
    this.worker = new Worker(
      new URL('./render.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Initialize the worker with the offscreen canvas
    this.worker.postMessage(
      {
        type: 'INIT',
        payload: { canvas: offscreen }
      },
      [offscreen]
    );

    // Initial resize to set size
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  /**
   * Resizes the offscreen canvas dimensions.
   */
  public resize(width: number, height: number) {
    if (!this.worker) return;
    this.worker.postMessage({
      type: 'RESIZE',
      payload: { width, height }
    });
  }

  /**
   * Sends new frame updates (e.g. camera position, player position) to the rendering worker.
   */
  public updateState(state: Partial<MapRendererState>) {
    if (!this.worker) return;
    this.worker.postMessage({
      type: 'UPDATE_STATE',
      payload: state
    });
  }

  /**
   * Terminates the worker and cleans up resources.
   */
  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
