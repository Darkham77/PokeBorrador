
/**
 * idbHelper.ts
 * IndexedDB helper for SQLite WASM persistence.
 */
import { logger } from '../utils/logger.ts';

const DB_NAME = 'pokevicio_idb'
const STORE_NAME = 'keyval'

async function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (e: Event) => resolve((e.target as IDBOpenDBRequest).result)
    request.onerror = (e: Event) => reject((e.target as IDBOpenDBRequest).error)
  })
}

export async function getFromIDB(key: string): Promise<Uint8Array | null> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch (_e) { return null }
}

export async function setToIDB(key: string, val: Uint8Array): Promise<void> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(val, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) { logger.error('IDB', `Save Error: ${(e as Error).message}`) }
}
