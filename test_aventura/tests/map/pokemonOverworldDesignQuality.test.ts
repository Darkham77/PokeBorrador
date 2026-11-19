/**
 * test_aventura/tests/map/pokemonOverworldDesignQuality.test.ts
 *
 * TIER 1 RED-TO-GREEN SUITE: PHASE 7 POKÉMON OVERWORLD DESIGN QUALITY
 *
 * Enforces core GBA Pokémon visual & level-design invariants:
 *   1. Zero flat-grass boulder collars in temperate meadows & forests (boulders belong on cliffs/sand/deserts/highlands).
 *   2. Zero props clipping jumpable ledges or their north/south jump/landing rows.
 *   3. Civic fountains stay within urban settlement outskirts rather than deep wilderness.
 *   4. Deep open oceans stay free of noisy isolated 1-tile rock specks.
 */

import { describe, it, expect } from 'vitest';

import { generatePokemonContinentalWorld } from '../../logic/map/continent/continentalEngine.ts';
import {
  executeFullWorkerGeneration,
  executePresetWorkerJob,
  executeRegionalGenerationJob
} from '../../logic/map/continentGenerator.worker.ts';
import { IMPASSABLE_WILDERNESS_PROP_TYPES } from '../../logic/map/wildernessBoundarySealing.ts';
import type { RouteDesignSignature } from '../../types/map/pokemonGraphTypes.ts';

const TEST_CASES = [
  { seed: 42, dim: 128 },
  { seed: 777, dim: 256 }
] as const;

const MOUNTAIN_CLIFF_CHECK_RADIUS = 2 as const;
const URBAN_FOUNTAIN_MAX_DISTANCE_TILES = 16 as const;
const MAX_ISOLATED_DEEP_OCEAN_ROCKS = 4 as const;
const DEEP_OCEAN_NEIGHBOR_CHECK_RADIUS = 2 as const;

function hasGeologicalFeatureNearby(
  terrainMatrix: readonly (readonly string[])[],
  heightmap: readonly (readonly number[])[],
  occupiedFootCells: readonly (readonly boolean[])[],
  cx: number,
  cy: number,
  width: number,
  height: number
): boolean {
  for (let dy = -MOUNTAIN_CLIFF_CHECK_RADIUS; dy <= MOUNTAIN_CLIFF_CHECK_RADIUS; dy++) {
    for (let dx = -MOUNTAIN_CLIFF_CHECK_RADIUS; dx <= MOUNTAIN_CLIFF_CHECK_RADIUS; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if ((heightmap[ny]?.[nx] ?? 0) > 0 || occupiedFootCells[ny]?.[nx]) return true;
      if (terrainMatrix[ny]?.[nx] === 'sand') return true;
    }
  }
  return false;
}

