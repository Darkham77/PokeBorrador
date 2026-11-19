/**
 * src/logic/map/canonicalBridgeEngine.ts
 *
 * CANONICAL GBA BRIDGE & DOCK AUTOTILE ENGINE
 *
 * Single Source of Truth for generating authentic 2D boardwalk bridges,
 * piers, and maritime platforms matching Pokémon FireRed/LeafGreen
 * (Route 12 Silence Bridge, Route 24 Nugget Bridge, and Vermilion Port).
 */

import type { DirtyTileBounds } from '../../types/map/autotileHealingTypes.ts';
import type { POINode, BridgeStyle } from '../../types/map/poiTypes.ts';
import { clampDirtyBounds } from '../utils/gridGeometryUtils.ts';

export type { BridgeStyle };

export interface BridgeBlit {
  readonly file: string;
  readonly x: number;
  readonly y: number;
  readonly layerIndex?: number;
  readonly style?: BridgeStyle;
}

export interface TerrainCell {
  readonly terrain: string;
}

export interface PierNeighborAdjacencies {
  hasN: boolean;
  hasS: boolean;
  hasW: boolean;
  hasE: boolean;
}

export interface BridgeGridLookup {
  readonly isBridge: (x: number, y: number) => boolean;
  readonly isWater: (x: number, y: number) => boolean;
}

/**
 * Validates that a 1-cell protrusion is an authentic single-sided fishing balcony
 * anchored to a >=2-cell trunk continuation and exposed to open water on all 3 free sides.
 */
export function isValidFishingBalcony(lookup: BridgeGridLookup, x: number, y: number): boolean {
  const { isBridge, isWater } = lookup;
  if (!isBridge(x, y) || !isWater(x, y)) return false;

  const hasN = isBridge(x, y - 1);
  const hasS = isBridge(x, y + 1);
  const hasW = isBridge(x - 1, y);
  const hasE = isBridge(x + 1, y);
  const bridgeCount = (hasN ? 1 : 0) + (hasS ? 1 : 0) + (hasW ? 1 : 0) + (hasE ? 1 : 0);
  if (bridgeCount !== 1) return false;

  if (!hasN && !isWater(x, y - 1)) return false;
  if (!hasS && !isWater(x, y + 1)) return false;
  if (!hasW && !isWater(x - 1, y)) return false;
  if (!hasE && !isWater(x + 1, y)) return false;

  if (hasW) return isBridge(x - 1, y - 1) && isBridge(x - 1, y + 1) && isBridge(x - 2, y);
  if (hasE) return isBridge(x + 1, y - 1) && isBridge(x + 1, y + 1) && isBridge(x + 2, y);
  if (hasS) return isBridge(x - 1, y + 1) && isBridge(x + 1, y + 1) && isBridge(x, y + 2);
  return isBridge(x - 1, y - 1) && isBridge(x + 1, y - 1) && isBridge(x, y - 2);
}

type ResolvedBridgePaletteKey = BridgeStyle | 'default_boardwalk';

interface BridgeStyleTilePalette {
  readonly hTop: string;
  readonly hMid: string;
  readonly hBot: string;
  readonly hBotOpen?: string;
  readonly hSingle: string;
  readonly vLeft: string;
  readonly vMid: string;
  readonly vRight: string;
  readonly deckPlatform: string;
  readonly deckE: string;
  readonly deckW: string;
  readonly cornerNW: string;
  readonly cornerNE: string;
  readonly cornerSW: string;
  readonly cornerSE: string;
}

const BRIDGE_STYLE_TILE_PALETTES: Readonly<
  Record<Exclude<ResolvedBridgePaletteKey, 'stone_pier'>, BridgeStyleTilePalette>
> = {
  default_boardwalk: {
    hTop: 'poke_bridge_h_top.png',
    hMid: 'poke_bridge_h_mid.png',
    hBot: 'poke_bridge_h_bot.png',
    hSingle: 'poke_bridge_h_single.png',
    vLeft: 'poke_bridge_v_left.png',
    vMid: 'poke_bridge_v_mid.png',
    vRight: 'poke_bridge_v_right.png',
    deckPlatform: 'poke_bridge_deck_platform.png',
    deckE: 'poke_bridge_deck_e.png',
    deckW: 'poke_bridge_deck_w.png',
    cornerNW: 'poke_bridge_corner_turn_nw.png',
    cornerNE: 'poke_bridge_corner_turn_ne.png',
    cornerSW: 'poke_bridge_corner_turn_sw.png',
    cornerSE: 'poke_bridge_corner_turn_se.png'
  },
  silence_wood: {
    hTop: 'poke_bridge_silence_h_top.png',
    hMid: 'poke_bridge_silence_h_mid.png',
    hBot: 'poke_bridge_silence_h_bot.png',
    hBotOpen: 'poke_bridge_silence_h_bot_open.png',
    hSingle: 'poke_bridge_silence_h_top.png',
    vLeft: 'poke_bridge_silence_v_left.png',
    vMid: 'poke_bridge_silence_v_mid.png',
    vRight: 'poke_bridge_silence_v_right.png',
    deckPlatform: 'poke_bridge_silence_deck_platform.png',
    deckE: 'poke_bridge_silence_deck_platform.png',
    deckW: 'poke_bridge_silence_deck_platform.png',
    cornerNW: 'poke_bridge_silence_turn_nw.png',
    cornerNE: 'poke_bridge_silence_turn_ne.png',
    cornerSW: 'poke_bridge_silence_turn_sw.png',
    cornerSE: 'poke_bridge_silence_turn_se.png'
  },
  golden_wood: {
    hTop: 'poke_bridge_golden_h_top.png',
    hMid: 'poke_bridge_golden_h_mid.png',
    hBot: 'poke_bridge_golden_h_bot.png',
    hSingle: 'poke_bridge_golden_h_top.png',
    vLeft: 'poke_bridge_v_left.png',
    vMid: 'poke_bridge_v_mid.png',
    vRight: 'poke_bridge_v_right.png',
    deckPlatform: 'poke_bridge_deck_platform.png',
    deckE: 'poke_bridge_deck_e.png',
    deckW: 'poke_bridge_deck_w.png',
    cornerNW: 'poke_bridge_golden_turn_nw.png',
    cornerNE: 'poke_bridge_golden_turn_ne.png',
    cornerSW: 'poke_bridge_golden_turn_sw.png',
    cornerSE: 'poke_bridge_golden_turn_se.png'
  }
};

