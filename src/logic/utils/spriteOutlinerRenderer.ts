// src/logic/utils/spriteOutlinerRenderer.ts
import type { SpriteOutlineType } from './spriteOutliner.ts';

export interface Canvas2dLikeContext {
  filter: string;
  globalCompositeOperation: GlobalCompositeOperation;
  fillStyle: string | CanvasGradient | CanvasPattern;
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
}

/**
 * Common pixel dilation and silhouette blitting algorithm for sprites.
 */
export function renderSpriteOutline(
  ctx: Canvas2dLikeContext,
  tempCanvas: CanvasImageSource,
  tempCtx: Canvas2dLikeContext,
  sourceImg: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  type: SpriteOutlineType,
  r: number,
  padding: number
): void {
  tempCtx.drawImage(sourceImg, 0, 0);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillStyle = type === 'silhouette' ? '#ffffff' : '#000000';
  tempCtx.fillRect(0, 0, sourceWidth, sourceHeight);

  if (type === 'silhouette') {
    ctx.filter = 'blur(2px)';
  }

  for (let x = -r; x <= r; x++) {
    for (let y = -r; y <= r; y++) {
      if (x * x + y * y > r * r) continue;
      ctx.drawImage(tempCanvas, padding + x, padding + y);
    }
  }

  if (type === 'silhouette') {
    ctx.filter = 'none';
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, sourceWidth, sourceHeight);
    ctx.drawImage(tempCanvas, padding, padding);
  } else {
    ctx.drawImage(sourceImg, padding, padding);
  }
}
