/**
 * src/logic/render/render.worker.ts
 * 
 * Web Worker for off-thread rendering using OffscreenCanvas.
 * Prevents main thread layout thrashing and ensures smooth 60 FPS.
 */

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

interface RenderState {
  camera: { x: number; y: number };
  player: { x: number; y: number };
  entities: Array<{ id: string; x: number; y: number; type: string }>;
}

let state: RenderState = {
  camera: { x: 0, y: 0 },
  player: { x: 100, y: 100 },
  entities: []
};

// Request Animation Frame loop inside Worker
function renderLoop() {
  const context = ctx;
  if (!context || !canvas) return;

  // Clear Canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid background (mock map)
  context.save();
  context.translate(-state.camera.x, -state.camera.y);

  context.strokeStyle = '#2d3748';
  context.lineWidth = 1;
  const gridSize = 32;

  // Draw a simple grid representing game tiles
  for (let x = 0; x < canvas.width + state.camera.x + gridSize; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height + state.camera.y);
    context.stroke();
  }
  for (let y = 0; y < canvas.height + state.camera.y + gridSize; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width + state.camera.x, y);
    context.stroke();
  }

  // Draw player (Mock representation)
  const PLAYER_GLOW_SHADOW_BLUR_PX = 10;
  const PLAYER_MOCK_RADIUS_PX = 16;
  const LABEL_OFFSET_X_PX = 50;
  const LABEL_OFFSET_Y_PX = 24;
  const ENTITY_MOCK_RADIUS_PX = 12;

  context.fillStyle = '#4299e1'; // Premium blue
  context.shadowBlur = PLAYER_GLOW_SHADOW_BLUR_PX;
  context.shadowColor = '#4299e1';
  context.beginPath();
  context.arc(state.player.x, state.player.y, PLAYER_MOCK_RADIUS_PX, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  // Draw simple label
  context.fillStyle = '#ffffff';
  context.font = '12px Courier New';
  context.fillText('Player (Offscreen)', state.player.x - LABEL_OFFSET_X_PX, state.player.y - LABEL_OFFSET_Y_PX);

  // Draw mock entities
  state.entities.forEach(ent => {
    context.fillStyle = '#ed64a6'; // Pink
    context.beginPath();
    context.arc(ent.x, ent.y, ENTITY_MOCK_RADIUS_PX, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();

  requestAnimationFrame(renderLoop);
}

interface RenderWorkerMessage {
  type: 'INIT' | 'RESIZE' | 'UPDATE_STATE';
  payload: {
    canvas?: OffscreenCanvas;
    width?: number;
    height?: number;
  } & Partial<RenderState>;
}

// Message Router
self.onmessage = (event: MessageEvent) => {
  const data = event.data as RenderWorkerMessage;
  const { type, payload } = data;

  switch (type) {
    case 'INIT': {
      canvas = payload.canvas || null;
      if (canvas) {
        ctx = canvas.getContext('2d');
        requestAnimationFrame(renderLoop);
      }
      break;
    }
    case 'RESIZE': {
      if (canvas && payload.width !== undefined && payload.height !== undefined) {
        canvas.width = payload.width;
        canvas.height = payload.height;
      }
      break;
    }
    case 'UPDATE_STATE': {
      state = { ...state, ...payload };
      break;
    }
    default: {
      const safeType = String(type).replace(/[^a-zA-Z0-9_]/g, '');
      console.warn(`[RenderWorker] Unknown message type: ${safeType}`);
    }
  }
};

export {};
