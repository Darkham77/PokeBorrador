// Kanto Semantic Tile Catalog & Sprite Image Loader

import {
  DEFAULT_CATALOG_TILE_SIZE,
  DEFAULT_CATALOG_SHEET_WIDTH,
  DEFAULT_CATALOG_SHEET_HEIGHT
} from '../../config/kantoTileEngineConfig.ts';
import type {
  CatalogPrefab,
  SemanticTileCatalog
} from '../../types/map/kantoTileEngineTypes.ts';
import { resolveAssetWebPath } from './assetWebPathResolver.ts';

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

  async init(_basePath = '/test_aventura/assets/tiles/'): Promise<void> {
    if (this._isLoaded) return;

    try {
      let res = await fetch('/test_aventura/assets/studio/kanto/tile_catalog.json');
      if (!res.ok) res = await fetch('/assets/studio/kanto/tile_catalog.json');
      if (!res.ok) throw new Error(`HTTP error loading catalog: ${res.status}`);
      this.catalog = (await res.json()) as SemanticTileCatalog;
    } catch {
      this.catalog = {
        version: '5.0',
        tileSize: DEFAULT_CATALOG_TILE_SIZE,
        sheets: {
          'grass.png': { file: 'grass.png', width: DEFAULT_CATALOG_SHEET_WIDTH, height: DEFAULT_CATALOG_SHEET_HEIGHT },
          'dirt.png': { file: 'dirt.png', width: DEFAULT_CATALOG_SHEET_WIDTH, height: DEFAULT_CATALOG_SHEET_HEIGHT },
          'watergrass.png': { file: 'watergrass.png', width: DEFAULT_CATALOG_SHEET_WIDTH, height: DEFAULT_CATALOG_SHEET_HEIGHT },
          'stone_plaza.png': { file: 'stone_plaza.png', width: DEFAULT_CATALOG_SHEET_WIDTH, height: DEFAULT_CATALOG_SHEET_HEIGHT }
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
      let pRes = await fetch('/test_aventura/assets/essentials/manifest.json');
      if (!pRes.ok) pRes = await fetch('/test_aventura/assets/prefabs/manifest.json');
      if (!pRes.ok) pRes = await fetch('/test_aventura/assets/studio/kanto/prefabs/manifest.json');
      if (!pRes.ok) pRes = await fetch('/assets/essentials/manifest.json');
      if (!pRes.ok) pRes = await fetch('/assets/prefabs/manifest.json');
      if (!pRes.ok) pRes = await fetch('/assets/studio/kanto/prefabs/manifest.json');
      if (!pRes.ok) return;
      const pData = await pRes.json();
      if (pData?.autotiles && Array.isArray(pData.autotiles)) {
        for (const at of pData.autotiles) sheetFiles.add(at);
      }
      if (pData?.prefabs && Array.isArray(pData.prefabs)) {
        for (const item of pData.prefabs) {
          if (item.file_path) {
            sheetFiles.add(item.file_path);
            const pathStr = item.file_path as string;
            if (pathStr.startsWith('/assets/')) {
              sheetFiles.add(`/test_aventura${pathStr}`);
            }
          }
          if (item.id) {
            sheetFiles.add(item.id);
            sheetFiles.add(`${item.id}.png`);
          }
        }
      }
    } catch {
      // catch-ok: Fallback when optional local storage prefabs manifest is unavailable or corrupted
    }

    if (this.catalog.prefabs) {
      for (const group of Object.values(this.catalog.prefabs)) {
        for (const prefab of Object.values(group)) {
          if (!prefab.parts) continue;
          for (const part of prefab.parts) {
            if (part.sheet) sheetFiles.add(part.sheet);
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
      'poke_cliff_brown_rock_corner_br.png', 'poke_cliff_gray_corner_br.png',
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
        const webPath = resolveAssetWebPath(sheetFile)
          ?? (sheetFile.startsWith('/') ? sheetFile : undefined);

        if (!webPath) {
          resolve();
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
          resolve();
        };
        img.src = webPath;
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
