import { describe, it, expect } from 'vitest';
import {
  KantoRegionalWorldGenerator,
  DynamicCatalogLoader,
  CELL_BIOME,
  KANTO_GRID_W,
  KANTO_GRID_H
} from '../../logic/map/kantoRegionalGenerator';

describe('Fill-First Regional Map Generator & Carver Pipeline', () => {
  it('defines CELL_BIOME.FOREST_WALL as 8', () => {
    expect((CELL_BIOME as Record<string, number>).FOREST_WALL).toBe(8);
  });

  it('populates uncarved inland terrain as dense FOREST_WALL instead of raw empty GRASS', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const testNodes = {
      pallet: { id: 'pallet', name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 },
      viridian: { id: 'viridian', name: 'Ciudad Verde', type: 'city', x: 500, y: 1100 }
    };

    const testConnections: [string, string][] = [
      ['pallet', 'viridian']
    ];

    generator.generate(testNodes, testConnections, 42);

    let forestCount = 0;
    let grassCount = 0;
    let waterCount = 0;
    let mountainCount = 0;

    for (let y = 0; y < KANTO_GRID_H; y++) {
      const row = generator.grid[y];
      if (!row) continue;
      for (let x = 0; x < KANTO_GRID_W; x++) {
        const cell = row[x];
        if (cell === (CELL_BIOME as Record<string, number>).FOREST_WALL) forestCount++;
        else if (cell === CELL_BIOME.GRASS) grassCount++;
        else if (cell === CELL_BIOME.WATER) waterCount++;
        else if (cell === CELL_BIOME.MOUNTAIN_DIRT) mountainCount++;
      }
    }

    const totalCells = KANTO_GRID_W * KANTO_GRID_H;
    // Under Fill-First paradigm, FOREST_WALL should cover at least 25% of the regional world
    expect(forestCount).toBeGreaterThan(totalCells * 0.25);
    // Flat raw empty grass should be strictly confined to carved corridors and town clearings (< 25% of the world)
    expect(grassCount).toBeLessThan(totalCells * 0.25);
  });

  it('ensures Pallet Town (rural archetype) does not contain PLAZA_STONE slabs', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const testNodes = {
      pallet: { id: 'pallet', name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 }
    };

    generator.generate(testNodes, [], 42);

    const pt = generator.nodeToTile(500, 1400);
    // Sample a 10x10 tile box around Pallet Town center
    let plazaStoneCount = 0;
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const tx = pt.tx + dx;
        const ty = pt.ty + dy;
        if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
          if (generator.grid[ty]?.[tx] === CELL_BIOME.PLAZA_STONE) {
            plazaStoneCount++;
          }
        }
      }
    }

    // Rural village must use natural grass & dirt paths, ZERO parking lot stone slabs
    expect(plazaStoneCount).toBe(0);
  });

  it('carves corridor with dirt path and tall grass between connected settlements', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new KantoRegionalWorldGenerator(loader);

    const testNodes = {
      pallet: { id: 'pallet', name: 'Pueblo Paleta', type: 'city', x: 500, y: 1400 },
      viridian: { id: 'viridian', name: 'Ciudad Verde', type: 'city', x: 500, y: 1100 }
    };

    generator.generate(testNodes, [['pallet', 'viridian']], 42);

    const pt = generator.nodeToTile(500, 1400);
    const vr = generator.nodeToTile(500, 1100);

    // Sample midpoint on Route 1
    const midY = Math.floor((pt.ty + vr.ty) / 2);
    const row = generator.grid[midY];
    expect(row).toBeDefined();

    // Check corridor slice at midY across X
    let hasPath = false;
    let hasTallGrass = false;
    let hasForestWall = false;

    for (let x = 0; x < KANTO_GRID_W; x++) {
      const c = row?.[x];
      if (c === CELL_BIOME.DIRT_PATH) hasPath = true;
      if (c === CELL_BIOME.TALL_GRASS) hasTallGrass = true;
      if (c === (CELL_BIOME as Record<string, number>).FOREST_WALL) hasForestWall = true;
    }

    expect(hasPath).toBe(true);
    expect(hasTallGrass).toBe(true);
    expect(hasForestWall).toBe(true);
  });
});
