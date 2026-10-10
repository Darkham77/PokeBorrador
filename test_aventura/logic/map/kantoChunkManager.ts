/**
 * test_aventura/logic/map/kantoChunkManager.ts
 *
 * SPATIAL CHUNKING & VIEWPORT RENDER ACCELERATOR (512x512 Chunks)
 * Handles offscreen canvas baking and frustum culling for massive regional maps.
 */

import { CHUNK_BAKE_CONFIG } from '../../config/kantoTileEngineConfig.ts';
import {
  KANTO_TILE_SIZE,
  KANTO_CHUNK_PX,
  KANTO_GRID_W,
  KANTO_GRID_H,
  KANTO_CHUNKS_X,
  KANTO_CHUNKS_Y
} from '../../types/map/kantoGridModel.ts';
import type {
  PlacedStructure,
  IRegionalWorldRendererSource
} from '../../types/map/kantoTileEngineTypes.ts';
import type {
  UniversalAutotiler,
  SemanticPrefabRenderer
} from './kantoTileEngine.ts';

class Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly wx: number;
  readonly wy: number;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  baked = false;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.wx = cx * KANTO_CHUNK_PX;
    this.wy = cy * KANTO_CHUNK_PX;
  }

  bake(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource
  ): void {
    if (typeof document === 'undefined') {
      this.baked = true;
      return;
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = KANTO_CHUNK_PX;
      this.canvas.height = KANTO_CHUNK_PX;
      this.ctx = this.canvas.getContext('2d');
    }

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, KANTO_CHUNK_PX, KANTO_CHUNK_PX);

    const cL = this.wx;
    const cT = this.wy;
    const cR = cL + KANTO_CHUNK_PX;
    const cB = cT + KANTO_CHUNK_PX;

    const inBounds = (x: number, y: number, w: number, h: number) => {
      return x + w >= cL && x <= cR && y + h >= cT && y <= cB;
    };

    // Layer 1: Base Terrain Autotiles (32x32 Tiles)
    const startTileX = this.cx * (KANTO_CHUNK_PX / KANTO_TILE_SIZE);
    const startTileY = this.cy * (KANTO_CHUNK_PX / KANTO_TILE_SIZE);
    const tilesPerChunk = KANTO_CHUNK_PX / KANTO_TILE_SIZE;

    for (let ty = 0; ty < tilesPerChunk; ty++) {
      const gy = startTileY + ty;
      if (gy >= KANTO_GRID_H) break;
      const row = world.grid[gy];
      if (!row) continue;

      for (let tx = 0; tx < tilesPerChunk; tx++) {
        const gx = startTileX + tx;
        if (gx >= KANTO_GRID_W) break;

        const drawPx = tx * KANTO_TILE_SIZE;
        const drawPy = ty * KANTO_TILE_SIZE;

        autotiler.drawTile(ctx, world.grid, gx, gy, drawPx, drawPy, world.elevation);
      }
    }

    // Layer 2: Nature & Cliffs
    world.nature.forEach((n) => {
      const w = n.w ?? CHUNK_BAKE_CONFIG.defaultNatureSize;
      const h = n.h ?? CHUNK_BAKE_CONFIG.defaultNatureSize;
      if (inBounds(n.x, n.y, w, h)) {
        prefabRenderer.drawNature(ctx, n.style, n.x - cL, n.y - cT);
      }
    });

    // Layer 3: Bridges
    world.bridges.forEach((b) => {
      const w = b.w ?? CHUNK_BAKE_CONFIG.defaultBridgeWidth;
      const h = b.h ?? CHUNK_BAKE_CONFIG.defaultBridgeHeight;
      if (inBounds(b.x, b.y, w, h)) {
        prefabRenderer.drawBridge(ctx, b.style, b.x - cL, b.y - cT);
      }
    });

    // Layer 4: Buildings, Trees, and Props (Y-Sorted for Realistic Depth)
    const renderables: { kind: 'bldg' | 'tree' | 'prop'; ySort: number; obj: PlacedStructure }[] = [
      ...world.buildings.map((b) => ({ kind: 'bldg' as const, ySort: b.y + (b.h ?? CHUNK_BAKE_CONFIG.buildingYSortOffset), obj: b })),
      ...world.trees.map((t) => ({ kind: 'tree' as const, ySort: t.y + CHUNK_BAKE_CONFIG.treeYSortOffset, obj: t })),
      ...world.props.map((p) => ({ kind: 'prop' as const, ySort: p.y + (p.h ?? CHUNK_BAKE_CONFIG.propYSortOffset), obj: p }))
    ].sort((a, b) => a.ySort - b.ySort);

    renderables.forEach((r) => {
      if (r.kind === 'bldg') {
        if (inBounds(r.obj.x, r.obj.y, r.obj.w ?? CHUNK_BAKE_CONFIG.buildingBoundsWidth, r.obj.h ?? CHUNK_BAKE_CONFIG.buildingBoundsHeight)) {
          prefabRenderer.drawBuilding(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      } else if (r.kind === 'tree') {
        if (inBounds(r.obj.x, r.obj.y - CHUNK_BAKE_CONFIG.treeBoundsOffsetY, CHUNK_BAKE_CONFIG.treeBoundsWidth, CHUNK_BAKE_CONFIG.treeBoundsHeight)) {
          prefabRenderer.drawTree(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      } else {
        if (inBounds(r.obj.x, r.obj.y, r.obj.w ?? CHUNK_BAKE_CONFIG.propBoundsDefault, r.obj.h ?? CHUNK_BAKE_CONFIG.propBoundsDefault)) {
          prefabRenderer.drawProp(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      }
    });

    this.baked = true;
  }
}

export class ChunkManager {
  readonly chunks: Chunk[] = [];

  constructor() {
    for (let cy = 0; cy < KANTO_CHUNKS_Y; cy++) {
      for (let cx = 0; cx < KANTO_CHUNKS_X; cx++) {
        this.chunks.push(new Chunk(cx, cy));
      }
    }
  }

  bakeAll(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource
  ): void {
    this.chunks.forEach((c) => c.bake(autotiler, prefabRenderer, world));
  }

  bakeArea(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource,
    tileX: number,
    tileY: number,
    size: number
  ): void {
    const minWx = Math.max(0, (tileX - 1) * KANTO_TILE_SIZE);
    const maxWx = Math.min(KANTO_GRID_W * KANTO_TILE_SIZE, (tileX + size + 1) * KANTO_TILE_SIZE);
    const minWy = Math.max(0, (tileY - 1) * KANTO_TILE_SIZE);
    const maxWy = Math.min(KANTO_GRID_H * KANTO_TILE_SIZE, (tileY + size + 1) * KANTO_TILE_SIZE);

    const minCx = Math.floor(minWx / KANTO_CHUNK_PX);
    const maxCx = Math.floor(maxWx / KANTO_CHUNK_PX);
    const minCy = Math.floor(minWy / KANTO_CHUNK_PX);
    const maxCy = Math.floor(maxWy / KANTO_CHUNK_PX);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const chunk = this.chunks.find((c) => c.cx === cx && c.cy === cy);
        if (chunk) {
          chunk.bake(autotiler, prefabRenderer, world);
        }
      }
    }
  }

  renderTo(
    ctx: CanvasRenderingContext2D,
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
  ): void {
    for (const c of this.chunks) {
      if (
        c.wx + KANTO_CHUNK_PX < viewX ||
        c.wx > viewX + viewW ||
        c.wy + KANTO_CHUNK_PX < viewY ||
        c.wy > viewY + viewH
      ) {
        continue;
      }
      if (c.canvas && c.baked) {
        ctx.drawImage(c.canvas, c.wx, c.wy);
      }
    }
  }
}
