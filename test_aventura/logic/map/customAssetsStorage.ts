/**
 * src/logic/map/customAssetsStorage.ts
 *
 * IndexedDB storage engine for user-imported custom tiles and compound structures.
 * Allows custom assets to persist across browser sessions and page reloads.
 */

import type { TileMetadata } from './tilesRegistry.ts';
import type { StructureTemplate } from '../../config/mapStructures';
import { logger } from '@/logic/utils/logger';

const DB_NAME = 'pokevicio_studio_assets_db';
const DB_VERSION = 1;
const TILES_STORE = 'custom_tiles';
const STRUCTURES_STORE = 'custom_structures';

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(TILES_STORE)) {
          db.createObjectStore(TILES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STRUCTURES_STORE)) {
          db.createObjectStore(STRUCTURES_STORE, { keyPath: 'id' });
        }
      };

      req.onsuccess = (e: Event) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      req.onerror = () => {
        logger.warn('StudioStorage', 'Failed to open IndexedDB');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persists an array of custom tiles to IndexedDB.
 */
export async function saveCustomTilesToStorage(tiles: readonly TileMetadata[]): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TILES_STORE, 'readwrite');
      const store = tx.objectStore(TILES_STORE);
      for (const t of tiles) {
        store.put(t);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Loads all custom tiles stored in IndexedDB.
 */
export async function loadCustomTilesFromStorage(): Promise<readonly TileMetadata[]> {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(TILES_STORE, 'readonly');
      const store = tx.objectStore(TILES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as TileMetadata[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Persists an array of custom structure templates to IndexedDB.
 */
export async function saveCustomStructuresToStorage(structures: readonly StructureTemplate[]): Promise<void> {
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STRUCTURES_STORE, 'readwrite');
      const store = tx.objectStore(STRUCTURES_STORE);
      for (const s of structures) {
        store.put(s);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Loads all custom structures stored in IndexedDB.
 */
export async function loadCustomStructuresFromStorage(): Promise<readonly StructureTemplate[]> {
  const db = await openDatabase();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STRUCTURES_STORE, 'readonly');
      const store = tx.objectStore(STRUCTURES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as StructureTemplate[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}
