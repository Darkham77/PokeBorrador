/**
 * tests/node/map/canonicalProgressionAndUrbanTiers.test.ts
 *
 * TIER 1 SPECIFICATION TEST FOR CANONICAL POKEMON MAP PROGRESSION & URBAN TIERS
 *
 * Validates:
 *   1. Progression Skeleton: L_0 (Pueblo Inicial) to L_9 (Liga Pokemon).
 *   2. Curvilinear S/C Path: L_0 in SW, L_1..L_3 climbing West, L_4 North, L_5 Center, L_6..L_8 East/SE, L_9 Summit.
 *   3. Urban Tier Invariants:
 *      - Tier 0: 0 Gyms, 0 Marts, 1 Center/Clinic, 2..4 houses.
 *      - Tier 1: 1 Gym (in rear/depth), 1 Center & 1 Mart (near front/entrance), 4..6 houses.
 *      - Tier 2 (Metropolis): 1 unique Center, 1 Dept Store/Corp Tower, no duplicate side-by-side Centers/Marts.
 *      - Tier 3: Pokemon League at isolated climax.
 *   4. Transverse Mountain Ridges: Continent interior is not artificially flattened by centerSuppression.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { generateProceduralPOICatalog } from '../../../src/logic/map/regionalPoiCatalog.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe.skip('Canonical Progression and Urban Tiers', () => {
  it('catalog provides structured progression from L_0 to L_9 with explicit tiers', () => {
    const catalog = generateProceduralPOICatalog(27, { targetUrbanSettlements: 15 });
    
    // L_0 must be Starting Town (Tier 0, no gym)
    const l0 = catalog.find((p) => p.progressionIndex === 0 || p.id === 'town_1');
    expect(l0).toBeDefined();
    expect(l0!.type).toBe('town');
    expect(l0!.hasGym).toBe(false);
    expect(l0!.tier).toBe(0);

    // Exactly 1 Metropolis (Tier 2)
    const metropolises = catalog.filter((p) => p.type === 'metropolis' || p.tier === 2);
    expect(metropolises.length).toBe(1);
    expect(metropolises[0]!.tier).toBe(2);

    // Exactly 8 Gyms across Tier 1 cities and Metropolis
    const gymSettlements = catalog.filter((p) => p.hasGym && (p.type === 'city' || p.type === 'metropolis'));
    expect(gymSettlements.length).toBe(8);

    // Final Climax is Pokemon League (Tier 3)
    const league = catalog.find((p) => p.type === 'pokemon_league' || p.tier === 3);
    expect(league).toBeDefined();
    expect(league!.tier).toBe(3);
  });

  it('places POIs along a curvilinear S/C progression curve (L_0 in SW, L_9 in North Summit)', () => {
    const continent = generateContinentMap({
      width: 256,
      height: 256,
      seed: 777,
      oceanWaterPercentage: 0.38,
      mountainPercentage: 0.20
    });

    const pois = placeRegionalPOIs(continent, {
      seed: 777,
      targetCount: 27,
      generationMode: 'procedural',
      targetUrbanSettlements: 15
    });

    const l0 = pois.find((p) => p.progressionIndex === 0 || p.id.includes('town_1') || p.id.includes('origen'));
    expect(l0).toBeDefined();
    // Starting Town must be in the Southwest quadrant
    expect(l0!.gridX).toBeLessThan(continent.width * 0.45);
    expect(l0!.gridY).toBeGreaterThan(continent.height * 0.55);

    const league = pois.find((p) => p.type === 'pokemon_league');
    expect(league).toBeDefined();
    // League must be on northern elevated massif
    expect(league!.gridY).toBeLessThan(continent.height * 0.40);
    expect(league!.elevation).toBeGreaterThanOrEqual(1);
  });

  it('generates Tier 0 rural town with 0 Gyms, 0 Marts, 1 Center, and 2..4 houses', () => {
    const node: POINode = {
      id: 'town_procedural_tier0',
      name: 'Pueblo Silvestre',
      type: 'town',
      tier: 0,
      footprint: { width: 14, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 180,
      elevation: 0,
      hasGym: false
    };

    const layout = generateSettlementLayout(node);
    const bTypes = layout.buildings.map((b) => b.type);
    expect(bTypes.includes('gym')).toBe(false);
    expect(bTypes.includes('pokemart')).toBe(false);
    expect(bTypes.includes('pokecenter')).toBe(true);

    const houseCount = layout.buildings.filter((b) => b.type === 'house' || b.type === 'lab').length;
    expect(houseCount).toBeGreaterThanOrEqual(2);
    expect(houseCount).toBeLessThanOrEqual(4);
  });

  it('generates Tier 1 Gym City with Center/Mart near front and Gym in prominent rear with 4..6 houses', () => {
    const node: POINode = {
      id: 'city_procedural_tier1',
      name: 'Ciudad Cantera',
      type: 'city',
      tier: 1,
      footprint: { width: 20, height: 18 },
      terrainPreference: 'flat_grass',
      gridX: 30,
      gridY: 80,
      elevation: 0,
      hasGym: true,
      urbanTheme: 'geology_quarry'
    };

    const layout = generateSettlementLayout(node);
    const bTypes = layout.buildings.map((b) => b.type);
    expect(bTypes.includes('gym')).toBe(true);
    expect(bTypes.includes('pokecenter')).toBe(true);
    expect(bTypes.includes('pokemart')).toBe(true);

    const houseCount = layout.buildings.filter((b) => b.type === 'house').length;
    expect(houseCount).toBeGreaterThanOrEqual(4);
    expect(houseCount).toBeLessThanOrEqual(6);

    const gym = layout.buildings.find((b) => b.type === 'gym')!;
    const center = layout.buildings.find((b) => b.type === 'pokecenter')!;
    const mart = layout.buildings.find((b) => b.type === 'pokemart')!;

    // Gym should be in the back (upper half of city)
    expect(gym.y).toBeLessThan(node.gridY + node.footprint.height / 2);
    // Center and Mart should be near front entrance (lower half of city)
    expect(center.y).toBeGreaterThanOrEqual(node.gridY + node.footprint.height / 2 - 2);
    expect(mart.y).toBeGreaterThanOrEqual(node.gridY + node.footprint.height / 2 - 2);
  });

  it('generates Tier 2 Metropolis without duplicate Center/Mart and with multiple residential blocks', () => {
    const node: POINode = {
      id: 'metropolis_procedural_tier2',
      name: 'Gran Metrópolis Central',
      type: 'metropolis',
      tier: 2,
      footprint: { width: 28, height: 24 },
      terrainPreference: 'flat_grass',
      gridX: 110,
      gridY: 100,
      elevation: 0,
      hasGym: true,
      urbanTheme: 'condo_district'
    };

    const layout = generateSettlementLayout(node);
    const centers = layout.buildings.filter((b) => b.type === 'pokecenter');
    expect(centers.length).toBe(1);

    // No duplicate Mart side-by-side with Center
    const marts = layout.buildings.filter((b) => b.type === 'pokemart');
    expect(marts.length).toBeLessThanOrEqual(1);

    const residentialCount = layout.buildings.filter((b) => b.type === 'house' || b.type === 'condo').length;
    expect(residentialCount).toBeGreaterThanOrEqual(4);
  });

  it('continent mountains feature transverse ridges without artificial hollow center suppression', () => {
    const continent = generateContinentMap({
      width: 256,
      height: 256,
      seed: 777,
      oceanWaterPercentage: 0.38,
      mountainPercentage: 0.20
    });

    // Check that mountains exist in the central latitudinal band (y between 80 and 176)
    let centralMountainCount = 0;
    for (let y = 80; y <= 176; y++) {
      for (let x = 80; x <= 176; x++) {
        if (continent.heightmap[y]![x]! > 0) {
          centralMountainCount++;
        }
      }
    }
    // With transverse ridges, central area must contain organic mountain ridges (> 150 tiles)
    expect(centralMountainCount).toBeGreaterThan(150);
  });
});
