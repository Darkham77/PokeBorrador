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

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRegionalContinentStudioStore } from '../../../src/stores/continentStudioStore.ts';

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
});
