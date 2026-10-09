import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { generateSettlementLayout } from '../../../src/logic/map/cityLayoutEngine.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import type { POINode } from '../../../src/types/map/poiTypes.ts';

const ROOT_DIR = process.cwd();

describe('building_and_props_cut_detector', () => {
  it('detects touching or overlapping buildings in Metropolis layout (zero clearance)', () => {
    const node: POINode = {
      id: 'celadon_capital',
      name: 'Ciudad Celeste',
      type: 'metropolis',
      footprint: { width: 26, height: 22 },
      terrainPreference: 'flat_grass',
      gridX: 20,
      gridY: 20,
      elevation: 0
    };

    const layout = generateSettlementLayout(node);
    const bldgs = layout.buildings;

    const collisions: string[] = [];
    const touchingBuildings: string[] = [];

    for (let i = 0; i < bldgs.length; i++) {
      for (let j = i + 1; j < bldgs.length; j++) {
        const a = bldgs[i]!;
        const b = bldgs[j]!;

        // Overlap (intersection)
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        if (overlapX && overlapY) {
          collisions.push(`${a.id} (${a.prefabFile}) overlaps with ${b.id} (${b.prefabFile})`);
        }

        // Touching directly (0 tile clearance)
        const touchHoriz = (a.x + a.width === b.x || b.x + b.width === a.x) && !(a.y + a.height <= b.y || b.y + b.height <= a.y);
        const touchVert = (a.y + a.height === b.y || b.y + b.height === a.y) && !(a.x + a.width <= b.x || b.x + b.width <= a.x);
        if (touchHoriz || touchVert) {
          touchingBuildings.push(`${a.id} (${a.prefabFile}) is touching ${b.id} (${b.prefabFile}) with 0-tile gap`);
        }
      }
    }

    console.log('Metropolis Touching Buildings:', touchingBuildings);
    expect(collisions).toEqual([]);
    expect(touchingBuildings).toEqual([]);
  });

  it('guarantees minimum 1-tile clearance between distinct buildings across all settlements', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      mountainPalette: 'brown',
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const touchingViolations: string[] = [];
    const overlapViolations: string[] = [];
    const overflowViolations: string[] = [];

    for (const poi of pois) {
      if (!poi.urbanLayout) continue;
      const bldgs = poi.urbanLayout.buildings;

      for (let i = 0; i < bldgs.length; i++) {
        const a = bldgs[i]!;

        // Out of bounds check
        if (
          a.x < poi.gridX ||
          a.y < poi.gridY ||
          a.x + a.width > poi.gridX + poi.footprint.width ||
          a.y + a.height > poi.gridY + poi.footprint.height
        ) {
          overflowViolations.push(
            `POI ${poi.name} (${poi.type}): Building ${a.id} (${a.prefabFile}) [${a.x},${a.y} ${a.width}x${a.height}] overflows POI bounds [${poi.gridX},${poi.gridY} ${poi.footprint.width}x${poi.footprint.height}]`
          );
        }

        for (let j = i + 1; j < bldgs.length; j++) {
          const b = bldgs[j]!;

          // Overlap check
          const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
          const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
          if (overlapX && overlapY) {
            overlapViolations.push(
              `POI ${poi.name}: ${a.id} (${a.prefabFile}) overlaps with ${b.id} (${b.prefabFile})`
            );
          }

          // Clearance check (minimum 1 tile between distinct buildings)
          const touchHoriz =
            (a.x + a.width === b.x || b.x + b.width === a.x) &&
            !(a.y + a.height <= b.y || b.y + b.height <= a.y);
          const touchVert =
            (a.y + a.height === b.y || b.y + b.height === a.y) &&
            !(a.x + a.width <= b.x || b.x + b.width <= a.x);
          if (touchHoriz || touchVert) {
            touchingViolations.push(
              `POI ${poi.name}: ${a.id} (${a.prefabFile}) touches ${b.id} (${b.prefabFile}) with 0-tile gap`
            );
          }
        }
      }
    }

    expect(overflowViolations).toEqual([]);
    expect(overlapViolations).toEqual([]);
    expect(touchingViolations).toEqual([]);
  });

  it('guarantees zero props placed inside building bounding boxes or doorstep reserves', () => {
    const continent = generateContinentMap({
      width: 128,
      height: 128,
      seed: 42,
      oceanWaterPercentage: 0.35,
      beachWidth: 3,
      lakeCount: 3,
      mountainPercentage: 0.22,
      mountainPalette: 'brown',
      withStairs: true
    });

    const pois = placeRegionalPOIs(continent, { targetCount: 18 });
    const propCollisions: string[] = [];

    for (const poi of pois) {
      if (!poi.urbanLayout) continue;
      const { buildings, props } = poi.urbanLayout;

      for (const pr of props) {
        for (const b of buildings) {
          if (
            pr.x >= b.x &&
            pr.x < b.x + b.width &&
            pr.y >= b.y &&
            pr.y < b.y + b.height
          ) {
            propCollisions.push(
              `POI ${poi.name}: Prop ${pr.type} (${pr.prefabFile}) at (${pr.x},${pr.y}) is inside building ${b.id} (${b.width}x${b.height} at ${b.x},${b.y})`
            );
          }
        }
      }
    }

    expect(propCollisions).toEqual([]);
  });

  it('guarantees building prefabs on disk are not abruptly cut flat on roof apex (y=0)', async () => {
    const manifestPath = path.resolve(ROOT_DIR, 'src/data/map/canonical_assets_manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    interface ManifestEntry {
      readonly id: string;
      readonly category: string;
      readonly runtimePath: string;
      readonly pixelDimensions: { w: number; h: number };
      readonly tileDimensions: { w: number; h: number };
    }

    const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const buildings = manifest.filter((e) => e.category === 'buildings');

    const cutRoofs: string[] = [];

    const NON_ROOF_STRUCTURE_IDS = new Set<string>([
      'poke_dock_pier_wood_small',
      'poke_dock_pier_wood_smooth',
      'poke_arena_rock_plateau',
      'poke_league_grand_staircase',
      'poke_cave_entrance_brown',
      'poke_cave_entrance_gray',
      'poke_market_produce_stall',
      'poke_market_yellow_awning',
      'pokemon_league',
      'poke_league_checkpoint_gate',
      'gatehouse_route',
      'gatehouse_route_horizontal'
    ]);

    for (const b of buildings) {
      const fullPath = path.resolve(ROOT_DIR, 'public/assets', b.runtimePath);
      expect(fs.existsSync(fullPath), `Building file must exist: ${b.runtimePath}`).toBe(true);

      const meta = await sharp(fullPath).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;

      // Dimension checks: strict 32px multiples across 100% of building assets
      if (w % 32 !== 0 || h % 32 !== 0) {
        cutRoofs.push(`${b.id} (${b.runtimePath}): non-32px dimensions ${w}x${h} (mod: ${w % 32}, ${h % 32})`);
      }
      if (w !== b.pixelDimensions.w || h !== b.pixelDimensions.h) {
        cutRoofs.push(`${b.id} (${b.runtimePath}): file ${w}x${h} !== manifest ${b.pixelDimensions.w}x${b.pixelDimensions.h}`);
      }

      // Check if top row y=0 has a flat cut on roof apex
      if (!NON_ROOF_STRUCTURE_IDS.has(b.id)) {
        const { data } = await sharp(fullPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let topOpaque = 0;
        for (let x = 0; x < w; x++) {
          if (data[x * 4 + 3]! > 128) topOpaque++;
        }

        if (b.id === 'poke_dept_store') {
          // Flat-rooftop commercial department store: must have transparent rounded corners
          const leftCornerOpaque = data[0 * 4 + 3]! > 128;
          const rightCornerOpaque = data[(w - 1) * 4 + 3]! > 128;
          if (leftCornerOpaque || rightCornerOpaque || topOpaque === w) {
            cutRoofs.push(`${b.id} (${b.runtimePath}): flat-cut without rounded corners (CHOPPED ROOF)`);
          }
        } else {
          // Pitched/gabled-roof buildings: top row apex cannot be a solid flat cut (> 60% opaque)
          if (topOpaque > w * 0.6) {
            cutRoofs.push(`${b.id} (${b.runtimePath}): ${topOpaque}/${w} opaque pixels on top row y=0 (CHOPPED ROOF)`);
          }
        }
      }
    }

    console.log('All Asset Dimension & Roof Crop Violations:', cutRoofs);
    expect(cutRoofs).toEqual([]);
  });
});
