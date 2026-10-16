// Universal Autotiling Engine for LPC & GBA Terrain

import {
  REGIONAL_MASSIF_BOUNDS,
  LPC_PIECE_SLICES,
  RMXP_SUBTILE_SIZE,
  RMXP_SUBTILES,
  type RmxpSubtilePos
} from '../../config/kantoTileEngineConfig.ts';
import { KANTO_TILE_SIZE, CELL_BIOME } from '../../types/map/kantoGridModel.ts';
import type { DynamicCatalogLoader } from './kantoCatalogLoader.ts';
import { type MountainPalette } from './mountainAutotileEngine.ts';

export interface MountainTileResolution {
  readonly primaryImage: string;
  readonly underlayImage?: string;
  readonly overlayImages?: readonly string[];
  readonly pal: MountainPalette;
  readonly isRockTier: boolean;
}

export interface RmxpSubtiles {
  readonly tl: RmxpSubtilePos;
  readonly tr: RmxpSubtilePos;
  readonly bl: RmxpSubtilePos;
  readonly br: RmxpSubtilePos;
}

/**
 * Resolves 4 16x16 subtiles for an RMXP / Pokémon Essentials 96x128 px autotile sheet.
 * Handles all 48 canonical tile combinations mathematically based on 8-direction neighbors.
 */
export function resolveRmxpSubtiles(
  grid: Uint8Array[],
  gx: number,
  gy: number,
  cellType: number
): RmxpSubtiles {
  const H = grid.length;
  const W = grid[0]?.length ?? 0;
  const match = (x: number, y: number): boolean => {
    if (x < 0 || x >= W || y < 0 || y >= H) return true;
    const row = grid[y];
    return row ? row[x] === cellType : true;
  };

  const n = match(gx, gy - 1);
  const s = match(gx, gy + 1);
  const w = match(gx - 1, gy);
  const e = match(gx + 1, gy);
  const nw = match(gx - 1, gy - 1);
  const ne = match(gx + 1, gy - 1);
  const sw = match(gx - 1, gy + 1);
  const se = match(gx + 1, gy + 1);

  // Top-Left Quadrant
  let tl: RmxpSubtilePos;
  if (!n && !w) tl = RMXP_SUBTILES.tl.outer;
  else if (!n && w) tl = RMXP_SUBTILES.tl.topEdge;
  else if (n && !w) tl = RMXP_SUBTILES.tl.leftEdge;
  else if (!nw) tl = RMXP_SUBTILES.tl.inner;
  else tl = RMXP_SUBTILES.tl.center;

  // Top-Right Quadrant
  let tr: RmxpSubtilePos;
  if (!n && !e) tr = RMXP_SUBTILES.tr.outer;
  else if (!n && e) tr = RMXP_SUBTILES.tr.topEdge;
  else if (n && !e) tr = RMXP_SUBTILES.tr.rightEdge;
  else if (!ne) tr = RMXP_SUBTILES.tr.inner;
  else tr = RMXP_SUBTILES.tr.center;

  // Bottom-Left Quadrant
  let bl: RmxpSubtilePos;
  if (!s && !w) bl = RMXP_SUBTILES.bl.outer;
  else if (!s && w) bl = RMXP_SUBTILES.bl.bottomEdge;
  else if (s && !w) bl = RMXP_SUBTILES.bl.leftEdge;
  else if (!sw) bl = RMXP_SUBTILES.bl.inner;
  else bl = RMXP_SUBTILES.bl.center;

  // Bottom-Right Quadrant
  let br: RmxpSubtilePos;
  if (!s && !e) br = RMXP_SUBTILES.br.outer;
  else if (!s && e) br = RMXP_SUBTILES.br.bottomEdge;
  else if (s && !e) br = RMXP_SUBTILES.br.rightEdge;
  else if (!se) br = RMXP_SUBTILES.br.inner;
  else br = RMXP_SUBTILES.br.center;

  return { tl, tr, bl, br };
}

export class UniversalAutotiler {
  private readonly loader: DynamicCatalogLoader;
  private readonly massifMap = new Map<number, MountainPalette>();
  private lastGridRef: Uint8Array[] | null = null;

