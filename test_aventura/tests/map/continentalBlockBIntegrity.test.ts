/**
 * test_aventura/tests/map/continentalBlockBIntegrity.test.ts
 *
 * TIER 1 & TIER 2 VERIFICATION SUITE (BLOCK B - END OF CLONES & ORGANIC ARCHITECTURE):
 * Verifies across ALL map sizes (128x128, 256x256, 400x400):
 *   1. City morphological diversity: distinct street skeletons, rotated building slots, varied sizes & >=3 roadMaterials.
 *   2. Internal urban walkability: Pokecenter, Pokemart & Gym doorsteps connect seamlessly via internalStreets.
 *   3. Organic dungeon_forest: no rectangular corral fences, non-uniform tree silhouette, North<->South walkable labyrinth.
 *   4. Balanced continental centering (no massive empty ocean void at top edge) & exterior open-ocean port_dock placement.
 */

import { describe, it, expect } from 'vitest';

import { buildBuildingProtectionMask } from '../../logic/map/autotileDefectScanner.ts';
import { collectStandingDepthEntities } from '../../logic/map/canvasDepthEntityCollector.ts';
import { generatePokemonContinentalWorld } from '../../logic/map/continent/continentalEngine.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';
import type { POINode, UrbanBuildingPlacement } from '../../types/map/poiTypes.ts';

function computeBuildingQuadrantSignature(
  poi: POINode,
  buildings: readonly UrbanBuildingPlacement[]
): string {
  const cx = poi.gridX + poi.footprint.width / 2;
  const cy = poi.gridY + poi.footprint.height / 2;
  const slots = new Map<string, string>();
  for (const b of buildings) {
    if (b.type === 'checkpoint_gate') continue;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const ns = by < cy ? 'N' : 'S';
    const ew = bx < cx ? 'W' : 'E';
    const q = `${ns}${ew}`;
    const prev = slots.get(q);
    slots.set(q, prev ? `${prev}+${b.type}` : b.type);
  }
  return ['NW', 'NE', 'SW', 'SE'].map((q) => `${q}:${slots.get(q) ?? 'none'}`).join('|');
}

function classifyStreetGeometry(poi: POINode): string {
  const streets = poi.urbanLayout?.internalStreets ?? [];
  if (streets.length === 0) return 'empty';
  const bx = poi.gridX;
  const by = poi.gridY;
  const W = poi.footprint.width;
  const H = poi.footprint.height;
  const midX = bx + Math.floor(W / 2);
  const midY = by + Math.floor(H / 2);

  let touchN = 0;
  let touchS = 0;
  let touchW = 0;
  let touchE = 0;
  let perimeterRingHits = 0;
  let centerCrossHits = 0;

  for (const s of streets) {
    if (s.y === by) touchN++;
    if (s.y === by + H - 1) touchS++;
    if (s.x === bx) touchW++;
    if (s.x === bx + W - 1) touchE++;
    if (s.x === bx + 2 || s.x === bx + W - 3 || s.y === by + 2 || s.y === by + H - 3) {
      perimeterRingHits++;
    }
    if (Math.abs(s.x - midX) <= 1 && Math.abs(s.y - midY) <= 1) {
      centerCrossHits++;
    }
  }

  return `cross=${centerCrossHits > 0 ? 1 : 0}_ring=${perimeterRingHits > W ? 1 : 0}_edges=${Number(touchN > 0)}${Number(touchS > 0)}${Number(touchW > 0)}${Number(touchE > 0)}`;
}

