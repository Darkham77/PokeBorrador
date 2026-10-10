/**
 * src/logic/map/kantoProceduralCarver.ts
 *
 * PROCEDURAL TERRAIN CARVER & PREFAB STAMP ENGINE
 * Implements organic procedural coastline carving, mountain massifs, town layouts,
 * props decoration, and universal bridge placement for non-canonical or custom maps.
 */

import {
  KANTO_GRID_W,
  KANTO_GRID_H,
  KANTO_TILE_SIZE,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  OccupancyGrid,
  type KantoNodeCoordinate,
  type IKantoCarverWorldContext
} from '../../types/map/kantoGridModel.ts';
import { SimplexNoise } from './noise/simplexNoise.ts';
import { findValidBuildingPlacementSpot } from './buildingPlacementSolver.ts';
import {
  CONTINENT_DEFAULT_SEED
} from '../../config/studioConstants.ts';
import {
  MOUNTAIN_BLOCK_RADIUS_TILES,
  DOOR_PATH_EXTENSION_STEPS,
  CA_SMOOTH_ISOLATED_LIMIT,
  CA_SMOOTH_FILL_LIMIT,
  ARCHETYPE_COUNT,
  DEFAULT_BRIDGE_TILE_SPAN,
  CLEARING_HALF_DIMENSIONS,
  MT_MOON_FOOT_RECT,
  COASTLINE_MARGIN_CONFIG,
  NORTHERN_BARRIER_CONFIG,
  NORTH_WEST_RIDGE_CONFIG,
  VOLCANIC_PENINSULA_CONFIG,
  URBAN_ROAD_LAYOUTS,
  BUILDING_LAYOUTS,
  TOWN_PROPS_LAYOUTS,
  RELIEF_PROPS_CONFIG
} from '../../config/kantoCarverConfig.ts';

/**
 * Fills the regional map matrix with 100% impenetrable nature (FOREST_WALL, elevation 1) by default.
 */
export function fillImpenetrableWorld(gen: IKantoCarverWorldContext): void {
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;
  gen.grid = Array.from({ length: H }, () => new Uint8Array(W).fill(CELL_BIOME.FOREST_WALL));
  gen.elevation = Array.from({ length: H }, () => new Uint8Array(W).fill(1));
  gen.occupancy = new OccupancyGrid(W, H);
}

/**
 * Carves organic settlement clearings through the dense forest wall according to urban scale.
 * Rural villages get natural grass ground; metropolises get expanded clearings for boulevards.
 */
export function carveSettlementClearings(
  gen: IKantoCarverWorldContext,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const g = gen.grid;
  const elev = gen.elevation;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;

  Object.entries(nodes).forEach(([id, n]) => {
    if (id === 'mtmoon') {
      const { tx, ty } = gen.nodeToTile(n.x, n.y);
      // Explanada despejada for Pokémon Center, Route 3/4 path, and Mt. Moon foot
      for (let dy = MT_MOON_FOOT_RECT.minDy; dy <= MT_MOON_FOOT_RECT.maxDy; dy++) {
        for (let dx = MT_MOON_FOOT_RECT.minDx; dx <= MT_MOON_FOOT_RECT.maxDx; dx++) {
          const gx = tx + dx;
          const gy = ty + dy;
          if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
            const row = g[gy];
            const eRow = elev[gy];
            if (row && row[gx] !== CELL_BIOME.WATER && row[gx] !== CELL_BIOME.MOUNTAIN_DIRT) {
              row[gx] = CELL_BIOME.GRASS;
              if (eRow) eRow[gx] = 1;
              gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.CLIFF);
            }
          }
        }
      }
      return;
    }

    // Only carve urban clearings for actual cities and standalone hamlets (never routes or POIs)
    if (n.type !== 'city' && id !== 'billshouse') return;

    const { tx, ty } = gen.nodeToTile(n.x, n.y);
    const isMetropolis = id === 'saffron' || id === 'celadon';
    const isBastion = id === 'pewter' || id === 'cerulean' || id === 'viridian' || id === 'fuchsia';
    const isPort = id === 'vermilion';
    const archetypeKey = isMetropolis ? 'metropolis' : isBastion ? 'bastion' : isPort ? 'port' : 'village';
    const { halfW, halfH } = CLEARING_HALF_DIMENSIONS[archetypeKey];

    for (let dy = -halfH; dy <= halfH; dy++) {
      for (let dx = -halfW; dx <= halfW; dx++) {
        const gx = tx + dx;
        const gy = ty + dy;
        if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
          // Classic GBA modular rectangular clearing: crisp rectangular borders
          const normDist = Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
          if (normDist <= 1.0) {
            const row = g[gy];
            const eRow = elev[gy];
            // Never carve away mountains or water
            if (row && row[gx] !== CELL_BIOME.WATER && row[gx] !== CELL_BIOME.MOUNTAIN_DIRT) {
              row[gx] = CELL_BIOME.GRASS;
              if (eRow) {
                eRow[gx] = 1;
              }
              gen.occupancy.clear(gx, gy, OCCUPANCY_FLAGS.CLIFF);
            }
          }
        }
      }
    }
  });
}