  constructor(loader: DynamicCatalogLoader) {
    this.loader = loader;
  }

  /**
   * Identifies the connected mountain massif via 8-connected BFS and assigns a 100% uniform
   * palette ('brown' or 'gray') to every tile belonging to the same massif.
   */
  getMassifPalette(grid: Uint8Array[], gx: number, gy: number): MountainPalette {
    if (this.lastGridRef !== grid) {
      this.massifMap.clear();
      this.lastGridRef = grid;
    }
    const H = grid.length;
    const W = grid[0]?.length ?? 0;
    const key = gy * W + gx;
    const cached = this.massifMap.get(key);
    if (cached) return cached;

    // 8-connected BFS to guarantee 100% palette uniformity across the entire massif
    const queue: number[] = [key];
    const visited = new Set<number>([key]);
    const comp: number[] = [key];
    let minX = gx;
    let minY = gy;

    while (queue.length > 0) {
      const curr = queue.pop()!;
      const cx = curr % W;
      const cy = Math.floor(curr / W);
      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            if (grid[ny]?.[nx] === CELL_BIOME.MOUNTAIN_DIRT) {
              const nKey = ny * W + nx;
              if (!visited.has(nKey)) {
                visited.add(nKey);
                comp.push(nKey);
                queue.push(nKey);
              }
            }
          }
        }
      }
    }

    // Regional canon: Mt. Moon (Pewter to Cerulean northern range) and Rock Tunnel are canonically warm brown.
    // Indigo Plateau (far NW) and volcanic Seafoam/Cinnabar are volcanic gray.
    let pal: MountainPalette;
    const b = REGIONAL_MASSIF_BOUNDS;
    if (
      (gx >= b.mtMoon.minGx && gx <= b.mtMoon.maxGx && gy <= b.mtMoon.maxGy) ||
      (minX >= b.mtMoon.minGx && minX <= b.mtMoon.maxGx && minY <= b.mtMoon.maxGy)
    ) {
      pal = 'brown'; // Canonical Mt. Moon massif
    } else if (
      minX >= b.rockTunnel.minGx &&
      minY >= b.rockTunnel.minGy &&
      minY <= b.rockTunnel.maxGy
    ) {
      pal = 'brown'; // Canonical Rock Tunnel massif
    } else if (minX < b.indigoPlateauMinGx || minY > b.seafoamMinGy) {
      pal = 'gray'; // Canonical Indigo Plateau & Seafoam / Cinnabar
    } else {
      const hash = ((minX * b.hashPrimeX + minY * b.hashPrimeY) ^ b.hashXor) & b.hashMask;
      pal = hash % 2 === 0 ? 'brown' : 'gray';
    }

    for (const k of comp) {
      this.massifMap.set(k, pal);
    }

    return pal;
  }

  /**
   * Resolves authentic canonical Pokémon GBA mountain cliff tiles for a cell.
   * Handles:
   * - 100% uniform massif palettes ('brown' | 'gray')
   * - Strict canonical 2-tile south cliff autotiling (Row Y-1: _top, Row Y: _face)
   * - 4-way cardinal outer corners with boundary integrity (zero 1-tile chopped cut-offs)
   * - Cardinal cliff edges (top, face, left, right)
   * - Concave inner corners (inner_tl, inner_tr, inner_bl, inner_br)
   */
  resolveMountainTile(
    grid: readonly (Uint8Array | readonly number[])[],
    gx: number,
    gy: number,
    elevation?: readonly (Uint8Array | readonly number[])[]
  ): MountainTileResolution {
    const H = grid.length;
    const W = grid[0]?.length ?? 0;
    const curElev = elevation?.[gy]?.[gx] ?? 2;
    const isRockTier = curElev >= 3;
    const pal = this.getMassifPalette(grid as Uint8Array[], gx, gy);

    const isSameOrHigherMt = (x: number, y: number): boolean => {
      if (x < 0 || x >= W || y < 0 || y >= H) return false;
      if (grid[y]?.[x] !== CELL_BIOME.MOUNTAIN_DIRT) return false;
      if (!elevation) return true;
      const nElev = elevation[y]?.[x] ?? 2;
      return nElev >= curElev;
    };

    const n = isSameOrHigherMt(gx, gy - 1);
    const s = isSameOrHigherMt(gx, gy + 1);
    const w = isSameOrHigherMt(gx - 1, gy);
    const e = isSameOrHigherMt(gx + 1, gy);

    const prefix = `poke_cliff_${pal}`;
    const underlayImage = `poke_cliff_${pal}_plateau_rock.png`;

    // 1. Isolated Peak (0 neighbors) or 1-tile thin pinches (missing both opposite borders)
    const is1TileThin = (!w && !e) || (!n && !s);
    if ((!n && !s && !w && !e) || is1TileThin) {
      return {
        primaryImage: `poke_cliff_cone_${pal}.png`,
        underlayImage,
        pal,
        isRockTier
      };
    }

    // 2. Canonical 2-Tile South Cliff:
    // Row Y is the vertical face wall if there is NO mountain to the south
    const isSouthCliffFace = !s && n;
    // Row Y-1 is the top ledge rim if its south neighbor is a cliff face
    const isSouthCliffTop = s && !isSameOrHigherMt(gx, gy + 2);

    if (isSouthCliffFace) {
      if (!w && e)
        return { primaryImage: `${prefix}_corner_bl.png`, underlayImage, pal, isRockTier };
      if (!e && w)
        return { primaryImage: `${prefix}_corner_br.png`, underlayImage, pal, isRockTier };
      return { primaryImage: `${prefix}_face.png`, underlayImage, pal, isRockTier };
    }

    if (isSouthCliffTop) {
      if (!w && e) return { primaryImage: `${prefix}_left.png`, underlayImage, pal, isRockTier };
      if (!e && w) return { primaryImage: `${prefix}_right.png`, underlayImage, pal, isRockTier };
      return { primaryImage: `${prefix}_top.png`, underlayImage, pal, isRockTier };
    }

    // 3. North Outer Corners (missing north and one lateral border)
    if (!n && !w && s && e)
      return { primaryImage: `${prefix}_corner_tl.png`, underlayImage, pal, isRockTier };
    if (!n && !e && s && w)
      return { primaryImage: `${prefix}_corner_tr.png`, underlayImage, pal, isRockTier };

    // 4. North Edge (missing north border)
    if (!n && s && w && e)
      return { primaryImage: `${prefix}_top.png`, underlayImage, pal, isRockTier };

    // 5. Lateral Edges (missing only left or right)
    if (!w && e && n && s)
      return { primaryImage: `${prefix}_left.png`, underlayImage, pal, isRockTier };
    if (!e && w && n && s)
      return { primaryImage: `${prefix}_right.png`, underlayImage, pal, isRockTier };

    // 6. Concave Inner Corners (all 4 cardinal present, check diagonals)
    const nw = isSameOrHigherMt(gx - 1, gy - 1);
    const ne = isSameOrHigherMt(gx + 1, gy - 1);
    const sw = isSameOrHigherMt(gx - 1, gy + 1);
    const se = isSameOrHigherMt(gx + 1, gy + 1);

    const overlays: string[] = []; // no-domain: Estructura o identificador procedural de aventura
    if (!nw) overlays.push(`${prefix}_inner_tl.png`);
    if (!ne) overlays.push(`${prefix}_inner_tr.png`);
    if (!sw) overlays.push(`${prefix}_inner_bl.png`);
    if (!se) overlays.push(`${prefix}_inner_br.png`);

    if (overlays.length === 1) {
      return {
        primaryImage: overlays[0]!,
        underlayImage,
        pal,
        isRockTier
      };
    }

    return {
      primaryImage: `${prefix}_${isRockTier ? 'plateau_rock' : 'plateau'}.png`,
      underlayImage,
      overlayImages: overlays.length > 0 ? overlays : undefined,
      pal,
      isRockTier
    };
  }

  getPieceSlice(pieceName: string): { sx: number; sy: number } {
    const layout = this.loader.catalog?.autotileLayout?.standardLPC?.pieces;
    if (layout && layout[pieceName]) {
      return layout[pieceName];
    }
    return (
      LPC_PIECE_SLICES[pieceName] ?? LPC_PIECE_SLICES.B ?? LPC_PIECE_SLICES.C ?? { sx: 0, sy: 0 }
    );
  }

  resolvePiece(grid: Uint8Array[], gx: number, gy: number, cellType: number): string {
    const H = grid.length;
    const W = grid[0]?.length ?? 0;
    const match = (x: number, y: number) => {
      if (x < 0 || x >= W || y < 0 || y >= H) return true;
      const row = grid[y];
      return row ? row[x] === cellType : true;
    };

    const n = match(gx, gy - 1);
    const s = match(gx, gy + 1);
    const w = match(gx - 1, gy);
    const e = match(gx + 1, gy);

    if (n && s && w && e) {
      const nw = match(gx - 1, gy - 1);
      const ne = match(gx + 1, gy - 1);
      const sw = match(gx - 1, gy + 1);
      const se = match(gx + 1, gy + 1);
      if (!nw && ne && sw && se) return 'ITL';
      if (nw && !ne && sw && se) return 'ITR';
      if (nw && ne && !sw && se) return 'IBL';
      if (nw && ne && sw && !se) return 'IBR';
      return 'C';
    }

    if (!n && s && w && e) return 'T';
    if (n && !s && w && e) return 'B';
    if (n && s && !w && e) return 'L';
    if (n && s && w && !e) return 'R';

    if (!n && !w && s && e) return 'TL';
    if (!n && !e && s && w) return 'TR';
    if (!s && !w && n && e) return 'BL';
    if (!s && !e && n && w) return 'BR';

    if (n && s && !w && !e) return 'L';
    if (!n && !s && w && e) return 'T';

    if (n && !s && !w && !e) return 'B';
    if (!n && s && !w && !e) return 'T';
    if (!n && !s && w && !e) return 'R';
    if (!n && !s && !w && e) return 'L';

    return 'B';
  }

  drawRmxpAutotile(
    ctx: CanvasRenderingContext2D,
    autotileImg: HTMLImageElement,
    grid: Uint8Array[],
    gx: number,
    gy: number,
    dx: number,
    dy: number,
    cellType: number
  ): void {
    const s = resolveRmxpSubtiles(grid, gx, gy, cellType);
    const sz = RMXP_SUBTILE_SIZE;
    ctx.drawImage(autotileImg, s.tl.sx, s.tl.sy, sz, sz, dx, dy, sz, sz);
    ctx.drawImage(autotileImg, s.tr.sx, s.tr.sy, sz, sz, dx + sz, dy, sz, sz);
    ctx.drawImage(autotileImg, s.bl.sx, s.bl.sy, sz, sz, dx, dy + sz, sz, sz);
    ctx.drawImage(autotileImg, s.br.sx, s.br.sy, sz, sz, dx + sz, dy + sz, sz, sz);
  }

  drawTile(
    ctx: CanvasRenderingContext2D,
    grid: Uint8Array[],
    gx: number,
    gy: number,
    dx: number,
    dy: number,
    elevation?: Uint8Array[]
  ): void {
    const row = grid[gy];
    const cell = row ? row[gx] : CELL_BIOME.GRASS;
    const T = KANTO_TILE_SIZE;

    // Base Grass under non-water, non-mountain terrain (prefer authentic GBA grass metatile)
    const gbaBaseGrass =
      this.loader.getImage('poke_grass_plain.png') ||
      this.loader.getImage('poke_grass.png') ||
      this.loader.getImage('poke_grass_pallet.png');
    if (cell !== CELL_BIOME.WATER && cell !== CELL_BIOME.MOUNTAIN_DIRT) {
      if (cell === CELL_BIOME.FOREST_WALL) {
        const forestGrass = this.loader.getImage('poke_forest_grass.png') || gbaBaseGrass;
        if (forestGrass) {
          ctx.drawImage(forestGrass, 0, 0, forestGrass.width, forestGrass.height, dx, dy, T, T);
        } else {
          ctx.fillStyle = '#488848';
          ctx.fillRect(dx, dy, T, T);
        }
      } else if (gbaBaseGrass) {
        ctx.drawImage(gbaBaseGrass, 0, 0, gbaBaseGrass.width, gbaBaseGrass.height, dx, dy, T, T);
      } else {
        ctx.fillStyle = '#58a858';
        ctx.fillRect(dx, dy, T, T);
      }
    }

    if (cell === CELL_BIOME.GRASS || cell === CELL_BIOME.FOREST_WALL) {
      return;
    }

    // 1. Pokémon Essentials RMXP Autotiles for continuous ground textures (dirt path, stone plaza, tall grass)
    if (cell === CELL_BIOME.DIRT_PATH || cell === CELL_BIOME.BRIDGE) {
      const pathAt = this.loader.getImage('autotile_dirt_path.png');
      if (pathAt) {
        this.drawRmxpAutotile(ctx, pathAt, grid, gx, gy, dx, dy, cell);
        return;
      }
    } else if (cell === CELL_BIOME.PLAZA_STONE) {
      const plazaAt = this.loader.getImage('autotile_plaza_stone.png');
      if (plazaAt) {
        this.drawRmxpAutotile(ctx, plazaAt, grid, gx, gy, dx, dy, CELL_BIOME.PLAZA_STONE);
        return;
      }
    } else if (cell === CELL_BIOME.TALL_GRASS) {
      const grassAt = this.loader.getImage('autotile_tall_grass.png');
      if (grassAt) {
        this.drawRmxpAutotile(ctx, grassAt, grid, gx, gy, dx, dy, CELL_BIOME.TALL_GRASS);
        return;
      }
    }

    // 2. Authentic GBA FireRed Water & Shorelines (indivisible 32x32 metatiles with 8-direction bitmask)
    if (cell === CELL_BIOME.WATER) {
      const H = grid.length;
      const W = grid[0]?.length ?? 0;
      const isWater = (x: number, y: number): boolean => {
        if (x < 0 || x >= W || y < 0 || y >= H) return true;
        return grid[y]?.[x] === CELL_BIOME.WATER;
      };

      const n = isWater(gx, gy - 1);
      const s = isWater(gx, gy + 1);
      const w = isWater(gx - 1, gy);
      const e = isWater(gx + 1, gy);

      // Base grass underneath shore tiles so transparency blends naturally with surrounding terrain
      if (!n || !s || !w || !e) {
        if (gbaBaseGrass) {
          ctx.drawImage(gbaBaseGrass, 0, 0, gbaBaseGrass.width, gbaBaseGrass.height, dx, dy, T, T);
        } else {
          ctx.fillStyle = '#58a858';
          ctx.fillRect(dx, dy, T, T);
        }
      }

      let waterImg: HTMLImageElement | undefined;

      // Outer Corners (cardinal land borders)
      if (!n && !w) waterImg = this.loader.getImage('poke_water_shore_tl.png');
      else if (!n && !e) waterImg = this.loader.getImage('poke_water_shore_tr.png');
      else if (!s && !w) waterImg = this.loader.getImage('poke_water_shore_bl.png');
      else if (!s && !e) waterImg = this.loader.getImage('poke_water_shore_br.png');
      // Straight Shores (single cardinal land border)
      else if (!n) waterImg = this.loader.getImage('poke_water_shore_t.png');
      else if (!s) waterImg = this.loader.getImage('poke_water_shore_b.png');
      else if (!w) waterImg = this.loader.getImage('poke_water_shore_l.png');
      else if (!e) waterImg = this.loader.getImage('poke_water_shore_r.png');
      // Concave Inner Corners (all 4 cardinal are water, but diagonal is land)
      else {
        const nw = isWater(gx - 1, gy - 1);
        const ne = isWater(gx + 1, gy - 1);
        const sw = isWater(gx - 1, gy + 1);
        const se = isWater(gx + 1, gy + 1);

        if (!nw) waterImg = this.loader.getImage('poke_water_inner_tl.png');
        else if (!ne) waterImg = this.loader.getImage('poke_water_inner_tr.png');
        else if (!sw) waterImg = this.loader.getImage('poke_water_inner_bl.png');
        else if (!se) waterImg = this.loader.getImage('poke_water_inner_br.png');
        else {
          // Deep ocean center water
          waterImg =
            this.loader.getImage('poke_water_deep.png') ||
            this.loader.getImage('poke_water_calm.png');
        }
      }

      if (waterImg) {
        ctx.drawImage(waterImg, 0, 0, waterImg.width, waterImg.height, dx, dy, T, T);
      } else {
        ctx.fillStyle = '#12759e';
        ctx.fillRect(dx, dy, T, T);
      }
      return;
    }

    // 3. Authentic GBA FireRed Mountain Cliffs (Canonical Plateau from firered_tileset_2.png)
    if (cell === CELL_BIOME.MOUNTAIN_DIRT) {
      const res = this.resolveMountainTile(grid, gx, gy, elevation);

      // Base plateau rock underlay for mountain cells (never green grass)
      const baseRockImg =
        this.loader.getImage(`poke_cliff_${res.pal}_plateau_rock.png`) ||
        this.loader.getImage(`poke_cliff_${res.pal}_plateau.png`);
      if (baseRockImg) {
        ctx.drawImage(baseRockImg, 0, 0, baseRockImg.width, baseRockImg.height, dx, dy, T, T);
      } else {
        ctx.fillStyle = res.pal === 'gray' ? '#64748b' : '#8c5938';
        ctx.fillRect(dx, dy, T, T);
      }

      if (res.underlayImage) {
        const uImg = this.loader.getImage(res.underlayImage) || baseRockImg;
        if (uImg) {
          ctx.drawImage(uImg, 0, 0, uImg.width, uImg.height, dx, dy, T, T);
        }
      }

      const pImg =
        this.loader.getImage(res.primaryImage) ||
        baseRockImg ||
        this.loader.getImage(`poke_cliff_cone_${res.pal}.png`);
      if (pImg) {
        ctx.drawImage(pImg, 0, 0, pImg.width, pImg.height, dx, dy, T, T);
      }

      if (res.overlayImages) {
        for (const ovName of res.overlayImages) {
          const ovImg = this.loader.getImage(ovName);
          if (ovImg) {
            ctx.drawImage(ovImg, 0, 0, ovImg.width, ovImg.height, dx, dy, T, T);
          }
        }
      }
      return;
    }

    let sheetName: string | null = null;
    switch (cell) {
      case CELL_BIOME.DIRT_PATH:
        sheetName = 'dirt.png';
        break;
      case CELL_BIOME.TALL_GRASS: {
        const tallGrassImg = this.loader.getImage('poke_tall_grass.png');
        if (tallGrassImg) {
          ctx.drawImage(tallGrassImg, 0, 0, tallGrassImg.width, tallGrassImg.height, dx, dy, T, T);
          return;
        }
        sheetName = 'grassalt.png';
        break;
      }
      case CELL_BIOME.LAVA:
        sheetName = 'lava.png';
        break;
      case CELL_BIOME.PLAZA_STONE:
        sheetName = 'stone_plaza.png';
        break;
      case CELL_BIOME.BRIDGE:
        sheetName = 'dirt.png';
        break;
    }

    if (!sheetName) return;
    const sheetImg = this.loader.getImage(sheetName);
    if (!sheetImg) {
      if (cell === CELL_BIOME.DIRT_PATH || cell === CELL_BIOME.BRIDGE) {
        ctx.fillStyle = '#bc9052';
        ctx.fillRect(dx, dy, T, T);
      } else if (cell === CELL_BIOME.PLAZA_STONE) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(dx, dy, T, T);
      } else if (cell === CELL_BIOME.TALL_GRASS) {
        ctx.fillStyle = '#1e5f32';
        ctx.fillRect(dx, dy, T, T);
      }
      return;
    }

    const piece = this.resolvePiece(grid, gx, gy, cell ?? 0);
    const slice = this.getPieceSlice(piece);
    ctx.drawImage(sheetImg, slice.sx, slice.sy, T, T, dx, dy, T, T);
  }
}
