// Kanto Regional World Generator - Procedural Canvas Tile/Sprite Engine (3600 x 4600 px)

import type { ProceduralGenerationConfig } from '../../types/map/adventureWorldTypes.ts';
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
import { CONTINENT_DEFAULT_SEED, MAX_PLACEMENT_SPIRAL_SEARCH_RADIUS, DEFAULT_STRUCTURE_PX_SIZE } from '../../config/studioConstants.ts';
import {
  MAX_CANONICAL_COORD_THRESHOLD,
  DEFAULT_ROAD_WIDTH,
  DEFAULT_TREE_DENSITY,
  SETTLEMENT_CLEARANCE_RADIUS_TILES,
  MIN_PLATEAU_RADIUS,
  PLATEAU_PADDING_TILES,
  MOUNTAIN_NOISE_FREQUENCY,
  MOUNTAIN_NOISE_AMPLITUDE,
  MOUNTAIN_DIST_THRESHOLD,
  HASH_MURMUR_PRIME_X,
  HASH_MURMUR_PRIME_Y,
  HASH_MURMUR_PRIME_Z,
  HASH_BIT_SHIFT_A,
  HASH_BIT_SHIFT_B,
  INT32_MASK,
  KANTO_FALLBACK_NODES,
  KANTO_PLATEAU_RANGES,
  KANTO_HYDROGRAPHY_CONFIG,
  KANTO_ROAD_CONFIG,
  KANTO_TALL_GRASS_CONFIG,
  KANTO_BRIDGES_CONFIG,
  PEWTER_PLAZA_BOUNDS,
  ROUTE_1_INFRASTRUCTURE,
  MT_MOON_INFRASTRUCTURE,
  ROUTE_1_OBSTACLE_TREES,
  VIRIDIAN_CITY_TREES,
  CANONICAL_PROP_OFFSETS,
  VIRIDIAN_FOREST_FRAMING,
  BIOME_LATITUDE_TRANSITION,
  KANTO_CANONICAL_BUILDINGS,
  KANTO_LEDGES_OFFSETS
} from '../../config/kantoRegionalConfig.ts';
import { DOOR_PATH_EXTENSION_STEPS } from '../../config/kantoCarverConfig.ts';
import { DynamicCatalogLoader } from './kantoTileEngine.ts';
import type {
  PlacedStructure,
  IRegionalWorldRendererSource
} from '../../types/map/kantoTileEngineTypes.ts';
import {
  KANTO_TILE_SIZE,
  KANTO_SPACING_MULTIPLIER,
  KANTO_GRID_W,
  KANTO_GRID_H,
  CELL_BIOME,
  OCCUPANCY_FLAGS,
  OccupancyGrid,
  type KantoNodeCoordinate,
  type IKantoCarverWorldContext
} from '../../types/map/kantoGridModel.ts';

