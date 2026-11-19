/**
 * test_aventura/tests/map/continentalBlockCIntegrity.test.ts
 *
 * TIER 1 & TIER 2 TDD SUITE FOR BLOCK C:
 *   C1. Distinct Regional Macro-Archetypes (classic_bay, oceanic_archipelago, divided_valley, volcanic_horseshoe).
 *   C2. Biome-coherent mountain palettes (no arbitrary W*0.5 split) and regional macro-biome continuity.
 *   C3. Paired 2-mouth transit caves (wormhole_tunnel) connected to pathGrid & elimination of orphan cave spam.
 *   C4. Optional navigable islands (0 on pure continental, 1+ connected on archipelago) & FireRed sea rock channel boundaries
 *       across all supported map scales (128x128, 256x256, 400x400).
 */

import { describe, it, expect } from 'vitest';

import { generatePokemonContinentalWorld } from '../../logic/map/continent/continentalEngine.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';
import { clusterMountainMassifs } from '../../logic/map/geologicalClusterEngine.ts';
import { synthesizeMacroBiomes, type MacroBiome } from '../../logic/map/macroBiomeSynthesizer.ts';
import { embedPokemonTopology } from '../../logic/map/orthogonalGraphEmbedding.ts';
import {
  generatePokemonTopology,
  validateGraphInvariants
} from '../../logic/map/pokemonGraphTopology.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import { REGION_MACRO_ARCHETYPES } from '../../types/map/pokemonGraphTypes.ts';

