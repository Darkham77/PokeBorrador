/**
 * test_aventura/tests/map/autotileHealingEngine.test.ts
 *
 * TIER 1 & TIER 2 CLOSED-LOOP TESTS FOR AUTOTILE DEFECT SCANNER & MODEL-FIRST HEALING BRUSH
 *
 * Validates:
 *   1. 2.5D Tier-1 South Cliff Foot rendering onto ground elevation 0 in buildMapBlitInstructions.
 *   2. Coastal sand protection & 1-tile macro-biome sliver healing (Screenshot 1 & 2 exact repro).
 *   3. Crater lake + thin mountain ridge + steep drop + south water overhang convergence to 0 defects.
 *   4. Water slivers, dual-boundary sand pinches, and 1-cell dirt path slivers/orphans healing.
 *   5. Multi-seed real procedural continent closed-loop scan -> heal -> 0 defects certification.
 */

import { describe, it, expect } from 'vitest';

import { resolveAssetWebPath } from '../../logic/map/assetWebPathResolver.ts';
import { scanContinentAutotileDefects } from '../../logic/map/autotileDefectScanner.ts';
import {
  healAllContinentDefects,
  healContinentAt,
  inferCellHealingDomain,
  isValidHealingDomain
} from '../../logic/map/autotileHealingEngine.ts';
import { buildMapBlitInstructions } from '../../logic/map/canvasTileRenderer.ts';
import {
  generateContinentMap,
  type ContinentMapResult
} from '../../logic/map/continentGenerator.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';
import { compileGeologicalAutotiling } from '../../logic/map/geologicalAutotilingEngine.ts';
import type { MacroBiome, MacroBiomeResult } from '../../logic/map/macroBiomeSynthesizer.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

interface SyntheticFixtureSpec {
  readonly width: number;
  readonly height: number;
  readonly terrainMatrix: WaterTerrainKind[][];
  readonly heightmap: number[][];
  readonly biomeGrid: MacroBiome[][];
}

function buildSyntheticContinent(spec: SyntheticFixtureSpec): ContinentMapResult {
  const macroBiomes: MacroBiomeResult = {
    biomeGrid: spec.biomeGrid,
    transitionBufferGrid: Array.from({ length: spec.height }, () =>
      Array<boolean>(spec.width).fill(false)
    ),
    temperatureMap: new Float32Array(spec.width * spec.height),
    moistureMap: new Float32Array(spec.width * spec.height),
    stats: {
      temperate_meadow: spec.width * spec.height,
      mint_highland: 0,
      viridian_forest: 0,
      arid_desert: 0,
      volcanic_plateau: 0
    }
  };

  const geo = compileGeologicalAutotiling(spec.terrainMatrix, spec.heightmap, macroBiomes, {
    mountainPalette: 'brown'
  });

  return {
    width: spec.width,
    height: spec.height,
    seed: 1,
    mountainPalette: 'brown',
    terrainMatrix: spec.terrainMatrix,
    heightmap: spec.heightmap,
    macroBiomes,
    resolvedWater: geo.resolvedWater,
    resolvedMountain: geo.resolvedMountain,
    resolvedMacroBiomes: geo.resolvedMacroBiomes,
    cells: geo.cells,
    placedStairs: []
  };
}

function createUniformFixture(width: number, height: number): SyntheticFixtureSpec {
  return {
    width,
    height,
    terrainMatrix: Array.from({ length: height }, () =>
      Array<WaterTerrainKind>(width).fill('grass')
    ),
    heightmap: Array.from({ length: height }, () => Array<number>(width).fill(0)),
    biomeGrid: Array.from({ length: height }, () =>
      Array<MacroBiome>(width).fill('temperate_meadow')
    )
  };
}

function createEmptyBooleanGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
}