interface BridgeTileSelectionInput {
  readonly lookup: BridgeGridLookup;
  readonly x: number;
  readonly y: number;
  readonly hSpan: number;
  readonly vSpan: number;
  readonly adj: PierNeighborAdjacencies;
  readonly paletteKey: Exclude<ResolvedBridgePaletteKey, 'stone_pier'>;
}

function getContinuousHorizontalBridgeRun(lookup: BridgeGridLookup, x: number, y: number): number {
  if (!lookup.isBridge(x, y)) return 0;
  let run = 1;
  for (let lx = x - 1; lookup.isBridge(lx, y); lx--) run++;
  for (let rx = x + 1; lookup.isBridge(rx, y); rx++) run++;
  return run;
}

function selectSymmetricJunctionTile(
  { hasN, hasS, hasW, hasE }: PierNeighborAdjacencies,
  palette: BridgeStyleTilePalette
): string {
  if (!hasN && !hasW) return palette.cornerNW;
  if (!hasN && !hasE) return palette.cornerNE;
  if (!hasS && !hasW) return palette.cornerSW;
  if (!hasS && !hasE) return palette.cornerSE;
  if (!hasN) return palette.hTop;
  if (!hasS) return palette.hBot;
  if (!hasW) return palette.vLeft;
  if (!hasE) return palette.vRight;
  return palette.vMid;
}

function selectCanonicalBridgeTileFile(input: BridgeTileSelectionInput): string {
  const { lookup, x, y, hSpan, vSpan, adj, paletteKey } = input;
  const { hasN, hasS, hasW, hasE } = adj;
  const palette = BRIDGE_STYLE_TILE_PALETTES[paletteKey];

  if (isValidFishingBalcony(lookup, x, y)) {
    if (hasW) return palette.deckE;
    if (hasE) return palette.deckW;
    return palette.deckPlatform;
  }

  // Keep continuous 2-row horizontal bridge beams unbroken across L-turns and zig-zag junctions
  if (paletteKey !== 'default_boardwalk') {
    const curH = getContinuousHorizontalBridgeRun(lookup, x, y);
    if (curH >= 3) {
      const northH = getContinuousHorizontalBridgeRun(lookup, x, y - 1);
      const southH = getContinuousHorizontalBridgeRun(lookup, x, y + 1);
      if (southH >= 3 && northH < 3) return palette.hTop;
      if (northH >= 3 && southH < 3) {
        return hasS && palette.hBotOpen ? palette.hBotOpen : palette.hBot;
      }
    }
  }

  if (!hasN && !hasS && hSpan > vSpan) return palette.hSingle;
  if (!hasW && !hasE && vSpan > hSpan) return palette.deckPlatform;
  if (hSpan === vSpan) return selectSymmetricJunctionTile(adj, palette);

  if (vSpan >= hSpan) {
    if (!hasW && !hasE) return palette.deckPlatform;
    if (!hasW) return palette.vLeft;
    if (!hasE) return palette.vRight;
    return palette.vMid;
  }

  if (!hasN && !hasS) return palette.hSingle;
  if (!hasN) return palette.hTop;
  if (!hasS) return hasS && palette.hBotOpen ? palette.hBotOpen : palette.hBot;
  return palette.hMid;
}

function resolvePortDockPierTile(
  hSpan: number,
  vSpan: number,
  adjacencies: PierNeighborAdjacencies
): string {
  const { hasN, hasS, hasW, hasE } = adjacencies;
  if (hSpan > vSpan) {
    if (!hasN) return 'poke_port_pier_h_top.png';
    if (!hasS) return 'poke_port_pier_h_bot.png';
    return 'poke_port_pier_h_mid.png';
  }
  if (hSpan === vSpan) {
    if (!hasN) return 'poke_port_pier_h_top.png';
    if (!hasS) return 'poke_port_pier_h_bot.png';
  }
  if (!hasW) return 'poke_port_pier_v_left.png';
  if (!hasE) return 'poke_port_pier_v_right.png';
  return 'poke_port_pier_v_mid.png';
}