/**
 * Carves natural oceanic perimeters with sinusoidal shoreline wobble around map edges.
 */
export function carveProceduralCoastlines(gen: IKantoCarverWorldContext): void {
  const g = gen.grid;
  const elev = gen.elevation;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;

  const setWater = (x: number, y: number) => {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      const row = g[y];
      const eRow = elev[y];
      if (row && eRow) {
        row[x] = CELL_BIOME.WATER;
        eRow[x] = 0;
        gen.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
      }
    }
  };

  // Outer ocean margins (approx 4-6 tiles with sinusoidal wobble)
  for (let y = 0; y < H; y++) {
    const leftMargin = Math.max(1, Math.round(COASTLINE_MARGIN_CONFIG.left.base + Math.sin(y * COASTLINE_MARGIN_CONFIG.left.freq + gen.seed) * COASTLINE_MARGIN_CONFIG.left.amp));
    for (let x = 0; x < leftMargin; x++) {
      setWater(x, y);
    }
    const rightMargin = Math.min(W - 1, Math.round(W - COASTLINE_MARGIN_CONFIG.right.offset + Math.cos(y * COASTLINE_MARGIN_CONFIG.right.freq + gen.seed * COASTLINE_MARGIN_CONFIG.right.seedMult) * COASTLINE_MARGIN_CONFIG.right.amp));
    for (let x = rightMargin; x < W; x++) {
      setWater(x, y);
    }
  }

  for (let x = 0; x < W; x++) {
    const topMargin = Math.max(1, Math.round(COASTLINE_MARGIN_CONFIG.top.base + Math.cos(x * COASTLINE_MARGIN_CONFIG.top.freq + gen.seed * COASTLINE_MARGIN_CONFIG.top.seedMult) * COASTLINE_MARGIN_CONFIG.top.amp));
    for (let y = 0; y < topMargin; y++) {
      setWater(x, y);
    }
    const bottomMargin = Math.min(H - 1, Math.round(H - COASTLINE_MARGIN_CONFIG.bottom.offset + Math.sin(x * COASTLINE_MARGIN_CONFIG.bottom.freq + gen.seed) * COASTLINE_MARGIN_CONFIG.bottom.amp));
    for (let y = bottomMargin; y < H; y++) {
      setWater(x, y);
    }
  }

  // Natural sand beach borders where low-elevation land meets water
  for (let y = 1; y < H - 1; y++) {
    const row = g[y];
    if (!row) continue;
    for (let x = 1; x < W - 1; x++) {
      if (row[x] === CELL_BIOME.GRASS && (elev[y]?.[x] ?? 0) <= 1) {
        const hasWaterNeighbor =
          g[y - 1]?.[x] === CELL_BIOME.WATER ||
          g[y + 1]?.[x] === CELL_BIOME.WATER ||
          g[y]?.[x - 1] === CELL_BIOME.WATER ||
          g[y]?.[x + 1] === CELL_BIOME.WATER;
        if (hasWaterNeighbor && !gen.occupancy.has(x, y, OCCUPANCY_FLAGS.ROAD)) {
          row[x] = CELL_BIOME.DIRT_PATH;
        }
      }
    }
  }
}

/**
 * Procedurally carves authentic organic 2.5D mountain chains and massifs:
 * Northern barrier range, North-West Victory range, and South-East volcanic peninsula.
 * Governed by SimplexNoise thresholding and Cellular Automata contour smoothing (Zero rectangular loops).
 */
