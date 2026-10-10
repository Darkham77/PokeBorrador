/**
 * test_aventura/logic/map/canvasViewportBlitter.ts
 *
 * HTML5 2D CANVAS VIEWPORT BLITTER FOR REGIONAL CONTINENT MAPS
 *
 * Renders compiled tile blit instructions onto an HTMLCanvasElement with
 * pixel-sharp scaling, background ocean fill, and optional viewport culling.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';
import { preloadTileImages, getImageCache } from './canvasImageLoader.ts';
import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import { buildMapBlitInstructions } from './canvasTileRenderer.ts';

export interface VisibleViewportBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Renders the full continent tilemap into the specified HTML5 2D Canvas in native 32x32 resolution.
 */
export async function renderRegionalContinentTilemap(
  canvas: HTMLCanvasElement,
  continent: ContinentMapResult,
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid?: readonly (readonly boolean[])[],
  wilderness?: WildernessLayerResult | null,
  visibleBounds?: VisibleViewportBounds
): Promise<void> {
  const widthPx = continent.width * CANVAS_TILE_SIZE;
  const heightPx = continent.height * CANVAS_TILE_SIZE;

  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Enforce pixel-sharp rendering without bilinear interpolation
  ctx.imageSmoothingEnabled = false;

  // Background deep ocean
  ctx.fillStyle = '#0a1428';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Compile instructions and preload any missing images
  const { instructions, uniqueFilenames } = buildMapBlitInstructions(
    continent,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness
  );

  await preloadTileImages(uniqueFilenames);

  // Blit each instruction in layer order with optional viewport culling
  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i]!;

    if (visibleBounds) {
      if (
        inst.px + CANVAS_RENDERER.VIEWPORT_CULL_PADDING_PX < visibleBounds.minX ||
        inst.px > visibleBounds.maxX ||
        inst.py + CANVAS_RENDERER.VIEWPORT_CULL_PADDING_PX < visibleBounds.minY ||
        inst.py > visibleBounds.maxY
      ) {
        continue;
      }
    }

    const img = getImageCache().get(inst.filename);
    if (img) {
      ctx.drawImage(img, inst.px, inst.py);
    }
  }
}