function stampComponentStyleBfs(
  sKey: number,
  chosenStyle: BridgeStyle,
  bridgeGrid: readonly (readonly boolean[])[],
  W: number,
  H: number,
  visited: Uint8Array,
  componentStyle: Map<number, BridgeStyle>
): void {
  const CARDINAL_OFFSETS = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ] as const;
  const queue: number[] = [sKey];
  visited[sKey] = 1;
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i]!;
    componentStyle.set(k, chosenStyle);
    const cx = k % W;
    const cy = Math.floor(k / W);
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      const nk = ny * W + nx;
      if (!visited[nk] && bridgeGrid[ny]?.[nx]) {
        visited[nk] = 1;
        queue.push(nk);
      }
    }
  }
}

function resolveBridgeComponentStyleMap(
  bridgeGrid: readonly (readonly boolean[])[],
  W: number,
  H: number,
  getBridgeStyle: (x: number, y: number) => BridgeStyle
): Map<number, BridgeStyle> {
  const componentStyle = new Map<number, BridgeStyle>();
  const visited = new Uint8Array(W * H);

  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const sKey = sy * W + sx;
      if (visited[sKey] || !bridgeGrid[sy]?.[sx]) continue;
      stampComponentStyleBfs(
        sKey,
        getBridgeStyle(sx, sy),
        bridgeGrid,
        W,
        H,
        visited,
        componentStyle
      );
    }
  }
  return componentStyle;
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
    readonly bounds?: DirtyTileBounds;
  }
): readonly BridgeBlit[] {
  const H = bridgeGrid.length;
  const W = bridgeGrid[0]?.length ?? 0;
  const blits: BridgeBlit[] = [];
  if (H === 0 || W === 0) return blits;

  const scanBounds = options?.bounds
    ? clampDirtyBounds(options.bounds, W, H)
    : { minX: 0, minY: 0, maxX: W - 1, maxY: H - 1 };

  const isBridge = (cx: number, cy: number): boolean => {
    if (cy < 0 || cy >= H || cx < 0 || cx >= W) return false;
    return Boolean(bridgeGrid[cy]?.[cx]);
  };

  const isWater = (cx: number, cy: number): boolean => {
    if (cy < 0 || cy >= H || cx < 0 || cx >= W) return true;
    const t = terrainGrid[cy]?.[cx]?.terrain;
    return t === 'water' || t === 'water_deep';
  };

  const componentStyles = options?.getBridgeStyle
    ? resolveBridgeComponentStyleMap(bridgeGrid, W, H, options.getBridgeStyle)
    : undefined;

  for (let r = scanBounds.minY; r <= scanBounds.maxY; r++) {
    for (let c = scanBounds.minX; c <= scanBounds.maxX; c++) {
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

      // Compute total span along horizontal and vertical lines through (c, r) including land shore connections
      let hSpan = 1;
      let curX = c - 1;
      while (isBridge(curX, r)) {
        hSpan++;
        curX--;
      }
      if (!isWater(curX, r)) hSpan++; // connects to West shore
      curX = c + 1;
      while (isBridge(curX, r)) {
        hSpan++;
        curX++;
      }
      if (!isWater(curX, r)) hSpan++; // connects to East shore

      let vSpan = 1;
      let curY = r - 1;
      while (isBridge(c, curY)) {
        vSpan++;
        curY--;
      }
      if (!isWater(c, curY)) vSpan++; // connects to North shore
      curY = r + 1;
      while (isBridge(c, curY)) {
        vSpan++;
        curY++;
      }
      if (!isWater(c, curY)) vSpan++; // connects to South shore

      const resolvedStyle: ResolvedBridgePaletteKey =
        componentStyles?.get(r * W + c) ?? options?.defaultBridgeStyle ?? 'default_boardwalk';

      // Canonical Vermilion Port / Stone Pier (Authentic 3-cell wide stone deck)
      const isPortDock = Boolean(options?.isPortDockCell && options.isPortDockCell(c, r));
      if (isPortDock || resolvedStyle === 'stone_pier') {
        const pierFile = resolvePortDockPierTile(hSpan, vSpan, { hasN, hasS, hasW, hasE });
        blits.push({
          file: pierFile,
          x: c,
          y: r,
          layerIndex: 3,
          style: 'stone_pier'
        });
        continue;
      }

      const tileFile = selectCanonicalBridgeTileFile({
        lookup: { isBridge, isWater },
        x: c,
        y: r,
        hSpan,
        vSpan,
        adj: { hasN, hasS, hasW, hasE },
        paletteKey: resolvedStyle
      });

      blits.push({
        file: tileFile,
        x: c,
        y: r,
        layerIndex: 3,
        style: resolvedStyle === 'default_boardwalk' ? undefined : resolvedStyle
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
        layerIndex: 2
      });
    }
  }

  return blits;
}
