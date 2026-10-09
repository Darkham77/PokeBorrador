/**
 * src/logic/map/prefabsRegistry.ts
 *
 * CANONICAL PREFABS & SPRITES REGISTRY (SSoT v2.0)
 *
 * Centralized service for querying complete, transparent GBA entity sprites:
 * buildings, trees, nature vegetation, and props for the Stamp Engine.
 */

import type { PrefabCategory } from '../../types/map/adventureWorldTypes';
export type { PrefabCategory };

export interface PrefabItem {
  readonly id: string;
  readonly name: string;
  readonly category: PrefabCategory;
  readonly width: number;
  readonly height: number;
  readonly file_path: string;
  readonly source: string;
}

export interface PrefabsManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly totalPrefabs: number;
  readonly categories: Record<PrefabCategory, number>;
  readonly prefabs: readonly PrefabItem[];
}

const DEFAULT_CANONICAL_PREFABS: readonly PrefabItem[] = [
  { id: 'pokecenter', name: 'Centro Pokémon', category: 'buildings', width: 160, height: 160, file_path: '/assets/prefabs/buildings/pokecenter.png', source: 'pokegba' },
  { id: 'pokemart', name: 'Tienda Pokémon', category: 'buildings', width: 128, height: 128, file_path: '/assets/prefabs/buildings/pokemart.png', source: 'pokegba' },
  { id: 'gym', name: 'Gimnasio Oficial', category: 'buildings', width: 192, height: 160, file_path: '/assets/prefabs/buildings/gym.png', source: 'pokegba' },
  { id: 'pokemon_league', name: 'Palacio de la Liga Pokémon', category: 'buildings', width: 352, height: 256, file_path: '/assets/prefabs/buildings/pokemon_league.png', source: 'pokegba' },
  { id: 'lab_oak', name: 'Laboratorio Oak', category: 'buildings', width: 224, height: 192, file_path: '/assets/prefabs/buildings/lab_oak.png', source: 'pokegba' },
  { id: 'house_red', name: 'Casa Tejado Rojo', category: 'buildings', width: 160, height: 160, file_path: '/assets/prefabs/buildings/house_red.png', source: 'pokegba' },
  { id: 'house_blue', name: 'Casa Tejado Azul', category: 'buildings', width: 160, height: 160, file_path: '/assets/prefabs/buildings/house_blue.png', source: 'pokegba' },
  { id: 'tree_poke', name: 'Árbol Kanto (GBA)', category: 'vegetation', width: 64, height: 64, file_path: '/assets/prefabs/vegetation/tree_poke.png', source: 'pokegba' },
  { id: 'tree_pine_small', name: 'Pino Pequeño', category: 'vegetation', width: 32, height: 48, file_path: '/assets/prefabs/vegetation/poke_tree_pine_small.png', source: 'pokegba' },
  { id: 'cliff_cone_brown', name: 'Pilar Rocoso / Cono', category: 'elevation', width: 32, height: 48, file_path: '/assets/prefabs/elevation/poke_cliff_cone_brown.png', source: 'pokegba' },
  { id: 'bridge_wood', name: 'Puente de Madera', category: 'infrastructure', width: 32, height: 32, file_path: '/assets/prefabs/infrastructure/poke_boardwalk_planks.png', source: 'pokegba' },
  { id: 'street_lamp', name: 'Farola Urbana', category: 'props', width: 16, height: 48, file_path: '/assets/prefabs/props/street_lamp.png', source: 'pokegba' }
];

export class PrefabsRegistryService {
  private readonly byId = new Map<string, PrefabItem>();
  private readonly byCategory = new Map<PrefabCategory, PrefabItem[]>();
  private allPrefabs: readonly PrefabItem[] = [];
  private isLoaded = false;

  constructor() {
    this.byCategory.set('buildings', []);
    this.byCategory.set('vegetation', []);
    this.byCategory.set('elevation', []);
    this.byCategory.set('infrastructure', []);
    this.byCategory.set('props', []);
    this.setPrefabs(DEFAULT_CANONICAL_PREFABS);
  }

  /**
   * Loads the prefabs manifest from public/assets/prefabs/manifest.json
   */
  public async loadManifest(manifestUrl = '/assets/essentials/manifest.json'): Promise<PrefabsManifest | null> {
    try {
      if (!manifestUrl.startsWith('/') || manifestUrl.includes('..')) {
        throw new Error(`[PrefabsRegistry] Disallowed manifest URL: ${manifestUrl}`);
      }
      // fallow-ignore-next-line security-sink
      let res = await fetch(manifestUrl);
      if (!res.ok) {
        res = await fetch('/assets/prefabs/manifest.json');
      }
      if (!res.ok) {
        res = await fetch('/assets/studio/kanto/prefabs/manifest.json');
      }
      if (!res.ok) {
        return null;
      }
      const manifest = (await res.json()) as PrefabsManifest;
      this.setPrefabs(manifest.prefabs);
      this.isLoaded = true;
      return manifest;
    } catch {
      return null;
    }
  }

  public async loadFromManifest(manifestUrl = '/assets/prefabs/manifest.json'): Promise<PrefabsManifest | null> {
    return this.loadManifest(manifestUrl);
  }

  /**
   * Synchronously populates or overrides in-memory prefabs
   */
  public setPrefabs(items: readonly PrefabItem[]): void {
    this.allPrefabs = Object.freeze([...items]);
    this.byId.clear();
    this.byCategory.set('buildings', []);
    this.byCategory.set('vegetation', []);
    this.byCategory.set('elevation', []);
    this.byCategory.set('infrastructure', []);
    this.byCategory.set('props', []);

    for (const item of items) {
      this.byId.set(item.id, item);
      const list = this.byCategory.get(item.category);
      if (list) {
        list.push(item);
      }
    }
  }

  public getAllPrefabs(): readonly PrefabItem[] {
    return this.allPrefabs;
  }

  public getPrefabsByCategory(category: PrefabCategory | 'all'): readonly PrefabItem[] {
    if (category === 'all') return this.allPrefabs;
    return this.byCategory.get(category) ?? [];
  }

  public getByCategory(category: PrefabCategory | 'all'): readonly PrefabItem[] {
    return this.getPrefabsByCategory(category);
  }

  public getPrefabById(id: string): PrefabItem | undefined {
    return this.byId.get(id);
  }

  public getById(id: string): PrefabItem | undefined {
    return this.getPrefabById(id);
  }

  public get loaded(): boolean {
    return this.isLoaded;
  }

  public get count(): number {
    return this.allPrefabs.length;
  }
}

export const defaultPrefabsRegistry = new PrefabsRegistryService();
