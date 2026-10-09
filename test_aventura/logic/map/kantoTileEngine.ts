// Kanto Tile & Prefab Rendering Engine - LPC Autotiling & Semantic Prefabs

import {
  KANTO_TILE_SIZE,
  KANTO_CHUNK_PX,
  KANTO_GRID_W,
  KANTO_GRID_H,
  KANTO_CHUNKS_X,
  KANTO_CHUNKS_Y,
  CELL_BIOME
} from './kantoRegionalGenerator.ts';

export interface CatalogPart {
  readonly sheet: string;
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
  readonly dx: number;
  readonly dy: number;
  readonly zIndex?: number;
}

export interface CatalogPrefab {
  readonly id: string;
  readonly name?: string;
  readonly width?: number;
  readonly height?: number;
  readonly parts: readonly CatalogPart[];
}

export interface CatalogAutotileLayout {
  readonly pieces: Record<string, { sx: number; sy: number }>;
}

export interface SemanticTileCatalog {
  readonly version: string;
  readonly tileSize: number;
  readonly sheets: Record<string, { file: string; width: number; height: number }>;
  readonly prefabs?: Record<string, Record<string, CatalogPrefab>>;
  readonly autotileLayout?: {
    standardLPC?: CatalogAutotileLayout;
  };
}

export interface PlacedStructure {
  readonly style: string;
  readonly x: number;
  readonly y: number;
  readonly w?: number;
  readonly h?: number;
}

import { type MountainPalette } from './mountainAutotileEngine.ts';
export type { MountainPalette };

export interface MountainTileResolution {
  readonly primaryImage: string;
  readonly underlayImage?: string;
  readonly overlayImages?: readonly string[];
  readonly pal: MountainPalette;
  readonly isRockTier: boolean;
}

export class DynamicCatalogLoader {
  catalog: SemanticTileCatalog | null = null;
  readonly images = new Map<string, HTMLImageElement>();
  private _isLoaded = false;

  get isLoaded(): boolean {
    return this._isLoaded;
  }

  reset(): void {
    this._isLoaded = false;
    this.images.clear();
  }

