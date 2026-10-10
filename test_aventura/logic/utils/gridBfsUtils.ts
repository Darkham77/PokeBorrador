/**
 * src/logic/utils/gridBfsUtils.ts
 *
 * 2D Grid Multi-Source BFS Distance Field Helper.
 * Computes 4-cardinal step distances across discrete map grids.
 */

export interface GridBfsQueueItem {
  readonly x: number;
  readonly y: number;
  readonly d: number;
}

export function computeGridDistanceField(
  queue: GridBfsQueueItem[],
  dist: number[][],
  width: number,
  height: number,
  maxDistance = Infinity,
  isBlocked?: (x: number, y: number) => boolean
): void {
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    if (curr.d >= maxDistance) continue;

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (isBlocked && isBlocked(nx, ny)) continue;
        if (dist[ny]![nx]! > curr.d + 1) {
          dist[ny]![nx] = curr.d + 1;
          queue.push({ x: nx, y: ny, d: curr.d + 1 });
        }
      }
    }
  }
}