describe('Block C: Macro-Archetypes, Coherent Biomes, Two-Mouth Caves & Maritime Islands', () => {
  describe('C1: Regional Macro-Archetypes across Topology & Spatial Embedding', () => {
    it('generates all 4 valid macro-archetypes cleanly and respects explicit archetype selection', () => {
      const seenArchetypes = new Set<string>();
      for (let s = 1; s <= 40; s++) {
        const g = generatePokemonTopology({ seed: s * 17 + 3 });
        expect(g.macroArchetype).toBeDefined();
        seenArchetypes.add(g.macroArchetype!);
      }
      for (const arch of REGION_MACRO_ARCHETYPES) {
        expect(seenArchetypes.has(arch)).toBe(true);
      }

      for (const arch of REGION_MACRO_ARCHETYPES) {
        const graph = generatePokemonTopology({ seed: 7741, macroArchetype: arch });
        expect(graph.macroArchetype).toBe(arch);
        const validation = validateGraphInvariants(graph);
        expect(validation.errors).toEqual([]);
        expect(validation.isValid).toBe(true);

        if (arch === 'divided_valley') {
          const wormholes = graph.edges.filter((e) => e.kind === 'wormhole_tunnel');
          expect(wormholes.length).toBeGreaterThanOrEqual(1);
        }
        if (arch === 'oceanic_archipelago') {
          const surfRoutes = graph.edges.filter((e) => e.kind === 'surf_route');
          expect(surfRoutes.length).toBeGreaterThanOrEqual(2);
          const islandNodes = graph.nodes.filter((n) => n.isIsland);
          expect(islandNodes.length).toBeGreaterThanOrEqual(1);
        }

        const embedded = embedPokemonTopology(graph, { seed: 7741, width: 400, height: 400 });
        expect(embedded.macroArchetype).toBe(arch);
      }
    });
  });

  describe('C2: Biome-Coherent Mountain Palettes (Zero Artificial W/2 Split) & Regional Biomes', () => {
    it('assigns mountain palettes from dominant macro-biomes regardless of East/West centroid', () => {
      const W = 40;
      const H = 24;
      const elev: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
      const biomeGrid: MacroBiome[][] = Array.from({ length: H }, () =>
        Array<MacroBiome>(W).fill('temperate_meadow')
      );

      // Western massif in mint_highland (centroidX < W * 0.5) -> must be 'gray', NOT 'brown'
      for (let y = 4; y <= 10; y++) {
        for (let x = 4; x <= 10; x++) {
          elev[y]![x] = 1;
          biomeGrid[y]![x] = 'mint_highland';
        }
      }

      // Eastern massif in arid_desert (centroidX > W * 0.5) -> must be 'brown', NOT 'gray'
      for (let y = 4; y <= 10; y++) {
        for (let x = 28; x <= 34; x++) {
          elev[y]![x] = 1;
          biomeGrid[y]![x] = 'arid_desert';
        }
      }

      // Center massif in volcanic_plateau -> must be 'volcanic'
      for (let y = 14; y <= 20; y++) {
        for (let x = 16; x <= 22; x++) {
          elev[y]![x] = 1;
          biomeGrid[y]![x] = 'volcanic_plateau';
        }
      }

      const clusters = clusterMountainMassifs({
        elevationMatrix: elev,
        macroBiomeGrid: biomeGrid,
        seed: 42
      });

      const westMassif = clusters.massifs.find((m) => m.centroidX < 15)!;
      const eastMassif = clusters.massifs.find((m) => m.centroidX > 25)!;
      const centerMassif = clusters.massifs.find((m) => m.centroidY > 13)!;

      expect(westMassif.palette).toBe('gray');
      expect(eastMassif.palette).toBe('brown');
      expect(centerMassif.palette).toBe('volcanic');
    });

    it('synthesizes large cohesive macro-biome clusters modulated by regional archetype', () => {
      const W = 128;
      const H = 128;
      const land: WaterTerrainKind[][] = Array.from({ length: H }, () =>
        Array<WaterTerrainKind>(W).fill('grass')
      );
      const horseshoes = synthesizeMacroBiomes({
        width: W,
        height: H,
        seed: 7741,
        terrainMatrix: land,
        macroArchetype: 'volcanic_horseshoe'
      });
      expect(horseshoes.stats.volcanic_plateau + horseshoes.stats.arid_desert).toBeGreaterThan(0);
    });
  });

  describe('C3: Paired 2-Mouth Transit Caves (wormhole_tunnel) & Zero Orphan Cave Spam', () => {
    it('materializes matched pairs of cave_entrance POIs linked to pathGrid whenever wormhole_tunnel exists', () => {
      const graph = generatePokemonTopology({ seed: 7741, macroArchetype: 'divided_valley' });
      const wormholes = graph.edges.filter((e) => e.kind === 'wormhole_tunnel');
      expect(wormholes.length).toBeGreaterThanOrEqual(1);

      const world = generatePokemonContinentalWorld({
        seed: 7741,
        width: 400,
        height: 400,
        macroArchetype: 'divided_valley'
      });

      const caves = world.pois.filter((p) => p.type === 'cave_entrance');
      const pairedCaves = caves.filter((c) => Boolean(c.transitPairId));
      expect(pairedCaves.length).toBeGreaterThanOrEqual(2);

      // Every transitPairId must have strictly 2 linked mouths (1 entry + 1 exit) connected to walkable pathGrid
      const byPair = new Map<string, typeof pairedCaves>();
      for (const c of pairedCaves) {
        const list = byPair.get(c.transitPairId!) ?? [];
        list.push(c);
        byPair.set(c.transitPairId!, list);
      }

      for (const [, mouths] of byPair.entries()) {
        expect(mouths).toHaveLength(2);
        const [a, b] = mouths as [(typeof mouths)[0], (typeof mouths)[0]];
        expect(a.transitTargetId).toBe(b.id);
        expect(b.transitTargetId).toBe(a.id);

        for (const mouth of mouths) {
          const doorX = mouth.gridX;
          const doorY = mouth.gridY + 1;
          expect(
            world.pathGrid[doorY]?.[doorX] || world.pathGrid[doorY + 1]?.[doorX],
            `Mouth ${mouth.id} at (${mouth.gridX},${mouth.gridY}) must connect cleanly to pathGrid`
          ).toBe(true);
        }
      }

      // Legacy random cave spam (id prefix 'cave_tunnel_') without transitPairId must be eradicated
      const randomSpamCaves = caves.filter(
        (c) => c.id.startsWith('cave_tunnel_') && !c.transitPairId
      );
      expect(randomSpamCaves).toHaveLength(0);
    });
  });

  describe('C4: Optional Navigable Islands & FireRed Sea Rock Channel Boundaries Across All Scales', () => {
    it('supports pure continental maps without islands when archetype is classic_bay', () => {
      const world = generatePokemonContinentalWorld({
        seed: 42,
        width: 400,
        height: 400,
        macroArchetype: 'classic_bay'
      });
      expect(world.continent.archipelagoIslands?.length ?? 0).toBe(0);
    });

    it('generates maritime rock channel boundaries with FireRed foam/calm rocks across 128x128, 256x256, and 400x400', () => {
      for (const size of [128, 256, 400] as const) {
        const result = executeRegionalGenerationJob({
          seed: 7741,
          width: size,
          height: size,
          macroArchetype: 'oceanic_archipelago',
          withArchipelago: true
        });

        expect(result.routeNetwork.maritimeRockObstacles).toBeDefined();
        const rocks = result.routeNetwork.maritimeRockObstacles!;
        expect(
          rocks.length,
          `Map ${size}x${size} oceanic_archipelago must produce FireRed sea rock channel boundaries`
        ).toBeGreaterThan(0);

        const validPrefabs = new Set(['poke_water_rock_foam.png', 'poke_water_rocks_calm.png']);
        for (const r of rocks) {
          expect(validPrefabs.has(r.prefabFile)).toBe(true);
          const t = result.continent.terrainMatrix[r.y]?.[r.x];
          expect(t === 'water' || t === 'water_deep').toBe(true);
          expect(Boolean(result.routeNetwork.bridgeGrid[r.y]?.[r.x])).toBe(false);
        }
      }
    });
  });
});
