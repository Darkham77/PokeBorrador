/**
 * src/composables/studio/useAssetAtlas.ts
 *
 * COMPOSABLE FOR GBA ASSET ATLAS INSPECTOR
 *
 * Manages master sheet catalog, canonical manifest entries, image caching,
 * grid snapping, and JSON snippet synthesis for canonical_assets_manifest.json.
 */

import { ref, computed } from 'vue';
import type { CanonicalAssetEntry } from '../../logic/map/canonicalAssetsRegistry.ts';
import manifestJson from '../../data/map/canonical_assets_manifest.json' with { type: 'json' };

export interface SheetGridLayout {
  readonly tileSize: number;
  readonly marginX: number;
  readonly marginY: number;
  readonly spacingX: number;
  readonly spacingY: number;
}

export interface MasterSheetMeta {
  readonly id: string;
  readonly filename: string;
  readonly label: string;
  readonly category: string;
  readonly description: string;
  readonly grid: SheetGridLayout;
}

export const MASTER_SHEETS: readonly MasterSheetMeta[] = [
  {
    id: 'firered_tileset_2',
    filename: 'firered_tileset_2.png',
    label: 'Tileset 2 (Naturaleza & Riscos)',
    category: 'nature_terrain',
    description: 'Montañas 2.5D, océanos, playas, bosques, flores y escaleras canónicas.',
    grid: {
      tileSize: 16,
      marginX: 1,
      marginY: 1,
      spacingX: 1,
      spacingY: 1
    }
  },
  {
    id: 'firered_celadon_city',
    filename: 'firered_celadon_city.png',
    label: 'Ciudad Azulona (Celadon City)',
    category: 'urban_city',
    description: 'Gran almacén, fuente monumental, adoquines claros y condominios.',
    grid: {
      tileSize: 16,
      marginX: 0,
      marginY: 0,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_pewter_city',
    filename: 'firered_pewter_city.png',
    label: 'Ciudad Plateada (Pewter City)',
    category: 'urban_city',
    description: 'Museo de la ciencia, empedrado canónico de espiga y casas de pizarra.',
    grid: {
      tileSize: 16,
      marginX: 8,
      marginY: 24,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_saffron_city',
    filename: 'firered_saffron_city.png',
    label: 'Ciudad Azafrán (Saffron City)',
    category: 'metropolis',
    description: 'Rascacielos Silph Co., plaza cívica, dojo y baldosas de granito.',
    grid: {
      tileSize: 16,
      marginX: 0,
      marginY: 0,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_buildings',
    filename: 'firered_buildings.png',
    label: 'Hojas de Edificios Compuestos',
    category: 'buildings',
    description: 'Gimnasios Pokémon, Centros Pokémon, Tiendas Mart, y casas GBA.',
    grid: {
      tileSize: 16,
      marginX: 0,
      marginY: 0,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_pallet_town',
    filename: 'firered_pallet_town.png',
    label: 'Pueblo Paleta (Pallet Town)',
    category: 'town',
    description: 'Laboratorio del Prof. Oak, casas rurales y cercas de madera.',
    grid: {
      tileSize: 16,
      marginX: 8,
      marginY: 24,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_fuchsia_city',
    filename: 'firered_fuchsia_city.png',
    label: 'Ciudad Fucsia (Fuchsia City)',
    category: 'urban_city',
    description: 'Zona Safari, hábitats de agua y cercas perimetrales.',
    grid: {
      tileSize: 16,
      marginX: 8,
      marginY: 24,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_vermilion_city',
    filename: 'firered_vermilion_city.png',
    label: 'Ciudad Carmín (Vermilion City)',
    category: 'port',
    description: 'Muelles portuarios, pasarelas de madera y club de fans.',
    grid: {
      tileSize: 16,
      marginX: 0,
      marginY: 0,
      spacingX: 0,
      spacingY: 0
    }
  },
  {
    id: 'firered_viridian_forest',
    filename: 'firered_viridian_forest.png',
    label: 'Bosque Verde (Viridian Forest)',
    category: 'dungeon',
    description: 'Árboles de bosque denso, casetas de paso y senderos.',
    grid: {
      tileSize: 16,
      marginX: 0,
      marginY: 0,
      spacingX: 0,
      spacingY: 0
    }
  }
];

export interface SelectionRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function useAssetAtlas() {
  const activeSheetId = ref<string>('firered_pewter_city');

  const activeSheet = computed<MasterSheetMeta>(() => {
    const found = MASTER_SHEETS.find((s) => s.id === activeSheetId.value);
    return found ?? MASTER_SHEETS[0]!;
  });

  const currentGrid = ref<SheetGridLayout>({
    tileSize: 16,
    marginX: 8,
    marginY: 24,
    spacingX: 0,
    spacingY: 0
  });

  const showGrid = ref<boolean>(true);
  const selectedRect = ref<SelectionRect | null>({
    x: 248,
    y: 296,
    w: 16,
    h: 16
  });

  const selectedAssetId = ref<string | null>('poke_road_asphalt');

  const activeSheetUrl = computed<string>(() => {
    return `/assets/raw/firered_leafgreen/${activeSheet.value.filename}`;
  });

  const allManifestEntries = computed<readonly CanonicalAssetEntry[]>(() => {
    return manifestJson as readonly CanonicalAssetEntry[];
  });

  const currentSheetEntries = computed<readonly CanonicalAssetEntry[]>(() => {
    const currentFn = activeSheet.value.filename;
    return allManifestEntries.value.filter((e) => e.sourceImage === currentFn);
  });

  function selectSheet(sheetId: string): void {
    activeSheetId.value = sheetId;
    const target = MASTER_SHEETS.find((s) => s.id === sheetId);
    if (target) {
      currentGrid.value = { ...target.grid };
    }
  }

  function setSelection(rect: SelectionRect | null): void {
    selectedRect.value = rect;
    selectedAssetId.value = null;
  }

  function selectRegisteredAsset(asset: CanonicalAssetEntry): void {
    const sheet = MASTER_SHEETS.find((s) => s.filename === asset.sourceImage);
    if (sheet) {
      activeSheetId.value = sheet.id;
      currentGrid.value = { ...sheet.grid };
    }
    selectedAssetId.value = asset.id;
    selectedRect.value = {
      x: asset.sourceRect.x,
      y: asset.sourceRect.y,
      w: asset.sourceRect.w,
      h: asset.sourceRect.h
    };
  }

  /**
   * Synthesizes a ready-to-paste JSON snippet for canonical_assets_manifest.json.
   */
  function generateManifestSnippet(
    id: string,
    category: string,
    name: string,
    rect: SelectionRect
  ): string {
    const g = currentGrid.value;
    const strideX = g.tileSize + g.spacingX;
    const strideY = g.tileSize + g.spacingY;
    const tileW = Math.max(1, Math.round((rect.w + g.spacingX) / strideX));
    const tileH = Math.max(1, Math.round((rect.h + g.spacingY) / strideY));
    const pixelW = tileW * 32;
    const pixelH = tileH * 32;

    const collisionRow = Array(tileW).fill(category === 'roads' || category === 'curbs' ? 0 : 1);
    const collisionMask = Array(tileH).fill(collisionRow);

    const obj = {
      id: id || 'custom_asset_id',
      category: category || 'props',
      name: name || 'Custom Canonical Asset',
      sourceImage: activeSheet.value.filename,
      sourceRect: {
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h
      },
      tileDimensions: {
        w: tileW,
        h: tileH
      },
      pixelDimensions: {
        w: pixelW,
        h: pixelH
      },
      collisionMask,
      runtimePath: `canon/${category || 'props'}/${id || 'custom_asset'}.png`,
      alphaKey: 'transparent'
    };

    return JSON.stringify(obj, null, 2);
  }

  return {
    activeSheetId,
    activeSheet,
    activeSheetUrl,
    currentGrid,
    showGrid,
    selectedRect,
    selectedAssetId,
    availableSheets: MASTER_SHEETS,
    allManifestEntries,
    currentSheetEntries,
    selectSheet,
    setSelection,
    selectRegisteredAsset,
    generateManifestSnippet
  };
}
