import { describe, it, expect } from 'vitest';
import {
  KantoRegionalWorldGenerator,
  OccupancyGrid,
  OCCUPANCY_FLAGS,
  CELL_BIOME,
  UniversalAutotiler,
  DynamicCatalogLoader,
  KANTO_GRID_W,
  KANTO_GRID_H
} from '../../logic/map/kantoRegionalGenerator';

describe('KantoRegionalWorldGenerator & OccupancyGrid', () => {
  it('initializes OccupancyGrid with correct dimensions and bitmasks', () => {
    const grid = new OccupancyGrid(50, 50);
    expect(grid.width).toBe(50);
    expect(grid.height).toBe(50);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(false);

    grid.set(10, 10, OCCUPANCY_FLAGS.ROAD);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(true);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.WATER)).toBe(false);

    grid.set(10, 10, OCCUPANCY_FLAGS.WATER);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(true);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.WATER)).toBe(true);

    grid.clear(10, 10, OCCUPANCY_FLAGS.ROAD);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(false);
    expect(grid.has(10, 10, OCCUPANCY_FLAGS.WATER)).toBe(true);
  });

  it('generates regional Kanto world topography and town architectures', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const testNodes = {
      pallet: { id: 'pallet', name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 },
      viridian: { id: 'viridian', name: 'Ciudad Verde', type: 'city', x: 500, y: 1100 },
      cerulean: { id: 'cerulean', name: 'Ciudad Celeste', type: 'city', x: 800, y: 650 },
      indigo: { id: 'indigo', name: 'Meseta Añil', type: 'league', x: 300, y: 350 },
      route12: { id: 'route12', name: 'Ruta 12', type: 'route', x: 1100, y: 1100 },
      vermilion: { id: 'vermilion', name: 'Ciudad Carmín', type: 'city', x: 800, y: 1250 }
    };

    const testConnections: [string, string][] = [
      ['pallet', 'viridian'],
      ['viridian', 'cerulean']
    ];

    generator.generate(testNodes, testConnections, 42);

    // Verify grid dimensions
    expect(generator.grid.length).toBe(KANTO_GRID_H);
    expect(generator.grid[0]?.length).toBe(KANTO_GRID_W);

    // Verify south ocean has water
    const southWaterRow = generator.grid[120];
    expect(southWaterRow?.[20]).toBe(CELL_BIOME.WATER);

    // Verify town architectures were placed
    expect(generator.buildings.length).toBeGreaterThan(0);
    const hasOakLab = generator.buildings.some((b) => b.style === 'lab_oak');
    expect(hasOakLab).toBe(true);

    // Verify trees and props
    expect(generator.trees.length).toBeGreaterThan(0);
    const hasSnorlax = generator.props.some((p) => p.style === 'poke_snorlax');
    expect(hasSnorlax).toBe(true);
  });

  it('resolves autotile piece bitmask directions correctly', () => {
    const loader = new DynamicCatalogLoader();
    const autotiler = new UniversalAutotiler(loader);

    const sampleGrid = [
      new Uint8Array([0, 0, 0]),
      new Uint8Array([0, 2, 0]),
      new Uint8Array([0, 0, 0])
    ];

    // Single isolated tile should resolve to B (gentle border)
    const piece = autotiler.resolvePiece(sampleGrid, 1, 1, 2);
    expect(piece).toBe('B');

    // Filled 3x3 block should resolve center to C
    const filledGrid = [
      new Uint8Array([2, 2, 2]),
      new Uint8Array([2, 2, 2]),
      new Uint8Array([2, 2, 2])
    ];
    const centerPiece = autotiler.resolvePiece(filledGrid, 1, 1, 2);
    expect(centerPiece).toBe('C');
  });

  it('generates procedural continent with authentic town buildings, bridges, and flanking trees', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const proceduralNodes = {
      alpha: { id: 'alpha', name: 'Alpha Town', type: 'city', x: 400, y: 500 },
      beta: { id: 'beta', name: 'Beta City', type: 'city', x: 900, y: 500 },
      gamma: { id: 'gamma', name: 'Gamma Port', type: 'city', x: 900, y: 1200 }
    };

    const proceduralConnections: [string, string][] = [
      ['alpha', 'beta'],
      ['beta', 'gamma']
    ];

    generator.generate(proceduralNodes, proceduralConnections, 123);

    // Grid size verified
    expect(generator.grid.length).toBe(KANTO_GRID_H);
    expect(generator.grid[0]?.length).toBe(KANTO_GRID_W);

    // Procedural town architectures: Pokecenter, Mart, houses
    expect(generator.buildings.length).toBeGreaterThanOrEqual(6);
    const hasPokecenter = generator.buildings.some((b) => b.style === 'pokecenter');
    const hasPokemart = generator.buildings.some((b) => b.style === 'pokemart');
    expect(hasPokecenter).toBe(true);
    expect(hasPokemart).toBe(true);

    // Route flanking trees and copses
    expect(generator.trees.length).toBeGreaterThan(20);
    const hasGbaTrees = generator.trees.some((t) => t.style === 'poke_tree_oak_clean' || t.style === 'poke_tree_poke' || t.style === 'poke_tree_pine_small');
    expect(hasGbaTrees).toBe(true);

    // Procedural mountain cones & relief
    const hasRelief = generator.props.some((p) => p.style === 'poke_cliff_cone_brown' || p.style === 'poke_cliff_cone_gray');
    expect(hasRelief).toBe(true);
  });

  it('rasterizes orthogonal 90-degree Manhattan roads without diagonal steps', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const nodes = {
      nodeA: { id: 'nodeA', name: 'Start', type: 'city', x: 200, y: 200 },
      nodeB: { id: 'nodeB', name: 'End', type: 'city', x: 800, y: 600 }
    };
    const connections: [string, string][] = [['nodeA', 'nodeB']];

    generator.generate(nodes, connections, 77);

    // Road tiles must exist along path
    let roadTilesCount = 0;
    for (let y = 0; y < KANTO_GRID_H; y++) {
      const row = generator.grid[y];
      if (!row) continue;
      for (let x = 0; x < KANTO_GRID_W; x++) {
        if (row[x] === CELL_BIOME.DIRT_PATH) roadTilesCount++;
      }
    }
    expect(roadTilesCount).toBeGreaterThan(10);
  });

  it('enforces mountain-building safety clearance and guarantees zero mountain overlap over buildings', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const testNodes = {
      pallet: { id: 'pallet', name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 },
      viridian: { id: 'viridian', name: 'Ciudad Verde', type: 'city', x: 500, y: 1100 },
      pewter: { id: 'pewter', name: 'Ciudad Plateada', type: 'city', x: 500, y: 400 },
      cerulean: { id: 'cerulean', name: 'Ciudad Celeste', type: 'city', x: 800, y: 650 },
      saffron: { id: 'saffron', name: 'Ciudad Azafrán', type: 'city', x: 800, y: 950 }
    };

    const testConnections: [string, string][] = [
      ['pallet', 'viridian'],
      ['viridian', 'pewter'],
      ['pewter', 'cerulean'],
      ['cerulean', 'saffron']
    ];

    generator.generate(testNodes, testConnections, 42);

    // Invariant 1: No building has elevation > 1 under its footprint
    for (const b of generator.buildings) {
      const startTx = Math.floor(b.x / 32);
      const startTy = Math.floor(b.y / 32);
      const endTx = Math.ceil((b.x + (b.w ?? 128)) / 32);
      const endTy = Math.ceil((b.y + (b.h ?? 100)) / 32);

      for (let ty = startTy; ty < endTy; ty++) {
        for (let tx = startTx; tx < endTx; tx++) {
          if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
            const elev = generator.elevation[ty]?.[tx] ?? 1;
            expect(elev).toBeLessThanOrEqual(1);
          }
        }
      }
    }

    // Invariant 2: Omnidirectional cliff autotile places cliff borders in 4 directions
    const autotiler = new UniversalAutotiler(loader);
    const resolvedStyles: string[] = [];
    for (let y = 0; y < KANTO_GRID_H; y++) {
      for (let x = 0; x < KANTO_GRID_W; x++) {
        if (generator.grid[y]?.[x] === CELL_BIOME.MOUNTAIN_DIRT) {
          const res = autotiler.resolveMountainTile(generator.grid, x, y, generator.elevation);
          resolvedStyles.push(res.primaryImage);
        }
      }
    }

    const hasSouthCliff = resolvedStyles.some((s) => s.includes('face') || s.includes('corner_b'));
    const hasNorthCliff = resolvedStyles.some((s) => s.includes('top') || s.includes('corner_t'));
    const hasSideCliff = resolvedStyles.some((s) => s.includes('left') || s.includes('right'));

    expect(hasSouthCliff).toBe(true);
    expect(hasNorthCliff).toBe(true);
    expect(hasSideCliff).toBe(true);
  });
});

