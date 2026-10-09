import { describe, it, expect } from 'vitest';
import { resolveRmxpSubtiles } from '../../logic/map/kantoTileEngine';
import { CELL_BIOME, KantoRegionalWorldGenerator, type KantoNodeCoordinate } from '../../logic/map/kantoRegionalGenerator';
import { DynamicCatalogLoader } from '../../logic/map/kantoTileEngine';
import { placeProceduralTownArchitectures } from '../../logic/map/kantoProceduralCarver';

describe('RMXP Cliffs, Water and Procedural Urban Architecture', () => {
  describe('Water Autotile Quadrants', () => {
    it('resolves distinct inner corner subtiles (not outer corners) when diagonal neighbor is grass', () => {
      // 3x3 grid: center cell at (1,1) is WATER
      // Surrounded by water on cardinal sides: N, S, W, E
      // But NW diagonal (0,0) is GRASS (0)
      const grid = [
        new Uint8Array([CELL_BIOME.GRASS, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER])
      ];

      const res = resolveRmxpSubtiles(grid, 1, 1, CELL_BIOME.WATER);

      // Top-Left quadrant must be Inner TL at (sx: 32, sy: 0), NOT Outer TL at (sx: 0, sy: 32)
      expect(res.tl.sx).toBe(32);
      expect(res.tl.sy).toBe(0);

      // Other quadrants with full water neighbors must be Center
      expect(res.tr.sx).toBe(48);
      expect(res.tr.sy).toBe(64);
      expect(res.bl.sx).toBe(32);
      expect(res.bl.sy).toBe(80);
      expect(res.br.sx).toBe(48);
      expect(res.br.sy).toBe(80);
    });

    it('resolves Inner TR, Inner BL, and Inner BR when other diagonals are grass', () => {
      // NE diagonal is grass
      const gridNE = [
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.GRASS]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER])
      ];
      const resNE = resolveRmxpSubtiles(gridNE, 1, 1, CELL_BIOME.WATER);
      expect(resNE.tr.sx).toBe(48);
      expect(resNE.tr.sy).toBe(0); // Inner TR

      // SW diagonal is grass
      const gridSW = [
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.GRASS, CELL_BIOME.WATER, CELL_BIOME.WATER])
      ];
      const resSW = resolveRmxpSubtiles(gridSW, 1, 1, CELL_BIOME.WATER);
      expect(resSW.bl.sx).toBe(32);
      expect(resSW.bl.sy).toBe(16); // Inner BL

      // SE diagonal is grass
      const gridSE = [
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.WATER]),
        new Uint8Array([CELL_BIOME.WATER, CELL_BIOME.WATER, CELL_BIOME.GRASS])
      ];
      const resSE = resolveRmxpSubtiles(gridSE, 1, 1, CELL_BIOME.WATER);
      expect(resSE.br.sx).toBe(48);
      expect(resSE.br.sy).toBe(16); // Inner BR
    });
  });

  describe('Procedural Town Architecture Overlap Prevention', () => {
    it('guarantees zero bounding box collisions between any pair of placed buildings in procedural towns', () => {
      const loader = new DynamicCatalogLoader();
      const gen = new KantoRegionalWorldGenerator(loader);
      gen.seed = 12345;

      // Initialize grid and elevation to 128x128
      gen.grid = Array.from({ length: 128 }, () => new Uint8Array(128).fill(CELL_BIOME.GRASS));
      gen.elevation = Array.from({ length: 128 }, () => new Uint8Array(128).fill(1));

      const nodes: Record<string, KantoNodeCoordinate> = {
        city_alpha: { id: 'city_alpha', name: 'Metro Alpha', type: 'town', x: 1200, y: 1200 },
        city_beta: { id: 'city_beta', name: 'Bastion Beta', type: 'town', x: 2400, y: 2400 }
      };

      gen.generate(nodes, [], 12345, { autoOcean: false, autoBuildings: true, treeDensity: 0.7, roadWidth: 2 });

      const buildings = gen.buildings;
      expect(buildings.length).toBeGreaterThan(0);

      // Verify every pair of buildings does not overlap (with minimum margin)
      for (let i = 0; i < buildings.length; i++) {
        const b1 = buildings[i]!;
        const b1w = b1.w ?? 128;
        const b1h = b1.h ?? 128;
        for (let j = i + 1; j < buildings.length; j++) {
          const b2 = buildings[j]!;
          const b2w = b2.w ?? 128;
          const b2h = b2.h ?? 128;

          const overlapX = (b1.x < b2.x + b2w) && (b1.x + b1w > b2.x);
          const overlapY = (b1.y < b2.y + b2h) && (b1.y + b1h > b2.y);

          const collides = overlapX && overlapY;
          if (collides) {
            console.error(`Collision detected between ${b1.style} at (${b1.x},${b1.y},${b1w}x${b1h}) and ${b2.style} at (${b2.x},${b2.y},${b2w}x${b2h})`);
          }
          expect(collides).toBe(false);
        }
      }
    });

    it('guarantees buildings are never placed on mountain elevation (>= 2) or water', () => {
      const loader = new DynamicCatalogLoader();
      const gen = new KantoRegionalWorldGenerator(loader);
      gen.seed = 9999;

      gen.grid = Array.from({ length: 128 }, () => new Uint8Array(128).fill(CELL_BIOME.GRASS));
      gen.elevation = Array.from({ length: 128 }, () => new Uint8Array(128).fill(1));

      // Put a mountain ridge right next to city center
      const T = 32;
      const cx = 50;
      const cy = 50;
      for (let y = cy - 6; y <= cy + 6; y++) {
        for (let x = cx + 2; x <= cx + 10; x++) {
          gen.grid[y]![x] = CELL_BIOME.MOUNTAIN_DIRT;
          gen.elevation[y]![x] = 3;
        }
      }

      const nodes: Record<string, KantoNodeCoordinate> = {
        mountain_city: { id: 'mountain_city', name: 'Cliffview', type: 'town', x: cx * T, y: cy * T }
      };

      placeProceduralTownArchitectures(gen, nodes);

      for (const b of gen.buildings) {
        const bx = Math.floor(b.x / T);
        const by = Math.floor(b.y / T);
        const bw = Math.ceil((b.w ?? 128) / T);
        const bh = Math.ceil((b.h ?? 128) / T);

        for (let y = by; y < by + bh; y++) {
          for (let x = bx; x < bx + bw; x++) {
            const elev = gen.elevation[y]?.[x] ?? 1;
            const biome = gen.grid[y]?.[x] ?? CELL_BIOME.GRASS;
            expect(elev).toBeLessThan(2);
            expect(biome).not.toBe(CELL_BIOME.WATER);
          }
        }
      }
    });

    it('guarantees zero collisions between canonical town architecture buildings in Kanto', () => {
      const loader = new DynamicCatalogLoader();
      const gen = new KantoRegionalWorldGenerator(loader);
      gen.seed = 42;

      const nodes: Record<string, KantoNodeCoordinate> = {
        pallet: { id: 'pallet', name: 'Pallet Town', type: 'town', x: 500, y: 1400 },
        viridian: { id: 'viridian', name: 'Viridian City', type: 'town', x: 500, y: 1100 },
        pewter: { id: 'pewter', name: 'Pewter City', type: 'town', x: 500, y: 400 },
        cerulean: { id: 'cerulean', name: 'Cerulean City', type: 'town', x: 800, y: 650 },
        saffron: { id: 'saffron', name: 'Saffron City', type: 'town', x: 800, y: 950 },
        celadon: { id: 'celadon', name: 'Celadon City', type: 'town', x: 550, y: 950 },
        vermilion: { id: 'vermilion', name: 'Vermilion City', type: 'town', x: 800, y: 1250 },
        lavender: { id: 'lavender', name: 'Lavender Town', type: 'town', x: 1100, y: 950 },
        fuchsia: { id: 'fuchsia', name: 'Fuchsia City', type: 'town', x: 800, y: 1500 },
        cinnabar: { id: 'cinnabar', name: 'Cinnabar Island', type: 'town', x: 350, y: 1600 }
      };

      gen.generate(nodes, [], 42, { autoOcean: false, autoBuildings: true, treeDensity: 0.7, roadWidth: 2 });

      const buildings = gen.buildings;
      expect(buildings.length).toBeGreaterThan(0);

      for (let i = 0; i < buildings.length; i++) {
        const b1 = buildings[i]!;
        const b1w = b1.w ?? 128;
        const b1h = b1.h ?? 128;
        for (let j = i + 1; j < buildings.length; j++) {
          const b2 = buildings[j]!;
          const b2w = b2.w ?? 128;
          const b2h = b2.h ?? 128;

          const overlapX = (b1.x < b2.x + b2w) && (b1.x + b1w > b2.x);
          const overlapY = (b1.y < b2.y + b2h) && (b1.y + b1h > b2.y);

          const collides = overlapX && overlapY;
          if (collides) {
            console.error(`Canonical collision between ${b1.style} at (${b1.x},${b1.y},${b1w}x${b1h}) and ${b2.style} at (${b2.x},${b2.y},${b2w}x${b2h})`);
          }
          expect(collides).toBe(false);
        }
      }
    });
  });
});
