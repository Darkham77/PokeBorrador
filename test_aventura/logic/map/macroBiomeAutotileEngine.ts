/**
 * src/logic/map/macroBiomeAutotileEngine.ts
 *
 * MACRO BIOME 8-NEIGHBOR AUTOTILING ENGINE
 *
 * Provides organic, pixel-perfect GBA FireRed autotiling for regional macro biomes:
 *   1. 'mint_highland': CANONICAL_MINT_GRASS_BRUSH against temperate plains.
 *   2. 'arid_desert': CANONICAL_ARID_DESERT_BRUSH (canonical sand) against temperate plains.
 *   3. 'volcanic_plateau': CANONICAL_VOLCANIC_DIRT_BRUSH against temperate plains.
 *   4. Strict Layer Stacking: ['poke_grass_plain.png', primaryTile, ...overlayTiles].
 *   5. Coastal sand and water protection (leaves coastal beaches to waterAutotileEngine).
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import { clampDirtyBounds } from '../utils/gridGeometryUtils.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import {
  compute2DNeighborMask,
  classify2DAutotileRole,
  getTileForRole,
  CANONICAL_SAND_BEACH_BRUSH,
  type WaterCoastBrushSet,
  type WaterAutotileRole,
  type WaterTerrainKind
} from './waterAutotileEngine.ts';

const CANONICAL_PLAIN_GRASS_TILE = 'poke_grass_plain.png' as const;

export const CANONICAL_MINT_GRASS_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_grass_mint_center.png',
  edgeNorth: 'poke_grass_mint_edge_n.png',
  edgeSouth: 'poke_grass_mint_edge_s.png',
  edgeWest: 'poke_grass_mint_edge_w.png',
  edgeEast: 'poke_grass_mint_edge_e.png',
  cornerOuterNW: 'poke_grass_mint_corner_outer_nw.png',
  cornerOuterNE: 'poke_grass_mint_corner_outer_ne.png',
  cornerOuterSW: 'poke_grass_mint_corner_outer_sw.png',
  cornerOuterSE: 'poke_grass_mint_corner_outer_se.png',
  cornerInnerNW: 'poke_grass_mint_corner_inner_nw.png',
  cornerInnerNE: 'poke_grass_mint_corner_inner_ne.png',
  cornerInnerSW: 'poke_grass_mint_corner_inner_sw.png',
  cornerInnerSE: 'poke_grass_mint_corner_inner_se.png'
};

const EXCLUDED_AQUATIC_TERRAIN_LIST = ['water', 'water_deep', 'sand'] as const;
type ExcludedAquaticTerrain = (typeof EXCLUDED_AQUATIC_TERRAIN_LIST)[number];
const EXCLUDED_AQUATIC_TERRAINS: ReadonlySet<ExcludedAquaticTerrain> =
  new Set<ExcludedAquaticTerrain>(EXCLUDED_AQUATIC_TERRAIN_LIST);

export const CANONICAL_VOLCANIC_DIRT_BRUSH: Readonly<WaterCoastBrushSet> = {
  center: 'poke_mountain_dirt_center.png',
  edgeNorth: 'poke_mountain_dirt_edge_n.png',
  edgeSouth: 'poke_mountain_dirt_edge_s.png',
  edgeWest: 'poke_mountain_dirt_edge_w.png',
  edgeEast: 'poke_mountain_dirt_edge_e.png',
  cornerOuterNW: 'poke_mountain_dirt_corner_outer_nw.png',
  cornerOuterNE: 'poke_mountain_dirt_corner_outer_ne.png',
  cornerOuterSW: 'poke_mountain_dirt_corner_outer_sw.png',
  cornerOuterSE: 'poke_mountain_dirt_corner_outer_se.png',
  cornerInnerNW: 'poke_mountain_dirt_corner_inner_nw.png',
  cornerInnerNE: 'poke_mountain_dirt_corner_inner_ne.png',
  cornerInnerSW: 'poke_mountain_dirt_corner_inner_sw.png',
  cornerInnerSE: 'poke_mountain_dirt_corner_inner_se.png'
};

export interface ResolvedMacroBiomeCell {
  readonly x: number;
  readonly y: number;
  readonly biome: MacroBiome;
  readonly role: WaterAutotileRole;
  readonly primaryTile: string;
  readonly overlayTiles?: readonly string[];
  readonly layerStack: readonly string[];
}

export interface ResolvedMacroBiomeMapResult {
  readonly width: number;
  readonly height: number;
  readonly primaryTiles: readonly (readonly string[])[];
  readonly cellDetails: readonly (readonly (ResolvedMacroBiomeCell | null)[])[];
}

/**
 * Maps a macro biome to its canonical 13-tile autotile brush set.
 */
function getBrushForMacroBiome(biome: MacroBiome): WaterCoastBrushSet | null {
  // result-ok: Estructura o identificador procedural de aventura
  switch (biome) {
    case 'mint_highland':
      return CANONICAL_MINT_GRASS_BRUSH;
    case 'arid_desert':
      return CANONICAL_SAND_BEACH_BRUSH;
    case 'volcanic_plateau':
      return CANONICAL_VOLCANIC_DIRT_BRUSH;
    default:
      return null;
  }
}

