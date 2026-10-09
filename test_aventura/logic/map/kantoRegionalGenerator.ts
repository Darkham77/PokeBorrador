// Kanto Regional World Generator - Procedural Canvas Tile/Sprite Engine (3600 x 4600 px)

import type { ProceduralGenerationConfig } from '../../types/map/adventureWorldTypes';
import {
  fillImpenetrableWorld,
  carveSettlementClearings,
  carveProceduralCoastlines,
  carveProceduralMountainChains,
  placeProceduralTownArchitectures,
  placeProceduralReliefAndProps,
  placeAllBridges
} from './kantoProceduralCarver.ts';
import { SimplexNoise } from './noise/simplexNoise.ts';
import {
  DynamicCatalogLoader,
  UniversalAutotiler,
  SemanticPrefabRenderer,
  PlacedStructure,
  Chunk,
  ChunkManager,
  type CatalogPart,
  type CatalogPrefab,
  type CatalogAutotileLayout,
  type SemanticTileCatalog,
  type IRegionalWorldRendererSource
} from './kantoTileEngine.ts';

export {
  DynamicCatalogLoader,
  UniversalAutotiler,
  SemanticPrefabRenderer,
  Chunk,
  ChunkManager
};

export type {
  PlacedStructure,
  CatalogPart,
  CatalogPrefab,
  CatalogAutotileLayout,
  SemanticTileCatalog,
  IRegionalWorldRendererSource
};

export const KANTO_WORLD_WIDTH = 3600;
export const KANTO_WORLD_HEIGHT = 4600;
export const KANTO_TILE_SIZE = 32;
export const KANTO_CHUNK_PX = 512;
export const KANTO_SPACING_MULTIPLIER = 2.5;

export const KANTO_GRID_W = Math.ceil(KANTO_WORLD_WIDTH / KANTO_TILE_SIZE); // 113
export const KANTO_GRID_H = Math.ceil(KANTO_WORLD_HEIGHT / KANTO_TILE_SIZE); // 144
export const KANTO_CHUNKS_X = Math.ceil(KANTO_WORLD_WIDTH / KANTO_CHUNK_PX); // 8
export const KANTO_CHUNKS_Y = Math.ceil(KANTO_WORLD_HEIGHT / KANTO_CHUNK_PX); // 9

// Biome cell types
export const CELL_BIOME = {
  GRASS: 0,
  DIRT_PATH: 1,
  WATER: 2,
  TALL_GRASS: 3,
  MOUNTAIN_DIRT: 4,
  LAVA: 5,
  PLAZA_STONE: 6,
  BRIDGE: 7,
  FOREST_WALL: 8
} as const;

export type CellBiomeType = typeof CELL_BIOME[keyof typeof CELL_BIOME];

// Occupancy Grid Bitmasks
export const OCCUPANCY_FLAGS = {
  WATER: 0x01,
  CLIFF: 0x02,
  ROAD: 0x04,
  ROAD_BUFFER: 0x08,
  BUILDING: 0x10,
  DOOR_ACCESS: 0x20,
  SIDEWALK: 0x40
} as const;

export class OccupancyGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = Array.from({ length: height }, () => new Uint8Array(width));
  }

  set(x: number, y: number, flag: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const row = this.cells[y];
      if (row) row[x] = (row[x] ?? 0) | flag;
    }
  }

  clear(x: number, y: number, flag: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const row = this.cells[y];
      if (row) row[x] = (row[x] ?? 0) & ~flag;
    }
  }

  has(x: number, y: number, flag: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const row = this.cells[y];
    if (!row) return false;
    return ((row[x] ?? 0) & flag) !== 0;
  }

  reserveRect(x0: number, y0: number, w: number, h: number, flag: number): void {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        this.set(x, y, flag);
      }
    }
  }

  reserveBuffer(x0: number, y0: number, w: number, h: number, buf: number, flag: number): void {
    for (let y = y0 - buf; y < y0 + h + buf; y++) {
      for (let x = x0 - buf; x < x0 + w + buf; x++) {
        this.set(x, y, flag);
      }
    }
  }

  clearAll(): void {
    for (const r of this.cells) {
      r.fill(0);
    }
  }
}

export interface KantoNodeCoordinate {
  readonly id?: string;
  readonly name: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
}

export class KantoRegionalWorldGenerator implements IRegionalWorldRendererSource {
  readonly loader: DynamicCatalogLoader;
  grid: Uint8Array[] = [];
  elevation: Uint8Array[] = [];
  occupancy: OccupancyGrid;
  trees: PlacedStructure[] = [];
  buildings: PlacedStructure[] = [];
  bridges: PlacedStructure[] = [];
  props: PlacedStructure[] = [];
  nature: PlacedStructure[] = [];
  seed = 42;

  constructor(loader: DynamicCatalogLoader) {
    this.loader = loader;
    this.occupancy = new OccupancyGrid(KANTO_GRID_W, KANTO_GRID_H);
  }

  private spacingMultiplier = KANTO_SPACING_MULTIPLIER;

  nodeToTile(x: number, y: number): { tx: number; ty: number } {
    return {
      tx: Math.floor((x * this.spacingMultiplier) / KANTO_TILE_SIZE),
      ty: Math.floor((y * this.spacingMultiplier) / KANTO_TILE_SIZE)
    };
  }

  nodeToPx(x: number, y: number): { px: number; py: number } {
    return {
      px: Math.round(x * this.spacingMultiplier),
      py: Math.round(y * this.spacingMultiplier)
    };
  }

