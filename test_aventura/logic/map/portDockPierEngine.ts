/**
 * test_aventura/logic/map/portDockPierEngine.ts
 *
 * Dedicated procedural pier stamper for port dock POIs.
 * Stamps 3-cell wide stone piers extending outward across water in any cardinal direction.
 */

import type { POINode } from '../../types/map/poiTypes.ts';

export interface StampPortDockPierOptions {
  readonly node: POINode;
  readonly isWaterAt: (x: number, y: number) => boolean;
  readonly bridgeGrid: boolean[][];
  readonly portDockBridgeKeys: Set<string>;
  readonly width: number;
  readonly height: number;
}

export function stampPortDockPier(options: StampPortDockPierOptions): void {
  const { node, isWaterAt, bridgeGrid, portDockBridgeKeys, width: W, height: H } = options;
  if (node.type !== 'port_dock') return;

  const facing = node.facing ?? 'south';
  const pierLength = Math.max(8, Math.max(node.footprint.width, node.footprint.height) + 2);

  if (facing === 'south') {
    const startY = node.gridY + node.footprint.height;
    const px = node.gridX + 2;
    for (let dy = 0; dy < pierLength; dy++) {
      const py = startY + dy;
      if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
        if (isWaterAt(px, py) && isWaterAt(px + 1, py) && isWaterAt(px + 2, py)) {
          bridgeGrid[py]![px] = true;
          bridgeGrid[py]![px + 1] = true;
          bridgeGrid[py]![px + 2] = true;
          portDockBridgeKeys.add(`${px}_${py}`);
          portDockBridgeKeys.add(`${px + 1}_${py}`);
          portDockBridgeKeys.add(`${px + 2}_${py}`);
        } else {
          break;
        }
      }
    }
  } else if (facing === 'north') {
    const startY = node.gridY - 1;
    const px = node.gridX + 2;
    let lastPy = startY;
    for (let dy = 0; dy < pierLength; dy++) {
      const py = startY - dy;
      if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
        if (isWaterAt(px, py) && isWaterAt(px + 1, py) && isWaterAt(px + 2, py)) {
          bridgeGrid[py]![px] = true;
          bridgeGrid[py]![px + 1] = true;
          bridgeGrid[py]![px + 2] = true;
          portDockBridgeKeys.add(`${px}_${py}`);
          portDockBridgeKeys.add(`${px + 1}_${py}`);
          portDockBridgeKeys.add(`${px + 2}_${py}`);
          lastPy = py;
        } else {
          break;
        }
      }
    }
    // T-dock landing pierhead at northern tip
    for (let r = lastPy; r <= Math.min(startY, lastPy + 1); r++) {
      for (let c = px - 2; c <= px + 4; c++) {
        if (c >= 0 && c < W && isWaterAt(c, r)) {
          bridgeGrid[r]![c] = true;
          portDockBridgeKeys.add(`${c}_${r}`);
        }
      }
    }
  } else if (facing === 'east') {
    const startX = node.gridX + node.footprint.width;
    const py = node.gridY + 2;
    for (let dx = 0; dx < pierLength; dx++) {
      const px = startX + dx;
      if (py >= 0 && py + 2 < H && px >= 0 && px < W) {
        if (isWaterAt(px, py) && isWaterAt(px, py + 1) && isWaterAt(px, py + 2)) {
          bridgeGrid[py]![px] = true;
          bridgeGrid[py + 1]![px] = true;
          bridgeGrid[py + 2]![px] = true;
          portDockBridgeKeys.add(`${px}_${py}`);
          portDockBridgeKeys.add(`${px}_${py + 1}`);
          portDockBridgeKeys.add(`${px}_${py + 2}`);
        } else {
          break;
        }
      }
    }
  } else if (facing === 'west') {
    const startX = node.gridX - 1;
    const py = node.gridY + 2;
    for (let dx = 0; dx < pierLength; dx++) {
      const px = startX - dx;
      if (py >= 0 && py + 2 < H && px >= 0 && px < W) {
        if (isWaterAt(px, py) && isWaterAt(px, py + 1) && isWaterAt(px, py + 2)) {
          bridgeGrid[py]![px] = true;
          bridgeGrid[py + 1]![px] = true;
          bridgeGrid[py + 2]![px] = true;
          portDockBridgeKeys.add(`${px}_${py}`);
          portDockBridgeKeys.add(`${px}_${py + 1}`);
          portDockBridgeKeys.add(`${px}_${py + 2}`);
        } else {
          break;
        }
      }
    }
  }
}
