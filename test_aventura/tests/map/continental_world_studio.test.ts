/**
 * tests/node/map/continental_world_studio.test.ts
 *
 * Unit tests for Continental World Generator & Road Network Engine (Overworld Studio).
 * Verifies procedural terrain, node dispersion, Delaunay/MST road connectivity,
 * urban maquette baking, and continental routes export bundle.
 */

import { describe, it, expect } from 'vitest';
import {
  generateProceduralContinentalTerrain,
  scatterUrbanNodes,
  generateRoadNetwork,
  generateSvgRoadPathData,
  bakeUrbanMaquette,
  rasterizeRoadsOnTerrain,
  generateCompleteContinentalWorld,
  exportContinentalRoutesBundle,
  getCanonicalTileForBiome,
  validateAntiFrankensteinPalette
} from '../../logic/map/continentalWorldGenerator';
import { CELL_BIOME } from '../../logic/map/kantoRegionalGenerator';
import type { AdventureProject, UrbanScale, CanonicalThemeSource } from '../../types/map/adventureWorldTypes';

describe('Continental World Generator (Overworld Studio)', () => {
  const TEST_WIDTH = 1600;
  const TEST_HEIGHT = 1600;
  const TEST_SEED = 12345;

  describe('generateProceduralContinentalTerrain', () => {
    it('generates a deterministic terrain grid with organic biomes', () => {
      const terrain1 = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);
      const terrain2 = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);

      expect(Object.keys(terrain1).length).toBeGreaterThan(0);
      expect(terrain1).toEqual(terrain2);

      const biomes = new Set(Object.values(terrain1));
      expect(biomes.has(CELL_BIOME.WATER)).toBe(true);
      expect(biomes.has(CELL_BIOME.GRASS)).toBe(true);
    });

    it('enforces ocean perimeter at borders for continental island morphology', () => {
      const terrain = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);
      // Coordinate (0, 0) and edges should be water
      expect(terrain['0_0']).toBe(CELL_BIOME.WATER);
      expect(terrain['1_1']).toBe(CELL_BIOME.WATER);
    });
  });

  describe('scatterUrbanNodes', () => {
    it('places target number of nodes on walkable land with valid urban scales', () => {
      const terrain = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);
      const nodes = scatterUrbanNodes(TEST_WIDTH, TEST_HEIGHT, TEST_SEED, terrain, 8);

      const nodeCount = Object.keys(nodes).length;
      expect(nodeCount).toBeGreaterThanOrEqual(4);

      for (const node of Object.values(nodes)) {
        expect(node.id).toBeDefined();
        expect(node.name).toBeDefined();
        expect(['metropolis', 'city', 'town', 'village', 'hamlet']).toContain(node.urbanScale);

        // Verify placed on grass/tall grass in world pixels
        const gx = Math.floor((node.x * 2.5) / 32);
        const gy = Math.floor((node.y * 2.5) / 32);
        const biome = terrain[`${gx}_${gy}`];
        expect([CELL_BIOME.GRASS, CELL_BIOME.TALL_GRASS]).toContain(biome);
      }
    });

    it('maintains minimum spatial distance between dispersed nodes', () => {
      const terrain = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);
      const nodes = Object.values(scatterUrbanNodes(TEST_WIDTH, TEST_HEIGHT, TEST_SEED, terrain, 10));

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i]!.x - nodes[j]!.x) * 2.5;
          const dy = (nodes[i]!.y - nodes[j]!.y) * 2.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          expect(dist).toBeGreaterThanOrEqual(370);
        }
      }
    });
  });

  describe('generateRoadNetwork', () => {
    it('guarantees 100% connectivity and 0 orphan nodes via Kruskal MST', () => {
      const terrain = generateProceduralContinentalTerrain(TEST_WIDTH, TEST_HEIGHT, TEST_SEED);
      const nodes = scatterUrbanNodes(TEST_WIDTH, TEST_HEIGHT, TEST_SEED, terrain, 8);
      const nodeIds = Object.keys(nodes);

      const connections = generateRoadNetwork(nodes);
      expect(connections.length).toBeGreaterThanOrEqual(nodeIds.length - 1);

      // Verify full connectivity using BFS
      const adjacency: Record<string, string[]> = {};
      for (const id of nodeIds) adjacency[id] = [];
      for (const [u, v] of connections) {
        adjacency[u]?.push(v);
        adjacency[v]?.push(u);
      }

      const visited = new Set<string>();
      const queue = [nodeIds[0]!];
      visited.add(nodeIds[0]!);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        for (const neighbor of adjacency[curr] ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // All nodes must be reachable from node 0 (0 orphan nodes)
      expect(visited.size).toBe(nodeIds.length);
    });

    it('returns empty array when fewer than 2 nodes', () => {
      expect(generateRoadNetwork({})).toEqual([]);
    });
  });

  describe('generateSvgRoadPathData', () => {
    it('produces valid SVG path string for node connections', () => {
      const nodes = {
        n1: { id: 'n1', name: 'N1', type: 'city' as const, x: 100, y: 150, hasCenter: true, farm: { t: 0, w: 0, m: 0, f: 0 } },
        n2: { id: 'n2', name: 'N2', type: 'city' as const, x: 300, y: 400, hasCenter: true, farm: { t: 0, w: 0, m: 0, f: 0 } }
      };
      const connections: [string, string][] = [['n1', 'n2']];

      const svgPath = generateSvgRoadPathData(nodes, connections);
      expect(svgPath).toBe('M 250 375 L 750 1000');
    });
  });

  describe('bakeUrbanMaquette', () => {
    const testCases: Array<{ scale: UrbanScale; expectedBuildingStyles: string[] }> = [
      { scale: 'metropolis', expectedBuildingStyles: ['silph_tower', 'gym_gold', 'pokecenter', 'pokemart'] },
      { scale: 'city', expectedBuildingStyles: ['gym', 'pokecenter', 'pokemart'] },
      { scale: 'town', expectedBuildingStyles: ['pokecenter', 'pokemart', 'house_blue'] },
      { scale: 'village', expectedBuildingStyles: ['pokecenter', 'house_red'] },
      { scale: 'hamlet', expectedBuildingStyles: ['lab_oak', 'house_red', 'house_blue'] }
    ];

    testCases.forEach(({ scale, expectedBuildingStyles }) => {
      it(`bakes expected buildings and props for ${scale}`, () => {
        const node = {
          id: 'test_node',
          name: 'Test Node',
          type: 'city' as const,
          x: 500,
          y: 500,
          urbanScale: scale,
          hasCenter: true,
          farm: { t: 0, w: 0, m: 0, f: 0 }
        };

        const maquette = bakeUrbanMaquette(node);
        expect(maquette.buildings.length).toBeGreaterThan(0);
        expect(maquette.props.length).toBeGreaterThan(0);

        const styles = maquette.buildings.map(b => b.style);
        for (const expected of expectedBuildingStyles) {
          expect(styles).toContain(expected);
        }
      });
    });
  });

  describe('rasterizeRoadsOnTerrain', () => {
    it('paints DIRT_PATH over land and BRIDGE over water along connections', () => {
      const terrain: Record<string, typeof CELL_BIOME[keyof typeof CELL_BIOME]> = {
        '0_0': CELL_BIOME.GRASS,
        '1_0': CELL_BIOME.WATER,
        '2_0': CELL_BIOME.GRASS
      };
      // Node 1 at (0, 0), Node 2 at (2, 0)
      // Tile 0 is at (0, 0), Tile 1 is at 32px, Tile 2 is at 64px
      // With x * 2.5: x1 = 0 -> px = 0 -> tx = 0
      // x2 = (64 / 2.5) -> px = 64 -> tx = 2
      const nodes = {
        a: { id: 'a', name: 'A', type: 'city' as const, x: 0, y: 0, hasCenter: true, farm: { t: 0, w: 0, m: 0, f: 0 } },
        b: { id: 'b', name: 'B', type: 'city' as const, x: 64 / 2.5, y: 0, hasCenter: true, farm: { t: 0, w: 0, m: 0, f: 0 } }
      };

      rasterizeRoadsOnTerrain(terrain, nodes, [['a', 'b']], 3, 1, 1);

      expect(terrain['0_0']).toBe(CELL_BIOME.DIRT_PATH);
      expect(terrain['1_0']).toBe(CELL_BIOME.BRIDGE);
      expect(terrain['2_0']).toBe(CELL_BIOME.DIRT_PATH);
    });
  });

  describe('generateCompleteContinentalWorld', () => {
    it('executes master pipeline producing terrain, nodes, connections, baked roads, and plazas', () => {
      const result = generateCompleteContinentalWorld({
        width: TEST_WIDTH,
        height: TEST_HEIGHT,
        seed: TEST_SEED,
        cityCount: 6
      });

      expect(result.width).toBe(TEST_WIDTH);
      expect(result.height).toBe(TEST_HEIGHT);
      expect(result.seed).toBe(TEST_SEED);
      expect(Object.keys(result.nodes).length).toBeGreaterThanOrEqual(4);
      expect(result.connections.length).toBeGreaterThan(0);
      expect(result.svgPathData).toContain('M ');

      const biomes = new Set(Object.values(result.customTerrain));
      // Must contain roads, water, and land
      expect(biomes.has(CELL_BIOME.DIRT_PATH)).toBe(true);
      expect(biomes.has(CELL_BIOME.PLAZA_STONE)).toBe(true);
      expect(biomes.has(CELL_BIOME.WATER)).toBe(true);
    });
  });

  describe('exportContinentalRoutesBundle', () => {
    it('formats a game-ready ContinentalRoutesExportBundle for Dijkstra navigation', () => {
      const mockProject: AdventureProject = {
        id: 'proj_test',
        name: 'Continental Region',
        archetype: 'agnostic',
        seed: 777,
        config: {
          treeDensity: 0.7,
          roadWidth: 2,
          autoOcean: true,
          autoBuildings: true
        },
        nodes: {
          n1: { id: 'n1', name: 'Start Town', type: 'city', x: 200, y: 200, urbanScale: 'hamlet', hasCenter: false, farm: { t: 0, w: 0, m: 0, f: 0 } },
          n2: { id: 'n2', name: 'Capital City', type: 'league', x: 600, y: 600, urbanScale: 'metropolis', hasCenter: true, farm: { t: 0, w: 0, m: 0, f: 0 } }
        },
        connections: [['n1', 'n2']],
        customTerrain: {},
        updatedAt: '2026-09-06T00:00:00.000Z'
      };

      const bundle = exportContinentalRoutesBundle(mockProject, 2000, 2000);

      expect(bundle.version).toBe('1.0.0');
      expect(bundle.archetype).toBe('agnostic');
      expect(bundle.seed).toBe(777);
      expect(bundle.worldWidth).toBe(2000);
      expect(bundle.worldHeight).toBe(2000);
      expect(bundle.nodes).toEqual(mockProject.nodes);
      expect(bundle.connections).toEqual(mockProject.connections);
      expect(bundle.svgPathData).toBe('M 500 500 L 1500 1500');
      expect(bundle.exportedAt).toBeDefined();
    });
  });

  describe('Anti-Frankenstein & GBA Theme Isolation', () => {
    it('strictly isolates canonical GBA palettes and rejects cross-game mixing', () => {
      const themes: CanonicalThemeSource[] = ['firered', 'emerald', 'ruby_sapphire'];
      for (const theme of themes) {
        expect(validateAntiFrankensteinPalette(theme)).toBe(true);

        const result = generateCompleteContinentalWorld({
          width: 800,
          height: 800,
          seed: 42,
          config: { themeSource: theme, treeDensity: 0.7, roadWidth: 2, autoOcean: true, autoBuildings: true }
        });

        expect(result.themeSource).toBe(theme);
        expect(result.themePalette).toBeDefined();
        expect(result.themePalette.grass).toBeDefined();

        // Biome canonical tile lookup
        const grassTile = getCanonicalTileForBiome(CELL_BIOME.GRASS, theme);
        const waterTile = getCanonicalTileForBiome(CELL_BIOME.WATER, theme);
        const pathTile = getCanonicalTileForBiome(CELL_BIOME.DIRT_PATH, theme);
        const mountainTile = getCanonicalTileForBiome(CELL_BIOME.MOUNTAIN_DIRT, theme);

        expect(grassTile).toBe(result.themePalette.grass);
        expect(waterTile).toBe(result.themePalette.water.center);
        expect(pathTile).toBe(result.themePalette.path.center);
        expect(mountainTile).toBeDefined();
      }
    });

    it('returns different canonical tree / grass tiles for FireRed vs Hoenn themes', () => {
      const frGrass = getCanonicalTileForBiome(CELL_BIOME.GRASS, 'firered');
      const rsGrass = getCanonicalTileForBiome(CELL_BIOME.GRASS, 'ruby_sapphire');

      expect(frGrass).toBe('tile_vegetation_184ee2f2ca');
      expect(rsGrass).toBe('tile_vegetation_0036b62873');
      expect(frGrass).not.toBe(rsGrass);
    });
  });
});
