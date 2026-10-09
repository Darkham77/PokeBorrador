/**
 * src/logic/map/tilesRegistry.ts
 *
 * CANONICAL TILES REGISTRY API (SSoT v2.0)
 *
 * High-performance, type-safe registry access with O(1) indexed maps
 * for procedural map generation, chunk baking, and overworld placement.
 */

export type TileCategory =
  | 'terrain'
  | 'elevation'
  | 'water'
  | 'vegetation'
  | 'structures'
  | 'objects_props'
  | 'uncategorized';

export type TileCollision = boolean | 'water' | 'ledge';

export interface TileDimensions {
  readonly width: number;
  readonly height: number;
}

export interface TileMetadata {
  readonly id: string;
  readonly source: string;
  readonly category: TileCategory;
  readonly subcategory: string;
  readonly tags: readonly string[];
  readonly dimensions: TileDimensions;
  readonly file_path: string;
  readonly collision: TileCollision;
  readonly grid_x: number;
  readonly grid_y: number;
}

export interface TileFilterOptions {
  readonly category?: TileCategory;
  readonly subcategory?: string;
  readonly tags?: readonly string[];
  readonly collision?: TileCollision;
  readonly source?: string;
}

export interface CategoryManifestEntry {
  readonly count: number;
  readonly file_path: string;
  readonly subcategories: readonly string[];
}

export interface TilesManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly totalTiles: number;
  readonly categories: Readonly<Record<TileCategory, CategoryManifestEntry>>;
  readonly availableTags: readonly string[];
}

export interface TilesRegistryJson {
  readonly version: string;
  readonly generatedAt: string;
  readonly description: string;
  readonly totalTiles?: number;
  readonly tiles: readonly TileMetadata[];
}

export class TilesRegistryService {
  private readonly byId = new Map<string, TileMetadata>();
  private readonly byCategory = new Map<TileCategory, TileMetadata[]>();
  private readonly byTag = new Map<string, TileMetadata[]>();
  private readonly bySubcategory = new Map<string, TileMetadata[]>();
  private readonly loadedCategories = new Set<TileCategory>();
  private allTiles: readonly TileMetadata[] = [];
  private manifest: TilesManifest | null = null;
  private version = '2.0';

  constructor(initialData?: TilesRegistryJson) {
    if (initialData) {
      this.loadRegistry(initialData);
    }
  }

  /**
   * Loads the lightweight manifest index (~10 KB) without downloading large tile datasets
   */
  public async loadManifest(manifestUrl = '/test_aventura/assets/tiles/manifest.json'): Promise<TilesManifest> {
    if (!manifestUrl.startsWith('/') || manifestUrl.includes('..')) {
      throw new Error(`[TilesRegistry] Disallowed manifest URL: ${manifestUrl}`);
    }
    // fallow-ignore-next-line security-sink
    const res = await fetch(manifestUrl);
    if (!res.ok) {
      throw new Error(`[TilesRegistry] Failed to fetch tiles manifest: ${res.status} ${res.statusText}`);
    }
    const manifest = (await res.json()) as TilesManifest;
    this.manifest = manifest;
    this.version = manifest.version;
    return manifest;
  }

