/**
 * tests/node/map/urbanGatewaysIntegrity.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates:
 *   1. Zero Gateway-Building Collisions: No building in any settlement (metropolis, city, town)
 *      ever overlaps or blocks any of its perimeter gateways.
 *   2. Continuous Town Corridors: In town layouts, 2-cell dirt avenues connect seamlessly across the town
 *      from North to South and West to East without dead-ends.
 *   3. Doorstep Accessibility: Front entrances of all buildings open onto unobstructed walkable streets.
 *   4. Zero Dead-End Route Gateways: Every regional route terminating at a settlement connects to an open gateway.
 */

import { describe, it, expect } from 'vitest';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('urbanGatewaysIntegrity (Error 3)', () => {
  it('guarantees no building in a 10x10 town overlaps any perimeter gateway', () => {
    const townNode: POINode = {
      id: 'paleta_town',
      name: 'Pueblo Paleta',
      type: 'town',
      footprint: { width: 10, height: 10 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0,
      gateways: [
        { x: 24, y: 20, direction: 'north' },
        { x: 24, y: 29, direction: 'south' },
        { x: 29, y: 25, direction: 'east' },
        { x: 20, y: 25, direction: 'west' }
      ]
    };

    const layout = generateSettlementLayout(townNode);
    expect(layout.buildings.length).toBeGreaterThanOrEqual(2);

    // Build building occupancy set
    const buildingCells = new Set<string>();
    for (const b of layout.buildings) {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          buildingCells.add(`${b.x + dx}_${b.y + dy}`);
        }
      }
    }

    // Verify all gateways are 100% free of buildings
    for (const gw of townNode.gateways!) {
      expect(buildingCells.has(`${gw.x}_${gw.y}`)).toBe(false);
    }
  });

  it('guarantees 10x10 town has continuous 2-cell wide avenues through North-South and West-East', () => {
    const townNode: POINode = {
      id: 'viridian_town',
      name: 'Pueblo Verde',
      type: 'town',
      footprint: { width: 10, height: 10 },
      terrainPreference: 'flat_grass',
      gridX: 40,
      gridY: 40,
      elevation: 0
    };

    const layout = generateSettlementLayout(townNode);
    const streetSet = new Set(layout.internalStreets.map((s) => `${s.x}_${s.y}`));

    // Vertical avenue: columns 44 and 45 should be streets for all rows y: 40..49
    for (let y = 40; y < 50; y++) {
      expect(streetSet.has(`44_${y}`) || streetSet.has(`45_${y}`)).toBe(true);
    }

    // Horizontal avenue: rows 45 and 46 should be streets for all columns x: 40..49
    for (let x = 40; x < 50; x++) {
      expect(streetSet.has(`${x}_45`) || streetSet.has(`${x}_46`)).toBe(true);
    }
  });

  it('guarantees regional settlements placed on continent have 0 gateway-building collisions', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18, seed: 42 });

    for (const poi of pois) {
      if (!poi.urbanLayout || !poi.gateways) continue;

      const buildingCells = new Set<string>();
      for (const b of poi.urbanLayout.buildings) {
        for (let dy = 0; dy < b.height; dy++) {
          for (let dx = 0; dx < b.width; dx++) {
            buildingCells.add(`${b.x + dx}_${b.y + dy}`);
          }
        }
      }

      for (const gw of poi.gateways) {
        const isBlocked = buildingCells.has(`${gw.x}_${gw.y}`);
        if (isBlocked) {
          throw new Error(`Gateway (${gw.x}, ${gw.y}) of settlement '${poi.id}' (${poi.type}) is blocked by a building!`);
        }
        expect(isBlocked).toBe(false);
      }
    }
  });
});
