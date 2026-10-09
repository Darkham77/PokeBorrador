/**
 * src/logic/map/canonicalBridgeEngine.ts
 *
 * CANONICAL GBA BRIDGE & DOCK AUTOTILE ENGINE
 *
 * Single Source of Truth for generating authentic 2D boardwalk bridges,
 * piers, and maritime platforms matching Pokémon FireRed/LeafGreen
 * (Route 12 Silence Bridge, Route 24 Nugget Bridge, and Vermilion Port).
 */

import type { POINode, BridgeStyle } from '../../types/map/poiTypes.ts';

export type { BridgeStyle };

export interface BridgeBlit {
  readonly file: string;
  readonly x: number;
  readonly y: number;
  readonly zIndex?: number;
  readonly style?: BridgeStyle;
}

export interface TerrainCell {
  readonly terrain: string;
}

/**
 * Resolves all bridgeGrid cells into canonical 32x32 bridge tiles with authentic
 * plank directions, side railings, pilings, and shore transitions.
 */
export function resolveCanonicalBridges(
  bridgeGrid: readonly (readonly boolean[])[],
  terrainGrid: readonly (readonly TerrainCell[])[],
  options?: {
    readonly isWaterLandmarkCell?: (x: number, y: number) => boolean;
    readonly isPortDockCell?: (x: number, y: number) => boolean;
    readonly defaultBridgeStyle?: BridgeStyle;
    readonly getBridgeStyle?: (x: number, y: number) => BridgeStyle;
  }
): readonly BridgeBlit[] {
  const H = bridgeGrid.length;
  const W = bridgeGrid[0]?.length ?? 0;
  const blits: BridgeBlit[] = [];

  const isBridge = (cx: number, cy: number): boolean => {
    if (cy < 0 || cy >= H || cx < 0 || cx >= W) return false;
    return Boolean(bridgeGrid[cy]?.[cx]);
  };

  const isWater = (cx: number, cy: number): boolean => {
    if (cy < 0 || cy >= H || cx < 0 || cx >= W) return true;
    const t = terrainGrid[cy]?.[cx]?.terrain;
    return t === 'water' || t === 'water_deep';
  };

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (!isBridge(c, r)) continue;

      if (options?.isWaterLandmarkCell && options.isWaterLandmarkCell(c, r)) {
        // Handled by water landmark platform resolution
        continue;
      }

      const hasN = isBridge(c, r - 1);
      const hasS = isBridge(c, r + 1);
      const hasW = isBridge(c - 1, r);
      const hasE = isBridge(c + 1, r);

      // Prune isolated 1x1 bridge cells with zero connectivity
      if (!hasN && !hasS && !hasW && !hasE) continue;

      // A side is exposed to water if there is no bridge neighbor AND the adjacent cell is water.
      // (If the neighbor is land, it is a shore landing transit entrance/exit).
      const exposedWaterN = !hasN && isWater(c, r - 1);
      const exposedWaterS = !hasS && isWater(c, r + 1);
      const exposedWaterW = !hasW && isWater(c - 1, r);
      const exposedWaterE = !hasE && isWater(c + 1, r);

      // Compute total span along horizontal and vertical lines through (c, r) including land shore connections
      let hSpan = 1;
      let curX = c - 1;
      while (isBridge(curX, r)) { hSpan++; curX--; }
      if (!isWater(curX, r)) hSpan++; // connects to West shore
      curX = c + 1;
      while (isBridge(curX, r)) { hSpan++; curX++; }
      if (!isWater(curX, r)) hSpan++; // connects to East shore

      let vSpan = 1;
      let curY = r - 1;
      while (isBridge(c, curY)) { vSpan++; curY--; }
      if (!isWater(c, curY)) vSpan++; // connects to North shore
      curY = r + 1;
      while (isBridge(c, curY)) { vSpan++; curY++; }
      if (!isWater(c, curY)) vSpan++; // connects to South shore

      // Canonical Vermilion Port Stone Pier (Authentic 3-cell wide corridor)
      if (options?.isPortDockCell && options.isPortDockCell(c, r)) {
        let pierFile: string;
        if (hSpan > vSpan) {
          // Horizontal pier (East/West)
          if (!hasN) {
            pierFile = 'poke_port_pier_h_top.png';
          } else if (!hasS) {
            pierFile = 'poke_port_pier_h_bot.png';
          } else {
            pierFile = 'poke_port_pier_h_mid.png';
          }
        } else {
          // Vertical pier (North/South)
          if (!hasW) {
            pierFile = 'poke_port_pier_v_left.png';
          } else if (!hasE) {
            pierFile = 'poke_port_pier_v_right.png';
          } else {
            pierFile = 'poke_port_pier_v_mid.png';
          }
        }

        blits.push({ file: pierFile, x: c, y: r, zIndex: 3 });
        continue;
      }

      let tileFile = 'poke_bridge_v_mid.png';

      // 0. Single-sided fishing balconies (attached to bridge on exactly 1 side, 3 sides exposed to water)
      if (exposedWaterN && exposedWaterS && exposedWaterE && hasW) {
        tileFile = 'poke_bridge_deck_e.png';
      } else if (exposedWaterN && exposedWaterS && exposedWaterW && hasE) {
        tileFile = 'poke_bridge_deck_w.png';
      } else if (exposedWaterN && exposedWaterW && exposedWaterE && hasS) {
        tileFile = 'poke_bridge_deck_platform.png';
      } else if (exposedWaterS && exposedWaterW && exposedWaterE && hasN) {
        tileFile = 'poke_bridge_deck_platform.png';
      }
      // 1. Narrow 1-cell bridges without lateral neighbors
      else if (!hasN && !hasS && hSpan > vSpan) {
        tileFile = 'poke_bridge_h_single.png';
      } else if (!hasW && !hasE && vSpan > hSpan) {
        tileFile = 'poke_bridge_v_mid.png';
      }
      // 2. Square Platform / Symmetric Junction (hSpan === vSpan)
      else if (hSpan === vSpan) {
        if (!hasN && !hasW) {
          tileFile = 'poke_bridge_corner_turn_nw.png';
        } else if (!hasN && !hasE) {
          tileFile = 'poke_bridge_corner_turn_ne.png';
        } else if (!hasS && !hasW) {
          tileFile = 'poke_bridge_corner_turn_sw.png';
        } else if (!hasS && !hasE) {
          tileFile = 'poke_bridge_corner_turn_se.png';
        } else if (!hasN) {
          tileFile = 'poke_bridge_h_top.png';
        } else if (!hasS) {
          tileFile = 'poke_bridge_h_bot.png';
        } else if (!hasW) {
          tileFile = 'poke_bridge_v_left.png';
        } else if (!hasE) {
          tileFile = 'poke_bridge_v_right.png';
        } else {
          tileFile = 'poke_bridge_v_mid.png';
        }
      }
      // 3. Predominantly Vertical Bridges (vSpan >= hSpan)
      else if (vSpan >= hSpan) {
        // Lateral flanks: West edge is ALWAYS left railing, East edge is ALWAYS right railing
        if (!hasW && !hasE) {
          tileFile = 'poke_bridge_v_mid.png';
        } else if (!hasW) {
          tileFile = 'poke_bridge_v_left.png';
        } else if (!hasE) {
          tileFile = 'poke_bridge_v_right.png';
        } else {
          // Center column
          tileFile = 'poke_bridge_v_mid.png';
        }
      }
      // 4. Predominantly Horizontal Bridges (hSpan > vSpan)
      else {
        // Lateral flanks: North edge is ALWAYS top beam, South edge is ALWAYS bottom pilings
        if (!hasN && !hasS) {
          tileFile = 'poke_bridge_h_single.png';
        } else if (!hasN) {
          tileFile = 'poke_bridge_h_top.png';
        } else if (!hasS) {
          tileFile = hasN ? 'poke_bridge_h_bot.png' : 'poke_bridge_h_single.png';
        } else {
          // Center row
          tileFile = 'poke_bridge_h_mid.png';
        }
      }

      blits.push({
        file: tileFile,
        x: c,
        y: r,
        zIndex: 3
      });
    }
  }

  return blits;
}

