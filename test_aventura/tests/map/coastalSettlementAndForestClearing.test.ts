/**
 * tests/node/map/coastalSettlementAndForestClearing.test.ts
 *
 * TIER 1 RED-TO-GREEN REPRODUCTION & INTEGRITY TEST
 *
 * Validates:
 *   1. Pokémon League (Meseta Añil): Direct ceremonial path over natural grass (pavedPlazaCells: []),
 *      0 floating / broken statues, Palace and Gate connected seamlessly.
 *   2. Coastal & Island Settlement (Isla Canela): 100% natural grass / sand ground, pavedPlazaCells: [],
 *      autotiled dirt paths, abundant coastal flowers and rustic fences.
 *   3. Metropolis Doorstep Clearance: PokéMart front doorstep is 100% clear of flowers and fences.
 *   4. Viridian Forest Canopy Clearance: tree_viridian_forest 6-tile bounding box never invades pathGrid.
 */

import { describe, it, expect } from 'vitest';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

describe('coastalSettlementAndForestClearing', () => {
  it('generates Pokémon League with direct ceremonial path on natural grass, 0 pavedPlazaCells, and 0 orphan statues', () => {
    const leagueNode: POINode = {
      id: 'pokemon_league_plateau',
      name: 'Meseta Añil',
      type: 'pokemon_league',
      footprint: { width: 22, height: 20 },
      terrainPreference: 'flat_grass',
      gridX: 10,
      gridY: 10,
      elevation: 0
    };

    const layout = generateSettlementLayout(leagueNode);
    expect(layout.nodeId).toBe('pokemon_league_plateau');
    expect(layout.buildings.length).toBe(1);

    // League Climax Ceremonial Simplicity Mandate: 0 pavedPlazaCells
    expect(layout.pavedPlazaCells.length).toBe(0);

    // Direct ceremonial path connecting palace down the plateau
    expect(layout.internalStreets.length).toBeGreaterThan(0);

    // Standalone / orphan statues strictly forbidden
    const statues = layout.props.filter((p) => p.type === 'statue');
    expect(statues.length).toBe(0);

    // Flanking ceremonial street lamps present
    const lamps = layout.props.filter((p) => p.type === 'lamp');
    expect(lamps.length).toBeGreaterThanOrEqual(2);

    // Zero hardcoded checkpoint gates on Meseta Añil (procedural gates placed along routes)
    const gate = layout.buildings.find((b) => b.type === 'checkpoint_gate');
    expect(gate).toBeUndefined();

    // Coaxial Avenue Alignment: Grand Palace has a +16px (half-tile) shift to center the door seam over the 2-cell avenue
    const palace = layout.buildings.find((b) => b.type === 'pokemon_league')!;
    expect(palace).toBeDefined();
    expect(palace.pixelOffsetX).toBe(16);
  });

  it('generates Cinnabar Island (and coastal island settlements) with 0 pavedPlazaCells and rich natural flora', () => {
    const cinnabarNode: POINode = {
      id: 'cinnabar_island_city',
      name: 'Isla Canela',
      type: 'city',
      footprint: { width: 16, height: 14 },
      terrainPreference: 'flat_grass',
      gridX: 30,
      gridY: 30,
      elevation: 0
    };

    const layout = generateSettlementLayout(cinnabarNode);

    // Coastal & Island Settlement Natural Ground Mandate: 0 cobblestone slabs
    expect(layout.pavedPlazaCells.length).toBe(0);
    expect(layout.roadMaterial).toBe('dirt');
    expect(layout.curbs?.length ?? 0).toBe(0);

    // Autotiled dirt paths connecting Center, Mart, and Gym
    expect(layout.internalStreets.length).toBeGreaterThan(0);

    // Rich coastal flowers and civic props
    const flowers = layout.props.filter((p) => p.type === 'flower');
    expect(flowers.length).toBeGreaterThanOrEqual(2);
    expect(layout.props.length).toBeGreaterThanOrEqual(4);

    // Strict Door-to-Street Connectivity: every building door connects to internalStreets
    const streetSet = new Set(layout.internalStreets.map((s) => `${s.x}_${s.y}`));
    for (const b of layout.buildings) {
      expect(streetSet.has(`${b.doorX}_${b.doorY + 1}`)).toBe(true);
    }
  });

  it('strictly ensures Metropolis PokéMart doorstep has 0 props and door is accurately positioned, and civic plaza is symmetrical', () => {
    const celadonNode: POINode = {
      id: 'celadon_capital',
      name: 'Ciudad Celeste',
      type: 'metropolis',
      footprint: { width: 30, height: 24 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(celadonNode);
    const mart = layout.buildings.find((b) => b.type === 'pokemart');
    expect(mart).toBeDefined();

    // Canonical PokéMart door is at dx=2, dy=3
    expect(mart!.doorX).toBe(mart!.x + 2);
    expect(mart!.doorY).toBe(mart!.y + 3);

    // Doorstep front (doorX, doorY + 1) must be 100% clear of props
    const doorstepFrontKey = `${mart!.doorX}_${mart!.doorY + 1}`;
    const propKeys = new Set(layout.props.map((p) => `${p.x}_${p.y}`));
    expect(propKeys.has(doorstepFrontKey)).toBe(false);

    // Fountain is centered under Silph Tower entrance doors (x = tower.x + 3 for 9-wide building)
    const tower = layout.buildings.find((b) => b.type === 'corp_tower')!;
    expect(tower).toBeDefined();
    expect(tower.width).toBe(9);
    expect(tower.height).toBe(7);
    const fountain = layout.props.find((p) => p.type === 'fountain')!;
    expect(fountain).toBeDefined();
    expect(fountain.x).toBe(tower.x + 3);

    // Asymmetrical Street Lamp Distribution Mandate & Anti-Clumping:
    // Lamps must be distributed organically across city thoroughfares, with strict min distance >= 4.0 tiles.
    const cityLamps = layout.props.filter((p) => p.type === 'lamp');
    expect(cityLamps.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < cityLamps.length; i++) {
      for (let j = i + 1; j < cityLamps.length; j++) {
        const dist = Math.hypot(cityLamps[i]!.x - cityLamps[j]!.x, cityLamps[i]!.y - cityLamps[j]!.y);
        expect(dist).toBeGreaterThanOrEqual(4.0);
      }
    }

    // Zero Fences on Stone Plaza Mandate: fences with baked-in green backgrounds are strictly forbidden
    const fences = layout.props.filter((p) => p.type === 'fence_h');
    expect(fences.length).toBe(0);

    // Zero Mailbox on Stone Plaza Mandate: rural mailboxes are strictly excluded from urban metropolises
    const mailbox = layout.props.find((p) => p.type === 'mailbox');
    expect(mailbox).toBeUndefined();

    // Rich urban props (lamps, circular flower pots, bushes, benches)
    const allLamps = layout.props.filter((p) => p.type === 'lamp');
    expect(allLamps.length).toBeGreaterThanOrEqual(4);

    const flowers = layout.props.filter((p) => p.type === 'flower');
    expect(flowers.length).toBeGreaterThanOrEqual(4);

    // Zero doorsteps obstructed across ALL buildings in Metropolis
    for (const b of layout.buildings) {
      const bDoorKey = `${b.doorX}_${b.doorY + 1}`;
      expect(propKeys.has(bDoorKey)).toBe(false);
    }
  });

  it('renders urban props strictly AFTER buildings in canvasTileRenderer ensuring props never get hidden under building facades', () => {
    const { buildMapBlitInstructions, CANVAS_TILE_SIZE } = require('../../../src/logic/map/canvasTileRenderer.ts');
    const { generateContinentMap } = require('../../../src/logic/map/continentGenerator.ts');
    const { placeRegionalPOIs } = require('../../../src/logic/map/poiPlacementEngine.ts');
    const { generateRouteNetwork } = require('../../../src/logic/map/routeNetworkEngine.ts');
    const { generateWildernessLayer } = require('../../../src/logic/map/wildernessVegetationEngine.ts');

    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 2,
      mountainPercentage: 0.2,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid,
      wilderness
    );

    // Find indices of building blits and urban prop blits
    const buildingIndices: number[] = [];
    const urbanPropIndices: number[] = [];

    instructions.forEach((inst: { filename: string; px: number; py: number }, index: number) => {
      if (
        inst.filename.startsWith('house_') ||
        inst.filename.startsWith('poke_corp_tower') ||
        inst.filename.startsWith('poke_dept_store') ||
        inst.filename.startsWith('pokemon_league') ||
        inst.filename.startsWith('pokecenter') ||
        inst.filename.startsWith('pokemart') ||
        inst.filename.startsWith('gym')
      ) {
        buildingIndices.push(index);
      }
      if (
        inst.filename.includes('poke_street_lamp') ||
        inst.filename.includes('poke_bench') ||
        inst.filename.includes('poke_fountain')
      ) {
        urbanPropIndices.push(index);
      }
    });

    expect(buildingIndices.length).toBeGreaterThan(0);
    expect(urbanPropIndices.length).toBeGreaterThan(0);

    // For every POI settlement, any urban prop placed in front of / beside a building facade
    // is stamped AFTER that building (2.5D depth ordering invariant)
    let verifiedPairs = 0;
    for (const poi of pois) {
      if (poi.urbanLayout && poi.urbanLayout.buildings.length > 0 && poi.urbanLayout.props.length > 0) {
        for (const b of poi.urbanLayout.buildings) {
          const bIdx = instructions.findIndex(
            (inst: { filename: string; px: number; py: number }) =>
              inst.filename === b.prefabFile && inst.px === b.x * CANVAS_TILE_SIZE
          );
          if (bIdx === -1) continue;

          for (const p of poi.urbanLayout.props) {
            // Prop is standing in front of or flanking the building's facade
            if (p.x >= b.x - 1 && p.x <= b.x + b.width && p.y >= b.y + b.height - 1) {
              const pIdx = instructions.findIndex(
                (inst: { filename: string; px: number; py: number }) =>
                  inst.filename.includes(p.prefabFile) &&
                  Math.abs(inst.px - p.x * CANVAS_TILE_SIZE) <= 32 &&
                  Math.abs(inst.py - p.y * CANVAS_TILE_SIZE) <= 64
              );
              if (pIdx !== -1) {
                expect(pIdx).toBeGreaterThan(bIdx);
                verifiedPairs++;
              }
            }
          }
        }
      }
    }
    expect(verifiedPairs).toBeGreaterThan(0);
  });

  it('strictly validates that tree_viridian_forest bounding boxes never overlap paths across all 6 footprint and canopy cells', () => {
    const { buildMapBlitInstructions, CANVAS_TILE_SIZE } = require('../../../src/logic/map/canvasTileRenderer.ts');
    const { generateContinentMap } = require('../../../src/logic/map/continentGenerator.ts');
    const { placeRegionalPOIs } = require('../../../src/logic/map/poiPlacementEngine.ts');
    const { generateRouteNetwork } = require('../../../src/logic/map/routeNetworkEngine.ts');
    const { generateWildernessLayer } = require('../../../src/logic/map/wildernessVegetationEngine.ts');

    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 2,
      mountainPercentage: 0.2,
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const routeResult = generateRouteNetwork(continent, pois, { allowBridges: true });
    const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid);

    const { instructions } = buildMapBlitInstructions(
      continent,
      pois,
      routeResult.pathGrid,
      routeResult.bridgeGrid,
      wilderness
    );

    const viridianTrees = instructions.filter((inst: { filename: string }) =>
      inst.filename === 'tree_viridian_forest.png'
    );

    expect(viridianTrees.length).toBeGreaterThan(0);

    for (const tree of viridianTrees) {
      const tx = Math.floor(tree.px / CANVAS_TILE_SIZE);
      const ty = Math.floor(tree.py / CANVAS_TILE_SIZE) + 1;

      // Check all 6 cells: dx in 0..1, dy in -1..1
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const cy = ty + dy;
          const cx = tx + dx;
          expect(
            routeResult.pathGrid[cy]?.[cx] ?? false,
            `Tree at ${tx},${ty} invaded pathGrid at ${cx},${cy} (dy: ${dy}, dx: ${dx})`
          ).toBe(false);
        }
      }
    }
  });
});
