/**
 * test_aventura/logic/map/canvasViewportBlitter.ts
 *
 * HTML5 2D CANVAS VIEWPORT BLITTER FOR REGIONAL CONTINENT MAPS
 *
 * Renders compiled tile blit instructions onto an HTMLCanvasElement with
 * pixel-sharp scaling, instant low-res preview feedback, <= 6ms frame-budgeted
 * progressive rendering, and clipped dirty-rect healing updates.
 */

import { PERCENT_BASE_MULTIPLIER } from '@/logic/constants/gameplay';

import { CANVAS_RENDERER } from '../../config/canvasRendererConfig.ts';
import { RGBA_CHANNEL_COUNT } from '../../config/continentWorkerConfig.ts';
import { CANVAS_TILE_SIZE, STUDIO_MOBILE_BREAKPOINT_PX } from '../../config/studioConstants.ts';
import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import { PACKED_BLIT_STRIDE, type PackedMapBlitPayload } from '../../types/map/continentTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import { getImageCache, preloadTileImages } from './canvasImageLoader.ts';
import { buildMapBlitInstructions } from './canvasTileRenderer.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { WildernessLayerResult } from './wildernessVegetationEngine.ts';

const OCEAN_VOID_FILL_HEX = '#0a1428';
const FRAME_BLIT_BUDGET_MS = 6;
const YIELD_CHECK_BATCH_MASK = 63;
const MAX_MOBILE_FULL_RES_CANVAS_PX = 8192;
const MOBILE_SAFE_BACKING_SCALE = 0.5;
const FULL_BACKING_SCALE = 1;

let previewScratchCanvas: HTMLCanvasElement | null = null;

export interface RenderPackedTilemapOptions {
  readonly canvas: HTMLCanvasElement;
  readonly continentWidth: number;
  readonly continentHeight: number;
  readonly packedBlit: PackedMapBlitPayload;
  readonly rawPreviewBuffer?: ArrayBuffer | null;
  readonly signal?: AbortSignal;
  readonly onProgress?: (percent: number) => void;
}

function resolveCanvasBackingScale(widthPx: number, heightPx: number): number {
  const isMobileViewport =
    typeof globalThis.window !== 'undefined' &&
    globalThis.window.innerWidth <= STUDIO_MOBILE_BREAKPOINT_PX;
  if (
    isMobileViewport &&
    (widthPx > MAX_MOBILE_FULL_RES_CANVAS_PX || heightPx > MAX_MOBILE_FULL_RES_CANVAS_PX)
  ) {
    return MOBILE_SAFE_BACKING_SCALE;
  }
  return FULL_BACKING_SCALE;
}

function waitForNextAnimationFrame(): Promise<void> {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    return new Promise((resolve) => {
      globalThis.requestAnimationFrame(() => resolve());
    });
  }
  return Promise.resolve();
}

