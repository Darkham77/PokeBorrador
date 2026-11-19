/**
 * test_aventura/tests/map/continentPaintEngine.test.ts
 *
 * TIER 1 & TIER 2 CLOSED-LOOP TESTS FOR CREATIVE CONTINENT PAINT ENGINE & MANUAL EDIT PERSISTENCE
 *
 * Validates:
 *   1. Substrate terrain targets ('terrain_water_deep', 'terrain_water', 'terrain_sand', 'terrain_grass').
 *   2. Macro-biome painting across all 5 ecological biomes + containment buffer sync.
 *   3. Elevation sculpting (+1/-1), massif palette repaint, and 2-wide mountain stairs stamping.
 *   4. Open-field 'path_dirt' painting via editor-only `manualPathGrid` and blitter visibility parity.
 *   5. Water-only 'bridge_wood' masking & boardwalk blit generation.
 *   6. Wilderness painting ('wilderness_tall_grass', 'wilderness_tree', 'wilderness_prop') & 'eraser_overlay'.
 *   7. Geometry modes: Bresenham 'line', bounded BFS 'fill' (4096 cap), and 'eyedropper' priority sampling.
 *   8. Store Undo/Redo delta parity & sparse `manualMapEdits` JSON export -> regeneration -> rehydration roundtrip.
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { MAX_BRUSH_ELEVATION_TIER, MAX_FLOOD_FILL_CELLS } from '../../config/brushConfig.ts';
import { scanContinentAutotileDefects } from '../../logic/map/autotileDefectScanner.ts';
import { healContinentAt } from '../../logic/map/autotileHealingEngine.ts';
import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer.ts';
import type { ContinentProjectExportPayload } from '../../logic/map/continent/regionalPersistenceHelper.ts';
import { type ContinentMapResult } from '../../logic/map/continentGenerator.ts';
import {
  executeFullWorkerGeneration,
  executeHealAllWorkerJob,
  executePresetWorkerJob
} from '../../logic/map/continentGenerator.worker.ts';
import {
  floodFillContinentAt,
  paintContinentCells,
  paintContinentLine,
  sampleContinentCellAt
} from '../../logic/map/continentPaintEngine.ts';
import { compileGeologicalAutotiling } from '../../logic/map/geologicalAutotilingEngine.ts';
import type { MacroBiome, MacroBiomeResult } from '../../logic/map/macroBiomeSynthesizer.ts';
import { resolvePathGrid, sanitizePathGridWidth } from '../../logic/map/pathAutotileEngine.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import type { WildernessLayerResult } from '../../logic/map/wildernessVegetationEngine.ts';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type {
  BrushConfigState,
  ContinentPaintMutationResult,
  ContinentPaintStateInput,
  TerrainPaintTarget
} from '../../types/map/continentBrushTypes.ts';
import { PACKED_BLIT_STRIDE } from '../../types/map/continentTypes.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

function withMutationResult(
  baseState: ContinentPaintStateInput,
  mutation: Pick<
    ContinentPaintMutationResult,
    'continent' | 'pathGrid' | 'manualPathGrid' | 'bridgeGrid' | 'wilderness'
  >
): ContinentPaintStateInput {
  return {
    ...baseState,
    ...mutation
  };
}

function createEmptyGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
}

function buildSyntheticState(width = 24, height = 24): ContinentPaintStateInput {
  const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: height }, () =>
    Array<WaterTerrainKind>(width).fill('grass')
  );
  const heightmap: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));
  const biomeGrid: MacroBiome[][] = Array.from({ length: height }, () =>
    Array<MacroBiome>(width).fill('temperate_meadow')
  );
  const macroBiomes: MacroBiomeResult = {
    biomeGrid,
    transitionBufferGrid: createEmptyGrid(width, height),
    temperatureMap: new Float32Array(width * height),
    moistureMap: new Float32Array(width * height),
    stats: {
      temperate_meadow: width * height,
      mint_highland: 0,
      viridian_forest: 0,
      arid_desert: 0,
      volcanic_plateau: 0
    }
  };

  const geo = compileGeologicalAutotiling(terrainMatrix, heightmap, macroBiomes, {
    mountainPalette: 'brown'
  });

  const continent: ContinentMapResult = {
    width,
    height,
    seed: 7,
    mountainPalette: 'brown',
    terrainMatrix,
    heightmap,
    macroBiomes,
    resolvedWater: geo.resolvedWater,
    resolvedMountain: geo.resolvedMountain,
    resolvedMacroBiomes: geo.resolvedMacroBiomes,
    geologicalClusters: {
      massifs: [],
      paletteMatrix: Array.from({ length: height }, () =>
        Array<'brown' | 'gray' | 'volcanic'>(width).fill('brown')
      ),
      massifIdMatrix: Array.from({ length: height }, () => Array<string | null>(width).fill(null))
    },
    cells: geo.cells,
    placedStairs: []
  };

  const wilderness: WildernessLayerResult = {
    tallGrassGrid: createEmptyGrid(width, height),
    tallGrassPatches: [],
    trees: [],
    props: []
  };

  return {
    continent,
    pathGrid: createEmptyGrid(width, height),
    manualPathGrid: createEmptyGrid(width, height),
    bridgeGrid: createEmptyGrid(width, height),
    wilderness,
    pois: []
  };
}

function makeConfig(overrides?: Partial<BrushConfigState>): BrushConfigState {
  return {
    mode: 'paint',
    shape: 'square',
    size: 3,
    paintTarget: 'terrain_grass',
    mountainPalette: 'brown',
    mountainPolicy: 'erode',
    autoHealOnPaint: true,
    ...overrides
  };
}

function isCleanInteriorTile(
  continent: ContinentMapResult,
  bridgeGrid: readonly (readonly boolean[])[],
  pathGrid: readonly (readonly boolean[])[],
  cx: number,
  cy: number
): boolean {
  return (
    continent.terrainMatrix[cy]?.[cx] === 'grass' &&
    (continent.heightmap[cy]?.[cx] ?? 0) === 0 &&
    !continent.resolvedMountain.occupiedFootCells[cy]?.[cx] &&
    !bridgeGrid[cy]?.[cx] &&
    !pathGrid[cy]?.[cx]
  );
}

function findCleanInteriorCenter(
  continent: ContinentMapResult,
  bridgeGrid: readonly (readonly boolean[])[],
  pathGrid: readonly (readonly boolean[])[],
  pois: readonly POINode[],
  margin = 3
): { readonly x: number; readonly y: number } {
  for (let y = margin + 1; y < continent.height - margin - 1; y++) {
    for (let x = margin + 1; x < continent.width - margin - 1; x++) {
      let clean = true;
      for (let dy = -margin; dy <= margin && clean; dy++) {
        for (let dx = -margin; dx <= margin && clean; dx++) {
          if (!isCleanInteriorTile(continent, bridgeGrid, pathGrid, x + dx, y + dy)) {
            clean = false;
          }
        }
      }
      if (!clean) continue;
      const nearPoi = pois.some(
        (p) =>
          x + margin >= p.gridX - 2 &&
          x - margin <= p.gridX + p.footprint.width + 2 &&
          y + margin >= p.gridY - 2 &&
          y - margin <= p.gridY + p.footprint.height + 2
      );
      if (!nearPoi) return { x, y };
    }
  }
  throw new Error('Could not find clean interior grass center in test continent');
}

describe('Continent Creative Model-First Paint Engine & Persistence', () => {
  describe('1. Terrain Substrate & Auto-Heal Behavior', () => {
    it('paints water, buffers water_deep perimeter when autoHealOnPaint=true, and preserves raw deep water when autoHealOnPaint=false', () => {
      const base = buildSyntheticState(24, 24);

      const shallowRes = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_water', size: 3, autoHealOnPaint: true })
      );
      expect(shallowRes.continent.terrainMatrix[10]?.[10]).toBe('water');
      expect(shallowRes.changedCellCount).toBe(9);
      const shallowScan = scanContinentAutotileDefects({
        continent: shallowRes.continent,
        pathGrid: shallowRes.pathGrid
      });
      expect(shallowScan.countsByKind.water_sliver).toBe(0);

      const healedDeep = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_water_deep', size: 5, autoHealOnPaint: true })
      );
      expect(healedDeep.continent.terrainMatrix[10]?.[10]).toBe('water_deep');
      expect(healedDeep.continent.terrainMatrix[8]?.[8]).toBe('water');
      const deepScan = scanContinentAutotileDefects({
        continent: healedDeep.continent,
        pathGrid: healedDeep.pathGrid
      });
      expect(deepScan.countsByKind.ocean_grass_direct_contact).toBe(0);

      const rawDeep = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_water_deep', size: 1, autoHealOnPaint: false })
      );
      expect(rawDeep.continent.terrainMatrix[10]?.[10]).toBe('water_deep');
      expect(rawDeep.continent.terrainMatrix[9]?.[10]).toBe('grass');

      const sandRes = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_sand', size: 3, autoHealOnPaint: true })
      );
      expect(sandRes.continent.terrainMatrix[10]?.[10]).toBe('sand');

      const backToGrass = paintContinentCells(
        withMutationResult(base, sandRes),
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_grass', size: 3, autoHealOnPaint: true })
      );
      expect(backToGrass.continent.terrainMatrix[10]?.[10]).toBe('grass');
    });
  });

  describe('2. Macro-Biomes & Containment Buffer Sync', () => {
    it('supports all 5 macro-biomes and synchronizes transitionBufferGrid for arid and volcanic borders', () => {
      const targetToBiome: Readonly<Record<string, MacroBiome>> = {
        biome_temperate_meadow: 'temperate_meadow',
        biome_mint_highland: 'mint_highland',
        biome_viridian_forest: 'viridian_forest',
        biome_arid_desert: 'arid_desert',
        biome_volcanic_plateau: 'volcanic_plateau'
      };

      const targets: readonly TerrainPaintTarget[] = [
        'biome_mint_highland',
        'biome_viridian_forest',
        'biome_arid_desert',
        'biome_volcanic_plateau',
        'biome_temperate_meadow'
      ];

      for (const target of targets) {
        const state = buildSyntheticState(20, 20);
        const painted = paintContinentCells(
          state,
          [{ x: 10, y: 10 }],
          makeConfig({ paintTarget: target, size: 5, autoHealOnPaint: true })
        );
        expect(painted.continent.macroBiomes?.biomeGrid[10]?.[10]).toBe(targetToBiome[target]);
        if (target === 'biome_arid_desert' || target === 'biome_volcanic_plateau') {
          expect(painted.continent.macroBiomes?.transitionBufferGrid[8]?.[10]).toBe(true);
        }
      }
    });

    it('auto-widens single 1x1 biome, shallow water, sand, and mountain clicks into valid 2x2 shapes with zero defects and zero cone blits', () => {
      const base = buildSyntheticState(20, 20);

      const volcanic1x1 = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'biome_volcanic_plateau', size: 1, autoHealOnPaint: true })
      );
      expect(volcanic1x1.continent.macroBiomes?.biomeGrid[10]?.[10]).toBe('volcanic_plateau');
      expect(
        scanContinentAutotileDefects({
          continent: volcanic1x1.continent,
          pathGrid: volcanic1x1.pathGrid,
          manualPathGrid: volcanic1x1.manualPathGrid,
          bridgeGrid: volcanic1x1.bridgeGrid
        }).totalDefects
      ).toBe(0);

      const water1x1 = paintContinentCells(
        base,
        [{ x: 6, y: 6 }],
        makeConfig({ paintTarget: 'terrain_water', size: 1, autoHealOnPaint: true })
      );
      expect(water1x1.continent.terrainMatrix[6]?.[6]).toBe('water');
      expect(
        scanContinentAutotileDefects({
          continent: water1x1.continent,
          pathGrid: water1x1.pathGrid,
          manualPathGrid: water1x1.manualPathGrid,
          bridgeGrid: water1x1.bridgeGrid
        }).totalDefects
      ).toBe(0);

      const sand1x1 = paintContinentCells(
        base,
        [{ x: 14, y: 14 }],
        makeConfig({ paintTarget: 'terrain_sand', size: 1, autoHealOnPaint: true })
      );
      expect(sand1x1.continent.terrainMatrix[14]?.[14]).toBe('sand');
      expect(
        scanContinentAutotileDefects({
          continent: sand1x1.continent,
          pathGrid: sand1x1.pathGrid,
          manualPathGrid: sand1x1.manualPathGrid,
          bridgeGrid: sand1x1.bridgeGrid
        }).totalDefects
      ).toBe(0);

      const mountain1x1 = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({
          paintTarget: 'elevation_raise',
          size: 1,
          mountainPolicy: 'erode',
          autoHealOnPaint: true
        })
      );
      expect(mountain1x1.continent.heightmap[10]?.[10]).toBe(1);
      expect(
        scanContinentAutotileDefects({
          continent: mountain1x1.continent,
          pathGrid: mountain1x1.pathGrid,
          manualPathGrid: mountain1x1.manualPathGrid,
          bridgeGrid: mountain1x1.bridgeGrid
        }).totalDefects
      ).toBe(0);
      const mountainBlit = buildMapBlitInstructions(
        mountain1x1.continent,
        [],
        mountain1x1.pathGrid,
        mountain1x1.bridgeGrid,
        mountain1x1.wilderness,
        { manualPathGrid: mountain1x1.manualPathGrid }
      );
      expect(mountainBlit.instructions.some((i) => i.filename.includes('poke_cliff_cone_'))).toBe(
        false
      );
    });

    it('seamlessly overwrites special ground biomes with terrain_grass and converts water/sand to land when painting Sierra or Ceniza', () => {
      const base = buildSyntheticState(20, 20);
      const volcanic = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'biome_volcanic_plateau', size: 5, autoHealOnPaint: true })
      );
      expect(volcanic.continent.macroBiomes?.biomeGrid[10]?.[10]).toBe('volcanic_plateau');

      const restoredGrass = paintContinentCells(
        withMutationResult(base, volcanic),
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_grass', size: 5, autoHealOnPaint: true })
      );
      expect(restoredGrass.continent.terrainMatrix[10]?.[10]).toBe('grass');
      expect(restoredGrass.continent.macroBiomes?.biomeGrid[10]?.[10]).toBe('temperate_meadow');

      const waterPatch = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_water', size: 5, autoHealOnPaint: false })
      );
      expect(waterPatch.continent.terrainMatrix[10]?.[10]).toBe('water');

      const sierraOverWater = paintContinentCells(
        withMutationResult(base, waterPatch),
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'biome_mint_highland', size: 3, autoHealOnPaint: true })
      );
      expect(sierraOverWater.continent.terrainMatrix[10]?.[10]).toBe('grass');
      expect(sierraOverWater.continent.macroBiomes?.biomeGrid[10]?.[10]).toBe('mint_highland');
    });
  });

  describe('3. Elevation Sculpting, Massif Palette & 2-Tile Stairs', () => {
    it('raises/lowers elevation within limits, recolors massif palettes, and stamps valid 2-wide mountain stairs', () => {
      const base = buildSyntheticState(24, 24);
      const raised = paintContinentCells(
        base,
        [{ x: 10, y: 10 }],
        makeConfig({
          paintTarget: 'elevation_raise',
          size: 5,
          mountainPalette: 'gray',
          autoHealOnPaint: true
        })
      );
      expect(raised.continent.heightmap[10]?.[10]).toBe(1);
      expect(raised.continent.geologicalClusters?.paletteMatrix[10]?.[10]).toBe('gray');
      expect(raised.continent.resolvedMountain.cellDetails[12]?.[10]?.role).toBe('edge_south_top');

      const recolored = paintContinentCells(
        withMutationResult(base, raised),
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'mountain_palette', size: 5, mountainPalette: 'brown' })
      );
      expect(recolored.continent.geologicalClusters?.paletteMatrix[10]?.[10]).toBe('brown');
      expect(recolored.continent.resolvedMountain.cellDetails[8]?.[10]?.primaryTile).toContain(
        'poke_cliff_brown'
      );

      // Click either on the south rim top row (y = 12) or its projected cliff foot (y = 13)
      const withStair = paintContinentCells(
        withMutationResult(base, recolored),
        [{ x: 10, y: 13 }],
        makeConfig({ paintTarget: 'mountain_stair', size: 1 })
      );
      expect(withStair.continent.placedStairs).toHaveLength(1);
      const st = withStair.continent.placedStairs[0]!;
      expect(st.y).toBe(12);
      expect(withStair.continent.resolvedMountain.cellDetails[12]?.[st.x]?.role).toBe('stairs_l');
      expect(withStair.continent.resolvedMountain.cellDetails[12]?.[st.x + 1]?.role).toBe(
        'stairs_r'
      );

      // Lowering elevation removes stair cleanly when cliff disappears
      const lowered = paintContinentCells(
        withMutationResult(base, withStair),
        [{ x: 10, y: 12 }],
        makeConfig({ paintTarget: 'elevation_lower', size: 5, autoHealOnPaint: true })
      );
      expect(lowered.continent.heightmap[12]?.[10]).toBe(0);
      expect(lowered.continent.placedStairs).toHaveLength(0);

      // Tier ceiling stays bounded by MAX_BRUSH_ELEVATION_TIER
      let stacked = base;
      for (let i = 0; i < MAX_BRUSH_ELEVATION_TIER + 2; i++) {
        stacked = withMutationResult(
          base,
          paintContinentCells(
            stacked,
            [{ x: 10, y: 10 }],
            makeConfig({ paintTarget: 'elevation_raise', size: 5, autoHealOnPaint: false })
          )
        );
      }
      expect(stacked.continent.heightmap[10]?.[10]).toBe(MAX_BRUSH_ELEVATION_TIER);
    });
  });

  describe('4. Open-Field Manual Path Grid & Wooden Bridges (D-03)', () => {
    it('renders manual dirt trails in open fields outside POI radii when `manualPathGrid` is passed to blitter', () => {
      const base = buildSyntheticState(30, 30);
      const painted = paintContinentLine(
        base,
        { x: 5, y: 15 },
        { x: 20, y: 15 },
        makeConfig({ paintTarget: 'path_dirt', size: 1, autoHealOnPaint: true })
      );

      expect(painted.pathGrid[15]?.[12]).toBe(true);
      expect(painted.manualPathGrid[15]?.[12]).toBe(true);

      const withManualMask = buildMapBlitInstructions(
        painted.continent,
        base.pois,
        painted.pathGrid,
        painted.bridgeGrid,
        painted.wilderness,
        { manualPathGrid: painted.manualPathGrid }
      );
      const isDirtPathTile = (file: string): boolean =>
        file.includes('dirt_path') || file.includes('path_dirt');
      const dirtAt12 = withManualMask.instructions.filter(
        (inst) => inst.px === 12 * 32 && inst.py === 15 * 32 && isDirtPathTile(inst.filename)
      );
      expect(dirtAt12.length).toBeGreaterThan(0);

      const withoutManualMask = buildMapBlitInstructions(
        painted.continent,
        base.pois,
        painted.pathGrid,
        painted.bridgeGrid,
        painted.wilderness
      );
      const suppressedDirtAt12 = withoutManualMask.instructions.filter(
        (inst) => inst.px === 12 * 32 && inst.py === 15 * 32 && isDirtPathTile(inst.filename)
      );
      expect(suppressedDirtAt12).toHaveLength(0);
    });

    it('stamps wooden bridges strictly over water cells and skips dry grass', () => {
      const base = buildSyntheticState(24, 24);
      const withCanal = paintContinentCells(
        base,
        [{ x: 12, y: 12 }],
        makeConfig({ paintTarget: 'terrain_water', size: 5, autoHealOnPaint: false })
      );

      const withBridge = paintContinentLine(
        { ...base, ...withCanal },
        { x: 8, y: 12 },
        { x: 16, y: 12 },
        makeConfig({ paintTarget: 'bridge_wood', size: 3 })
      );

      expect(withBridge.bridgeGrid[12]?.[12]).toBe(true);
      expect(withBridge.bridgeGrid[12]?.[8]).toBe(false);
    });

    it('renders manual dirt trails and stone plazas in bounded dirty rects when bounds.minY > 25 (sparse allocBounds)', () => {
      const large = buildSyntheticState(96, 96);
      const painted = paintContinentLine(
        large,
        { x: 40, y: 60 },
        { x: 48, y: 60 },
        makeConfig({ paintTarget: 'path_dirt', size: 1, autoHealOnPaint: true })
      );

      const plazaPoi: POINode = {
        id: 'plaza_south_town',
        name: 'South Plaza',
        type: 'city',
        gridX: 54,
        gridY: 60,
        elevation: 0,
        footprint: { width: 6, height: 6 },
        terrainPreference: 'flat_grass',
        urbanLayout: {
          nodeId: 'plaza_south_town',
          roadMaterial: 'asphalt',
          buildings: [],
          internalStreets: [],
          pavedPlazaCells: [
            { x: 56, y: 62 },
            { x: 57, y: 62 },
            { x: 56, y: 63 },
            { x: 57, y: 63 }
          ],
          props: []
        }
      };

      const boundedResult = buildMapBlitInstructions(
        painted.continent,
        [plazaPoi],
        painted.pathGrid,
        painted.bridgeGrid,
        painted.wilderness,
        {
          bounds: { minX: 36, minY: 54, maxX: 62, maxY: 68 },
          manualPathGrid: painted.manualPathGrid
        }
      );

      const isDirtPathTile = (file: string): boolean =>
        file.includes('dirt_path') || file.includes('path_dirt');
      const dirtAt44 = boundedResult.instructions.filter(
        (inst) => inst.px === 44 * 32 && inst.py === 60 * 32 && isDirtPathTile(inst.filename)
      );
      expect(dirtAt44.length).toBeGreaterThan(0);

      const plazaAt56 = boundedResult.instructions.filter(
        (inst) =>
          inst.px === 56 * 32 && inst.py === 62 * 32 && inst.filename.includes('poke_stone_plaza_')
      );
      expect(plazaAt56.length).toBeGreaterThan(0);

      // Direct sparse-row contract check on sanitizePathGridWidth & resolvePathGrid
      const sparseGrid: boolean[][] = Array.from({ length: 96 }, (): boolean[] => []);
      for (let r = 50; r <= 70; r++) {
        sparseGrid[r] = Array<boolean>(96).fill(false);
      }
      sparseGrid[60]![44] = true;
      sparseGrid[60]![45] = true;
      sparseGrid[61]![44] = true;
      sparseGrid[61]![45] = true;

      const sanitized = sanitizePathGridWidth(sparseGrid, undefined, undefined, {
        minX: 40,
        minY: 55,
        maxX: 50,
        maxY: 65
      });
      expect(sanitized[60]?.[44]).toBe(true);

      const resolved = resolvePathGrid(sanitized, undefined, undefined, {
        minX: 40,
        minY: 55,
        maxX: 50,
        maxY: 65
      });
      expect(resolved.width).toBe(96);
      expect(resolved.pathDetails[60]?.[44]?.primaryTile).toBe(
        'poke_path_dirt_corner_outer_nw.png'
      );
    });
  });

  describe('5. Wilderness Overlays & Eraser', () => {
    it('stamps tall grass, biome-aware trees, props, and erases overlays without harming buildings', () => {
      const base = buildSyntheticState(24, 24);
      const poiBuilding: POINode = {
        id: 'town_test',
        name: 'Test Town',
        type: 'town',
        gridX: 2,
        gridY: 2,
        elevation: 0,
        footprint: { width: 8, height: 8 },
        terrainPreference: 'flat_grass',
        urbanLayout: {
          nodeId: 'town_test',
          roadMaterial: 'dirt',
          buildings: [
            {
              id: 'b_center',
              type: 'pokecenter',
              prefabFile: 'poke_center.png',
              x: 4,
              y: 4,
              width: 3,
              height: 3,
              doorX: 5,
              doorY: 7
            }
          ],
          internalStreets: [],
          pavedPlazaCells: [],
          props: []
        }
      };
      const withPoi: ContinentPaintStateInput = { ...base, pois: [poiBuilding] };

      const withGrass = paintContinentCells(
        withPoi,
        [{ x: 15, y: 15 }],
        makeConfig({ paintTarget: 'wilderness_tall_grass', size: 3 })
      );
      expect(withGrass.wilderness?.tallGrassGrid[15]?.[15]).toBe(true);

      const waterAttemptOnBuilding = paintContinentCells(
        { ...withPoi, ...withGrass },
        [{ x: 5, y: 5 }],
        makeConfig({ paintTarget: 'terrain_water', size: 1, autoHealOnPaint: false })
      );
      expect(waterAttemptOnBuilding.continent.terrainMatrix[5]?.[5]).toBe('grass');

      const withTrees = paintContinentCells(
        { ...withPoi, ...waterAttemptOnBuilding },
        [{ x: 18, y: 10 }],
        makeConfig({ paintTarget: 'wilderness_tree', size: 5 })
      );
      expect(withTrees.wilderness?.trees.length).toBeGreaterThanOrEqual(1);

      const withProps = paintContinentCells(
        { ...withPoi, ...withTrees },
        [{ x: 12, y: 18 }],
        makeConfig({ paintTarget: 'wilderness_prop', size: 1 })
      );
      expect(withProps.wilderness?.props.some((p) => p.x === 12 && p.y === 18)).toBe(true);

      // Erase all overlays over the painted spots and building area
      const erased = paintContinentCells(
        { ...withPoi, ...withProps },
        [
          { x: 15, y: 15 },
          { x: 18, y: 10 },
          { x: 12, y: 18 },
          { x: 5, y: 5 }
        ],
        makeConfig({ paintTarget: 'eraser_overlay', size: 5 })
      );
      expect(erased.wilderness?.tallGrassGrid[15]?.[15]).toBe(false);
      expect(erased.wilderness?.trees).toHaveLength(0);
      expect(erased.wilderness?.props).toHaveLength(0);
    });
  });

  describe('6. Line, Flood Fill Cap & Eyedropper Priority', () => {
    it('draws continuous Bresenham lines, caps flood fill at MAX_FLOOD_FILL_CELLS, and samples layers by priority', () => {
      const small = buildSyntheticState(24, 24);
      const lineRes = paintContinentLine(
        small,
        { x: 4, y: 4 },
        { x: 18, y: 11 },
        makeConfig({ paintTarget: 'path_dirt', size: 1 })
      );
      for (let x = 4; x <= 18; x++) {
        const hasColPath = Array.from({ length: 12 }, (_, y) => lineRes.pathGrid[y]?.[x]).some(
          Boolean
        );
        expect(hasColPath).toBe(true);
      }

      // Eyedropper priority: bridge > path > stair > mountain > wilderness > water/sand > biome
      const waterSpot = paintContinentCells(
        small,
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'terrain_water', size: 3, autoHealOnPaint: false })
      );
      const bridgeSpot = paintContinentCells(
        withMutationResult(small, waterSpot),
        [{ x: 10, y: 10 }],
        makeConfig({ paintTarget: 'bridge_wood', size: 1 })
      );
      const sampleBridge = sampleContinentCellAt(withMutationResult(small, bridgeSpot), 10, 10);
      expect(sampleBridge.recommendedTarget).toBe('bridge_wood');
      expect(sampleBridge.hasBridge).toBe(true);

      const mtnSpot = paintContinentCells(
        small,
        [{ x: 6, y: 6 }],
        makeConfig({ paintTarget: 'elevation_raise', size: 3, mountainPalette: 'gray' })
      );
      const sampleMtn = sampleContinentCellAt(withMutationResult(small, mtnSpot), 6, 6);
      expect(sampleMtn.recommendedTarget).toBe('elevation_raise');
      expect(sampleMtn.recommendedPalette).toBe('gray');

      // Bounded Flood Fill cap check on 128x128 plain (16,384 grass tiles > 4,096)
      const large = buildSyntheticState(96, 96);
      const filled = floodFillContinentAt(
        large,
        40,
        40,
        makeConfig({ paintTarget: 'terrain_sand', autoHealOnPaint: false })
      );
      expect(filled.floodCapReached).toBe(true);
      expect(filled.changedCellCount).toBe(MAX_FLOOD_FILL_CELLS);
    });
  });

  describe('7. Store Undo/Redo & Sparse Persistence Roundtrip', () => {
    let baseGen: ReturnType<typeof executeFullWorkerGeneration>;

    beforeAll(() => {
      baseGen = executeFullWorkerGeneration({
        width: 128,
        height: 128,
        seed: 77,
        oceanWaterPercentage: 0.25,
        mountainPercentage: 0.15,
        lakeCount: 1,
        targetCount: 4,
        allowBridges: true,
        withStairs: true
      });
    });

    beforeEach(() => {
      setActivePinia(createPinia());
    });

    it('tracks creative strokes via DirtyRectHistoryDelta Undo/Redo and restores manual edits across JSON export/import regeneration', () => {
      const store = useRegionalContinentStudioStore();
      store.seed = 77;
      store.mapDimension = 128;
      store.oceanWaterPercentage = 0.25;
      store.mountainPercentage = 0.15;
      store.lakeCount = 1;
      store.poiTargetCount = 4;
      store.continentMap = baseGen.result.continent;
      store.pois = [...baseGen.result.pois];
      store.routes = [...baseGen.result.routeNetwork.edges];
      store.pathGrid = baseGen.result.routeNetwork.pathGrid;
      store.manualPathGrid = createEmptyGrid(128, 128);
      store.bridgeGrid = baseGen.result.routeNetwork.bridgeGrid;
      store.wilderness = baseGen.result.wilderness;
      store.refreshDetectedDefects();

      const spot = findCleanInteriorCenter(
        store.continentMap,
        store.bridgeGrid,
        store.pathGrid,
        store.pois,
        1
      );

      // Paint manual trail + desert biome + elevation plateau
      store.setBrushMode('paint');
      store.setPaintTarget('biome_arid_desert');
      store.setBrushSize(5);
      store.setAutoHealOnPaint(true);
      store.applyBrushToolAt(spot.x, spot.y);
      expect(store.continentMap?.macroBiomes?.biomeGrid[spot.y]?.[spot.x]).toBe('arid_desert');

      store.setPaintTarget('path_dirt');
      store.setBrushSize(1);
      store.applyBrushToolAt(spot.x, spot.y);
      expect(store.manualPathGrid[spot.y]?.[spot.x]).toBe(true);
      expect(store.pathGrid[spot.y]?.[spot.x]).toBe(true);

      // Undo -> Redo verification
      store.undo();
      expect(store.manualPathGrid[spot.y]?.[spot.x]).toBe(false);
      store.redo();
      expect(store.manualPathGrid[spot.y]?.[spot.x]).toBe(true);

      const exportedJson = store.exportProjectJson();
      const parsed = JSON.parse(exportedJson) as ContinentProjectExportPayload;
      expect(parsed.manualMapEdits).toBeDefined();
      expect(parsed.manualMapEdits!.cells.length).toBeGreaterThan(0);
      // Sparse patch guarantee: must NEVER dump full 4096 grid cells for a small brush stroke
      expect(parsed.manualMapEdits!.cells.length).toBeLessThan(200);

      // Fresh Pinia instance importing JSON re-runs generation + reapplies sparse edits
      setActivePinia(createPinia());
      const freshStore = useRegionalContinentStudioStore();
      const imported = freshStore.importProjectJson(exportedJson);
      expect(imported).toBe(true);

      expect(freshStore.continentMap?.macroBiomes?.biomeGrid[spot.y]?.[spot.x]).toBe('arid_desert');
      expect(freshStore.manualPathGrid[spot.y]?.[spot.x]).toBe(true);
      expect(freshStore.pathGrid[spot.y]?.[spot.x]).toBe(true);
    });
  });

  describe('8. Regression Reproductions: Sand Rim Auto-Heal, Manual Path Clipping & Bridge Spans', () => {
    it('trims clipped manual path tails beneath mountain cliff feet without extruding damaged edges', () => {
      const base = buildSyntheticState(24, 24);
      const withRoad = paintContinentLine(
        base,
        { x: 4, y: 12 },
        { x: 18, y: 12 },
        makeConfig({ paintTarget: 'path_dirt', size: 1, autoHealOnPaint: true })
      );

      // Raise a 5x5 mountain centered at (15, 9): heightmap=1 spans y=7..11, x=13..17.
      // Its south cliff foot occupies row y=12 (x=13..17), leaving row y=13 under the cliff!
      const withMountain = paintContinentCells(
        withMutationResult(base, withRoad),
        [{ x: 15, y: 9 }],
        makeConfig({ paintTarget: 'elevation_raise', size: 5, autoHealOnPaint: true })
      );

      const scan = scanContinentAutotileDefects({
        continent: withMountain.continent,
        pathGrid: withMountain.pathGrid,
        bridgeGrid: withMountain.bridgeGrid,
        pois: base.pois
      });
      expect(scan.countsByKind.path_sliver_or_orphan).toBe(0);
      // Exposed 1-row sliver directly beneath the south cliff foot must be cleanly trimmed
      expect(withMountain.pathGrid[13]?.[14]).toBe(false);
      expect(withMountain.manualPathGrid[13]?.[14]).toBe(false);
      // Closed 2-wide road west of the mountain must remain intact
      expect(withMountain.manualPathGrid[12]?.[10]).toBe(true);
      expect(withMountain.manualPathGrid[13]?.[10]).toBe(true);
    });

    it('expands a 1-tile surrounding sand frame outward when flood-filling water so coastal pinches heal to zero', () => {
      let state = buildSyntheticState(20, 20);
      state = withMutationResult(
        state,
        paintContinentCells(
          state,
          [{ x: 10, y: 10 }],
          makeConfig({ paintTarget: 'terrain_sand', size: 5, autoHealOnPaint: false })
        )
      );
      state = withMutationResult(
        state,
        paintContinentCells(
          state,
          [{ x: 10, y: 10 }],
          makeConfig({ paintTarget: 'terrain_grass', size: 3, autoHealOnPaint: false })
        )
      );
      // Verify 1-tile thick sand rim at row/col 8 and 12 around 3x3 grass interior (9..11)
      expect(state.continent.terrainMatrix[8]?.[10]).toBe('sand');
      expect(state.continent.terrainMatrix[7]?.[10]).toBe('grass');

      const filled = floodFillContinentAt(
        state,
        10,
        10,
        makeConfig({ paintTarget: 'terrain_water', autoHealOnPaint: true })
      );

      const scan = scanContinentAutotileDefects({
        continent: filled.continent,
        pathGrid: filled.pathGrid,
        bridgeGrid: filled.bridgeGrid,
        pois: state.pois
      });
      expect(scan.countsByDomain.water).toBe(0);
      expect(scan.countsByKind.sand_dual_boundary_pinch).toBe(0);
      expect(scan.countsByKind.water_sliver).toBe(0);
      expect(scan.countsByKind.water_diagonal_pinch).toBe(0);
      // Sand beach must survive and expand outward to row 7 instead of eroding or leaking seams
      expect(filled.continent.terrainMatrix[8]?.[10]).toBe('sand');
      expect(filled.continent.terrainMatrix[7]?.[10]).toBe('sand');
    });

    it('heals sliced vertical bridge slivers and shore-wedged circular pond bridge spurs to zero bridge defects', () => {
      let state = buildSyntheticState(24, 24);
      state = withMutationResult(
        state,
        paintContinentCells(
          state,
          [{ x: 10, y: 10 }],
          makeConfig({ paintTarget: 'terrain_water', size: 9, autoHealOnPaint: true })
        )
      );
      // Stamp 2-wide vertical bridge across pond columns x=9..10
      state = withMutationResult(
        state,
        paintContinentCells(
          state,
          [
            { x: 9, y: 8 },
            { x: 10, y: 8 },
            { x: 9, y: 9 },
            { x: 10, y: 9 },
            { x: 9, y: 10 },
            { x: 10, y: 10 },
            { x: 9, y: 11 },
            { x: 10, y: 11 },
            { x: 9, y: 12 },
            { x: 10, y: 12 }
          ],
          makeConfig({ paintTarget: 'bridge_wood', size: 1, autoHealOnPaint: false })
        )
      );
      // Erase column x=10 with eraser_overlay -> leaves broken 1-wide vertical column at x=9
      const sliced = paintContinentLine(
        state,
        { x: 10, y: 8 },
        { x: 10, y: 12 },
        makeConfig({ paintTarget: 'eraser_overlay', size: 1, autoHealOnPaint: true })
      );

      const slicedScan = scanContinentAutotileDefects({
        continent: sliced.continent,
        pathGrid: sliced.pathGrid,
        bridgeGrid: sliced.bridgeGrid,
        pois: state.pois
      });
      expect(slicedScan.countsByKind.bridge_invalid_span).toBe(0);
      expect(sliced.bridgeGrid[10]?.[9]).toBe(false);

      // Now paint a size=3 bridge horizontally across a circular size=9 pond framed by size=15 sand
      let roundState = buildSyntheticState(24, 24);
      roundState = withMutationResult(
        roundState,
        paintContinentCells(
          roundState,
          [{ x: 12, y: 12 }],
          makeConfig({
            paintTarget: 'terrain_sand',
            shape: 'circle',
            size: 15,
            autoHealOnPaint: true
          })
        )
      );
      roundState = withMutationResult(
        roundState,
        paintContinentCells(
          roundState,
          [{ x: 12, y: 12 }],
          makeConfig({
            paintTarget: 'terrain_water',
            shape: 'circle',
            size: 9,
            autoHealOnPaint: true
          })
        )
      );
      const roundBridge = paintContinentLine(
        roundState,
        { x: 6, y: 12 },
        { x: 18, y: 12 },
        makeConfig({ paintTarget: 'bridge_wood', size: 3, autoHealOnPaint: true })
      );
      const roundScan = scanContinentAutotileDefects({
        continent: roundBridge.continent,
        pathGrid: roundBridge.pathGrid,
        bridgeGrid: roundBridge.bridgeGrid,
        pois: roundState.pois
      });
      expect(roundScan.countsByKind.bridge_invalid_span).toBe(0);
    });
  });

  describe('9. Exhaustive 500+ Scenario Combinatorial & Fuzzer Stress Suite', () => {
    it('executes 16x16 cross-layer tool collisions (256 combinations) with zero autotile defects and valid blit instructions', () => {
      const allTools: readonly TerrainPaintTarget[] = [
        'terrain_water_deep',
        'terrain_water',
        'terrain_sand',
        'terrain_grass',
        'biome_mint_highland',
        'biome_volcanic_plateau',
        'elevation_raise',
        'elevation_lower',
        'mountain_palette',
        'mountain_stair',
        'path_dirt',
        'bridge_wood',
        'wilderness_tall_grass',
        'wilderness_tree',
        'wilderness_prop',
        'eraser_overlay'
      ];

      let executedCombinations = 0;

      for (const baseTool of allTools) {
        for (const overlayTool of allTools) {
          let state = buildSyntheticState(24, 24);
          // First lay down a 9x9 base feature at (12, 12)
          state = withMutationResult(
            state,
            paintContinentCells(
              state,
              [{ x: 12, y: 12 }],
              makeConfig({
                paintTarget: baseTool,
                size: 9,
                shape: 'square',
                mountainPalette: 'brown',
                mountainPolicy: 'erode',
                autoHealOnPaint: true
              })
            )
          );

          // Now collide overlayTool across the edge of the base feature at (10, 12) -> (14, 12)
          state = withMutationResult(
            state,
            paintContinentLine(
              state,
              { x: 9, y: 12 },
              { x: 15, y: 12 },
              makeConfig({
                paintTarget: overlayTool,
                size: overlayTool === 'path_dirt' ? 1 : 5,
                shape: executedCombinations % 2 === 0 ? 'square' : 'circle',
                mountainPalette: 'gray',
                mountainPolicy: executedCombinations % 3 === 0 ? 'fill' : 'erode',
                autoHealOnPaint: true
              })
            )
          );

          const scan = scanContinentAutotileDefects({
            continent: state.continent,
            pathGrid: state.pathGrid,
            manualPathGrid: state.manualPathGrid,
            bridgeGrid: state.bridgeGrid,
            pois: state.pois
          });

          if (scan.totalDefects > 0) {
            throw new Error(
              `Cross-layer collision defect (${baseTool} -> ${overlayTool}): ${JSON.stringify(scan.defects[0])}`
            );
          }
          expect(scan.totalDefects).toBe(0);
          executedCombinations += 1;
        }
      }

      expect(executedCombinations).toBe(256);
    });

    it('survives 300 adversarial fuzzer operations across generated continents, cities, roads, rivers, mountains & presets with 0 defects after healing', () => {
      const generated64 = executeFullWorkerGeneration({
        width: 64,
        height: 64,
        seed: 2026,
        oceanWaterPercentage: 0.3,
        mountainPercentage: 0.22,
        lakeCount: 2,
        targetCount: 6,
        allowBridges: true,
        withStairs: true
      }).result;

      const kantoPreset = executePresetWorkerJob('kanto', 42).result;
      const johtoPreset = executePresetWorkerJob('johto', 42).result;

      for (const preset of [generated64, kantoPreset, johtoPreset]) {
        const healedPreset = executeHealAllWorkerJob({
          continent: preset.continent,
          pathGrid: preset.routeNetwork.pathGrid,
          bridgeGrid: preset.routeNetwork.bridgeGrid,
          pois: preset.pois,
          wilderness: preset.wilderness,
          domain: 'auto',
          mountainPolicy: 'erode'
        });
        expect(healedPreset.detectedDefectCount).toBe(0);
      }

      const healedBase64 = executeHealAllWorkerJob({
        continent: generated64.continent,
        pathGrid: generated64.routeNetwork.pathGrid,
        bridgeGrid: generated64.routeNetwork.bridgeGrid,
        pois: generated64.pois,
        wilderness: generated64.wilderness,
        domain: 'auto',
        mountainPolicy: 'erode'
      });
      expect(healedBase64.detectedDefectCount).toBe(0);

      let state: ContinentPaintStateInput = {
        continent: healedBase64.continent,
        pathGrid: healedBase64.pathGrid,
        manualPathGrid: createEmptyGrid(64, 64),
        bridgeGrid: healedBase64.bridgeGrid ?? createEmptyGrid(64, 64),
        wilderness: healedBase64.wilderness ?? null,
        pois: generated64.pois
      };

      const tools: readonly TerrainPaintTarget[] = [
        'terrain_water_deep',
        'terrain_water',
        'terrain_sand',
        'terrain_grass',
        'biome_mint_highland',
        'biome_volcanic_plateau',
        'elevation_raise',
        'elevation_lower',
        'mountain_palette',
        'mountain_stair',
        'path_dirt',
        'bridge_wood',
        'wilderness_tall_grass',
        'wilderness_tree',
        'wilderness_prop',
        'eraser_overlay'
      ];
      const sizes = [1, 3, 5, 9, 15] as const;

      // Deterministic PRNG for 300 chaotic operations across the entire 64x64 inhabited continent
      let rng = 1337;
      const nextRand = (): number => {
        rng = (rng * 1664525 + 1013904223) >>> 0;
        return rng / 0x100000000;
      };

      for (let step = 0; step < 300; step++) {
        const tool = tools[step % tools.length]!;
        const size = sizes[step % sizes.length]!;
        const shape = step % 2 === 0 ? 'square' : 'circle';
        const mountainPalette = step % 2 === 0 ? 'brown' : 'gray';
        const mountainPolicy = step % 4 === 0 ? 'fill' : 'erode';
        const x1 = Math.floor(nextRand() * 56) + 4;
        const y1 = Math.floor(nextRand() * 56) + 4;
        const cfg = makeConfig({
          paintTarget: tool,
          size,
          shape,
          mountainPalette,
          mountainPolicy,
          autoHealOnPaint: true
        });

        const opKind = step % 5;
        if (opKind === 0) {
          state = withMutationResult(state, paintContinentCells(state, [{ x: x1, y: y1 }], cfg));
        } else if (opKind === 1) {
          const x2 = Math.max(4, Math.min(59, x1 + Math.floor(nextRand() * 11) - 5));
          const y2 = Math.max(4, Math.min(59, y1 + Math.floor(nextRand() * 11) - 5));
          state = withMutationResult(
            state,
            paintContinentLine(state, { x: x1, y: y1 }, { x: x2, y: y2 }, cfg)
          );
        } else if (opKind === 2) {
          state = withMutationResult(state, floodFillContinentAt(state, x1, y1, cfg));
        } else if (opKind === 3) {
          const sampled = sampleContinentCellAt(state, x1, y1);
          expect(sampled.description.length).toBeGreaterThan(0);
          expect(['brown', 'gray']).toContain(sampled.recommendedPalette);
        } else {
          const healed = healContinentAt(state.continent, state.pathGrid, x1, y1, {
            domain: 'auto',
            radius: 3,
            shape,
            mountainPolicy,
            pois: state.pois,
            bridgeGrid: state.bridgeGrid,
            manualPathGrid: state.manualPathGrid,
            wilderness: state.wilderness
          });
          state = {
            ...state,
            continent: healed.continent,
            pathGrid: healed.pathGrid,
            manualPathGrid: healed.manualPathGrid ?? state.manualPathGrid,
            bridgeGrid: healed.bridgeGrid ?? state.bridgeGrid,
            wilderness: healed.wilderness ?? state.wilderness
          };
        }

        const stepScan = scanContinentAutotileDefects({
          continent: state.continent,
          pathGrid: state.pathGrid,
          manualPathGrid: state.manualPathGrid,
          bridgeGrid: state.bridgeGrid,
          pois: state.pois
        });
        if (stepScan.totalDefects > 0) {
          throw new Error(
            `Step ${step} (op=${opKind}, tool=${tool}, size=${size}, shape=${shape}, policy=${mountainPolicy} at ${x1},${y1}) left ${stepScan.totalDefects} defects: ${JSON.stringify(stepScan.defects[0])}`
          );
        }
      }

      // Now run full-map Auto-Sanar after 300 chaotic edits
      const finalHealed = executeHealAllWorkerJob({
        continent: state.continent,
        pathGrid: state.pathGrid,
        manualPathGrid: state.manualPathGrid,
        bridgeGrid: state.bridgeGrid,
        pois: state.pois,
        wilderness: state.wilderness,
        domain: 'auto',
        mountainPolicy: 'erode'
      });

      expect(finalHealed.detectedDefectCount).toBe(0);

      // Verify every single city building footprint remained 100% protected from water, elevation, and trees
      for (const poi of state.pois ?? []) {
        for (const b of poi.urbanLayout?.buildings ?? []) {
          for (let by = b.y; by < b.y + b.height; by++) {
            for (let bx = b.x; bx < b.x + b.width; bx++) {
              expect(finalHealed.continent.terrainMatrix[by]?.[bx]).toBe('grass');
              expect(finalHealed.continent.heightmap[by]?.[bx]).toBe(0);
              expect(finalHealed.bridgeGrid?.[by]?.[bx]).toBe(false);
            }
          }
        }
      }

      // Verify visual blit compilation succeeds with 0 invalid instructions
      const blit = buildMapBlitInstructions(
        finalHealed.continent,
        state.pois ?? [],
        finalHealed.pathGrid,
        finalHealed.bridgeGrid,
        finalHealed.wilderness,
        { manualPathGrid: finalHealed.manualPathGrid }
      );
      expect(blit.instructions.length).toBeGreaterThan(64 * 64);
      expect(blit.instructions.every((i) => i.filename.endsWith('.png'))).toBe(true);
      expect(blit.instructions.some((i) => i.filename.includes('poke_cliff_cone_'))).toBe(false);
    });
  });

  describe('10. Deep Visual Tile & UI Workflow Parity Audit', () => {
    it('emits zero poke_cliff_cone_ tiles and zero autotile defects across generated maps (64, 128, kanto, johto)', () => {
      const scenarios = [
        {
          name: 'gen_64',
          run: () => executeFullWorkerGeneration({ width: 64, height: 64, seed: 42 })
        },
        {
          name: 'gen_128',
          run: () => executeFullWorkerGeneration({ width: 128, height: 128, seed: 42 })
        },
        { name: 'kanto', run: () => executePresetWorkerJob('kanto', 42) },
        { name: 'johto', run: () => executePresetWorkerJob('johto', 42) }
      ];

      const issues: string[] = [];
      for (const scenario of scenarios) {
        const out = scenario.run();
        const defectScan = scanContinentAutotileDefects({
          continent: out.result.continent,
          pathGrid: out.result.routeNetwork.pathGrid,
          bridgeGrid: out.result.routeNetwork.bridgeGrid,
          pois: out.result.pois
        });
        const blit = buildMapBlitInstructions(
          out.result.continent,
          out.result.pois,
          out.result.routeNetwork.pathGrid,
          out.result.routeNetwork.bridgeGrid,
          out.result.wilderness
        );
        const coneBlits = blit.instructions.filter((i) => i.filename.includes('poke_cliff_cone_'));
        if (defectScan.totalDefects > 0 || coneBlits.length > 0) {
          issues.push(
            `${scenario.name}: domains=${JSON.stringify(defectScan.countsByDomain)} total=${defectScan.totalDefects} cones=${coneBlits.length}`
          );
        }
      }
      expect(issues).toEqual([]);
    });

    it('emits zero poke_cliff_cone_ tiles, zero dirt-path seams on sand, zero isolated 1x1 fences, and zero defects on default 400x400 desktop map (seed 42)', () => {
      const out = executeFullWorkerGeneration({
        width: 400,
        height: 400,
        seed: 42,
        oceanWaterPercentage: 0.35,
        mountainPercentage: 0.22,
        lakeCount: 2,
        targetCount: 18,
        allowBridges: true,
        withStairs: true
      });
      const defectScan = scanContinentAutotileDefects({
        continent: out.result.continent,
        pathGrid: out.result.routeNetwork.pathGrid,
        bridgeGrid: out.result.routeNetwork.bridgeGrid,
        pois: out.result.pois
      });
      expect(defectScan.totalDefects).toBe(0);

      const blit = buildMapBlitInstructions(
        out.result.continent,
        out.result.pois,
        out.result.routeNetwork.pathGrid,
        out.result.routeNetwork.bridgeGrid,
        out.result.wilderness
      );
      const coneBlits = blit.instructions.filter((i) => i.filename.includes('poke_cliff_cone_'));
      expect(coneBlits).toEqual([]);

      // Zero dirt-path center or edge/corner border marks over arid_desert or sand ground
      const desertDirtBlits = blit.instructions.filter((i) => {
        if (!i.filename.includes('poke_dirt_path') && !i.filename.includes('poke_path_dirt_')) {
          return false;
        }
        const gx = Math.floor(i.px / 32);
        const gy = Math.floor(i.py / 32);
        const terr = out.result.continent.terrainMatrix[gy]?.[gx];
        const biome = out.result.continent.macroBiomes?.biomeGrid[gy]?.[gx];
        return terr === 'sand' || biome === 'arid_desert';
      });
      expect(desertDirtBlits).toEqual([]);

      // Zero isolated single-tile fences floating without any adjacent cardinal fence segment
      const findIsolatedFences = (
        items: Iterable<{ readonly filename: string; readonly px: number; readonly py: number }>
      ): string[] => {
        const fenceCoordMap = new Map<string, string>();
        for (const instr of items) {
          if (instr.filename.includes('poke_fence_') || instr.filename.includes('fence_')) {
            const gx = Math.round(instr.px / 32);
            const gy = Math.round(instr.py / 32);
            fenceCoordMap.set(`${gx}_${gy}`, instr.filename);
          }
        }
        const isolated: string[] = [];
        for (const [key, fname] of fenceCoordMap) {
          const [sx, sy] = key.split('_').map(Number);
          const x = sx!;
          const y = sy!;
          const hasAdjacentFence =
            fenceCoordMap.has(`${x - 1}_${y}`) ||
            fenceCoordMap.has(`${x + 1}_${y}`) ||
            fenceCoordMap.has(`${x}_${y - 1}`) ||
            fenceCoordMap.has(`${x}_${y + 1}`);
          if (!hasAdjacentFence) {
            isolated.push(`${fname}@(${x},${y})`);
          }
        }
        return isolated;
      };

      expect(findIsolatedFences(blit.instructions)).toEqual([]);

      const coordsView = new Int32Array(
        out.packedBlit.coordsBuffer,
        0,
        out.packedBlit.count * PACKED_BLIT_STRIDE
      );
      const packedItems: { filename: string; px: number; py: number }[] = [];
      for (let idx = 0; idx < out.packedBlit.count; idx++) {
        const base = idx * PACKED_BLIT_STRIDE;
        const filename = out.packedBlit.palette[coordsView[base]!] ?? '';
        packedItems.push({ filename, px: coordsView[base + 1]!, py: coordsView[base + 2]! });
      }
      expect(findIsolatedFences(packedItems)).toEqual([]);
      const misMappedBoulderSprites = new Set([
        'poke_boulder_large.png',
        'poke_boulder_gray.png',
        'poke_rock_small.png'
      ]);
      expect(
        packedItems
          .filter((i) => misMappedBoulderSprites.has(i.filename))
          .map((i) => `${i.filename}@(${Math.round(i.px / 32)},${Math.round(i.py / 32)})`)
      ).toEqual([]);
      expect(out.result.pois.some((p) => p.type === 'route_gate')).toBe(true);
    });

    it('supports selecting line mode first and switching paint categories in the Pinia store workflow', () => {
      setActivePinia(createPinia());
      const store = useRegionalContinentStudioStore();
      const base = buildSyntheticState(40, 40);
      store.continentMap = base.continent;
      store.pathGrid = base.pathGrid;
      store.manualPathGrid = base.manualPathGrid;
      store.bridgeGrid = base.bridgeGrid;
      store.wilderness = base.wilderness ?? null;
      store.pois = [...(base.pois ?? [])];

      store.setBrushMode('line');
      expect(store.brushConfig.mode).toBe('line');

      const lineWorkflowTargets = [
        'elevation_raise',
        'terrain_water',
        'terrain_sand',
        'path_dirt',
        'wilderness_tree'
      ] as const;

      lineWorkflowTargets.forEach((target, idx) => {
        store.setPaintTarget(target);
        store.setBrushSize(1);
        expect(store.brushConfig.mode).toBe('line');
        expect(store.brushConfig.paintTarget).toBe(target);

        const y = 6 + idx * 6;
        const mutation = store.paintLine({ x: 6, y }, { x: 22, y });
        expect(mutation).not.toBeNull();
        expect(store.continentMap).not.toBeNull();

        const scan = scanContinentAutotileDefects({
          continent: store.continentMap!,
          pathGrid: store.pathGrid,
          manualPathGrid: store.manualPathGrid,
          bridgeGrid: store.bridgeGrid,
          pois: store.pois
        });
        expect(scan.totalDefects).toBe(0);

        const blit = buildMapBlitInstructions(
          store.continentMap!,
          store.pois,
          store.pathGrid,
          store.bridgeGrid,
          store.wilderness,
          { manualPathGrid: store.manualPathGrid }
        );
        expect(blit.instructions.some((i) => i.filename.includes('poke_cliff_cone_'))).toBe(false);
      });
    });
  });
});
