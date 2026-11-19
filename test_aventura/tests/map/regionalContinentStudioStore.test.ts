/**
 * tests/node/map/regionalContinentStudioStore.test.ts
 *
 * TIER 1 TESTS FOR REGIONAL CONTINENT STUDIO PINIA STORE
 *
 * Validates:
 *   1. Unified coordinate space: widthPx = W * 32, heightPx = H * 32.
 *   2. View mode switching (tiles_only, hybrid, pokégear).
 *   3. 60 FPS transient visual drag updates vs. pointerup incident rerouting.
 *   4. Concurrency control: incremental jobId and generation state.
 */

import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';

import type { ContinentMapResult } from '../../logic/map/continentGenerator.ts';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

function isCleanGrassPatch(
  continent: ContinentMapResult,
  bridgeGrid: readonly (readonly boolean[])[],
  pois: readonly POINode[],
  cx: number,
  cy: number,
  margin: number
): boolean {
  for (let y = cy - margin; y <= cy + margin; y++) {
    for (let x = cx - margin; x <= cx + margin; x++) {
      if (x < 1 || y < 1 || x >= continent.width - 1 || y >= continent.height - 1) {
        return false;
      }
      if (continent.terrainMatrix[y]?.[x] !== 'grass') return false;
      if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
      if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
      if (bridgeGrid[y]?.[x]) return false;
    }
  }
  for (const poi of pois) {
    const px1 = poi.gridX - 2;
    const py1 = poi.gridY - 2;
    const px2 = poi.gridX + poi.footprint.width + 2;
    const py2 = poi.gridY + poi.footprint.height + 2;
    if (cx + margin >= px1 && cx - margin <= px2 && cy + margin >= py1 && cy - margin <= py2) {
      return false;
    }
  }
  return true;
}

function findCleanGrassCenter(
  continent: ContinentMapResult,
  bridgeGrid: readonly (readonly boolean[])[],
  pois: readonly POINode[],
  margin = 3,
  minChebyshevDistFrom?: { readonly x: number; readonly y: number }
): { readonly x: number; readonly y: number } {
  for (let m = margin; m >= 1; m--) {
    for (let y = m + 1; y < continent.height - m - 1; y++) {
      for (let x = m + 1; x < continent.width - m - 1; x++) {
        if (minChebyshevDistFrom) {
          const dist = Math.max(
            Math.abs(x - minChebyshevDistFrom.x),
            Math.abs(y - minChebyshevDistFrom.y)
          );
          if (dist < m * 3) continue;
        }
        if (isCleanGrassPatch(continent, bridgeGrid, pois, x, y, m)) {
          return { x, y };
        }
      }
    }
  }
  throw new Error('Could not find clean interior grass patch in test continent');
}

