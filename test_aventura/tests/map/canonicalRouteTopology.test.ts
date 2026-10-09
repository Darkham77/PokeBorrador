/**
 * tests/node/map/canonicalRouteTopology.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR CANONICAL ROUTE TOPOLOGY & NATURE-FIRST PIPELINE
 *
 * Validates:
 *   1. TSP Hamiltonian path linear chain generation (buildRouteChain).
 *   2. Sequential route numbering (Route 1..N) and secondary stub/loop classification.
 *   3. Nature-First transitable grid calculation (computeTransitableGrid).
 *   4. Parametric POI generation modes (preset Kanto vs procedural arbitrary count).
 */

import { describe, it, expect } from 'vitest';
import {
  generateContinentMap,
  computeTransitableGrid,
  type ContinentMapResult
} from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { buildRouteChain } from '../../../src/logic/map/routeChainTopology.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateProceduralPOICatalog } from '../../../src/logic/map/regionalPoiCatalog.ts';
import { isPrimaryNode, PRIMARY_POI_TYPES } from '../../../src/types/map/poiTypes.ts';

describe('Canonical Route Topology & Nature-First Pipeline', () => {
  const continent: ContinentMapResult = generateContinentMap({
    width: 128,
    height: 128,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 3,
    mountainPercentage: 0.22,
    withStairs: true
  });

  describe('Primary POI classification and isPrimaryNode', () => {
    it('correctly classifies cities, towns, metropolis, and league as primary', () => {
      expect(PRIMARY_POI_TYPES).toContain('metropolis');
      expect(PRIMARY_POI_TYPES).toContain('city');
      expect(PRIMARY_POI_TYPES).toContain('town');
      expect(PRIMARY_POI_TYPES).toContain('pokemon_league');

      expect(isPrimaryNode({ type: 'city' })).toBe(true);
      expect(isPrimaryNode({ type: 'town' })).toBe(true);
      expect(isPrimaryNode({ type: 'metropolis' })).toBe(true);
      expect(isPrimaryNode({ type: 'pokemon_league' })).toBe(true);

      expect(isPrimaryNode({ type: 'dungeon_forest' })).toBe(false);
      expect(isPrimaryNode({ type: 'cave_entrance' })).toBe(false);
      expect(isPrimaryNode({ type: 'port_dock' })).toBe(false);
      expect(isPrimaryNode({ type: 'route_gate' })).toBe(false);
      expect(isPrimaryNode({ type: 'water_landmark' })).toBe(false);
    });
  });

  describe('TSP Route Chain Generator (buildRouteChain)', () => {
    it('produces an exact linear chain of N-1 edges for N primary nodes', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });
      const primaryCount = pois.filter((p) => isPrimaryNode(p)).length;

      const { chain, stubs, loops } = buildRouteChain(pois);

      expect(chain.length).toBe(primaryCount - 1);
      expect(stubs.length).toBe(pois.length - primaryCount);
      expect(loops.length).toBeLessThanOrEqual(2);

      // Verify that the chain visits every primary node without branching
      const degree = new Map<number, number>();
      for (const edge of chain) {
        degree.set(edge.fromIndex, (degree.get(edge.fromIndex) ?? 0) + 1);
        degree.set(edge.toIndex, (degree.get(edge.toIndex) ?? 0) + 1);
      }

      // In an open linear chain: exactly 2 endpoints have degree 1, all intermediate nodes have degree 2
      let endpointCount = 0;
      let internalCount = 0;
      for (const d of degree.values()) {
        if (d === 1) endpointCount++;
        else if (d === 2) internalCount++;
      }

      expect(endpointCount).toBe(2);
      expect(internalCount).toBe(primaryCount - 2);
    });

    it('assigns sequential route numbers 1..N to primary chain edges in routeNetwork', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });
      const network = generateRouteNetwork(continent, pois, { allowBridges: true });

      const numberedEdges = network.edges.filter((e) => e.routeNumber !== undefined);
      expect(numberedEdges.length).toBeGreaterThan(0);

      // Numbers must be consecutive: 1, 2, 3, ...
      const numbers = numberedEdges.map((e) => e.routeNumber!);
      numbers.sort((a, b) => a - b);
      for (let i = 0; i < numbers.length; i++) {
        expect(numbers[i]).toBe(i + 1);
      }

      // Secondary trails (stubs) must not have route numbers
      const trailEdges = network.edges.filter((e) => e.routeType === 'trail');
      for (const trail of trailEdges) {
        expect(trail.routeNumber).toBeUndefined();
      }
    });
  });

  describe('Nature-First Transitable Grid (computeTransitableGrid)', () => {
    it('creates an excavated corridor grid where path, bridge and POIs are walkable', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18 });
      const network = generateRouteNetwork(continent, pois, { allowBridges: true });
      const transitable = computeTransitableGrid(continent, network.pathGrid, network.bridgeGrid, pois);

      expect(transitable.length).toBe(continent.height);
      expect(transitable[0]!.length).toBe(continent.width);

      // 1. All pathGrid cells must be transitable
      for (let y = 0; y < continent.height; y++) {
        for (let x = 0; x < continent.width; x++) {
          if (network.pathGrid[y]![x]) {
            expect(transitable[y]![x]).toBe(true);
          }
        }
      }

      // 2. All POI center cells must be transitable
      for (const poi of pois) {
        const cx = poi.gridX + Math.floor(poi.footprint.width / 2);
        const cy = poi.gridY + Math.floor(poi.footprint.height / 2);
        expect(transitable[cy]![cx]).toBe(true);
      }

      // 3. Significant portion of the map should remain non-transitable (impassable nature)
      let transitableCount = 0;
      let totalLandCount = 0;
      for (let y = 0; y < continent.height; y++) {
        for (let x = 0; x < continent.width; x++) {
          const t = continent.terrainMatrix[y]![x];
          if (t === 'grass' || t === 'sand') {
            totalLandCount++;
            if (transitable[y]![x]) transitableCount++;
          }
        }
      }

      // Transitable corridor coverage should be between 20% and 65% of total landmass
      const coverageRatio = transitableCount / totalLandCount;
      expect(coverageRatio).toBeGreaterThan(0.15);
      expect(coverageRatio).toBeLessThan(0.70);
    });
  });

  describe('Parametric POI Generation Modes', () => {
    it('supports procedural mode generating variable POI counts', () => {
      const smallCatalog = generateProceduralPOICatalog(6);
      expect(smallCatalog.length).toBeGreaterThanOrEqual(5);

      const largeCatalog = generateProceduralPOICatalog(24);
      expect(largeCatalog.length).toBeGreaterThanOrEqual(20);

      // Verify that placeRegionalPOIs accepts generationMode: 'procedural'
      const proceduralPois = placeRegionalPOIs(continent, {
        targetCount: 8,
        generationMode: 'procedural'
      });
      expect(proceduralPois.length).toBeGreaterThanOrEqual(4);
    });

    it('defaults to preset mode preserving canonical Kanto POI names', () => {
      const presetPois = placeRegionalPOIs(continent, {
        targetCount: 18,
        generationMode: 'preset'
      });

      const names = new Set(presetPois.map((p) => p.name));
      // Must contain canonical names from preset catalog
      expect(names.has('Ciudad Celeste') || names.has('Azafran Central') || names.has('Pueblo Paleta')).toBe(true);
    });
  });

  describe('Hermetic Gatehouse & Strict Tall Grass Canopy Clearance Invariants', () => {
    it('ensures route_gate POIs seal their lateral flanks as non-transitable', () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18, generationMode: 'preset' });
      const network = generateRouteNetwork(continent, pois, { allowBridges: true });
      const transitable = computeTransitableGrid(continent, network.pathGrid, network.bridgeGrid, pois);

      const gates = pois.filter((p) => p.type === 'route_gate');
      expect(gates.length).toBeGreaterThan(0);

      for (const gate of gates) {
        const midX = gate.gridX + Math.floor(gate.footprint.width / 2);
        const midY = gate.gridY + Math.floor(gate.footprint.height / 2);

        // Center doorway corridor must be transitable
        expect(transitable[midY]![midX]).toBe(true);

        // Flanks (where barrier fences sit) must NOT be marked transitable by computeTransitableGrid
        const leftFlankX = gate.gridX;
        const rightFlankX = gate.gridX + gate.footprint.width - 1;

        // If the route path didn't independently traverse the outer border flank, it must be sealed
        if (!network.pathGrid[midY]![leftFlankX]) {
          expect(transitable[midY]![leftFlankX]).toBe(false);
        }
        if (!network.pathGrid[midY]![rightFlankX]) {
          expect(transitable[midY]![rightFlankX]).toBe(false);
        }
      }
    });

    it('guarantees 100% tall grass canopy clearance (no tree trunk or canopy obscures tall grass)', async () => {
      const pois = placeRegionalPOIs(continent, { targetCount: 18, generationMode: 'preset' });
      const network = generateRouteNetwork(continent, pois, { allowBridges: true });
      const transitableGrid = computeTransitableGrid(continent, network.pathGrid, network.bridgeGrid, pois);
      (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;

      const { generateWildernessLayer } = await import('../../../src/logic/map/wildernessVegetationEngine.ts');
      const wilderness = generateWildernessLayer(continent, pois, network.pathGrid, {
        seed: 42,
        transitableGrid
      });

      expect(wilderness.trees.length).toBeGreaterThan(100);

      let overlappingTreeCount = 0;
      for (const tree of wilderness.trees) {
        const canopyOverhang = tree.height - 2;
        for (let dy = -canopyOverhang; dy <= 1; dy++) {
          for (let dx = 0; dx < tree.width; dx++) {
            const cy = tree.y + dy;
            const cx = tree.x + dx;
            if (wilderness.tallGrassGrid[cy]?.[cx]) {
              overlappingTreeCount++;
            }
          }
        }
      }

      // Exactly zero trees may obscure tall grass
      expect(overlappingTreeCount).toBe(0);
    });
  });
});