describe('Phase 7 Pokémon Overworld Level-Design Quality', () => {
  for (const { seed, dim } of TEST_CASES) {
    it(`eliminates grass-meadow boulder collars, ledge prop collisions, rural fountains & ocean static (${dim}x${dim} seed=${seed})`, () => {
      const job = executeRegionalGenerationJob({ width: dim, height: dim, seed });
      const { continent, pois, wilderness, ledges, microVignettes, routeNetwork } = job;
      const W = continent.width;
      const H = continent.height;

      // 1. Zero discordant boulders on flat temperate/viridian grass meadows
      const strayMeadowBoulders = wilderness.props.filter((p) => {
        if (p.type !== 'boulder') return false;
        const terr = continent.terrainMatrix[p.y]?.[p.x];
        const elev = continent.heightmap[p.y]?.[p.x] ?? 0;
        const mBiome = continent.macroBiomes?.biomeGrid[p.y]?.[p.x] ?? 'temperate_meadow';
        if (terr !== 'grass' || elev !== 0) return false;
        if (mBiome !== 'temperate_meadow' && mBiome !== 'viridian_forest') return false;
        return !hasGeologicalFeatureNearby(
          continent.terrainMatrix,
          continent.heightmap,
          continent.resolvedMountain.occupiedFootCells,
          p.x,
          p.y,
          W,
          H
        );
      });
      expect(
        strayMeadowBoulders,
        `Stray meadow boulders on ${dim}x${dim} seed=${seed}: ${strayMeadowBoulders
          .slice(0, 5)
          .map((b) => `(${b.x},${b.y})`)
          .join(', ')}`
      ).toHaveLength(0);

      // 2. Zero blocking props clipping ledge tiles or jump/landing lanes (y-1 .. y+1)
      expect(ledges).toBeDefined();
      const ledgeSafetyKeys = new Set<string>();
      for (const ledge of ledges ?? []) {
        for (const c of ledge.cells) {
          ledgeSafetyKeys.add(`${c.x}_${c.y - 1}`);
          ledgeSafetyKeys.add(`${c.x}_${c.y}`);
          ledgeSafetyKeys.add(`${c.x}_${c.y + 1}`);
        }
      }
      const ledgeClippingProps = wilderness.props.filter(
        (p) =>
          (IMPASSABLE_WILDERNESS_PROP_TYPES.has(p.type) || p.prefabFile.includes('fence')) &&
          ledgeSafetyKeys.has(`${p.x}_${p.y}`)
      );
      expect(
        ledgeClippingProps,
        `Props clipping ledges on ${dim}x${dim} seed=${seed}: ${ledgeClippingProps
          .map((p) => `${p.prefabFile}@(${p.x},${p.y})`)
          .join(', ')}`
      ).toHaveLength(0);

      // 3. Urban civic fountains only appear near settlement outskirts
      expect(microVignettes).toBeDefined();
      const settlements = pois.filter(
        (p) => p.type === 'town' || p.type === 'city' || p.type === 'metropolis'
      );
      for (const v of microVignettes ?? []) {
        if (v.kind !== 'civic_fountain') continue;
        const vcx = v.bounds.x + v.bounds.w / 2;
        const vcy = v.bounds.y + v.bounds.h / 2;
        let minSettlementDist = Infinity;
        for (const s of settlements) {
          const dx = Math.max(s.gridX - vcx, 0, vcx - (s.gridX + s.footprint.width));
          const dy = Math.max(s.gridY - vcy, 0, vcy - (s.gridY + s.footprint.height));
          minSettlementDist = Math.min(minSettlementDist, Math.hypot(dx, dy));
        }
        expect(
          minSettlementDist,
          `civic_fountain ${v.id} at (${vcx},${vcy}) is ${minSettlementDist.toFixed(1)} tiles from nearest settlement`
        ).toBeLessThanOrEqual(URBAN_FOUNTAIN_MAX_DISTANCE_TILES);
      }

      // 4. Deep open ocean free of scattered 1-tile isolated rock static
      const seaRocks = routeNetwork.maritimeRockObstacles ?? [];
      const rockCoordSet = new Set(seaRocks.map((r) => `${r.x}_${r.y}`));
      const isolatedDeepRocks = seaRocks.filter((r) => {
        if (continent.terrainMatrix[r.y]?.[r.x] !== 'water_deep') return false;
        for (
          let dy = -DEEP_OCEAN_NEIGHBOR_CHECK_RADIUS;
          dy <= DEEP_OCEAN_NEIGHBOR_CHECK_RADIUS;
          dy++
        ) {
          for (
            let dx = -DEEP_OCEAN_NEIGHBOR_CHECK_RADIUS;
            dx <= DEEP_OCEAN_NEIGHBOR_CHECK_RADIUS;
            dx++
          ) {
            if (dx === 0 && dy === 0) continue;
            if (rockCoordSet.has(`${r.x + dx}_${r.y + dy}`)) return false;
            if (continent.terrainMatrix[r.y + dy]?.[r.x + dx] !== 'water_deep') return false;
          }
        }
        return true;
      });
      expect(
        isolatedDeepRocks.length,
        `Isolated deep-ocean rock static on ${dim}x${dim} seed=${seed}`
      ).toBeLessThanOrEqual(MAX_ISOLATED_DEEP_OCEAN_ROCKS);
    });
  }
});