export function carveProceduralMountainChains(
  gen: IKantoCarverWorldContext,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const g = gen.grid;
  const elev = gen.elevation;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;
  const simplex = new SimplexNoise(gen.seed ?? CONTINENT_DEFAULT_SEED);

  const nodeTiles = Object.values(nodes).map((n) => gen.nodeToTile(n.x, n.y));

  const isBlocked = (gx: number, gy: number): boolean => {
    if (gen.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.ROAD_BUFFER | OCCUPANCY_FLAGS.BUILDING)) {
      return true;
    }
    return nodeTiles.some((nt) => Math.hypot(nt.tx - gx, nt.ty - gy) < MOUNTAIN_BLOCK_RADIUS_TILES);
  };

  const candidateMt = Array.from({ length: H }, () => new Uint8Array(W));
  const candidateElev = Array.from({ length: H }, () => new Uint8Array(W));

  // 1. Northern Barrier Range (organic undulating spine along top border, gy ~ 2..10)
  for (let gy = NORTHERN_BARRIER_CONFIG.minGy; gy <= NORTHERN_BARRIER_CONFIG.maxGy; gy++) {
    for (let gx = NORTHERN_BARRIER_CONFIG.marginX; gx < W - NORTHERN_BARRIER_CONFIG.marginX; gx++) {
      const isPass = gx >= Math.floor(W * NORTHERN_BARRIER_CONFIG.minPassFactor) && gx <= Math.floor(W * NORTHERN_BARRIER_CONFIG.maxPassFactor);
      if (isPass) continue;
      if (isBlocked(gx, gy)) continue;

      const spineY = NORTHERN_BARRIER_CONFIG.baseSpineY + Math.sin(gx * NORTHERN_BARRIER_CONFIG.sinFreq) * NORTHERN_BARRIER_CONFIG.sinAmp;
      const dist = Math.abs(gy - spineY);
      const noise = simplex.noise2D(gx * NORTHERN_BARRIER_CONFIG.noiseFreqX, gy * NORTHERN_BARRIER_CONFIG.noiseFreqY) * NORTHERN_BARRIER_CONFIG.noiseAmp;

      if (dist + noise < NORTHERN_BARRIER_CONFIG.distCutoff) {
        candidateMt[gy]![gx] = 1;
        candidateElev[gy]![gx] = (dist + noise < NORTHERN_BARRIER_CONFIG.tier3Cutoff) ? 3 : 2;
      }
    }
  }

  // 2. North-West Victory Ridge (organic vertical ridge along western boundary, gx ~ 2..9, gy ~ 5..22)
  for (let gy = NORTH_WEST_RIDGE_CONFIG.minGy; gy <= NORTH_WEST_RIDGE_CONFIG.maxGy; gy++) {
    for (let gx = NORTH_WEST_RIDGE_CONFIG.minGx; gx <= NORTH_WEST_RIDGE_CONFIG.maxGx; gx++) {
      if (isBlocked(gx, gy)) continue;

      const spineX = NORTH_WEST_RIDGE_CONFIG.baseSpineX + Math.sin(gy * NORTH_WEST_RIDGE_CONFIG.sinFreq) * NORTH_WEST_RIDGE_CONFIG.sinAmp;
      const dist = Math.abs(gx - spineX);
      const noise = simplex.noise2D(gx * NORTH_WEST_RIDGE_CONFIG.noiseFreqX, gy * NORTH_WEST_RIDGE_CONFIG.noiseFreqY) * NORTH_WEST_RIDGE_CONFIG.noiseAmp;

      if (dist + noise < NORTH_WEST_RIDGE_CONFIG.distCutoff) {
        candidateMt[gy]![gx] = 1;
        candidateElev[gy]![gx] = (dist + noise < NORTH_WEST_RIDGE_CONFIG.tier3Cutoff) ? 3 : 2;
      }
    }
  }

  // 3. South-East Coastal Volcanic Peninsula (organic radial formation)
  const vcx = Math.floor(W * VOLCANIC_PENINSULA_CONFIG.centerFactorX);
  const vcy = Math.floor(H * VOLCANIC_PENINSULA_CONFIG.centerFactorY);
  for (let dy = -VOLCANIC_PENINSULA_CONFIG.radiusTiles; dy <= VOLCANIC_PENINSULA_CONFIG.radiusTiles; dy++) {
    for (let dx = -VOLCANIC_PENINSULA_CONFIG.radiusTiles; dx <= VOLCANIC_PENINSULA_CONFIG.radiusTiles; dx++) {
      const gx = vcx + dx;
      const gy = vcy + dy;
      if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
        if (isBlocked(gx, gy)) continue;

        const dist = Math.hypot(dx, dy);
        const noise = simplex.noise2D(gx * VOLCANIC_PENINSULA_CONFIG.noiseFreq, gy * VOLCANIC_PENINSULA_CONFIG.noiseFreq) * VOLCANIC_PENINSULA_CONFIG.noiseAmp;

        if (dist + noise <= VOLCANIC_PENINSULA_CONFIG.distCutoff) {
          candidateMt[gy]![gx] = 1;
          candidateElev[gy]![gx] = (dist + noise <= VOLCANIC_PENINSULA_CONFIG.tier3Cutoff) ? 3 : 2;
        }
      }
    }
  }

  // Cellular Automata smoothing pass to eliminate single-tile spurs and fill single-tile holes
  const countNeighbors = (grid: Uint8Array[], x: number, y: number): number => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          if (grid[ny]![nx] === 1) count++;
        }
      }
    }
    return count;
  };

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (isBlocked(x, y)) continue;
      const n = countNeighbors(candidateMt, x, y);
      if (candidateMt[y]![x] === 1 && n <= CA_SMOOTH_ISOLATED_LIMIT) {
        candidateMt[y]![x] = 0;
        candidateElev[y]![x] = 0;
      } else if (candidateMt[y]![x] === 0 && n >= CA_SMOOTH_FILL_LIMIT) {
        candidateMt[y]![x] = 1;
        candidateElev[y]![x] = 2;
      }
    }
  }

  // Write finalized organic mountain cells into generator grid & elevation
  for (let y = 0; y < H; y++) {
    const row = g[y];
    const eRow = elev[y];
    if (!row || !eRow) continue;
    for (let x = 0; x < W; x++) {
      if (candidateMt[y]![x] === 1 && row[x] !== CELL_BIOME.WATER && !isBlocked(x, y)) {
        row[x] = CELL_BIOME.MOUNTAIN_DIRT;
        eRow[x] = candidateElev[y]![x] || 2;
        gen.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
      }
    }
  }
}

