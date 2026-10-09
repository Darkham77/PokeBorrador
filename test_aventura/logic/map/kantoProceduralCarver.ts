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
  type KantoRegionalWorldGenerator
} from './kantoRegionalGenerator.ts';
import { defaultPrefabsRegistry } from './prefabsRegistry.ts';
import { SimplexNoise } from './noise/simplexNoise.ts';

/**
 * Fills the regional map matrix with 100% impenetrable nature (FOREST_WALL, elevation 1) by default.
 */
export function fillImpenetrableWorld(gen: KantoRegionalWorldGenerator): void {
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
  gen: KantoRegionalWorldGenerator,
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
      for (let dy = -3; dy <= 6; dy++) {
        for (let dx = -10; dx <= 8; dx++) {
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
    const halfW = isMetropolis ? 18 : isBastion ? 15 : isPort ? 13 : 12;
    const halfH = isMetropolis ? 15 : isBastion ? 13 : isPort ? 11 : 10;

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
export function carveProceduralCoastlines(gen: KantoRegionalWorldGenerator): void {
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
    const leftMargin = Math.max(1, Math.round(4 + Math.sin(y * 0.18 + gen.seed) * 2));
    for (let x = 0; x < leftMargin; x++) {
      setWater(x, y);
    }
    const rightMargin = Math.min(W - 1, Math.round(W - 5 + Math.cos(y * 0.22 + gen.seed * 2) * 2));
    for (let x = rightMargin; x < W; x++) {
      setWater(x, y);
    }
  }

  for (let x = 0; x < W; x++) {
    const topMargin = Math.max(1, Math.round(4 + Math.cos(x * 0.2 + gen.seed * 3) * 2));
    for (let y = 0; y < topMargin; y++) {
      setWater(x, y);
    }
    const bottomMargin = Math.min(H - 1, Math.round(H - 6 + Math.sin(x * 0.25 + gen.seed) * 2.5));
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
  gen: KantoRegionalWorldGenerator,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const g = gen.grid;
  const elev = gen.elevation;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;
  const simplex = new SimplexNoise(gen.seed ?? 42);

  const nodeTiles = Object.values(nodes).map((n) => gen.nodeToTile(n.x, n.y));

  const isBlocked = (gx: number, gy: number): boolean => {
    if (gen.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.ROAD_BUFFER | OCCUPANCY_FLAGS.BUILDING)) {
      return true;
    }
    return nodeTiles.some((nt) => Math.hypot(nt.tx - gx, nt.ty - gy) < 11);
  };

  const candidateMt = Array.from({ length: H }, () => new Uint8Array(W));
  const candidateElev = Array.from({ length: H }, () => new Uint8Array(W));

  // 1. Northern Barrier Range (organic undulating spine along top border, gy ~ 2..10)
  for (let gy = 1; gy <= 10; gy++) {
    for (let gx = 3; gx < W - 3; gx++) {
      const isPass = gx >= Math.floor(W * 0.44) && gx <= Math.floor(W * 0.52);
      if (isPass) continue;
      if (isBlocked(gx, gy)) continue;

      const spineY = 4.5 + Math.sin(gx * 0.18) * 1.5;
      const dist = Math.abs(gy - spineY);
      const noise = simplex.noise2D(gx * 0.12, gy * 0.15) * 1.6;

      if (dist + noise < 3.2) {
        candidateMt[gy]![gx] = 1;
        candidateElev[gy]![gx] = (dist + noise < 1.7) ? 3 : 2;
      }
    }
  }

  // 2. North-West Victory Ridge (organic vertical ridge along western boundary, gx ~ 2..9, gy ~ 5..22)
  for (let gy = 5; gy <= 22; gy++) {
    for (let gx = 1; gx <= 9; gx++) {
      if (isBlocked(gx, gy)) continue;

      const spineX = 4.5 + Math.sin(gy * 0.22) * 1.6;
      const dist = Math.abs(gx - spineX);
      const noise = simplex.noise2D(gx * 0.15, gy * 0.12) * 1.5;

      if (dist + noise < 3.0) {
        candidateMt[gy]![gx] = 1;
        candidateElev[gy]![gx] = (dist + noise < 1.6) ? 3 : 2;
      }
    }
  }

  // 3. South-East Coastal Volcanic Peninsula (organic radial formation)
  const vcx = Math.floor(W * 0.82);
  const vcy = Math.floor(H * 0.78);
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      const gx = vcx + dx;
      const gy = vcy + dy;
      if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
        if (isBlocked(gx, gy)) continue;

        const dist = Math.hypot(dx, dy);
        const noise = simplex.noise2D(gx * 0.18, gy * 0.18) * 1.8;

        if (dist + noise <= 5.8) {
          candidateMt[gy]![gx] = 1;
          candidateElev[gy]![gx] = (dist + noise <= 3.2) ? 3 : 2;
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
      if (candidateMt[y]![x] === 1 && n <= 2) {
        candidateMt[y]![x] = 0;
        candidateElev[y]![x] = 0;
      } else if (candidateMt[y]![x] === 0 && n >= 6) {
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
  gen: KantoRegionalWorldGenerator,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const T = KANTO_TILE_SIZE;
  const allB = defaultPrefabsRegistry.getByCategory('buildings');
  const housePrefabs = allB.filter((b) => b.id.includes('house') || b.id.includes('cottage'));

  const snap = (v: number) => Math.round(v / T) * T;

  const addBuilding = (style: string, x: number, y: number, w: number, h: number) => {
    let sx = snap(x);
    let sy = snap(y);
    let bx = Math.floor(sx / T);
    let by = Math.floor(sy / T);
    const bw = Math.ceil(w / T);
    const bh = Math.ceil(h / T);

    const isSpotValid = (tx: number, ty: number) => {
      // Must stay within grid bounds with 1-tile margin
      if (tx < 1 || tx + bw >= KANTO_GRID_W - 1 || ty < 1 || ty + bh >= KANTO_GRID_H - 1) return false;

      // 1-tile margin check against water, mountain elevation, cliffs, and reserved spaces
      for (let cy = ty - 1; cy <= ty + bh; cy++) {
        for (let cx = tx - 1; cx <= tx + bw; cx++) {
          const row = gen.grid[cy];
          const eRow = gen.elevation[cy];
          if (!row || !eRow) return false;
          const cell = row[cx];
          const elev = eRow[cx];
          if (cell === undefined || cell === CELL_BIOME.WATER || cell === CELL_BIOME.MOUNTAIN_DIRT) return false;
          if (elev === undefined || elev >= 2) return false;
          if (gen.occupancy.has(cx, cy, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.DOOR_ACCESS)) {
            return false;
          }
        }
      }

      // Strict bounding-box overlap check with existing buildings (1-tile separation buffer)
      for (const eb of gen.buildings) {
        const ebx = Math.floor(eb.x / T);
        const eby = Math.floor(eb.y / T);
        const ebw = Math.ceil((eb.w ?? 128) / T);
        const ebh = Math.ceil((eb.h ?? 128) / T);
        if (tx < ebx + ebw + 1 && tx + bw + 1 > ebx && ty < eby + ebh + 1 && ty + bh + 1 > eby) {
          return false;
        }
      }
      return true;
    };

    let found = false;
    if (isSpotValid(bx, by)) {
      found = true;
    } else {
      // Spiral search up to radius 12
      for (let r = 1; r <= 12 && !found; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            if (isSpotValid(bx + dx, by + dy)) {
              bx += dx;
              by += dy;
              sx = bx * T;
              sy = by * T;
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }

    if (!found) {
      // Never forcefully place if spot is invalid or encroaching on cliffs
      return;
    }

    gen.buildings.push({ style, x: sx, y: sy, w, h });
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
    for (let step = 0; step <= 2; step++) {
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
    const archetype = idx === 0 ? 0 : (nodeSeed % 4);

    if (archetype === 0) {
      // -------------------------------------------------------------
      // 1. METROPOLIS (Skyscraper, Center, Mart, 2 Houses, Dirt Avenues)
      // -------------------------------------------------------------
      // Central North-South boulevard and East-West connecting avenue
      paveRoadLine(gx - 1, gy - 7, gx, gy + 12);
      paveRoadLine(gx - 9, gy + 3, gx + 8, gy + 4);

      // Central Skyscraper / Silph Tower (288x320)
      addBuilding('silph_tower', px - 144, py - 200, 288, 320);

      // Pokecenter on West Avenue (160x160)
      addBuilding('pokecenter', px - 280, py + 140, 160, 160);

      // Pokemart on East Avenue (128x128)
      addBuilding('pokemart', px + 120, py + 140, 128, 128);

      // 2 Residential Houses (160x160)
      addBuilding('house_blue', px - 280, py + 340, 160, 160);
      addBuilding('house_red', px + 120, py + 340, 160, 160);

      // Streetlamps and flowerbeds along avenues
      gen.props.push({ style: 'poke_street_lamp', x: snap(px - 48), y: snap(py + 110) });
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + 48), y: snap(py + 110) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px - 16), y: snap(py + 110) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + 16), y: snap(py + 110) });

    } else if (archetype === 1) {
      // -------------------------------------------------------------
      // 2. GYM BASTION (Prominent Gym, Center, Mart, 2 Houses)
      // -------------------------------------------------------------
      // Central connecting dirt avenue
      paveRoadLine(gx - 1, gy - 6, gx, gy + 8);
      paveRoadLine(gx - 7, gy, gx + 6, gy + 1);

      // Grand Gym at North (192x160)
      const gymStyle = (nodeSeed % 2 === 0) ? 'gym_gold' : 'gym';
      addBuilding(gymStyle, px - 96, py - 180, 192, 160);

      // Pokecenter on Southwest (160x160)
      addBuilding('pokecenter', px - 260, py + 20, 160, 160);

      // Pokemart on Southeast (128x128)
      addBuilding('pokemart', px + 100, py + 20, 128, 128);

      // 2 Houses (160x160)
      const h1 = housePrefabs[(nodeSeed + 1) % housePrefabs.length]?.id ?? 'house_blue';
      const h2 = housePrefabs[(nodeSeed + 2) % housePrefabs.length]?.id ?? 'house_red';
      addBuilding(h1, px - 260, py + 210, 160, 160);
      addBuilding(h2, px + 100, py + 210, 160, 160);

      gen.props.push({ style: 'poke_street_lamp', x: snap(px - 16), y: snap(py - 16) });
      gen.props.push({ style: 'poke_street_lamp', x: snap(px + 16), y: snap(py + 32) });
      gen.props.push({ style: 'poke_fence_picket', x: snap(px - 110), y: snap(py + 64) });
      gen.props.push({ style: 'poke_mailbox', x: snap(px - 96), y: snap(py + 64) });

    } else if (archetype === 2) {
      // -------------------------------------------------------------
      // 3. PORT TOWN (Boardwalk Planks, Seaside Cottages, Mart, Center)
      // -------------------------------------------------------------
      paveRoadLine(gx - 1, gy - 3, gx, gy + 5);
      paveRoadLine(gx - 7, gy - 1, gx + 5, gy);

      // Pokecenter (160x160)
      addBuilding('pokecenter', px - 240, py - 60, 160, 160);

      // Pokemart (128x128)
      addBuilding('pokemart', px + 90, py - 60, 128, 128);

      // Seaside Cottages (160x160)
      addBuilding('house_teal_bungalow', px - 240, py + 130, 160, 160);
      addBuilding('house_orange', px + 90, py + 130, 160, 160);

      // Pier Boardwalks toward south/water
      for (let step = 0; step < 3; step++) {
        gen.bridges.push({
          style: 'poke_boardwalk_planks',
          x: snap(px - 16),
          y: snap(py + 140 + step * 32),
          w: 32,
          h: 32
        });
      }
      gen.props.push({ style: 'poke_street_lamp', x: snap(px - 32), y: snap(py + 140) });

    } else {
      // -------------------------------------------------------------
      // 4. RURAL VILLAGE (Organic Grass, Rustic Houses, Lab, Fences)
      // -------------------------------------------------------------
      paveRoadLine(gx - 1, gy - 5, gx, gy + 4);
      paveRoadLine(gx - 7, gy + 1, gx + 5, gy + 2);

      // Oak's Lab or Village Academy (224x192)
      const labStyle = (nodeSeed % 2 === 0) ? 'lab_oak' : 'mansion_school';
      addBuilding(labStyle, px - 112, py - 180, 224, 192);

      // Pokecenter or Village Clinic (160x160)
      addBuilding('pokecenter', px - 240, py + 40, 160, 160);

      // Rustic house with garden (160x160)
      addBuilding('house_red', px + 80, py + 40, 160, 160);

      // Rustic picket fences, mailboxes, and flowerbeds
      gen.props.push({ style: 'poke_fence_picket', x: snap(px + 40), y: snap(py + 210) });
      gen.props.push({ style: 'poke_mailbox', x: snap(px + 70), y: snap(py + 210) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px - 60), y: snap(py + 210) });
      gen.props.push({ style: 'poke_flowers_red', x: snap(px + 120), y: snap(py + 210) });
    }
  });
}