  /**
   * Lazily downloads and indexes a single category on-demand
   */
  public async loadCategory(category: TileCategory, baseUrl = '/test_aventura/assets/tiles/'): Promise<void> {
    if (this.loadedCategories.has(category)) return;

    const relPath = this.manifest?.categories[category]?.file_path || `${category}/registry.json`;
    const fullUrl = relPath.startsWith('/') ? relPath : `${baseUrl}${relPath}`;

    if (!fullUrl.startsWith('/') || fullUrl.includes('..')) {
      throw new Error(`[TilesRegistry] Disallowed category URL: ${fullUrl}`);
    }
    // fallow-ignore-next-line security-sink
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`[TilesRegistry] Failed to fetch category ${category} from ${fullUrl}: ${res.status}`);
    }

    const data = (await res.json()) as TilesRegistryJson;
    this.indexTiles(data.tiles);
    this.loadedCategories.add(category);
  }

  /**
   * Ensures a list of categories are loaded in parallel before rendering
   */
  public async ensureCategoriesLoaded(categories: readonly TileCategory[], baseUrl = '/test_aventura/assets/tiles/'): Promise<void> {
    const pending = categories.filter(c => !this.loadedCategories.has(c));
    if (pending.length === 0) return;
    await Promise.all(pending.map(c => this.loadCategory(c, baseUrl)));
  }

  /**
   * Checks whether a category is currently active in memory
   */
  public isCategoryLoaded(category: TileCategory): boolean {
    return this.loadedCategories.has(category);
  }

  /**
   * Active manifest data if loaded
   */
  public get manifestData(): TilesManifest | null {
    return this.manifest;
  }

  /**
   * Initializes or refreshes the in-memory O(1) lookup indices synchronously (Full SSoT)
   */
  public loadRegistry(data: TilesRegistryJson): void {
    this.version = data.version;
    this.byId.clear();
    this.byCategory.clear();
    this.byTag.clear();
    this.bySubcategory.clear();
    this.loadedCategories.clear();

    const tiles = [...data.tiles];
    this.indexTiles(tiles, true);

    for (const t of tiles) {
      this.loadedCategories.add(t.category);
    }
  }

  /**
   * Ingests a set of tile metadata into in-memory O(1) lookup indices
   */
  private indexTiles(tiles: readonly TileMetadata[], isFullReplace = false): void {
    if (isFullReplace) {
      this.allTiles = Object.freeze([...tiles]);
    } else {
      this.allTiles = Object.freeze([...this.allTiles, ...tiles]);
    }

    for (const tile of tiles) {
      // 1. By ID
      this.byId.set(tile.id, tile);

      // 2. By Category
      let catList = this.byCategory.get(tile.category);
      if (!catList) {
        catList = [];
        this.byCategory.set(tile.category, catList);
      }
      catList.push(tile);

      // 3. By Subcategory
      let subList = this.bySubcategory.get(tile.subcategory);
      if (!subList) {
        subList = [];
        this.bySubcategory.set(tile.subcategory, subList);
      }
      subList.push(tile);

      // 4. By Tags
      for (const tag of tile.tags) {
        let tagList = this.byTag.get(tag);
        if (!tagList) {
          tagList = [];
          this.byTag.set(tag, tagList);
        }
        tagList.push(tile);
      }
    }
  }

  /**
   * Registers a dynamically imported tile into the active registry.
   */
  public registerTile(tile: TileMetadata): void {
    this.indexTiles([tile], false);
  }

  /**
   * Registers a batch of dynamically imported tiles into the active registry.
   */
  public registerTiles(tiles: readonly TileMetadata[]): void {
    this.indexTiles(tiles, false);
  }

  /**
   * Get all tiles in a specific category (O(1) lookup)
   */
  public getTilesByCategory(category: TileCategory): readonly TileMetadata[] {
    return this.byCategory.get(category) ?? [];
  }

  /**
   * Get all tiles tagged with a specific tag, with optional criteria filtering
   */
  public getTilesByTag(tag: string, filterOptions?: TileFilterOptions): readonly TileMetadata[] {
    const list = this.byTag.get(tag) ?? [];
    if (!filterOptions) return list;
    return this.applyFilters(list, filterOptions);
  }

  /**
   * Get a tile by its unique deterministic ID (O(1) lookup)
   */
  public getTileById(id: string): TileMetadata | undefined {
    return this.byId.get(id);
  }

  /**
   * Get a random tile matching the provided filter criteria
   */
  public getRandomTile(filterOptions?: TileFilterOptions): TileMetadata | null {
    let pool: readonly TileMetadata[];

    if (filterOptions?.category) {
      pool = this.getTilesByCategory(filterOptions.category);
      if (filterOptions.tags && filterOptions.tags.length > 0) {
        pool = this.applyFilters(pool, filterOptions);
      } else if (filterOptions.subcategory || filterOptions.collision !== undefined || filterOptions.source) {
        pool = this.applyFilters(pool, filterOptions);
      }
    } else if (filterOptions?.tags && filterOptions.tags.length > 0) {
      const firstTag = filterOptions.tags[0];
      pool = firstTag ? this.getTilesByTag(firstTag, filterOptions) : this.applyFilters(this.allTiles, filterOptions);
    } else if (filterOptions) {
      pool = this.applyFilters(this.allTiles, filterOptions);
    } else {
      pool = this.allTiles;
    }

    if (pool.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex] ?? null;
  }

  /**
   * Returns all indexed tiles
   */
  public getAllTiles(): readonly TileMetadata[] {
    return this.allTiles;
  }

  /**
   * Total number of indexed tiles
   */
  public get count(): number {
    return this.allTiles.length;
  }

  /**
   * Whether the registry has tiles loaded in memory
   */
  public get isLoaded(): boolean {
    return this.allTiles.length > 0;
  }

  /**
   * Active registry schema version
   */
  public get registryVersion(): string {
    return this.version;
  }

  private applyFilters(tiles: readonly TileMetadata[], filters: TileFilterOptions): TileMetadata[] {
    return tiles.filter(tile => {
      if (filters.category && tile.category !== filters.category) return false;
      if (filters.subcategory && tile.subcategory !== filters.subcategory) return false;
      if (filters.collision !== undefined && tile.collision !== filters.collision) return false;
      if (filters.source && tile.source !== filters.source) return false;
      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(t => tile.tags.includes(t));
        if (!hasAllTags) return false;
      }
      return true;
    });
  }
}

// Global Singleton for application & map engine use
export const defaultTilesRegistry = new TilesRegistryService();

// Standalone Helper functions delegating to defaultTilesRegistry
export function getTilesByCategory(category: TileCategory): readonly TileMetadata[] {
  return defaultTilesRegistry.getTilesByCategory(category);
}

export function getTilesByTag(tag: string, filterOptions?: TileFilterOptions): readonly TileMetadata[] {
  return defaultTilesRegistry.getTilesByTag(tag, filterOptions);
}

export function getRandomTile(filterOptions?: TileFilterOptions): TileMetadata | null { // result-ok: Estructura o identificador procedural de aventura
  return defaultTilesRegistry.getRandomTile(filterOptions);
}

export function getTileById(id: string): TileMetadata | undefined { // result-ok: Estructura o identificador procedural de aventura
  return defaultTilesRegistry.getTileById(id);
}

export function loadTilesRegistry(data: TilesRegistryJson): void {
  defaultTilesRegistry.loadRegistry(data);
}

export function registerDynamicTile(tile: TileMetadata): void {
  defaultTilesRegistry.registerTile(tile);
}

export function registerDynamicTiles(tiles: readonly TileMetadata[]): void {
  defaultTilesRegistry.registerTiles(tiles);
}