/**
 * Places authentic Pokémon GBA buildings and town amenities for procedural nodes.
 * Features 4 distinct asymmetric urban archetypes: Metropolis, Gym Bastion, Port Town, Rural Village.
 * Uses 100% natural grass base with dirt paths for door access (Zero gray cement slabs).
 */
export function placeProceduralTownArchitectures(
  gen: IKantoCarverWorldContext,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const T = KANTO_TILE_SIZE;
  const allB = defaultPrefabsRegistry.getByCategory('buildings');
  const housePrefabs = allB.filter((b) => b.id.includes('house') || b.id.includes('cottage'));

  const snap = (v: number) => Math.round(v / T) * T;

  const addBuilding = (style: string, x: number, y: number, w: number, h: number) => {
    const sx = snap(x);
    const sy = snap(y);
    const placement = findValidBuildingPlacementSpot(gen, sx, sy, w, h);
    if (!placement.found) {
      // Never forcefully place if spot is invalid or encroaching on cliffs
      return;
    }

    const bx = placement.tx;
    const by = placement.ty;
    const bw = Math.ceil(w / T);
    const bh = Math.ceil(h / T);

    gen.buildings.push({ style, x: placement.x, y: placement.y, w, h });
    gen.occupancy.reserveRect(bx, by, bw, bh, OCCUPANCY_FLAGS.BUILDING);

    // Clear nature/trees under building footprint
    for (let ty = by; ty < by + bh; ty++) {
      for (let tx = bx; tx < bx + bw; tx++) {
        const row = gen.grid[ty];
        if (row && row[tx] === CELL_BIOME.FOREST_WALL) {
          row[tx] = CELL_BIOME.GRASS;
        }
      }
    }

    // Pave a clean 1-tile wide dirt path in front of the door connecting downward
    const doorX = bx + Math.floor(bw / 2);
    const doorY = by + bh;
    for (let step = 0; step <= DOOR_PATH_EXTENSION_STEPS; step++) {
      const cy = doorY + step;
      if (cy >= 0 && cy < KANTO_GRID_H && doorX >= 0 && doorX < KANTO_GRID_W) {
        const row = gen.grid[cy];
        if (row && row[doorX] !== CELL_BIOME.WATER && row[doorX] !== CELL_BIOME.MOUNTAIN_DIRT) {
          row[doorX] = CELL_BIOME.DIRT_PATH;
          gen.occupancy.set(doorX, cy, OCCUPANCY_FLAGS.SIDEWALK);
        }
      }
    }
  };

  const paveRoadLine = (x0: number, y0: number, x1: number, y1: number) => {
    const startX = Math.min(x0, x1);
    const endX = Math.max(x0, x1);
    const startY = Math.min(y0, y1);
    const endY = Math.max(y0, y1);
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
          const row = gen.grid[y];
          if (row && row[x] !== CELL_BIOME.WATER) {
            row[x] = CELL_BIOME.DIRT_PATH;
            gen.occupancy.set(x, y, OCCUPANCY_FLAGS.ROAD);
          }
        }
      }
    }
  };

  Object.values(nodes).forEach((n, idx) => {
    const { px, py } = gen.nodeToPx(n.x, n.y);
    const gx = Math.floor(px / T);
    const gy = Math.floor(py / T);
    const nodeSeed = ((Math.abs(gen.hash(gx, gy, idx)) ^ gen.seed) >>> 0);

    // Archetype: 0 = Metropolis, 1 = Gym Bastion, 2 = Port Town, 3 = Rural Village
    const archetype = idx === 0 ? 0 : (nodeSeed % ARCHETYPE_COUNT);

    if (archetype === 0) {
      // -------------------------------------------------------------
      // 1. METROPOLIS (Skyscraper, Center, Mart, 2 Houses, Dirt Avenues)
      // -------------------------------------------------------------
      const roads = URBAN_ROAD_LAYOUTS.metropolis;
      paveRoadLine(gx + roads.nsRoad.minDx, gy + roads.nsRoad.minDy, gx + roads.nsRoad.maxDx, gy + roads.nsRoad.maxDy);
      paveRoadLine(gx + roads.ewRoad.minDx, gy + roads.ewRoad.minDy, gx + roads.ewRoad.maxDx, gy + roads.ewRoad.maxDy);

      const b = BUILDING_LAYOUTS.metropolis;
      addBuilding(b.silphTower.style, px + b.silphTower.dx, py + b.silphTower.dy, b.silphTower.w, b.silphTower.h);
      addBuilding(b.pokecenter.style, px + b.pokecenter.dx, py + b.pokecenter.dy, b.pokecenter.w, b.pokecenter.h);
      addBuilding(b.pokemart.style, px + b.pokemart.dx, py + b.pokemart.dy, b.pokemart.w, b.pokemart.h);
      addBuilding(b.houseBlue.style, px + b.houseBlue.dx, py + b.houseBlue.dy, b.houseBlue.w, b.houseBlue.h);
      addBuilding(b.houseRed.style, px + b.houseRed.dx, py + b.houseRed.dy, b.houseRed.w, b.houseRed.h);

      const p = TOWN_PROPS_LAYOUTS.metropolis;
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + p.lampLeft.dx), y: snap(py + p.lampLeft.dy) });
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + p.lampRight.dx), y: snap(py + p.lampRight.dy) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + p.flowerLeft.dx), y: snap(py + p.flowerLeft.dy) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + p.flowerRight.dx), y: snap(py + p.flowerRight.dy) });

    } else if (archetype === 1) {
      // -------------------------------------------------------------
      // 2. GYM BASTION (Prominent Gym, Center, Mart, 2 Houses)
      // -------------------------------------------------------------
      const roads = URBAN_ROAD_LAYOUTS.bastion;
      paveRoadLine(gx + roads.nsRoad.minDx, gy + roads.nsRoad.minDy, gx + roads.nsRoad.maxDx, gy + roads.nsRoad.maxDy);
      paveRoadLine(gx + roads.ewRoad.minDx, gy + roads.ewRoad.minDy, gx + roads.ewRoad.maxDx, gy + roads.ewRoad.maxDy);

      const b = BUILDING_LAYOUTS.bastion;
      const gymStyle = (nodeSeed % 2 === 0) ? 'gym_gold' : 'gym';
      addBuilding(gymStyle, px + b.gym.dx, py + b.gym.dy, b.gym.w, b.gym.h);
      addBuilding(b.pokecenter.style, px + b.pokecenter.dx, py + b.pokecenter.dy, b.pokecenter.w, b.pokecenter.h);
      addBuilding(b.pokemart.style, px + b.pokemart.dx, py + b.pokemart.dy, b.pokemart.w, b.pokemart.h);

      const h1 = housePrefabs[(nodeSeed + 1) % housePrefabs.length]?.id ?? 'house_blue';
      const h2 = housePrefabs[(nodeSeed + 2) % housePrefabs.length]?.id ?? 'house_red';
      addBuilding(h1, px + b.house1.dx, py + b.house1.dy, b.house1.w, b.house1.h);
      addBuilding(h2, px + b.house2.dx, py + b.house2.dy, b.house2.w, b.house2.h);

      const p = TOWN_PROPS_LAYOUTS.bastion;
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + p.lampLeft.dx), y: snap(py + p.lampLeft.dy) });
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + p.lampRight.dx), y: snap(py + p.lampRight.dy) });
      gen.props.push({ style: 'poke_fence_picket', x: snap(px + p.fence.dx), y: snap(py + p.fence.dy) });
      gen.props.push({ style: 'poke_mailbox', x: snap(px + p.mailbox.dx), y: snap(py + p.mailbox.dy) });

    } else if (archetype === 2) {
      // -------------------------------------------------------------
      // 3. PORT TOWN (Boardwalk Planks, Seaside Cottages, Mart, Center)
      // -------------------------------------------------------------
      const roads = URBAN_ROAD_LAYOUTS.port;
      paveRoadLine(gx + roads.nsRoad.minDx, gy + roads.nsRoad.minDy, gx + roads.nsRoad.maxDx, gy + roads.nsRoad.maxDy);
      paveRoadLine(gx + roads.ewRoad.minDx, gy + roads.ewRoad.minDy, gx + roads.ewRoad.maxDx, gy + roads.ewRoad.maxDy);

      const b = BUILDING_LAYOUTS.port;
      addBuilding(b.pokecenter.style, px + b.pokecenter.dx, py + b.pokecenter.dy, b.pokecenter.w, b.pokecenter.h);
      addBuilding(b.pokemart.style, px + b.pokemart.dx, py + b.pokemart.dy, b.pokemart.w, b.pokemart.h);
      addBuilding(b.houseTeal.style, px + b.houseTeal.dx, py + b.houseTeal.dy, b.houseTeal.w, b.houseTeal.h);
      addBuilding(b.houseOrange.style, px + b.houseOrange.dx, py + b.houseOrange.dy, b.houseOrange.w, b.houseOrange.h);

      for (let step = 0; step < b.boardwalk.steps; step++) {
        gen.bridges.push({
          style: 'poke_boardwalk_planks',
          x: snap(px + b.boardwalk.dx),
          y: snap(py + b.boardwalk.dy + step * b.boardwalk.stepY),
          w: b.boardwalk.w,
          h: b.boardwalk.h
        });
      }
      const p = TOWN_PROPS_LAYOUTS.port;
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + p.lamp.dx), y: snap(py + p.lamp.dy) });

    } else {
      // -------------------------------------------------------------
      // 4. RURAL VILLAGE (Organic Grass, Rustic Houses, Lab, Fences)
      // -------------------------------------------------------------
      const roads = URBAN_ROAD_LAYOUTS.village;
      paveRoadLine(gx + roads.nsRoad.minDx, gy + roads.nsRoad.minDy, gx + roads.nsRoad.maxDx, gy + roads.nsRoad.maxDy);
      paveRoadLine(gx + roads.ewRoad.minDx, gy + roads.ewRoad.minDy, gx + roads.ewRoad.maxDx, gy + roads.ewRoad.maxDy);

      const b = BUILDING_LAYOUTS.village;
      const labStyle = (nodeSeed % 2 === 0) ? 'lab_oak' : 'mansion_school';
      addBuilding(labStyle, px + b.lab.dx, py + b.lab.dy, b.lab.w, b.lab.h);
      addBuilding(b.pokecenter.style, px + b.pokecenter.dx, py + b.pokecenter.dy, b.pokecenter.w, b.pokecenter.h);
      addBuilding(b.houseRed.style, px + b.houseRed.dx, py + b.houseRed.dy, b.houseRed.w, b.houseRed.h);

      const p = TOWN_PROPS_LAYOUTS.village;
      gen.props.push({ style: 'poke_fence_picket', x: snap(px + p.fence.dx), y: snap(py + p.fence.dy) });
      gen.props.push({ style: 'poke_mailbox', x: snap(px + p.mailbox.dx), y: snap(py + p.mailbox.dy) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + p.flowerLeft.dx), y: snap(py + p.flowerLeft.dy) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + p.flowerRight.dx), y: snap(py + p.flowerRight.dy) });
    }
  });
}