describe('useRegionalContinentStudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default parameters, hybrid display mode, and computed pixel dimensions', () => {
    const store = useRegionalContinentStudioStore();

    expect(store.mapDimension).toBe(400);
    expect(store.displayMode).toBe('hybrid');
    expect(store.seed).toBe(42);
    expect(store.oceanWaterPercentage).toBe(0.35);
    expect(store.mountainPercentage).toBe(0.22);

    // Directiva 1: viewBox dimensions in pixels
    expect(store.widthPx).toBe(400 * 32);
    expect(store.heightPx).toBe(400 * 32);
  });

  it('switches display modes cleanly', () => {
    const store = useRegionalContinentStudioStore();

    store.setDisplayMode('tiles_only');
    expect(store.displayMode).toBe('tiles_only');

    store.setDisplayMode('pokégear');
    expect(store.displayMode).toBe('pokégear');

    store.setDisplayMode('hybrid');
    expect(store.displayMode).toBe('hybrid');
  });

  it('manages POI and route selection cleanly', () => {
    const store = useRegionalContinentStudioStore();

    store.selectPOI('celadon_capital');
    expect(store.selectedPOIId).toBe('celadon_capital');

    store.setHoveredPOI('paleta_starting_town');
    expect(store.hoveredPOIId).toBe('paleta_starting_town');

    store.selectRoute('route_1');
    expect(store.selectedRouteId).toBe('route_1');

    store.selectPOI(null);
    expect(store.selectedPOIId).toBeNull();
  });

  it('executes generation and populates domain state with zero-copy buffer', () => {
    const store = useRegionalContinentStudioStore();
    store.mapDimension = 64; // Fast generation for unit test

    store.executeGenerationNow();

    expect(store.continentMap).toBeDefined();
    expect(store.pois.length).toBeGreaterThan(0);
    expect(store.routes.length).toBeGreaterThan(0);
    expect(store.rawPreviewBuffer).toBeDefined();
    expect(store.rawPreviewBuffer!.byteLength).toBe(64 * 64 * 4);
    expect(store.isGenerating).toBe(false);
  });

  it('updates visual position at 60 FPS during drag without mutating grid data (Directive 3)', () => {
    const store = useRegionalContinentStudioStore();
    store.mapDimension = 64;
    store.executeGenerationNow();

    const firstPoi = store.pois[0]!;
    const originalGridX = firstPoi.gridX;
    const originalGridY = firstPoi.gridY;

    // Simulate pointermove dragging: visual override only
    store.updateNodeDragVisualPosition(firstPoi.id, 850, 920);

    expect(store.dragVisualPositions[firstPoi.id]).toEqual({ x: 850, y: 920 });
    // Actual node grid coordinates must remain untouched until pointerup!
    expect(firstPoi.gridX).toBe(originalGridX);
    expect(firstPoi.gridY).toBe(originalGridY);

    // Simulate pointerup: finalize drag and dispatch reroute
    store.handleNodeDragEnd(firstPoi.id, originalGridX + 2, originalGridY + 2);

    // Visual override must be cleared
    expect(store.dragVisualPositions[firstPoi.id]).toBeUndefined();
    // Grid coordinate must be updated
    const updated = store.pois.find((p) => p.id === firstPoi.id);
    expect(updated!.gridX).toBe(originalGridX + 2);
    expect(updated!.gridY).toBe(originalGridY + 2);
  });

  describe('Block A Store Upgrades: Delta Undo, No-Op Suppression, Defect Inspector & Stroke Cancel', () => {
    it('suppresses undo stack growth when a healing stroke produces zero mutations', () => {
      const store = useRegionalContinentStudioStore();
      store.mapDimension = 64;
      store.executeGenerationNow();

      // First heal entire map so (2, 2) neighborhood has 0 defects
      store.healEntireMapDefects();
      const undoBefore = store.undoStack.length;

      store.beginHealingStroke();
      const mut = store.healTileAt(2, 2);
      store.endHealingStroke();

      expect(mut?.summary.changedCellCount).toBe(0);
      expect(store.undoStack).toHaveLength(undoBefore);
    });

    it('records compact DirtyRectHistoryDelta and restores wilderness + bridgeGrid across undo/redo without bumping fullRenderVersion', () => {
      const store = useRegionalContinentStudioStore();
      store.mapDimension = 64;
      store.executeGenerationNow();

      const continent = store.continentMap!;
      const spot = findCleanGrassCenter(continent, store.bridgeGrid, store.pois, 3);
      const nextTerrain = continent.terrainMatrix.map((r) => [...r]);
      // Create an isolated 1-tile water sliver at clean interior coordinate
      nextTerrain[spot.y]![spot.x] = 'water';
      const nextBridge = store.bridgeGrid.map((r) => [...r]);
      nextBridge[spot.y]![spot.x + 1] = true;

      store.continentMap = { ...continent, terrainMatrix: nextTerrain };
      store.bridgeGrid = nextBridge;
      if (store.wilderness) {
        const nextTallGrass = store.wilderness.tallGrassGrid.map((r) => [...r]);
        nextTallGrass[spot.y]![spot.x - 1] = true;
        store.wilderness = {
          ...store.wilderness,
          tallGrassGrid: nextTallGrass,
          trees: [
            ...store.wilderness.trees,
            { x: spot.x - 2, y: spot.y - 2, width: 2, height: 3, prefabFile: 'tree_oak.png' }
          ],
          props: [
            ...store.wilderness.props,
            { type: 'flower', x: spot.x, y: spot.y + 2, prefabFile: 'poke_flowers_red.png' }
          ]
        };
      }

      const fullVersionBefore = store.fullRenderVersion;
      store.setBrushSize(1);
      store.setHealingBrushDomain('water');
      store.beginHealingStroke();
      store.healTileAt(spot.x, spot.y);
      store.endHealingStroke();

      expect(store.continentMap.terrainMatrix[spot.y]![spot.x]).toBe('grass');
      expect(store.undoStack).toHaveLength(1);
      expect(store.fullRenderVersion).toBe(fullVersionBefore);
      expect(store.lastDirtyRectUpdate).not.toBeNull();

      store.undo();
      expect(store.continentMap.terrainMatrix[spot.y]![spot.x]).toBe('water');
      expect(store.bridgeGrid[spot.y]![spot.x + 1]).toBe(true);
      expect(store.wilderness?.tallGrassGrid[spot.y]?.[spot.x - 1]).toBe(true);
      expect(store.canRedo).toBe(true);
      expect(store.fullRenderVersion).toBe(fullVersionBefore);

      store.redo();
      expect(store.continentMap.terrainMatrix[spot.y]![spot.x]).toBe('grass');
      expect(store.canUndo).toBe(true);
    });

    it('retains defectRecords, filters by domain, and emits cameraFocusRequest on stepToDefect', () => {
      const store = useRegionalContinentStudioStore();
      store.mapDimension = 64;
      store.executeGenerationNow();

      const continent = store.continentMap!;
      const waterSpot = findCleanGrassCenter(continent, store.bridgeGrid, store.pois, 2);
      const mountainSpot = findCleanGrassCenter(
        continent,
        store.bridgeGrid,
        store.pois,
        2,
        waterSpot
      );
      const nextTerrain = continent.terrainMatrix.map((r) => [...r]);
      const nextHeight = continent.heightmap.map((r) => [...r]);
      nextTerrain[waterSpot.y]![waterSpot.x] = 'water';
      nextHeight[mountainSpot.y]![mountainSpot.x] = 1;
      store.continentMap = { ...continent, terrainMatrix: nextTerrain, heightmap: nextHeight };
      store.refreshDetectedDefects();

      expect(store.defectRecords.length).toBeGreaterThan(0);
      expect(store.defectCountsByDomain.water).toBeGreaterThan(0);
      expect(store.defectCountsByDomain.mountain).toBeGreaterThan(0);

      store.setDefectFilterDomain('water');
      expect(store.filteredDefectRecords.every((d) => d.domain === 'water')).toBe(true);

      store.stepToDefect(1);
      expect(store.activeDefectIndex).toBe(0);
      expect(store.cameraFocusRequest).not.toBeNull();
      expect(store.cameraFocusRequest!.gridX).toBe(store.filteredDefectRecords[0]!.x);
      expect(store.cameraFocusRequest!.gridY).toBe(store.filteredDefectRecords[0]!.y);
    });

    it('rolls back uncommitted mutations on cancelActiveBrushStroke without touching undo history', () => {
      const store = useRegionalContinentStudioStore();
      store.mapDimension = 64;
      store.executeGenerationNow();

      const continent = store.continentMap!;
      const spot = findCleanGrassCenter(continent, store.bridgeGrid, store.pois, 2);
      const nextTerrain = continent.terrainMatrix.map((r) => [...r]);
      nextTerrain[spot.y]![spot.x] = 'water';
      store.continentMap = { ...continent, terrainMatrix: nextTerrain };

      store.setBrushSize(1);
      store.setHealingBrushDomain('water');
      store.beginHealingStroke();
      store.healTileAt(spot.x, spot.y);
      expect(store.continentMap.terrainMatrix[spot.y]![spot.x]).toBe('grass');

      store.cancelActiveBrushStroke();
      expect(store.continentMap.terrainMatrix[spot.y]![spot.x]).toBe('water');
      expect(store.undoStack).toHaveLength(0);
    });

    it('heals all domains across the entire map on healEntireMapDefects even when healingBrushDomain is filtered to mountain', () => {
      const store = useRegionalContinentStudioStore();
      store.mapDimension = 64;
      store.executeGenerationNow();
      expect(store.detectedDefectCount).toBe(0);

      const continent = store.continentMap!;
      const waterSpot = findCleanGrassCenter(continent, store.bridgeGrid, store.pois, 2);
      const mountainSpot = findCleanGrassCenter(
        continent,
        store.bridgeGrid,
        store.pois,
        2,
        waterSpot
      );
      const nextTerrain = continent.terrainMatrix.map((r) => [...r]);
      const nextHeight = continent.heightmap.map((r) => [...r]);
      nextTerrain[waterSpot.y]![waterSpot.x] = 'water';
      nextHeight[mountainSpot.y]![mountainSpot.x] = 1;
      store.continentMap = { ...continent, terrainMatrix: nextTerrain, heightmap: nextHeight };
      store.refreshDetectedDefects();

      store.setHealingBrushDomain('mountain');
      expect(store.detectedDefectCount).toBeGreaterThan(0);

      store.healEntireMapDefects();
      expect(store.detectedDefectCount).toBe(0);
      expect(store.defectCountsByDomain.water).toBe(0);
      expect(store.defectCountsByDomain.mountain).toBe(0);
    });
  });
});
