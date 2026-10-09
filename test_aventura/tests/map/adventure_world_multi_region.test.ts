import { describe, it, expect } from 'vitest';
import {
  getKantoDefaultProject,
  getJohtoDefaultProject,
  getBlankDefaultProject,
  STAMPING_PREFABS_CATALOG,
  JohtoRegionalWorldGenerator
} from '../../logic/map/regionRegistry';
import {
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  OccupancyGrid
} from '../../logic/map/kantoRegionalGenerator';
import { DynamicCatalogLoader } from '../../logic/map/kantoTileEngine';

describe('Multi-Region World Projects & Regional Registry', () => {
  it('instantiates Kanto and Johto canonical projects with valid contracts', () => {
    const kanto = getKantoDefaultProject();
    expect(kanto.id).toBe('kanto_canonical');
    expect(kanto.archetype).toBe('kanto');
    expect(Object.keys(kanto.nodes).length).toBeGreaterThan(40);
    expect(kanto.connections.length).toBeGreaterThan(40);
    expect(kanto.nodes.pallet?.name).toBe('Pueblo Paleta');

    const johto = getJohtoDefaultProject();
    expect(johto.id).toBe('johto_canonical');
    expect(johto.archetype).toBe('johto');
    expect(Object.keys(johto.nodes).length).toBeGreaterThan(40);
    expect(johto.connections.length).toBeGreaterThan(40);
    expect(johto.nodes.newbark?.name).toBe('Pueblo Primavera');
    expect(johto.nodes.goldenrod?.name).toBe('Ciudad Trigal');

    const blank = getBlankDefaultProject('Test Region');
    expect(blank.archetype).toBe('blank');
    expect(Object.keys(blank.nodes).length).toBe(0);
  });

  it('validates stamping prefabs catalog contains valid GBA structures', () => {
    expect(STAMPING_PREFABS_CATALOG.length).toBeGreaterThan(10);
    const pokecenter = STAMPING_PREFABS_CATALOG.find((p) => p.id === 'pokecenter');
    expect(pokecenter).toBeDefined();
    expect(pokecenter?.category).toBe('buildings');
    expect(pokecenter?.width).toBe(160);

    const snorlax = STAMPING_PREFABS_CATALOG.find((p) => p.id === 'poke_snorlax');
    expect(snorlax).toBeDefined();
    expect(snorlax?.category).toBe('props');
  });

  it('generates Johto procedural world with Lake of Rage, Mt. Silver and buildings', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new JohtoRegionalWorldGenerator(loader);
    const johto = getJohtoDefaultProject();

    generator.generate(johto.nodes, johto.connections, 108);

    // Verify Lake of Rage has water
    const lakeRow = generator.grid[22];
    expect(lakeRow?.[76]).toBe(CELL_BIOME.WATER);
    expect(generator.occupancy.has(76, 22, OCCUPANCY_FLAGS.WATER)).toBe(true);

    // Verify Mt. Silver has mountain dirt and cliff occupancy
    const mountainRow = generator.grid[75];
    expect(mountainRow?.[105]).toBe(CELL_BIOME.MOUNTAIN_DIRT);
    expect(generator.occupancy.has(105, 75, OCCUPANCY_FLAGS.CLIFF)).toBe(true);

    // Verify buildings were placed in Johto
    expect(generator.buildings.length).toBeGreaterThan(5);
    const hasRadioTower = generator.buildings.some((b) => b.style === 'silph_tower');
    expect(hasRadioTower).toBe(true);
  });

  it('paints terrain and keeps collision matrix synchronized', () => {
    const grid = Array.from({ length: 50 }, () => new Uint8Array(50).fill(CELL_BIOME.GRASS));
    const occupancy = new OccupancyGrid(50, 50);

    // Paint 2x2 water at (10, 10)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = 10 + dx;
        const y = 10 + dy;
        const row = grid[y];
        if (row) row[x] = CELL_BIOME.WATER;
        occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
        occupancy.clear(x, y, OCCUPANCY_FLAGS.ROAD);
      }
    }

    expect(grid[10]?.[10]).toBe(CELL_BIOME.WATER);
    expect(occupancy.has(10, 10, OCCUPANCY_FLAGS.WATER)).toBe(true);
    expect(occupancy.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(false);

    // Repaint to road (dirt path)
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = 10 + dx;
        const y = 10 + dy;
        const row = grid[y];
        if (row) row[x] = CELL_BIOME.DIRT_PATH;
        occupancy.set(x, y, OCCUPANCY_FLAGS.ROAD);
        occupancy.clear(x, y, OCCUPANCY_FLAGS.WATER);
      }
    }

    expect(grid[10]?.[10]).toBe(CELL_BIOME.DIRT_PATH);
    expect(occupancy.has(10, 10, OCCUPANCY_FLAGS.WATER)).toBe(false);
    expect(occupancy.has(10, 10, OCCUPANCY_FLAGS.ROAD)).toBe(true);
  });

  it('respects procedural configuration toggles (autoOcean and autoBuildings)', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new JohtoRegionalWorldGenerator(loader);
    const johto = getJohtoDefaultProject();

    // Generate without autoOcean and without autoBuildings
    generator.generate(johto.nodes, johto.connections, 108, {
      treeDensity: 0.5,
      roadWidth: 2,
      autoOcean: false,
      autoBuildings: false
    });

    // Lake of Rage location should NOT be water because autoOcean is false
    const lakeRow = generator.grid[22];
    expect(lakeRow?.[76]).toBe(CELL_BIOME.GRASS);
    expect(generator.occupancy.has(76, 22, OCCUPANCY_FLAGS.WATER)).toBe(false);

    // Buildings array should be empty because autoBuildings is false
    expect(generator.buildings.length).toBe(0);
  });

  it('synchronizes custom structure placement to occupancy matrix', () => {
    const loader = new DynamicCatalogLoader();
    const generator = new JohtoRegionalWorldGenerator(loader);
    const johto = getJohtoDefaultProject();
    generator.generate(johto.nodes, johto.connections, 108);

    // Place custom Pokecenter at px (500, 600) with size 80x70
    const tx = Math.floor(500 / 32); // 15
    const ty = Math.floor(600 / 32); // 18
    const bw = Math.ceil(80 / 32);  // 3
    const bh = Math.ceil(70 / 32);  // 3

    generator.buildings.push({ style: 'pokecenter', x: 500, y: 600, w: 80, h: 70 });
    generator.occupancy.reserveRect(tx, ty, bw, bh, OCCUPANCY_FLAGS.BUILDING);

    expect(generator.occupancy.has(tx, ty, OCCUPANCY_FLAGS.BUILDING)).toBe(true);
    expect(generator.occupancy.has(tx + 1, ty + 1, OCCUPANCY_FLAGS.BUILDING)).toBe(true);
  });
});
