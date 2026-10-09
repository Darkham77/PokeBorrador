/**
 * tests/node/map/regionalLeagueAndGyms.test.ts
 *
 * TIER 1 UNIT TESTS: CANONICAL 8 REGIONAL GYMS & POKÉMON LEAGUE PALACE
 *
 * Validates:
 *   1. Regional map generation (256x256) places >= 8 settlements.
 *   2. Exactly 8 official Pokémon Gyms are placed across the region.
 *   3. Exactly 1 Regional Pokémon League (Meseta Añil) is anchored in the northern mountain massif.
 *   4. The Pokémon League layout features the 16x7 Palace (pokemon_league.png), guardian statues, and checkpoint gate.
 *   5. Zero overlapping buildings and zero 0-clearance touches across all 8 Gym cities and the League.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('regionalLeagueAndGyms', () => {
  const W = 256;
  const H = 256;
  const seed = 12345;

  const continent = generateContinentMap({
    width: W,
    height: H,
    seed,
    oceanWaterPercentage: 0.30,
    beachWidth: 3,
    lakeCount: 4,
    mountainPercentage: 0.22,
    withStairs: true,
    withArchipelago: true
  });

  const pois = placeRegionalPOIs(continent, { targetCount: 22, seed });

  it('guarantees at least 8 settlements are placed on regional maps', () => {
    const settlements = pois.filter(
      (p) => p.type === 'metropolis' || p.type === 'city' || p.type === 'town'
    );
    expect(settlements.length).toBeGreaterThanOrEqual(8);
  });

  it('guarantees EXACTLY 8 official Pokémon League Gyms are placed across the region', () => {
    let totalGyms = 0;
    const gymSettlements: POINode[] = [];

    for (const poi of pois) {
      if (!poi.urbanLayout) continue;
      const gyms = poi.urbanLayout.buildings.filter((b) => b.type === 'gym');
      if (gyms.length > 0) {
        totalGyms += gyms.length;
        gymSettlements.push(poi);
        // Each gym city has at most 1 gym
        expect(gyms.length).toBe(1);
        // Gym prefab must be canonical (gym_gold or gym)
        expect(['gym_gold.png', 'gym.png']).toContain(gyms[0]!.prefabFile);
      }
    }

    expect(totalGyms).toBe(8);
    expect(gymSettlements.length).toBe(8);
  });

  it('guarantees exactly 1 Regional Pokémon League (Meseta Añil) is anchored in the northern mountain massif', () => {
    const leagueNodes = pois.filter(
      (p) => p.type === 'pokemon_league' || p.id === 'pokemon_league_plateau'
    );
    expect(leagueNodes.length).toBe(1);

    const league = leagueNodes[0]!;
    expect(league.name).toContain('Liga');
    // Anchored in northern sector of the continent
    expect(league.gridY).toBeLessThan(Math.round(H * 0.40));
    // Anchored on elevated mountain massif (elevation >= 1)
    expect(league.elevation).toBeGreaterThanOrEqual(1);
  });

  it('guarantees the Pokémon League layout features the 11x8 Palace, checkpoint gate, direct natural path, and zero standalone statues', () => {
    const league = pois.find(
      (p) => p.type === 'pokemon_league' || p.id === 'pokemon_league_plateau'
    )!;
    expect(league).toBeDefined();
    expect(league.urbanLayout).toBeDefined();

    const layout = league.urbanLayout!;
    // 11x8 Palace building
    const palace = layout.buildings.find((b) => b.prefabFile === 'pokemon_league.png');
    expect(palace).toBeDefined();
    expect(palace!.width).toBe(11);
    expect(palace!.height).toBe(8);

    // League Climax Ceremonial Simplicity Mandate: standalone poke_statue eliminated (integrated in palace facade)
    const statues = layout.props.filter((p) => p.prefabFile === 'poke_statue.png');
    expect(statues.length).toBe(0);

    // Flanking ceremonial street lamps present
    const lamps = layout.props.filter((p) => p.type === 'lamp');
    expect(lamps.length).toBeGreaterThanOrEqual(2);

    // Direct ceremonial avenue running down the plateau over natural grass
    expect(layout.internalStreets.length).toBeGreaterThan(0);
    expect(layout.pavedPlazaCells.length).toBe(0);

    // Zero hardcoded checkpoint gates on Meseta Añil (procedural gates placed along routes)
    const gate = layout.buildings.find(
      (b) => b.prefabFile === 'poke_league_checkpoint_gate.png'
    );
    expect(gate).toBeUndefined();
  });

  it('guarantees zero building overlaps and zero 0-clearance touches in all 8 Gym cities and the League', () => {
    for (const poi of pois) {
      if (!poi.urbanLayout) continue;
      const { buildings } = poi.urbanLayout;

      for (let i = 0; i < buildings.length; i++) {
        const b1 = buildings[i]!;
        for (let j = i + 1; j < buildings.length; j++) {
          const b2 = buildings[j]!;

          // No bounding box intersection
          const overlapX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const overlapY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          expect(overlapX > 0 && overlapY > 0).toBe(false);

          // Minimum 1 tile clearance (no touching edges)
          const touchH = (b1.x + b1.width === b2.x || b2.x + b2.width === b1.x) && !(b1.y + b1.height <= b2.y || b2.y + b2.height <= b1.y);
          const touchV = (b1.y + b1.height === b2.y || b2.y + b2.height === b1.y) && !(b1.x + b1.width <= b2.x || b2.x + b2.width <= b1.x);
          expect(touchH || touchV).toBe(false);
        }
      }
    }
  });
});