function drawInstantPreviewBuffer(
  ctx: CanvasRenderingContext2D,
  rawPreviewBuffer: ArrayBuffer,
  gridW: number,
  gridH: number,
  widthPx: number,
  heightPx: number
): void {
  if (
    typeof ImageData === 'undefined' ||
    typeof document === 'undefined' ||
    rawPreviewBuffer.byteLength !== gridW * gridH * RGBA_CHANNEL_COUNT
  ) {
    return;
  }

  if (!previewScratchCanvas) {
    previewScratchCanvas = document.createElement('canvas');
  }
  if (previewScratchCanvas.width !== gridW || previewScratchCanvas.height !== gridH) {
    previewScratchCanvas.width = gridW;
    previewScratchCanvas.height = gridH;
  }

  const scratchCtx = previewScratchCanvas.getContext('2d');
  if (!scratchCtx) return;

  const imgData = new ImageData(new Uint8ClampedArray(rawPreviewBuffer), gridW, gridH);
  scratchCtx.putImageData(imgData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(previewScratchCanvas, 0, 0, widthPx, heightPx);
}

async function executeTimeSlicedBlitLoop(
  ctx: CanvasRenderingContext2D,
  packedBlit: PackedMapBlitPayload,
  signal?: AbortSignal,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  const totalCount = packedBlit.count;
  if (totalCount === 0) {
    onProgress?.(PERCENT_BASE_MULTIPLIER);
    return true;
  }

  const coordsView = new Int32Array(packedBlit.coordsBuffer, 0, totalCount * PACKED_BLIT_STRIDE);
  const { palette } = packedBlit;
  const cache = getImageCache();
  let sliceStart = performance.now();

  for (let i = 0; i < totalCount; i++) {
    if (i > 0 && (i & YIELD_CHECK_BATCH_MASK) === 0) {
      if (signal?.aborted) return false;
      if (performance.now() - sliceStart >= FRAME_BLIT_BUDGET_MS) {
        onProgress?.(Math.round((i / totalCount) * PERCENT_BASE_MULTIPLIER));
        await waitForNextAnimationFrame();
        if (signal?.aborted) return false;
        sliceStart = performance.now();
      }
    }

    const base = i * PACKED_BLIT_STRIDE;
    const filename = palette[coordsView[base]!];
    const img = filename ? cache.get(filename) : undefined;
    if (img) {
      ctx.drawImage(img, coordsView[base + 1]!, coordsView[base + 2]!);
    }
  }

  onProgress?.(PERCENT_BASE_MULTIPLIER);
  return true;
}

/**
 * Progressively renders a Worker-compiled binary PackedMapBlitPayload onto an HTMLCanvasElement
 * within strict <= 6ms/frame slices so the main UI thread stays responsive at 60 FPS.
 */
export async function renderPackedContinentTilemap(
  options: RenderPackedTilemapOptions
): Promise<boolean> {
  if (options.signal?.aborted) return false;

  const widthPx = options.continentWidth * CANVAS_TILE_SIZE;
  const heightPx = options.continentHeight * CANVAS_TILE_SIZE;
  const backingScale = resolveCanvasBackingScale(widthPx, heightPx);
  const targetW = Math.round(widthPx * backingScale);
  const targetH = Math.round(heightPx * backingScale);

  if (options.canvas.width !== targetW || options.canvas.height !== targetH) {
    options.canvas.width = targetW;
    options.canvas.height = targetH;
  }

  const ctx = options.canvas.getContext('2d');
  if (!ctx) return false;

  ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = OCEAN_VOID_FILL_HEX;
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (options.rawPreviewBuffer) {
    drawInstantPreviewBuffer(
      ctx,
      options.rawPreviewBuffer,
      options.continentWidth,
      options.continentHeight,
      widthPx,
      heightPx
    );
  }

  options.onProgress?.(0);
  await preloadTileImages(options.packedBlit.palette);
  await waitForNextAnimationFrame();
  if (options.signal?.aborted) return false;

  ctx.setTransform(backingScale, 0, 0, backingScale, 0, 0);
  ctx.imageSmoothingEnabled = false;

  return executeTimeSlicedBlitLoop(ctx, options.packedBlit, options.signal, options.onProgress);
}

export interface DirtyRectRenderLayers {
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly wilderness?: WildernessLayerResult | null;
}

/**
 * Re-renders only a clipped dirty tile rectangle using the canonical 6-layer map blitter
 * with deep ocean background fill (#0a1428), avoiding transparent black artifacts or broken trees.
 */
export async function renderRegionalContinentDirtyRect(
  canvas: HTMLCanvasElement,
  continent: ContinentMapResult,
  dirtyBounds: DirtyTileBounds,
  layers: DirtyRectRenderLayers
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const minX = Math.max(0, dirtyBounds.minX);
  const minY = Math.max(0, dirtyBounds.minY);
  const maxX = Math.min(continent.width - 1, dirtyBounds.maxX);
  const maxY = Math.min(continent.height - 1, dirtyBounds.maxY);
  if (minX > maxX || minY > maxY) return;

  const logicalW = continent.width * CANVAS_TILE_SIZE;
  const logicalH = continent.height * CANVAS_TILE_SIZE;
  const scaleX = canvas.width > 0 && logicalW > 0 ? canvas.width / logicalW : FULL_BACKING_SCALE;
  const scaleY = canvas.height > 0 && logicalH > 0 ? canvas.height / logicalH : FULL_BACKING_SCALE;

  const clipX = minX * CANVAS_TILE_SIZE;
  const clipY = minY * CANVAS_TILE_SIZE;
  const clipW = (maxX - minX + 1) * CANVAS_TILE_SIZE;
  const clipH = (maxY - minY + 1) * CANVAS_TILE_SIZE;

  const { instructions, uniqueFilenames } = buildMapBlitInstructions(
    continent,
    layers.pois,
    layers.pathGrid,
    layers.bridgeGrid,
    layers.wilderness
  );

  await preloadTileImages(uniqueFilenames);

  const pad = CANVAS_RENDERER.VIEWPORT_CULL_PADDING_PX;
  const cullMinX = clipX - pad;
  const cullMinY = clipY - pad;
  const cullMaxX = clipX + clipW + pad;
  const cullMaxY = clipY + clipH + pad;

  ctx.save();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipW, clipH);
  ctx.clip();

  ctx.fillStyle = OCEAN_VOID_FILL_HEX;
  ctx.fillRect(clipX, clipY, clipW, clipH);

  for (let i = 0; i < instructions.length; i++) {
    const inst = instructions[i]!;
    if (
      inst.px + pad < cullMinX ||
      inst.px > cullMaxX ||
      inst.py + pad < cullMinY ||
      inst.py > cullMaxY
    ) {
      continue;
    }
    const img = getImageCache().get(inst.filename);
    if (img) {
      ctx.drawImage(img, inst.px, inst.py);
    }
  }

  ctx.restore();
}