  hash(x: number, y: number, seed = 0): number {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) | 0;
  }

  hashF(x: number, y: number, seed = 0): number {
    return ((this.hash(x, y, seed) & 0x7fffffff) / 0x7fffffff);
  }

  generate(
    nodes: Record<string, KantoNodeCoordinate>,
    connections: readonly (readonly [string, string])[],
    seed = 42,
    config?: ProceduralGenerationConfig
  ): void {
    this.seed = seed;
    const maxCoord = Math.max(
      0,
      ...Object.values(nodes).flatMap((n) => [n.x, n.y])
    );
    this.spacingMultiplier = maxCoord > 2500 ? 1.0 : KANTO_SPACING_MULTIPLIER;
    fillImpenetrableWorld(this);
    this.trees = [];
    this.buildings = [];
    this.bridges = [];
    this.props = [];
    this.nature = [];

    const autoOcean = config?.autoOcean ?? true;
    const autoBuildings = config?.autoBuildings ?? true;
    const roadWidth = config?.roadWidth ?? 2;
    const treeDensity = config?.treeDensity ?? 0.7;

    const isCanonicalKanto = Boolean(nodes.pallet || nodes.viridian || nodes.pewter);

    if (isCanonicalKanto) {
      this.carveMountainChains(nodes);
      if (autoOcean) {
        this.carveOrganicHydrography(nodes);
      }
      carveSettlementClearings(this, nodes);
      this.carveRoadNetwork(nodes, connections, roadWidth);
      this.carveTallGrassPatches(nodes);
      if (autoOcean) {
        this.placeBridgesWithGuarantees(nodes);
      }
      if (autoBuildings) {
        this.placeTownArchitectures(nodes);
        this.placeRouteInfrastructure(nodes);
      }
      this.placeLedges(nodes);
      this.placeNatureAndForests(nodes, connections, treeDensity);
      this.placePropsAndDetails(nodes);
    } else {
      if (autoOcean) {
        carveProceduralCoastlines(this);
      }
      carveProceduralMountainChains(this, nodes);
      carveSettlementClearings(this, nodes);
      this.carveRoadNetwork(nodes, connections, roadWidth);
      this.carveTallGrassPatches(nodes);
      if (autoBuildings) {
        placeProceduralTownArchitectures(this, nodes);
      }
      this.placeNatureAndForests(nodes, connections, treeDensity);
      placeProceduralReliefAndProps(this, nodes);
    }

    // Universal guarantee: ensure all road-water intersections have authentic bridge prefabs
    placeAllBridges(this);
  }

  private carveMountainChains(nodes: Record<string, KantoNodeCoordinate>): void {
    const elev = this.elevation;
    const g = this.grid;

    const settlementTiles = Object.values(nodes)
      .filter((n) => n.type === 'city' && n.id !== 'indigo')
      .map((n) => this.nodeToTile(n.x, n.y));

    const isNearSettlement = (tx: number, ty: number) =>
      settlementTiles.some((st) => Math.hypot(st.tx - tx, st.ty - ty) < 8);

    const simplex = new SimplexNoise(this.seed);

    const raiseRectPlateau = (x0: number, x1: number, y0: number, y1: number, level = 2) => {
      const minX = Math.max(0, Math.min(x0, x1));
      const maxX = Math.min(KANTO_GRID_W - 1, Math.max(x0, x1));
      const minY = Math.max(0, Math.min(y0, y1));
      const maxY = Math.min(KANTO_GRID_H - 1, Math.max(y0, y1));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (isNearSettlement(x, y)) continue;
          if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.ROAD_BUFFER | OCCUPANCY_FLAGS.DOOR_ACCESS)) continue;

          const row = g[y];
          const eRow = elev[y];
          if (row && eRow && row[x] !== CELL_BIOME.WATER) {
            eRow[x] = Math.max(eRow[x] ?? 1, level);
            row[x] = CELL_BIOME.MOUNTAIN_DIRT;
            this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
          }
        }
      }
    };

    const raisePlateau = (x0: number, x1: number, y0: number, y1: number, level = 3) => {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.max(1.5, (x1 - x0) / 2);
      const ry = Math.max(1.5, (y1 - y0) / 2);

      const padX = Math.ceil(rx + 2);
      const padY = Math.ceil(ry + 2);
      const startX = Math.max(0, Math.floor(cx - padX));
      const endX = Math.min(KANTO_GRID_W - 1, Math.ceil(cx + padX));
      const startY = Math.max(0, Math.floor(cy - padY));
      const endY = Math.min(KANTO_GRID_H - 1, Math.ceil(cy + padY));

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          if (isNearSettlement(x, y)) continue;
          if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.ROAD_BUFFER | OCCUPANCY_FLAGS.DOOR_ACCESS)) continue;

          // Normalized elliptic distance with Simplex noise perturbation
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const dist = Math.hypot(dx, dy);
          const noise = simplex.noise2D(x * 0.22, y * 0.22) * 0.28;

          if (dist + noise <= 1.05) {
            const row = g[y];
            const eRow = elev[y];
            if (row && eRow && row[x] !== CELL_BIOME.WATER) {
              eRow[x] = Math.max(eRow[x] ?? 1, level);
              row[x] = CELL_BIOME.MOUNTAIN_DIRT;
              this.occupancy.set(x, y, OCCUPANCY_FLAGS.CLIFF);
            }
          }
        }
      }
    };

    const pw = nodes.pewter ? this.nodeToTile(nodes.pewter.x, nodes.pewter.y) : { tx: 39, ty: 31 };
    const cr = nodes.cerulean ? this.nodeToTile(nodes.cerulean.x, nodes.cerulean.y) : { tx: 62, ty: 50 };
    const bh = nodes.billshouse ? this.nodeToTile(nodes.billshouse.x, nodes.billshouse.y) : { tx: 82, ty: 23 };
    const rt = nodes.rocktunnel ? this.nodeToTile(nodes.rocktunnel.x, nodes.rocktunnel.y) : { tx: 85, ty: 62 };
    const ip = nodes.indigo ? this.nodeToTile(nodes.indigo.x, nodes.indigo.y) : { tx: 23, ty: 27 };
    const vn = nodes.viridian ? this.nodeToTile(nodes.viridian.x, nodes.viridian.y) : { tx: 39, ty: 85 };
    const sf = nodes.seafoam ? this.nodeToTile(nodes.seafoam.x, nodes.seafoam.y) : { tx: 50, ty: 125 };

    // 1. Indigo Plateau & Northern Mountain Range
    raisePlateau(2, ip.tx + 5, 8, 26, 2);
    raisePlateau(ip.tx - 4, ip.tx + 4, 10, 24, 3);

    // 2. Mt. Moon Northern Mountain Range & Stepped Plateau
    const mm = nodes.mtmoon ? this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y) : { tx: 62, ty: 31 };
    // Main northern mountain massif (Tier 2 base, Tier 3 peak)
    raiseRectPlateau(pw.tx + 9, cr.tx + 8, 8, mm.ty - 4, 2);
    raiseRectPlateau(pw.tx + 12, cr.tx + 5, 8, mm.ty - 9, 3);
    raiseRectPlateau(pw.tx + 16, cr.tx + 2, 9, mm.ty - 14, 4);
    // Western mountain bay arm framing Pokemon Center (gx: 49..52, gy: mm.ty - 4 .. mm.ty + 6)
    raiseRectPlateau(mm.tx - 13, mm.tx - 10, mm.ty - 4, mm.ty + 6, 2);
    // Southern ridge of Route 4 (gx: 60..70, gy: mm.ty + 10 .. mm.ty + 13)
    raiseRectPlateau(mm.tx - 2, cr.tx + 8, mm.ty + 10, mm.ty + 13, 2);

    // 3. Cape Cerulean & Route 25 High Ridge (well north-east of Cerulean City)
    raisePlateau(cr.tx + 6, bh.tx + 4, 8, 18, 2);
    raisePlateau(cr.tx + 8, bh.tx + 2, 10, 16, 3);

    // 4. Rock Tunnel & Route 9 Canyon Walls (well clear of Cerulean City perimeter)
    raisePlateau(cr.tx + 9, rt.tx - 2, cr.ty - 6, cr.ty - 4, 2);
    raisePlateau(cr.tx + 9, rt.tx - 3, cr.ty + 2, cr.ty + 5, 2);
    raisePlateau(rt.tx - 4, rt.tx + 3, rt.ty - 12, rt.ty + 6, 2);
    raisePlateau(rt.tx - 2, rt.tx + 2, rt.ty - 8, rt.ty + 4, 3);

    // 5. Route 22 Mountain Ridge (Far western boundary - completely clear of Viridian & Route 1)
    raisePlateau(2, Math.max(2, vn.tx - 18), vn.ty - 10, vn.ty + 6, 2);
    raisePlateau(2, Math.max(2, vn.tx - 21), vn.ty - 8, vn.ty + 4, 3);

    // 6. Seafoam Islands Twin Rock Formations
    [-4, 4].forEach((ox) => {
      raisePlateau(sf.tx + ox - 2, sf.tx + ox + 2, sf.ty - 2, sf.ty + 2, 2);
    });

    // 7. 2-Pass Cellular Automata smoothing to eliminate 1x1 spikes and gaps
    for (let pass = 0; pass < 2; pass++) {
      const toRemove: Array<{ x: number; y: number }> = [];
      for (let y = 1; y < KANTO_GRID_H - 1; y++) {
        const row = g[y];
        if (!row) continue;
        for (let x = 1; x < KANTO_GRID_W - 1; x++) {
          if (row[x] !== CELL_BIOME.MOUNTAIN_DIRT) continue;
          let mtCount = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (g[y + dy]?.[x + dx] === CELL_BIOME.MOUNTAIN_DIRT) mtCount++;
            }
          }
          if (mtCount <= 2) {
            toRemove.push({ x, y });
          }
        }
      }
      for (const p of toRemove) {
        g[p.y]![p.x] = CELL_BIOME.FOREST_WALL;
        elev[p.y]![p.x] = 1;
        this.occupancy.clear(p.x, p.y, OCCUPANCY_FLAGS.CLIFF);
      }
    }
  }

  private carveOrganicHydrography(nodes: Record<string, KantoNodeCoordinate>): void {
    const g = this.grid;
    const elev = this.elevation;

    const setWater = (x: number, y: number) => {
      if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
        const row = g[y];
        const eRow = elev[y];
        if (row && eRow) {
          const elev = eRow[x];
          if (elev !== undefined && elev >= 2) return; // Do not slice mountain cliffs
          if (x < 70 && y < 42) return; // Protect Mt. Moon, Route 3, and Route 4 corridor from water
          row[x] = CELL_BIOME.WATER;
          eRow[x] = 0;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
        }
      }
    };

    const fc = nodes.fuchsia ? this.nodeToTile(nodes.fuchsia.x, nodes.fuchsia.y) : { tx: 62, ty: 117 };
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : { tx: 39, ty: 109 };
    const cb = nodes.cinnabar ? this.nodeToTile(nodes.cinnabar.x, nodes.cinnabar.y) : { tx: 27, ty: 125 };
    const sf = nodes.seafoam ? this.nodeToTile(nodes.seafoam.x, nodes.seafoam.y) : { tx: 50, ty: 125 };
    const cr = nodes.cerulean ? this.nodeToTile(nodes.cerulean.x, nodes.cerulean.y) : { tx: 62, ty: 50 };
    const rt = nodes.rocktunnel ? this.nodeToTile(nodes.rocktunnel.x, nodes.rocktunnel.y) : { tx: 85, ty: 62 };
    const vm = nodes.vermilion ? this.nodeToTile(nodes.vermilion.x, nodes.vermilion.y) : { tx: 62, ty: 97 };

    // 1. South Ocean: Below Fuchsia down to world edge with natural wavy shoreline
    const southOceanY = fc.ty + 1;
    for (let y = southOceanY; y < KANTO_GRID_H; y++) {
      for (let x = 0; x < KANTO_GRID_W; x++) {
        const wave = Math.sin(x * 0.25) * 1.5;
        if (y >= southOceanY + wave) {
          setWater(x, y);
        }
      }
    }

    // 2. Route 21 Channel: South of Pallet Town (SW corner) to Cinnabar
    for (let y = pt.ty + 5; y < southOceanY + 4; y++) {
      for (let x = pt.tx - 7; x <= pt.tx - 2; x++) {
        const wobble = y > pt.ty + 8 ? Math.sin(y * 0.35) * 1.5 : 0;
        const left = Math.round(pt.tx - 6 + wobble);
        const right = Math.round(pt.tx - 2 + wobble);
        if (x >= left && x <= right) {
          setWater(x, y);
        }
      }
    }

    // 3. Eastern Ocean: Routes 12, 13, 14, 15 with organic coastline
    const eastOceanX = Math.max(rt.tx, 88);
    for (let y = 45; y < southOceanY; y++) {
      const shoreWobble = Math.sin(y * 0.28) * 2.2;
      for (let x = Math.round(eastOceanX + shoreWobble); x < KANTO_GRID_W; x++) {
        setWater(x, y);
      }
    }

    // 4. Vermilion Bay & S.S. Anne Harbor
    for (let y = vm.ty + 2; y <= vm.ty + 8; y++) {
      for (let x = vm.tx - 5; x <= vm.tx + 5; x++) {
        const d = Math.hypot(x - vm.tx, y - (vm.ty + 4));
        if (d <= 3.8) setWater(x, y);
      }
    }

    // 5. Cerulean River & Nugget Bridge Canal (Route 24 & Route 9 to Power Plant)
    for (let y = 14; y <= cr.ty; y++) {
      for (let x = cr.tx - 2; x <= cr.tx + 2; x++) {
        setWater(x, y);
      }
    }
    // Eastward river branch along Route 9 towards Rock Tunnel & Power Plant
    for (let x = cr.tx + 2; x < KANTO_GRID_W; x++) {
      const ry = cr.ty - 2 + Math.round(Math.sin((x - cr.tx) * 0.2) * 1.2);
      for (let dy = -1; dy <= 1; dy++) {
        setWater(x, ry + dy);
      }
    }

    // 6. Cinnabar Island (Organic sandy island with volcano crater)
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const tx = cb.tx + dx;
        const ty = cb.ty + dy;
        if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
          const isBorder = Math.abs(dx) >= 5 || Math.abs(dy) >= 4;
          const row = g[ty];
          const eRow = elev[ty];
          if (row && eRow) {
            row[tx] = isBorder ? CELL_BIOME.DIRT_PATH : CELL_BIOME.GRASS;
            eRow[tx] = 1;
            this.occupancy.clear(tx, ty, OCCUPANCY_FLAGS.WATER);
          }
        }
      }
    }

    // 7. Seafoam Islands (Twin rock formations in South Ocean)
    [-4, 4].forEach((ox) => {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const dist = Math.hypot(dx, dy);
          const tx = sf.tx + ox + dx;
          const ty = sf.ty + dy;
          if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
            const row = g[ty];
            const eRow = elev[ty];
            if (row && eRow && dist <= 3.2) {
              row[tx] = dist <= 2.2 ? CELL_BIOME.GRASS : CELL_BIOME.DIRT_PATH;
              eRow[tx] = 1;
              this.occupancy.clear(tx, ty, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }
    });

    // 8. Canonical Ponds (Viridian City SW, Safari Zone, Celadon South)
    const vn = nodes.viridian ? this.nodeToTile(nodes.viridian.x, nodes.viridian.y) : { tx: 39, ty: 85 };
    this.carveOrganicPond(g, vn.tx - 6, vn.ty + 5, 2.2);
    this.carveOrganicPond(g, fc.tx - 6, fc.ty - 10, 3.2);
    this.carveOrganicPond(g, vm.tx - 12, vm.ty - 6, 2.6);
  }

  private carveOrganicPond(grid: Uint8Array[], cx: number, cy: number, radius: number): void {
    const rInt = Math.ceil(radius + 2);
    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= KANTO_GRID_W || y < 0 || y >= KANTO_GRID_H) continue;
        if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.ROAD)) continue;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const rPerturb = radius * (1.0 + 0.2 * Math.sin(3 * angle));
        if (dist <= rPerturb) {
          const row = grid[y];
          if (row) {
            row[x] = CELL_BIOME.WATER;
            this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
          }
        }
      }
    }
  }

  private carveRoadNetwork(
    nodes: Record<string, KantoNodeCoordinate>,
    connections: readonly (readonly [string, string])[],
    roadWidth = 2
  ): void {
    const g = this.grid;

    // Saffron Boulevards and Cross Avenues
    const sfNode = nodes.saffron;
    if (sfNode) {
      const sfT = this.nodeToTile(sfNode.x, sfNode.y);
      for (let d = -6; d <= 6; d++) {
        for (let w = -1; w <= 1; w++) {
          const pts = [
            [sfT.tx + w, sfT.ty + d],
            [sfT.tx + d, sfT.ty + w]
          ];
          pts.forEach(([gx, gy]) => {
            if (gx !== undefined && gy !== undefined && gx >= 0 && gx < KANTO_GRID_W && gy >= 0 && gy < KANTO_GRID_H) {
              const row = g[gy];
              if (row) {
                row[gx] = CELL_BIOME.DIRT_PATH;
                this.occupancy.set(gx, gy, OCCUPANCY_FLAGS.ROAD);
                this.occupancy.reserveBuffer(gx, gy, 1, 1, 2, OCCUPANCY_FLAGS.ROAD_BUFFER);
              }
            }
          });
        }
      }
    }

    // Connect all active graph edges
    connections.forEach(([idA, idB]) => {
      const nA = nodes[idA];
      const nB = nodes[idB];
      if (!nA || !nB) return;
      if (nA.type === 'route_water' || nB.type === 'route_water') return;

      // Skip pallet-viridian as it has dedicated canonical Route 1 geometry
      const isPalletViridian =
        (idA === 'pallet' && idB === 'viridian') || (idA === 'viridian' && idB === 'pallet');
      if (isPalletViridian) return;

      const pA = this.nodeToTile(nA.x, nA.y);
      const pB = this.nodeToTile(nB.x, nB.y);
      this.rasterizePath(g, pA.tx, pA.ty, pB.tx, pB.ty, roadWidth);
    });

    // Canonical Route 1 Corridor & S-Curve
    const ptNode = nodes.pallet;
    const vnNode = nodes.viridian;
    if (ptNode && vnNode) {
      const pt = this.nodeToTile(ptNode.x, ptNode.y);
      const vn = this.nodeToTile(vnNode.x, vnNode.y);

      // Carve compact 11-tile Route 1 grass corridor (pt.tx - 5 to pt.tx + 5)
      for (let y = vn.ty + 8; y <= pt.ty - 2; y++) {
        for (let x = pt.tx - 5; x <= pt.tx + 5; x++) {
          if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
            const row = g[y];
            if (row && row[x] === CELL_BIOME.FOREST_WALL) {
              row[x] = CELL_BIOME.GRASS;
            }
          }
        }
      }

      const midY = Math.floor((pt.ty + vn.ty) / 2);
      this.rasterizePath(g, pt.tx, pt.ty - 2, pt.tx, midY + 4, roadWidth);
      this.rasterizePath(g, pt.tx, midY + 4, pt.tx + 3, midY + 4, roadWidth);
      this.rasterizePath(g, pt.tx + 3, midY + 4, pt.tx + 3, midY - 2, roadWidth);
      this.rasterizePath(g, pt.tx + 3, midY - 2, pt.tx - 2, midY - 2, roadWidth);
      this.rasterizePath(g, pt.tx - 2, midY - 2, pt.tx - 2, vn.ty + 8, roadWidth);
      this.rasterizePath(g, pt.tx - 2, vn.ty + 8, vn.tx, vn.ty + 8, roadWidth);
    }
  }

  private rasterizePath(grid: Uint8Array[], x0: number, y0: number, x1: number, y1: number, width = 2): void {
    const corridorRadius = Math.max(3, Math.floor(width / 2) + 2);
    const stamp = (cx: number, cy: number) => {
      for (let wy = -corridorRadius; wy <= corridorRadius; wy++) {
        for (let wx = -corridorRadius; wx <= corridorRadius; wx++) {
          const px = cx + wx;
          const py = cy + wy;
          if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
            const row = grid[py];
            if (row && row[px] === CELL_BIOME.FOREST_WALL) {
              row[px] = CELL_BIOME.GRASS;
            }
          }
        }
      }

      for (let wy = -Math.floor(width / 2); wy <= Math.floor(width / 2); wy++) {
        for (let wx = -Math.floor(width / 2); wx <= Math.floor(width / 2); wx++) {
          const px = cx + wx;
          const py = cy + wy;
          if (px >= 0 && px < KANTO_GRID_W && py >= 0 && py < KANTO_GRID_H) {
            const row = grid[py];
            if (row) {
              // Never carve roads over existing mountain cliffs
              if (row[px] === CELL_BIOME.MOUNTAIN_DIRT) continue;
              if (row[px] === CELL_BIOME.WATER) {
                row[px] = CELL_BIOME.BRIDGE;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
              } else {
                row[px] = CELL_BIOME.DIRT_PATH;
                this.occupancy.set(px, py, OCCUPANCY_FLAGS.ROAD);
                this.occupancy.reserveBuffer(px, py, 1, 1, 2, OCCUPANCY_FLAGS.ROAD_BUFFER);
              }
            }
          }
        }
      }
    };

    const drawLineH = (xStart: number, xEnd: number, y: number) => {
      const minX = Math.min(xStart, xEnd);
      const maxX = Math.max(xStart, xEnd);
      for (let x = minX; x <= maxX; x++) stamp(x, y);
    };

    const drawLineV = (yStart: number, yEnd: number, x: number) => {
      const minY = Math.min(yStart, yEnd);
      const maxY = Math.max(yStart, yEnd);
      for (let y = minY; y <= maxY; y++) stamp(x, y);
    };

    if (x0 === x1) {
      drawLineV(y0, y1, x0);
    } else if (y0 === y1) {
      drawLineH(x0, x1, y0);
    } else if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) {
      const midX = Math.round((x0 + x1) / 2);
      drawLineH(x0, midX, y0);
      drawLineV(y0, y1, midX);
      drawLineH(midX, x1, y1);
    } else {
      const midY = Math.round((y0 + y1) / 2);
      drawLineV(y0, midY, x0);
      drawLineH(x0, x1, midY);
      drawLineV(midY, y1, x1);
    }
  }

  private carveTallGrassPatches(nodes: Record<string, KantoNodeCoordinate>): void {
    const g = this.grid;
    const addPatch = (x0: number, x1: number, y0: number, y1: number) => {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
            const row = g[y];
            if (row && row[x] === CELL_BIOME.GRASS && !this.occupancy.has(x, y, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING)) {
              row[x] = CELL_BIOME.TALL_GRASS;
            }
          }
        }
      }
    };

    // 1. Canonical Route 1 tall grass patches (FireRed Route 1)
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : { tx: 39, ty: 109 };
    // South patches (above Route 1 entrance picket fence at ty - 9)
    addPatch(pt.tx - 6, pt.tx - 2, pt.ty - 13, pt.ty - 10);
    addPatch(pt.tx + 2, pt.tx + 6, pt.ty - 13, pt.ty - 10);
    // Middle-right patch
    addPatch(pt.tx + 1, pt.tx + 6, pt.ty - 19, pt.ty - 16);
    // Upper-right patch
    addPatch(pt.tx + 1, pt.tx + 6, pt.ty - 26, pt.ty - 23);
    // Top-left patch
    addPatch(pt.tx - 6, pt.tx - 2, pt.ty - 27, pt.ty - 24);

    // 2. Universal route-side wild Pokemon tall grass patches
    for (let gy = 4; gy < KANTO_GRID_H - 4; gy += 2) {
      for (let gx = 4; gx < KANTO_GRID_W - 4; gx += 2) {
        const row = g[gy];
        if (row && row[gx] === CELL_BIOME.DIRT_PATH) {
          const grassSeed = this.hashF(gx, gy, this.seed + 707);
          if (grassSeed > 0.30) {
            const side = grassSeed > 0.65 ? 2 : -2;
            addPatch(gx + side - 1, gx + side + 1, gy - 1, gy + 1);
          }
        }
      }
    }
  }

  private placeBridgesWithGuarantees(nodes: Record<string, KantoNodeCoordinate>): void {
    this.bridges = [];

    // Nugget Bridge (Route 24 north of Cerulean)
    const cr = nodes.cerulean ? this.nodeToPx(nodes.cerulean.x, nodes.cerulean.y) : { px: 2000, py: 1625 };
    this.bridges.push({ style: 'nugget', x: cr.px - 32, y: cr.py - 160, w: 64, h: 120 });

    // Harbor Pier in Vermilion
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : { px: 2000, py: 3125 };
    this.bridges.push({ style: 'pier', x: vm.px - 32, y: vm.py + 70, w: 64, h: 110 });
  }

  private placeTownArchitectures(nodes: Record<string, KantoNodeCoordinate>): void {
    this.buildings = [];
    const g = this.grid;
    const T = KANTO_TILE_SIZE;

    const placeSmartBuilding = (b: { style: string; x: number; y: number; w: number; h: number; door?: { x: number; y: number } }) => {
      let bx = Math.floor(b.x / T);
      let by = Math.floor(b.y / T);
      const bw = Math.ceil(b.w / T);
      const bh = Math.ceil(b.h / T);

      let bestX = bx;
      let bestY = by;
      let found = false;

      const isSpotValid = (tx: number, ty: number) => {
        if (tx < 1 || tx + bw >= KANTO_GRID_W - 1 || ty < 1 || ty + bh >= KANTO_GRID_H - 1) return false;
        for (let y = ty - 1; y <= ty + bh; y++) {
          for (let x = tx - 1; x <= tx + bw; x++) {
            const row = g[y];
            const eRow = this.elevation[y];
            if (!row || !eRow) return false;
            const cell = row[x];
            const elev = eRow[x];
            if (cell === undefined || cell === CELL_BIOME.WATER || cell === CELL_BIOME.MOUNTAIN_DIRT) return false;
            if (elev === undefined || elev >= 2) return false;
            if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.DOOR_ACCESS)) return false;
          }
        }
        for (const eb of this.buildings) {
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

      if (isSpotValid(bx, by)) {
        found = true;
      } else {
        for (let r = 1; r <= 12 && !found; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              if (isSpotValid(bx + dx, by + dy)) {
                bestX = bx + dx;
                bestY = by + dy;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }

      if (!found) {
        // Never forcefully place if spot is invalid
        return;
      }

      bx = bestX;
      by = bestY;

      const actualPx = bx * T;
      const actualPy = by * T;
      this.buildings.push({ ...b, x: actualPx, y: actualPy });
      this.occupancy.reserveRect(bx, by, bw, bh, OCCUPANCY_FLAGS.BUILDING);

      // Guarantee flat grass ground & clear cliff occupancy under building footprint
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
            const row = g[y];
            const eRow = this.elevation[y];
            if (row && row[x] !== CELL_BIOME.WATER) {
              row[x] = CELL_BIOME.GRASS;
            }
            if (eRow) {
              eRow[x] = 1;
            }
            this.occupancy.clear(x, y, OCCUPANCY_FLAGS.CLIFF);
          }
        }
      }

      // Door access corridor with authentic dirt path
      const doorTileX = bx + (b.door ? b.door.x : Math.floor(bw / 2));
      const doorTileY = by + bh;
      if (doorTileY < KANTO_GRID_H) {
        this.occupancy.reserveRect(doorTileX, doorTileY, 1, 2, OCCUPANCY_FLAGS.DOOR_ACCESS);
        for (let step = 0; step <= 2; step++) {
          const cy = doorTileY + step;
          const row = g[cy];
          if (cy < KANTO_GRID_H && row && row[doorTileX] !== CELL_BIOME.WATER && row[doorTileX] !== CELL_BIOME.MOUNTAIN_DIRT) {
            row[doorTileX] = CELL_BIOME.DIRT_PATH;
            this.occupancy.set(doorTileX, cy, OCCUPANCY_FLAGS.SIDEWALK);
          }
        }
      }
    };

    const pw = nodes.pewter ? this.nodeToPx(nodes.pewter.x, nodes.pewter.y) : { px: 1250, py: 1000 };
    const cr = nodes.cerulean ? this.nodeToPx(nodes.cerulean.x, nodes.cerulean.y) : { px: 2000, py: 1625 };
    const sf = nodes.saffron ? this.nodeToPx(nodes.saffron.x, nodes.saffron.y) : { px: 2000, py: 2375 };
    const cl = nodes.celadon ? this.nodeToPx(nodes.celadon.x, nodes.celadon.y) : { px: 1375, py: 2375 };
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : { px: 2000, py: 3125 };
    const lv = nodes.lavender ? this.nodeToPx(nodes.lavender.x, nodes.lavender.y) : { px: 2750, py: 2375 };
    const fc = nodes.fuchsia ? this.nodeToPx(nodes.fuchsia.x, nodes.fuchsia.y) : { px: 2000, py: 3750 };
    const cb = nodes.cinnabar ? this.nodeToPx(nodes.cinnabar.x, nodes.cinnabar.y) : { px: 875, py: 4000 };
    const ip = nodes.indigo ? this.nodeToPx(nodes.indigo.x, nodes.indigo.y) : { px: 750, py: 875 };
    const bh = nodes.billshouse ? this.nodeToPx(nodes.billshouse.x, nodes.billshouse.y) : { px: 2625, py: 750 };
    const pp = nodes.powerplant ? this.nodeToPx(nodes.powerplant.x, nodes.powerplant.y) : { px: 3125, py: 1625 };

    const canonicalBuildings: { style: string; x: number; y: number; w: number; h: number; door?: { x: number; y: number } }[] = [];

    // Pallet Town (Hamlet)
    if (nodes.pallet) {
      const ptT = this.nodeToTile(nodes.pallet.x, nodes.pallet.y);
      canonicalBuildings.push(
        { style: 'house_red', x: (ptT.tx - 5) * T, y: (ptT.ty - 4) * T, w: 160, h: 160, door: { x: 2, y: 4 } },
        { style: 'house_blue', x: (ptT.tx + 2) * T, y: (ptT.ty - 4) * T, w: 160, h: 160, door: { x: 2, y: 4 } },
        { style: 'lab_oak', x: (ptT.tx - 1) * T, y: (ptT.ty + 2) * T, w: 224, h: 192, door: { x: 3, y: 5 } }
      );
    }

    // Viridian City (Bastion)
    if (nodes.viridian) {
      const vrT = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      canonicalBuildings.push(
        { style: 'gym', x: (vrT.tx + 3) * T, y: (vrT.ty - 8) * T, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'house_green', x: (vrT.tx - 6) * T, y: (vrT.ty - 8) * T, w: 160, h: 160, door: { x: 1, y: 5 } },
        { style: 'house_green', x: (vrT.tx + 3) * T, y: (vrT.ty - 2) * T, w: 160, h: 160, door: { x: 1, y: 5 } },
        { style: 'pokecenter', x: (vrT.tx - 6) * T, y: (vrT.ty + 2) * T, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: (vrT.tx + 3) * T, y: (vrT.ty + 4) * T, w: 128, h: 128, door: { x: 2, y: 4 } }
      );
    }

    // Pewter City (Bastion)
    if (nodes.pewter) {
      canonicalBuildings.push(
        { style: 'house_pewter_slate', x: pw.px - 220, y: pw.py - 220, w: 160, h: 160, door: { x: 1, y: 4 } },
        { style: 'mansion_school', x: pw.px - 40, y: pw.py - 200, w: 224, h: 256, door: { x: 3, y: 7 } },
        { style: 'gym_gold', x: pw.px - 160, y: pw.py - 30, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: pw.px + 50, y: pw.py - 40, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: pw.px - 140, y: pw.py + 80, w: 128, h: 128, door: { x: 2, y: 4 } },
        { style: 'house_pewter_slate', x: pw.px + 60, y: pw.py + 80, w: 160, h: 160, door: { x: 1, y: 4 } }
      );
    }

    // Route 2 Gatehouse (Viridian Forest Border)
    if (nodes.viridian && nodes.pewter) {
      const vrT = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      const pwT = this.nodeToTile(nodes.pewter.x, nodes.pewter.y);
      const midY = Math.round((vrT.ty + pwT.ty) / 2);
      canonicalBuildings.push(
        { style: 'gatehouse_route', x: vrT.tx * T - 80, y: midY * T, w: 160, h: 160, door: { x: 2, y: 4 } }
      );
    }

    // Mt. Moon (Route 4 / Route 3 entrance Pokémon Center)
    if (nodes.mtmoon) {
      const mmT = this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y);
      canonicalBuildings.push(
        { style: 'pokecenter', x: (mmT.tx - 7) * T, y: (mmT.ty + 1) * T, w: 160, h: 160, door: { x: 2, y: 5 } }
      );
    }

    // Cerulean City (Bastion)
    if (nodes.cerulean) {
      canonicalBuildings.push(
        { style: 'gym', x: cr.px - 160, y: cr.py - 60, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: cr.px + 50, y: cr.py - 60, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: cr.px + 50, y: cr.py + 60, w: 128, h: 128, door: { x: 2, y: 4 } }
      );
    }

    // Saffron City (Metropolis)
    if (nodes.saffron) {
      canonicalBuildings.push(
        { style: 'silph_tower', x: sf.px - 144, y: sf.py - 160, w: 288, h: 320, door: { x: 4, y: 10 } },
        { style: 'gym_gold', x: sf.px + 160, y: sf.py - 160, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'gym', x: sf.px + 160, y: sf.py + 40, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: sf.px - 320, y: sf.py - 160, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: sf.px - 320, y: sf.py + 40, w: 128, h: 128, door: { x: 2, y: 4 } },
        // 4 Cardinal Gatehouses of Saffron City (North, South, East, West)
        { style: 'gatehouse_route', x: sf.px - 80, y: sf.py - 360, w: 160, h: 160, door: { x: 2, y: 4 } },
        { style: 'gatehouse_route', x: sf.px - 80, y: sf.py + 240, w: 160, h: 160, door: { x: 2, y: 4 } },
        { style: 'gatehouse_route', x: sf.px + 360, y: sf.py - 60, w: 160, h: 160, door: { x: 2, y: 4 } },
        { style: 'gatehouse_route', x: sf.px - 520, y: sf.py - 60, w: 160, h: 160, door: { x: 2, y: 4 } }
      );
    }

    // Celadon City (Metropolis)
    if (nodes.celadon) {
      canonicalBuildings.push(
        { style: 'game_corner', x: cl.px - 220, y: cl.py - 80, w: 224, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: cl.px + 80, y: cl.py - 80, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'gym', x: cl.px - 220, y: cl.py + 100, w: 192, h: 160, door: { x: 3, y: 5 } },
        // Route 16 West Gatehouse (Cycling Road entrance)
        { style: 'gatehouse_route', x: cl.px - 420, y: cl.py - 60, w: 160, h: 160, door: { x: 2, y: 4 } }
      );
    }

    // Vermilion City (Port)
    if (nodes.vermilion) {
      canonicalBuildings.push(
        { style: 'gym', x: vm.px - 160, y: vm.py + 80, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: vm.px + 60, y: vm.py - 80, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: vm.px - 150, y: vm.py - 80, w: 128, h: 128, door: { x: 2, y: 4 } }
      );
    }

    // Lavender Town (Rural)
    if (nodes.lavender) {
      canonicalBuildings.push(
        { style: 'pokecenter', x: lv.px - 120, y: lv.py - 50, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'silph_tower', x: lv.px + 40, y: lv.py - 90, w: 288, h: 320, door: { x: 4, y: 10 } }
      );
    }

    // Fuchsia City (Bastion)
    if (nodes.fuchsia) {
      canonicalBuildings.push(
        { style: 'gym', x: fc.px - 160, y: fc.py - 40, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: fc.px + 50, y: fc.py - 40, w: 160, h: 160, door: { x: 2, y: 5 } },
        { style: 'pokemart', x: fc.px + 50, y: fc.py + 60, w: 128, h: 128, door: { x: 2, y: 4 } }
      );
    }

    // Cinnabar Island (Rural)
    if (nodes.cinnabar) {
      canonicalBuildings.push(
        { style: 'gym', x: cb.px + 40, y: cb.py - 80, w: 192, h: 160, door: { x: 3, y: 5 } },
        { style: 'pokecenter', x: cb.px - 110, y: cb.py + 20, w: 160, h: 160, door: { x: 2, y: 5 } }
      );
    }

    // Landmarks & League
    if (nodes.powerplant) {
      canonicalBuildings.push(
        { style: 'power_plant', x: pp.px - 100, y: pp.py - 60, w: 320, h: 208, door: { x: 5, y: 6 } }
      );
    }
    if (nodes.billshouse) {
      canonicalBuildings.push(
        { style: 'house_teal_bungalow', x: bh.px - 50, y: bh.py - 50, w: 160, h: 160, door: { x: 1, y: 5 } }
      );
    }
    if (nodes.indigo) {
      canonicalBuildings.push(
        { style: 'pokemon_league', x: ip.px - 160, y: ip.py - 80, w: 512, h: 208, door: { x: 8, y: 6 } }
      );
    }

    canonicalBuildings.forEach((b) => placeSmartBuilding(b));

    // Pewter City Civic Stone Plaza (authentically paves the open courtyard between Museum, Gym, Center & School)
    if (nodes.pewter) {
      const pwT = this.nodeToTile(nodes.pewter.x, nodes.pewter.y);
      for (let dy = -7; dy <= 4; dy++) {
        for (let dx = -7; dx <= 5; dx++) {
          const gx = pwT.tx + dx;
          const gy = pwT.ty + dy;
          if (gx >= 0 && gx < KANTO_GRID_W && gy >= 0 && gy < KANTO_GRID_H) {
            const row = g[gy];
            if (
              row &&
              row[gx] !== CELL_BIOME.WATER &&
              !this.occupancy.has(gx, gy, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING)
            ) {
              row[gx] = CELL_BIOME.PLAZA_STONE;
            }
          }
        }
      }
    }
  }

  private placeRouteInfrastructure(nodes?: Record<string, KantoNodeCoordinate>): void {
    const T = KANTO_TILE_SIZE;
    const ptTile = nodes?.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : { tx: 39, ty: 109 };

    // 1. Route 1 South Exit Picket Fence (FireRed Route 1 border with 2-tile gap)
    for (let x = ptTile.tx - 6; x <= ptTile.tx - 2; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty - 9) * T });
    }
    for (let x = ptTile.tx + 2; x <= ptTile.tx + 6; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty - 9) * T });
    }

    // 2. Pallet Town Flowerbed (Left of Oak Lab)
    for (let x = ptTile.tx - 6; x <= ptTile.tx - 2; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: ptTile.ty * T });
    }
    for (let dy = 1; dy <= 2; dy++) {
      for (let x = ptTile.tx - 5; x <= ptTile.tx - 2; x++) {
        this.props.push({ style: 'poke_flowers_red', x: x * T, y: (ptTile.ty + dy) * T });
      }
    }

    // 3. Pallet Town Fence below Oak Lab
    for (let x = ptTile.tx + 1; x <= ptTile.tx + 6; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty + 7) * T });
    }

    // 4. Mailboxes next to houses
    this.props.push({ style: 'poke_mailbox', x: (ptTile.tx - 7) * T, y: (ptTile.ty - 3) * T });
    this.props.push({ style: 'poke_mailbox', x: (ptTile.tx + 1) * T, y: (ptTile.ty - 3) * T });

    // 5. Wooden Signposts
    this.props.push({ style: 'poke_signpost', x: (ptTile.tx - 6) * T, y: (ptTile.ty + 3) * T }); // Pallet Town board
    this.props.push({ style: 'poke_signpost', x: (ptTile.tx - 1) * T, y: (ptTile.ty - 8) * T }); // Route 1 signpost

    // 6. Route 1 Flower Accents
    this.props.push({ style: 'poke_flowers_red', x: (ptTile.tx - 5) * T, y: (ptTile.ty - 14) * T });
    this.props.push({ style: 'poke_flowers_red', x: (ptTile.tx + 5) * T, y: (ptTile.ty - 18) * T });

    // 7. Mt. Moon Infrastructure
    if (nodes?.mtmoon) {
      const mmT = this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y);
      // Pave authentic sand paths connecting South approach -> Pokemon Center -> Cave
      this.rasterizePath(this.grid, mmT.tx - 7, mmT.ty + 8, mmT.tx - 7, mmT.ty + 3, 2);
      this.rasterizePath(this.grid, mmT.tx - 7, mmT.ty + 1, mmT.tx, mmT.ty + 1, 2);
      this.rasterizePath(this.grid, mmT.tx, mmT.ty + 1, mmT.tx, mmT.ty - 3, 2);

      // Cave mouth embedded flush into 2-tile cliff wall (Row 26 top rim, Row 27 face)
      this.props.push({
        style: 'poke_cave_entrance_mtmoon',
        x: mmT.tx * T,
        y: (mmT.ty - 5) * T,
        w: 32,
        h: 64
      });

      // Canonical stone stairs connecting ground (Row 28) to upper terrace (Row 26)
      this.nature.push({
        style: 'poke_stairs_mtmoon',
        x: (mmT.tx + 5) * T,
        y: (mmT.ty - 4) * T,
        w: 64,
        h: 32
      });

      // Canonical Signpost near the cave entrance
      this.props.push({
        style: 'poke_signpost',
        x: (mmT.tx - 1) * T,
        y: (mmT.ty - 2) * T,
        w: 32,
        h: 32
      });

      // Decorative ground boulders (Mt. Moon valley)
      this.props.push({ style: 'poke_rock_small', x: (mmT.tx - 9) * T, y: (mmT.ty - 1) * T, w: 32, h: 32 });
      this.props.push({ style: 'poke_rock_small', x: (mmT.tx - 3) * T, y: (mmT.ty + 3) * T, w: 32, h: 32 });
      this.props.push({ style: 'poke_rock_small', x: (mmT.tx + 3) * T, y: (mmT.ty - 1) * T, w: 32, h: 32 });
      this.props.push({ style: 'poke_rock_small', x: (mmT.tx + 6) * T, y: (mmT.ty + 4) * T, w: 32, h: 32 });
    }
  }

  private placeLedges(nodes: Record<string, KantoNodeCoordinate>): void {
    const T = KANTO_TILE_SIZE;
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : { tx: 39, ty: 109 };
    const mm = nodes.mtmoon ? this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y) : { tx: 62, ty: 31 };

    // Route 1 & Route 4 authentic canonical ledges (matching FireRed GBA)
    const ledgesConfig = [
      { y: pt.ty - 11, x0: pt.tx - 6, x1: pt.tx - 3 },
      { y: pt.ty - 11, x0: pt.tx + 2, x1: pt.tx + 6 },
      { y: pt.ty - 16, x0: pt.tx - 6, x1: pt.tx },
      { y: pt.ty - 22, x0: pt.tx + 1, x1: pt.tx + 6 },
      { y: pt.ty - 27, x0: pt.tx - 6, x1: pt.tx - 2 },
      // Route 4 eastward jumpable ledges (in the valley, east of Pokemon Center)
      { y: mm.ty + 2, x0: mm.tx - 4, x1: mm.tx - 1 },
      { y: mm.ty + 5, x0: mm.tx - 4, x1: mm.tx + 1 },
      { y: mm.ty + 5, x0: mm.tx + 4, x1: mm.tx + 10 },
      { y: mm.ty + 8, x0: mm.tx + 3, x1: mm.tx + 10 }
    ];

    const placedLedges: Array<{ x: number; y: number }> = [];
    for (const l of ledgesConfig) {
      for (let x = l.x0; x <= l.x1; x++) {
        if (!this.occupancy.has(x, l.y, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.WATER)) {
          placedLedges.push({ x, y: l.y });
          this.occupancy.set(x, l.y, OCCUPANCY_FLAGS.CLIFF);
        }
      }
    }

    const ledgeSet = new Set<string>(placedLedges.map((p) => `${p.x},${p.y}`));
    for (const p of placedLedges) {
      const hasLeft = ledgeSet.has(`${p.x - 1},${p.y}`);
      const hasRight = ledgeSet.has(`${p.x + 1},${p.y}`);
      let style = 'poke_ledge_mid';
      if (!hasLeft && hasRight) style = 'poke_ledge_left';
      else if (hasLeft && !hasRight) style = 'poke_ledge_right';
      else if (!hasLeft && !hasRight) style = 'poke_ledge_mid';

      this.nature.push({ style, x: p.x * T, y: p.y * T });
    }
  }

  private placeNatureAndForests(
    nodes: Record<string, KantoNodeCoordinate>,
    _connections: readonly (readonly [string, string])[],
    _treeDensityMultiplier = 0.7
  ): void {
    const g = this.grid;
    const T = KANTO_TILE_SIZE;

    const simplex = new SimplexNoise(this.seed + 101);

    // 1. Continuous Dense Forest Wall: Staggered brick overlap placement (interlocking canopies)
    for (let gy = 0; gy < KANTO_GRID_H - 1; gy += 2) {
      // Shift every second row by 1 tile (32px) to stagger canopies like bricks
      const xOffset = ((gy / 2) % 2 === 1) ? 1 : 0;
      for (let gx = xOffset; gx < KANTO_GRID_W - 1; gx += 2) {
        const row = g[gy];
        if (row && row[gx] === CELL_BIOME.FOREST_WALL) {
          if (!this.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.WATER)) {
            // Buffer around cliffs: trees must not overlap cliff perimeters (1 tile horizontal, 2 tiles vertical)
            let nearCliff = false;
            for (let cdy = -2; cdy <= 2; cdy++) {
              for (let cdx = -1; cdx <= 2; cdx++) {
                const cx = gx + cdx;
                const cy = gy + cdy;
                if (cx >= 0 && cx < KANTO_GRID_W && cy >= 0 && cy < KANTO_GRID_H) {
                  if (this.occupancy.has(cx, cy, OCCUPANCY_FLAGS.CLIFF) || g[cy]?.[cx] === CELL_BIOME.MOUNTAIN_DIRT) {
                    nearCliff = true;
                    break;
                  }
                }
              }
              if (nearCliff) break;
            }
            if (nearCliff) continue;

            // Organic biome species assignment:
            // Continuous latitude noise transition around gy = 36 (spread across gy = 28..44)
            // Mountain and high elevation zones (elev >= 2) -> 100% Alpine pine
            const elevVal = this.elevation[gy]?.[gx] ?? 1;
            const latitudeFactor = (36 - gy) / 10;
            const noiseVal = simplex.noise2D(gx * 0.12, gy * 0.12) * 0.8;
            const isAlpine = elevVal >= 2 || (latitudeFactor + noiseVal > 0.1);
            const style = isAlpine ? 'poke_tree_pine_small' : 'poke_tree_oak_clean';
            this.trees.push({ style, x: gx * T, y: gy * T });
          }
        }
      }
    }

    // 2. Canonical Route 1 obstacle trees inside the clearing
    if (nodes.pallet) {
      const pt = this.nodeToTile(nodes.pallet.x, nodes.pallet.y);
      this.trees.push({ style: 'poke_tree_oak_clean', x: (pt.tx - 3) * T, y: (pt.ty - 14) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (pt.tx - 3) * T, y: (pt.ty - 17) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (pt.tx + 2) * T, y: (pt.ty - 20) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (pt.tx + 3) * T, y: (pt.ty - 20) * T });
    }

    // 3. Viridian City trees & Cuttable Tree
    if (nodes.viridian) {
      const vr = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      this.trees.push({ style: 'poke_tree_oak_clean', x: (vr.tx - 7) * T, y: (vr.ty - 6) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (vr.tx - 5) * T, y: (vr.ty - 6) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (vr.tx - 3) * T, y: (vr.ty - 6) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (vr.tx + 7) * T, y: (vr.ty + 2) * T });
      this.trees.push({ style: 'poke_tree_oak_clean', x: (vr.tx + 7) * T, y: (vr.ty - 4) * T });
      this.trees.push({ style: 'poke_tree_cuttable', x: (vr.tx - 2) * T, y: (vr.ty + 1) * T });
    }

    // 4. Viridian Forest & Pewter alpine pine framing
    const isCanonicalKanto = Boolean(nodes.pallet || nodes.viridian || nodes.pewter);
    if (isCanonicalKanto) {
      const vfNode = nodes.viridianforest;
      if (vfNode) {
        const vf = this.nodeToPx(vfNode.x, vfNode.y);
        for (let dy = -120; dy <= 120; dy += 32) {
          for (let dx = -100; dx <= 100; dx += 32) {
            const gx = Math.floor((vf.px + dx) / T);
            const gy = Math.floor((vf.py + dy) / T);
            if (gx >= 0 && gx < KANTO_GRID_W && gy >= 0 && gy < KANTO_GRID_H) {
              if (g[gy]?.[gx] === CELL_BIOME.GRASS && !this.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING)) {
                this.trees.push({ style: 'poke_tree_oak_clean', x: gx * T, y: gy * T });
              }
            }
          }
        }
      }
    }
  }

  private placePropsAndDetails(nodes: Record<string, KantoNodeCoordinate>): void {
    // Snorlax on Route 12 and Route 16
    const r12 = nodes.route12 ? this.nodeToPx(nodes.route12.x, nodes.route12.y) : null;
    if (r12) this.props.push({ style: 'poke_snorlax', x: r12.px - 10, y: r12.py + 40 });

    const r16 = nodes.route16 ? this.nodeToPx(nodes.route16.x, nodes.route16.y) : null;
    if (r16) this.props.push({ style: 'poke_snorlax', x: r16.px + 30, y: r16.py - 10 });

    // Cuttable trees
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : null;
    if (vm) this.props.push({ style: 'tree_cuttable', x: vm.px - 120, y: vm.py + 25 });

    // Street lamps in major cities
    ['viridian', 'pewter', 'cerulean', 'celadon', 'vermilion', 'lavender', 'fuchsia'].forEach((id) => {
      const n = nodes[id];
      if (!n) return;
      const { px, py } = this.nodeToPx(n.x, n.y);
      this.props.push({ style: 'street_lamp', x: px - 50, y: py - 10 });
      this.props.push({ style: 'street_lamp', x: px + 50, y: py - 10 });
    });

    const dc = nodes.diglettcave ? this.nodeToPx(nodes.diglettcave.x, nodes.diglettcave.y) : null;
    if (dc) this.props.push({ style: 'diglett', x: dc.px, y: dc.py });
  }
}