function resolveSingleMacroBiomeCell(
  biomeGrid: readonly (readonly MacroBiome[])[],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  heightmap: readonly (readonly number[])[] | undefined,
  x: number,
  y: number
): { readonly detail: ResolvedMacroBiomeCell | null; readonly primaryTile: string } {
  const terrain = terrainMatrix[y]?.[x];
  if (terrain && EXCLUDED_AQUATIC_TERRAINS.has(terrain as ExcludedAquaticTerrain)) {
    return { detail: null, primaryTile: CANONICAL_PLAIN_GRASS_TILE };
  }

  const isElevated = Boolean(heightmap && (heightmap[y]?.[x] ?? 0) > 0);
  const biome = biomeGrid[y]?.[x];
  if (!biome) {
    return { detail: null, primaryTile: CANONICAL_PLAIN_GRASS_TILE };
  }

  const brush = getBrushForMacroBiome(biome);
  if (!brush) {
    return { detail: null, primaryTile: CANONICAL_PLAIN_GRASS_TILE };
  }

  const foreignMask = compute2DNeighborMask(
    biomeGrid,
    x,
    y,
    (nBiome, nx, ny) => {
      const nTerrain = terrainMatrix[ny]?.[nx];
      // Arid desert uses the same yellow sand brush as coastal sand; join them smoothly without drawing an interior grass-rimmed seam.
      if (biome === 'arid_desert' && nTerrain === 'sand') return false;
      if (nTerrain !== 'grass') return true;
      return nBiome !== biome;
    },
    false
  );

  const { role, innerOverlays } = classify2DAutotileRole(foreignMask);
  const primaryTile = getTileForRole(brush, role);
  const overlayTiles = innerOverlays.map((r) => getTileForRole(brush, r));

  const layerStack = [
    CANONICAL_PLAIN_GRASS_TILE,
    ...(role.startsWith('corner_inner') ? [brush.center] : []),
    primaryTile,
    ...overlayTiles
  ];

  const detail: ResolvedMacroBiomeCell = {
    x,
    y,
    biome,
    role,
    primaryTile,
    overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
    layerStack
  };

  return {
    detail,
    primaryTile: isElevated ? CANONICAL_PLAIN_GRASS_TILE : primaryTile
  };
}

/**
 * Resolves 8-neighbor autotiling for all macro-biome land cells on the continent.
 */
export function resolveMacroBiomeAutotile(
  biomeGrid: readonly (readonly MacroBiome[])[],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  heightmap?: readonly (readonly number[])[]
): ResolvedMacroBiomeMapResult {
  const H = biomeGrid.length;
  if (H === 0) return { width: 0, height: 0, primaryTiles: [], cellDetails: [] };
  const W = biomeGrid[0]?.length ?? 0;
  if (W === 0) return { width: 0, height: 0, primaryTiles: [], cellDetails: [] };

  const cellDetails: (ResolvedMacroBiomeCell | null)[][] = Array.from({ length: H }, () =>
    Array(W).fill(null)
  );
  const primaryTiles = Array.from(
    { length: H },
    () =>
      // no-domain: Estructura o identificador procedural de aventura
      Array(W).fill('poke_grass_plain.png') // no-domain: Estructura o identificador procedural de aventura
  );

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const resolved = resolveSingleMacroBiomeCell(biomeGrid, terrainMatrix, heightmap, x, y);
      cellDetails[y]![x] = resolved.detail;
      primaryTiles[y]![x] = resolved.primaryTile;
    }
  }

  return {
    width: W,
    height: H,
    primaryTiles,
    cellDetails
  };
}

/**
 * Incrementally resolves macro-biome autotile rows inside `bounds` via row Copy-on-Write.
 */
export function resolveMacroBiomeAutotileInBounds(
  base: ResolvedMacroBiomeMapResult,
  biomeGrid: readonly (readonly MacroBiome[])[],
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  bounds: DirtyTileBounds,
  heightmap?: readonly (readonly number[])[]
): ResolvedMacroBiomeMapResult {
  const H = biomeGrid.length;
  const W = biomeGrid[0]?.length ?? 0;
  if (H === 0 || W === 0) return base;

  const clamped = clampDirtyBounds(bounds, W, H);
  const nextPrimaryTiles: string[][] = base.primaryTiles.map((row) => row as string[]);
  const nextCellDetails: (ResolvedMacroBiomeCell | null)[][] = base.cellDetails.map(
    (row) => row as (ResolvedMacroBiomeCell | null)[]
  );

  for (let y = clamped.minY; y <= clamped.maxY; y++) {
    const primaryRow = [...(nextPrimaryTiles[y] ?? [])];
    const detailRow = [...(nextCellDetails[y] ?? [])];
    for (let x = clamped.minX; x <= clamped.maxX; x++) {
      const resolved = resolveSingleMacroBiomeCell(biomeGrid, terrainMatrix, heightmap, x, y);
      primaryRow[x] = resolved.primaryTile;
      detailRow[x] = resolved.detail;
    }
    nextPrimaryTiles[y] = primaryRow;
    nextCellDetails[y] = detailRow;
  }

  return {
    width: W,
    height: H,
    primaryTiles: nextPrimaryTiles,
    cellDetails: nextCellDetails
  };
}
