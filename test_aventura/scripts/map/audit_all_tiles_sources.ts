import fs from 'node:fs';
import path from 'node:path';
import { generateContinentMap } from '../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../src/logic/map/wildernessVegetationEngine.ts';
import { buildMapBlitInstructions } from '../../src/logic/map/canvasTileRenderer.ts';
import { CANONICAL_ASSETS_BY_ID } from '../../src/logic/map/canonicalAssetsRegistry.ts';

const configs = [
  { size: 64, seed: 111, oceanWaterPercentage: 0.52, beachWidth: 2, lakeCount: 1, mountainPercentage: 0.12, mountainPalette: 'brown' as const, poiTargetCount: 10 },
  { size: 64, seed: 222, oceanWaterPercentage: 0.18, beachWidth: 4, lakeCount: 3, mountainPercentage: 0.28, mountainPalette: 'gray' as const, poiTargetCount: 12 },
  { size: 80, seed: 333, oceanWaterPercentage: 0.38, beachWidth: 3, lakeCount: 4, mountainPercentage: 0.35, mountainPalette: 'volcanic' as const, poiTargetCount: 14 },
  { size: 80, seed: 444, oceanWaterPercentage: 0.44, beachWidth: 2, lakeCount: 2, mountainPercentage: 0.32, mountainPalette: 'gray' as const, poiTargetCount: 14 },
  { size: 96, seed: 555, oceanWaterPercentage: 0.36, beachWidth: 5, lakeCount: 7, mountainPercentage: 0.10, mountainPalette: 'brown' as const, poiTargetCount: 16 },
  { size: 96, seed: 666, oceanWaterPercentage: 0.26, beachWidth: 3, lakeCount: 2, mountainPercentage: 0.42, mountainPalette: 'gray' as const, poiTargetCount: 16 },
  { size: 128, seed: 777, oceanWaterPercentage: 0.35, beachWidth: 3, lakeCount: 3, mountainPercentage: 0.22, mountainPalette: 'brown' as const, poiTargetCount: 20 },
  { size: 128, seed: 888, oceanWaterPercentage: 0.28, beachWidth: 3, lakeCount: 8, mountainPercentage: 0.18, mountainPalette: 'volcanic' as const, poiTargetCount: 22 },
  { size: 128, seed: 999, oceanWaterPercentage: 0.46, beachWidth: 2, lakeCount: 2, mountainPercentage: 0.28, mountainPalette: 'gray' as const, poiTargetCount: 18 },
  { size: 128, seed: 1010, oceanWaterPercentage: 0.22, beachWidth: 4, lakeCount: 4, mountainPercentage: 0.20, mountainPalette: 'brown' as const, poiTargetCount: 24 }
];

const allTiles = new Set<string>();

for (const cfg of configs) {
  const continent = generateContinentMap({
    width: cfg.size,
    height: cfg.size,
    seed: cfg.seed,
    oceanWaterPercentage: cfg.oceanWaterPercentage,
    beachWidth: cfg.beachWidth,
    lakeCount: cfg.lakeCount,
    mountainPercentage: cfg.mountainPercentage,
    mountainPalette: cfg.mountainPalette,
    withStairs: true
  });
  const pois = placeRegionalPOIs(continent, { targetCount: cfg.poiTargetCount });
  const routeResult = generateRouteNetwork(continent, pois);
  const wilderness = generateWildernessLayer(continent, pois, routeResult.pathGrid, { seed: cfg.seed });
  const plan = buildMapBlitInstructions(continent, pois, routeResult.pathGrid, routeResult.bridgeGrid, wilderness);
  for (const fn of plan.uniqueFilenames) {
    allTiles.add(fn);
  }
}

console.log('=== AUDIT OF TILES USED ACROSS 10 MAPS ===');
console.log(`Total unique tile filenames: ${allTiles.size}`);

const ROOT_DIR = process.cwd();

function findDiskLocations(filename: string): string[] { // no-domain: Estructura o identificador procedural de aventura
  const baseId = filename.replace(/\.png$/, '');
  const canonAsset = CANONICAL_ASSETS_BY_ID[baseId];
  const found: string[] = []; // no-domain: Estructura o identificador procedural de aventura

  if (canonAsset) {
    const canonPath = path.resolve(ROOT_DIR, 'public/assets', canonAsset.runtimePath);
    if (fs.existsSync(canonPath)) {
      found.push(`CANON: ${canonAsset.runtimePath}`);
    }
  }

  const checkDirs = [
    'public/assets/essentials/prefabs/buildings',
    'public/assets/essentials/prefabs/props',
    'public/assets/essentials/prefabs/vegetation',
    'public/assets/essentials/prefabs/elevation',
    'public/assets/essentials/prefabs/infrastructure',
    'public/assets/essentials/autotiles',
    'public/assets/canon/buildings',
    'public/assets/canon/props',
    'public/assets/prefabs/buildings',
    'public/assets/prefabs/props',
    'public/assets/prefabs/vegetation',
    'public/assets/tiles/elevation/brown',
    'public/assets/tiles/elevation/gray',
    'public/assets/tiles/terrain',
    'public/assets/tiles/water',
    'public/assets/studio/kanto/prefabs'
  ] as const;

  for (const cd of checkDirs) {
    const p = path.resolve(ROOT_DIR, cd, filename);
    if (fs.existsSync(p)) {
      found.push(cd);
    }
  }
  return found;
}

const detailed = Array.from(allTiles).sort().map(fn => {
  const baseId = fn.replace(/\.png$/, '');
  const canon = CANONICAL_ASSETS_BY_ID[baseId];
  const locations = findDiskLocations(fn);
  return {
    filename: fn,
    canonSource: canon ? canon.sourceImage : 'NONE',
    canonCategory: canon ? canon.category : 'NONE',
    locations
  };
});

fs.writeFileSync('scratch/all_used_tiles_audit.json', JSON.stringify(detailed, null, 2));

const nonCanon = detailed.filter(d => d.canonSource === 'NONE');
console.log(`Tiles in CANONICAL manifest: ${detailed.length - nonCanon.length}`);
console.log(`Tiles NOT in CANONICAL manifest: ${nonCanon.length}`);
if (nonCanon.length > 0) {
  console.log('Non-canon tiles:', nonCanon.map(x => x.filename));
}

const sourcesCount: Record<string, number> = {};
for (const d of detailed) {
  sourcesCount[d.canonSource] = (sourcesCount[d.canonSource] ?? 0) + 1;
}
console.log('Source Image breakdown:');
console.table(sourcesCount);