/**
 * Places authentic GBA macro-cliffs, canyon walls, mountain stairs, and cave entrances.
 */
export function placeProceduralReliefAndProps(
  gen: IKantoCarverWorldContext,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const T = KANTO_TILE_SIZE;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;

  // 1. Northern Mountain Barrier: arched Icefall cave mouth at the mountain pass
  const icefall = RELIEF_PROPS_CONFIG.icefallCave;
  const passGx = Math.floor(W * icefall.passFactorX);
  const passGy = icefall.passGy;
  gen.props.push({
    style: 'poke_cave_icefall_mouth',
    x: passGx * T + icefall.dx,
    y: passGy * T + icefall.dy,
    w: icefall.size,
    h: icefall.size
  });

  // 2. North-West Victory Ridge: carved rock stairs aligned to grid
  const victoryStairs = RELIEF_PROPS_CONFIG.victoryStairs;
  gen.props.push({
    style: 'poke_cliff_canyon_stairs',
    x: victoryStairs.gx * T,
    y: victoryStairs.gy * T,
    w: victoryStairs.size,
    h: victoryStairs.size
  });

  // 3. South-East Volcanic Peninsula: Ancient Shrine pyramid and mountain cone
  const vp = RELIEF_PROPS_CONFIG.volcanicPeninsula;
  const vcx = Math.floor(W * vp.centerFactorX);
  const vcy = Math.floor(H * vp.centerFactorY);
  gen.props.push({
    style: 'poke_mountain_ancient_shrine',
    x: vcx * T + vp.shrineDx,
    y: vcy * T + vp.shrineDy,
    w: vp.shrineSize,
    h: vp.shrineSize
  });
  gen.props.push({
    style: 'poke_cliff_cone_gray',
    x: vcx * T + vp.coneDx,
    y: vcy * T + vp.coneDy,
    w: vp.coneW,
    h: vp.coneH
  });

  // 4. Street lamps for each node
  const lamps = RELIEF_PROPS_CONFIG.nodeLamps;
  Object.values(nodes).forEach((n) => {
    const { px, py } = gen.nodeToPx(n.x, n.y);
    gen.props.push({ style: 'poke_street_lamp', x: Math.round((px - lamps.offsetDx) / T) * T, y: Math.round((py + lamps.offsetDy) / T) * T });
    gen.props.push({ style: 'poke_street_lamp', x: Math.round((px + lamps.offsetDx) / T) * T, y: Math.round((py + lamps.offsetDy) / T) * T });
  });
}

/**
 * Universal bridge placement: ensures every bridge cell or road-water intersection
 * receives an authentic wooden bridge prefab.
 */
export function placeAllBridges(gen: IKantoCarverWorldContext): void {
  const g = gen.grid;
  const T = KANTO_TILE_SIZE;

  const existingCoords = new Set<string>();
  for (const b of gen.bridges) {
    const bx = Math.floor(b.x / T);
    const by = Math.floor(b.y / T);
    existingCoords.add(`${bx},${by}`);
  }

  for (let gy = 0; gy < KANTO_GRID_H; gy++) {
    const row = g[gy];
    if (!row) continue;
    for (let gx = 0; gx < KANTO_GRID_W; gx++) {
      if (row[gx] === CELL_BIOME.BRIDGE) {
        const key = `${gx},${gy}`;
        if (!existingCoords.has(key)) {
          gen.bridges.push({
            style: 'poke_boardwalk_planks',
            x: gx * T,
            y: gy * T,
            w: DEFAULT_BRIDGE_TILE_SPAN,
            h: DEFAULT_BRIDGE_TILE_SPAN
          });
          existingCoords.add(key);
        }
      }
    }
  }
}