/**
 * Places authentic GBA macro-cliffs, canyon walls, mountain stairs, and cave entrances.
 */
export function placeProceduralReliefAndProps(
  gen: KantoRegionalWorldGenerator,
  nodes: Record<string, KantoNodeCoordinate>
): void {
  const T = KANTO_TILE_SIZE;
  const W = KANTO_GRID_W;
  const H = KANTO_GRID_H;

  // 1. Northern Mountain Barrier: arched Icefall cave mouth at the mountain pass
  const passGx = Math.floor(W * 0.48);
  const passGy = 7;
  gen.props.push({
    style: 'poke_cave_icefall_mouth',
    x: passGx * T - 16,
    y: passGy * T - 20,
    w: 96,
    h: 96
  });

  // 2. North-West Victory Ridge: carved rock stairs aligned to grid
  gen.props.push({
    style: 'poke_cliff_canyon_stairs',
    x: 7 * T,
    y: 11 * T,
    w: 64,
    h: 64
  });

  // 3. South-East Volcanic Peninsula: Ancient Shrine pyramid and mountain cone
  const vcx = Math.floor(W * 0.82);
  const vcy = Math.floor(H * 0.78);
  gen.props.push({
    style: 'poke_mountain_ancient_shrine',
    x: vcx * T - 80,
    y: vcy * T - 80,
    w: 192,
    h: 192
  });
  gen.props.push({
    style: 'poke_cliff_cone_gray',
    x: vcx * T + 48,
    y: vcy * T - 90,
    w: 32,
    h: 48
  });

  // 4. Street lamps for each node
  Object.values(nodes).forEach((n) => {
    const { px, py } = gen.nodeToPx(n.x, n.y);
    gen.props.push({ style: 'poke_street_lamp', x: Math.round((px - 45) / T) * T, y: Math.round((py + 35) / T) * T });
    gen.props.push({ style: 'poke_street_lamp', x: Math.round((px + 45) / T) * T, y: Math.round((py + 35) / T) * T });
  });
}

/**
 * Universal bridge placement: ensures every bridge cell or road-water intersection
 * receives an authentic wooden bridge prefab.
 */
export function placeAllBridges(gen: KantoRegionalWorldGenerator): void {
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
            w: 32,
            h: 32
          });
          existingCoords.add(key);
        }
      }
    }
  }
}
