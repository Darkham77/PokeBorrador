/**
 * tests/node/map/cityLayoutEngine.test.ts
 *
 * UNIT TESTS FOR CITY LAYOUT ENGINE & URBAN HYBRID TYPOLOGIES
 *
 * Validates:
 *   1. Metropolis layout: 16x14 footprint, orthogonal street network, Gym, Center, Mart, houses.
 *   2. City layout: 12x10 footprint, central paved plaza with perimeter inward-facing buildings.
 *   3. Town layout: 8x8 footprint, rural organic paths, rustic homesteads, picket fences, flowers.
 *   4. Doorstep Clearance Invariant: Front entrance cell of all buildings is 100% free of props/obstacles.
 */

import { describe, it, expect } from 'vitest';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('cityLayoutEngine', () => {
  it('generates a 30x24 Metropolis with orthogonal avenues and 8 macro-buildings across 4 districts', () => {
    const node: POINode = {
      id: 'celadon_capital',
      name: 'Ciudad Celeste',
      type: 'metropolis',
      footprint: { width: 30, height: 24 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    expect(layout.nodeId).toBe('celadon_capital');
    expect(layout.buildings.length).toBeGreaterThanOrEqual(8);

    const bTypes = new Set(layout.buildings.map((b) => b.type));
    expect(bTypes.has('dept_store')).toBe(true);
    expect(bTypes.has('corp_tower')).toBe(true);
    expect(bTypes.has('gym')).toBe(true);
    expect(bTypes.has('game_corner')).toBe(true);
    expect(bTypes.has('condo')).toBe(true);
    expect(bTypes.has('pokecenter')).toBe(true);
    expect(bTypes.has('pokemart')).toBe(true);

    expect(layout.internalStreets.length).toBeGreaterThan(0);
    // Metropolis Continuous Urban Paving Mandate: all commercial blocks paved flush to building facades
    expect(layout.pavedPlazaCells.length).toBeGreaterThan(500);
    expect(layout.pavedPlazaCells.length).toBeLessThan(700);

    // Verify macro-prefab files are assigned
    const bFiles = new Set(layout.buildings.map((b) => b.prefabFile));
    expect(bFiles.has('poke_dept_store.png')).toBe(true);
    expect(bFiles.has('poke_corp_tower.png')).toBe(true);
    expect(bFiles.has('poke_condo_block.png')).toBe(true);
    expect(bFiles.has('poke_game_corner.png')).toBe(true);
    expect(bFiles.has('gym_gold.png')).toBe(true);

    // Verify Central Civic Plaza features: Fountain, Benches, Directional Lamps, Circular Planters
    const propTypes = new Set(layout.props.map((p) => p.type));
    expect(propTypes.has('fountain')).toBe(true);
    expect(propTypes.has('bench')).toBe(true);
    expect(propTypes.has('lamp')).toBe(true);
    expect(propTypes.has('flower')).toBe(true);
    expect(propTypes.has('statue')).toBe(false);

    const propFiles = new Set(layout.props.map((p) => p.prefabFile));
    expect(propFiles.has('poke_fountain.png')).toBe(true);
    expect(propFiles.has('poke_bench.png')).toBe(true);
    expect(propFiles.has('poke_street_lamp_left.png')).toBe(true);
    expect(propFiles.has('poke_statue.png')).toBe(false);
  });

  it('generates a 16x14 City with 2-cell avenues, macro-condo/gym, sidewalks, and rest benches', () => {
    const node: POINode = {
      id: 'vermilion_city',
      name: 'Ciudad Carmin',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 40,
      gridY: 40,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    expect(layout.buildings.length).toBeGreaterThanOrEqual(4);

    const bTypes = new Set(layout.buildings.map((b) => b.type));
    expect(bTypes.has('pokecenter')).toBe(true);
    expect(bTypes.has('pokemart')).toBe(true);
    // Landmark building from one of the 7 urban archetypes
    expect(
      bTypes.has('condo') ||
      bTypes.has('bike_shop') ||
      bTypes.has('dojo') ||
      bTypes.has('fan_club') ||
      bTypes.has('house')
    ).toBe(true);
    expect(bTypes.has('gym')).toBe(true);

    // Sidewalks & concourse (not monolithic slab)
    expect(layout.pavedPlazaCells.length).toBeLessThan(120);
    expect(layout.pavedPlazaCells.length).toBeGreaterThan(20);
    expect(layout.internalStreets.length).toBeGreaterThan(0);

    const propTypes = new Set(layout.props.map((p) => p.type));
    expect(propTypes.has('flower') || propTypes.has('fence_h')).toBe(true);
    expect(propTypes.has('bench')).toBe(true);
    expect(propTypes.has('lamp')).toBe(true);
  });

  it('generates a 12x12 Regional Town with Pokecenter, Pokemart, Cottage, Landmark, and strictly 0 paved slabs', () => {
    const node: POINode = {
      id: 'paleta_starting_town',
      name: 'Pueblo Paleta',
      type: 'town',
      footprint: { width: 12, height: 12 },
      terrainPreference: 'flat_grass',
      gridX: 10,
      gridY: 10,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    expect(layout.buildings.length).toBe(4);

    const bTypes = new Set(layout.buildings.map((b) => b.type));
    expect(bTypes.has('pokecenter')).toBe(true);
    expect(bTypes.has('pokemart')).toBe(true);
    expect(bTypes.has('house')).toBe(true);
    expect(bTypes.has('lab') || bTypes.has('house')).toBe(true);

    // Strictly 0 paved/concrete cells in rural towns
    expect(layout.pavedPlazaCells.length).toBe(0);
    expect(layout.curbs?.length ?? 0).toBe(0);

    // Props strictly on grass
    const propTypes = new Set(layout.props.map((p) => p.type));
    expect(propTypes.has('signpost')).toBe(true);
    expect(propTypes.has('flower')).toBe(true);
  });

  it('generates an 8x8 Town with rustic homesteads, dirt paths, garden fences, and strictly 0 paved cells', () => {
    const node: POINode = {
      id: 'compact_town_test',
      name: 'Pueblo Compacto',
      type: 'town',
      footprint: { width: 8, height: 8 },
      terrainPreference: 'flat_grass',
      gridX: 10,
      gridY: 10,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    expect(layout.buildings.length).toBeGreaterThanOrEqual(1);
    expect(layout.props.length).toBeGreaterThan(0);

    // Strictly 0 paved/concrete cells in rural towns
    expect(layout.pavedPlazaCells.length).toBe(0);
    expect(layout.internalStreets.length).toBeGreaterThan(0);

    const propTypes = new Set(layout.props.map((p) => p.type));
    expect(propTypes.has('fence_h')).toBe(true);
    expect(propTypes.has('flower')).toBe(true);
    expect(propTypes.has('signpost')).toBe(true);
    expect(propTypes.has('mailbox')).toBe(true);
  });

  it('strictly preserves the Doorstep Clearance Invariant across all buildings in Metropolis and City', () => {
    const metroNode: POINode = {
      id: 'test_metro',
      name: 'Metropolis Test',
      type: 'metropolis',
      footprint: { width: 26, height: 22 },
      terrainPreference: 'flat_grass',
      gridX: 30,
      gridY: 30,
      elevation: 0
    };

    const metroLayout = generateSettlementLayout(metroNode);
    const metroPropLocations = new Set(metroLayout.props.map((p) => `${p.x}_${p.y}`));

    for (const b of metroLayout.buildings) {
      const doorstepFront = `${b.doorX}_${b.doorY + 1}`;
      const doorstepNorth = `${b.doorX}_${b.doorY - 1}`;
      expect(metroPropLocations.has(doorstepFront)).toBe(false);
      expect(metroPropLocations.has(doorstepNorth)).toBe(false);
    }

    const cityNode: POINode = {
      id: 'test_city',
      name: 'City Test',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 10,
      gridY: 10,
      elevation: 0
    };

    const cityLayout = generateSettlementLayout(cityNode);
    const cityPropLocations = new Set(cityLayout.props.map((p) => `${p.x}_${p.y}`));

    for (const b of cityLayout.buildings) {
      const doorstepFront = `${b.doorX}_${b.doorY + 1}`;
      const doorstepNorth = `${b.doorX}_${b.doorY - 1}`;
      expect(cityPropLocations.has(doorstepFront)).toBe(false);
      expect(cityPropLocations.has(doorstepNorth)).toBe(false);
    }
  });

  it('generates directional curbs for Metropolis and City while strictly respecting Curb Clearance at entrances', () => {
    const node: POINode = {
      id: 'saffron_capital',
      name: 'Ciudad Azafran',
      type: 'metropolis',
      footprint: { width: 26, height: 22 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    expect(layout.curbs).toBeDefined();
    expect(layout.curbs!.length).toBeGreaterThan(0);

    const curbLocations = new Set(layout.curbs!.map((c) => `${c.x}_${c.y}`));

    // Verify Curb Clearance Invariant: curbs must NEVER exist at doorsteps (doorX, doorY + 1)
    for (const b of layout.buildings) {
      const doorstep = `${b.doorX}_${b.doorY + 1}`;
      expect(curbLocations.has(doorstep)).toBe(false);
    }

    // Verify directional curb tiles are assigned
    const curbFiles = new Set(layout.curbs!.map((c) => c.curbTile));
    expect(curbFiles.has('poke_curb_n.png') || curbFiles.has('poke_curb_s.png') || curbFiles.has('poke_curb_w.png') || curbFiles.has('poke_curb_e.png')).toBe(true);

    // Town must have 0 curbs
    const townNode: POINode = {
      id: 'pallet_town',
      name: 'Pueblo Paleta',
      type: 'town',
      footprint: { width: 8, height: 8 },
      terrainPreference: 'flat_grass',
      gridX: 0,
      gridY: 0,
      elevation: 0
    };
    const townLayout = generateSettlementLayout(townNode);
    expect(townLayout.curbs?.length ?? 0).toBe(0);
  });

  it('strictly guarantees zero building overlaps and zero out-of-bounds across Metropolis, City, and Town', () => {
    const nodes: POINode[] = [
      {
        id: 'celadon_capital',
        name: 'Ciudad Celeste',
        type: 'metropolis',
        footprint: { width: 26, height: 22 },
        terrainPreference: 'flat_grass',
        gridX: 10,
        gridY: 10,
        elevation: 0
      },
      {
        id: 'saffron_metro',
        name: 'Azafran Central',
        type: 'city',
        footprint: { width: 16, height: 14 },
        terrainPreference: 'flat_grass',
        gridX: 10,
        gridY: 10,
        elevation: 0
      },
      {
        id: 'paleta_starting_town',
        name: 'Pueblo Paleta',
        type: 'town',
        footprint: { width: 8, height: 8 },
        terrainPreference: 'flat_grass',
        gridX: 10,
        gridY: 10,
        elevation: 0
      }
    ];

    for (const node of nodes) {
      const layout = generateSettlementLayout(node);
      const bldgs = layout.buildings;

      // 1. Verify zero out-of-bounds
      for (const b of bldgs) {
        expect(
          b.x >= node.gridX &&
          b.x + b.width <= node.gridX + node.footprint.width &&
          b.y >= node.gridY &&
          b.y + b.height <= node.gridY + node.footprint.height,
          `Building ${b.id} (${b.width}x${b.height}) at (${b.x},${b.y}) out of bounds for ${node.id} (${node.footprint.width}x${node.footprint.height})`
        ).toBe(true);
      }

      // 2. Verify zero building-on-building bounding box intersections
      for (let i = 0; i < bldgs.length; i++) {
        for (let j = i + 1; j < bldgs.length; j++) {
          const a = bldgs[i]!;
          const b = bldgs[j]!;
          const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
          const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
          expect(
            overlapX && overlapY,
            `Destructive collision detected in ${node.id} between ${a.id} (${a.width}x${a.height} at ${a.x},${a.y}) and ${b.id} (${b.width}x${b.height} at ${b.x},${b.y})`
          ).toBe(false);
        }
      }
    }
  });

  it('generates procedural architectural variety for residences, benches, and floral planters', () => {
    // 1. Town residential variety
    const town1: POINode = {
      id: 'town_1',
      name: 'Pueblo Uno',
      type: 'town',
      footprint: { width: 10, height: 10 },
      terrainPreference: 'flat_grass',
      gridX: 5,
      gridY: 5,
      elevation: 0
    };
    const town2: POINode = {
      id: 'town_2',
      name: 'Pueblo Dos',
      type: 'town',
      footprint: { width: 10, height: 10 },
      terrainPreference: 'flat_grass',
      gridX: 12,
      gridY: 8,
      elevation: 0
    };

    const layout1 = generateSettlementLayout(town1);
    const layout2 = generateSettlementLayout(town2);

    const houses1 = layout1.buildings.map((b) => b.prefabFile);
    const houses2 = layout2.buildings.map((b) => b.prefabFile);

    // Each town must have 2 distinct houses
    expect(houses1[0]).not.toBe(houses1[1]);
    expect(houses2[0]).not.toBe(houses2[1]);

    // 2. Metropolis civic plaza variety
    const metro: POINode = {
      id: 'metro_variety',
      name: 'Metropolis Variety',
      type: 'metropolis',
      footprint: { width: 26, height: 22 },
      terrainPreference: 'flat_grass',
      gridX: 21,
      gridY: 20,
      elevation: 0
    };
    const metroLayout = generateSettlementLayout(metro);
    const metroPropFiles = new Set(metroLayout.props.map((p) => p.prefabFile));
    expect(metroPropFiles.has('poke_bench.png')).toBe(true);
    expect(metroPropFiles.has('poke_street_lamp_left.png')).toBe(true);
    expect(metroPropFiles.has('poke_flower_pot_circular.png')).toBe(true);

    // 3. City sidewalk bench & planter variety
    const city: POINode = {
      id: 'city_variety',
      name: 'Ciudad Variedad',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 31,
      gridY: 30,
      elevation: 0
    };
    const cityLayout = generateSettlementLayout(city);
    const cityPropFiles = new Set(cityLayout.props.map((p) => p.prefabFile));
    expect(
      cityPropFiles.has('poke_bench.png') ||
      cityPropFiles.has('poke_bench_v_left.png') ||
      cityPropFiles.has('poke_bench_v_right.png')
    ).toBe(true);
    expect(cityPropFiles.has('poke_street_lamp_left.png')).toBe(true);
    expect(cityPropFiles.has('poke_flower_pot_circular.png')).toBe(true);
  });

  it('strictly enforces crossing clearance buffer for benches in city layouts (|y - midY| >= 3)', () => {
    const cinnabarCity: POINode = {
      id: 'cinnabar_island_city',
      name: 'Isla Canela',
      type: 'city',
      footprint: { width: 16, height: 12 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(cinnabarCity);
    const midY = 20 + Math.floor(12 / 2); // 26
    const midX = 20 + Math.floor(16 / 2); // 28

    const benches = layout.props.filter((p) => p.type === 'bench');
    expect(benches.length).toBeGreaterThan(0);

    for (const b of benches) {
      const distY = Math.abs(b.y - midY);
      const distX = Math.abs(b.x - midX);
      // Bench must maintain >= 3 tiles clearance from intersection center
      expect(distY >= 3 || distX >= 3).toBe(true);
      // Must not sit in the central 4-way intersection crossing
      expect(distY <= 2 && distX <= 2).toBe(false);
    }
  });

  it('hermetically seals both flanks of gatehouses in dungeon_forest with wooden barrier fences', () => {
    const forestNode: POINode = {
      id: 'viridian_forest',
      name: 'Bosque Verde',
      type: 'dungeon_forest',
      footprint: { width: 24, height: 30 },
      terrainPreference: 'forest_clearing',
      gridX: 10,
      gridY: 10,
      elevation: 0
    };

    const layout = generateSettlementLayout(forestNode);
    expect(layout.buildings.length).toBe(2); // North and South gates

    const northGate = layout.buildings.find((b) => b.id.includes('north_gate'))!;
    const southGate = layout.buildings.find((b) => b.id.includes('south_gate'))!;
    expect(northGate).toBeDefined();
    expect(southGate).toBeDefined();

    // Vertical separation between gates must be >= 15 tiles
    const gateSeparation = southGate.y - (northGate.y + northGate.height);
    expect(gateSeparation).toBeGreaterThanOrEqual(15);

    // Flanks of both gates must be sealed by fences
    const fences = layout.props.filter((p) => p.type === 'fence_h');
    expect(fences.length).toBeGreaterThanOrEqual(10);

    // Left and right flank fence coverage for North Gate
    const nFlankLeft = fences.some((f) => f.x < northGate.x && Math.abs(f.y - northGate.y) <= 4);
    const nFlankRight = fences.some((f) => f.x >= northGate.x + northGate.width && Math.abs(f.y - northGate.y) <= 4);
    expect(nFlankLeft).toBe(true);
    expect(nFlankRight).toBe(true);

    // Left and right flank fence coverage for South Gate
    const sFlankLeft = fences.some((f) => f.x < southGate.x && Math.abs(f.y - southGate.y) <= 4);
    const sFlankRight = fences.some((f) => f.x >= southGate.x + southGate.width && Math.abs(f.y - southGate.y) <= 4);
    expect(sFlankLeft).toBe(true);
    expect(sFlankRight).toBe(true);
  });
});
