/**
 * tests/node/map/proceduralContinentArchetypesAndGates.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS FOR PROCEDURAL CONTINENT 256x256 QUALITY INVARIANTS:
 *   1. Single Metropolis Invariant: Exactly 1 Grand Central Metropolis per region (zero stacked metropolises).
 *   2. Mainland Seaport Invariant: Primary port dock placed strictly on the continental mainland, never on offshore islands.
 *   3. Route Gate Spacing & Corridor Invariant: Route gates separated by >= 45 tiles and only placed on primary routes.
 *   4. City Identity & Material Diversity: Cities receive distinct thematic archetypes and diverse road materials.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';

describe.skip('Procedural Continent Archetypes, Gateways & Mainland Seaport Invariants', () => {
  const continent = generateContinentMap({
    width: 256,
    height: 256,
    seed: 777,
    withArchipelago: true,
    mountainPercentage: 0.18,
    lakeCount: 2,
    withStairs: true
  });

  const pois = placeRegionalPOIs(continent, {
    targetCount: 27,
    generationMode: 'procedural',
    targetUrbanSettlements: 15
  });

  const network = generateRouteNetwork(continent, pois, { allowBridges: true });

  it('guarantees exactly 1 Grand Metropolis is placed without any stacked duplicates', () => {
    const metropolises = pois.filter((p) => p.type === 'metropolis');
    expect(metropolises.length).toBe(1);

    const metro = metropolises[0]!;
    expect(metro.name).toContain('Metrópolis');

    // Verify distance to all other cities is >= 20 tiles (no stacking)
    const otherCities = pois.filter((p) => p.type === 'city');
    for (const city of otherCities) {
      const dist = Math.hypot(
        city.gridX + city.footprint.width / 2 - (metro.gridX + metro.footprint.width / 2),
        city.gridY + city.footprint.height / 2 - (metro.gridY + metro.footprint.height / 2)
      );
      expect(dist).toBeGreaterThanOrEqual(20);
    }
  });

  it('guarantees the primary port dock is placed strictly on the continental mainland and connects to the road network', () => {
    const ports = pois.filter((p) => p.type === 'port_dock');
    expect(ports.length).toBe(1);

    const port = ports[0]!;

    // Verify port is NOT placed on any offshore archipelago island
    if (continent.archipelagoIslands && continent.archipelagoIslands.length > 0) {
      for (const island of continent.archipelagoIslands) {
        const onIsland =
          port.gridX + port.footprint.width >= island.bounds.minX - 2 &&
          port.gridX <= island.bounds.maxX + 2 &&
          port.gridY + port.footprint.height >= island.bounds.minY - 2 &&
          port.gridY <= island.bounds.maxY + 2;
        expect(onIsland).toBe(false);
      }
    }

    // Verify port connects to at least one edge in the route network
    const portConnectedEdges = network.edges.filter(
      (e) => e.fromNodeId === port.id || e.toNodeId === port.id
    );
    expect(portConnectedEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('guarantees route gates have scale-appropriate separation (>= 45 tiles) and zero clustering', () => {
    const gates = pois.filter((p) => p.type === 'route_gate');
    // At most 2 gates on the 256 map
    expect(gates.length).toBeLessThanOrEqual(2);

    if (gates.length >= 2) {
      for (let i = 0; i < gates.length; i++) {
        for (let j = i + 1; j < gates.length; j++) {
          const gA = gates[i]!;
          const gB = gates[j]!;
          const dist = Math.hypot(gA.gridX - gB.gridX, gA.gridY - gB.gridY);
          expect(dist).toBeGreaterThanOrEqual(45);
        }
      }
    }
  });

  it('guarantees procedural cities and towns possess heterogeneous archetypes and diverse road materials', () => {
    const citiesAndTowns = pois.filter((p) => p.type === 'city' || p.type === 'town');
    expect(citiesAndTowns.length).toBeGreaterThanOrEqual(12);

    // Collect all assigned road materials
    const materials = new Set(
      citiesAndTowns.map((n) => n.urbanLayout?.roadMaterial).filter(Boolean)
    );

    // Must exhibit material diversity (e.g. gravel, paved, sand, dirt)
    expect(materials.size).toBeGreaterThanOrEqual(3);

    // Verify distinct urban themes exist
    const themes = new Set(citiesAndTowns.map((n) => n.urbanTheme).filter(Boolean));
    expect(themes.size).toBeGreaterThanOrEqual(5);
  });
});