  async init(basePath = '/assets/tiles/'): Promise<void> {
    if (this._isLoaded) return;

    try {
      const res = await fetch('/assets/studio/kanto/tile_catalog.json');
      if (!res.ok) throw new Error(`HTTP error loading catalog: ${res.status}`);
      this.catalog = (await res.json()) as SemanticTileCatalog;
    } catch {
      this.catalog = {
        version: '5.0',
        tileSize: 32,
        sheets: {
          'grass.png': { file: 'grass.png', width: 96, height: 192 },
          'dirt.png': { file: 'dirt.png', width: 96, height: 192 },
          'watergrass.png': { file: 'watergrass.png', width: 96, height: 192 },
          'stone_plaza.png': { file: 'stone_plaza.png', width: 96, height: 192 }
        }
      };
    }

    if (typeof Image === 'undefined') {
      this._isLoaded = true;
      return;
    }

    const sheetFiles = new Set<string>(Object.keys(this.catalog.sheets || {}));

    // Ingest essentials or prefabs manifest if available
    try {
      let pRes = await fetch('/assets/essentials/manifest.json');
      if (!pRes.ok) pRes = await fetch('/assets/prefabs/manifest.json');
      if (!pRes.ok) pRes = await fetch('/assets/studio/kanto/prefabs/manifest.json');
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData?.autotiles && Array.isArray(pData.autotiles)) {
          for (const at of pData.autotiles) sheetFiles.add(at);
        }
        if (pData?.prefabs && Array.isArray(pData.prefabs)) {
          for (const item of pData.prefabs) {
            if (item.file_path) sheetFiles.add(item.file_path);
            if (item.id) {
              sheetFiles.add(item.id);
              sheetFiles.add(`${item.id}.png`);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    if (this.catalog.prefabs) {
      for (const group of Object.values(this.catalog.prefabs)) {
        for (const prefab of Object.values(group)) {
          if (prefab.parts) {
            for (const part of prefab.parts) {
              if (part.sheet) sheetFiles.add(part.sheet);
            }
          }
        }
      }
    }

    const essentialsAutotiles = [
      'autotile_water.png', 'autotile_pond.png', 'autotile_dirt_path.png',
      'autotile_plaza_stone.png', 'autotile_cliff_mountain.png', 'autotile_tall_grass.png',
      'autotile_cliff_brown.png', 'autotile_cliff_gray.png'
    ] as const;
    essentialsAutotiles.forEach((at) => sheetFiles.add(at));

    const knownSprites = [
      'lab_oak.png', 'house_red.png', 'house_blue.png', 'house_green.png', 'house_orange.png', 'house_purple.png',
      'gym.png', 'gym_gold.png', 'pokecenter.png', 'pokemart.png', 'silph_tower.png', 'pokemon_league.png',
      'power_plant.png', 'game_corner.png', 'mansion_school.png', 'house_teal_bungalow.png',
      'pewter_museum.png', 'house_pewter_slate.png', 'gatehouse_route.png',
      'poke_tree_poke.png', 'tree_poke.png', 'poke_tree_pine_small.png', 'tree_pine_small.png',
      'poke_tree_oak_clean.png', 'tree_oak_clean.png', 'tree_viridian_forest.png', 'poke_forest_grass.png',
      'poke_tree_oak_yellow.png', 'poke_tree_sapling.png', 'poke_bench_concrete_white.png', 'poke_flower_pot_circular.png',
      'poke_snorlax.png', 'snorlax.png', 'poke_tree_cuttable.png', 'tree_cuttable.png',
      'poke_street_lamp.png', 'street_lamp.png', 'poke_fence_picket.png', 'fence_picket.png',
      'poke_flowers_red.png', 'flowers_red.png', 'poke_mailbox.png', 'mailbox.png',
      'poke_signpost.png', 'signpost.png', 'poke_sign.png',
      'poke_cycling_railing.png', 'poke_ledge_jump.png', 'poke_ledge_left.png', 'poke_ledge_mid.png', 'poke_ledge_right.png',
      'poke_diglett.png', 'diglett.png',
      'poke_mountain_dirt.png', 'poke_mountain_dirt_gray.png', 'poke_cliff_gray_face.png', 'poke_cliff_brown_face.png',
      'poke_cliff_plateau_rock.png', 'poke_cliff_face_vertical.png', 'poke_cliff_rim_north.png',
      'poke_cliff_edge_left.png', 'poke_cliff_corner_bl.png', 'poke_cliff_corner_br.png',
      'poke_tall_grass.png', 'poke_dirt_path.png', 'stone_plaza.png', 'poke_stone_plaza.png', 'poke_grass_plain.png',
      'poke_forest_canopy_mid.png', 'poke_forest_canopy_top.png', 'poke_forest_trunk_base.png',
      'poke_forest_wall_vleft.png', 'poke_forest_wall_vright.png',
      'poke_cliff_cone_brown.png', 'poke_cliff_cone_gray.png', 'poke_boardwalk_planks.png',
      'poke_cliff_brown_top.png', 'poke_cliff_gray_top.png',
      'poke_cliff_brown_left.png', 'poke_cliff_gray_left.png',
      'poke_cliff_brown_right.png', 'poke_cliff_gray_right.png',
      'poke_cliff_brown_corner_bl.png', 'poke_cliff_gray_corner_bl.png',
      'poke_cliff_brown_corner_br.png', 'poke_cliff_gray_corner_br.png',
      'poke_cliff_brown_corner_tl.png', 'poke_cliff_gray_corner_tl.png',
      'poke_cliff_brown_corner_tr.png', 'poke_cliff_gray_corner_tr.png',
      'poke_cliff_brown_inner_tl.png', 'poke_cliff_brown_inner_tr.png',
      'poke_cliff_brown_inner_bl.png', 'poke_cliff_brown_inner_br.png',
      'poke_cliff_gray_inner_tl.png', 'poke_cliff_gray_inner_tr.png',
      'poke_cliff_gray_inner_bl.png', 'poke_cliff_gray_inner_br.png',
      'poke_cliff_brown_plateau_rock.png', 'poke_cliff_gray_plateau_rock.png',
      'poke_cliff_brown_rock_top.png', 'poke_cliff_gray_rock_top.png',
      'poke_cliff_brown_rock_left.png', 'poke_cliff_gray_rock_left.png',
      'poke_cliff_brown_rock_right.png', 'poke_cliff_gray_rock_right.png',
      'poke_cliff_brown_rock_face.png', 'poke_cliff_gray_rock_face.png',
      'poke_cliff_brown_rock_corner_bl.png', 'poke_cliff_gray_rock_corner_bl.png',
      'poke_cliff_brown_rock_corner_br.png', 'poke_cliff_gray_rock_corner_br.png',
      'poke_cliff_brown_rock_corner_tl.png', 'poke_cliff_gray_rock_corner_tl.png',
      'poke_cliff_brown_rock_corner_tr.png', 'poke_cliff_gray_rock_corner_tr.png',
      'poke_cliff_brown_rock_inner_tl.png', 'poke_cliff_gray_rock_inner_tl.png',
      'poke_cliff_brown_rock_inner_tr.png', 'poke_cliff_gray_rock_inner_tr.png',
      'poke_cliff_brown_rock_inner_bl.png', 'poke_cliff_gray_rock_inner_bl.png',
      'poke_cliff_brown_rock_inner_br.png', 'poke_cliff_gray_rock_inner_br.png',
      'poke_cliff_brown_rock_plateau.png', 'poke_cliff_gray_rock_plateau.png',
      'poke_cliff_brown_peak.png', 'poke_cliff_gray_peak.png',
      'poke_cave_entrance_brown.png', 'poke_cave_entrance_gray.png',
      'poke_boulder_brown.png', 'poke_boulder_gray.png',
      'poke_cliff_ridge_brown_long.png', 'poke_cliff_ridge_brown_mid.png',
      'poke_cliff_canyon_wall_h.png', 'poke_cliff_canyon_stairs.png',
      'poke_cliff_canyon_corner_br.png', 'poke_cliff_canyon_corner_bl.png',
      'poke_cliff_canyon_corner_tl.png', 'poke_mountain_ancient_shrine.png',
      'poke_cliff_brown_stairs_l.png', 'poke_cliff_brown_stairs_r.png',
      'poke_cliff_gray_stairs_l.png', 'poke_cliff_gray_stairs_r.png',
      'poke_water_deep.png', 'poke_water_calm.png', 'poke_water_rock_foam.png',
      'poke_water_shore_tl.png', 'poke_water_shore_t.png', 'poke_water_shore_tr.png',
      'poke_water_shore_l.png', 'poke_water_shore_c.png', 'poke_water_shore_r.png',
      'poke_water_shore_bl.png', 'poke_water_shore_b.png', 'poke_water_shore_br.png',
      'poke_water_inner_tl.png', 'poke_water_inner_tr.png',
      'poke_water_inner_bl.png', 'poke_water_inner_br.png',
      'poke_cave_icefall_mouth.png', 'poke_cliff_volcanic_wall_h.png',
      'poke_cliff_volcanic_slope.png'
    ] as const;
    knownSprites.forEach((s) => sheetFiles.add(s));


    const loadPromises = Array.from(sheetFiles).map((sheetFile) => {
      return new Promise<void>((resolve) => {
        const cleanName = sheetFile.replace(/^poke_/, '');
        const noExt = cleanName.replace(/\.png$/i, '');
        const candidateNames = Array.from(new Set([sheetFile, cleanName, `${noExt}.png`, `poke_${cleanName}`]));
        const tryPaths = [
          ...(sheetFile.startsWith('/') ? [sheetFile] : []),
          ...candidateNames.map((n) => `${basePath}${n}`),
          ...candidateNames.map((n) => `/assets/tiles/canonical/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/elevation/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/elevation/brown/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/elevation/gray/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/elevation/rock_tier/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/water/${n}`),
          ...candidateNames.map((n) => `/assets/tiles/terrain/${n}`),
          ...candidateNames.map((n) => `/assets/prefabs/buildings/${n}`),
          ...candidateNames.map((n) => `/assets/prefabs/vegetation/${n}`),
          ...candidateNames.map((n) => `/assets/prefabs/elevation/${n}`),
          ...candidateNames.map((n) => `/assets/essentials/autotiles/${n}`)
        ];

        let idx = 0;
        const attempt = () => {
          if (idx >= tryPaths.length) {
            resolve();
            return;
          }
          const src = tryPaths[idx++];
          if (!src) {
            attempt();
            return;
          }
          const img = new Image();
          img.onload = () => {
            this.images.set(sheetFile, img);
            this.images.set(cleanName, img);
            this.images.set(`poke_${cleanName}`, img);
            this.images.set(noExt, img);
            this.images.set(`poke_${noExt}`, img);
            resolve();
          };
          img.onerror = () => {
            attempt();
          };
          img.src = src;
        };
        attempt();
      });
    });

    await Promise.all(loadPromises);
    this._isLoaded = true;
  }

  getImage(sheetFile: string): HTMLImageElement | undefined {
    const clean = sheetFile.replace(/^poke_/, '');
    const noExt = clean.replace(/\.png$/i, '');
    return this.images.get(sheetFile)
      || this.images.get(clean)
      || this.images.get(`poke_${clean}`)
      || this.images.get(noExt)
      || this.images.get(`poke_${noExt}`)
      || this.images.get(`${noExt}.png`);
  }

  getPrefab(category: string, id: string): CatalogPrefab | undefined {
    return this.catalog?.prefabs?.[category]?.[id];
  }
}

export interface RmxpSubtilePos {
  readonly sx: number;
  readonly sy: number;
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
  if (!n && !w) tl = { sx: 0, sy: 32 };          // Outer TL
  else if (!n && w) tl = { sx: 32, sy: 32 };     // Top edge
  else if (n && !w) tl = { sx: 0, sy: 64 };      // Left edge
  else if (!nw) tl = { sx: 32, sy: 0 };          // Inner TL
  else tl = { sx: 32, sy: 64 };                  // Center TL

  // Top-Right Quadrant
  let tr: RmxpSubtilePos;
  if (!n && !e) tr = { sx: 80, sy: 32 };         // Outer TR
  else if (!n && e) tr = { sx: 48, sy: 32 };     // Top edge
  else if (n && !e) tr = { sx: 80, sy: 64 };     // Right edge
  else if (!ne) tr = { sx: 48, sy: 0 };          // Inner TR
  else tr = { sx: 48, sy: 64 };                  // Center TR

  // Bottom-Left Quadrant
  let bl: RmxpSubtilePos;
  if (!s && !w) bl = { sx: 0, sy: 112 };         // Outer BL
  else if (!s && w) bl = { sx: 32, sy: 112 };    // Bottom edge
  else if (s && !w) bl = { sx: 0, sy: 80 };      // Left edge
  else if (!sw) bl = { sx: 32, sy: 16 };         // Inner BL
  else bl = { sx: 32, sy: 80 };                  // Center BL

  // Bottom-Right Quadrant
  let br: RmxpSubtilePos;
  if (!s && !e) br = { sx: 80, sy: 112 };        // Outer BR
  else if (!s && e) br = { sx: 48, sy: 112 };    // Bottom edge
  else if (s && !e) br = { sx: 80, sy: 80 };     // Right edge
  else if (!se) br = { sx: 48, sy: 16 };         // Inner BR
  else br = { sx: 48, sy: 80 };                  // Center BR

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
    if ((gx >= 35 && gx <= 95 && gy <= 45) || (minX >= 35 && minX <= 95 && minY <= 45)) {
      pal = 'brown'; // Canonical Mt. Moon massif
    } else if (minX >= 75 && minY >= 45 && minY <= 80) {
      pal = 'brown'; // Canonical Rock Tunnel massif
    } else if (minX < 30 || minY > 100) {
      pal = 'gray'; // Canonical Indigo Plateau & Seafoam / Cinnabar
    } else {
      const hash = ((minX * 73 + minY * 37) ^ 0x5bf03635) & 0x7fffffff;
      pal = (hash % 2 === 0) ? 'brown' : 'gray';
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
      if (!w && e) return { primaryImage: `${prefix}_corner_bl.png`, underlayImage, pal, isRockTier };
      if (!e && w) return { primaryImage: `${prefix}_corner_br.png`, underlayImage, pal, isRockTier };
      return { primaryImage: `${prefix}_face.png`, underlayImage, pal, isRockTier };
    }

    if (isSouthCliffTop) {
      if (!w && e) return { primaryImage: `${prefix}_left.png`, underlayImage, pal, isRockTier };
      if (!e && w) return { primaryImage: `${prefix}_right.png`, underlayImage, pal, isRockTier };
      return { primaryImage: `${prefix}_top.png`, underlayImage, pal, isRockTier };
    }

    // 3. North Outer Corners (missing north and one lateral border)
    if (!n && !w && s && e) return { primaryImage: `${prefix}_corner_tl.png`, underlayImage, pal, isRockTier };
    if (!n && !e && s && w) return { primaryImage: `${prefix}_corner_tr.png`, underlayImage, pal, isRockTier };

    // 4. North Edge (missing north border)
    if (!n && s && w && e) return { primaryImage: `${prefix}_top.png`, underlayImage, pal, isRockTier };

    // 5. Lateral Edges (missing only left or right)
    if (!w && e && n && s) return { primaryImage: `${prefix}_left.png`, underlayImage, pal, isRockTier };
    if (!e && w && n && s) return { primaryImage: `${prefix}_right.png`, underlayImage, pal, isRockTier };

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
    const defs: Record<string, { sx: number; sy: number }> = {
      TL: { sx: 0, sy: 64 }, T: { sx: 32, sy: 64 }, TR: { sx: 64, sy: 64 },
      L: { sx: 0, sy: 96 }, C: { sx: 32, sy: 96 }, R: { sx: 64, sy: 96 },
      BL: { sx: 0, sy: 128 }, B: { sx: 32, sy: 128 }, BR: { sx: 64, sy: 128 },
      F0: { sx: 0, sy: 160 }, F1: { sx: 32, sy: 160 }, F2: { sx: 64, sy: 160 },
      ITL: { sx: 64, sy: 32 }, ITR: { sx: 32, sy: 32 },
      IBL: { sx: 64, sy: 0 }, IBR: { sx: 32, sy: 0 },
      S0: { sx: 0, sy: 0 }
    };
    return defs[pieceName] ?? defs.B ?? { sx: 32, sy: 128 };
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
    const sz = 16;
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
    const gbaBaseGrass = this.loader.getImage('poke_grass_plain.png')
      || this.loader.getImage('poke_grass.png')
      || this.loader.getImage('poke_grass_pallet.png');
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
          waterImg = this.loader.getImage('poke_water_deep.png')
            || this.loader.getImage('poke_water_calm.png');
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
      const baseRockImg = this.loader.getImage(`poke_cliff_${res.pal}_plateau_rock.png`)
        || this.loader.getImage(`poke_cliff_${res.pal}_plateau.png`);
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

      const pImg = this.loader.getImage(res.primaryImage)
        || baseRockImg
        || this.loader.getImage(`poke_cliff_cone_${res.pal}.png`);
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

export class SemanticPrefabRenderer {
  private readonly loader: DynamicCatalogLoader;

  constructor(loader: DynamicCatalogLoader) {
    this.loader = loader;
  }

  drawPrefab(ctx: CanvasRenderingContext2D, prefab: CatalogPrefab, x: number, y: number): void {
    if (!prefab?.parts) return;
    const parts = [...prefab.parts].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const part of parts) {
      const img = this.loader.getImage(part.sheet);
      if (!img) continue;
      const sx = part.sx;
      const sy = part.sy;
      let sw = part.sw;
      let sh = part.sh;
      let dw = part.sw;
      let dh = part.sh;
      if (sx === 0 && sy === 0 && (sw !== img.width || sh !== img.height)) {
        sw = img.width;
        sh = img.height;
        dw = img.width;
        dh = img.height;
      }
      ctx.drawImage(
        img,
        sx, sy, sw, sh,
        x + part.dx, y + part.dy, dw, dh
      );
    }
  }

  drawBuilding(ctx: CanvasRenderingContext2D, style: string, x: number, y: number): void {
    const directImg = this.loader.getImage(style)
      || this.loader.getImage(`${style}.png`)
      || this.loader.getImage(`poke_${style}.png`);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('buildings', style);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawBridge(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const directImg = this.loader.getImage(type);
    if (directImg) {
      ctx.drawImage(directImg, x, y, 32, 32);
      return;
    }
    const key = type === 'pier' ? 'harbor_pier' : type === 'arched' ? 'arched_bridge_h' : 'nugget_bridge';
    const prefab = this.loader.getPrefab('bridges', key);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
      return;
    }
    const fallbackImg = this.loader.getImage('poke_boardwalk_planks.png');
    if (fallbackImg) {
      ctx.drawImage(fallbackImg, x, y, 32, 32);
    } else {
      ctx.fillStyle = '#c49a52';
      ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#8f652b';
      ctx.fillRect(x, y + 7, 32, 2);
      ctx.fillRect(x, y + 15, 32, 2);
      ctx.fillRect(x, y + 23, 32, 2);
      ctx.fillRect(x, y + 31, 32, 2);
    }
  }

  drawNature(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const directImg = this.loader.getImage(type)
      || this.loader.getImage(`${type}.png`)
      || this.loader.getImage(`poke_${type}.png`)
      || (type.includes('ledge') ? this.loader.getImage('poke_ledge_mid.png') : undefined);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('nature', type) || this.loader.getPrefab('cliffs', type);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawTree(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const cleanType = type.replace(/^poke_/, '').replace(/\.png$/i, '');
    const isPine = type === 'pine' || cleanType === 'tree_pine_small';
    const treeImg = this.loader.getImage(type)
      || this.loader.getImage(`${cleanType}.png`)
      || this.loader.getImage(`poke_${cleanType}.png`)
      || (isPine
        ? this.loader.getImage('poke_tree_pine_small.png')
        : (this.loader.getImage('poke_tree_oak_clean.png')
          || this.loader.getImage('poke_tree_poke.png')));
    if (treeImg) {
      const yOffset = treeImg.height > 64 ? treeImg.height - 64 : 0;
      ctx.drawImage(treeImg, x, y - yOffset, treeImg.width, treeImg.height);
      return;
    }
    const key = isPine ? 'tree_pine_small' : 'tree_poke';
    const prefab = this.loader.getPrefab('trees', key);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }

  drawProp(ctx: CanvasRenderingContext2D, type: string, x: number, y: number): void {
    const cleanType = type.replace(/^poke_/, '').replace(/\.png$/i, '');
    const directImg = this.loader.getImage(type)
      || this.loader.getImage(`${cleanType}.png`)
      || this.loader.getImage(`poke_${cleanType}.png`)
      || (type === 'lamp' ? this.loader.getImage('poke_street_lamp.png') : undefined)
      || (type === 'flower' ? this.loader.getImage('poke_flowers_red.png') : undefined)
      || (type === 'mailbox' ? this.loader.getImage('poke_mailbox.png') : undefined)
      || (type === 'sign' || type === 'signpost' ? this.loader.getImage('poke_signpost.png') : undefined);
    if (directImg) {
      ctx.drawImage(directImg, x, y, directImg.width, directImg.height);
      return;
    }
    const prefab = this.loader.getPrefab('props', type) || this.loader.getPrefab('nature', type);
    if (prefab) {
      this.drawPrefab(ctx, prefab, x, y);
    }
  }
}

export interface IRegionalWorldRendererSource {
  readonly grid: Uint8Array[];
  readonly elevation?: Uint8Array[];
  readonly trees: PlacedStructure[];
  readonly buildings: PlacedStructure[];
  readonly bridges: PlacedStructure[];
  readonly props: PlacedStructure[];
  readonly nature: PlacedStructure[];
}

export class Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly wx: number;
  readonly wy: number;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  baked = false;

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.wx = cx * KANTO_CHUNK_PX;
    this.wy = cy * KANTO_CHUNK_PX;
  }

  bake(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource
  ): void {
    if (typeof document === 'undefined') {
      this.baked = true;
      return;
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = KANTO_CHUNK_PX;
      this.canvas.height = KANTO_CHUNK_PX;
      this.ctx = this.canvas.getContext('2d');
    }

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, KANTO_CHUNK_PX, KANTO_CHUNK_PX);

    const cL = this.wx;
    const cT = this.wy;
    const cR = cL + KANTO_CHUNK_PX;
    const cB = cT + KANTO_CHUNK_PX;

    const inBounds = (x: number, y: number, w: number, h: number) => {
      return x + w >= cL && x <= cR && y + h >= cT && y <= cB;
    };

    // Layer 1: Base Terrain Autotiles (32x32 Tiles)
    const startTileX = this.cx * (KANTO_CHUNK_PX / KANTO_TILE_SIZE);
    const startTileY = this.cy * (KANTO_CHUNK_PX / KANTO_TILE_SIZE);
    const tilesPerChunk = KANTO_CHUNK_PX / KANTO_TILE_SIZE;

    for (let ty = 0; ty < tilesPerChunk; ty++) {
      const gy = startTileY + ty;
      if (gy >= KANTO_GRID_H) break;
      const row = world.grid[gy];
      if (!row) continue;

      for (let tx = 0; tx < tilesPerChunk; tx++) {
        const gx = startTileX + tx;
        if (gx >= KANTO_GRID_W) break;

        const drawPx = tx * KANTO_TILE_SIZE;
        const drawPy = ty * KANTO_TILE_SIZE;

        autotiler.drawTile(ctx, world.grid, gx, gy, drawPx, drawPy, world.elevation);
      }
    }

    // Layer 2: Nature & Cliffs
    world.nature.forEach((n) => {
      const w = n.w ?? 64;
      const h = n.h ?? 64;
      if (inBounds(n.x, n.y, w, h)) {
        prefabRenderer.drawNature(ctx, n.style, n.x - cL, n.y - cT);
      }
    });

    // Layer 3: Bridges
    world.bridges.forEach((b) => {
      const w = b.w ?? 64;
      const h = b.h ?? 96;
      if (inBounds(b.x, b.y, w, h)) {
        prefabRenderer.drawBridge(ctx, b.style, b.x - cL, b.y - cT);
      }
    });

    // Layer 4: Buildings, Trees, and Props (Y-Sorted for Realistic Depth)
    const renderables: { kind: 'bldg' | 'tree' | 'prop'; ySort: number; obj: PlacedStructure }[] = [
      ...world.buildings.map((b) => ({ kind: 'bldg' as const, ySort: b.y + (b.h ?? 60), obj: b })),
      ...world.trees.map((t) => ({ kind: 'tree' as const, ySort: t.y + 48, obj: t })),
      ...world.props.map((p) => ({ kind: 'prop' as const, ySort: p.y + (p.h ?? 32), obj: p }))
    ].sort((a, b) => a.ySort - b.ySort);

    renderables.forEach((r) => {
      if (r.kind === 'bldg') {
        if (inBounds(r.obj.x, r.obj.y, r.obj.w ?? 128, r.obj.h ?? 100)) {
          prefabRenderer.drawBuilding(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      } else if (r.kind === 'tree') {
        if (inBounds(r.obj.x, r.obj.y - 32, 64, 96)) {
          prefabRenderer.drawTree(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      } else {
        if (inBounds(r.obj.x, r.obj.y, r.obj.w ?? 64, r.obj.h ?? 64)) {
          prefabRenderer.drawProp(ctx, r.obj.style, r.obj.x - cL, r.obj.y - cT);
        }
      }
    });

    this.baked = true;
  }
}

export class ChunkManager {
  readonly chunks: Chunk[] = [];

  constructor() {
    for (let cy = 0; cy < KANTO_CHUNKS_Y; cy++) {
      for (let cx = 0; cx < KANTO_CHUNKS_X; cx++) {
        this.chunks.push(new Chunk(cx, cy));
      }
    }
  }

  bakeAll(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource
  ): void {
    this.chunks.forEach((c) => c.bake(autotiler, prefabRenderer, world));
  }

  bakeArea(
    autotiler: UniversalAutotiler,
    prefabRenderer: SemanticPrefabRenderer,
    world: IRegionalWorldRendererSource,
    tileX: number,
    tileY: number,
    size: number
  ): void {
    const minWx = Math.max(0, (tileX - 1) * KANTO_TILE_SIZE);
    const maxWx = Math.min(KANTO_GRID_W * KANTO_TILE_SIZE, (tileX + size + 1) * KANTO_TILE_SIZE);
    const minWy = Math.max(0, (tileY - 1) * KANTO_TILE_SIZE);
    const maxWy = Math.min(KANTO_GRID_H * KANTO_TILE_SIZE, (tileY + size + 1) * KANTO_TILE_SIZE);

    const minCx = Math.floor(minWx / KANTO_CHUNK_PX);
    const maxCx = Math.floor(maxWx / KANTO_CHUNK_PX);
    const minCy = Math.floor(minWy / KANTO_CHUNK_PX);
    const maxCy = Math.floor(maxWy / KANTO_CHUNK_PX);

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const chunk = this.chunks.find((c) => c.cx === cx && c.cy === cy);
        if (chunk) {
          chunk.bake(autotiler, prefabRenderer, world);
        }
      }
    }
  }

  renderTo(
    ctx: CanvasRenderingContext2D,
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
  ): void {
    for (const c of this.chunks) {
      if (
        c.wx + KANTO_CHUNK_PX < viewX ||
        c.wx > viewX + viewW ||
        c.wy + KANTO_CHUNK_PX < viewY ||
        c.wy > viewY + viewH
      ) {
        continue;
      }
      if (c.canvas && c.baked) {
        ctx.drawImage(c.canvas, c.wx, c.wy);
      }
    }
  }
}

