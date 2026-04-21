/**
 * idbHelper.js
 * IndexedDB helper for SQLite WASM persistence.
 */

const DB_NAME = 'pokevicio_idb'
const STORE_NAME = 'keyval'

async function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = e => resolve(e.target.result)
    request.onerror = e => reject(e.target.error)
  })
}

export async function getFromIDB(key) {
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

export async function setToIDB(key, val) {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const req = tx.objectStore(STORE_NAME).put(val, key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (e) { console.error('[IDB] Save Error:', e) }
}