function findDisconnectedUrbanService(poi: POINode): string | null {
  const layout = poi.urbanLayout;
  if (!layout || layout.buildings.length < 2) return null;
  const streetKeys = new Set(layout.internalStreets.map((s) => `${s.x}_${s.y}`));
  const plazaKeys = new Set(layout.pavedPlazaCells.map((p) => `${p.x}_${p.y}`));
  const buildingKeys = new Set<string>();
  for (const b of layout.buildings) {
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        buildingKeys.add(`${b.x + dx}_${b.y + dy}`);
      }
    }
  }

  const isWalkable = (x: number, y: number): boolean =>
    !buildingKeys.has(`${x}_${y}`) && (streetKeys.has(`${x}_${y}`) || plazaKeys.has(`${x}_${y}`));

  const startBuilding =
    layout.buildings.find((b) => b.type === 'pokecenter') ?? layout.buildings[0]!;
  const start = { x: startBuilding.doorX, y: startBuilding.doorY + 1 };
  const visited = new Set<string>([`${start.x}_${start.y}`]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++]!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx}_${ny}`;
      if (visited.has(key) || !isWalkable(nx, ny)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  for (const b of layout.buildings) {
    if (b.type === 'pokecenter' || b.type === 'pokemart' || b.type === 'gym') {
      const doorFront = `${b.doorX}_${b.doorY + 1}`;
      if (!visited.has(doorFront)) {
        return `${poi.id}(${poi.footprint.width}x${poi.footprint.height}, start=${startBuilding.id}@${start.x},${start.y} walkStart=${isWalkable(start.x, start.y)}): ${b.id} front ${doorFront} walk=${isWalkable(b.doorX, b.doorY + 1)} unreached`;
      }
    }
  }
  return null;
}

describe.each([
  { label: '128x128', width: 128, height: 128, seed: 42 },
  { label: '256x256', width: 256, height: 256, seed: 42 },
  { label: '400x400', width: 400, height: 400, seed: 42 }
])('Continental & Regional Block B Integrity ($label, seed $seed)', ({ width, height, seed }) => {
  const result = executeRegionalGenerationJob({ width, height, seed });

  it('prevents cloned city layouts and guarantees diverse roadMaterials, slots, and connectivity', () => {
    const cities = result.pois.filter((p) => p.type === 'city');
    expect(cities.length).toBeGreaterThanOrEqual(2);

    const quadrantSignatures = new Set<string>();
    const combinedSignatures = new Set<string>();
    const streetMorphologies = new Set<string>();
    const sizeSignatures = new Set<string>();
    const roadMaterials = new Set<string>();

    for (const poi of result.pois) {
      if (poi.urbanLayout?.roadMaterial) {
        roadMaterials.add(poi.urbanLayout.roadMaterial);
      }
    }

    for (const city of cities) {
      expect(city.urbanLayout).toBeDefined();
      expect(findDisconnectedUrbanService(city)).toBeNull();

      const qSig = computeBuildingQuadrantSignature(city, city.urbanLayout!.buildings);
      const sMorph = classifyStreetGeometry(city);
      const sz = `${city.footprint.width}x${city.footprint.height}`;
      const mat = city.urbanLayout!.roadMaterial ?? 'none';

      quadrantSignatures.add(qSig);
      streetMorphologies.add(sMorph);
      sizeSignatures.add(sz);
      combinedSignatures.add(`${sz}::${qSig}::${sMorph}::${mat}`);
    }

    // Never allow all cities to follow the exact same NW=center NE=mart SW=gym quadrant recipe
    const spaciousCities = cities.filter((c) => c.footprint.width >= 16);
    const minDistinctQuadrants =
      spaciousCities.length >= 4 && width >= 256 ? 3 : Math.min(cities.length, 2);
    expect(quadrantSignatures.size).toBeGreaterThanOrEqual(minDistinctQuadrants);
    expect(streetMorphologies.size).toBeGreaterThanOrEqual(2);
    expect(combinedSignatures.size).toBeGreaterThanOrEqual(Math.min(cities.length, 4));
    expect(roadMaterials.size).toBeGreaterThanOrEqual(3);

    if (width >= 400) {
      expect(sizeSignatures.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('renders organic dungeon_forest without rectangular corral fences and maintains N-S labyrinth path', () => {
    const forests = result.pois.filter((p) => p.type === 'dungeon_forest');
    expect(forests.length).toBeGreaterThanOrEqual(1);

    const H = result.continent.height;
    const W = result.continent.width;
    const buildingMask = buildBuildingProtectionMask(W, H, result.pois);
    const entities = collectStandingDepthEntities({
      continent: result.continent,
      pois: result.pois,
      wilderness: result.wilderness,
      buildingFootprintMask: buildingMask,
      unifiedPathGrid: result.routeNetwork.pathGrid,
      bridgeGrid: result.routeNetwork.bridgeGrid
    });

    for (const forest of forests) {
      // 1. No long rectangular corral rows of fences around dungeon_forest
      const fenceProps = (forest.urbanLayout?.props ?? []).filter(
        (p) => p.type === 'fence_h' || p.type === 'fence_v' || p.prefabFile.includes('fence')
      );
      expect(fenceProps.length).toBeLessThanOrEqual(4);

      // 2. Labyrinth walkability: South gate front reaches North gate front along internalStreets
      if (forest.footprint.width >= 16 && forest.footprint.height >= 16) {
        const streets = forest.urbanLayout?.internalStreets ?? [];
        expect(streets.length).toBeGreaterThan(forest.footprint.height);
        const streetSet = new Set(streets.map((s) => `${s.x}_${s.y}`));
        const gates =
          forest.urbanLayout?.buildings.filter((b) => b.type === 'checkpoint_gate') ?? [];
        expect(gates).toHaveLength(2);
        const sortedGates = [...gates].sort((a, b) => a.y - b.y);
        const northGate = sortedGates[0]!;
        const southGate = sortedGates[1]!;

        const startX = southGate.doorX;
        const startY = southGate.y - 1;
        const targetY = northGate.y + northGate.height;

        const visited = new Set<string>([`${startX}_${startY}`]);
        const q: { x: number; y: number }[] = [{ x: startX, y: startY }];
        let reachedNorth = false;
        let head = 0;
        while (head < q.length) {
          const cur = q[head++]!;
          if (cur.y <= targetY && Math.abs(cur.x - northGate.doorX) <= 1) {
            reachedNorth = true;
            break;
          }
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ] as const) {
            const key = `${cur.x + dx}_${cur.y + dy}`;
            if (!visited.has(key) && streetSet.has(key)) {
              visited.add(key);
              q.push({ x: cur.x + dx, y: cur.y + dy });
            }
          }
        }
        expect(reachedNorth).toBe(true);
      }

      // 3. Organic silhouette & varied tree species inside dungeon_forest (not a uniform 2x2 rectangular block)
      const forestTrees = entities.filter((e) => {
        if (!e.file.includes('tree_')) return false;
        const gx = Math.round(e.px / 32);
        const gy = Math.round(e.py / 32);
        return (
          gx >= forest.gridX - 1 &&
          gx <= forest.gridX + forest.footprint.width + 1 &&
          gy >= forest.gridY - 2 &&
          gy <= forest.gridY + forest.footprint.height + 1
        );
      });
      expect(forestTrees.length).toBeGreaterThanOrEqual(8);

      const distinctTreeAssets = new Set(forestTrees.map((t) => t.file));
      expect(distinctTreeAssets.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe.each([42, 100, 7741])(
  'Continental Landmass Centering & Open-Ocean Seaport (400x400, seed %i)',
  (seed) => {
    const world = generatePokemonContinentalWorld({
      width: 400,
      height: 400,
      seed
    });

    it('balances continental landmass vertically without huge top ocean void', () => {
      const H = world.continent.height;
      const W = world.continent.width;
      let minLandY = H;
      let maxLandY = 0;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const t = world.continent.terrainMatrix[y]?.[x];
          if (t && t !== 'water' && t !== 'water_deep') {
            if (y < minLandY) minLandY = y;
            if (y > maxLandY) maxLandY = y;
          }
        }
      }

      const topVoid = minLandY;
      const bottomVoid = H - 1 - maxLandY;
      expect(topVoid).toBeLessThanOrEqual(Math.round(H * 0.2));
      expect(Math.abs(topVoid - bottomVoid)).toBeLessThanOrEqual(Math.round(H * 0.16));
    });

    it('places the primary port_dock facing exterior open ocean rather than a closed inland basin', () => {
      const port = world.pois.find((p) => p.type === 'port_dock');
      expect(port).toBeDefined();
      if (!port) return;

      // No terrestrial urban settlement should lie directly south of port_dock blocking open ocean access
      const blockingSouthSettlements = world.pois.filter(
        (p) =>
          p.id !== port.id &&
          p.type !== 'water_landmark' &&
          p.type !== 'port_dock' &&
          p.gridY >= port.gridY + port.footprint.height &&
          p.gridX < port.gridX + port.footprint.width + 6 &&
          p.gridX + p.footprint.width > port.gridX - 6
      );
      expect(blockingSouthSettlements).toEqual([]);

      // Ocean BFS from just outside the pier must reach map border cleanly
      const H = world.continent.height;
      const W = world.continent.width;
      const startX = port.gridX + Math.floor(port.footprint.width / 2);
      const startY = Math.min(H - 1, port.gridY + port.footprint.height + 5);
      const visited = new Set<string>();
      const queue: { x: number; y: number }[] = [];

      for (let sy = startY; sy < H; sy++) {
        const t = world.continent.terrainMatrix[sy]?.[startX];
        if ((t === 'water' || t === 'water_deep') && !world.bridgeGrid[sy]?.[startX]) {
          queue.push({ x: startX, y: sy });
          visited.add(`${startX}_${sy}`);
          break;
        }
      }
      expect(queue.length).toBeGreaterThan(0);

      let reachedBorder = false;
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++]!;
        if (cur.x === 0 || cur.x === W - 1 || cur.y === 0 || cur.y === H - 1) {
          reachedBorder = true;
          break;
        }
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ] as const) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const key = `${nx}_${ny}`;
          if (visited.has(key)) continue;
          const t = world.continent.terrainMatrix[ny]?.[nx];
          if (t === 'water' || t === 'water_deep') {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      expect(reachedBorder).toBe(true);
    });
  }
);