describe('Autotile Defect Scanner & Model-First Healing Brush v2', () => {
  describe('Domain Validation', () => {
    it('validates canonical healing domains strictly', () => {
      expect(isValidHealingDomain('auto')).toBe(true);
      expect(isValidHealingDomain('path')).toBe(true);
      expect(isValidHealingDomain('mountain')).toBe(true);
      expect(isValidHealingDomain('water')).toBe(true);
      expect(isValidHealingDomain('macro_biome')).toBe(true);
      expect(isValidHealingDomain('unknown_domain')).toBe(false);
    });
  });

  describe('2.5D Tier-1 South Cliff Foot Blitter Integrity (Screenshot 1 Root Cause #1)', () => {
    it('renders projected south cliff faces and bottom corners onto ground elevation 0', () => {
      const spec = createUniformFixture(10, 10);
      // 4x3 Tier-1 plateau at x: 3..6, y: 2..4 dropping south onto elevation 0 grass at y = 5
      for (let y = 2; y <= 4; y++) {
        for (let x = 3; x <= 6; x++) {
          spec.heightmap[y]![x] = 1;
        }
      }

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(10, 10);
      const { instructions } = buildMapBlitInstructions(continent, [], pathGrid);

      const footBlitsAtRow5Col4 = instructions
        .filter((i) => i.px === 4 * 32 && i.py === 5 * 32)
        .map((i) => i.filename);
      const swFootBlits = instructions
        .filter((i) => i.px === 3 * 32 && i.py === 5 * 32)
        .map((i) => i.filename);
      const seFootBlits = instructions
        .filter((i) => i.px === 6 * 32 && i.py === 5 * 32)
        .map((i) => i.filename);

      expect(footBlitsAtRow5Col4).toContain('poke_cliff_brown_face.png');
      expect(swFootBlits).toContain('poke_cliff_brown_corner_bl.png');
      expect(seFootBlits).toContain('poke_cliff_brown_corner_br.png');
    });
  });

  describe('Coastal Sand Protection & Mint Highland Sliver Repair (Screenshot 1 & 2 Repro)', () => {
    it('never paints mint grass onto coastal sand and heals 1-tile mint_highland slivers cleanly', () => {
      const spec = createUniformFixture(10, 10);
      // Rows 0..1: ocean water; Rows 2..3: yellow coastal sand; Row 4: 1-tile mint_highland sliver; Rows 5..9: temperate_meadow
      for (let x = 0; x < 10; x++) {
        spec.terrainMatrix[0]![x] = 'water';
        spec.terrainMatrix[1]![x] = 'water';
        spec.terrainMatrix[2]![x] = 'sand';
        spec.terrainMatrix[3]![x] = 'sand';
        // Even if biomeGrid has mint_highland under the sand (exact world-gen condition at (23, 16)!)
        spec.biomeGrid[2]![x] = 'mint_highland';
        spec.biomeGrid[3]![x] = 'mint_highland';
        spec.biomeGrid[4]![x] = 'mint_highland';
      }

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(10, 10);

      // 1. Scanner must detect the 1-tile mint_highland sliver along row 4
      const initialScan = scanContinentAutotileDefects({ continent, pathGrid });
      expect(initialScan.countsByKind.macro_biome_sliver).toBeGreaterThan(0);

      // 2. Inferring domain on coastal sand (5, 2) must infer 'water' (coastal), NEVER 'macro_biome'
      expect(inferCellHealingDomain(continent, pathGrid, 5, 2)).toBe('water');

      // 3. Clicking the brush directly on coastal sand (5, 2) must preserve sand 100% with zero mint tiles
      const afterSandClick = healContinentAt(continent, pathGrid, 5, 2, { domain: 'auto' });
      expect(afterSandClick.continent.terrainMatrix[2]![5]).toBe('sand');
      expect(afterSandClick.continent.terrainMatrix[3]![5]).toBe('sand');

      const { instructions: sandBlits } = buildMapBlitInstructions(
        afterSandClick.continent,
        [],
        afterSandClick.pathGrid
      );
      const cellSandFiles = sandBlits
        .filter((i) => i.px === 5 * 32 && i.py === 2 * 32)
        .map((i) => i.filename);
      expect(cellSandFiles.some((f) => f.includes('mint'))).toBe(false);

      // 4. Healing the map eliminates all 1-tile mint slivers -> 0 defects
      const fullyHealed = healAllContinentDefects(
        afterSandClick.continent,
        afterSandClick.pathGrid
      );
      const finalScan = scanContinentAutotileDefects({
        continent: fullyHealed.continent,
        pathGrid: fullyHealed.pathGrid
      });
      expect(finalScan.totalDefects).toBe(0);
    });
  });

  describe('Crater Lake, Thin Mountain Ridges, Steep Drops & Standalone Peaks', () => {
    it('detects and heals crater lake overhangs, steep drops, thin ridges, and diagonal pinches to 0 defects', () => {
      const spec = createUniformFixture(14, 14);
      // Plateau Tier 1 & Tier 2 around a central lake at x: 5..8, y: 5..8
      for (let y = 3; y <= 10; y++) {
        for (let x = 3; x <= 10; x++) {
          spec.heightmap[y]![x] = 1;
        }
      }
      // Steep Tier-2 block right next to lake water (drop 2 -> 0)
      spec.heightmap[4]![5] = 2;
      spec.heightmap[4]![6] = 2;
      spec.heightmap[3]![5] = 2;
      spec.heightmap[3]![6] = 2;

      // Carve crater lake at x: 5..8, y: 5..8 and zero its heightmap (exact continentMountainEngine artifact!)
      for (let y = 5; y <= 8; y++) {
        for (let x = 5; x <= 8; x++) {
          spec.terrainMatrix[y]![x] = 'water';
          spec.heightmap[y]![x] = 0;
        }
      }

      // Add a 1-tile horizontal ridge spur at y = 10, x = 11..12 and a diagonal pinch at (2, 2)
      spec.heightmap[10]![11] = 1;
      spec.heightmap[10]![12] = 1;
      spec.heightmap[2]![2] = 1;

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(14, 14);

      const scanBefore = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scanBefore.totalDefects).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.mountain_south_water_overhang).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.mountain_steep_drop).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.mountain_thin_ridge).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.mountain_diagonal_pinch).toBeGreaterThan(0);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });

      expect(scanAfter.totalDefects).toBe(0);
    });

    it('preserves a true standalone 1x1 Tier-1 rock cone (peak_isolated) on flat grass', () => {
      const spec = createUniformFixture(7, 7);
      spec.heightmap[3]![3] = 1;

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(7, 7);

      const scan = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scan.totalDefects).toBe(0);

      const healed = healContinentAt(continent, pathGrid, 3, 3, { domain: 'mountain' });
      expect(healed.continent.heightmap[3]![3]).toBe(1);
      expect(healed.continent.resolvedMountain.cellDetails[3]?.[3]?.role).toBe('peak_isolated');
    });

    it('detects and smooths 1-column south cliff overhang staircase jags while preserving >=2-wide south L-steps', () => {
      const spec = createUniformFixture(10, 10);
      // 4x4 plateau at x: 3..6, y: 2..5 PLUS a 1-column south overhang jag at x = 2, y = 2..3 (dropping south at y = 4 while x = 3 continues to y = 5!)
      for (let y = 2; y <= 5; y++) {
        for (let x = 3; x <= 6; x++) {
          spec.heightmap[y]![x] = 1;
        }
      }
      spec.heightmap[2]![2] = 1;
      spec.heightmap[3]![2] = 1;

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(10, 10);

      const scanBefore = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scanBefore.countsByKind.mountain_thin_ridge).toBeGreaterThan(0);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });
      expect(scanAfter.totalDefects).toBe(0);
      // Main 4x4 plateau remains intact while the 1-column south jag at x = 2 is smoothed away
      expect(healed.continent.heightmap[4]![3]).toBe(1);
      expect(healed.continent.heightmap[3]![2]).toBe(0);

      // Verify >=2-column wide south L-steps remain 100% intact
      const spec2Wide = createUniformFixture(12, 12);
      for (let y = 2; y <= 5; y++) {
        for (let x = 4; x <= 7; x++) {
          spec2Wide.heightmap[y]![x] = 1;
        }
      }
      for (let y = 2; y <= 3; y++) {
        spec2Wide.heightmap[y]![2] = 1;
        spec2Wide.heightmap[y]![3] = 1;
      }
      const cont2Wide = buildSyntheticContinent(spec2Wide);
      const scan2Wide = scanContinentAutotileDefects({
        continent: cont2Wide,
        pathGrid: createEmptyBooleanGrid(12, 12)
      });
      expect(scan2Wide.totalDefects).toBe(0);

      // Verify 1-row half-height south cliff step collision (y = 4 vs y = 3) flushes cleanly to y = 3
      const spec1RowSouthStep = createUniformFixture(12, 12);
      for (let y = 2; y <= 3; y++) {
        for (let x = 2; x <= 7; x++) {
          spec1RowSouthStep.heightmap[y]![x] = 1;
        }
      }
      for (let x = 4; x <= 7; x++) {
        spec1RowSouthStep.heightmap[4]![x] = 1;
      }
      const cont1Row = buildSyntheticContinent(spec1RowSouthStep);
      const emptyPath1Row = createEmptyBooleanGrid(12, 12);
      expect(
        scanContinentAutotileDefects({ continent: cont1Row, pathGrid: emptyPath1Row }).totalDefects
      ).toBeGreaterThan(0);
      const healed1Row = healAllContinentDefects(cont1Row, emptyPath1Row);
      expect(
        scanContinentAutotileDefects({
          continent: healed1Row.continent,
          pathGrid: healed1Row.pathGrid
        }).totalDefects
      ).toBe(0);
      expect(healed1Row.continent.heightmap[4]![4]).toBe(0);
      expect(healed1Row.continent.heightmap[3]![4]).toBe(1);
    });
  });

  describe('Water Slivers, Sand Dual-Boundary Pinches & Dirt Path Slivers', () => {
    it('detects and heals 1-tile water slivers, pinched sand beaches, and 1-cell dirt path slivers', () => {
      const spec = createUniformFixture(12, 12);
      // 1-tile water sliver at y = 2, x = 2..4
      spec.terrainMatrix[2]![2] = 'water';
      spec.terrainMatrix[2]![3] = 'water';
      spec.terrainMatrix[2]![4] = 'water';

      const pathGrid = createEmptyBooleanGrid(12, 12);
      // 1-cell thin dirt path at y = 7, x = 2..6 + isolated 1x1 orphan at (9, 9)
      for (let x = 2; x <= 6; x++) {
        pathGrid[7]![x] = true;
      }
      pathGrid[9]![9] = true;
      // ValidPavedSector: set macroBiome to arid_desert? Wait: pathGrid scanner checks pathGrid directly!

      const continent = buildSyntheticContinent(spec);
      const scanBefore = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scanBefore.countsByKind.water_sliver).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.path_sliver_or_orphan).toBeGreaterThan(0);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });

      expect(scanAfter.totalDefects).toBe(0);
      expect(healed.pathGrid[9]![9]).toBe(false);
    });

    it('resolves 3-group coastal saddle points (N=sand, S=water, W=grass, E=grass) without oscillation', () => {
      const spec = createUniformFixture(8, 8);
      // 2x2 sand block at top (x: 3..4, y: 1..2)
      spec.terrainMatrix[1]![3] = 'sand';
      spec.terrainMatrix[1]![4] = 'sand';
      spec.terrainMatrix[2]![3] = 'sand';
      spec.terrainMatrix[2]![4] = 'sand';
      // 2x2 water block at bottom (x: 3..4, y: 4..5), leaving row 3 as 1-tile grass isthmus between sand & water!
      spec.terrainMatrix[4]![3] = 'water';
      spec.terrainMatrix[4]![4] = 'water';
      spec.terrainMatrix[5]![3] = 'water';
      spec.terrainMatrix[5]![4] = 'water';

      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(8, 8);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });

      expect(scanAfter.totalDefects).toBe(0);
    });

    it('detects and heals 2D S-bend dropped inner corners on macro_biome and dirt path corridors', () => {
      const spec = createUniformFixture(12, 12);
      // S-bend 1-tile overlap in mint_highland: (2..3, 2..3) and (3..4, 4..5) -> (3, 3) has N,S,W=mint, E=meadow, SW=(2,4)=meadow!
      spec.biomeGrid[2]![2] = 'mint_highland';
      spec.biomeGrid[2]![3] = 'mint_highland';
      spec.biomeGrid[3]![2] = 'mint_highland';
      spec.biomeGrid[3]![3] = 'mint_highland';
      spec.biomeGrid[4]![3] = 'mint_highland';
      spec.biomeGrid[4]![4] = 'mint_highland';
      spec.biomeGrid[5]![3] = 'mint_highland';
      spec.biomeGrid[5]![4] = 'mint_highland';

      const pathGrid = createEmptyBooleanGrid(12, 12);
      // S-bend 1-tile overlap on a >= 8 cell path corridor: (6..7, 7..9) and (7..8, 10..11) -> 6 + 4 = 10 cells
      for (let y = 7; y <= 9; y++) {
        pathGrid[y]![6] = true;
        pathGrid[y]![7] = true;
      }
      for (let y = 10; y <= 11; y++) {
        pathGrid[y]![7] = true;
        pathGrid[y]![8] = true;
      }

      const continent = buildSyntheticContinent(spec);
      const scanBefore = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scanBefore.countsByKind.macro_biome_diagonal_pinch).toBeGreaterThan(0);
      expect(scanBefore.countsByKind.path_sliver_or_orphan).toBeGreaterThan(0);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });
      expect(scanAfter.totalDefects).toBe(0);
      // Path S-bend should be thickened into a smooth elbow rather than erased
      expect(healed.pathGrid[9]![7]).toBe(true);
      expect(healed.pathGrid[10]![7]).toBe(true);
    });

    it('prunes disconnected miniature (< 8 cells) floating dirt path blotches and cliff-rim paths', () => {
      const spec = createUniformFixture(14, 14);
      // 4x4 Tier-1 mountain plateau at (2..5, 2..5)
      for (let y = 2; y <= 5; y++) {
        for (let x = 2; x <= 5; x++) {
          spec.heightmap[y]![x] = 1;
        }
      }

      const pathGrid = createEmptyBooleanGrid(14, 14);
      // 1. Disconnected 3x2 (6-cell) floating dirt blotch in open meadow at x: 8..10, y: 8..9
      for (let y = 8; y <= 9; y++) {
        for (let x = 8; x <= 10; x++) {
          pathGrid[y]![x] = true;
        }
      }
      // 2. Invalid dirt path painted along mountain top rim & south cliff wall at x: 3..4, y: 5..6
      pathGrid[5]![3] = true;
      pathGrid[5]![4] = true;
      pathGrid[6]![3] = true;
      pathGrid[6]![4] = true;

      const continent = buildSyntheticContinent(spec);
      const scanBefore = scanContinentAutotileDefects({ continent, pathGrid });
      expect(scanBefore.countsByKind.path_sliver_or_orphan).toBeGreaterThan(0);

      const healed = healAllContinentDefects(continent, pathGrid);
      const scanAfter = scanContinentAutotileDefects({
        continent: healed.continent,
        pathGrid: healed.pathGrid
      });
      expect(scanAfter.totalDefects).toBe(0);
      expect(healed.pathGrid[8]![8]).toBe(false);
      expect(healed.pathGrid[5]![3]).toBe(false);
      expect(healed.pathGrid[6]![3]).toBe(false);
    });

    it('polishes render-time isPavedSector clipping: prunes severed port_dock halo snippets and 1-cell halo stubs', () => {
      const spec = createUniformFixture(24, 24);
      const continent = buildSyntheticContinent(spec);
      const pathGrid = createEmptyBooleanGrid(24, 24);

      const portPoi: POINode = {
        id: 'port_test_east',
        name: 'Puerto Este',
        type: 'port_dock',
        gridX: 10,
        gridY: 10,
        elevation: 0,
        facing: 'east',
        footprint: { width: 4, height: 4 },
        terrainPreference: 'coast_water'
      };

      // Road approaching from north at x = 7..9 (severed by east-facing port_dock truck reserve at x = 7..9, y = 8..9)
      for (let y = 4; y <= 12; y++) {
        for (let x = 7; x <= 9; x++) {
          pathGrid[y]![x] = true;
        }
      }
      // Diagonal stub exiting the right halo boundary (gridX + width + 4 = 18) with only 1-cell vertical thickness at x = 18
      pathGrid[11]![17] = true;
      pathGrid[12]![17] = true;
      pathGrid[12]![18] = true;
      pathGrid[13]![18] = true;
      pathGrid[13]![19] = true;

      const { instructions } = buildMapBlitInstructions(continent, [portPoi], pathGrid);
      const dirtCells = new Set<string>();
      for (const inst of instructions) {
        if (inst.filename.startsWith('poke_path_dirt')) {
          dirtCells.add(`${Math.floor(inst.px / 32)}_${Math.floor(inst.py / 32)}`);
        }
      }

      // Severed 3x2 halo snippet at y = 6..7 above truck reserve (y = 8..9) is completely pruned
      expect(dirtCells.has('7_6')).toBe(false);
      expect(dirtCells.has('8_7')).toBe(false);
      // 1-tile jagged stub at (18, 12) is pruned, while anchored dock approach at (9, 11) remains intact
      expect(dirtCells.has('18_12')).toBe(false);
      expect(dirtCells.has('9_11')).toBe(true);
    });
  });

  describe('Multi-Seed Real Procedural Continents Closed-Loop Self-Healing Certification', () => {
    it.each([42, 101, 777])(
      'scans and heals 64x64 procedural continent (seed %i) to 0 defects with valid blit assets',
      (seed) => {
        const continent = generateContinentMap({
          seed,
          width: 64,
          height: 64,
          oceanWaterPercentage: 0.35,
          mountainPercentage: 0.24,
          lakeCount: 3,
          withStairs: true
        });
        const pathGrid = createEmptyBooleanGrid(64, 64);

        const healed = healAllContinentDefects(continent, pathGrid);
        const afterScan = scanContinentAutotileDefects({
          continent: healed.continent,
          pathGrid: healed.pathGrid
        });

        expect(afterScan.totalDefects).toBe(0);

        const { instructions, uniqueFilenames } = buildMapBlitInstructions(
          healed.continent,
          [],
          healed.pathGrid
        );
        expect(instructions.length).toBeGreaterThan(64 * 64);
        for (const filename of uniqueFilenames) {
          expect(resolveAssetWebPath(filename)).toBeTruthy();
        }
      }
    );

    it.each([
      { seed: 42, lakeCount: 2, targetCount: 18 },
      { seed: 42, lakeCount: 3, targetCount: 12 },
      { seed: 101, lakeCount: 3, targetCount: 16 },
      { seed: 777, lakeCount: 2, targetCount: 18 },
      { seed: 2026, lakeCount: 2, targetCount: 18 }
    ])(
      'scans and heals full regional job (128x128 seed=$seed lakes=$lakeCount pois=$targetCount) to 0 defects',
      ({ seed, lakeCount, targetCount }) => {
        const job = executeRegionalGenerationJob({
          seed,
          width: 128,
          height: 128,
          oceanWaterPercentage: 0.35,
          mountainPercentage: 0.22,
          lakeCount,
          targetCount,
          allowBridges: true,
          withStairs: true
        });

        const beforeScan = scanContinentAutotileDefects({
          continent: job.continent,
          pathGrid: job.routeNetwork.pathGrid,
          bridgeGrid: job.routeNetwork.bridgeGrid,
          pois: job.pois
        });
        expect(beforeScan.totalDefects).toBeGreaterThan(0);

        const healed = healAllContinentDefects(job.continent, job.routeNetwork.pathGrid, {
          pois: job.pois,
          bridgeGrid: job.routeNetwork.bridgeGrid
        });

        const afterScan = scanContinentAutotileDefects({
          continent: healed.continent,
          pathGrid: healed.pathGrid,
          bridgeGrid: job.routeNetwork.bridgeGrid,
          pois: job.pois
        });

        expect(afterScan.totalDefects).toBe(0);
      }
    );
  });
});