/**
 * Resolves an authentic contoured maritime pier/platform around a POI (e.g. lighthouse or fishing cottage)
 * with perimeter railings/pilings facing water and open connection to incoming bridges.
 */
export function resolveWaterLandmarkPlatform(
  poi: POINode,
  terrainGrid: readonly (readonly TerrainCell[])[],
  connectingBridges?: ReadonlySet<string>
): readonly BridgeBlit[] {
  const H = terrainGrid.length;
  const W = terrainGrid[0]?.length ?? 0;
  const blits: BridgeBlit[] = [];

  // Pier bounds snugly wrapping the building with a 1-tile walking boardwalk border
  const minX = Math.max(0, poi.gridX - 1);
  const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width);
  const minY = Math.max(0, poi.gridY - 1);
  const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height);

  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      const isTop = cy === minY;
      const isBot = cy === maxY;
      const isLeft = cx === minX;
      const isRight = cx === maxX;

      // Check if this cell connects to an incoming bridge
      const isBridgeConn = Boolean(connectingBridges?.has(`${cx}_${cy}`));

      let plankFile = 'poke_bridge_deck_platform.png';

      if (!isBridgeConn) {
        if (isTop && isLeft) plankFile = 'poke_bridge_corner_turn_nw.png';
        else if (isTop && isRight) plankFile = 'poke_bridge_corner_turn_ne.png';
        else if (isBot && isLeft) plankFile = 'poke_bridge_corner_turn_sw.png';
        else if (isBot && isRight) plankFile = 'poke_bridge_corner_turn_se.png';
        else if (isTop) plankFile = 'poke_bridge_h_top.png';
        else if (isBot) plankFile = 'poke_bridge_h_bot.png';
        else if (isLeft) plankFile = 'poke_bridge_v_left.png';
        else if (isRight) plankFile = 'poke_bridge_v_right.png';
      }

      blits.push({
        file: plankFile,
        x: cx,
        y: cy,
        zIndex: 2
      });
    }
  }

  return blits;
}