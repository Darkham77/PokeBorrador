// Kanto Tile & Prefab Rendering Engine - LPC Autotiling & Semantic Prefabs

import {
  BOARDWALK_RENDER_CONFIG,
  CHUNK_BAKE_CONFIG
} from '../../config/kantoTileEngineConfig.ts';
import type {
  CatalogPart,
  CatalogPrefab,
  CatalogAutotileLayout,
  SemanticTileCatalog,
  PlacedStructure,
  IRegionalWorldRendererSource
} from '../../types/map/kantoTileEngineTypes.ts';

export type {
  CatalogPart,
  CatalogPrefab,
  CatalogAutotileLayout,
  SemanticTileCatalog,
  PlacedStructure,
  IRegionalWorldRendererSource
};

import { type MountainPalette } from './mountainAutotileEngine.ts';
export type { MountainPalette };
import { DynamicCatalogLoader } from './kantoCatalogLoader.ts';
export { DynamicCatalogLoader };

export type { MountainTileResolution, RmxpSubtiles } from './universalAutotiler.ts';
export { resolveRmxpSubtiles, UniversalAutotiler } from './universalAutotiler.ts';

export class SemanticPrefabRenderer {
  private readonly loader: DynamicCatalogLoader;

  constructor(loader: DynamicCatalogLoader) {
    this.loader = loader;
  }

  drawPrefab(ctx: CanvasRenderingContext2D, prefab: CatalogPrefab, x: number, y: number): void {
    if (!prefab?.parts) return;
    const parts = [...prefab.parts].sort((a, b) => ((a.layerIndex ?? a.zIndex) || 0) - ((b.layerIndex ?? b.zIndex) || 0));
    for (const part of parts) {
      const img = this.loader.getImage(part.sheet);
      if (!img) continue;
      const sx = part.sx;
      const sy = part.sy;
      let sw = part.sw;
      let sh = part.sh;
      let dw = part.sw;
      let dh = part.sh;
      if (sx === 0 && sy === 0 && (sw !== img.width || sh !== img.height)) {
        sw = img.width;
        sh = img.height;
        dw = img.width;
        dh = img.height;
      }
      ctx.drawImage(
        img,
        sx, sy, sw, sh,
        x + part.dx, y + part.dy, dw, dh
      );
    }
  }

  drawBuilding(ctx: CanvasRenderingContext2D, style: string, x: number, y: number): void {
    const directImg = this.loader.getImage(style)
      || this.loader.getImage(`${style}.png`)
      || this.loader.getImage(`poke_${style}.png`);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('buildings', style);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawBridge(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const directImg = this.loader.getImage(type);
    if (directImg) {
      ctx.drawImage(directImg, x, y, BOARDWALK_RENDER_CONFIG.bridgeSize, BOARDWALK_RENDER_CONFIG.bridgeSize);
      return;
    }
    const key = type === 'pier' ? 'harbor_pier' : type === 'arched' ? 'arched_bridge_h' : 'nugget_bridge';
    const prefab = this.loader.getPrefab('bridges', key);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
      return;
    }
    const fallbackImg = this.loader.getImage('poke_boardwalk_planks.png');
    if (fallbackImg) {
      ctx.drawImage(fallbackImg, x, y, BOARDWALK_RENDER_CONFIG.bridgeSize, BOARDWALK_RENDER_CONFIG.bridgeSize);
    } else {
      ctx.fillStyle = '#c49a52';
      ctx.fillRect(x, y, BOARDWALK_RENDER_CONFIG.bridgeSize, BOARDWALK_RENDER_CONFIG.bridgeSize);
      ctx.fillStyle = '#8f652b';
      for (const offsetY of BOARDWALK_RENDER_CONFIG.plankOffsetsY) {
        ctx.fillRect(x, y + offsetY, BOARDWALK_RENDER_CONFIG.plankWidth, BOARDWALK_RENDER_CONFIG.plankThickness);
      }
    }
  }

  drawNature(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const directImg = this.loader.getImage(type)
      || this.loader.getImage(`${type}.png`)
      || this.loader.getImage(`poke_${type}.png`)
      || (type.includes('ledge') ? this.loader.getImage('poke_ledge_mid.png') : undefined);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('nature', type) || this.loader.getPrefab('cliffs', type);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawTree(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const cleanType = type.replace(/^poke_/, '').replace(/\.png$/i, '');
    const isPine = type === 'pine' || cleanType === 'tree_pine_small';
    const treeImg = this.loader.getImage(type)
      || this.loader.getImage(`${cleanType}.png`)
      || this.loader.getImage(`poke_${cleanType}.png`)
      || (isPine
        ? this.loader.getImage('poke_tree_pine_small.png')
        : (this.loader.getImage('poke_tree_oak_clean.png')
          || this.loader.getImage('poke_tree_poke.png')));
    if (treeImg) {
      const yOffset = treeImg.height > CHUNK_BAKE_CONFIG.treeTallThreshold ? treeImg.height - CHUNK_BAKE_CONFIG.treeTallThreshold : 0;
      ctx.drawImage(treeImg, x, y - yOffset, treeImg.width, treeImg.height);
      return;
    }
    const key = isPine ? 'tree_pine_small' : 'tree_poke';
    const prefab = this.loader.getPrefab('trees', key);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawProp(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const cleanType = type.replace(/^poke_/, '').replace(/\.png$/i, '');
    const directImg = this.loader.getImage(type)
      || this.loader.getImage(`${cleanType}.png`)
      || this.loader.getImage(`poke_${cleanType}.png`)
      || (type === 'lamp' ? this.loader.getImage('poke_street_lamp.png') : undefined)
      || (type === 'flower' ? this.loader.getImage('poke_flowers_red.png') : undefined)
      || (type === 'mailbox' ? this.loader.getImage('poke_mailbox.png') : undefined)
      || (type === 'sign' || type === 'signpost' ? this.loader.getImage('poke_signpost.png') : undefined);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('props', type) || this.loader.getPrefab('nature', type);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }
}


