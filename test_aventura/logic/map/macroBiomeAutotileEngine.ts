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

import {
  compute2DNeighborMask,
  classify2DAutotileRole,
  getTileForRole,
  CANONICAL_SAND_BEACH_BRUSH,
  type WaterCoastBrushSet,
  type WaterAutotileRole,
  type WaterTerrainKind
} from './waterAutotileEngine.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';

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

export const CANONICAL_ARID_DESERT_BRUSH: Readonly<WaterCoastBrushSet> = CANONICAL_SAND_BEACH_BRUSH;

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
export function getBrushForMacroBiome(biome: MacroBiome): WaterCoastBrushSet | null { // result-ok: Estructura o identificador procedural de aventura
  switch (biome) {
    case 'mint_highland':
      return CANONICAL_MINT_GRASS_BRUSH;
    case 'arid_desert':
      return CANONICAL_ARID_DESERT_BRUSH;
    case 'volcanic_plateau':
      return CANONICAL_VOLCANIC_DIRT_BRUSH;
    default:
      return null;
  }
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
  const primaryTiles: string[][] = Array.from({ length: H }, () => // no-domain: Estructura o identificador procedural de aventura
    Array(W).fill('poke_grass_plain.png') // no-domain: Estructura o identificador procedural de aventura
  );

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terrain = terrainMatrix[y]?.[x];
      // Water and coastal beach sand are handled exclusively by waterAutotileEngine
      if (terrain === 'water' || terrain === 'water_deep' || terrain === 'sand') {
        continue;
      }

      const isElevated = Boolean(heightmap && (heightmap[y]?.[x] ?? 0) > 0);

      const biome = biomeGrid[y]?.[x];
      if (!biome) continue;

      const brush = getBrushForMacroBiome(biome);
      if (!brush) {
        // Baseline meadow or woodland: standard plain grass
        continue;
      }

      // Foreign mask: neighboring cells that do not share this specific biome or are non-grass
      const foreignMask = compute2DNeighborMask(
        biomeGrid,
        x,
        y,
        (nBiome, nx, ny) => {
          const nTerrain = terrainMatrix[ny]?.[nx];
          if (nTerrain !== 'grass') return true;
          // If neighbor shares the same biome, it is never foreign (even if elevated)
          if (nBiome === biome) return false;
          return true;
        },
        false
      );

      const { role, innerOverlays } = classify2DAutotileRole(foreignMask);
      const primaryTile = getTileForRole(brush, role);
      const overlayTiles: string[] = innerOverlays.map((r) => getTileForRole(brush, r)); // no-domain: Estructura o identificador procedural de aventura

      const layerStack: string[] = ['poke_grass_plain.png']; // no-domain: Estructura o identificador procedural de aventura
      if (role.startsWith('corner_inner')) {
        layerStack.push(brush.center);
      }
      layerStack.push(primaryTile);
      if (overlayTiles.length > 0) {
        layerStack.push(...overlayTiles);
      }

      const cell: ResolvedMacroBiomeCell = {
        x,
        y,
        biome,
        role,
        primaryTile,
        overlayTiles: overlayTiles.length > 0 ? overlayTiles : undefined,
        layerStack
      };

      cellDetails[y]![x] = cell;
      if (!isElevated) {
        primaryTiles[y]![x] = primaryTile;
      }
    }
  }

  return {
    width: W,
    height: H,
    primaryTiles,
    cellDetails
  };
}
