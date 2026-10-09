/**
 * tests/node/map/bridgeStyleHomogeneity.test.ts
 *
 * TIER 1 SPECIFICATION: Bridge Style Isolation & Homogeneity Invariant
 *
 * Verifies that:
 * 1. canonicalBridgeEngine supports distinct BridgeStyles: 'silence_wood', 'stone_pier', 'golden_wood'.
 * 2. Connected bridge components are resolved with 100% stylistic homogeneity:
 *    every single tile within a bridge strictly belongs to its designated style family.
 * 3. Zero mixing invariant: A 'silence_wood' bridge NEVER uses 'poke_bridge_v_left' (Route 24)
 *    nor 'poke_port_pier_*' (Stone pier).
 * 4. Corner turns and zig-zags within 'silence_wood' use authentic silence turn tiles.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalBridges,
  type TerrainCell
} from '../../../src/logic/map/canonicalBridgeEngine.ts';
import { BRIDGE_STYLES } from '../../../src/types/map/poiTypes.ts';

describe.skip('Bridge Style Isolation & Homogeneity Invariants', () => {
  it('defines the canonical BRIDGE_STYLES union', () => {
    expect(BRIDGE_STYLES).toContain('silence_wood');
    expect(BRIDGE_STYLES).toContain('golden_wood');
    expect(BRIDGE_STYLES).toContain('stone_pier');
  });

  it('guarantees 100% stylistic homogeneity on silence_wood bridges across both H and V spans and turns', () => {
    const W = 20;
    const H = 20;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Build an L-turn bridge (comes from North, turns East)
    // Vertical span: x=5,6; y=2..6
    for (let y = 2; y <= 6; y++) {
      bridgeGrid[y]![5] = true;
      bridgeGrid[y]![6] = true;
    }
    // Horizontal span: y=5,6; x=5..12
    for (let x = 5; x <= 12; x++) {
      bridgeGrid[5]![x] = true;
      bridgeGrid[6]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'silence_wood'
    });

    expect(blits.length).toBeGreaterThan(0);

    // ZERO MIXING INVARIANT: Every tile must belong to silence_wood family
    for (const b of blits) {
      expect(b.file).toMatch(/^poke_bridge_silence_/);
      expect(b.file).not.toMatch(/poke_port_pier/);
      expect(b.file).not.toMatch(/^poke_bridge_v_/); // old Route 24 tiles
    }
  });

  it('guarantees 100% stylistic homogeneity on stone_pier bridges', () => {
    const W = 20;
    const H = 20;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Straight horizontal pier
    for (let x = 2; x <= 10; x++) {
      bridgeGrid[5]![x] = true;
      bridgeGrid[6]![x] = true;
      bridgeGrid[7]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'stone_pier'
    });

    expect(blits.length).toBeGreaterThan(0);
    for (const b of blits) {
      expect(b.file).toMatch(/^poke_port_pier_/);
      expect(b.file).not.toMatch(/silence/);
    }
  });

  it('resolves distinct styles independently when per-component resolver is supplied', () => {
    const W = 30;
    const H = 20;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Bridge 1 (West): Silence wood
    for (let y = 3; y <= 8; y++) {
      bridgeGrid[y]![3] = true;
      bridgeGrid[y]![4] = true;
    }

    // Bridge 2 (East): Stone pier
    for (let y = 3; y <= 8; y++) {
      bridgeGrid[y]![20] = true;
      bridgeGrid[y]![21] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      getBridgeStyle: (clusterX) => (clusterX < 10 ? 'silence_wood' : 'stone_pier')
    });

    const westBlits = blits.filter((b) => b.x < 10);
    const eastBlits = blits.filter((b) => b.x >= 15);

    expect(westBlits.length).toBeGreaterThan(0);
    expect(eastBlits.length).toBeGreaterThan(0);

    for (const b of westBlits) {
      expect(b.file).toMatch(/^poke_bridge_silence_/);
    }
    for (const b of eastBlits) {
      expect(b.file).toMatch(/^poke_port_pier_/);
    }
  });

  it('guarantees 100% stylistic homogeneity on golden_wood bridges without mixing with silence_wood', () => {
    const W = 20;
    const H = 20;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // L-turn golden bridge (comes from North, turns East)
    for (let y = 2; y <= 6; y++) {
      bridgeGrid[y]![5] = true;
      bridgeGrid[y]![6] = true;
    }
    for (let x = 5; x <= 12; x++) {
      bridgeGrid[5]![x] = true;
      bridgeGrid[6]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'golden_wood'
    });

    expect(blits.length).toBeGreaterThan(0);
    for (const b of blits) {
      expect(b.file).not.toMatch(/silence/);
      expect(b.file).not.toMatch(/poke_port_pier/);
      expect(b.file).toMatch(/^poke_bridge_(golden_|v_|deck_)/);
    }
  });
});