const PHASE8_TEST_CASES = [
  { seed: 42, dim: 128 },
  { seed: 777, dim: 256 },
  { seed: 2026, dim: 400 }
] as const;

const OCEAN_SHALLOW_SEARCH_RADIUS = 3 as const;
const MAX_HIGHWAY_SEVERING_LEDGES = 0 as const;
const MAX_UNANCHORED_LEDGES = 0 as const;
const MAX_COLLIDING_URBAN_FENCES = 0 as const;
const CARDINAL_NEIGHBORS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const;
const EIGHT_NEIGHBORS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const;

function hasShallowOrLandWithinRadius(
  terrainMatrix: readonly (readonly string[])[],
  cx: number,
  cy: number,
  width: number,
  height: number,
  radius: number
): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (terrainMatrix[ny]?.[nx] !== 'water_deep') return true;
    }
  }
  return false;
}

describe('Phase 8 Game Freak Reference Overworld Standards (Pillar 8A-8E)', () => {
  for (const { seed, dim } of PHASE8_TEST_CASES) {
    it(`8A/8C/8E: eliminates beach/meadow boulder lines, deep sea foam confetti, highway-severing ledges, and colliding urban fences (${dim}x${dim} seed=${seed})`, () => {
      const job = executeRegionalGenerationJob({ width: dim, height: dim, seed });
      const { continent, pois, wilderness, ledges, routeNetwork } = job;
      const { pathGrid } = routeNetwork;
      const W = continent.width;
      const H = continent.height;

      // 8A-1. Zero boulders on coastal sand beaches outside desert/volcanic biomes
      const coastalBeachBoulders = wilderness.props.filter((p) => {
        if (p.type !== 'boulder') return false;
        const terr = continent.terrainMatrix[p.y]?.[p.x];
        const mBiome = continent.macroBiomes?.biomeGrid[p.y]?.[p.x] ?? 'temperate_meadow';
        if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') return false;
        return terr === 'sand';
      });
      expect(
        coastalBeachBoulders,
        `Coastal sand boulders on ${dim}x${dim} seed=${seed}: ${coastalBeachBoulders
          .slice(0, 6)
          .map((b) => `(${b.x},${b.y})`)
          .join(', ')}`
      ).toHaveLength(0);

      // 8A-2. Zero boulders on flat grass in temperate/viridian routes (even adjacent to sand or cliff edges!)
      const flatGrassBoulders = wilderness.props.filter((p) => {
        if (p.type !== 'boulder') return false;
        const terr = continent.terrainMatrix[p.y]?.[p.x];
        const elev = continent.heightmap[p.y]?.[p.x] ?? 0;
        const mBiome = continent.macroBiomes?.biomeGrid[p.y]?.[p.x] ?? 'temperate_meadow';
        if (mBiome !== 'temperate_meadow' && mBiome !== 'viridian_forest') return false;
        return terr === 'grass' && elev === 0;
      });
      expect(
        flatGrassBoulders,
        `Flat grass boulders on ${dim}x${dim} seed=${seed}: ${flatGrassBoulders
          .slice(0, 6)
          .map((b) => `(${b.x},${b.y})`)
          .join(', ')}`
      ).toHaveLength(0);

      // 8A-3. Zero deep-ocean foam/rock scatter specks far from shallow surf lanes
      const seaRocks = routeNetwork.maritimeRockObstacles ?? [];
      const openDeepSeaSpecks = seaRocks.filter(
        (r) =>
          continent.terrainMatrix[r.y]?.[r.x] === 'water_deep' &&
          !hasShallowOrLandWithinRadius(
            continent.terrainMatrix,
            r.x,
            r.y,
            W,
            H,
            OCEAN_SHALLOW_SEARCH_RADIUS
          )
      );
      expect(
        openDeepSeaSpecks,
        `Open deep-ocean rock/foam confetti on ${dim}x${dim} seed=${seed}`
      ).toHaveLength(0);

      // 8C-1. Zero ledges severing active dirt highways & zero floating unanchored ledges
      const transitable = continent.transitableGrid;
      let severingLedges = 0;
      let unanchoredLedges = 0;

      for (const ledge of ledges ?? []) {
        if (ledge.cells.some((c) => Boolean(pathGrid[c.y]?.[c.x]))) {
          severingLedges++;
        }
        const first = ledge.cells[0];
        const last = ledge.cells[ledge.cells.length - 1];
        if (first && last && transitable) {
          const leftAnchored =
            !transitable[first.y]?.[first.x - 1] ||
            (continent.heightmap[first.y]?.[first.x - 1] ?? 0) > 0 ||
            Boolean(continent.resolvedMountain.occupiedFootCells[first.y]?.[first.x - 1]);
          const rightAnchored =
            !transitable[last.y]?.[last.x + 1] ||
            (continent.heightmap[last.y]?.[last.x + 1] ?? 0) > 0 ||
            Boolean(continent.resolvedMountain.occupiedFootCells[last.y]?.[last.x + 1]);
          if (!leftAnchored && !rightAnchored) {
            unanchoredLedges++;
          }
        }
      }
      expect(severingLedges).toBeLessThanOrEqual(MAX_HIGHWAY_SEVERING_LEDGES);
      expect(unanchoredLedges).toBeLessThanOrEqual(MAX_UNANCHORED_LEDGES);

      // 8E-1. Zero urban fences colliding with boulders, cliffs, or water (plus zero wilderness 1-cell orphan fence stubs)
      const boulderCoords = new Set<string>(
        wilderness.props.filter((p) => p.type === 'boulder').map((b) => `${b.x}_${b.y}`)
      );
      const fenceCoordSet = new Set<string>();
      const collidingFences: string[] = [];

      for (const poi of pois) {
        for (const prop of poi.urbanLayout?.props ?? []) {
          if (!prop.prefabFile.includes('fence')) continue;
          fenceCoordSet.add(`${prop.x}_${prop.y}`);
          if (poi.type === 'route_gate') continue;
          const badNeighbor = EIGHT_NEIGHBORS.some(([dx, dy]) => {
            const nx = prop.x + dx;
            const ny = prop.y + dy;
            const terr = continent.terrainMatrix[ny]?.[nx];
            const isCliff =
              (continent.heightmap[ny]?.[nx] ?? 0) > 0 ||
              Boolean(continent.resolvedMountain.occupiedFootCells[ny]?.[nx]);
            return (
              terr === 'water' ||
              terr === 'water_deep' ||
              isCliff ||
              boulderCoords.has(`${nx}_${ny}`)
            );
          });
          if (badNeighbor) {
            collidingFences.push(`${poi.id}@(${prop.x},${prop.y})`);
          }
        }
      }

      for (const prop of wilderness.props) {
        if (!prop.prefabFile.includes('fence')) continue;
        fenceCoordSet.add(`${prop.x}_${prop.y}`);
      }

      let orphanWildernessFences = 0;
      for (const prop of wilderness.props) {
        if (!prop.prefabFile.includes('fence')) continue;
        const hasFenceNeighbor = CARDINAL_NEIGHBORS.some(([dx, dy]) =>
          fenceCoordSet.has(`${prop.x + dx}_${prop.y + dy}`)
        );
        if (!hasFenceNeighbor) orphanWildernessFences++;
      }

      expect(
        collidingFences,
        `Colliding urban fences on ${dim}x${dim} seed=${seed}: ${collidingFences.join(', ')}`
      ).toHaveLength(MAX_COLLIDING_URBAN_FENCES);
      expect(orphanWildernessFences).toBe(0);

      // 8B/8D. Emergent corridor route design signature diversity on 256+/400 continents
      if (dim >= 256) {
        const world = generatePokemonContinentalWorld({ width: dim, height: dim, seed });
        const signatures = new Set<RouteDesignSignature>();
        for (const prop of world.corridorProperties) {
          signatures.add(prop.designSignature);
        }
        expect(
          signatures.size,
          `Expected >= 2 distinct route design signatures on ${dim}x${dim} seed=${seed}`
        ).toBeGreaterThanOrEqual(2);
      }
    });
  }

  it('8A-visual: eliminates flat-ground & sand boulder wall chains across 128/256/400 and Johto preset', () => {
    const FLAT_BOULDER_CHAIN_LIMIT = 2;
    const targets = [
      {
        label: '128x128 seed=100',
        out: executeFullWorkerGeneration({
          width: 128,
          height: 128,
          seed: 100,
          oceanWaterPercentage: 0.35,
          mountainPercentage: 0.22,
          lakeCount: 2,
          targetCount: 18,
          allowBridges: true
        }).result
      },
      {
        label: 'johto preset seed=2026',
        out: executePresetWorkerJob('johto', 2026).result
      },
      {
        label: '256x256 seed=777',
        out: executeFullWorkerGeneration({
          width: 256,
          height: 256,
          seed: 777,
          oceanWaterPercentage: 0.35,
          mountainPercentage: 0.22,
          lakeCount: 2,
          targetCount: 18,
          allowBridges: true
        }).result
      }
    ];

    for (const { label, out } of targets) {
      const { continent, wilderness, pois, progressionObstacles } = out;
      const allBoulderEntries = [
        ...wilderness.props
          .filter((p) => p.type === 'boulder' || p.prefabFile.includes('boulder'))
          .map((p) => ({ source: 'wilderness', x: p.x, y: p.y, prefabFile: p.prefabFile })),
        ...(progressionObstacles ?? []).flatMap((o) => [
          ...(o.prefabFile.includes('boulder')
            ? [{ source: `obstacle:${o.type}`, x: o.x, y: o.y, prefabFile: o.prefabFile }]
            : []),
          ...(o.flankingProps ?? [])
            .filter((fp) => fp.prefabFile.includes('boulder'))
            .map((fp) => ({
              source: `obstacle_flank:${o.type}`,
              x: fp.x,
              y: fp.y,
              prefabFile: fp.prefabFile
            }))
        ]),
        ...pois.flatMap((poi) =>
          (poi.urbanLayout?.props ?? [])
            .filter((p) => p.type === 'rock' || p.prefabFile.includes('boulder'))
            .map((p) => ({ source: `poi:${poi.id}`, x: p.x, y: p.y, prefabFile: p.prefabFile }))
        )
      ];
      const flatSandBoulders = allBoulderEntries.filter((b) => {
        const elev = continent.heightmap[b.y]?.[b.x] ?? 0;
        const terrain = continent.terrainMatrix[b.y]?.[b.x];
        return elev === 0 && terrain === 'sand';
      });
      expect(
        flatSandBoulders,
        `Flat sand boulder wall props on ${label}: ${flatSandBoulders
          .slice(0, 8)
          .map((b) => `${b.source}@(${b.x},${b.y}):${b.prefabFile}`)
          .join(', ')}`
      ).toHaveLength(0);

      // Zero 3+ boulder wall chains anywhere on flat terrain (heightmap === 0)
      const flatBoulders = allBoulderEntries.filter(
        (b) => (continent.heightmap[b.y]?.[b.x] ?? 0) === 0
      );
      const flatKeySet = new Set(flatBoulders.map((b) => `${b.x}_${b.y}`));
      const visited = new Set<string>();
      let maxChain = 0;

      for (const start of flatBoulders) {
        const startKey = `${start.x}_${start.y}`;
        if (visited.has(startKey)) continue;
        const queue = [start];
        visited.add(startKey);
        let size = 0;
        while (queue.length > 0) {
          const cur = queue.pop()!;
          size++;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nKey = `${cur.x + dx}_${cur.y + dy}`;
              if (flatKeySet.has(nKey) && !visited.has(nKey)) {
                visited.add(nKey);
                queue.push({ ...cur, x: cur.x + dx, y: cur.y + dy });
              }
            }
          }
        }
        if (size > maxChain) maxChain = size;
      }

      expect(
        maxChain,
        `Max contiguous flat boulder chain on ${label} was ${maxChain}`
      ).toBeLessThanOrEqual(FLAT_BOULDER_CHAIN_LIMIT);
    }
  });

  it('8B/8C/8D/8E-complete: enforces non-square silhouettes, >= 6-cell tall grass meadows, active marsh puddles, >= 3 signatures & anchored urban props', () => {
    const MIN_TALL_GRASS_COMPONENT = 6;
    const MAX_SILHOUETTE_BBOX_FILL = 0.78;
    const MIN_SIGNATURES_LARGE = 3;
    const ANCHORED_TYPES = new Set(['bench', 'flower', 'signpost']);
    const URBAN_SETTLEMENT_TYPES = new Set(['town', 'city', 'metropolis', 'pokemon_league']);

    const worlds = [
      {
        label: '128x128 seed=100',
        dim: 128,
        world: generatePokemonContinentalWorld({ width: 128, height: 128, seed: 100 })
      },
      {
        label: '256x256 seed=777',
        dim: 256,
        world: generatePokemonContinentalWorld({ width: 256, height: 256, seed: 777 })
      },
      {
        label: '400x400 seed=2026',
        dim: 400,
        world: generatePokemonContinentalWorld({ width: 400, height: 400, seed: 2026 })
      }
    ];

    for (const { label, dim, world } of worlds) {
      const { continent, wilderness, pois, corridorProperties } = world;
      const W = continent.width;
      const H = continent.height;

      // 8B: Non-square silhouette concavity (landmass fills < 78% of its own bounding box)
      let minLx = W;
      let maxLx = -1;
      let minLy = H;
      let maxLy = -1;
      let landCells = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const t = continent.terrainMatrix[y]?.[x];
          if (t === 'grass' || t === 'sand') {
            landCells++;
            if (x < minLx) minLx = x;
            if (x > maxLx) maxLx = x;
            if (y < minLy) minLy = y;
            if (y > maxLy) maxLy = y;
          }
        }
      }
      const bboxArea = Math.max(1, (maxLx - minLx + 1) * (maxLy - minLy + 1));
      const fillRatio = landCells / bboxArea;
      expect(
        fillRatio,
        `Silhouette too rectangular on ${label}: fillRatio=${fillRatio.toFixed(3)}`
      ).toBeLessThan(MAX_SILHOUETTE_BBOX_FILL);

      // 8C: Zero isolated tall-grass slivers with < 6 connected cells
      const tg = wilderness.tallGrassGrid;
      const tgVisited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
      let tinyTallGrassComponents = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!tg[y]?.[x] || tgVisited[y]![x]) continue;
          const queue: { x: number; y: number }[] = [{ x, y }];
          tgVisited[y]![x] = true;
          let compSize = 0;
          while (queue.length > 0) {
            const cur = queue.pop()!;
            compSize++;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1]
            ] as const) {
              const nx = cur.x + dx;
              const ny = cur.y + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H && tg[ny]?.[nx] && !tgVisited[ny]![nx]) {
                tgVisited[ny]![nx] = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }
          if (compSize < MIN_TALL_GRASS_COMPONENT) {
            tinyTallGrassComponents++;
          }
        }
      }
      expect(
        tinyTallGrassComponents,
        `Found ${tinyTallGrassComponents} isolated tall-grass slivers (< ${MIN_TALL_GRASS_COMPONENT} cells) on ${label}`
      ).toBe(0);

      // 8D: >= 3 distinct route design signatures on 256+ worlds & active puddle/meadow features
      if (dim >= 256) {
        const signatures = new Set<RouteDesignSignature>(
          corridorProperties.map((p) => p.designSignature)
        );
        expect(
          signatures.size,
          `Expected >= ${MIN_SIGNATURES_LARGE} distinct RouteDesignSignature values on ${label}, got: ${[...signatures].join(', ')}`
        ).toBeGreaterThanOrEqual(MIN_SIGNATURES_LARGE);

        // Verify wetland_puddle_marsh corridors stamp at least one shallow puddle pocket nearby
        const marshCorridors = corridorProperties.filter(
          (p) => p.designSignature === 'wetland_puddle_marsh'
        );
        if (marshCorridors.length > 0) {
          const embeddedById = new Map(world.embedded.corridors.map((c) => [c.id, c]));
          let marshWaterPuddles = 0;
          for (const mc of marshCorridors) {
            const baseEdgeId = mc.corridorId.replace(/_part\d+$/, '');
            const corr = embeddedById.get(mc.corridorId) ?? embeddedById.get(baseEdgeId);
            if (!corr) continue;
            for (const pt of corr.pathCells) {
              for (let dy = -6; dy <= 6; dy++) {
                for (let dx = -6; dx <= 6; dx++) {
                  if (continent.terrainMatrix[pt.y + dy]?.[pt.x + dx] === 'water') {
                    marshWaterPuddles++;
                  }
                }
              }
            }
          }
          expect(
            marshWaterPuddles,
            `Expected shallow water puddle cells near wetland_puddle_marsh corridors on ${label}`
          ).toBeGreaterThan(0);
        }
      }

      // 8E: All urban bench/flower/signpost props anchored <= 1 Chebyshev tile from streets/plazas/buildings
      const unanchoredUrbanProps: string[] = [];
      for (const poi of pois) {
        if (!URBAN_SETTLEMENT_TYPES.has(poi.type) || !poi.urbanLayout) continue;
        const anchorKeys = new Set<string>();
        for (const st of poi.urbanLayout.internalStreets ?? []) {
          anchorKeys.add(`${st.x}_${st.y}`);
        }
        for (const pz of poi.urbanLayout.pavedPlazaCells ?? []) {
          anchorKeys.add(`${pz.x}_${pz.y}`);
        }
        for (const b of poi.urbanLayout.buildings ?? []) {
          for (let by = b.y; by < b.y + b.height; by++) {
            for (let bx = b.x; bx < b.x + b.width; bx++) {
              anchorKeys.add(`${bx}_${by}`);
            }
          }
        }
        for (const prop of poi.urbanLayout.props ?? []) {
          if (!ANCHORED_TYPES.has(prop.type)) continue;
          let anchored = false;
          for (let dy = -1; dy <= 1 && !anchored; dy++) {
            for (let dx = -1; dx <= 1 && !anchored; dx++) {
              if (anchorKeys.has(`${prop.x + dx}_${prop.y + dy}`)) {
                anchored = true;
              }
            }
          }
          if (!anchored) {
            unanchoredUrbanProps.push(`${poi.id}:${prop.type}@(${prop.x},${prop.y})`);
          }
        }
      }
      expect(
        unanchoredUrbanProps,
        `Unanchored urban props on ${label}: ${unanchoredUrbanProps.slice(0, 8).join(', ')}`
      ).toHaveLength(0);
    }

    // 8E across Kanto & Johto canonical presets too
    for (const preset of ['kanto', 'johto'] as const) {
      const out = executePresetWorkerJob(preset, 2026).result;
      expect(out.pois.length).toBeGreaterThan(0);
      expect(out.wilderness.trees.length).toBeGreaterThan(0);
    }
  });

  it('8A/8B/8E-spec-closure: breaks divided_valley U-wall, removes flat mint boulders, and enforces urban fence/prop hygiene on Kanto & Johto', () => {
    const URBAN_SETTLEMENT_TYPES = new Set<string>([
      'town',
      'city',
      'metropolis',
      'pokemon_league'
    ]);
    const ANCHORED_TYPES = new Set<string>(['bench', 'flower', 'signpost']);

    // 8B: divided_valley 400x400 must not pin mainland nodes into two extreme left/right edge towers ("U")
    const world400 = generatePokemonContinentalWorld({
      width: 400,
      height: 400,
      seed: 2026,
      lakeCount: 2,
      mountainPercentage: 0.22
    });
    const mainland400 = world400.embedded.nodes.filter(
      (n) => !n.isIsland && n.role !== 'secondary_cave'
    );
    const northHalfMainland = mainland400.filter((n) => n.centerY < 200);
    const northInteriorMainland = northHalfMainland.filter(
      (n) => n.centerX >= 100 && n.centerX <= 300
    );
    expect(
      northInteriorMainland.length,
      `divided_valley 400x400 north half forms an empty U-gap (0 interior nodes in x=100..300 out of ${northHalfMainland.length} northern nodes)`
    ).toBeGreaterThanOrEqual(2);

    // 8A: zero flat mint_highland roadside mossy boulders on 400x400
    const flatMintBoulders = world400.wilderness.props.filter((p) => {
      if (p.type !== 'boulder') return false;
      const elev = world400.continent.heightmap[p.y]?.[p.x] ?? 0;
      const biome = world400.continent.macroBiomes?.biomeGrid[p.y]?.[p.x];
      return elev === 0 && biome === 'mint_highland';
    });
    expect(
      flatMintBoulders,
      `Found ${flatMintBoulders.length} flat mint_highland boulders on 400x400`
    ).toHaveLength(0);

    // 8E: Kanto & Johto canonical presets must pass urban fence collision, <3-stub & prop anchoring hygiene
    for (const preset of ['kanto', 'johto'] as const) {
      const out = executePresetWorkerJob(preset, 2026).result;
      const unanchored: string[] = [];
      const collidingFences: string[] = [];
      const shortFenceStubs: string[] = [];

      for (const poi of out.pois) {
        if (!URBAN_SETTLEMENT_TYPES.has(poi.type) || !poi.urbanLayout) continue;
        const anchorKeys = new Set<string>();
        for (const st of poi.urbanLayout.internalStreets ?? []) anchorKeys.add(`${st.x}_${st.y}`);
        for (const pz of poi.urbanLayout.pavedPlazaCells ?? []) anchorKeys.add(`${pz.x}_${pz.y}`);
        for (const b of poi.urbanLayout.buildings ?? []) {
          for (let by = b.y; by < b.y + b.height; by++) {
            for (let bx = b.x; bx < b.x + b.width; bx++) anchorKeys.add(`${bx}_${by}`);
          }
        }

        const fenceCoords = new Map<string, { readonly x: number; readonly y: number }>();
        for (const prop of poi.urbanLayout.props ?? []) {
          if (ANCHORED_TYPES.has(prop.type)) {
            let anchored = false;
            for (let dy = -1; dy <= 1 && !anchored; dy++) {
              for (let dx = -1; dx <= 1 && !anchored; dx++) {
                if (anchorKeys.has(`${prop.x + dx}_${prop.y + dy}`)) anchored = true;
              }
            }
            if (!anchored)
              unanchored.push(`${preset}:${poi.id}:${prop.type}@(${prop.x},${prop.y})`);
          }
          if (prop.prefabFile.includes('fence')) {
            fenceCoords.set(`${prop.x}_${prop.y}`, { x: prop.x, y: prop.y });
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const terr = out.continent.terrainMatrix[prop.y + dy]?.[prop.x + dx];
                const elev = out.continent.heightmap[prop.y + dy]?.[prop.x + dx] ?? 0;
                if (terr === 'water' || terr === 'water_deep' || elev > 0) {
                  collidingFences.push(`${preset}:${poi.id}@(${prop.x},${prop.y})`);
                  break;
                }
              }
            }
          }
        }

        const visited = new Set<string>();
        for (const [key, pt] of fenceCoords) {
          if (visited.has(key)) continue;
          visited.add(key);
          const q = [pt];
          let size = 0;
          for (let head = 0; head < q.length; head++) {
            const cur = q[head]!;
            size++;
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1]
            ] as const) {
              const nk = `${cur.x + dx}_${cur.y + dy}`;
              const next = fenceCoords.get(nk);
              if (next && !visited.has(nk)) {
                visited.add(nk);
                q.push(next);
              }
            }
          }
          if (size < 3) shortFenceStubs.push(`${preset}:${poi.id}:${key}(size=${size})`);
        }
      }

      expect(
        unanchored,
        `Unanchored urban props in ${preset}: ${unanchored.slice(0, 6).join(', ')}`
      ).toHaveLength(0);
      expect(
        collidingFences,
        `Colliding urban fences in ${preset}: ${collidingFences.slice(0, 6).join(', ')}`
      ).toHaveLength(0);
      expect(
        shortFenceStubs,
        `Short <3 urban fence stubs in ${preset}: ${shortFenceStubs.slice(0, 6).join(', ')}`
      ).toHaveLength(0);
    }
  });
});