export class KantoRegionalWorldGenerator implements IRegionalWorldRendererSource, IKantoCarverWorldContext {
  readonly loader: DynamicCatalogLoader;
  grid: Uint8Array[] = [];
  elevation: Uint8Array[] = [];
  occupancy: OccupancyGrid;
  trees: PlacedStructure[] = [];
  buildings: PlacedStructure[] = [];
  bridges: PlacedStructure[] = [];
  props: PlacedStructure[] = [];
  nature: PlacedStructure[] = [];
  seed = CONTINENT_DEFAULT_SEED;

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
    let h = (Math.imul(x, HASH_MURMUR_PRIME_X) + Math.imul(y, HASH_MURMUR_PRIME_Y) + seed) | 0;
    h = Math.imul(h ^ (h >>> HASH_BIT_SHIFT_A), HASH_MURMUR_PRIME_Z);
    return (h ^ (h >>> HASH_BIT_SHIFT_B)) | 0;
  }

  hashF(x: number, y: number, seed = 0): number {
    return ((this.hash(x, y, seed) & INT32_MASK) / INT32_MASK);
  }

  generate(
    nodes: Record<string, KantoNodeCoordinate>,
    connections: readonly (readonly [string, string])[],
    seed = CONTINENT_DEFAULT_SEED,
    config?: ProceduralGenerationConfig
  ): void {
    this.seed = seed;
    const maxCoord = Math.max(
      0,
      ...Object.values(nodes).flatMap((n) => [n.x, n.y])
    );
    this.spacingMultiplier = maxCoord > MAX_CANONICAL_COORD_THRESHOLD ? 1.0 : KANTO_SPACING_MULTIPLIER;
    fillImpenetrableWorld(this);
    this.trees = [];
    this.buildings = [];
    this.bridges = [];
    this.props = [];
    this.nature = [];

    const autoOcean = config?.autoOcean ?? true;
    const autoBuildings = config?.autoBuildings ?? true;
    const roadWidth = config?.roadWidth ?? DEFAULT_ROAD_WIDTH;
    const treeDensity = config?.treeDensity ?? DEFAULT_TREE_DENSITY;

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
      settlementTiles.some((st) => Math.hypot(st.tx - tx, st.ty - ty) < SETTLEMENT_CLEARANCE_RADIUS_TILES);

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
      const rx = Math.max(MIN_PLATEAU_RADIUS, (x1 - x0) / 2);
      const ry = Math.max(MIN_PLATEAU_RADIUS, (y1 - y0) / 2);

      const padX = Math.ceil(rx + PLATEAU_PADDING_TILES);
      const padY = Math.ceil(ry + PLATEAU_PADDING_TILES);
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
          const noise = simplex.noise2D(x * MOUNTAIN_NOISE_FREQUENCY, y * MOUNTAIN_NOISE_FREQUENCY) * MOUNTAIN_NOISE_AMPLITUDE;

          if (dist + noise <= MOUNTAIN_DIST_THRESHOLD) {
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

    const pw = nodes.pewter ? this.nodeToTile(nodes.pewter.x, nodes.pewter.y) : KANTO_FALLBACK_NODES.pewter;
    const cr = nodes.cerulean ? this.nodeToTile(nodes.cerulean.x, nodes.cerulean.y) : KANTO_FALLBACK_NODES.cerulean;
    const bh = nodes.billshouse ? this.nodeToTile(nodes.billshouse.x, nodes.billshouse.y) : KANTO_FALLBACK_NODES.billshouse;
    const rt = nodes.rocktunnel ? this.nodeToTile(nodes.rocktunnel.x, nodes.rocktunnel.y) : KANTO_FALLBACK_NODES.rocktunnel;
    const ip = nodes.indigo ? this.nodeToTile(nodes.indigo.x, nodes.indigo.y) : KANTO_FALLBACK_NODES.indigo;
    const vn = nodes.viridian ? this.nodeToTile(nodes.viridian.x, nodes.viridian.y) : KANTO_FALLBACK_NODES.viridian;
    const sf = nodes.seafoam ? this.nodeToTile(nodes.seafoam.x, nodes.seafoam.y) : KANTO_FALLBACK_NODES.seafoam;

    // 1. Indigo Plateau & Northern Mountain Range
    const ind = KANTO_PLATEAU_RANGES.indigoRange;
    raisePlateau(ind.base.minX, ip.tx + ind.base.offsetTx, ind.base.minY, ind.base.maxY, ind.base.elev);
    raisePlateau(ip.tx + ind.peak.offsetTxMin, ip.tx + ind.peak.offsetTxMax, ind.peak.minY, ind.peak.maxY, ind.peak.elev);

    // 2. Mt. Moon Northern Mountain Range & Stepped Plateau
    const mm = nodes.mtmoon ? this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y) : KANTO_FALLBACK_NODES.mtmoon;
    const mmCfg = KANTO_PLATEAU_RANGES.mtMoonMassif;
    // Main northern mountain massif (Tier 2 base, Tier 3 peak)
    raiseRectPlateau(pw.tx + mmCfg.tier2.offsetPwMin, cr.tx + mmCfg.tier2.offsetCrMax, mmCfg.tier2.minY, mm.ty + mmCfg.tier2.offsetMmTy, mmCfg.tier2.elev);
    raiseRectPlateau(pw.tx + mmCfg.tier3.offsetPwMin, cr.tx + mmCfg.tier3.offsetCrMax, mmCfg.tier3.minY, mm.ty + mmCfg.tier3.offsetMmTy, mmCfg.tier3.elev);
    raiseRectPlateau(pw.tx + mmCfg.tier4.offsetPwMin, cr.tx + mmCfg.tier4.offsetCrMax, mmCfg.tier4.minY, mm.ty + mmCfg.tier4.offsetMmTy, mmCfg.tier4.elev);
    // Western mountain bay arm framing Pokemon Center (gx: 49..52, gy: mm.ty - 4 .. mm.ty + 6)
    raiseRectPlateau(mm.tx + mmCfg.westArm.offsetMmMin, mm.tx + mmCfg.westArm.offsetMmMax, mm.ty + mmCfg.westArm.offsetMmTyMin, mm.ty + mmCfg.westArm.offsetMmTyMax, mmCfg.westArm.elev);
    // Southern ridge of Route 4 (gx: 60..70, gy: mm.ty + 10 .. mm.ty + 13)
    raiseRectPlateau(mm.tx + mmCfg.southRidge.offsetMmMin, cr.tx + mmCfg.southRidge.offsetCrMax, mm.ty + mmCfg.southRidge.offsetMmTyMin, mm.ty + mmCfg.southRidge.offsetMmTyMax, mmCfg.southRidge.elev);

    // 3. Cape Cerulean & Route 25 High Ridge (well north-east of Cerulean City)
    const ccCfg = KANTO_PLATEAU_RANGES.capeCerulean;
    raisePlateau(cr.tx + ccCfg.tier2.offsetCrMin, bh.tx + ccCfg.tier2.offsetBhMax, ccCfg.tier2.minY, ccCfg.tier2.maxY, ccCfg.tier2.elev);
    raisePlateau(cr.tx + ccCfg.tier3.offsetCrMin, bh.tx + ccCfg.tier3.offsetBhMax, ccCfg.tier3.minY, ccCfg.tier3.maxY, ccCfg.tier3.elev);

    // 4. Rock Tunnel & Route 9 Canyon Walls (well clear of Cerulean City perimeter)
    const rtCfg = KANTO_PLATEAU_RANGES.rockTunnel;
    raisePlateau(cr.tx + rtCfg.canyonNorth.offsetCrMin, rt.tx + rtCfg.canyonNorth.offsetRtMax, cr.ty + rtCfg.canyonNorth.offsetCrTyMin, cr.ty + rtCfg.canyonNorth.offsetCrTyMax, rtCfg.canyonNorth.elev);
    raisePlateau(cr.tx + rtCfg.canyonSouth.offsetCrMin, rt.tx + rtCfg.canyonSouth.offsetRtMax, cr.ty + rtCfg.canyonSouth.offsetCrTyMin, cr.ty + rtCfg.canyonSouth.offsetCrTyMax, rtCfg.canyonSouth.elev);
    raisePlateau(rt.tx + rtCfg.massifBase.offsetRtMin, rt.tx + rtCfg.massifBase.offsetRtMax, rt.ty + rtCfg.massifBase.offsetRtTyMin, rt.ty + rtCfg.massifBase.offsetRtTyMax, rtCfg.massifBase.elev);
    raisePlateau(rt.tx + rtCfg.massifPeak.offsetRtMin, rt.tx + rtCfg.massifPeak.offsetRtMax, rt.ty + rtCfg.massifPeak.offsetRtTyMin, rt.ty + rtCfg.massifPeak.offsetRtTyMax, rtCfg.massifPeak.elev);

    // 5. Route 22 Mountain Ridge (Far western boundary - completely clear of Viridian & Route 1)
    const r22 = KANTO_PLATEAU_RANGES.route22Ridge;
    raisePlateau(r22.tier2.minX, Math.max(r22.tier2.minX, vn.tx + r22.tier2.offsetVnMax), vn.ty + r22.tier2.offsetVnTyMin, vn.ty + r22.tier2.offsetVnTyMax, r22.tier2.elev);
    raisePlateau(r22.tier3.minX, Math.max(r22.tier3.minX, vn.tx + r22.tier3.offsetVnMax), vn.ty + r22.tier3.offsetVnTyMin, vn.ty + r22.tier3.offsetVnTyMax, r22.tier3.elev);

    // 6. Seafoam Islands Twin Rock Formations
    const sfCfg = KANTO_PLATEAU_RANGES.seafoamTwins;
    sfCfg.offsets.forEach((ox) => {
      raisePlateau(sf.tx + ox - sfCfg.halfExtent, sf.tx + ox + sfCfg.halfExtent, sf.ty - sfCfg.halfExtent, sf.ty + sfCfg.halfExtent, sfCfg.elev);
    });

    // 7. 2-Pass Cellular Automata smoothing to eliminate 1x1 spikes and gaps
    for (let pass = 0; pass < KANTO_PLATEAU_RANGES.smoothingPasses; pass++) {
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
          if (mtCount <= KANTO_PLATEAU_RANGES.minNeighborThreshold) {
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
          if (elev !== undefined && elev >= KANTO_HYDROGRAPHY_CONFIG.protection.maxElev) return; // Do not slice mountain cliffs
          if (x < KANTO_HYDROGRAPHY_CONFIG.protection.mtMoonMaxX && y < KANTO_HYDROGRAPHY_CONFIG.protection.mtMoonMaxY) return; // Protect Mt. Moon, Route 3, and Route 4 corridor from water
          row[x] = CELL_BIOME.WATER;
          eRow[x] = 0;
          this.occupancy.set(x, y, OCCUPANCY_FLAGS.WATER);
        }
      }
    };

    const fc = nodes.fuchsia ? this.nodeToTile(nodes.fuchsia.x, nodes.fuchsia.y) : KANTO_FALLBACK_NODES.fuchsia;
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : KANTO_FALLBACK_NODES.pallet;
    const cb = nodes.cinnabar ? this.nodeToTile(nodes.cinnabar.x, nodes.cinnabar.y) : KANTO_FALLBACK_NODES.cinnabar;
    const sf = nodes.seafoam ? this.nodeToTile(nodes.seafoam.x, nodes.seafoam.y) : KANTO_FALLBACK_NODES.seafoam;
    const cr = nodes.cerulean ? this.nodeToTile(nodes.cerulean.x, nodes.cerulean.y) : KANTO_FALLBACK_NODES.cerulean;
    const rt = nodes.rocktunnel ? this.nodeToTile(nodes.rocktunnel.x, nodes.rocktunnel.y) : KANTO_FALLBACK_NODES.rocktunnel;
    const vm = nodes.vermilion ? this.nodeToTile(nodes.vermilion.x, nodes.vermilion.y) : KANTO_FALLBACK_NODES.vermilion;

    const hy = KANTO_HYDROGRAPHY_CONFIG;

    // 1. South Ocean: Below Fuchsia down to world edge with natural wavy shoreline
    const southOceanY = fc.ty + hy.southOcean.offsetTy;
    for (let y = southOceanY; y < KANTO_GRID_H; y++) {
      for (let x = 0; x < KANTO_GRID_W; x++) {
        const wave = Math.sin(x * hy.southOcean.waveFreq) * hy.southOcean.waveAmp;
        if (y >= southOceanY + wave) {
          setWater(x, y);
        }
      }
    }

    // 2. Route 21 Channel: South of Pallet Town (SW corner) to Cinnabar
    for (let y = pt.ty + hy.route21Channel.startOffsetTy; y < southOceanY + hy.route21Channel.endOffsetTy; y++) {
      for (let x = pt.tx + hy.route21Channel.minOffsetTx; x <= pt.tx + hy.route21Channel.maxOffsetTx; x++) {
        const wobble = y > pt.ty + hy.route21Channel.wobbleThresholdTy ? Math.sin(y * hy.route21Channel.wobbleFreq) * hy.route21Channel.wobbleAmp : 0;
        const left = Math.round(pt.tx + hy.route21Channel.channelLeftOffset + wobble);
        const right = Math.round(pt.tx + hy.route21Channel.channelRightOffset + wobble);
        if (x >= left && x <= right) {
          setWater(x, y);
        }
      }
    }

    // 3. Eastern Ocean: Routes 12, 13, 14, 15 with organic coastline
    const eastOceanX = Math.max(rt.tx, hy.easternOcean.minFallbackX);
    for (let y = hy.easternOcean.startY; y < southOceanY; y++) {
      const shoreWobble = Math.sin(y * hy.easternOcean.shoreWobbleFreq) * hy.easternOcean.shoreWobbleAmp;
      for (let x = Math.round(eastOceanX + shoreWobble); x < KANTO_GRID_W; x++) {
        setWater(x, y);
      }
    }

    // 4. Vermilion Bay & S.S. Anne Harbor
    for (let y = vm.ty + hy.vermilionBay.startOffsetTy; y <= vm.ty + hy.vermilionBay.endOffsetTy; y++) {
      for (let x = vm.tx + hy.vermilionBay.minOffsetTx; x <= vm.tx + hy.vermilionBay.maxOffsetTx; x++) {
        const d = Math.hypot(x - vm.tx, y - (vm.ty + hy.vermilionBay.centerOffsetTy));
        if (d <= hy.vermilionBay.radius) setWater(x, y);
      }
    }

    // 5. Cerulean River & Nugget Bridge Canal (Route 24 & Route 9 to Power Plant)
    for (let y = hy.ceruleanRiver.minY; y <= cr.ty; y++) {
      for (let x = cr.tx + hy.ceruleanRiver.offsetTxMin; x <= cr.tx + hy.ceruleanRiver.offsetTxMax; x++) {
        setWater(x, y);
      }
    }
    // Eastward river branch along Route 9 towards Rock Tunnel & Power Plant
    for (let x = cr.tx + hy.ceruleanRiver.eastBranchOffsetTx; x < KANTO_GRID_W; x++) {
      const ry = cr.ty + hy.ceruleanRiver.eastBranchCenterDy + Math.round(Math.sin((x - cr.tx) * hy.ceruleanRiver.eastBranchFreq) * hy.ceruleanRiver.eastBranchAmp);
      for (let dy = -hy.ceruleanRiver.eastBranchHalfSpan; dy <= hy.ceruleanRiver.eastBranchHalfSpan; dy++) {
        setWater(x, ry + dy);
      }
    }

    // 6. Cinnabar Island (Organic sandy island with volcano crater)
    for (let dy = -hy.cinnabarIsland.halfDy; dy <= hy.cinnabarIsland.halfDy; dy++) {
      for (let dx = -hy.cinnabarIsland.halfDx; dx <= hy.cinnabarIsland.halfDx; dx++) {
        const tx = cb.tx + dx;
        const ty = cb.ty + dy;
        if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
          const isBorder = Math.abs(dx) >= hy.cinnabarIsland.borderMinDx || Math.abs(dy) >= hy.cinnabarIsland.borderMinDy;
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
    hy.seafoamIslands.offsets.forEach((ox) => {
      for (let dy = -hy.seafoamIslands.halfSpan; dy <= hy.seafoamIslands.halfSpan; dy++) {
        for (let dx = -hy.seafoamIslands.halfSpan; dx <= hy.seafoamIslands.halfSpan; dx++) {
          const dist = Math.hypot(dx, dy);
          const tx = sf.tx + ox + dx;
          const ty = sf.ty + dy;
          if (tx >= 0 && tx < KANTO_GRID_W && ty >= 0 && ty < KANTO_GRID_H) {
            const row = g[ty];
            const eRow = elev[ty];
            if (row && eRow && dist <= hy.seafoamIslands.islandRadius) {
              row[tx] = dist <= hy.seafoamIslands.grassRadius ? CELL_BIOME.GRASS : CELL_BIOME.DIRT_PATH;
              eRow[tx] = 1;
              this.occupancy.clear(tx, ty, OCCUPANCY_FLAGS.WATER);
            }
          }
        }
      }
    });

    // 8. Canonical Ponds (Viridian City SW, Safari Zone, Celadon South)
    const vn = nodes.viridian ? this.nodeToTile(nodes.viridian.x, nodes.viridian.y) : KANTO_FALLBACK_NODES.viridian;
    this.carveOrganicPond(g, vn.tx + hy.ponds.viridian.offsetTx, vn.ty + hy.ponds.viridian.offsetTy, hy.ponds.viridian.radius);
    this.carveOrganicPond(g, fc.tx + hy.ponds.fuchsia.offsetTx, fc.ty + hy.ponds.fuchsia.offsetTy, hy.ponds.fuchsia.radius);
    this.carveOrganicPond(g, vm.tx + hy.ponds.vermilion.offsetTx, vm.ty + hy.ponds.vermilion.offsetTy, hy.ponds.vermilion.radius);
  }

  private carveOrganicPond(grid: Uint8Array[], cx: number, cy: number, radius: number): void {
    const cfg = KANTO_HYDROGRAPHY_CONFIG.ponds;
    const rInt = Math.ceil(radius + cfg.radiusPadding);
    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= KANTO_GRID_W || y < 0 || y >= KANTO_GRID_H) continue;
        if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.ROAD)) continue;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const rPerturb = radius * (1.0 + cfg.wobbleAmplitude * Math.sin(cfg.wobbleAngleMultiplier * angle));
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
      const bCfg = KANTO_ROAD_CONFIG.saffronBoulevard;
      for (let d = -bCfg.extent; d <= bCfg.extent; d++) {
        for (let w = -bCfg.halfWidth; w <= bCfg.halfWidth; w++) {
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
                this.occupancy.reserveBuffer(gx, gy, 1, 1, bCfg.bufferSize, OCCUPANCY_FLAGS.ROAD_BUFFER);
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
      const r1 = KANTO_ROAD_CONFIG.route1Corridor;

      // Carve compact Route 1 grass corridor
      for (let y = vn.ty + r1.startOffsetTy; y <= pt.ty + r1.endOffsetTy; y++) {
        for (let x = pt.tx - r1.halfWidth; x <= pt.tx + r1.halfWidth; x++) {
          if (x >= 0 && x < KANTO_GRID_W && y >= 0 && y < KANTO_GRID_H) {
            const row = g[y];
            if (row && row[x] === CELL_BIOME.FOREST_WALL) {
              row[x] = CELL_BIOME.GRASS;
            }
          }
        }
      }

      const midY = Math.floor((pt.ty + vn.ty) / 2);
      this.rasterizePath(g, pt.tx, pt.ty + r1.endOffsetTy, pt.tx, midY + r1.midOffsetUpper, roadWidth);
      this.rasterizePath(g, pt.tx, midY + r1.midOffsetUpper, pt.tx + r1.eastOffset, midY + r1.midOffsetUpper, roadWidth);
      this.rasterizePath(g, pt.tx + r1.eastOffset, midY + r1.midOffsetUpper, pt.tx + r1.eastOffset, midY + r1.midOffsetLower, roadWidth);
      this.rasterizePath(g, pt.tx + r1.eastOffset, midY + r1.midOffsetLower, pt.tx + r1.westOffset, midY + r1.midOffsetLower, roadWidth);
      this.rasterizePath(g, pt.tx + r1.westOffset, midY + r1.midOffsetLower, pt.tx + r1.westOffset, vn.ty + r1.startOffsetTy, roadWidth);
      this.rasterizePath(g, pt.tx + r1.westOffset, vn.ty + r1.startOffsetTy, vn.tx, vn.ty + r1.startOffsetTy, roadWidth);
    }
  }

  private rasterizePath(grid: Uint8Array[], x0: number, y0: number, x1: number, y1: number, width = 2): void {
    const corridorRadius = Math.max(KANTO_ROAD_CONFIG.rasterizer.minCorridorRadius, Math.floor(width / 2) + KANTO_ROAD_CONFIG.rasterizer.corridorPadding);
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
                this.occupancy.reserveBuffer(px, py, 1, 1, KANTO_ROAD_CONFIG.rasterizer.bufferSize, OCCUPANCY_FLAGS.ROAD_BUFFER);
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
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : KANTO_FALLBACK_NODES.pallet;
    KANTO_TALL_GRASS_CONFIG.route1.forEach((p) => {
      addPatch(pt.tx + p.minDx, pt.tx + p.maxDx, pt.ty + p.minDy, pt.ty + p.maxDy);
    });

    // 2. Universal route-side wild Pokemon tall grass patches
    const wild = KANTO_TALL_GRASS_CONFIG.wildRoutes;
    for (let gy = wild.margin; gy < KANTO_GRID_H - wild.margin; gy += wild.step) {
      for (let gx = wild.margin; gx < KANTO_GRID_W - wild.margin; gx += wild.step) {
        const row = g[gy];
        if (row && row[gx] === CELL_BIOME.DIRT_PATH) {
          const grassSeed = this.hashF(gx, gy, this.seed + wild.seedOffset);
          if (grassSeed > wild.presenceThreshold) {
            const side = grassSeed > wild.sideThreshold ? wild.sideOffsetPositive : wild.sideOffsetNegative;
            addPatch(gx + side - wild.halfSpan, gx + side + wild.halfSpan, gy - wild.halfSpan, gy + wild.halfSpan);
          }
        }
      }
    }
  }

  private placeBridgesWithGuarantees(nodes: Record<string, KantoNodeCoordinate>): void {
    this.bridges = [];

    // Nugget Bridge (Route 24 north of Cerulean)
    const cr = nodes.cerulean ? this.nodeToPx(nodes.cerulean.x, nodes.cerulean.y) : KANTO_FALLBACK_NODES.cerulean;
    const nb = KANTO_BRIDGES_CONFIG.nuggetBridge;
    this.bridges.push({ style: 'nugget', x: cr.px + nb.dx, y: cr.py + nb.dy, w: nb.w, h: nb.h });

    // Harbor Pier in Vermilion
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : KANTO_FALLBACK_NODES.vermilion;
    const hp = KANTO_BRIDGES_CONFIG.harborPier;
    this.bridges.push({ style: 'pier', x: vm.px + hp.dx, y: vm.py + hp.dy, w: hp.w, h: hp.h });
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
            if (elev === undefined || elev >= KANTO_HYDROGRAPHY_CONFIG.protection.maxElev) return false;
            if (this.occupancy.has(x, y, OCCUPANCY_FLAGS.CLIFF | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.DOOR_ACCESS)) return false;
          }
        }
        for (const eb of this.buildings) {
          const ebx = Math.floor(eb.x / T);
          const eby = Math.floor(eb.y / T);
          const ebw = Math.ceil((eb.w ?? DEFAULT_STRUCTURE_PX_SIZE) / T);
          const ebh = Math.ceil((eb.h ?? DEFAULT_STRUCTURE_PX_SIZE) / T);
          if (tx < ebx + ebw + 1 && tx + bw + 1 > ebx && ty < eby + ebh + 1 && ty + bh + 1 > eby) {
            return false;
          }
        }
        return true;
      };

      if (isSpotValid(bx, by)) {
        found = true;
      } else {
        for (let r = 1; r <= MAX_PLACEMENT_SPIRAL_SEARCH_RADIUS && !found; r++) {
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
        for (let step = 0; step <= DOOR_PATH_EXTENSION_STEPS; step++) {
          const cy = doorTileY + step;
          const row = g[cy];
          if (cy < KANTO_GRID_H && row && row[doorTileX] !== CELL_BIOME.WATER && row[doorTileX] !== CELL_BIOME.MOUNTAIN_DIRT) {
            row[doorTileX] = CELL_BIOME.DIRT_PATH;
            this.occupancy.set(doorTileX, cy, OCCUPANCY_FLAGS.SIDEWALK);
          }
        }
      }
    };

    const pw = nodes.pewter ? this.nodeToPx(nodes.pewter.x, nodes.pewter.y) : KANTO_FALLBACK_NODES.pewter;
    const cr = nodes.cerulean ? this.nodeToPx(nodes.cerulean.x, nodes.cerulean.y) : KANTO_FALLBACK_NODES.cerulean;
    const sf = nodes.saffron ? this.nodeToPx(nodes.saffron.x, nodes.saffron.y) : KANTO_FALLBACK_NODES.saffron;
    const cl = nodes.celadon ? this.nodeToPx(nodes.celadon.x, nodes.celadon.y) : KANTO_FALLBACK_NODES.celadon;
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : KANTO_FALLBACK_NODES.vermilion;
    const lv = nodes.lavender ? this.nodeToPx(nodes.lavender.x, nodes.lavender.y) : KANTO_FALLBACK_NODES.lavender;
    const fc = nodes.fuchsia ? this.nodeToPx(nodes.fuchsia.x, nodes.fuchsia.y) : KANTO_FALLBACK_NODES.fuchsia;
    const cb = nodes.cinnabar ? this.nodeToPx(nodes.cinnabar.x, nodes.cinnabar.y) : KANTO_FALLBACK_NODES.cinnabar;
    const ip = nodes.indigo ? this.nodeToPx(nodes.indigo.x, nodes.indigo.y) : KANTO_FALLBACK_NODES.indigo;
    const bh = nodes.billshouse ? this.nodeToPx(nodes.billshouse.x, nodes.billshouse.y) : KANTO_FALLBACK_NODES.billshouse;
    const pp = nodes.powerplant ? this.nodeToPx(nodes.powerplant.x, nodes.powerplant.y) : KANTO_FALLBACK_NODES.powerplant;

    const canonicalBuildings: { style: string; x: number; y: number; w: number; h: number; door?: { x: number; y: number } }[] = [];

    // Pallet Town (Hamlet)
    if (nodes.pallet) {
      const ptT = this.nodeToTile(nodes.pallet.x, nodes.pallet.y);
      for (const b of KANTO_CANONICAL_BUILDINGS.pallet) {
        canonicalBuildings.push({ style: b.style, x: (ptT.tx + b.dxTiles) * T, y: (ptT.ty + b.dyTiles) * T, w: b.w, h: b.h, door: b.door });
      }
    }

    // Viridian City (Bastion)
    if (nodes.viridian) {
      const vrT = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      for (const b of KANTO_CANONICAL_BUILDINGS.viridian) {
        canonicalBuildings.push({ style: b.style, x: (vrT.tx + b.dxTiles) * T, y: (vrT.ty + b.dyTiles) * T, w: b.w, h: b.h, door: b.door });
      }
    }

    // Pewter City (Bastion)
    if (nodes.pewter) {
      for (const b of KANTO_CANONICAL_BUILDINGS.pewter) {
        canonicalBuildings.push({ style: b.style, x: pw.px + b.dx, y: pw.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Route 2 Gatehouse (Viridian Forest Border)
    if (nodes.viridian && nodes.pewter) {
      const vrT = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      const pwT = this.nodeToTile(nodes.pewter.x, nodes.pewter.y);
      const midY = Math.round((vrT.ty + pwT.ty) / 2);
      const g = KANTO_CANONICAL_BUILDINGS.route2Gatehouse;
      canonicalBuildings.push({ style: 'gatehouse_route', x: vrT.tx * T + g.dx, y: midY * T, w: g.w, h: g.h, door: g.door });
    }

    // Mt. Moon (Route 4 / Route 3 entrance Pokémon Center)
    if (nodes.mtmoon) {
      const mmT = this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y);
      const b = KANTO_CANONICAL_BUILDINGS.mtMoonPokecenter;
      canonicalBuildings.push({ style: 'pokecenter', x: (mmT.tx + b.dxTiles) * T, y: (mmT.ty + b.dyTiles) * T, w: b.w, h: b.h, door: b.door });
    }

    // Cerulean City (Bastion)
    if (nodes.cerulean) {
      for (const b of KANTO_CANONICAL_BUILDINGS.cerulean) {
        canonicalBuildings.push({ style: b.style, x: cr.px + b.dx, y: cr.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Saffron City (Metropolis)
    if (nodes.saffron) {
      for (const b of KANTO_CANONICAL_BUILDINGS.saffron) {
        canonicalBuildings.push({ style: b.style, x: sf.px + b.dx, y: sf.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Celadon City (Metropolis)
    if (nodes.celadon) {
      for (const b of KANTO_CANONICAL_BUILDINGS.celadon) {
        canonicalBuildings.push({ style: b.style, x: cl.px + b.dx, y: cl.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Vermilion City (Port)
    if (nodes.vermilion) {
      for (const b of KANTO_CANONICAL_BUILDINGS.vermilion) {
        canonicalBuildings.push({ style: b.style, x: vm.px + b.dx, y: vm.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Lavender Town (Rural)
    if (nodes.lavender) {
      for (const b of KANTO_CANONICAL_BUILDINGS.lavender) {
        canonicalBuildings.push({ style: b.style, x: lv.px + b.dx, y: lv.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Fuchsia City (Bastion)
    if (nodes.fuchsia) {
      for (const b of KANTO_CANONICAL_BUILDINGS.fuchsia) {
        canonicalBuildings.push({ style: b.style, x: fc.px + b.dx, y: fc.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Cinnabar Island (Rural)
    if (nodes.cinnabar) {
      for (const b of KANTO_CANONICAL_BUILDINGS.cinnabar) {
        canonicalBuildings.push({ style: b.style, x: cb.px + b.dx, y: cb.py + b.dy, w: b.w, h: b.h, door: b.door });
      }
    }

    // Landmarks & League
    if (nodes.powerplant) {
      const b = KANTO_CANONICAL_BUILDINGS.powerplant;
      canonicalBuildings.push({ style: 'power_plant', x: pp.px + b.dx, y: pp.py + b.dy, w: b.w, h: b.h, door: b.door });
    }
    if (nodes.billshouse) {
      const b = KANTO_CANONICAL_BUILDINGS.billshouse;
      canonicalBuildings.push({ style: 'house_teal_bungalow', x: bh.px + b.dx, y: bh.py + b.dy, w: b.w, h: b.h, door: b.door });
    }
    if (nodes.indigo) {
      const b = KANTO_CANONICAL_BUILDINGS.league;
      canonicalBuildings.push({ style: 'pokemon_league', x: ip.px + b.dx, y: ip.py + b.dy, w: b.w, h: b.h, door: b.door });
    }

    canonicalBuildings.forEach((b) => placeSmartBuilding(b));

    // Pewter City Civic Stone Plaza (authentically paves the open courtyard between Museum, Gym, Center & School)
    if (nodes.pewter) {
      const pwT = this.nodeToTile(nodes.pewter.x, nodes.pewter.y);
      const plaza = PEWTER_PLAZA_BOUNDS;
      for (let dy = plaza.minDy; dy <= plaza.maxDy; dy++) {
        for (let dx = plaza.minDx; dx <= plaza.maxDx; dx++) {
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
    const ptTile = nodes?.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : KANTO_FALLBACK_NODES.pallet;
    const r1Inf = ROUTE_1_INFRASTRUCTURE;

    // 1. Route 1 South Exit Picket Fence (FireRed Route 1 border with 2-tile gap)
    for (let x = ptTile.tx + r1Inf.exitFenceLeft.minDx; x <= ptTile.tx + r1Inf.exitFenceLeft.maxDx; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty + r1Inf.exitFenceLeft.offsetTy) * T });
    }
    for (let x = ptTile.tx + r1Inf.exitFenceRight.minDx; x <= ptTile.tx + r1Inf.exitFenceRight.maxDx; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty + r1Inf.exitFenceRight.offsetTy) * T });
    }

    // 2. Pallet Town Flowerbed (Left of Oak Lab)
    for (let x = ptTile.tx + r1Inf.labFence.minDx; x <= ptTile.tx + r1Inf.labFence.maxDx; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty + r1Inf.labFence.offsetTy) * T });
    }
    for (let dy = r1Inf.flowerbed.minDy; dy <= r1Inf.flowerbed.maxDy; dy++) {
      for (let x = ptTile.tx + r1Inf.flowerbed.minDx; x <= ptTile.tx + r1Inf.flowerbed.maxDx; x++) {
        this.props.push({ style: 'poke_flowers_red', x: x * T, y: (ptTile.ty + dy) * T });
      }
    }

    // 3. Pallet Town Fence below Oak Lab
    for (let x = ptTile.tx + r1Inf.lowerFence.minDx; x <= ptTile.tx + r1Inf.lowerFence.maxDx; x++) {
      this.props.push({ style: 'poke_fence_picket', x: x * T, y: (ptTile.ty + r1Inf.lowerFence.offsetTy) * T });
    }

    // 4. Mailboxes next to houses
    r1Inf.mailboxes.forEach((m) => {
      this.props.push({ style: 'poke_mailbox', x: (ptTile.tx + m.dx) * T, y: (ptTile.ty + m.dy) * T });
    });

    // 5. Wooden Signposts
    r1Inf.signposts.forEach((s) => {
      this.props.push({ style: 'poke_signpost', x: (ptTile.tx + s.dx) * T, y: (ptTile.ty + s.dy) * T });
    });

    // 6. Route 1 Flower Accents
    r1Inf.flowers.forEach((f) => {
      this.props.push({ style: 'poke_flowers_red', x: (ptTile.tx + f.dx) * T, y: (ptTile.ty + f.dy) * T });
    });

    // 7. Mt. Moon Infrastructure
    if (nodes?.mtmoon) {
      const mmT = this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y);
      const mmInf = MT_MOON_INFRASTRUCTURE;
      // Pave authentic sand paths connecting South approach -> Pokemon Center -> Cave
      this.rasterizePath(this.grid, mmT.tx + mmInf.pathWestApproach.x0, mmT.ty + mmInf.pathWestApproach.y0, mmT.tx + mmInf.pathWestApproach.x1, mmT.ty + mmInf.pathWestApproach.y1, 2);
      this.rasterizePath(this.grid, mmT.tx + mmInf.pathCenterApproach.x0, mmT.ty + mmInf.pathCenterApproach.y0, mmT.tx + mmInf.pathCenterApproach.x1, mmT.ty + mmInf.pathCenterApproach.y1, 2);
      this.rasterizePath(this.grid, mmT.tx + mmInf.pathCaveApproach.x0, mmT.ty + mmInf.pathCaveApproach.y0, mmT.tx + mmInf.pathCaveApproach.x1, mmT.ty + mmInf.pathCaveApproach.y1, 2);

      // Cave mouth embedded flush into 2-tile cliff wall (Row 26 top rim, Row 27 face)
      this.props.push({
        style: 'poke_cave_entrance_mtmoon',
        x: (mmT.tx + mmInf.caveEntrance.dx) * T,
        y: (mmT.ty + mmInf.caveEntrance.dy) * T,
        w: mmInf.caveEntrance.w,
        h: mmInf.caveEntrance.h
      });

      // Canonical stone stairs connecting ground (Row 28) to upper terrace (Row 26)
      this.nature.push({
        style: 'poke_stairs_mtmoon',
        x: (mmT.tx + mmInf.stairs.dx) * T,
        y: (mmT.ty + mmInf.stairs.dy) * T,
        w: mmInf.stairs.w,
        h: mmInf.stairs.h
      });

      // Canonical Signpost near the cave entrance
      this.props.push({
        style: 'poke_signpost',
        x: (mmT.tx + mmInf.signpost.dx) * T,
        y: (mmT.ty + mmInf.signpost.dy) * T,
        w: mmInf.signpost.w,
        h: mmInf.signpost.h
      });

      // Decorative ground boulders (Mt. Moon valley)
      mmInf.boulders.forEach((b) => {
        this.props.push({ style: 'poke_rock_small', x: (mmT.tx + b.dx) * T, y: (mmT.ty + b.dy) * T, w: b.w, h: b.h });
      });
    }
  }

  private placeLedges(nodes: Record<string, KantoNodeCoordinate>): void {
    const T = KANTO_TILE_SIZE;
    const pt = nodes.pallet ? this.nodeToTile(nodes.pallet.x, nodes.pallet.y) : KANTO_FALLBACK_NODES.pallet;
    const mm = nodes.mtmoon ? this.nodeToTile(nodes.mtmoon.x, nodes.mtmoon.y) : KANTO_FALLBACK_NODES.mtmoon;

    // Route 1 & Route 4 authentic canonical ledges (matching FireRed GBA)
    const ledgesConfig = [
      ...KANTO_LEDGES_OFFSETS.route1.map((l) => ({ y: pt.ty + l.dy, x0: pt.tx + l.dx0, x1: pt.tx + l.dx1 })),
      ...KANTO_LEDGES_OFFSETS.route4.map((l) => ({ y: mm.ty + l.dy, x0: mm.tx + l.dx0, x1: mm.tx + l.dx1 }))
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

    const simplex = new SimplexNoise(this.seed + BIOME_LATITUDE_TRANSITION.seedOffset);

    // 1. Continuous Dense Forest Wall: Staggered brick overlap placement (interlocking canopies)
    for (let gy = 0; gy < KANTO_GRID_H - 1; gy += 2) {
      // Shift every second row by 1 tile (32px) to stagger canopies like bricks
      const xOffset = ((gy / 2) % 2 === 1) ? 1 : 0;
      for (let gx = xOffset; gx < KANTO_GRID_W - 1; gx += 2) {
        const row = g[gy];
        if (!row || row[gx] !== CELL_BIOME.FOREST_WALL) continue;
        if (this.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING | OCCUPANCY_FLAGS.WATER)) continue;

        // Buffer around cliffs: trees must not overlap cliff perimeters (1 tile horizontal, 2 tiles vertical)
        let nearCliff = false;
        for (let cdy = -BIOME_LATITUDE_TRANSITION.cliffBufferVert; cdy <= BIOME_LATITUDE_TRANSITION.cliffBufferVert && !nearCliff; cdy++) {
          for (let cdx = -1; cdx <= BIOME_LATITUDE_TRANSITION.cliffBufferHoriz; cdx++) {
            const cx = gx + cdx;
            const cy = gy + cdy;
            if (cx < 0 || cx >= KANTO_GRID_W || cy < 0 || cy >= KANTO_GRID_H) continue;
            if (this.occupancy.has(cx, cy, OCCUPANCY_FLAGS.CLIFF) || g[cy]?.[cx] === CELL_BIOME.MOUNTAIN_DIRT) {
              nearCliff = true;
              break;
            }
          }
        }
        if (nearCliff) continue;

        // Organic biome species assignment:
        const elevVal = this.elevation[gy]?.[gx] ?? 1;
        const latitudeFactor = (BIOME_LATITUDE_TRANSITION.centerGy - gy) / BIOME_LATITUDE_TRANSITION.divisor;
        const noiseVal = simplex.noise2D(gx * BIOME_LATITUDE_TRANSITION.noiseFreq, gy * BIOME_LATITUDE_TRANSITION.noiseFreq) * BIOME_LATITUDE_TRANSITION.noiseAmp;
        const isAlpine = elevVal >= 2 || (latitudeFactor + noiseVal > BIOME_LATITUDE_TRANSITION.alpineThreshold);
        const style = isAlpine ? 'poke_tree_pine_small' : 'poke_tree_oak_clean';
        this.trees.push({ style, x: gx * T, y: gy * T });
      }
    }

    // 2. Canonical Route 1 obstacle trees inside the clearing
    if (nodes.pallet) {
      const pt = this.nodeToTile(nodes.pallet.x, nodes.pallet.y);
      for (const t of ROUTE_1_OBSTACLE_TREES) {
        this.trees.push({ style: 'poke_tree_oak_clean', x: (pt.tx + t.dx) * T, y: (pt.ty + t.dy) * T });
      }
    }

    // 3. Viridian City trees & Cuttable Tree
    if (nodes.viridian) {
      const vr = this.nodeToTile(nodes.viridian.x, nodes.viridian.y);
      for (const t of VIRIDIAN_CITY_TREES) {
        this.trees.push({ style: t.style, x: (vr.tx + t.dx) * T, y: (vr.ty + t.dy) * T });
      }
    }

    // 4. Viridian Forest & Pewter alpine pine framing
    const isCanonicalKanto = Boolean(nodes.pallet || nodes.viridian || nodes.pewter);
    if (isCanonicalKanto && nodes.viridianforest) {
      const vfNode = nodes.viridianforest;
      const vf = this.nodeToPx(vfNode.x, vfNode.y);
      for (let dy = VIRIDIAN_FOREST_FRAMING.minDy; dy <= VIRIDIAN_FOREST_FRAMING.maxDy; dy += VIRIDIAN_FOREST_FRAMING.stepPx) {
        for (let dx = VIRIDIAN_FOREST_FRAMING.minDx; dx <= VIRIDIAN_FOREST_FRAMING.maxDx; dx += VIRIDIAN_FOREST_FRAMING.stepPx) {
          const gx = Math.floor((vf.px + dx) / T);
          const gy = Math.floor((vf.py + dy) / T);
          if (gx < 0 || gx >= KANTO_GRID_W || gy < 0 || gy >= KANTO_GRID_H) continue;
          if (g[gy]?.[gx] === CELL_BIOME.GRASS && !this.occupancy.has(gx, gy, OCCUPANCY_FLAGS.ROAD | OCCUPANCY_FLAGS.BUILDING)) {
            this.trees.push({ style: 'poke_tree_oak_clean', x: gx * T, y: gy * T });
          }
        }
      }
    }
  }

  private placePropsAndDetails(nodes: Record<string, KantoNodeCoordinate>): void {
    // Snorlax on Route 12 and Route 16
    const r12 = nodes.route12 ? this.nodeToPx(nodes.route12.x, nodes.route12.y) : null;
    if (r12) this.props.push({ style: 'poke_snorlax', x: r12.px + CANONICAL_PROP_OFFSETS.route12Snorlax.dx, y: r12.py + CANONICAL_PROP_OFFSETS.route12Snorlax.dy });

    const r16 = nodes.route16 ? this.nodeToPx(nodes.route16.x, nodes.route16.y) : null;
    if (r16) this.props.push({ style: 'poke_snorlax', x: r16.px + CANONICAL_PROP_OFFSETS.route16Snorlax.dx, y: r16.py + CANONICAL_PROP_OFFSETS.route16Snorlax.dy });

    // Cuttable trees
    const vm = nodes.vermilion ? this.nodeToPx(nodes.vermilion.x, nodes.vermilion.y) : null;
    if (vm) this.props.push({ style: 'tree_cuttable', x: vm.px + CANONICAL_PROP_OFFSETS.vermilionCutTree.dx, y: vm.py + CANONICAL_PROP_OFFSETS.vermilionCutTree.dy });

    // Street lamps in major cities
    ['viridian', 'pewter', 'cerulean', 'celadon', 'vermilion', 'lavender', 'fuchsia'].forEach((id) => {
      const n = nodes[id];
      if (!n) return;
      const { px, py } = this.nodeToPx(n.x, n.y);
      this.props.push({ style: 'street_lamp', x: px + CANONICAL_PROP_OFFSETS.streetLampLeft.dx, y: py + CANONICAL_PROP_OFFSETS.streetLampLeft.dy });
      this.props.push({ style: 'street_lamp', x: px + CANONICAL_PROP_OFFSETS.streetLampRight.dx, y: py + CANONICAL_PROP_OFFSETS.streetLampRight.dy });
    });

    const dc = nodes.diglettcave ? this.nodeToPx(nodes.diglettcave.x, nodes.diglettcave.y) : null;
    if (dc) this.props.push({ style: 'diglett', x: dc.px, y: dc.py });
  }
}

